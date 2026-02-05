"""
Enhanced Admin Management Endpoints
Complete user lifecycle management with audit logging and advanced features
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from supabase import Client
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from app.core.supabase import get_supabase, get_supabase_admin
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


class UserDeactivate(BaseModel):
    reason: str
    termination_date: Optional[str] = None
    notes: Optional[str] = None


class UserDelete(BaseModel):
    reason: str
    confirmation: str  # Must type "DELETE"


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone_number: Optional[str]
    role: str
    status: str
    created_at: str
    last_login_at: Optional[str] = None
    terminated_at: Optional[str] = None
    termination_reason: Optional[str] = None


class AuditLogEntry(BaseModel):
    id: str
    user_id: str
    action: str
    performed_by_user_id: str
    performed_by_name: Optional[str] = None
    details: Optional[dict] = None
    ip_address: Optional[str] = None
    created_at: str


class UserStatistics(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    terminated_users: int
    deleted_users: int
    users_by_role: dict
    recent_signups: int
    recent_terminations: int
    users_created_this_month: int


# ============================================
# Helper Functions
# ============================================

def get_client_ip(request: Request) -> str:
    """Extract client IP address from request"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0]
    return request.client.host if request.client else "unknown"


async def log_audit(
    supabase: Client,
    user_id: str,
    action: str,
    performed_by_user_id: str,
    details: dict = None,
    ip_address: str = None
):
    """Log an audit entry"""
    try:
        audit_entry = {
            "user_id": user_id,
            "action": action,
            "performed_by_user_id": performed_by_user_id,
            "details": details,
            "ip_address": ip_address
        }
        supabase.table("user_audit_log").insert(audit_entry).execute()
    except Exception as e:
        print(f"Warning: Failed to log audit entry: {e}")


def can_create_role(current_user_role: str, target_role: str) -> bool:
    """Check if current user can create a user with target role"""
    role_hierarchy = {
        "admin": ["admin", "owner", "manager", "waiter", "chef", "cleaner", "customer"],
        "owner": ["manager", "waiter", "chef", "cleaner", "customer"],
        "manager": ["waiter", "chef", "cleaner", "customer"]
    }
    return target_role in role_hierarchy.get(current_user_role, [])


def can_manage_user(current_user_role: str, target_user_role: str) -> bool:
    """Check if current user can manage (edit/delete) target user"""
    if current_user_role == "admin":
        return True
    if current_user_role == "owner":
        return target_user_role != "admin"
    if current_user_role == "manager":
        return target_user_role in ["waiter", "chef", "cleaner", "customer"]
    return False


async def check_active_obligations(supabase: Client, user_id: str) -> dict:
    """Check if user has any active obligations"""
    obligations = []

    # Check unpaid bills
    try:
        bills_result = supabase.table("bills")\
            .select("id, bill_number")\
            .eq("settled_by_waiter_id", user_id)\
            .neq("payment_status", "paid")\
            .execute()

        if bills_result.data:
            obligations.append({
                "type": "unpaid_bills",
                "count": len(bills_result.data),
                "details": [b["bill_number"] for b in bills_result.data[:5]]
            })
    except:
        pass

    # Check pending orders
    try:
        orders_result = supabase.table("orders")\
            .select("id, order_number")\
            .eq("created_by_staff_id", user_id)\
            .in_("status", ["pending", "preparing", "ready"])\
            .execute()

        if orders_result.data:
            obligations.append({
                "type": "pending_orders",
                "count": len(orders_result.data),
                "details": [o["order_number"] for o in orders_result.data[:5]]
            })
    except:
        pass

    return {
        "has_obligations": len(obligations) > 0,
        "obligations": obligations
    }


# ============================================
# User Management Endpoints
# ============================================

