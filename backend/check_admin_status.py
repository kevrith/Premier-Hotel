#!/usr/bin/env python3
import os
from supabase import create_client

SUPABASE_URL = "https://iyqccquwfkglqzcyrqgn.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cWNjcXV3ZmtnbHF6Y3lycWduIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDU5NTkwNSwiZXhwIjoyMDUwMTcxOTA1fQ.s3M25YjLPvxL8nDQy2wWX-V5hv6Ml9cPa_5MKpZ4p3E"

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
