from fastapi import APIRouter, HTTPException, Depends
from models import HouseholdCreate, HouseholdResponse, UserResponse, HouseholdInvite
from dependencies import db, get_current_user
import uuid
from datetime import datetime, timezone
from typing import List, Optional

router = APIRouter(prefix="/households", tags=["Households"])

@router.post("", response_model=HouseholdResponse)
async def create_household(data: HouseholdCreate, user: dict = Depends(get_current_user)):
    if user.get("household_id"):
        raise HTTPException(status_code=400, detail="Already in a household")

    household_id = str(uuid.uuid4())
    household_doc = {
        "id": household_id,
        "name": data.name,
        "owner_id": user["id"],
        "member_ids": [user["id"]],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.households.insert_one(household_doc)
    await db.users.update_one({"id": user["id"]}, {"$set": {"household_id": household_id}})

    return HouseholdResponse(**household_doc)

@router.get("/me", response_model=Optional[HouseholdResponse])
async def get_my_household(user: dict = Depends(get_current_user)):
    if not user.get("household_id"):
        return None
    household = await db.households.find_one({"id": user["household_id"]}, {"_id": 0})
    if not household:
        return None
    return HouseholdResponse(**household)

@router.get("/members", response_model=List[UserResponse])
async def get_household_members(user: dict = Depends(get_current_user)):
    if not user.get("household_id"):
        return []
    household = await db.households.find_one({"id": user["household_id"]}, {"_id": 0})
    if not household:
        return []
    members = await db.users.find({"id": {"$in": household["member_ids"]}}, {"_id": 0, "password": 0}).to_list(100)
    return [UserResponse(**m) for m in members]

@router.post("/invite")
async def invite_to_household(data: HouseholdInvite, user: dict = Depends(get_current_user)):
    if not user.get("household_id"):
        raise HTTPException(status_code=400, detail="You must be in a household")

    invitee = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not invitee:
        raise HTTPException(status_code=404, detail="User not found")
    if invitee.get("household_id"):
        raise HTTPException(status_code=400, detail="User already in a household")

    await db.users.update_one({"id": invitee["id"]}, {"$set": {"household_id": user["household_id"]}})
    await db.households.update_one({"id": user["household_id"]}, {"$push": {"member_ids": invitee["id"]}})

    return {"message": "User added to household"}

@router.post("/leave")
async def leave_household(user: dict = Depends(get_current_user)):
    if not user.get("household_id"):
        raise HTTPException(status_code=400, detail="Not in a household")

    household = await db.households.find_one({"id": user["household_id"]}, {"_id": 0})
    if not household:
        raise HTTPException(status_code=404, detail="Household not found")
    if household["owner_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Owner cannot leave. Transfer ownership first.")

    await db.users.update_one({"id": user["id"]}, {"$set": {"household_id": None}})
    await db.households.update_one({"id": user["household_id"]}, {"$pull": {"member_ids": user["id"]}})

    return {"message": "Left household"}
