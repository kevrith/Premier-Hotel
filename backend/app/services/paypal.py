"""
PayPal REST API v2 Orders Integration
"""
import base64
import httpx
from typing import Any, Dict, Optional
from app.core.config import settings


class PayPalService:
    """PayPal payment service using REST API v2 Orders"""

    def __init__(self, config_override: dict = None):
        cfg = config_override or {}
        self.client_id = cfg.get("client_id") or getattr(settings, "PAYPAL_CLIENT_ID", "")
        self.secret    = cfg.get("secret")    or getattr(settings, "PAYPAL_SECRET", "")
        mode           = cfg.get("mode")      or getattr(settings, "PAYPAL_MODE", "sandbox")
        if mode == "live":
            self.base_url = "https://api-m.paypal.com"
        else:
            self.base_url = "https://api-m.sandbox.paypal.com"

    async def _get_access_token(self) -> Optional[str]:
        credentials = base64.b64encode(f"{self.client_id}:{self.secret}".encode()).decode()
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{self.base_url}/v1/oauth2/token",
                    headers={
                        "Authorization": f"Basic {credentials}",
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    data="grant_type=client_credentials",
                    timeout=30.0,
                )
                if resp.status_code == 200:
                    return resp.json().get("access_token")
        except Exception:
            pass
        return None

    async def create_order(
        self,
        amount: float,
        currency: str = "USD",
        reference: str = "",
        return_url: str = "",
        cancel_url: str = "",
    ) -> Dict[str, Any]:
        """Create a PayPal order and return the approval URL."""
        token = await self._get_access_token()
        if not token:
            return {"success": False, "message": "Failed to authenticate with PayPal"}

        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "reference_id": reference,
                    "amount": {
                        "currency_code": currency,
                        "value": f"{amount:.2f}",
                    },
                }
            ],
            "payment_source": {
                "paypal": {
                    "experience_context": {
                        "return_url": return_url,
                        "cancel_url": cancel_url,
                        "user_action": "PAY_NOW",
                    }
                }
            },
        }
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{self.base_url}/v2/checkout/orders",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                    timeout=30.0,
                )
                data = resp.json()
                if resp.status_code in (200, 201):
                    order_id = data.get("id")
                    approval_url = next(
                        (link["href"] for link in data.get("links", []) if link["rel"] == "payer-action"),
                        None,
                    )
                    return {
                        "success": True,
                        "order_id": order_id,
                        "approval_url": approval_url,
                        "status": data.get("status"),
                    }
                else:
                    msg = data.get("message") or data.get("details", [{}])[0].get("description", "Failed to create order")
                    return {"success": False, "message": msg}
        except Exception as e:
            return {"success": False, "message": str(e)}

    async def capture_order(self, order_id: str) -> Dict[str, Any]:
        """Capture an approved PayPal order."""
        token = await self._get_access_token()
        if not token:
            return {"success": False, "message": "Failed to authenticate with PayPal"}
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{self.base_url}/v2/checkout/orders/{order_id}/capture",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                    timeout=30.0,
                )
                data = resp.json()
                if resp.status_code in (200, 201):
                    captures = data.get("purchase_units", [{}])[0].get("payments", {}).get("captures", [{}])
                    capture = captures[0] if captures else {}
                    return {
                        "success": True,
                        "status": data.get("status"),
                        "capture_id": capture.get("id"),
                        "amount": capture.get("amount", {}).get("value"),
                        "currency": capture.get("amount", {}).get("currency_code"),
                    }
                else:
                    msg = data.get("message") or "Capture failed"
                    return {"success": False, "message": msg}
        except Exception as e:
            return {"success": False, "message": str(e)}

    async def get_order(self, order_id: str) -> Dict[str, Any]:
        """Fetch PayPal order details."""
        token = await self._get_access_token()
        if not token:
            return {"success": False, "message": "Failed to authenticate with PayPal"}
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{self.base_url}/v2/checkout/orders/{order_id}",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=30.0,
                )
                if resp.status_code == 200:
                    return {"success": True, **resp.json()}
                return {"success": False, "message": "Order not found"}
        except Exception as e:
            return {"success": False, "message": str(e)}


paypal_service = PayPalService()
