from fastapi import APIRouter, HTTPException, Depends
from models import RecipeFeedback, CookSessionCreate, CookSessionComplete
from dependencies import db, get_current_user
import uuid
from datetime import datetime, timezone
from typing import List, Optional

router = APIRouter(prefix="/cooking", tags=["Cooking"])

@router.get("/tonight")
async def get_tonight_suggestions(user: dict = Depends(get_current_user)):
    """Get 3 quick recipe suggestions for tonight based on user preferences"""
    user_id = user["id"]
    household_id = user.get("household_id")

    # Get user's feedback history to boost/bury recipes
    feedback_cursor = db.recipe_feedback.find({"user_id": user_id})
    feedback_list = await feedback_cursor.to_list(500)

    # Create score modifiers based on feedback
    boosted = set()  # 'yes' recipes
    buried = set()   # 'no' recipes

    for fb in feedback_list:
        if fb["feedback"] == "yes":
            boosted.add(fb["recipe_id"])
        elif fb["feedback"] == "no":
            buried.add(fb["recipe_id"])

    # Build query for user's recipes
    query = {"$or": [{"author_id": user_id}]}
    if household_id:
        query["$or"].append({"household_id": household_id})

    # Get all available recipes
    recipes = await db.recipes.find(query, {"_id": 0}).to_list(100)

    # Score recipes
    scored = []
    for recipe in recipes:
        score = 50  # Base score

        # Boost 'yes' recipes
        if recipe["id"] in boosted:
            score += 30

        # Bury 'no' recipes heavily
        if recipe["id"] in buried:
            score -= 50

        # Prefer quick recipes (< 45 min total)
        total_time = (recipe.get("prep_time", 0) or 0) + (recipe.get("cook_time", 0) or 0)
        if total_time <= 30:
            score += 20
        elif total_time <= 45:
            score += 10
        elif total_time > 60:
            score -= 10

        # Calculate effort level
        effort = "Low"
        if total_time > 45 or len(recipe.get("ingredients", [])) > 10:
            effort = "Medium"
        if total_time > 75 or len(recipe.get("ingredients", [])) > 15:
            effort = "High"

        scored.append({
            **recipe,
            "_score": score,
            "effort": effort,
            "total_time": total_time
        })

    # Sort by score and pick top 3
    scored.sort(key=lambda x: x["_score"], reverse=True)
    suggestions = scored[:3]

    # Remove internal score from response
    for s in suggestions:
        del s["_score"]

    return suggestions

@router.post("/session")
async def start_cook_session(data: CookSessionCreate, user: dict = Depends(get_current_user)):
    """Start a cooking session for a recipe"""
    session_id = str(uuid.uuid4())

    session = {
        "id": session_id,
        "user_id": user["id"],
        "recipe_id": data.recipe_id,
        "started_at": data.started_at or datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "feedback": None
    }

    await db.cook_sessions.insert_one(session)
    return {"session_id": session_id}

@router.post("/session/{session_id}/complete")
async def complete_cook_session(session_id: str, data: CookSessionComplete, user: dict = Depends(get_current_user)):
    """Complete a cooking session with feedback"""
    session = await db.cook_sessions.find_one({"id": session_id, "user_id": user["id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if data.feedback not in ["yes", "no", "meh"]:
        raise HTTPException(status_code=400, detail="Feedback must be 'yes', 'no', or 'meh'")

    # Update session
    await db.cook_sessions.update_one(
        {"id": session_id},
        {"$set": {
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "feedback": data.feedback
        }}
    )

    # Store/update feedback for this recipe
    await db.recipe_feedback.update_one(
        {"user_id": user["id"], "recipe_id": session["recipe_id"]},
        {"$set": {
            "feedback": data.feedback,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )

    return {"message": "Thanks for the feedback!", "feedback": data.feedback}

@router.post("/feedback")
async def submit_feedback(data: RecipeFeedback, user: dict = Depends(get_current_user)):
    """Quick feedback without a full cooking session"""
    if data.feedback not in ["yes", "no", "meh"]:
        raise HTTPException(status_code=400, detail="Feedback must be 'yes', 'no', or 'meh'")

    await db.recipe_feedback.update_one(
        {"user_id": user["id"], "recipe_id": data.recipe_id},
        {"$set": {
            "feedback": data.feedback,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )

    return {"message": "Feedback saved"}

@router.get("/stats")
async def get_cooking_stats(user: dict = Depends(get_current_user)):
    """Get user's cooking statistics"""
    user_id = user["id"]

    # Count sessions
    total_sessions = await db.cook_sessions.count_documents({"user_id": user_id, "completed_at": {"$ne": None}})

    # Count feedback
    yes_count = await db.recipe_feedback.count_documents({"user_id": user_id, "feedback": "yes"})
    no_count = await db.recipe_feedback.count_documents({"user_id": user_id, "feedback": "no"})
    meh_count = await db.recipe_feedback.count_documents({"user_id": user_id, "feedback": "meh"})

    return {
        "total_cooked": total_sessions,
        "would_cook_again": yes_count,
        "would_not_cook_again": no_count,
        "meh": meh_count
    }
