"""
M-Pesa Daraja API Integration Service
"""
import base64
import httpx
from datetime import datetime
from typing import Optional, Dict, Any
from app.core.config import settings


class MpesaService:
    """M-Pesa payment service using Daraja API"""

    def __init__(self):
        self.consumer_key = getattr(settings, 'MPESA_CONSUMER_KEY', '')
        self.consumer_secret = getattr(settings, 'MPESA_CONSUMER_SECRET', '')
        self.shortcode = getattr(settings, 'MPESA_SHORTCODE', '')
        self.passkey = getattr(settings, 'MPESA_PASSKEY', '')
        self.callback_url = getattr(settings, 'MPESA_CALLBACK_URL', '')

        # Determine environment (sandbox or production)
        self.environment = getattr(settings, 'MPESA_ENVIRONMENT', 'sandbox')

        if self.environment == 'sandbox':
            self.base_url = 'https://sandbox.safaricom.co.ke'
        else:
            self.base_url = 'https://api.safaricom.co.ke'

    async def get_access_token(self) -> Optional[str]:
        """
        Get OAuth access token from M-Pesa API

        Returns:
            Access token string or None if failed
        """
        url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"

        # Create basic auth credentials
        credentials = f"{self.consumer_key}:{self.consumer_secret}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()

        headers = {
            "Authorization": f"Basic {encoded_credentials}",
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, timeout=30.0)

                if response.status_code == 200:
                    data = response.json()
                    return data.get('access_token')
                else:
                    print(f"Failed to get access token: {response.text}")
                    return None
        except Exception as e:
            print(f"Error getting access token: {str(e)}")
            return None

    def generate_password(self) -> tuple[str, str]:
        """
        Generate password and timestamp for STK push

        Returns:
            Tuple of (password, timestamp)
        """
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        data_to_encode = f"{self.shortcode}{self.passkey}{timestamp}"
        password = base64.b64encode(data_to_encode.encode()).decode()
        return password, timestamp

    async def stk_push(
        self,
        phone_number: str,
        amount: float,
        account_reference: str,
        transaction_desc: str
    ) -> Dict[str, Any]:
        """
        Initiate STK push for payment

        Args:
            phone_number: Customer phone number (format: 254XXXXXXXXX)
            amount: Amount to charge
            account_reference: Reference for the transaction (e.g., order ID)
            transaction_desc: Description of the transaction

        Returns:
            Dictionary with response data
        """
        # Get access token
        access_token = await self.get_access_token()
        if not access_token:
            return {
                "success": False,
                "message": "Failed to authenticate with M-Pesa"
            }

        # Generate password and timestamp
        password, timestamp = self.generate_password()

        # Format phone number (remove + and spaces)
        phone = phone_number.replace('+', '').replace(' ', '')
        if phone.startswith('0'):
            phone = '254' + phone[1:]
        elif phone.startswith('7') or phone.startswith('1'):
            phone = '254' + phone

        # Prepare request
        url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(amount),
            "PartyA": phone,
            "PartyB": self.shortcode,
            "PhoneNumber": phone,
            "CallBackURL": self.callback_url,
            "AccountReference": account_reference,
            "TransactionDesc": transaction_desc
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers=headers,
                    timeout=30.0
                )

                data = response.json()

                if response.status_code == 200 and data.get('ResponseCode') == '0':
                    return {
                        "success": True,
                        "message": "STK push sent successfully",
                        "checkout_request_id": data.get('CheckoutRequestID'),
                        "merchant_request_id": data.get('MerchantRequestID'),
                        "response_code": data.get('ResponseCode'),
                        "response_description": data.get('ResponseDescription'),
                        "customer_message": data.get('CustomerMessage')
                    }
                else:
                    return {
                        "success": False,
                        "message": data.get('errorMessage', 'STK push failed'),
                        "response_code": data.get('ResponseCode'),
                        "response_description": data.get('ResponseDescription')
                    }
        except Exception as e:
            return {
                "success": False,
                "message": f"Error initiating payment: {str(e)}"
            }

    async def query_stk_status(self, checkout_request_id: str) -> Dict[str, Any]:
        """
        Query the status of an STK push transaction

        Args:
            checkout_request_id: The checkout request ID from STK push

        Returns:
            Dictionary with transaction status
        """
        # Get access token
        access_token = await self.get_access_token()
        if not access_token:
            return {
                "success": False,
                "message": "Failed to authenticate with M-Pesa"
            }

        # Generate password and timestamp
        password, timestamp = self.generate_password()

        url = f"{self.base_url}/mpesa/stkpushquery/v1/query"

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers=headers,
                    timeout=30.0
                )

                data = response.json()

                return {
                    "success": True,
                    "result_code": data.get('ResultCode'),
                    "result_desc": data.get('ResultDesc'),
                    "response_code": data.get('ResponseCode'),
                    "response_description": data.get('ResponseDescription'),
                    "data": data
                }
        except Exception as e:
            return {
                "success": False,
                "message": f"Error querying status: {str(e)}"
            }


# Singleton instance
mpesa_service = MpesaService()
