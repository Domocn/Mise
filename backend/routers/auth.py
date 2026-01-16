from fastapi import APIRouter, HTTPException, Depends
from ..models import UserCreate, UserLogin, UserResponse
from ..dependencies import db, hash_password, verify_password, create_token, get_current_user
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
        created_at=user["created_at"]
    )
