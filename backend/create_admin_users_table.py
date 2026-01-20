"""
Create Admin Account in Users Table
Uses the backend's security module for consistent password hashing
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from supabase import create_client, Client
from dotenv import load_dotenv
from app.core.security import get_password_hash
from datetime import datetime
import uuid

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env file")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def create_admin():
    """Create admin account in users table"""
    print("=" * 60)
    print("🔧 Creating Admin Account in Users Table")
    print("=" * 60)
    print()

    # Admin credentials
    email = "premierhotel2023@gmail.com"
    password = "Admin123!"
    full_name = "Premier Hotel Admin"

    # Check if admin already exists in users table
    existing = supabase.table("users").select("*").eq("email", email).execute()

    if existing.data:
        print(f"⚠️  Admin already exists in users table (ID: {existing.data[0]['id']})")
        print("Updating password...")

        # Update password
        password_hash = get_password_hash(password)
        update_response = supabase.table("users").update({
            "password_hash": password_hash,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("email", email).execute()

        if update_response.data:
            print("✅ Password updated successfully!")
            user_id = update_response.data[0]["id"]
        else:
            print("❌ Failed to update password")
            return
    else:
        print("Creating new admin in users table...")

        # Check if profile exists (use same ID)
        profile = supabase.table("profiles").select("*").eq("email", email).execute()

        if profile.data:
            user_id = profile.data[0]["id"]
            print(f"Using existing profile ID: {user_id}")
        else:
            user_id = str(uuid.uuid4())
            print(f"Generated new ID: {user_id}")

        # Hash password
        print("Hashing password...")
        password_hash = get_password_hash(password)
        print(f"Password hash generated: {password_hash[:20]}...")

        # Create user record
        user_data = {
            "id": user_id,
            "email": email,
            "phone": None,
            "full_name": full_name,
            "password_hash": password_hash,
            "role": "admin",
            "status": "active",
            "is_guest": False,
            "email_verified": True,
            "phone_verified": False,
            "is_verified": True,
            "auth_providers": ["local"],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        print("Inserting into users table...")
        create_response = supabase.table("users").insert(user_data).execute()

        if create_response.data:
            print("✅ Admin created successfully in users table!")
        else:
            print("❌ Failed to create admin in users table")
            print(f"Response: {create_response}")
            return

    print()
    print("=" * 60)
    print("🎉 Admin Account Ready!")
    print("=" * 60)
    print()
    print(f"📧 Email: {email}")
    print(f"🔑 Password: {password}")
    print(f"👤 Role: admin")
    print(f"🆔 User ID: {user_id}")
    print()
    print("✅ You can now login at: http://localhost:5173/login")
    print()

    # Verify we can find the user
    print("Verifying user can be found...")
    verify = supabase.table("users").select("*").eq("email", email).execute()

    if verify.data:
        print(f"✅ User found in database")
        user = verify.data[0]
        print(f"   - Has password_hash: {'password_hash' in user and bool(user['password_hash'])}")
        print(f"   - Role: {user.get('role')}")
        print(f"   - Status: {user.get('status')}")
        print(f"   - Full name: {user.get('full_name')}")
    else:
        print("❌ Could not find user in database after creation")

if __name__ == "__main__":
    create_admin()
