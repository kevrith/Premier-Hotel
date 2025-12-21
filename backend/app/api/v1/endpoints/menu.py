"""
Menu Management Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from typing import Optional, List
from app.core.supabase import get_supabase
from app.schemas.menu import MenuItemCreate, MenuItemUpdate, MenuItemResponse
from app.middleware.auth import get_current_user, require_admin

router = APIRouter()


@router.get("/items", response_model=List[MenuItemResponse])
async def get_menu_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    category: Optional[str] = None,
    available: Optional[bool] = None,
    popular: Optional[bool] = None,
    supabase: Client = Depends(get_supabase),
):
    """
    Get menu items with optional filters

    - Supports filtering by category, availability, and popularity
    - Public endpoint, no authentication required
    """
    try:
        query = supabase.table("menu_items").select("*")

        # Apply filters
        if category:
            query = query.eq("category", category)
        if available is not None:
            query = query.eq("available", available)
        if popular is not None:
            query = query.eq("popular", popular)

        # Apply pagination
        query = query.range(skip, skip + limit - 1).order("name")

        response = query.execute()
        # Transform data to match frontend expectations (available -> is_available)
        items = []
        for item in response.data:
            item_dict = dict(item)
            if 'available' in item_dict:
                item_dict['is_available'] = item_dict['available']
            items.append(item_dict)
        return items

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/items/{item_id}", response_model=MenuItemResponse)
async def get_menu_item(item_id: str, supabase: Client = Depends(get_supabase)):
    """
    Get menu item by ID

    - Returns detailed information about a specific menu item
    - Public endpoint
    """
    try:
        response = supabase.table("menu_items").select("*").eq("id", item_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Menu item not found",
            )

        # Transform data to match frontend expectations
        item_dict = dict(response.data[0])
        if 'available' in item_dict:
            item_dict['is_available'] = item_dict['available']
        return item_dict

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post("/items", response_model=MenuItemResponse, status_code=status.HTTP_201_CREATED)
async def create_menu_item(
    item_data: MenuItemCreate,
    current_user: dict = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """
    Create a new menu item (Admin only)

    - Adds a new item to the menu
    """
    try:
        # Check if item with same name already exists
        existing = (
            supabase.table("menu_items")
            .select("id")
            .eq("name", item_data.name)
            .execute()
        )

        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Menu item with this name already exists",
            )

        # Create menu item
        item_dict = item_data.model_dump()
        response = supabase.table("menu_items").insert(item_dict).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create menu item",
            )

        return MenuItemResponse(**response.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.put("/items/{item_id}", response_model=MenuItemResponse)
async def update_menu_item(
    item_id: str,
    item_data: MenuItemUpdate,
    current_user: dict = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """
    Update menu item (Admin only)

    - Updates menu item information
    """
    try:
        # Check if item exists
        existing = supabase.table("menu_items").select("id").eq("id", item_id).execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Menu item not found",
            )

        # Prepare update data
        update_data = item_data.model_dump(exclude_unset=True)

        if not update_data:
            # Return existing item if no updates
            response = supabase.table("menu_items").select("*").eq("id", item_id).execute()
            return MenuItemResponse(**response.data[0])

        # Check if name is being changed and if it already exists
        if "name" in update_data:
            existing_name = (
                supabase.table("menu_items")
                .select("id")
                .eq("name", update_data["name"])
                .neq("id", item_id)
                .execute()
            )
            if existing_name.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Menu item with this name already exists",
                )

        # Update menu item
        response = (
            supabase.table("menu_items").update(update_data).eq("id", item_id).execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update menu item",
            )

        return MenuItemResponse(**response.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_menu_item(
    item_id: str,
    current_user: dict = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """
    Delete menu item (Admin only)

    - Soft deletes by setting available to false
    """
    try:
        # Check if item exists
        existing = supabase.table("menu_items").select("id").eq("id", item_id).execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Menu item not found",
            )

        # Soft delete by updating available status
        supabase.table("menu_items").update({"available": False}).eq("id", item_id).execute()

        return None

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
