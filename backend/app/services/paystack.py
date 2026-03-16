"""
Paystack Payment Integration Service
"""
import hashlib
import hmac
import httpx
from typing import Any, Dict, Optional
from app.core.config import settings


class PaystackService:
    """Paystack payment service"""

    BASE_URL = "https://api.paystack.co"

    def __init__(self):
        self.secret_key = getattr(settings, 'PAYSTACK_SECRET_KEY', '')

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
        }

    async def initialize_transaction(
        self,
        email: str,
        amount: float,
        reference: str,
        metadata: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """Initialize a Paystack transaction and return authorization_url + access_code."""
        payload = {
            "email": email,
            "amount": int(amount * 100),  # convert KES to kobo (smallest unit)
            "reference": reference,
            "currency": "KES",
            "metadata": metadata or {},
        }
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{self.BASE_URL}/transaction/initialize",
                    json=payload,
                    headers=self._headers(),
                    timeout=30.0,
                )
                data = resp.json()
                if resp.status_code == 200 and data.get("status"):
                    return {
                        "success": True,
                        "authorization_url": data["data"]["authorization_url"],
                        "access_code": data["data"]["access_code"],
                        "reference": data["data"]["reference"],
                    }
                else:
                    return {"success": False, "message": data.get("message", "Failed to initialize")}
        except Exception as e:
            return {"success": False, "message": str(e)}

    async def verify_transaction(self, reference: str) -> Dict[str, Any]:
        """Verify a Paystack transaction by reference."""
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{self.BASE_URL}/transaction/verify/{reference}",
                    headers=self._headers(),
                    timeout=30.0,
                )
                data = resp.json()
                if resp.status_code == 200 and data.get("status"):
                    txn = data["data"]
                    return {
                        "success": True,
                        "status": txn["status"],  # 'success', 'failed', etc.
                        "amount": txn["amount"] / 100,
                        "reference": txn["reference"],
                        "paid_at": txn.get("paid_at"),
                        "channel": txn.get("channel"),
                        "customer": txn.get("customer", {}),
                    }
                else:
                    return {"success": False, "message": data.get("message", "Verification failed")}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """Verify Paystack webhook HMAC-SHA512 signature."""
        if not self.secret_key:
            return False
        try:
            expected = hmac.new(
                self.secret_key.encode("utf-8"), payload, hashlib.sha512
            ).hexdigest()
            return hmac.compare_digest(expected, signature)
        except Exception:
            return False


paystack_service = PaystackService()
