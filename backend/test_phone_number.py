#!/usr/bin/env python3
"""Test SMS with specific phone number"""
import asyncio
import os
import sys
from dotenv import load_dotenv
import africastalking

load_dotenv()
sys.path.insert(0, os.path.dirname(__file__))

async def test_phone(phone_number):
    """Test SMS to specific phone"""
    print("=" * 70)
    print(f"📱 Testing SMS to: {phone_number}")
    print("=" * 70)
    print()

    username = os.getenv("AFRICASTALKING_USERNAME", "sandbox")
    api_key = os.getenv("AFRICASTALKING_API_KEY", "")

    print(f"Username: {username}")
    print(f"API Key: {api_key[:20]}...")
    print()

    try:
        africastalking.initialize(username, api_key)
        sms = africastalking.SMS

        message = "Premier Hotel Test: Your verification code is 123456."

        response = sms.send(
            message=message,
            recipients=[phone_number]
        )

        print("Full Response:")
        print("-" * 70)
        print(response)
        print("-" * 70)
        print()

        if response and 'SMSMessageData' in response:
            recipients = response['SMSMessageData'].get('Recipients', [])
            if recipients:
                recipient = recipients[0]
                print(f"Status: {recipient.get('status')}")
                print(f"Status Code: {recipient.get('statusCode')}")
                print(f"Number: {recipient.get('number')}")
                print(f"Cost: {recipient.get('cost')}")
                print(f"Message ID: {recipient.get('messageId')}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    phone = "+254769285097"
    asyncio.run(test_phone(phone))
