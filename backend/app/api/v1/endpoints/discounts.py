"""
Discount Management Endpoints
- Preset discount configs (admin/manager CRUD)
- Manager PIN verification for custom discounts
- Discount audit log
"""
import logging
from fastapi import APIRouter, HTTPException, status, Depends
from supabase import Client
from typing import Optional, List
from pydantic import BaseModel, Field
from decimal import Decimal
from app.core.supabase import get_supabase_admin
from app.middleware.auth_secure import get_current_user, require_staff
from app.core.security import verify_password

router = APIRouter()

MANAGER_ROLES = {"manager", "admin", "owner"}


# ── Pydantic Models ───────────────────────────────────────────────────────────

class DiscountConfigCreate(BaseModel):
    name: str
    discount_type: str = Field(..., pattern="^(percentage|fixed)$")
    discount_value: Decimal = Field(..., gt=0)
    requires_pin: bool = False
    applicable_item_ids: Optional[List[str]] = None  # None = general (all items)


class DiscountConfigUpdate(BaseModel):
    name: Optional[str] = None
    discount_type: Optional[str] = Field(None, pattern="^(percentage|fixed)$")
    discount_value: Optional[Decimal] = Field(None, gt=0)
    requires_pin: Optional[bool] = None
    is_active: Optional[bool] = None
    applicable_item_ids: Optional[List[str]] = None


class PinVerifyRequest(BaseModel):
    manager_user_id: str   # manager selected from the PIN picker
    pin: str               # 4–6 digit PIN entered


class DiscountAuditCreate(BaseModel):
    order_id: Optional[str] = None
    order_number: Optional[str] = None
    discount_config_id: Optional[str] = None
    discount_type: str
    discount_value: Optional[Decimal] = None
    discount_amount: Decimal
    reason: Optional[str] = None
    scope: str = "order"   # 'order' | 'item'
    item_name: Optional[str] = None
    approved_by: Optional[str] = None


# ── Preset Discount Configs ───────────────────────────────────────────────────

@router.get("/configs")
async def list_discount_configs(
    active_only: bool = True,
    current_user: dict = Depends(require_staff),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """List all preset discount configurations. Available to all staff."""
    query = supabase_admin.table("discount_configs").select("*").order("name")
    if active_only:
        query = query.eq("is_active", True)
    result = query.execute()
    return result.data or []


@router.post("/configs", status_code=status.HTTP_201_CREATED)
async def create_discount_config(
    body: DiscountConfigCreate,
    current_user: dict = Depends(require_staff),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """Create a new preset discount. Manager/admin only."""
    if current_user.get("role") not in MANAGER_ROLES:
        raise HTTPException(status_code=403, detail="Only managers and admins can create discount presets.")

    if body.discount_type == "percentage" and float(body.discount_value) > 100:
        raise HTTPException(status_code=400, detail="Percentage discount cannot exceed 100%.")

    insert_data = {
        "name": body.name,
        "discount_type": body.discount_type,
        "discount_value": float(body.discount_value),
        "requires_pin": body.requires_pin,
        "is_active": True,
        "created_by": current_user["id"],
    }
    if body.applicable_item_ids is not None:
        insert_data["applicable_item_ids"] = body.applicable_item_ids

    result = supabase_admin.table("discount_configs").insert(insert_data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create discount config.")
    return result.data[0]


@router.patch("/configs/{config_id}")
async def update_discount_config(
    config_id: str,
    body: DiscountConfigUpdate,
    current_user: dict = Depends(require_staff),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """Update a preset discount. Manager/admin only."""
    if current_user.get("role") not in MANAGER_ROLES:
        raise HTTPException(status_code=403, detail="Only managers and admins can update discount presets.")

    update_data = {k: v for k, v in body.dict().items() if v is not None}
    if "discount_value" in update_data:
        update_data["discount_value"] = float(update_data["discount_value"])
    # Allow explicitly clearing item links (empty list = all items, None = unchanged)
    if body.applicable_item_ids is not None:
        update_data["applicable_item_ids"] = body.applicable_item_ids

    result = supabase_admin.table("discount_configs").update(update_data).eq("id", config_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Discount config not found.")
    return result.data[0]


@router.delete("/configs/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_discount_config(
    config_id: str,
    current_user: dict = Depends(require_staff),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """Soft-delete (deactivate) a preset discount. Manager/admin only."""
    if current_user.get("role") not in MANAGER_ROLES:
        raise HTTPException(status_code=403, detail="Only managers and admins can delete discount presets.")

    supabase_admin.table("discount_configs").update({"is_active": False}).eq("id", config_id).execute()


# ── Manager PIN Verification ──────────────────────────────────────────────────

@router.post("/verify-pin")
async def verify_manager_pin(
    body: PinVerifyRequest,
    current_user: dict = Depends(require_staff),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """
    Verify a manager's PIN for discount authorization.
    Returns the manager's name on success so the frontend can show who approved.
    """
    result = supabase_admin.table("users").select(
        "id, full_name, role, pin_hash, pin_attempts, pin_locked_until"
    ).eq("id", body.manager_user_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Manager not found.")

    manager = result.data[0]

    if manager.get("role") not in MANAGER_ROLES:
        raise HTTPException(status_code=403, detail="Selected user is not a manager or admin.")

    if not manager.get("pin_hash"):
        raise HTTPException(status_code=400, detail="Manager has not set a PIN. Ask them to set one via their profile.")

    if not verify_password(body.pin, manager["pin_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect PIN. Please try again.")

    return {
        "authorized": True,
        "manager_id": manager["id"],
        "manager_name": manager.get("full_name", "Manager"),
    }


@router.get("/managers")
async def list_managers_for_pin(
    current_user: dict = Depends(require_staff),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """
    Return a list of active managers/admins for the PIN picker.
    Only returns id and name — no sensitive fields.
    """
    result = supabase_admin.table("users").select(
        "id, full_name, role"
    ).in_("role", list(MANAGER_ROLES)).execute()
    managers = []
    for u in (result.data or []):
        name = u.get("full_name") or "Manager"
        managers.append({"id": u["id"], "full_name": name, "role": u.get("role", "")})
    return managers


# ── Audit Log ─────────────────────────────────────────────────────────────────

@router.post("/audit", status_code=status.HTTP_201_CREATED)
async def log_discount_applied(
    body: DiscountAuditCreate,
    current_user: dict = Depends(require_staff),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """Record a discount application in the audit log."""
    try:
        supabase_admin.table("discount_audit").insert({
            "order_id": body.order_id,
            "order_number": body.order_number,
            "discount_config_id": body.discount_config_id,
            "discount_type": body.discount_type,
            "discount_value": float(body.discount_value) if body.discount_value else None,
            "discount_amount": float(body.discount_amount),
            "reason": body.reason,
            "scope": body.scope,
            "item_name": body.item_name,
            "applied_by": current_user["id"],
            "approved_by": body.approved_by,
        }).execute()
        return {"logged": True}
    except Exception as e:
        logging.warning(f"[DISCOUNT] Audit log failed: {e}")
        return {"logged": False}
