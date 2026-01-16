from fastapi import APIRouter, Depends
from dependencies import db, get_current_user
from datetime import datetime, timezone

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.post("/subscribe")
async def subscribe_push(subscription: dict, user: dict = Depends(get_current_user)):
    """Subscribe to push notifications"""
    sub_doc = {
        "user_id": user["id"],
        "subscription": subscription,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    # Upsert - update if exists, insert if not
    await db.push_subscriptions.update_one(
        {"user_id": user["id"]},
        {"$set": sub_doc},
        upsert=True
    )

    return {"message": "Subscribed to notifications"}

@router.get("/settings")
async def get_notification_settings(user: dict = Depends(get_current_user)):
    """Get notification preferences"""
    settings = await db.notification_settings.find_one({"user_id": user["id"]}, {"_id": 0})

    if not settings:
        settings = {
            "enabled": False,
            "meal_reminders": True,
            "reminder_time": 30,  # minutes before meal
            "shopping_reminders": True,
            "weekly_plan_reminder": True
        }

    return settings

@router.put("/settings")
async def update_notification_settings(settings: dict, user: dict = Depends(get_current_user)):
    """Update notification preferences"""
    settings["user_id"] = user["id"]

    await db.notification_settings.update_one(
        {"user_id": user["id"]},
        {"$set": settings},
        upsert=True
    )

    return {"message": "Settings updated"}
