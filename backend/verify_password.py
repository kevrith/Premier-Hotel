#!/usr/bin/env python3
"""
Verify password hash
"""
import sys
sys.path.insert(0, '/home/kelvin/Desktop/Premier-Hotel/backend')

from app.core.security import verify_password, get_password_hash

# The hash from database
stored_hash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyWb8z3.r9hC"

# Test passwords
test_passwords = [
    "admin123",
    "Admin123",
    "Admin123!",
    "password",
    "admin",
]

print("="*80)
print("PASSWORD VERIFICATION TEST")
print("="*80)
print(f"\nStored hash: {stored_hash}\n")

for pwd in test_passwords:
    result = verify_password(pwd, stored_hash)
    status = "✓ MATCH" if result else "✗ NO MATCH"
    print(f"{status}: '{pwd}'")

print("\n" + "="*80)
print("GENERATING NEW HASH FOR 'admin123'")
print("="*80)
new_hash = get_password_hash("admin123")
print(f"\nNew hash for 'admin123':\n{new_hash}\n")

# Verify the new hash works
if verify_password("admin123", new_hash):
    print("✓ New hash verification successful!")
else:
    print("✗ New hash verification failed!")

print("\n" + "="*80)
