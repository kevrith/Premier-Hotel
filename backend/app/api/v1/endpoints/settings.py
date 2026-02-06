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


# Helper function for admin/manager access
async def require_admin_or_manager(current_user: dict = Depends(get_current_user)):
    """Require manager OR admin role"""
    if current_user.get("role") not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager or Admin access required",
        )
    return current_user


class TaxConfig(BaseModel):
    vat_enabled: bool
    vat_rate: float
    tourism_levy_enabled: bool
    tourism_levy_rate: float
    tax_inclusive: bool


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
