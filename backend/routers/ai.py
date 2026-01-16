from fastapi import APIRouter, HTTPException, Depends, Request
from models import ImportURLRequest, ImportTextRequest, AutoMealPlanRequest, FridgeSearchRequest
from dependencies import db, get_current_user, call_llm, clean_llm_json
from bs4 import BeautifulSoup
import json
import logging

router = APIRouter(prefix="/ai", tags=["AI"])
logger = logging.getLogger(__name__)

@router.post("/import-url")
async def import_recipe_from_url(
    request: Request,
    data: ImportURLRequest,
    user: dict = Depends(get_current_user)
):
    """Extract recipe from URL using AI"""
    try:
        client = request.app.state.http_client
        response = await client.get(data.url, timeout=30.0, follow_redirects=True)
        html = response.text

        soup = BeautifulSoup(html, 'html.parser')

        # Remove scripts and styles
        for element in soup(['script', 'style', 'nav', 'footer', 'header']):
            element.decompose()

        text_content = soup.get_text(separator='\n', strip=True)[:8000]

        system_prompt = """You are a recipe extraction assistant. Extract recipe information from webpage content and return ONLY valid JSON.
Return exactly this format (no markdown, no explanation):
{
  "title": "Recipe Name",
  "description": "Brief description",
  "ingredients": [{"name": "ingredient", "amount": "1", "unit": "cup"}],
  "instructions": ["Step 1", "Step 2"],
  "prep_time": 15,
  "cook_time": 30,
  "servings": 4,
  "category": "Main Course",
  "tags": ["tag1", "tag2"]
}
Categories: Breakfast, Lunch, Dinner, Dessert, Appetizer, Snack, Beverage, Other"""

        result = await call_llm(
            request.app.state.http_client,
            system_prompt,
            f"Extract recipe from:\n{text_content}",
            user["id"]
        )

        result = clean_llm_json(result)

        recipe_data = json.loads(result)

        return recipe_data
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse recipe data: {str(e)}")
    except Exception as e:
        logger.error(f"Import error: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to import recipe: {str(e)}")

@router.post("/import-text")
async def import_recipe_from_text(
    request: Request,
    data: ImportTextRequest,
    user: dict = Depends(get_current_user)
):
    """Extract recipe from pasted text using AI"""
    system_prompt = """You are a recipe extraction assistant. Parse the provided recipe text and return ONLY valid JSON.
Return exactly this format (no markdown, no explanation):
{
  "title": "Recipe Name",
  "description": "Brief description",
  "ingredients": [{"name": "ingredient", "amount": "1", "unit": "cup"}],
  "instructions": ["Step 1", "Step 2"],
  "prep_time": 15,
  "cook_time": 30,
  "servings": 4,
  "category": "Dinner",
  "tags": ["tag1", "tag2"]
}
If times aren't specified, estimate reasonable values. Categories: Breakfast, Lunch, Dinner, Dessert, Appetizer, Snack, Beverage, Other"""

    result = await call_llm(
        request.app.state.http_client,
        system_prompt,
        f"Parse this recipe:\n{data.text[:6000]}",
        user["id"]
    )

    result = clean_llm_json(result)

    try:
        recipe_data = json.loads(result)
        return recipe_data
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse recipe: {str(e)}")

@router.post("/auto-meal-plan")
async def auto_generate_meal_plan(
    request: Request,
    data: AutoMealPlanRequest,
    user: dict = Depends(get_current_user)
):
    """Auto-generate a meal plan for the week using AI"""
    # Get user's recipes
    query = {"$or": [{"author_id": user["id"]}]}
    if user.get("household_id"):
        query["$or"].append({"household_id": user["household_id"]})

    recipes = await db.recipes.find(query, {"_id": 0}).to_list(200)

    if len(recipes) < 3:
        raise HTTPException(status_code=400, detail="Need at least 3 recipes to generate a meal plan")

    recipes_summary = [{"id": r["id"], "title": r["title"], "category": r["category"], "tags": r.get("tags", [])} for r in recipes]

    system_prompt = """You are a meal planning assistant. Create a balanced weekly meal plan using the available recipes.
Return ONLY valid JSON in this format:
{
  "plan": [
    {"day": 0, "meals": [
      {"meal_type": "Breakfast", "recipe_id": "id", "recipe_title": "title"},
      {"meal_type": "Lunch", "recipe_id": "id", "recipe_title": "title"},
      {"meal_type": "Dinner", "recipe_id": "id", "recipe_title": "title"}
    ]},
    ...for all 7 days (day 0 = today)
  ],
  "notes": "Brief explanation of the plan"
}
Consider variety, nutrition balance, and user preferences. Use actual recipe IDs from the provided list."""

    user_prompt = f"""Create a {data.days}-day meal plan.
Preferences: {data.preferences or 'balanced variety'}
Exclude recipes: {data.exclude_recipes or 'none'}

Available recipes:
{json.dumps(recipes_summary, indent=2)}"""

    result = await call_llm(request.app.state.http_client, system_prompt, user_prompt, user["id"])

    result = clean_llm_json(result)

    try:
        plan_data = json.loads(result)
        return plan_data
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to generate meal plan")

