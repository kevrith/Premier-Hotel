#!/usr/bin/env python3
"""Test Africa's Talking SMS integration"""
import asyncio
import os
import sys
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Add app to path
sys.path.insert(0, os.path.dirname(__file__))

from app.services.sms_service import get_sms_service


async def test_sms():
    """Test sending SMS"""
    print("=" * 60)
    print("Africa's Talking SMS Test")
    print("=" * 60)
    print()
    
    # Get phone number
    phone = input("Enter your phone number (+254712345678): ").strip()
    
    if not phone:
        print("❌ Phone number required")
        return
    
    print(f"\n📱 Sending test SMS to {phone}...")
    
    try:
        sms_service = get_sms_service()
        success = await sms_service.send_otp(phone, "123456")
        
        if success:
            print("\n✅ SUCCESS! Check your phone for the SMS")
            print("   OTP Code: 123456")
        else:
            print("\n❌ SMS failed to send")
            print("   Check your Africa's Talking dashboard for details")
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nTroubleshooting:")
        print("  1. Check your API key is correct in .env")
        print("  2. Verify you have SMS credits in Africa's Talking")
        print("  3. Make sure phone number is in E.164 format (+254...)")

if __name__ == "__main__":
    asyncio.run(test_sms())
