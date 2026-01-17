from fastapi import APIRouter, Depends, HTTPException, Request
from models import LLMSettingsUpdate
from dependencies import db, get_current_user, settings
from datetime import datetime, timezone
import httpx
import os

router = APIRouter(prefix="/settings/llm", tags=["LLM Settings"])

# Available embedded models (GPT4All)
EMBEDDED_MODELS = [
    {"id": "Phi-3-mini-4k-instruct.Q4_0.gguf", "name": "Phi-3 Mini (Recommended)", "size": "2.2GB", "ram": "4GB"},
    {"id": "Llama-3.2-3B-Instruct-Q4_K_M.gguf", "name": "Llama 3.2 3B", "size": "2.0GB", "ram": "4GB"},
    {"id": "Mistral-7B-Instruct-v0.3-Q4_K_M.gguf", "name": "Mistral 7B", "size": "4.4GB", "ram": "8GB"},
    {"id": "Meta-Llama-3-8B-Instruct-Q4_K_M.gguf", "name": "Llama 3 8B", "size": "4.9GB", "ram": "8GB"},
]

# Store LLM settings in memory (per-session) or DB for persistence
# Initialize from env
default_llm_settings = {
    "provider": settings.llm_provider,
    "ollama_url": settings.ollama_url,
    "ollama_model": settings.ollama_model,
    "embedded_model": settings.embedded_model
}

@router.get("")
async def get_llm_settings(user: dict = Depends(get_current_user)):
    """Get current LLM settings"""
    # Check if user has custom settings
    user_settings = await db.llm_settings.find_one({"user_id": user["id"]}, {"_id": 0})

    if user_settings:
        return {
            **user_settings,
            "available_providers": ["openai", "ollama", "embedded"],
            "embedded_models": EMBEDDED_MODELS
        }

    return {
        "provider": default_llm_settings["provider"],
        "ollama_url": default_llm_settings["ollama_url"],
        "ollama_model": default_llm_settings["ollama_model"],
        "embedded_model": default_llm_settings["embedded_model"],
        "available_providers": ["openai", "ollama", "embedded"],
        "embedded_models": EMBEDDED_MODELS
    }

@router.put("")
async def update_llm_settings(llm_settings: LLMSettingsUpdate, user: dict = Depends(get_current_user)):
    """Update LLM settings for the user"""
    settings_doc = {
        "user_id": user["id"],
        "provider": llm_settings.provider,
        "ollama_url": llm_settings.ollama_url or "http://localhost:11434",
        "ollama_model": llm_settings.ollama_model or "llama3",
        "embedded_model": llm_settings.embedded_model or "Phi-3-mini-4k-instruct.Q4_0.gguf",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.llm_settings.update_one(
        {"user_id": user["id"]},
        {"$set": settings_doc},
        upsert=True
    )

    return {"message": "LLM settings updated", "settings": settings_doc}

@router.post("/test")
async def test_llm_connection(
    request: Request,
    llm_settings: LLMSettingsUpdate,
    user: dict = Depends(get_current_user)
):
    """Test LLM connection with given settings"""
    if llm_settings.provider == "embedded":
        # Test embedded model
        try:
            from gpt4all import GPT4All
            
            model_name = llm_settings.embedded_model or "Phi-3-mini-4k-instruct.Q4_0.gguf"
            models_path = settings.embedded_models_path
            model_file = os.path.join(models_path, model_name)
            
            # Check if model exists locally
            if os.path.exists(model_file):
                return {
                    "success": True,
                    "message": f"Model {model_name} is ready",
                    "model_downloaded": True,
                    "available_models": EMBEDDED_MODELS
                }
            else:
                return {
                    "success": True,
                    "message": f"Model {model_name} will be downloaded on first use (~2-5GB)",
                    "model_downloaded": False,
                    "available_models": EMBEDDED_MODELS
                }
        except ImportError:
            return {"success": False, "message": "GPT4All not installed"}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    elif llm_settings.provider == "ollama":
        try:
            client = request.app.state.http_client
            # Test Ollama connection
            response = await client.get(f"{llm_settings.ollama_url}/api/tags", timeout=10.0)
            if response.status_code == 200:
                models = response.json().get("models", [])
                model_names = [m.get("name", "").split(":")[0] for m in models]
                return {
                    "success": True,
                    "message": "Connected to Ollama",
                    "available_models": model_names
                }
            else:
                return {"success": False, "message": "Ollama responded with error"}
        except httpx.ConnectError:
            return {"success": False, "message": "Cannot connect to Ollama. Is it running?"}
        except Exception as e:
            return {"success": False, "message": str(e)}
    else:
        # Test OpenAI
        api_key = settings.openai_api_key
        if api_key:
            return {"success": True, "message": "OpenAI API key configured"}
        else:
            return {"success": False, "message": "No API key configured"}


@router.post("/download-model")
async def download_embedded_model(
    model_name: str = "Phi-3-mini-4k-instruct.Q4_0.gguf",
    user: dict = Depends(get_current_user)
):
    """Trigger download of an embedded model"""
    try:
        from gpt4all import GPT4All
        import asyncio
        from pathlib import Path

        # Security: Validate model_name to prevent path traversal
        if '..' in model_name or '/' in model_name or '\\' in model_name:
            return {"success": False, "message": "Invalid model name"}

        # Only allow known model file extensions
        if not model_name.endswith('.gguf'):
            return {"success": False, "message": "Invalid model format"}

        models_path = settings.embedded_models_path
        os.makedirs(models_path, exist_ok=True)

        # Check if already downloaded
        model_file = Path(models_path) / model_name
        if model_file.exists():
            return {"success": True, "message": "Model already downloaded", "model": model_name}
        
        # Download in background - this will take a while
        # GPT4All handles the download automatically when we create the instance
        def download():
            GPT4All(model_name=model_name, model_path=models_path, allow_download=True)
        
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, download)
        
        return {"success": True, "message": f"Model {model_name} downloaded successfully"}
    except Exception as e:
        return {"success": False, "message": str(e)}
