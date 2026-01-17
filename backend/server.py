from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import httpx
from config import settings
from dependencies import db, client

# Import routers
from routers import (
    auth, households, recipes, ai, meal_plans, shopping_lists,
    homeassistant, notifications, calendar, import_data, llm_settings,
    favorites, prompts, cooking
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

# CORS - must be added before routes
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.cors_origins.split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

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
api_router.include_router(prompts.router)
api_router.include_router(cooking.router)

# Categories endpoint (simple enough to keep here or move to recipes)
@api_router.get("/categories")
async def get_categories():
    return {
        "categories": [
            "All", "Breakfast", "Lunch", "Dinner",
            "Dessert", "Appetizer", "Snack", "Beverage", "Other"
        ]
    }

# Config endpoint
@api_router.get("/config")
async def get_config():
    """Get server configuration for clients"""
    return {
        "llm_provider": settings.llm_provider,
        "ollama_model": settings.ollama_model if settings.llm_provider == 'ollama' else None,
        "version": "1.1.0",
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
        "version": "1.1.0",
        "llm_provider": settings.llm_provider
    }

@api_router.get("/shared/{share_id}")
async def get_shared_recipe(share_id: str):
    """Get a publicly shared recipe (no auth required)"""
    from datetime import datetime, timezone

    share = await db.recipe_shares.find_one({"id": share_id}, {"_id": 0})
    if not share:
        raise HTTPException(status_code=404, detail="Shared recipe not found")

    # Check expiration
    if share.get("expires_at"):
        expires = datetime.fromisoformat(share["expires_at"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(status_code=410, detail="Share link has expired")

    recipe = await db.recipes.find_one({"id": share["recipe_id"]}, {"_id": 0})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    return recipe

# Static Files
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
