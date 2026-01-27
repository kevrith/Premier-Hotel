"""
Admin Management Endpoints
Secure endpoints for administrative operations
"""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from app.core.supabase import get_supabase
from app.middleware.auth_secure import get_current_user, require_role
from app.core.security import get_password_hash
import secrets

router = APIRouter()


# ============================================
# Schemas
# ============================================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone_number: Optional[str] = None
    role: str = "customer"


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    role: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone_number: Optional[str]
    role: str
    created_at: str


# ============================================
# User Management Endpoints
# ============================================

@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_user: dict = Depends(require_role(["admin", "owner", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Create a new user account.
    Owner and Admin can create any role. Manager can create customer, waiter, chef, and cleaner roles.
    This creates the user in auth.users and assigns role.
    """
    try:
        # Check role-based permissions for user creation
        current_user_role = current_user.get("role")
        allowed_roles_for_manager = ["customer", "waiter", "chef", "cleaner"]

        if current_user_role == "manager" and user_data.role not in allowed_roles_for_manager:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Managers can only create users with roles: {', '.join(allowed_roles_for_manager)}"
            )
        elif current_user_role not in ["admin", "owner", "manager"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to create users"
            )

        # Hash the password using bcrypt (same as auth registration)
        password_hash = get_password_hash(user_data.password)

        # Create user in users table
        user_insert = {
            "email": user_data.email,
            "full_name": user_data.full_name,
            "phone": user_data.phone_number,  # Use 'phone' not 'phone_number'
            "password_hash": password_hash,
            "role": user_data.role,
            "email_verified": True,  # Admin-created users are auto-verified
            "phone_verified": True if user_data.phone_number else False,
            "is_verified": True,
            "status": "active"
        }

        result = supabase.table("users").insert(user_insert).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )

        created_user = result.data[0]

        return UserResponse(
            id=created_user["id"],
            email=created_user["email"],
            full_name=created_user["full_name"],
            phone_number=created_user.get("phone"),  # Map 'phone' to 'phone_number' for API response
            role=user_data.role,
            created_at=created_user["created_at"]
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating user: {str(e)}"
        )


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    role: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    List all users with optional role and status filtering.
    """
    try:
        query = supabase.table("users").select("*")

        if role:
            query = query.eq("role", role)

        if status:
            query = query.eq("status", status)

        query = query.range(skip, skip + limit - 1).order("created_at", desc=True)

        result = query.execute()

        return [
            UserResponse(
                id=user["id"],
                email=user["email"],
                full_name=user.get("full_name", ""),
                phone_number=user.get("phone"),  # Map 'phone' to 'phone_number'
                role=user.get("role", "customer"),
                created_at=user["created_at"]
            )
            for user in result.data
        ]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching users: {str(e)}"
        )


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role: str,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Update a user's role.
    Admin can update any role. Manager can only update staff roles (waiter, chef, cleaner).
    """
    try:
        current_user_role = current_user.get("role")
        allowed_roles_for_manager = ["waiter", "chef", "cleaner"]
        
        # Check permissions based on current user role
        if current_user_role == "manager":
            if role not in allowed_roles_for_manager:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Managers can only assign roles: {', '.join(allowed_roles_for_manager)}"
                )
            
            # Also check that the target user is a staff member
            user_result = supabase.table("users").select("role").eq("id", user_id).execute()
            if not user_result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            current_role = user_result.data[0].get("role")
            if current_role not in allowed_roles_for_manager:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Managers can only modify staff member roles"
                )

        # Update role in users table
        result = supabase.table("users").update({
            "role": role,
            "updated_at": "NOW()"
        }).eq("id", user_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        return {"message": "Role updated successfully", "user_id": user_id, "new_role": role}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating role: {str(e)}"
        )


@router.delete("/users/{user_id}")
async def deactivate_user(
    user_id: str,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Deactivate a user account.
    Admin can deactivate any user. Manager can only deactivate staff members.
    We don't delete users, just mark as inactive.
    """
    try:
        current_user_role = current_user.get("role")
        allowed_roles_for_manager = ["waiter", "chef", "cleaner"]
        
        # Check permissions for managers
        if current_user_role == "manager":
            # Check that the target user is a staff member
            user_result = supabase.table("users").select("role").eq("id", user_id).execute()
            if not user_result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            target_role = user_result.data[0].get("role")
            if target_role not in allowed_roles_for_manager:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Managers can only deactivate staff members"
                )

        result = supabase.table("users").update({
            "status": "inactive",
            "updated_at": "NOW()"
        }).eq("id", user_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        return {"message": "User deactivated successfully", "user_id": user_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error deactivating user: {str(e)}"
        )


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Get details of a specific user.
    """
    try:
        result = supabase.table("users").select("*").eq("id", user_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        user = result.data[0]

        return UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user.get("full_name", ""),
            phone_number=user.get("phone"),  # Map 'phone' to 'phone_number'
            role=user.get("role", "customer"),
            created_at=user["created_at"]
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching user: {str(e)}"
        )
