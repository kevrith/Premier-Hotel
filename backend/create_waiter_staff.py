#!/usr/bin/env python3
"""
Create Waiter Staff Account for Testing Order Flow
"""
import os
import uuid
from dotenv import load_dotenv
import requests
import sys

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# Import bcrypt hashing from our app
sys.path.insert(0, os.path.dirname(__file__))
from app.core.security import get_password_hash

# Create Waiter Account
waiter_data = {
    "id": str(uuid.uuid4()),
    "email": "waiter@premierhotel.com",
    "password_hash": get_password_hash("Waiter@2024"),
    "full_name": "Test Waiter",
    "phone": "+254798888999",
    "role": "waiter",
    "status": "active"
}

print("Creating waiter account...")
response = requests.post(
    f"{SUPABASE_URL}/rest/v1/users",
    headers=headers,
    json=waiter_data
)

if response.status_code in [200, 201]:
    print("✅ Waiter created successfully!")
    print(f"Email: {waiter_data['email']}")
    print(f"Password: Waiter@2024")
    print(f"ID: {waiter_data['id']}")
    print("\n✅ You can now use these credentials to test the order flow!")
elif "duplicate" in response.text.lower():
    print("✅ Waiter account already exists")
    print(f"Email: waiter@premierhotel.com")
    print(f"Password: Waiter@2024")
else:
    print(f"❌ Error: {response.status_code}")
    print(response.text)
