#!/usr/bin/env python3
"""Test password verification"""
import sys
sys.path.insert(0, '/home/kelvin/Desktop/Premier-Hotel/backend')

from app.core.security import verify_password

# The hash from database
stored_hash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyWb8z3.r9hC"

# Test different passwords
passwords_to_test = [
    "admin123",
    "Admin123",
    "Admin123!",
    "password",
    "admin",
]

print("Testing password verification...")
print(f"Stored hash: {stored_hash[:50]}...\n")

for pwd in passwords_to_test:
    result = verify_password(pwd, stored_hash)
    status = "✓ MATCH" if result else "✗ NO MATCH"
    print(f"{status}: '{pwd}'")

print("\nDone!")
