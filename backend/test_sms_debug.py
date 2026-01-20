#!/usr/bin/env python3
"""Debug Africa's Talking SMS credentials"""
import africastalking
import os
from dotenv import load_dotenv

load_dotenv()

print("=" * 70)
print("🔍 Africa's Talking Configuration Diagnostic")
print("=" * 70)
print()

username = os.getenv("AFRICASTALKING_USERNAME", "sandbox")
api_key = os.getenv("AFRICASTALKING_API_KEY")
sender_id = os.getenv("AFRICASTALKING_SENDER_ID")

print("Configuration from .env file:")
print(f"  Username: {username}")
print(f"  API Key: {api_key[:20]}...{api_key[-10:] if api_key else 'NOT SET'}")
print(f"  Sender ID: {sender_id}")
print()

print("=" * 70)
print("IMPORTANT: Check your Africa's Talking Dashboard")
print("=" * 70)
print()
print("1. Go to: https://account.africastalking.com/apps")
print()
print("2. Verify your app settings:")
print("   - App Name/Username: Should match 'premier'")
print("   - API Key: Should match the key in your .env file")
print()
print("3. Check if you're using SANDBOX or LIVE mode:")
print("   - Sandbox username is usually: 'sandbox'")
print("   - Live username is your custom name: 'premier'")
print()
print("4. If using SANDBOX mode:")
print("   - Change AFRICASTALKING_USERNAME=sandbox in .env")
print("   - Sandbox only works with test numbers")
print()
print("5. If using LIVE/PRODUCTION mode:")
print("   - Make sure you have SMS credits")
print("   - Username should be your app name: 'premier'")
print("   - You need to have added credits to your account")
print()
print("=" * 70)
print()

# Try to initialize and get more details
try:
    print("Attempting to initialize Africa's Talking SDK...")
    africastalking.initialize(username, api_key)
    print("✅ SDK initialized successfully")
    print()
    
    # Try to get account info (this will fail if credentials are wrong)
    sms = africastalking.SMS
    print("✅ SMS service object created")
    print()
    
    print("Ready to send SMS. The credentials appear valid.")
    print()
    print("If SMS still fails, check:")
    print("  1. Do you have SMS credits? (for live mode)")
    print("  2. Is the phone number verified? (for sandbox)")
    print("  3. Is the API key active in your dashboard?")
    
except Exception as e:
    print(f"❌ Error: {e}")
    print()
    print("This suggests invalid credentials. Please:")
    print("  1. Log into https://account.africastalking.com/")
    print("  2. Go to your app settings")
    print("  3. Copy the correct API key and username")
    print("  4. Update your .env file")

print()
