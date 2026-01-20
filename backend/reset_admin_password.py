#!/usr/bin/env python3
"""
Reset admin password script
"""
import sys
sys.path.insert(0, '/home/kelvin/Desktop/Premier-Hotel/backend')

from app.core.config import settings
from app.core.security import get_password_hash
from supabase import create_client

# New password
NEW_PASSWORD = "Admin@2026"

# Connect to Supabase
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

# Hash the new password
password_hash = get_password_hash(NEW_PASSWORD)

# Update admin@premierhotel.com
result = supabase.table('users').update({
    'password_hash': password_hash
}).eq('email', 'admin@premierhotel.com').execute()

if result.data:
    print("✓ Admin password updated successfully!")
    print(f"\nLogin credentials:")
    print(f"  Email: admin@premierhotel.com")
    print(f"  Password: {NEW_PASSWORD}")
    print(f"\nYou can now log in with these credentials.")
else:
    print("✗ Failed to update password")
    print("Please check if the user exists in the database.")
