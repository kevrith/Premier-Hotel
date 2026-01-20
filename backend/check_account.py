#!/usr/bin/env python3
"""
Check Africa's Talking Account Details
"""
import os
from dotenv import load_dotenv
import africastalking

# Load environment
load_dotenv()

def check_account():
    """Check account balance and details"""
    print("=" * 70)
    print("💳 Africa's Talking Account Check")
    print("=" * 70)
    print()

    username = os.getenv("AFRICASTALKING_USERNAME", "sandbox")
    api_key = os.getenv("AFRICASTALKING_API_KEY", "")

    print(f"📋 Username: {username}")
    print(f"🔑 API Key: {api_key[:20]}...{api_key[-10:]}")
    print()

    try:
        # Initialize
        africastalking.initialize(username, api_key)
        application = africastalking.Application

        # Get account balance
        print("💰 Fetching account balance...")
        balance = application.fetch_application_data()

        print()
        print("📊 Account Details:")
        print("-" * 70)
        print(balance)
        print("-" * 70)
        print()

        # Parse balance if available
        if isinstance(balance, dict):
            user_data = balance.get('UserData', {})
            if user_data:
                print("User Data:")
                for key, value in user_data.items():
                    print(f"   {key}: {value}")

        print()
        print("✅ Account check complete")

    except Exception as e:
        print(f"❌ Error: {e}")
        print()
        print("Note: If you see 'Invalid Credentials' this API key may not")
        print("have permission to check account data, but SMS might still work.")

if __name__ == "__main__":
    check_account()
