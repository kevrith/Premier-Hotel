#!/usr/bin/env python3
"""
Recreate Missing User - Create the missing user in auth.users and profiles
"""
import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def main():
    # Initialize Supabase client with service role key (admin privileges)
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not service_key:
        print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file")
        sys.exit(1)
    
    supabase: Client = create_client(supabase_url, service_key)
    
    # The problematic user ID from the error
    user_id = "0eba855c-615c-4aa8-8042-f24759d7fd6e"
    
    print(f"🔧 Recreating user profile for ID: {user_id}")
    
    try:
        # First, let's try to create the user in auth.users using Supabase Admin API
        print("📝 Creating user in auth.users...")
        
        # Create user with Supabase Auth Admin
        auth_user_data = {
            "email": "chef@premierhotel.com",
            "password": "chef123456",  # Temporary password
            "email_confirm": True,
            "user_metadata": {
                "first_name": "Chef",
                "last_name": "User",
                "role": "chef"
            }
        }
        
        # Use the admin auth API to create user
        auth_response = supabase.auth.admin.create_user(auth_user_data)
        
        if auth_response.user:
            created_user_id = auth_response.user.id
            print(f"✅ User created in auth.users with ID: {created_user_id}")
            
            # Now create the profile
            profile_data = {
                "id": created_user_id,
                "email": "chef@premierhotel.com",
                "first_name": "Chef",
                "last_name": "User",
                "role": "chef",
                "status": "active"
            }
            
            profile_response = supabase.table("profiles").insert(profile_data).execute()
            
            if profile_response.data:
                print("✅ Profile created successfully!")
                print(f"New user ID: {created_user_id}")
                print("⚠️  Note: The new user ID is different from the original problematic ID.")
                print("You'll need to login again with the new credentials:")
                print("Email: chef@premierhotel.com")
                print("Password: chef123456")
            else:
                print("❌ Failed to create profile")
                
        else:
            print("❌ Failed to create user in auth.users")
            print(f"Response: {auth_response}")
            
    except Exception as e:
        print(f"❌ Error creating user: {str(e)}")
        print("\n💡 Alternative solution:")
        print("1. Go to Supabase Dashboard > Authentication > Users")
        print("2. Create a new user manually with:")
        print("   - Email: chef@premierhotel.com")
        print("   - Password: chef123456")
        print("   - Role: chef")
        print("3. Then login with these credentials")

if __name__ == "__main__":
    main()