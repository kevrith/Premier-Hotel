#!/usr/bin/env python3
"""
Check existing users in the database
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

def check_users():
    """Check existing users in the database"""
    print("Checking existing users...")
    
    try:
        # Check profiles table
        profiles_response = supabase.table("profiles").select("*").execute()
        
        if profiles_response.data:
            print(f"\n✅ Found {len(profiles_response.data)} users in profiles table:")
            for user in profiles_response.data:
                print(f"  - {user.get('email', 'No email')} | {user.get('first_name', '')} {user.get('last_name', '')} | Role: {user.get('role', 'No role')}")
        else:
            print("❌ No users found in profiles table")
            
        # Also check if there's a users table
        try:
            users_response = supabase.table("users").select("*").execute()
            if users_response.data:
                print(f"\n✅ Found {len(users_response.data)} users in users table:")
                for user in users_response.data:
                    print(f"  - {user.get('email', 'No email')} | {user.get('full_name', user.get('name', ''))} | Role: {user.get('role', 'No role')}")
        except Exception as e:
            print(f"ℹ️  No users table found or accessible: {e}")
            
    except Exception as e:
        print(f"❌ Error checking users: {e}")

if __name__ == "__main__":
    check_users()