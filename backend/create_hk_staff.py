#!/usr/bin/env python3
"""
Create Housekeeping Staff Accounts for Testing
"""
import os
import uuid
import hashlib
from dotenv import load_dotenv
import requests

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
import sys
sys.path.insert(0, os.path.dirname(__file__))
from app.core.security import get_password_hash

# Create Manager Account
manager_data = {
    "id": str(uuid.uuid4()),
    "email": "hkmanager@premierhotel.com",
    "password_hash": get_password_hash("HKManager@2024"),
    "full_name": "HK Manager",
    "phone": "+254798444555",
    "role": "manager",
    "status": "active"
}

print("Creating manager account...")
response = requests.post(
    f"{SUPABASE_URL}/rest/v1/users",
    headers=headers,
    json=manager_data
)

if response.status_code in [200, 201]:
    print("✅ Manager created successfully!")
    print(f"Email: {manager_data['email']}")
    print(f"Password: HKManager@2024")
    print(f"ID: {manager_data['id']}")
elif "duplicate" in response.text.lower():
    print("✅ Manager already exists")
else:
    print(f"❌ Error: {response.status_code}")
    print(response.text)

# Create Cleaner Account
cleaner_data = {
    "id": str(uuid.uuid4()),
    "email": "hkcleaner@premierhotel.com",
    "password_hash": get_password_hash("HKCleaner@2024"),
    "full_name": "HK Cleaner",
    "phone": "+254798666777",
    "role": "cleaner",
    "status": "active"
}

print("\nCreating cleaner account...")
response = requests.post(
    f"{SUPABASE_URL}/rest/v1/users",
    headers=headers,
    json=cleaner_data
)

if response.status_code in [200, 201]:
    print("✅ Cleaner created successfully!")
    print(f"Email: {cleaner_data['email']}")
    print(f"Password: HKCleaner@2024")
    print(f"ID: {cleaner_data['id']}")
elif "duplicate" in response.text.lower():
    print("✅ Cleaner already exists")
else:
    print(f"❌ Error: {response.status_code}")
    print(response.text)

print("\n✅ Setup complete! You can now test housekeeping features.")
