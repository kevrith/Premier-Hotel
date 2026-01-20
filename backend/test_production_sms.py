#!/usr/bin/env python3
"""
Production SMS Diagnostic Test
Tests SMS sending with detailed error reporting
"""
import asyncio
import os
import sys
from dotenv import load_dotenv
import africastalking

# Load environment
load_dotenv()

# Add app to path
sys.path.insert(0, os.path.dirname(__file__))

async def test_production_sms():
    """Test SMS with detailed diagnostics"""
    print("=" * 70)
    print("🔍 Production SMS Diagnostic Test")
    print("=" * 70)
    print()

    # Show configuration
    username = os.getenv("AFRICASTALKING_USERNAME", "sandbox")
    api_key = os.getenv("AFRICASTALKING_API_KEY", "")
    sender_id = os.getenv("AFRICASTALKING_SENDER_ID", "")

    print("📋 Configuration:")
    print(f"   Username: {username}")
    print(f"   API Key: {api_key[:20]}...{api_key[-10:] if len(api_key) > 30 else api_key}")
    print(f"   Sender ID: {sender_id if sender_id else '(not set)'}")
    print(f"   Mode: {'PRODUCTION' if username != 'sandbox' else 'SANDBOX'}")
    print()

    # Initialize Africa's Talking
    try:
        africastalking.initialize(username, api_key)
        sms = africastalking.SMS
        print("✅ Africa's Talking SDK initialized")
        print()
    except Exception as e:
        print(f"❌ Failed to initialize SDK: {e}")
        return

    # Get phone number
    phone = "+254718864578"
    print(f"📱 Testing SMS to: {phone}")
    print()

    # Try sending SMS
    try:
        message = "Premier Hotel Test: Your verification code is 123456. This is a production test message."

        print("📤 Sending SMS...")

        kwargs = {
            "message": message,
            "recipients": [phone]
        }

        # Only add sender ID if set
        if sender_id:
            kwargs["sender_id"] = sender_id

        response = sms.send(**kwargs)

        print()
        print("📥 Full Response:")
        print("-" * 70)
        print(response)
        print("-" * 70)
        print()

        # Parse response
        if response and 'SMSMessageData' in response:
            message_data = response['SMSMessageData']

            print("📊 Response Details:")
            print(f"   Message: {message_data.get('Message', 'N/A')}")

            recipients = message_data.get('Recipients', [])
            if recipients and len(recipients) > 0:
                recipient = recipients[0]
                status = recipient.get('status', 'Unknown')
                status_code = recipient.get('statusCode', 'N/A')
                number = recipient.get('number', 'N/A')
                cost = recipient.get('cost', 'N/A')
                message_id = recipient.get('messageId', 'N/A')

                print(f"   Number: {number}")
                print(f"   Status: {status}")
                print(f"   Status Code: {status_code}")
                print(f"   Cost: {cost}")
                print(f"   Message ID: {message_id}")
                print()

                if status == 'Success':
                    print("✅ SUCCESS! SMS sent successfully!")
                    print()
                    print("📱 Check your phone for the message.")
                    print("   If you don't see it within 1-2 minutes, check:")
                    print("   - Phone signal strength")
                    print("   - Spam/blocked messages folder")
                    print("   - Network operator issues")
                elif 'UserInBlacklist' in status:
                    print("⚠️  UserInBlacklist Error")
                    print()
                    print("This error means the phone number is blocking marketing messages.")
                    print()
                    print("Solutions:")
                    print("  1. Wait 15-30 minutes after whitelisting via *456*9#")
                    print("  2. Try from a different phone number")
                    print("  3. Contact Africa's Talking support to verify number is whitelisted")
                    print("  4. Check if there's a network-level block from Safaricom/Airtel")
                    print()
                    print("If you already whitelisted, please wait 30 minutes and try again.")
                else:
                    print(f"❌ SMS Failed with status: {status}")
                    print()
                    print("Common status codes:")
                    print("  - InvalidSenderId: Custom sender ID not allowed (remove it)")
                    print("  - InsufficientBalance: Top up your account")
                    print("  - UserInBlacklist: Phone blocking marketing messages")
                    print("  - RiskHold: Account needs verification")
            else:
                print("❌ No recipients in response")
        else:
            print("❌ Unexpected response format")

    except Exception as e:
        print(f"❌ Error sending SMS: {e}")
        print()
        print("Troubleshooting:")
        print("  1. Verify API key is correct and has been active for 3+ minutes")
        print("  2. Check account has sufficient balance")
        print("  3. Ensure phone number is in E.164 format (+254...)")
        print("  4. Try regenerating your API key in the dashboard")

if __name__ == "__main__":
    asyncio.run(test_production_sms())
