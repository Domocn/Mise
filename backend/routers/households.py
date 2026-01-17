from fastapi import APIRouter, HTTPException, Depends
<<<<<<< HEAD
from ..models import HouseholdCreate, HouseholdResponse, UserResponse, HouseholdInvite
from ..dependencies import db, get_current_user
=======
from models import HouseholdCreate, HouseholdResponse, UserResponse, HouseholdInvite, JoinHouseholdRequest
from dependencies import db, get_current_user
>>>>>>> eeb2f0a8096c3f307ab184e32aaec8451355d15a
import uuid
import secrets
from datetime import datetime, timezone, timedelta
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

@router.post("/join-code")
async def generate_join_code(user: dict = Depends(get_current_user)):
    """Generate a join code for the household"""
    if not user.get("household_id"):
        raise HTTPException(status_code=400, detail="Not in a household")

    household = await db.households.find_one({"id": user["household_id"]}, {"_id": 0})
    if not household:
        raise HTTPException(status_code=404, detail="Household not found")

    # Only owner can generate join codes
    if household["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only household owner can generate join codes")

    # Generate 8-character code
    join_code = secrets.token_urlsafe(6).upper()[:8]
    expires = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

    await db.households.update_one(
        {"id": user["household_id"]},
        {"$set": {"join_code": join_code, "join_code_expires": expires}}
    )

    return {"join_code": join_code, "expires": expires}

@router.delete("/join-code")
async def revoke_join_code(user: dict = Depends(get_current_user)):
    """Revoke the current join code"""
    if not user.get("household_id"):
        raise HTTPException(status_code=400, detail="Not in a household")

    household = await db.households.find_one({"id": user["household_id"]}, {"_id": 0})
    if not household:
        raise HTTPException(status_code=404, detail="Household not found")

    if household["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only household owner can revoke join codes")

    await db.households.update_one(
        {"id": user["household_id"]},
        {"$unset": {"join_code": "", "join_code_expires": ""}}
    )

    return {"message": "Join code revoked"}

@router.post("/join")
async def join_with_code(data: JoinHouseholdRequest, user: dict = Depends(get_current_user)):
    """Join a household using a join code"""
    if user.get("household_id"):
        raise HTTPException(status_code=400, detail="Already in a household")

    # Find household with this join code
    household = await db.households.find_one({"join_code": data.join_code.upper()}, {"_id": 0})
    if not household:
        raise HTTPException(status_code=404, detail="Invalid join code")

    # Check if code is expired
    if household.get("join_code_expires"):
        expires = datetime.fromisoformat(household["join_code_expires"].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(status_code=400, detail="Join code has expired")

    # Add user to household
    await db.users.update_one({"id": user["id"]}, {"$set": {"household_id": household["id"]}})
    await db.households.update_one({"id": household["id"]}, {"$push": {"member_ids": user["id"]}})

    return {"message": f"Joined household: {household['name']}", "household_id": household["id"]}
