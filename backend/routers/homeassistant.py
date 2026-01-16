from fastapi import APIRouter, Depends, Query
from dependencies import db, get_current_user
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/homeassistant", tags=["Home Assistant"])

@router.get("/config")
async def get_homeassistant_config():
    """Get Home Assistant REST sensor configuration"""
    return {
        "sensors": [
            {
                "name": "Kitchenry Today's Meals",
                "resource": "/api/homeassistant/today",
                "value_template": "{{ value_json.meals | length }} meals planned"
            },
            {
                "name": "Kitchenry Shopping List",
                "resource": "/api/homeassistant/shopping",
                "value_template": "{{ value_json.unchecked }} items"
            }
        ],
        "example_config": """
# configuration.yaml
rest:
  - resource: http://YOUR_KITCHENRY_IP:8001/api/homeassistant/today
    headers:
      Authorization: Bearer YOUR_TOKEN
    sensor:
      - name: "Today's Meals"
        value_template: "{{ value_json.summary }}"
        json_attributes:
          - meals
          - next_meal
"""
    }

@router.get("/today")
async def homeassistant_today(user: dict = Depends(get_current_user)):
    """Get today's meals for Home Assistant"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    query = {"date": today}
    if user.get("household_id"):
        query["household_id"] = user["household_id"]
    else:
        query["household_id"] = user["id"]

    plans = await db.meal_plans.find(query, {"_id": 0}).to_list(10)

    # Find next meal
    current_hour = datetime.now(timezone.utc).hour
    meal_order = {"Breakfast": 8, "Lunch": 12, "Dinner": 18, "Snack": 15}
    next_meal = None
    for plan in sorted(plans, key=lambda x: meal_order.get(x["meal_type"], 12)):
        if meal_order.get(plan["meal_type"], 12) > current_hour:
            next_meal = plan
            break

    meals_summary = ", ".join([f"{p['meal_type']}: {p['recipe_title']}" for p in plans])

    return {
        "date": today,
        "meals": plans,
        "next_meal": next_meal,
        "summary": meals_summary or "No meals planned",
        "count": len(plans)
    }

@router.get("/shopping")
async def homeassistant_shopping(user: dict = Depends(get_current_user)):
    """Get shopping list summary for Home Assistant"""
    query = {}
    if user.get("household_id"):
        query["household_id"] = user["household_id"]
    else:
        query["household_id"] = user["id"]

    lists = await db.shopping_lists.find(query, {"_id": 0}).sort("created_at", -1).to_list(1)

    if not lists:
        return {"unchecked": 0, "total": 0, "items": [], "list_name": None}

    current_list = lists[0]
    unchecked = [i for i in current_list.get("items", []) if not i.get("checked")]

    return {
        "list_name": current_list["name"],
        "unchecked": len(unchecked),
        "total": len(current_list.get("items", [])),
        "items": unchecked[:10],  # First 10 unchecked items
        "summary": f"{len(unchecked)} items to buy"
    }
