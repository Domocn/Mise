from fastapi import APIRouter, HTTPException, Depends
from ..models import ShoppingListCreate, ShoppingListResponse
from ..dependencies import db, get_current_user
import uuid
from datetime import datetime, timezone
from typing import List

router = APIRouter(prefix="/shopping-lists", tags=["Shopping Lists"])

@router.post("", response_model=ShoppingListResponse)
async def create_shopping_list(data: ShoppingListCreate, user: dict = Depends(get_current_user)):
    list_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    list_doc = {
        "id": list_id,
        "name": data.name,
        "items": [i.model_dump() for i in data.items] if data.items else [],
        "household_id": user.get("household_id") or user["id"],
        "created_at": now,
        "updated_at": now
    }
    await db.shopping_lists.insert_one(list_doc)

    return ShoppingListResponse(**list_doc)

@router.get("", response_model=List[ShoppingListResponse])
async def get_shopping_lists(user: dict = Depends(get_current_user)):
    query = {}
    if user.get("household_id"):
        query["household_id"] = user["household_id"]
    else:
        query["household_id"] = user["id"]

    lists = await db.shopping_lists.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [ShoppingListResponse(**l) for l in lists]

@router.get("/{list_id}", response_model=ShoppingListResponse)
async def get_shopping_list(list_id: str, user: dict = Depends(get_current_user)):
    shopping_list = await db.shopping_lists.find_one({"id": list_id}, {"_id": 0})
    if not shopping_list:
        raise HTTPException(status_code=404, detail="Shopping list not found")

    # Auth check
    if shopping_list.get("household_id") != user.get("household_id") and shopping_list.get("household_id") != user["id"]:
         raise HTTPException(status_code=403, detail="Not authorized")

    return ShoppingListResponse(**shopping_list)

@router.put("/{list_id}", response_model=ShoppingListResponse)
async def update_shopping_list(list_id: str, data: ShoppingListCreate, user: dict = Depends(get_current_user)):
    # Auth check logic first
    shopping_list = await db.shopping_lists.find_one({"id": list_id})
    if not shopping_list:
        raise HTTPException(status_code=404, detail="Shopping list not found")

    if shopping_list.get("household_id") != user.get("household_id") and shopping_list.get("household_id") != user["id"]:
         raise HTTPException(status_code=403, detail="Not authorized")

    update_data = {
        "name": data.name,
        "items": [i.model_dump() for i in data.items] if data.items else [],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.shopping_lists.update_one({"id": list_id}, {"$set": update_data})
    updated = await db.shopping_lists.find_one({"id": list_id}, {"_id": 0})
    return ShoppingListResponse(**updated)

@router.delete("/{list_id}")
async def delete_shopping_list(list_id: str, user: dict = Depends(get_current_user)):
    # Auth check logic first
    shopping_list = await db.shopping_lists.find_one({"id": list_id})
    if not shopping_list:
        raise HTTPException(status_code=404, detail="Shopping list not found")

    if shopping_list.get("household_id") != user.get("household_id") and shopping_list.get("household_id") != user["id"]:
         raise HTTPException(status_code=403, detail="Not authorized")

    await db.shopping_lists.delete_one({"id": list_id})
    return {"message": "Shopping list deleted"}

@router.post("/from-recipes")
async def generate_shopping_list_from_recipes(recipe_ids: List[str], user: dict = Depends(get_current_user)):
    """Generate a shopping list from selected recipes"""
    recipes = await db.recipes.find({"id": {"$in": recipe_ids}}, {"_id": 0}).to_list(100)

    items = []
    for recipe in recipes:
        for ing in recipe.get("ingredients", []):
            items.append({
                "name": ing["name"],
                "amount": ing["amount"],
                "unit": ing.get("unit", ""),
                "checked": False,
                "recipe_id": recipe["id"]
            })

    list_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    list_doc = {
        "id": list_id,
        "name": f"Shopping List - {datetime.now().strftime('%b %d')}",
        "items": items,
        "household_id": user.get("household_id") or user["id"],
        "created_at": now,
        "updated_at": now
    }
    await db.shopping_lists.insert_one(list_doc)

    return ShoppingListResponse(**list_doc)
