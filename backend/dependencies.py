from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
import jwt
import bcrypt
import httpx
import logging
import asyncio
import hashlib
import time
from datetime import datetime, timezone, timedelta
from typing import Optional

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database
client = AsyncIOMotorClient(settings.mongo_url)
db = client[settings.db_name]

# Security
security = HTTPBearer()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# LLM Helpers

async def call_embedded(
    system_prompt: str,
    user_prompt: str,
    model_name: str = None
) -> str:
    """Embedded LLM is not available in cloud deployment - use Ollama or cloud providers instead"""
    raise HTTPException(
        status_code=503, 
        detail="Embedded LLM (GPT4All) is not available in cloud deployment. Please configure Ollama, OpenAI, or Anthropic as your LLM provider in Settings."
    )


async def call_openai(
    client: httpx.AsyncClient,
    system_prompt: str,
    user_prompt: str
) -> str:
    """Call OpenAI directly"""
    try:
        from openai import AsyncOpenAI

        api_key = settings.openai_api_key
        if not api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")

        openai_client = AsyncOpenAI(api_key=api_key, http_client=client)

        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )

        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"OpenAI error: {e}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


async def call_anthropic(
    client: httpx.AsyncClient,
    system_prompt: str,
    user_prompt: str
) -> str:
    """Call Anthropic Claude API"""
    try:
        api_key = settings.anthropic_api_key
        if not api_key:
            raise HTTPException(status_code=500, detail="Anthropic API key not configured")

        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            },
            json={
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 2000,
                "system": system_prompt,
                "messages": [
                    {"role": "user", "content": user_prompt}
                ]
            },
            timeout=120.0
        )

        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Anthropic error: {response.text}")

        result = response.json()
        # Extract text from content blocks
        content = result.get("content", [])
        text_parts = [block.get("text", "") for block in content if block.get("type") == "text"]
        return "".join(text_parts)
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Cannot connect to Anthropic API")
    except Exception as e:
        logger.error(f"Anthropic error: {e}")
        raise HTTPException(status_code=500, detail=f"Claude AI error: {str(e)}")

async def call_ollama_with_config(
    client: httpx.AsyncClient,
    system_prompt: str,
    user_prompt: str,
    url: str,
    model: str
) -> str:
    """Call Ollama with specific config"""
    try:
        response = await client.post(
            f"{url}/api/generate",
            json={
                "model": model,
                "prompt": f"{system_prompt}\n\nUser: {user_prompt}\n\nAssistant:",
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "num_predict": 2000,
                }
            },
            timeout=120.0
        )

        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Ollama error: {response.text}")

        result = response.json()
        return result.get("response", "")
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to Ollama. Make sure Ollama is running locally (ollama serve)"
        )
    except Exception as e:
        logger.error(f"Ollama error: {e}")
        raise HTTPException(status_code=500, detail=f"Local LLM error: {str(e)}")

async def call_llm(
    client: httpx.AsyncClient,
    system_prompt: str,
    user_prompt: str,
    user_id: str = None
) -> str:
    """Call LLM - routes to Ollama, OpenAI, or Claude based on user config"""
    # Get user-specific settings if available
    provider = settings.llm_provider
    ollama_url = settings.ollama_url
    ollama_model = settings.ollama_model

    if user_id:
        user_settings = await db.llm_settings.find_one({"user_id": user_id}, {"_id": 0})
        if user_settings:
            provider = user_settings.get("provider", provider)
            ollama_url = user_settings.get("ollama_url", ollama_url)
            ollama_model = user_settings.get("ollama_model", ollama_model)

    # Calculate Cache Key
    key_content = f"{system_prompt}|{user_prompt}|{provider}"
    if provider == 'ollama':
        key_content += f"|{ollama_url}|{ollama_model}"

    cache_hash = hashlib.sha256(key_content.encode()).hexdigest()

    # Check cache
    try:
        cached = await db.llm_cache.find_one({"hash": cache_hash})
        if cached and cached.get("response"):
            return cached["response"]
    except Exception as e:
        logger.error(f"Cache lookup failed: {e}")

    # Route to appropriate provider
    if provider == 'embedded':
        # Embedded not available in cloud - fall back to error message
        result = await call_embedded(system_prompt, user_prompt)
        model_used = "embedded"
    elif provider == 'ollama':
        result = await call_ollama_with_config(client, system_prompt, user_prompt, ollama_url, ollama_model)
        model_used = ollama_model
    elif provider == 'anthropic':
        result = await call_anthropic(client, system_prompt, user_prompt)
        model_used = "claude-sonnet-4-20250514"
    else:  # openai
        result = await call_openai(client, system_prompt, user_prompt)
        model_used = "gpt-4o"

    # Store in cache
    try:
        await db.llm_cache.update_one(
            {"hash": cache_hash},
            {"$set": {
                "hash": cache_hash,
                "response": result,
                "created_at": time.time(),
                "provider": provider,
                "model": model_used
            }},
            upsert=True
        )
    except Exception as e:
        logger.error(f"Cache update failed: {e}")

    return result

def clean_llm_json(text: str) -> str:
    """Clean markdown code blocks from LLM response"""
    text = text.strip()
    if text.startswith("```"):
        # Find first newline to skip language identifier (e.g. ```json)
        newline_index = text.find("\n")
        if newline_index != -1:
            text = text[newline_index+1:]
        # Remove closing backticks
        if text.endswith("```"):
            text = text[:-3]
    return text.strip()
