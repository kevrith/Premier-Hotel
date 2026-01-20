import os
import hashlib
from dotenv import load_dotenv
import requests

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Admin user details
email = "admin@premierhotel.com"
password = "Admin123!"
full_name = "System Administrator"

# Hash password
password_hash = hashlib.sha256(password.encode()).hexdigest()

# Insert into users table via Supabase REST API
headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
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

response = requests.post(
    f"{SUPABASE_URL}/rest/v1/users",
    headers=headers,
    json=data
)

if response.status_code in [200, 201]:
    print("✅ Admin user created successfully!")
    print(f"Email: {email}")
    print(f"Password: {password}")
else:
    print(f"❌ Error: {response.status_code}")
    print(response.text)
