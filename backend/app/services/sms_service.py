"""
SMS Service using Africa's Talking
Sends OTP codes and notifications via SMS
"""
import africastalking
import os
from typing import Optional


class SMSService:
    """Africa's Talking SMS service"""
    
    def __init__(self):
        """Initialize Africa's Talking SDK"""
        username = os.getenv("AFRICASTALKING_USERNAME", "sandbox")
        api_key = os.getenv("AFRICASTALKING_API_KEY")
        
        if not api_key:
            raise ValueError("AFRICASTALKING_API_KEY not set in environment variables")
        
        # Initialize SDK
        africastalking.initialize(username, api_key)
        self.sms = africastalking.SMS
        self.sender_id = os.getenv("AFRICASTALKING_SENDER_ID")
    
    async def send_sms(self, phone: str, message: str) -> bool:
        """
        Send SMS to a phone number
        
        Args:
            phone: Phone number in E.164 format (+254712345678)
            message: SMS message content
            
        Returns:
            bool: True if sent successfully
        """
        try:
            # Send SMS
            kwargs = {
                "message": message,
                "recipients": [phone]
            }
            
            # Add sender ID if configured
            if self.sender_id:
                kwargs["sender_id"] = self.sender_id
            
            response = self.sms.send(**kwargs)
            
            # Check response
            if response and 'SMSMessageData' in response:
                recipients = response['SMSMessageData']['Recipients']
                if recipients and len(recipients) > 0:
                    status = recipients[0]['status']
                    if status == 'Success':
                        print(f"✅ SMS sent to {phone}")
                        return True
                    else:
                        print(f"❌ SMS failed: {status}")
                        return False
            
            print(f"⚠️  Unexpected response: {response}")
            return False
            
        except Exception as e:
            print(f"❌ SMS Error: {e}")
            return False
    
    async def send_otp(self, phone: str, otp_code: str) -> bool:
        """
        Send OTP verification code
        
        Args:
            phone: Phone number
            otp_code: 6-digit OTP code
            
        Returns:
            bool: True if sent successfully
        """
        message = f"Your Premier Hotel verification code is: {otp_code}\n\nThis code expires in 10 minutes."
        return await self.send_sms(phone, message)
    
    async def send_password_reset(self, phone: str, reset_code: str) -> bool:
        """
        Send password reset code
        
        Args:
            phone: Phone number
            reset_code: Reset code
            
        Returns:
            bool: True if sent successfully
        """
        message = f"Your Premier Hotel password reset code is: {reset_code}\n\nThis code expires in 1 hour."
        return await self.send_sms(phone, message)


# Singleton instance
_sms_service: Optional[SMSService] = None


def get_sms_service() -> SMSService:
    """Get or create SMS service instance"""
    global _sms_service
    if _sms_service is None:
        _sms_service = SMSService()
    return _sms_service
