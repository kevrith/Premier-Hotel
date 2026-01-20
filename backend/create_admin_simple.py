"""
Create Admin Account in Users Table with Pre-computed Hash
"""
from supabase import create_client, Client
from dotenv import load_dotenv
import os
from datetime import datetime
import bcrypt

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

    # Get existing profile ID
    profile = supabase.table("profiles").select("*").eq("email", email).execute()
    if profile.data:
        user_id = profile.data[0]["id"]
        print(f"Using existing profile ID: {user_id}")
    else:
        print("❌ Profile not found! Run create_super_admin_v2.py first")
        return

    # Check if admin already exists in users table
    existing = supabase.table("users").select("*").eq("email", email).execute()

    # Generate bcrypt hash
    print("Hashing password with bcrypt...")
    password_bytes = password.encode('utf-8')
    password_hash = bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')
    print(f"Password hash: {password_hash[:30]}...")

    if existing.data:
        print(f"⚠️  Admin already exists in users table, updating...")

        # Update password
        update_response = supabase.table("users").update({
            "password_hash": password_hash,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("email", email).execute()

        if update_response.data:
            print("✅ Password updated successfully!")
        else:
            print("❌ Failed to update password")
            return
    else:
        print("Creating new admin in users table...")

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

        create_response = supabase.table("users").insert(user_data).execute()

        if create_response.data:
            print("✅ Admin created successfully in users table!")
        else:
            print("❌ Failed to create admin")
            print(f"Error: {create_response}")
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

    # Verify user
    verify = supabase.table("users").select("*").eq("email", email).execute()
    if verify.data:
        user = verify.data[0]
        print(f"✅ User verified in database")
        print(f"   - Has password_hash: {'password_hash' in user and bool(user['password_hash'])}")
        print(f"   - Role: {user.get('role')}")
        print(f"   - Status: {user.get('status')}")

        # Test password verification
        stored_hash = user["password_hash"].encode('utf-8')
        if bcrypt.checkpw(password_bytes, stored_hash):
            print(f"   ✅ Password verification: SUCCESS")
        else:
            print(f"   ❌ Password verification: FAILED")
    else:
        print("❌ Could not verify user in database")
        return

    print()
    print("✅ You can now login at: http://localhost:5173/login")
    print()

if __name__ == "__main__":
    create_admin()