@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    request: Request,
    current_user: dict = Depends(require_role(["admin", "owner", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Create a new user account.
    - Admin can create anyone
    - Owner can create everyone except admin
    - Manager can create waiter, chef, cleaner
    """
    try:
        # Check permission
        if not can_create_role(current_user["role"], user_data.role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{current_user['role']} cannot create {user_data.role} users"
            )

        # Hash the password
        password_hash = get_password_hash(user_data.password)

        # Create user in users table
        user_insert = {
            "email": user_data.email,
            "full_name": user_data.full_name,
            "phone": user_data.phone_number if user_data.phone_number else None,  # Allow NULL for unique constraint
            "password_hash": password_hash,
            "role": user_data.role,
            "email_verified": True,
            "phone_verified": True if user_data.phone_number else False,
            "is_verified": True,
            "status": "active",
            "created_by_user_id": current_user["id"]
        }

        result = supabase.table("users").insert(user_insert).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )

        created_user = result.data[0]

        # Log audit
        await log_audit(
            supabase,
            created_user["id"],
            "user_created",
            current_user["id"],
            {"role": user_data.role, "email": user_data.email},
            get_client_ip(request)
        )

        return UserResponse(
            id=created_user["id"],
            email=created_user["email"],
            full_name=created_user["full_name"],
            phone_number=created_user.get("phone"),
            role=user_data.role,
            status=created_user.get("status", "active"),
            created_at=created_user["created_at"]
        )

    except HTTPException:
        raise
    except ValueError as e:
        # Handle specific validation errors
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user data provided"
        )
    except Exception:
        # Log the actual error for debugging but don't expose it
        import logging
        logging.error(f"Failed to create user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user account"
        )


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    role: Optional[str] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(require_role(["admin", "owner", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """List all users with optional filtering"""
    try:
        query = supabase.table("users").select("*")

        if role:
            query = query.eq("role", role)

        if status_filter:
            query = query.eq("status", status_filter)

        query = query.range(skip, skip + limit - 1).order("created_at", desc=True)

        result = query.execute()

        return [
            UserResponse(
                id=user["id"],
                email=user["email"],
                full_name=user.get("full_name", ""),
                phone_number=user.get("phone"),
                role=user.get("role", "customer"),
                status=user.get("status", "active"),
                created_at=user["created_at"],
                last_login_at=user.get("last_login_at"),
                terminated_at=user.get("terminated_at"),
                termination_reason=user.get("termination_reason")
            )
            for user in result.data
        ]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching users: {str(e)}"
        )


@router.patch("/users/{user_id}/permissions")
async def update_user_permissions(
    user_id: str,
    permissions: List[str],
    request: Request,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """Update user permissions (admin/manager only)"""
    try:
        # Get target user
        user_result = supabase.table("users").select("role, email").eq("id", user_id).execute()
        if not user_result.data:
            raise HTTPException(status_code=404, detail="User not found")

        # Update permissions
        result = supabase.table("users").update({
            "permissions": permissions,
            "updated_by_user_id": current_user["id"]
        }).eq("id", user_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")

        # Log audit
        await log_audit(
            supabase,
            user_id,
            "permissions_updated",
            current_user["id"],
            {"permissions": permissions},
            get_client_ip(request)
        )

        return {"message": "Permissions updated successfully", "user_id": user_id, "permissions": permissions}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating permissions: {str(e)}"
        )


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role: str,
    request: Request,
    current_user: dict = Depends(require_role(["admin", "owner"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """Update a user's role (admin/owner only)"""
    try:
        # Get current user data
        user_result = supabase.table("users").select("role").eq("id", user_id).execute()
        if not user_result.data:
            raise HTTPException(status_code=404, detail="User not found")

        old_role = user_result.data[0]["role"]

        # Check permission
        if not can_manage_user(current_user["role"], old_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to manage this user"
            )

        # Update role
        result = supabase.table("users").update({
            "role": role,
            "updated_by_user_id": current_user["id"]
        }).eq("id", user_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")

        # Log audit
        await log_audit(
            supabase,
            user_id,
            "role_changed",
            current_user["id"],
            {"old_role": old_role, "new_role": role},
            get_client_ip(request)
        )

        return {"message": "Role updated successfully", "user_id": user_id, "new_role": role}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating role: {str(e)}"
        )


@router.put("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: str,
    deactivation_data: UserDeactivate,
    request: Request,
    current_user: dict = Depends(require_role(["admin", "owner", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Deactivate a user (soft delete).
    Blocks login but preserves historical data.
    """
    try:
        # Cannot deactivate yourself
        if user_id == current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate your own account"
            )

        # Get target user
        user_result = supabase.table("users").select("role, email, full_name").eq("id", user_id).execute()
        if not user_result.data:
            raise HTTPException(status_code=404, detail="User not found")

        target_user = user_result.data[0]

        # Check permission
        if not can_manage_user(current_user["role"], target_user["role"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to deactivate this user"
            )

        # Update user status
        termination_date = deactivation_data.termination_date or datetime.now().isoformat()

        result = supabase.table("users").update({
            "status": "terminated",
            "terminated_at": termination_date,
            "termination_reason": deactivation_data.reason,
            "updated_by_user_id": current_user["id"]
        }).eq("id", user_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")

        # Log audit
        await log_audit(
            supabase,
            user_id,
            "user_deactivated",
            current_user["id"],
            {
                "reason": deactivation_data.reason,
                "termination_date": termination_date,
                "notes": deactivation_data.notes,
                "user_email": target_user["email"],
                "user_name": target_user["full_name"]
            },
            get_client_ip(request)
        )

        return {
            "message": "User deactivated successfully",
            "user_id": user_id,
            "terminated_at": termination_date
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error deactivating user: {str(e)}"
        )


@router.put("/users/{user_id}/reactivate")
async def reactivate_user(
    user_id: str,
    request: Request,
    current_user: dict = Depends(require_role(["admin", "owner"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """Reactivate a previously deactivated user (admin/owner only)"""
    try:
        # Get target user
        user_result = supabase.table("users").select("role, email, full_name, status").eq("id", user_id).execute()
        if not user_result.data:
            raise HTTPException(status_code=404, detail="User not found")

        target_user = user_result.data[0]

        if target_user["status"] == "deleted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot reactivate a deleted user"
            )

        # Reactivate user
        result = supabase.table("users").update({
            "status": "active",
            "terminated_at": None,
            "termination_reason": None,
            "updated_by_user_id": current_user["id"]
        }).eq("id", user_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")

        # Log audit
        await log_audit(
            supabase,
            user_id,
            "user_reactivated",
            current_user["id"],
            {
                "user_email": target_user["email"],
                "user_name": target_user["full_name"]
            },
            get_client_ip(request)
        )

        return {"message": "User reactivated successfully", "user_id": user_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reactivating user: {str(e)}"
        )


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    delete_data: UserDelete,
    request: Request,
    current_user: dict = Depends(require_role(["admin", "owner"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Permanently delete a user (admin/owner only).
    Requires confirmation and checks for active obligations.
    """
    try:
        # Validate confirmation
        if delete_data.confirmation != "DELETE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Must type "DELETE" to confirm deletion'
            )

        # Cannot delete yourself
        if user_id == current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account"
            )

        # Get target user
        user_result = supabase.table("users").select("role, email, full_name").eq("id", user_id).execute()
        if not user_result.data:
            raise HTTPException(status_code=404, detail="User not found")

        target_user = user_result.data[0]

        # Cannot delete last admin
        if target_user["role"] == "admin":
            admin_count = supabase.table("users").select("id").eq("role", "admin").eq("status", "active").execute()
            if len(admin_count.data) <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot delete the last admin user"
                )

        # Check for active obligations
        obligations = await check_active_obligations(supabase, user_id)

        if obligations["has_obligations"]:
            obligation_details = ", ".join([
                f"{o['count']} {o['type']}" for o in obligations["obligations"]
            ])
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete user with active obligations: {obligation_details}"
            )

        # Mark as deleted (soft delete but more permanent)
        result = supabase.table("users").update({
            "status": "deleted",
            "terminated_at": datetime.now().isoformat(),
            "termination_reason": f"DELETED: {delete_data.reason}",
            "email": f"deleted_{user_id}@deleted.local",  # Anonymize email
            "updated_by_user_id": current_user["id"]
        }).eq("id", user_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")

        # Log audit
        await log_audit(
            supabase,
            user_id,
            "user_deleted",
            current_user["id"],
            {
                "reason": delete_data.reason,
                "user_email": target_user["email"],
                "user_name": target_user["full_name"],
                "user_role": target_user["role"]
            },
            get_client_ip(request)
        )

        return {
            "message": "User deleted successfully",
            "user_id": user_id
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error deleting user: {str(e)}"
        )


# ============================================
# Statistics Endpoint (MUST come before /users/{user_id})
# ============================================

@router.get("/users/stats", response_model=UserStatistics)
async def get_user_statistics(
    current_user: dict = Depends(require_role(["admin", "owner", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Get user statistics and analytics"""
    try:
        # Get all users
        all_users = supabase.table("users").select("role, status, created_at").execute()

        total_users = len(all_users.data)
        active_users = len([u for u in all_users.data if u.get("status") == "active"])
        inactive_users = len([u for u in all_users.data if u.get("status") in ["inactive", "suspended"]])
        terminated_users = len([u for u in all_users.data if u.get("status") == "terminated"])
        deleted_users = len([u for u in all_users.data if u.get("status") == "deleted"])

        # Users by role
        users_by_role = {}
        for user in all_users.data:
            role = user.get("role", "customer")
            users_by_role[role] = users_by_role.get(role, 0) + 1

        # Recent signups (last 30 days)
        thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
        recent_signups = len([
            u for u in all_users.data
            if u.get("created_at", "") >= thirty_days_ago
        ])

        # Users created this month
        first_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        users_created_this_month = len([
            u for u in all_users.data
            if u.get("created_at", "") >= first_of_month
        ])

        # Recent terminations (last 30 days)
        recent_terminations = supabase.table("user_audit_log")\
            .select("id")\
            .eq("action", "user_deactivated")\
            .gte("created_at", thirty_days_ago)\
            .execute()

        return UserStatistics(
            total_users=total_users,
            active_users=active_users,
            inactive_users=inactive_users,
            terminated_users=terminated_users,
            deleted_users=deleted_users,
            users_by_role=users_by_role,
            recent_signups=recent_signups,
            recent_terminations=len(recent_terminations.data),
            users_created_this_month=users_created_this_month
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching statistics: {str(e)}"
        )


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: dict = Depends(require_role(["admin", "owner", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Get details of a specific user"""
    try:
        result = supabase.table("users").select("*").eq("id", user_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")

        user = result.data[0]

        return UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user.get("full_name", ""),
            phone_number=user.get("phone"),
            role=user.get("role", "customer"),
            status=user.get("status", "active"),
            created_at=user["created_at"],
            last_login_at=user.get("last_login_at"),
            terminated_at=user.get("terminated_at"),
            termination_reason=user.get("termination_reason")
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching user: {str(e)}"
        )


# ============================================
# Audit Log Endpoints
# ============================================

@router.get("/users/{user_id}/audit-log", response_model=List[AuditLogEntry])
async def get_user_audit_log(
    user_id: str,
    limit: int = 50,
    current_user: dict = Depends(require_role(["admin", "owner"])),
    supabase: Client = Depends(get_supabase)
):
    """Get audit log for a specific user"""
    try:
        result = supabase.table("user_audit_log")\
            .select("*, performer:performed_by_user_id(full_name)")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()

        return [
            AuditLogEntry(
                id=log["id"],
                user_id=log["user_id"],
                action=log["action"],
                performed_by_user_id=log["performed_by_user_id"],
                performed_by_name=log.get("performer", {}).get("full_name") if log.get("performer") else None,
                details=log.get("details"),
                ip_address=log.get("ip_address"),
                created_at=log["created_at"]
            )
            for log in result.data
        ]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching audit log: {str(e)}"
        )


@router.get("/audit-log", response_model=List[AuditLogEntry])
async def get_all_audit_logs(
    action: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(require_role(["admin", "owner"])),
    supabase: Client = Depends(get_supabase)
):
    """Get all audit logs with optional filtering"""
    try:
        query = supabase.table("user_audit_log")\
            .select("*, performer:performed_by_user_id(full_name)")

        if action:
            query = query.eq("action", action)

        query = query.order("created_at", desc=True).limit(limit)

        result = query.execute()

        return [
            AuditLogEntry(
                id=log["id"],
                user_id=log["user_id"],
                action=log["action"],
                performed_by_user_id=log["performed_by_user_id"],
                performed_by_name=log.get("performer", {}).get("full_name") if log.get("performer") else None,
                details=log.get("details"),
                ip_address=log.get("ip_address"),
                created_at=log["created_at"]
            )
            for log in result.data
        ]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching audit logs: {str(e)}"
        )
