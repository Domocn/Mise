from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from ..models import RecipeCreate, RecipeResponse
from ..dependencies import db, get_current_user
from ..config import settings
import uuid
import aiofiles
import re
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from pathlib import Path

router = APIRouter(prefix="/recipes", tags=["Recipes"])

def escape_regex(text: str) -> str:
    """Escape special regex characters to prevent ReDoS attacks"""
    return re.escape(text)

# Ensure upload directory exists
UPLOAD_DIR = Path(settings.upload_dir)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("", response_model=RecipeResponse)
async def create_recipe(recipe: RecipeCreate, user: dict = Depends(get_current_user)):
    recipe_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    recipe_doc = {
        "id": recipe_id,
        "title": recipe.title,
        "description": recipe.description or "",
        "ingredients": [i.model_dump() for i in recipe.ingredients],
        "instructions": recipe.instructions,
        "prep_time": recipe.prep_time or 0,
        "cook_time": recipe.cook_time or 0,
        "servings": recipe.servings or 4,
        "category": recipe.category or "Other",
        "tags": recipe.tags or [],
        "image_url": recipe.image_url or "",
        "author_id": user["id"],
        "household_id": user.get("household_id"),
        "created_at": now,
        "updated_at": now
    }
    await db.recipes.insert_one(recipe_doc)
    
    return RecipeResponse(**recipe_doc)

@router.get("", response_model=List[RecipeResponse])
async def get_recipes(
    category: Optional[str] = None,
    search: Optional[str] = None,
    favorites_only: Optional[bool] = False,
    user: dict = Depends(get_current_user)
):
    query = {}
    user_favorites = user.get("favorites", [])
    
    # Filter by favorites only
    if favorites_only:
        if not user_favorites:
            return []
        query["id"] = {"$in": user_favorites}
    else:
        # Show user's recipes and household recipes
        if user.get("household_id"):
            query["$or"] = [
                {"author_id": user["id"]},
                {"household_id": user["household_id"]}
            ]
        else:
            query["author_id"] = user["id"]
    
    if category and category != "All":
        query["category"] = category
    
    if search:
        # Escape special regex characters to prevent ReDoS attacks
        safe_search = escape_regex(search)
        query["$and"] = query.get("$and", [])
        query["$and"].append({
            "$or": [
                {"title": {"$regex": safe_search, "$options": "i"}},
                {"description": {"$regex": safe_search, "$options": "i"}},
                {"tags": {"$regex": safe_search, "$options": "i"}}
            ]
        })
    
    recipes = await db.recipes.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Add is_favorite flag to each recipe
    for r in recipes:
        r["is_favorite"] = r["id"] in user_favorites
    
    return [RecipeResponse(**r) for r in recipes]

@router.get("/{recipe_id}", response_model=RecipeResponse)
async def get_recipe(recipe_id: str, user: dict = Depends(get_current_user)):
    recipe = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    user_favorites = user.get("favorites", [])
    recipe["is_favorite"] = recipe["id"] in user_favorites
    
    return RecipeResponse(**recipe)

