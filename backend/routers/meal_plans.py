from fastapi import APIRouter, HTTPException, Depends
from ..models import MealPlanCreate, MealPlanResponse
from ..dependencies import db, get_current_user
import uuid
from datetime import datetime, timezone
from typing import List, Optional

router = APIRouter(prefix="/meal-plans", tags=["Meal Plans"])

@router.post("", response_model=MealPlanResponse)
async def create_meal_plan(plan: MealPlanCreate, user: dict = Depends(get_current_user)):
    recipe = await db.recipes.find_one({"id": plan.recipe_id}, {"_id": 0})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    plan_id = str(uuid.uuid4())
    plan_doc = {
        "id": plan_id,
        "date": plan.date,
        "meal_type": plan.meal_type,
        "recipe_id": plan.recipe_id,
        "recipe_title": recipe["title"],
        "notes": plan.notes or "",
        "household_id": user.get("household_id") or user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.meal_plans.insert_one(plan_doc)

    return MealPlanResponse(**plan_doc)

@router.get("", response_model=List[MealPlanResponse])
async def get_meal_plans(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if user.get("household_id"):
        query["household_id"] = user["household_id"]
    else:
        query["household_id"] = user["id"]

    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}

    plans = await db.meal_plans.find(query, {"_id": 0}).sort("date", 1).to_list(500)
    return [MealPlanResponse(**p) for p in plans]

@router.delete("/{plan_id}")
async def delete_meal_plan(plan_id: str, user: dict = Depends(get_current_user)):
    # Check ownership or household
    plan = await db.meal_plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")

    if user.get("household_id") and plan.get("household_id") == user["household_id"]:
        pass # OK
    elif plan.get("household_id") == user["id"]:
        pass # OK
    else:
         raise HTTPException(status_code=403, detail="Not authorized")

    await db.meal_plans.delete_one({"id": plan_id})
    return {"message": "Meal plan deleted"}
