#!/usr/bin/env python3
"""Test Africa's Talking API directly"""
import requests
import os
from dotenv import load_dotenv

load_dotenv()

username = os.getenv("AFRICASTALKING_USERNAME")
api_key = os.getenv("AFRICASTALKING_API_KEY")

print("=" * 70)
print("Testing Africa's Talking API Credentials")
print("=" * 70)
print()
print(f"Username: {username}")
print(f"API Key: {api_key[:20]}...{api_key[-10:]}")
print()

# Test the API with a simple balance check
url = "https://api.africastalking.com/version1/user"
headers = {
    "apiKey": api_key,
    "Accept": "application/json"
}
params = {
    "username": username
}

print("Testing API endpoint: GET /version1/user")
print("This checks your account balance and validates credentials")
print()

try:
    response = requests.get(url, headers=headers, params=params)
    print(f"Status Code: {response.status_code}")
    print()
    
    if response.status_code == 200:
        data = response.json()
        print("✅ SUCCESS! Credentials are valid")
        print()
        print("Account Info:")
        print(f"  Balance: {data.get('UserData', {}).get('balance', 'N/A')}")
        print()
    else:
        print("❌ FAILED! Invalid credentials")
        print()
        print("Response:")
        print(response.text)
        print()
        print("Please verify:")
        print("  1. Username is exactly as shown in dashboard")
        print("  2. API key was copied correctly")
        print("  3. API key is for the same app as username")
        
except Exception as e:
    print(f"❌ Error: {e}")

print()
