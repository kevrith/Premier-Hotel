import os
import hashlib
import requests

# Admin credentials
email = "admin@premierhotel.com"
password = "Admin123!"
full_name = "System Administrator"
password_hash = hashlib.sha256(password.encode()).hexdigest()

# Get Supabase credentials from .env
with open('.env', 'r') as f:
    env_lines = f.readlines()

SUPABASE_URL = None
SUPABASE_KEY = None

for line in env_lines:
    if 'SUPABASE_URL=' in line:
        SUPABASE_URL = line.split('=')[1].strip()
    if 'SUPABASE_SERVICE_ROLE_KEY=' in line:
        SUPABASE_KEY = line.split('=')[1].strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Could not find Supabase credentials in .env file")
    exit(1)

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

data = {
    "email": email,
    "full_name": full_name,
    "password_hash": password_hash,
    "role": "admin",
    "email_verified": True,
    "is_verified": True,
    "status": "active"
}

print(f"Creating admin user at {SUPABASE_URL}/rest/v1/users...")
response = requests.post(
    f"{SUPABASE_URL}/rest/v1/users",
    headers=headers,
    json=data
)

print(f"\nStatus Code: {response.status_code}")
if response.status_code in [200, 201]:
    print("\n✅ Admin user created successfully!")
    print(f"\n📧 Email: {email}")
    print(f"🔑 Password: {password}")
    print("\nYou can now log in to the application with these credentials.")
else:
    print(f"\n❌ Error creating admin user")
    print(f"Response: {response.text}")
