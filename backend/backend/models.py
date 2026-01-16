from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional

# Auth Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    household_id: Optional[str] = None
    created_at: str

# Household Models
class HouseholdCreate(BaseModel):
    name: str

class HouseholdInvite(BaseModel):
    email: EmailStr

class HouseholdResponse(BaseModel):
    id: str
    name: str
    owner_id: str
    member_ids: List[str]
    created_at: str

# Recipe Models
class Ingredient(BaseModel):
    name: str
    amount: str
    unit: Optional[str] = ""

class RecipeCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    ingredients: List[Ingredient]
    instructions: List[str]
    prep_time: Optional[int] = 0
    cook_time: Optional[int] = 0
    servings: Optional[int] = 4
    category: Optional[str] = "Other"
    tags: Optional[List[str]] = []
    image_url: Optional[str] = ""

class RecipeResponse(BaseModel):
    id: str
    title: str
    description: str
    ingredients: List[Ingredient]
    instructions: List[str]
    prep_time: int
    cook_time: int
    servings: int
    category: str
    tags: List[str]
    image_url: str
    author_id: str
    household_id: Optional[str]
    created_at: str
    updated_at: str
    is_favorite: Optional[bool] = False

class ShareRecipeRequest(BaseModel):
    recipe_id: str
    expires_days: Optional[int] = 30

# Meal Plan Models
class MealPlanCreate(BaseModel):
    date: str
    meal_type: str  # breakfast, lunch, dinner, snack
    recipe_id: str
    notes: Optional[str] = ""

class MealPlanResponse(BaseModel):
    id: str
    date: str
    meal_type: str
    recipe_id: str
    recipe_title: str
    notes: str
    household_id: str
    created_at: str

class AutoMealPlanRequest(BaseModel):
    days: int = 7
    preferences: Optional[str] = ""  # e.g., "vegetarian", "low-carb", "quick meals"
    exclude_recipes: Optional[List[str]] = []

# Shopping List Models
class ShoppingItem(BaseModel):
    name: str
    amount: str
    unit: Optional[str] = ""
    checked: bool = False
    recipe_id: Optional[str] = None

class ShoppingListCreate(BaseModel):
    name: str
    items: Optional[List[ShoppingItem]] = []

class ShoppingListResponse(BaseModel):
    id: str
    name: str
    items: List[ShoppingItem]
    household_id: str
    created_at: str
    updated_at: str

# AI Models
class ImportURLRequest(BaseModel):
    url: str

class ImportTextRequest(BaseModel):
    text: str

class FridgeSearchRequest(BaseModel):
    ingredients: List[str]
    search_online: bool = False

class LLMSettingsUpdate(BaseModel):
    provider: str  # 'openai', 'ollama', or 'embedded'
    ollama_url: Optional[str] = 'http://localhost:11434'
    ollama_model: Optional[str] = 'llama3'
    embedded_model: Optional[str] = 'Phi-3-mini-4k-instruct.Q4_0.gguf'

class ImportPlatformRequest(BaseModel):
    platform: str  # 'paprika', 'cookmate', 'json', 'text'
    data: str  # JSON string or text content
