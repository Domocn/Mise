from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import httpx
from config import settings
from dependencies import db, client
from routers import (
    auth, households, recipes, ai, meal_plans, shopping_lists,
    homeassistant, notifications, calendar, import_data, llm_settings,
    favorites
)

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.http_client = httpx.AsyncClient()
    # Create indices
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        await db.recipes.create_index("id", unique=True)
        await db.recipes.create_index("author_id")
        await db.recipes.create_index("household_id")
    except Exception as e:
        logger.error(f"Failed to create indices: {e}")
    yield
    # Shutdown
    await app.state.http_client.aclose()
    client.close()

app = FastAPI(lifespan=lifespan, title="Mise API")

api_router = APIRouter(prefix="/api")

# Include routers
api_router.include_router(auth.router)
api_router.include_router(households.router)
api_router.include_router(recipes.router)
api_router.include_router(ai.router)
api_router.include_router(meal_plans.router)
api_router.include_router(shopping_lists.router)
api_router.include_router(homeassistant.router)
api_router.include_router(notifications.router)
api_router.include_router(calendar.router)
api_router.include_router(import_data.router)
api_router.include_router(llm_settings.router)
api_router.include_router(favorites.router)

@api_router.get("/categories")
async def get_categories():
    return {
        "categories": [
            "All", "Breakfast", "Lunch", "Dinner",
            "Dessert", "Appetizer", "Snack", "Beverage", "Other"
        ]
    }

@api_router.get("/config")
async def get_config():
    """Get server configuration for clients"""
    return {
        "llm_provider": settings.llm_provider,
        "ollama_model": settings.ollama_model if settings.llm_provider == 'ollama' else None,
        "version": "1.0.0",
        "features": {
            "ai_import": True,
            "ai_fridge_search": True,
            "local_llm": settings.llm_provider == 'ollama'
        }
    }

@api_router.get("/health")
async def health_check():
    """Health check endpoint for server discovery"""
    return {
        "status": "healthy",
        "app": "Mise",
        "version": "1.0.0",
        "llm_provider": settings.llm_provider
    }

@api_router.get("/uploads/{filename}")
async def get_upload(filename: str):
    from fastapi.responses import FileResponse
    from pathlib import Path
    upload_dir = Path(settings.upload_dir)
    try:
        file_path = (upload_dir / filename).resolve()
        if not file_path.is_relative_to(upload_dir.resolve()):
            raise HTTPException(status_code=404, detail="File not found")
    except ValueError:
        raise HTTPException(status_code=404, detail="File not found")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.cors_origins.split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
