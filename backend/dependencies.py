from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings
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

# Global GPT4All model instance (lazy loaded)
_embedded_model = None
_embedded_model_name = None

def get_embedded_model(model_name: str):
    """Get or create the embedded GPT4All model instance"""
    global _embedded_model, _embedded_model_name
    
    if _embedded_model is None or _embedded_model_name != model_name:
        try:
            from gpt4all import GPT4All
            import os
            
            # Ensure models directory exists
            models_path = settings.embedded_models_path
            os.makedirs(models_path, exist_ok=True)
            
            logger.info(f"Loading embedded model: {model_name}")
            _embedded_model = GPT4All(
                model_name=model_name,
                model_path=models_path,
                allow_download=True,
                verbose=False
            )
            _embedded_model_name = model_name
            logger.info(f"Embedded model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load embedded model: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to load embedded model: {str(e)}")
    
    return _embedded_model


async def call_embedded(
    system_prompt: str,
    user_prompt: str,
    model_name: str = None
) -> str:
    """Call embedded GPT4All model - runs completely offline"""
    try:
        model_name = model_name or settings.embedded_model
        model = get_embedded_model(model_name)
        
        # Combine prompts for the model
        full_prompt = f"""### System:
{system_prompt}

### User:
{user_prompt}

### Assistant:"""
        
        # Run in thread pool to not block async
        import asyncio
        loop = asyncio.get_event_loop()
        
        response = await loop.run_in_executor(
            None,
            lambda: model.generate(
                full_prompt,
                max_tokens=2000,
                temp=0.7,
                top_p=0.9,
            )
        )
        
        return response.strip()
    except Exception as e:
        logger.error(f"Embedded LLM error: {e}")
        raise HTTPException(status_code=500, detail=f"Embedded AI error: {str(e)}")


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
    """Call LLM - routes to Embedded, Ollama, or OpenAI based on user config"""
    # Get user-specific settings if available
    provider = settings.llm_provider
    ollama_url = settings.ollama_url
    ollama_model = settings.ollama_model
    embedded_model = settings.embedded_model

    if user_id:
        user_settings = await db.llm_settings.find_one({"user_id": user_id}, {"_id": 0})
        if user_settings:
            provider = user_settings.get("provider", provider)
            ollama_url = user_settings.get("ollama_url", ollama_url)
            ollama_model = user_settings.get("ollama_model", ollama_model)
            embedded_model = user_settings.get("embedded_model", embedded_model)

    # Calculate Cache Key
    key_content = f"{system_prompt}|{user_prompt}|{provider}"
    if provider == 'ollama':
        key_content += f"|{ollama_url}|{ollama_model}"
    elif provider == 'embedded':
        key_content += f"|{embedded_model}"

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
        result = await call_embedded(system_prompt, user_prompt, embedded_model)
        model_used = embedded_model
    elif provider == 'ollama':
        result = await call_ollama_with_config(client, system_prompt, user_prompt, ollama_url, ollama_model)
        model_used = ollama_model
    else:
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
