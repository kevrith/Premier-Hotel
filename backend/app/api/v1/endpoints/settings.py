"""
Settings Management Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from app.core.supabase import get_supabase_admin
from app.middleware.auth_secure import get_current_user
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

_MASKED = "***"  # placeholder returned for sensitive fields that are set


# ── Auth helper ───────────────────────────────────────────────────────────────

async def require_admin_or_manager(current_user: dict = Depends(get_current_user)):
    """Require manager OR admin role"""
    if current_user.get("role") not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager or Admin access required",
        )
    return current_user


# ── Shared DB helper ──────────────────────────────────────────────────────────

def _get_setting(supabase_admin: Client, key: str, default: dict) -> dict:
    res = supabase_admin.table("hotel_settings").select("setting_value").eq("setting_key", key).execute()
    return res.data[0]["setting_value"] if res.data else default


def _put_setting(supabase_admin: Client, key: str, value: dict, user_id: str):
    supabase_admin.table("hotel_settings").upsert(
        {"setting_key": key, "setting_value": value, "updated_by": user_id, "updated_at": "now()"},
        on_conflict="setting_key"
    ).execute()


# ── Models ────────────────────────────────────────────────────────────────────

class TaxConfig(BaseModel):
    vat_enabled: bool
    vat_rate: float
    tourism_levy_enabled: bool
    tourism_levy_rate: float
    tax_inclusive: bool


class PaymentConfig(BaseModel):
    payment_gateway: str = "mpesa"       # mpesa | cash | paystack | paypal
    accepted_payment_methods: Optional[list] = ["cash", "mpesa", "card", "paystack", "paypal"]
    # M-Pesa
    mpesa_shortcode: Optional[str] = ""
    mpesa_consumer_key: Optional[str] = ""
    mpesa_consumer_secret: Optional[str] = ""
    mpesa_passkey: Optional[str] = ""
    mpesa_callback_url: Optional[str] = ""
    mpesa_environment: Optional[str] = "sandbox"  # sandbox | production
    # Paystack
    paystack_secret_key: Optional[str] = ""
    paystack_public_key: Optional[str] = ""
    paystack_webhook_secret: Optional[str] = ""
    # PayPal
    paypal_client_id: Optional[str] = ""
    paypal_secret: Optional[str] = ""
    paypal_mode: Optional[str] = "sandbox"  # sandbox | live
    paypal_currency: Optional[str] = "USD"
    paypal_kes_rate: Optional[float] = 130.0


class NotificationConfig(BaseModel):
    email_notifications: bool = True
    sms_notifications: bool = True
    order_alerts: bool = True


class SystemConfig(BaseModel):
    maintenance_mode: bool = False
    offline_mode: bool = True


class LocalizationConfig(BaseModel):
    default_language: str = "en"
    currency: str = "KES"


@router.get("/tax-config")
async def get_tax_config(
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """Get current tax configuration (public endpoint)"""
    try:
        response = supabase_admin.table("hotel_settings").select("setting_value").eq("setting_key", "tax_config").execute()
        
        if not response.data:
            # Return default config if not found
            return {
                "vat_enabled": True,
                "vat_rate": 0.16,
                "tourism_levy_enabled": False,
                "tourism_levy_rate": 0.02,
                "tax_inclusive": True
            }
        
        return response.data[0]["setting_value"]
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/tax-config")
async def update_tax_config(
    config: TaxConfig,
    current_user: dict = Depends(require_admin_or_manager),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """Update tax configuration (Admin/Manager only)"""
    try:
        # Validate rates
        if config.vat_rate < 0 or config.vat_rate > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="VAT rate must be between 0 and 1 (0% to 100%)"
            )
        
        if config.tourism_levy_rate < 0 or config.tourism_levy_rate > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tourism levy rate must be between 0 and 1 (0% to 100%)"
            )
        
        # Update or insert tax config
        response = supabase_admin.table("hotel_settings").upsert({
            "setting_key": "tax_config",
            "setting_value": config.model_dump(),
            "updated_by": current_user.get("id"),
            "updated_at": "now()"
        }, on_conflict="setting_key").execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update tax configuration"
            )
        
        return {"success": True, "message": "Tax configuration updated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ── Payment config ────────────────────────────────────────────────────────────

_PAYMENT_DEFAULTS = {
    "payment_gateway": "mpesa",
    "accepted_payment_methods": ["cash", "mpesa", "card", "paystack", "paypal"],
    # M-Pesa
    "mpesa_shortcode": "",
    "mpesa_consumer_key": "",
    "mpesa_consumer_secret": "",
    "mpesa_passkey": "",
    "mpesa_callback_url": "",
    "mpesa_environment": "sandbox",
    # Paystack
    "paystack_secret_key": "",
    "paystack_public_key": "",
    "paystack_webhook_secret": "",
    # PayPal
    "paypal_client_id": "",
    "paypal_secret": "",
    "paypal_mode": "sandbox",
    "paypal_currency": "USD",
    "paypal_kes_rate": 130.0,
}

_SENSITIVE_PAYMENT_FIELDS = {
    "mpesa_consumer_secret", "mpesa_passkey",
    "paystack_secret_key", "paystack_webhook_secret",
    "paypal_secret",
}


@router.get("/payment-config")
async def get_payment_config(
    current_user: dict = Depends(require_admin_or_manager),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """Get payment configuration — sensitive fields are masked if set."""
    try:
        cfg = _get_setting(supabase_admin, "payment_config", _PAYMENT_DEFAULTS.copy())
        # Mask sensitive fields so they never leave the server in plaintext
        for field in _SENSITIVE_PAYMENT_FIELDS:
            if cfg.get(field):
                cfg[field] = _MASKED
        return cfg
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/payment-methods")
async def get_accepted_payment_methods(
    current_user: dict = Depends(get_current_user),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """Public (any authenticated user) — returns only the accepted_payment_methods list.
    No credentials are exposed. Used by waiter/customer payment dialogs."""
    try:
        cfg = _get_setting(supabase_admin, "payment_config", _PAYMENT_DEFAULTS.copy())
        methods = cfg.get("accepted_payment_methods", ["cash", "mpesa", "card", "paystack", "paypal"])
        return {"accepted_payment_methods": methods}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/payment-config")
async def update_payment_config(
    config: PaymentConfig,
    current_user: dict = Depends(require_admin_or_manager),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """
    Update payment configuration.
    Sensitive fields (passkey, consumer_secret) are only overwritten when the
    submitted value is non-empty and not the masked placeholder '***'.
    """
    try:
        existing = _get_setting(supabase_admin, "payment_config", _PAYMENT_DEFAULTS.copy())
        incoming = config.model_dump()

        # Merge: keep existing sensitive values if the caller sends masked placeholder
        for field in _SENSITIVE_PAYMENT_FIELDS:
            if not incoming.get(field) or incoming[field] == _MASKED:
                incoming[field] = existing.get(field, "")

        _put_setting(supabase_admin, "payment_config", incoming, current_user["id"])
        return {"success": True, "message": "Payment configuration updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Notification config ───────────────────────────────────────────────────────

_NOTIFICATION_DEFAULTS = {
    "email_notifications": True,
    "sms_notifications": True,
    "order_alerts": True,
}


@router.get("/notification-config")
async def get_notification_config(
    current_user: dict = Depends(require_admin_or_manager),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    try:
        return _get_setting(supabase_admin, "notification_config", _NOTIFICATION_DEFAULTS.copy())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/notification-config")
async def update_notification_config(
    config: NotificationConfig,
    current_user: dict = Depends(require_admin_or_manager),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    try:
        _put_setting(supabase_admin, "notification_config", config.model_dump(), current_user["id"])
        return {"success": True, "message": "Notification configuration updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── System config ─────────────────────────────────────────────────────────────

_SYSTEM_DEFAULTS = {"maintenance_mode": False, "offline_mode": True}


@router.get("/maintenance-status")
async def get_maintenance_status(
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """Public endpoint — checked by ProtectedRoute to block non-admins during maintenance."""
    try:
        config = _get_setting(supabase_admin, "system_config", _SYSTEM_DEFAULTS.copy())
        return {"maintenance_mode": bool(config.get("maintenance_mode", False))}
    except Exception:
        return {"maintenance_mode": False}  # fail open — don't block access on error


@router.get("/system-config")
async def get_system_config(
    current_user: dict = Depends(require_admin_or_manager),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    try:
        return _get_setting(supabase_admin, "system_config", _SYSTEM_DEFAULTS.copy())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/system-config")
async def update_system_config(
    config: SystemConfig,
    current_user: dict = Depends(require_admin_or_manager),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    try:
        _put_setting(supabase_admin, "system_config", config.model_dump(), current_user["id"])
        return {"success": True, "message": "System configuration updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Localization config ───────────────────────────────────────────────────────

_LOCALIZATION_DEFAULTS = {"default_language": "en", "currency": "KES"}


@router.get("/localization-config")
async def get_localization_config(
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """Public endpoint — language/currency are needed by all pages."""
    try:
        return _get_setting(supabase_admin, "localization_config", _LOCALIZATION_DEFAULTS.copy())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/localization-config")
async def update_localization_config(
    config: LocalizationConfig,
    current_user: dict = Depends(require_admin_or_manager),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    try:
        _put_setting(supabase_admin, "localization_config", config.model_dump(), current_user["id"])
        return {"success": True, "message": "Localization configuration updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Business Day config ────────────────────────────────────────────────────

_BUSINESS_DAY_DEFAULTS = {"start_hour": 6}  # 06:00 EAT


class BusinessDayConfig(BaseModel):
    start_hour: int  # 0–23 — hour in EAT when a new business day begins


@router.get("/business-day-config")
async def get_business_day_config(
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """Public — all roles need to know the business day boundary."""
    try:
        return _get_setting(supabase_admin, "business_day_config", _BUSINESS_DAY_DEFAULTS.copy())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/business-day-config")
async def update_business_day_config(
    config: BusinessDayConfig,
    current_user: dict = Depends(require_admin_or_manager),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """Update the hour (EAT) at which a new business day starts. Admin/Manager only."""
    if not 0 <= config.start_hour <= 23:
        raise HTTPException(status_code=400, detail="start_hour must be 0–23")
    try:
        _put_setting(supabase_admin, "business_day_config", config.model_dump(), current_user["id"])
        return {"success": True, "message": f"Business day now starts at {config.start_hour:02d}:00 EAT"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Receipt config ────────────────────────────────────────────────────────────

_RECEIPT_DEFAULTS = {
    "hotel_name": "Premier Hotel",
    "address": "",
    "po_box": "",
    "phone": "",
    "email": "",
    "website": "",
    "tax_reg": "",
    "footer": "Thank you for dining with us!",
    "footer2": "Please settle at the counter",
    "payment_instructions": "",
}


class ReceiptConfig(BaseModel):
    hotel_name: Optional[str] = "Premier Hotel"
    address: Optional[str] = ""
    po_box: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    website: Optional[str] = ""
    tax_reg: Optional[str] = ""
    footer: Optional[str] = "Thank you for dining with us!"
    footer2: Optional[str] = "Please settle at the counter"
    payment_instructions: Optional[str] = ""


@router.get("/receipt-config")
async def get_receipt_config(
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """Public endpoint — receipt config is needed at print time by all roles."""
    try:
        return _get_setting(supabase_admin, "receipt_config", _RECEIPT_DEFAULTS.copy())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/receipt-config")
async def update_receipt_config(
    config: ReceiptConfig,
    current_user: dict = Depends(require_admin_or_manager),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    try:
        _put_setting(supabase_admin, "receipt_config", config.model_dump(), current_user["id"])
        return {"success": True, "message": "Receipt configuration updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
