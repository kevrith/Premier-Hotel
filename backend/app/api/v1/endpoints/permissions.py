"""Permission Management Endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.schemas.permissions import (
    UserPermissionsUpdate,
    UserPermissionsResponse,
    AvailablePermission
)
from app.middleware.auth_secure import get_current_user
from app.core.supabase import get_supabase_admin

router = APIRouter()

# Available permissions with metadata
AVAILABLE_PERMISSIONS = [
    {"key": "can_manage_staff", "label": "Manage Staff", "description": "Create, update, delete staff members", "category": "Staff"},
    {"key": "can_view_reports", "label": "View Reports", "description": "Access financial and operational reports", "category": "Reports"},
    {"key": "can_view_employee_reports", "label": "View Employee Performance Reports", "description": "Access employee sales and performance reports", "category": "Reports"},
    {"key": "can_print_item_summary", "label": "Print Item Summary", "description": "View and print items sold summary report for all staff", "category": "Reports"},
    {"key": "can_manage_inventory", "label": "Manage Inventory", "description": "Manage inventory and supplies", "category": "Inventory"},
    {"key": "can_manage_rooms", "label": "Manage Rooms", "description": "Manage room status and details", "category": "Rooms"},
    {"key": "can_manage_bookings", "label": "Manage Bookings", "description": "View and modify bookings", "category": "Bookings"},
    {"key": "can_manage_orders", "label": "Manage Orders", "description": "View and process orders", "category": "Orders"},
    {"key": "can_void_orders", "label": "Void Orders", "description": "Void or cancel orders without manager present", "category": "Orders"},
    {"key": "can_process_payments", "label": "Process Payments", "description": "Handle payment transactions", "category": "Payments"},
    {"key": "can_view_analytics", "label": "View Analytics", "description": "Access analytics dashboards", "category": "Analytics"},
    {"key": "can_manage_menu", "label": "Manage Menu", "description": "Add, update, delete menu items", "category": "Menu"},
    {"key": "can_manage_housekeeping", "label": "Manage Housekeeping", "description": "Assign and track cleaning tasks", "category": "Housekeeping"},
    {"key": "can_assign_tasks", "label": "Assign Tasks", "description": "Assign tasks to staff members", "category": "Tasks"},
    {"key": "can_manage_permissions", "label": "Manage Permissions", "description": "Grant or revoke permissions", "category": "Permissions"},
    {"key": "can_manage_kitchen_inventory", "label": "Manage Kitchen Inventory", "description": "View and take stock of the kitchen inventory (for non-kitchen staff)", "category": "Inventory"},
]


@router.get("/available", response_model=List[AvailablePermission])
async def get_available_permissions(current_user: dict = Depends(get_current_user)):
    """Get list of all available permissions"""
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and managers can view permissions"
        )
    return AVAILABLE_PERMISSIONS


@router.get("/user/{user_id}", response_model=UserPermissionsResponse)
async def get_user_permissions(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get permissions for a specific user"""
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and managers can view user permissions"
        )
    
    supabase = get_supabase_admin()
    result = supabase.table("users").select("id, email, full_name, role, permissions, updated_at").eq("id", user_id).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_data = result.data
    return UserPermissionsResponse(
        id=user_data["id"],
        email=user_data.get("email"),
        full_name=user_data["full_name"],
        role=user_data["role"],
        permissions=user_data.get("permissions") or [],
        updated_at=user_data["updated_at"]
    )


@router.put("/user/{user_id}", response_model=UserPermissionsResponse)
async def update_user_permissions(
    user_id: str,
    permissions_update: UserPermissionsUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update permissions for a user (Admin and Manager only)"""
    # Check authorization
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and managers can manage permissions"
        )
    
    # Validate permissions
    valid_permissions = {p["key"] for p in AVAILABLE_PERMISSIONS}
    invalid = [p for p in permissions_update.permissions if p not in valid_permissions]
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid permissions: {', '.join(invalid)}"
        )
    
    # Update permissions
    supabase = get_supabase_admin()
    result = supabase.table("users").update({
        "permissions": permissions_update.permissions
    }).eq("id", user_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Fetch updated user
    updated_user = supabase.table("users").select("id, email, full_name, role, permissions, updated_at").eq("id", user_id).single().execute()
    
    return UserPermissionsResponse(
        id=updated_user.data["id"],
        email=updated_user.data.get("email"),
        full_name=updated_user.data["full_name"],
        role=updated_user.data["role"],
        permissions=updated_user.data.get("permissions", []),
        updated_at=updated_user.data["updated_at"]
    )


@router.get("/staff", response_model=List[UserPermissionsResponse])
async def get_all_staff_permissions(current_user: dict = Depends(get_current_user)):
    """Get all staff members with their permissions"""
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and managers can view staff permissions"
        )
    
    supabase = get_supabase_admin()
    result = supabase.table("users").select(
        "id, email, full_name, role, permissions, assigned_location_id, updated_at"
    ).in_(
        "role", ["chef", "waiter", "cleaner", "manager", "admin", "owner"]
    ).eq("status", "active").execute()
    
    if not result.data:
        return []

    return [
        UserPermissionsResponse(
            id=user["id"],
            email=user.get("email") or "",
            full_name=user.get("full_name") or user.get("email") or "Unknown",
            role=user["role"],
            permissions=user.get("permissions") or [],
            assigned_location_id=user.get("assigned_location_id"),
            updated_at=user.get("updated_at") or ""
        )
        for user in result.data
        if user.get("id") and user.get("role")
    ]
