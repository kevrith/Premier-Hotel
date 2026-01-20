#!/usr/bin/env python3
"""
Check account directly in Supabase database
"""
import requests
import json

# Supabase credentials
SUPABASE_URL = "https://njhjpxfozgpoiqwksple.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qaGpweGZvemdwb2lxd2tzcGxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ0ODk4MCwiZXhwIjoyMDgxMDI0OTgwfQ.bjmZ4q_bbthcszDn55ciS2RbctYaMiDvGhCRz5lTx1Y"

def check_user(email):
    """Check if user exists in users table"""
    url = f"{SUPABASE_URL}/rest/v1/users"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    params = {
        "email": f"eq.{email}",
        "select": "*"
    }

    response = requests.get(url, headers=headers, params=params)

    print(f"\n{'='*60}")
    print(f"Checking account: {email}")
    print(f"{'='*60}\n")
    print(f"Status Code: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        if data:
            print(f"✓ Account found in 'users' table!\n")
            user = data[0]
            print("Account Details:")
            print(f"  ID: {user.get('id')}")
            print(f"  Email: {user.get('email')}")
            print(f"  Full Name: {user.get('full_name')}")
            print(f"  Role: {user.get('role')}")
            print(f"  Status: {user.get('status')}")
            print(f"  Email Verified: {user.get('email_verified')}")
            print(f"  Phone: {user.get('phone')}")
            print(f"  Has Password Hash: {'Yes' if user.get('password_hash') else 'No'}")
            print(f"  Password Hash Preview: {user.get('password_hash')[:50] if user.get('password_hash') else 'None'}...")
            print(f"  Auth Providers: {user.get('auth_providers')}")
            print(f"  Created At: {user.get('created_at')}")
            print(f"  Last Login: {user.get('last_login')}")
            return user
        else:
            print(f"✗ Account NOT found in 'users' table")
    else:
        print(f"✗ Error: {response.text}")

    return None

def check_profiles(email):
    """Check if user exists in profiles table"""
    url = f"{SUPABASE_URL}/rest/v1/profiles"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    params = {
        "email": f"eq.{email}",
        "select": "*"
    }

    response = requests.get(url, headers=headers, params=params)

    print(f"\n{'='*60}")
    print(f"Checking 'profiles' table for: {email}")
    print(f"{'='*60}\n")
    print(f"Status Code: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        if data:
            print(f"✓ Account found in 'profiles' table!\n")
            profile = data[0]
            print("Profile Details:")
            for key, value in profile.items():
                if key != 'password_hash':
                    print(f"  {key}: {value}")
            return profile
        else:
            print(f"✗ Account NOT found in 'profiles' table")
    else:
        print(f"Note: {response.text}")

    return None

def reset_password(email, new_password="Admin123!"):
    """Reset password for a user"""
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    password_hash = pwd_context.hash(new_password)

    url = f"{SUPABASE_URL}/rest/v1/users"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    data = {
        "password_hash": password_hash,
        "status": "active"
    }

    params = {
        "email": f"eq.{email}"
    }

    response = requests.patch(url, headers=headers, params=params, json=data)

    print(f"\n{'='*60}")
    print(f"Resetting password for: {email}")
    print(f"{'='*60}\n")
    print(f"Status Code: {response.status_code}")

    if response.status_code in [200, 204]:
        print(f"✓ Password reset successfully!\n")
        print(f"New credentials:")
        print(f"  Email: {email}")
        print(f"  Password: {new_password}")
        print(f"\nTry logging in now!")
        return True
    else:
        print(f"✗ Error: {response.text}")
        return False

if __name__ == "__main__":
    email = "premierhotel2023@gmail.com"

    # Check users table
    user = check_user(email)

    # Check profiles table
    profile = check_profiles(email)

    if user:
        print(f"\n{'='*60}")
        print("ACCOUNT FOUND IN 'users' TABLE")
        print(f"{'='*60}\n")

        choice = input("Do you want to reset the password? (yes/no): ").strip().lower()
        if choice in ['yes', 'y']:
            reset_password(email)
    elif profile:
        print(f"\n{'='*60}")
        print("ACCOUNT FOUND IN 'profiles' TABLE (Supabase Auth)")
        print(f"{'='*60}\n")
        print("This account uses Supabase Auth, not custom authentication.")
        print("You need to reset the password through Supabase Auth system.")
    else:
        print(f"\n{'='*60}")
        print("ACCOUNT NOT FOUND")
        print(f"{'='*60}\n")
        print("The account doesn't exist in the database.")
        print("You may need to register a new account.")

    print(f"\n{'='*60}\n")