@router.put("/{recipe_id}", response_model=RecipeResponse)
async def update_recipe(recipe_id: str, recipe: RecipeCreate, user: dict = Depends(get_current_user)):
    existing = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    # Allow updates by author or household members? Assuming strict ownership or household for now
    # The original code checked for author_id. Let's keep it but also allow household members to edit if it's a household recipe?
    # Original logic: if existing["author_id"] != user["id"]: raise 403

    if existing["author_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {
        "title": recipe.title,
        "description": recipe.description or "",
        "ingredients": [i.model_dump() for i in recipe.ingredients],
        "instructions": recipe.instructions,
        "prep_time": recipe.prep_time or 0,
        "cook_time": recipe.cook_time or 0,
        "servings": recipe.servings or 4,
        "category": recipe.category or "Other",
        "tags": recipe.tags or [],
        "image_url": recipe.image_url or "",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.recipes.update_one({"id": recipe_id}, {"$set": update_data})
    updated = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    return RecipeResponse(**updated)

@router.delete("/{recipe_id}")
async def delete_recipe(recipe_id: str, user: dict = Depends(get_current_user)):
    existing = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    if existing["author_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.recipes.delete_one({"id": recipe_id})
    return {"message": "Recipe deleted"}

@router.post("/{recipe_id}/favorite")
async def toggle_favorite(recipe_id: str, user: dict = Depends(get_current_user)):
    """Toggle favorite status for a recipe"""
    recipe = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    user_favorites = user.get("favorites", [])
    
    if recipe_id in user_favorites:
        await db.users.update_one(
            {"id": user["id"]},
            {"$pull": {"favorites": recipe_id}}
        )
        return {"is_favorite": False, "message": "Removed from favorites"}
    else:
        await db.users.update_one(
            {"id": user["id"]},
            {"$addToSet": {"favorites": recipe_id}}
        )
        return {"is_favorite": True, "message": "Added to favorites"}

@router.get("/{recipe_id}/scaled")
async def get_scaled_recipe(
    recipe_id: str, 
    servings: int = Query(..., ge=1, le=100),
    user: dict = Depends(get_current_user)
):
    """Get recipe with scaled ingredient amounts"""
    recipe = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    original_servings = recipe.get("servings", 4)
    if original_servings <= 0:
        original_servings = 4
    
    scale_factor = servings / original_servings
    
    scaled_ingredients = []
    for ing in recipe.get("ingredients", []):
        try:
            original_amount = ing.get("amount", "")
            if "/" in str(original_amount):
                parts = str(original_amount).split("/")
                if len(parts) == 2:
                    num = float(parts[0].strip())
                    denom = float(parts[1].strip())
                    original_num = num / denom
                else:
                    original_num = float(original_amount)
            else:
                original_num = float(original_amount)
            
            scaled_num = original_num * scale_factor
            if scaled_num == int(scaled_num):
                scaled_amount = str(int(scaled_num))
            else:
                scaled_amount = f"{scaled_num:.2f}".rstrip('0').rstrip('.')
            
            scaled_ingredients.append({
                "name": ing["name"],
                "amount": scaled_amount,
                "unit": ing.get("unit", "")
            })
        except (ValueError, TypeError):
            scaled_ingredients.append(ing)
    
    return {
        "id": recipe["id"],
        "title": recipe["title"],
        "original_servings": original_servings,
        "scaled_servings": servings,
        "scale_factor": round(scale_factor, 2),
        "ingredients": scaled_ingredients,
        "instructions": recipe.get("instructions", [])
    }

@router.get("/{recipe_id}/print")
async def get_print_recipe(recipe_id: str, user: dict = Depends(get_current_user)):
    """Get recipe formatted for printing"""
    recipe = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    total_time = (recipe.get("prep_time", 0) or 0) + (recipe.get("cook_time", 0) or 0)

    return {
        "title": recipe["title"],
        "description": recipe.get("description", ""),
        "servings": recipe.get("servings", 4),
        "prep_time": recipe.get("prep_time", 0),
        "cook_time": recipe.get("cook_time", 0),
        "total_time": total_time,
        "category": recipe.get("category", "Other"),
        "tags": recipe.get("tags", []),
        "ingredients": recipe.get("ingredients", []),
        "instructions": recipe.get("instructions", []),
        "image_url": recipe.get("image_url", ""),
        "printed_at": datetime.now(timezone.utc).isoformat()
    }

@router.post("/{recipe_id}/image")
async def upload_recipe_image(recipe_id: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    existing = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Whitelist allowed extensions
    ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp'}
    ext = file.filename.split(".")[-1].lower() if file.filename else "jpg"

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: jpg, jpeg, png, gif, webp")

    filename = f"{recipe_id}.{ext}"
    file_path = UPLOAD_DIR / filename

    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)

    image_url = f"/api/uploads/{filename}"
    await db.recipes.update_one({"id": recipe_id}, {"$set": {"image_url": image_url}})

    return {"image_url": image_url}

@router.post("/{recipe_id}/share")
async def create_share_link(recipe_id: str, user: dict = Depends(get_current_user)):
    """Create a public share link for a recipe"""
    recipe = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    share_id = str(uuid.uuid4())[:8]
    share_doc = {
        "id": share_id,
        "recipe_id": recipe_id,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    }
    await db.recipe_shares.insert_one(share_doc)

    return {"share_id": share_id, "share_url": f"/shared/{share_id}"}
