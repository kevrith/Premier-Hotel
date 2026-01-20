#!/usr/bin/env python3
import sys
sys.path.insert(0, '/home/kelvin/Desktop/Premier-Hotel/backend')

from app.core.security import create_access_token, decode_token

# Create a test token
token_data = {
    "sub": "test-user-id-123",
    "email": "test@example.com",
    "role": "admin"
}

token = create_access_token(data=token_data)
print("Created token:", token[:50] + "...")

# Try to decode it
decoded = decode_token(token)
print("\nDecoded token:", decoded)

if decoded:
    print("\n✅ Token creation and decoding works!")
else:
    print("\n❌ Token decoding failed!")
