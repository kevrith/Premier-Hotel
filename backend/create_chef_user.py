#!/usr/bin/env python3
"""
Create a chef user for testing the kitchen orders endpoint
"""
from supabase import create_client, Client
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env file")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def create_chef_user():
    """Create a chef user for testing"""
    print("Creating chef user for testing...")
    
    email = "tom@gmail.com"
    password = "password123"
    
    try:
        # Sign up the user
        signup_response = supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "first_name": "Tom",
                    "last_name": "Chef",
                    "role": "chef"
                }
            }
        })

        if not signup_response.user:
            print("❌ Failed to create auth user")
            return

        user_id = signup_response.user.id
        print(f"✅ Auth user created: {user_id}")

        # Update or insert profile
        profile_data = {
            "id": user_id,
            "email": email,
            "first_name": "Tom",
            "last_name": "Chef",
            "phone": "+254700000000",
            "role": "chef",
            "status": "active"
        }

        # Try upsert to handle both insert and update
        profile_response = supabase.table("profiles").upsert(profile_data).execute()

        if profile_response.data:
            print("✅ Profile created successfully")
        else:
            print("⚠️  Profile creation may have failed, but user exists in auth")

        print(f"✅ Chef user created: {email} / {password}")
        print("You can now test the kitchen orders endpoint")

    except Exception as e:
        error_msg = str(e)
        print(f"❌ Error creating chef user: {error_msg}")
        
        if "already registered" in error_msg.lower():
            print("Chef user already exists, that's fine!")

if __name__ == "__main__":
    create_chef_user()