@router.post("/fridge-search")
async def fridge_search(
    request: Request,
    data: FridgeSearchRequest,
    user: dict = Depends(get_current_user)
):
    """Find recipes matching available ingredients"""
    ingredients_str = ", ".join(data.ingredients)

    # First, search existing recipes
    query = {"$or": [{"author_id": user["id"]}]}
    if user.get("household_id"):
        query["$or"].append({"household_id": user["household_id"]})

    all_recipes = await db.recipes.find(query, {"_id": 0}).to_list(500)

    # If no recipes and user wants AI suggestions, just ask for a new recipe
    if len(all_recipes) == 0 and data.search_online:
        system_prompt = """You are a helpful cooking assistant. Given a list of ingredients, suggest ONE simple recipe.
Return ONLY valid JSON in this format (no markdown, no explanation):
{
  "matching_recipe_ids": [],
  "suggestions": [],
  "ai_suggestion": {
    "title": "Recipe Name",
    "description": "Brief description",
    "ingredients": [{"name": "ingredient", "amount": "1", "unit": "cup"}],
    "instructions": ["Step 1", "Step 2"],
    "prep_time": 10,
    "cook_time": 20,
    "servings": 4
  }
}"""
        user_prompt = f"I have these ingredients: {ingredients_str}. Suggest a simple recipe I can make."
    else:
        # Use AI to find matching recipes
        system_prompt = """You are a recipe matching assistant. Given a list of available ingredients and a list of recipes, identify which recipes can be made with the available ingredients (allowing for minor missing seasonings/staples).

Return ONLY valid JSON in this format (no markdown, no explanation):
{
  "matching_recipe_ids": ["id1", "id2"],
  "suggestions": [
    {
      "recipe_id": "id",
      "missing_ingredients": ["ingredient1"],
      "match_percentage": 90
    }
  ],
  "ai_suggestion": null
}
If search_online is true and you want to suggest a NEW recipe, set ai_suggestion to a recipe object instead of null."""

        recipes_info = [{"id": r["id"], "title": r["title"], "ingredients": [i.get("name", i) if isinstance(i, dict) else i for i in r.get("ingredients", [])]} for r in all_recipes]

        user_prompt = f"""Available ingredients: {ingredients_str}

Existing recipes:
{json.dumps(recipes_info, indent=2) if recipes_info else "No existing recipes yet."}

Find matching recipes{" and suggest a new simple recipe" if data.search_online else ""}."""

    try:
        result = await call_llm(request.app.state.http_client, system_prompt, user_prompt, user["id"])
        logger.info(f"LLM response length: {len(result) if result else 0}")

        if not result or len(result.strip()) == 0:
            logger.warning("LLM returned empty response")
            return {
                "matching_recipes": [],
                "suggestions": [],
                "ai_recipe_suggestion": None,
                "error": "AI returned empty response. Try again or use a different AI provider."
            }

        result = clean_llm_json(result)
        ai_result = json.loads(result)
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse AI fridge-search response: {e}, raw: {result[:500] if result else 'empty'}")
        return {
            "matching_recipes": [],
            "suggestions": [],
            "ai_recipe_suggestion": None,
            "error": f"AI response was not valid JSON. The embedded AI may have crashed. Try using Ollama or a cloud API instead."
        }
    except Exception as e:
        logger.error(f"AI fridge-search error: {e}")
        return {
            "matching_recipes": [],
            "suggestions": [],
            "ai_recipe_suggestion": None,
            "error": str(e)
        }

    # Get full recipe data for matches
    matching_recipes = [r for r in all_recipes if r["id"] in ai_result.get("matching_recipe_ids", [])]

    return {
        "matching_recipes": matching_recipes,
        "suggestions": ai_result.get("suggestions", []),
        "ai_recipe_suggestion": ai_result.get("ai_suggestion")
    }
