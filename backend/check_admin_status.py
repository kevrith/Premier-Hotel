#!/usr/bin/env python3
import os
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://njhjpxfozgpoiqwksple.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_SERVICE_KEY:
    print("❌ ERROR: SUPABASE_SERVICE_KEY environment variable not set")
    exit(1)

print("Checking admin user status...")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Get all admin users
result = supabase.table("users").select("*").eq("role", "admin").execute()

print(f"\nFound {len(result.data)} admin user(s):")
for user in result.data:
    print(f"\n  Email: {user.get('email')}")
    print(f"  ID: {user.get('id')}")
    print(f"  Status: {user.get('status')}")
    print(f"  Role: {user.get('role')}")
    print(f"  Full Name: {user.get('full_name')}")
    
    if user.get('status') != 'active':
        print(f"  ⚠️  WARNING: Admin status is '{user.get('status')}' not 'active'!")
        print(f"  This will cause 403 Forbidden errors!")
