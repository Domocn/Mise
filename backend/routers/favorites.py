from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import jwt

router = APIRouter(prefix="/favorites", tags=["favorites"])
security = HTTPBearer()

db = None
JWT_SECRET = None
JWT_ALGORITHM = "HS256"

def init(database, secret):
    global db, JWT_SECRET
    db = database
    JWT_SECRET = secret

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("")
async def get_favorites(user: dict = Depends(get_current_user)):
    """Get all favorite recipe IDs for the current user"""
    return {"favorites": user.get("favorites", [])}

@router.post("/{recipe_id}")
async def add_favorite(recipe_id: str, user: dict = Depends(get_current_user)):
    """Add a recipe to favorites"""
    recipe = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$addToSet": {"favorites": recipe_id}}
    )
    return {"message": "Added to favorites", "is_favorite": True}

@router.delete("/{recipe_id}")
async def remove_favorite(recipe_id: str, user: dict = Depends(get_current_user)):
    """Remove a recipe from favorites"""
    await db.users.update_one(
        {"id": user["id"]},
        {"$pull": {"favorites": recipe_id}}
    )
    return {"message": "Removed from favorites", "is_favorite": False}
