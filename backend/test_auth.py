import sys
sys.path.insert(0, '/home/kelvin/Desktop/Premier-Hotel/backend')

from app.middleware.auth_secure import get_current_user
from app.core.security import decode_token
from fastapi import Request

# Test if the function exists
print(f"get_current_user function: {get_current_user}")
print(f"Is async: {hasattr(get_current_user, '__call__')}")

# Check decode_token
print(f"\ndecode_token function: {decode_token}")
