#!/usr/bin/env python3
"""
Check which users exist in profiles vs users tables
"""
import requests
import json

# Supabase credentials
SUPABASE_URL = "https://njhjpxfozgpoiqwksple.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qaGpweGZvemdwb2lxd2tzcGxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ0ODk4MCwiZXhwIjoyMDgxMDI0OTgwfQ.bjmZ4q_bbthcszDn55ciS2RbctYaMiDvGhCRz5lTx1Y"

def get_all_users(table_name):
    """Get all users from a table"""
    url = f"{SUPABASE_URL}/rest/v1/{table_name}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    params = {
        "select": "*"
    }

    response = requests.get(url, headers=headers, params=params)

    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error fetching from {table_name}: {response.status_code}")
        print(f"Response: {response.text}")
        return []

def main():
    print("="*80)
    print("AUTHENTICATION TABLES COMPARISON")
    print("="*80)
    print()

    # Get users from both tables
    print("Fetching users from 'users' table...")
    users_table = get_all_users("users")

    print("Fetching users from 'profiles' table...")
    profiles_table = get_all_users("profiles")

    print()
    print("="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Users in 'users' table: {len(users_table)}")
    print(f"Users in 'profiles' table: {len(profiles_table)}")
    print()

    # Extract emails/IDs
    users_emails = {u.get('email') for u in users_table if u.get('email')}
    users_phones = {u.get('phone') for u in users_table if u.get('phone')}
    users_ids = {u.get('id') for u in users_table}

    profiles_emails = {p.get('email') for p in profiles_table if p.get('email')}
    profiles_ids = {p.get('id') for p in profiles_table}

    # Find users only in profiles
    profiles_only_emails = profiles_emails - users_emails
    profiles_only_ids = profiles_ids - users_ids

    # Find users only in users
    users_only_emails = users_emails - profiles_emails

    # Find users in both
    both_emails = users_emails & profiles_emails

    print("="*80)
    print("ANALYSIS")
    print("="*80)
    print(f"Users in BOTH tables: {len(both_emails)}")
    print(f"Users ONLY in 'users' table: {len(users_only_emails)}")
    print(f"Users ONLY in 'profiles' table: {len(profiles_only_emails)}")
    print()

    if profiles_only_emails:
        print("="*80)
        print("⚠️  USERS ONLY IN PROFILES TABLE (Need Migration)")
        print("="*80)
        for profile in profiles_table:
            if profile.get('email') in profiles_only_emails or profile.get('id') in profiles_only_ids:
                print(f"\nEmail: {profile.get('email')}")
                print(f"  ID: {profile.get('id')}")
                print(f"  Name: {profile.get('first_name', '')} {profile.get('last_name', '')}")
                print(f"  Role: {profile.get('role')}")
                print(f"  Status: {profile.get('status')}")
                print(f"  Phone: {profile.get('phone')}")
    else:
        print("✅ No users exist only in profiles table - safe to proceed!")

    print()

    if users_only_emails:
        print("="*80)
        print("ℹ️  USERS ONLY IN USERS TABLE (Modern Auth)")
        print("="*80)
        for user in users_table:
            if user.get('email') in users_only_emails:
                print(f"\nEmail: {user.get('email')}")
                print(f"  ID: {user.get('id')}")
                print(f"  Name: {user.get('full_name')}")
                print(f"  Role: {user.get('role')}")
                print(f"  Status: {user.get('status')}")
                print(f"  Phone: {user.get('phone')}")

    print()

    if both_emails:
        print("="*80)
        print("ℹ️  USERS IN BOTH TABLES (Duplicate Entries)")
        print("="*80)
        print(f"Total: {len(both_emails)}")
        print("Sample emails:", list(both_emails)[:5])

    print()
    print("="*80)
    print("RECOMMENDATION")
    print("="*80)

    if len(profiles_only_emails) > 0:
        print(f"⚠️  {len(profiles_only_emails)} user(s) need to be migrated from profiles to users table")
        print("   Run migration script to move these users.")
    else:
        print("✅ All users already in 'users' table - safe to drop 'profiles' table")

    print()
    print("="*80)

if __name__ == "__main__":
    main()
