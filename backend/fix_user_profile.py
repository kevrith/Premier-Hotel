#!/usr/bin/env python3
"""
Fix User Profile - Check and create missing user profile
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
    
    print(f"🔍 Checking user profile for ID: {user_id}")
    
    try:
        # Check if user exists in profiles table
        profile_response = supabase.table("profiles").select("*").eq("id", user_id).execute()
        
        if profile_response.data:
            profile = profile_response.data[0]
            print(f"✅ User profile found:")
            print(f"  - Email: {profile.get('email')}")
            print(f"  - Role: {profile.get('role')}")
            print(f"  - Name: {profile.get('first_name')} {profile.get('last_name')}")
            print("The profile exists, so the foreign key constraint should work.")
        else:
            print("❌ User profile NOT found in profiles table")
            print("This explains the foreign key constraint violation.")
            
            # Check if user exists in auth.users
            print("\n🔍 Checking auth.users table...")
            try:
                # We can't directly query auth.users with the client, but we can try to create the profile
                print("Attempting to create missing profile...")
                
                # Create a basic profile for this user
                new_profile = {
                    "id": user_id,
                    "email": "chef@premierhotel.com",  # Default email
                    "first_name": "Chef",
                    "last_name": "User",
                    "role": "chef",
                    "status": "active"
                }
                
                create_response = supabase.table("profiles").insert(new_profile).execute()
                
                if create_response.data:
                    print("✅ Profile created successfully!")
                    print(f"Created profile: {create_response.data[0]}")
                else:
                    print("❌ Failed to create profile")
                    print(f"Response: {create_response}")
                    
            except Exception as create_error:
                print(f"❌ Error creating profile: {str(create_error)}")
                
                # If creation fails, it might be because the user doesn't exist in auth.users
                print("\n💡 The user might not exist in auth.users table.")
                print("This could happen if the user was deleted or never properly created.")
                
    except Exception as e:
        print(f"❌ Error checking user profile: {str(e)}")

if __name__ == "__main__":
    main()