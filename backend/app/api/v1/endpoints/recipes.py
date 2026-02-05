"""
Recipe Management Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from typing import List
from app.core.supabase import get_supabase_admin
from app.middleware.auth_secure import get_current_user
from pydantic import BaseModel

router = APIRouter()


class RecipeCreate(BaseModel):
    name: str
    category: str
    prep_time: int
    servings: int
    ingredients: List[str]
    steps: List[str]
    notes: str | None = None


class RecipeResponse(BaseModel):
    id: str
    name: str
    category: str
    prep_time: int
    servings: int
    ingredients: List[str]
    steps: List[str]
    notes: str | None
    created_by: str | None
    created_at: str
    updated_at: str


@router.get("", response_model=List[RecipeResponse])
async def get_recipes(supabase: Client = Depends(get_supabase_admin)):
    """Get all recipes"""
    try:
        response = supabase.table("recipes").select("*").order("name").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
async def create_recipe(
    recipe: RecipeCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Create a new recipe (chef, manager, admin only)"""
    if current_user["role"] not in ["chef", "manager", "admin"]:
        raise HTTPException(status_code=403, detail="Only chefs can create recipes")
    
    try:
        data = recipe.model_dump()
        data["created_by"] = current_user["id"]
        response = supabase.table("recipes").insert(data).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{recipe_id}", response_model=RecipeResponse)
async def update_recipe(
    recipe_id: str,
    recipe: RecipeCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Update a recipe (creator, manager, admin only)"""
    try:
        existing = supabase.table("recipes").select("created_by").eq("id", recipe_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Recipe not found")
        
        if (existing.data[0]["created_by"] != current_user["id"] and 
            current_user["role"] not in ["manager", "admin"]):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        response = supabase.table("recipes").update(recipe.model_dump()).eq("id", recipe_id).execute()
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recipe(
    recipe_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Delete a recipe (creator, manager, admin only)"""
    try:
        existing = supabase.table("recipes").select("created_by").eq("id", recipe_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Recipe not found")
        
        if (existing.data[0]["created_by"] != current_user["id"] and 
            current_user["role"] not in ["manager", "admin"]):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        supabase.table("recipes").delete().eq("id", recipe_id).execute()
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
