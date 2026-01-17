from fastapi import APIRouter, HTTPException, Depends
<<<<<<< HEAD
from ..models import UserCreate, UserLogin, UserResponse
from ..dependencies import db, hash_password, verify_password, create_token, get_current_user
=======
from models import UserCreate, UserLogin, UserResponse, UserUpdate
from dependencies import db, hash_password, verify_password, create_token, get_current_user
>>>>>>> eeb2f0a8096c3f307ab184e32aaec8451355d15a
import uuid
import asyncio
from datetime import datetime, timezone

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", response_model=dict)
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    # Hash password in a thread pool
    hashed_password = await asyncio.get_running_loop().run_in_executor(
        None, hash_password, user.password
    )

    user_doc = {
        "id": user_id,
        "email": user.email,
        "password": hashed_password,
        "name": user.name,
        "household_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id)
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user.email,
            "name": user.name,
            "household_id": None,
            "created_at": user_doc["created_at"]
        }
    }

@router.post("/login", response_model=dict)
async def login(user: UserLogin):
    db_user = await db.users.find_one({"email": user.email}, {"_id": 0})
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Verify password in a thread pool
    is_valid = await asyncio.get_running_loop().run_in_executor(
        None, verify_password, user.password, db_user["password"]
    )

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(db_user["id"])
    return {
        "token": token,
        "user": {
            "id": db_user["id"],
            "email": db_user["email"],
            "name": db_user["name"],
            "household_id": db_user.get("household_id"),
            "created_at": db_user["created_at"]
        }
    }

@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        household_id=user.get("household_id"),
        allergies=user.get("allergies", []),
        created_at=user["created_at"]
    )

@router.put("/me", response_model=UserResponse)
async def update_profile(data: UserUpdate, user: dict = Depends(get_current_user)):
    update_data = {}

    if data.name is not None:
        update_data["name"] = data.name

    if data.email is not None and data.email != user["email"]:
        existing = await db.users.find_one({"email": data.email})
        if existing and existing["id"] != user["id"]:
            raise HTTPException(status_code=400, detail="Email already in use")
        update_data["email"] = data.email

    if data.allergies is not None:
        update_data["allergies"] = data.allergies

    if update_data:
        await db.users.update_one({"id": user["id"]}, {"$set": update_data})

    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return UserResponse(
        id=updated_user["id"],
        email=updated_user["email"],
        name=updated_user["name"],
        household_id=updated_user.get("household_id"),
        allergies=updated_user.get("allergies", []),
        created_at=updated_user["created_at"]
    )

@router.delete("/me")
async def delete_account(user: dict = Depends(get_current_user)):
    """Delete user account and all associated data"""
    user_id = user["id"]
    household_id = user.get("household_id")

    # If user owns a household, delete or transfer it
    if household_id:
        household = await db.households.find_one({"id": household_id})
        if household and household["owner_id"] == user_id:
            # If only member, delete household
            if len(household["member_ids"]) <= 1:
                await db.households.delete_one({"id": household_id})
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Transfer household ownership before deleting account"
                )
        else:
            # Remove from household members
            await db.households.update_one(
                {"id": household_id},
                {"$pull": {"member_ids": user_id}}
            )

    # Delete user's recipes (not shared with household)
    await db.recipes.delete_many({"author_id": user_id, "household_id": None})

    # Delete user's custom prompts
    await db.custom_prompts.delete_many({"user_id": user_id})

    # Delete user's favorites
    await db.favorites.delete_many({"user_id": user_id})

    # Delete user's LLM settings
    await db.llm_settings.delete_many({"user_id": user_id})

    # Delete user account
    await db.users.delete_one({"id": user_id})

    return {"message": "Account deleted successfully"}
