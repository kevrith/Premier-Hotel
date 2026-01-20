"""
Test user registration flow
"""
import requests
import json
from datetime import datetime

API_URL = "http://localhost:8000/api/v1/auth"

print("=" * 80)
print("🧪 TESTING REGISTRATION FLOW")
print("=" * 80)
print()

# Create unique test user
timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
test_user = {
    "email": f"testuser{timestamp}@example.com",
    "password": "TestPass123!",
    "full_name": "Test User"
}

print("Step 1: User fills registration form")
print(f"  Email: {test_user['email']}")
print(f"  Password: {test_user['password']}")
print(f"  Name: {test_user['full_name']}")
print()

print("Step 2: Frontend calls POST /api/v1/auth/register")
try:
    response = requests.post(
        f"{API_URL}/register",
        json=test_user,
        headers={"Content-Type": "application/json"}
    )

    print(f"  Status: {response.status_code}")
    print()

    if response.status_code in [200, 201]:
        data = response.json()
        print("  ✅ Registration successful!")
        print()
        print("Step 3: Response data received")
        print(json.dumps(data, indent=2, default=str))
        print()

        user = data.get('user', {})
        print("Step 4: Verify user data")
        print(f"  ✅ User ID: {user.get('id')}")
        print(f"  ✅ Email: {user.get('email')}")
        print(f"  ✅ Name: {user.get('full_name')}")
        print(f"  ✅ Role: {user.get('role', 'customer')}")
        print()

        # Check verification status
        email_verified = user.get('email_verified', False)
        print("Step 5: Check verification requirements")
        if email_verified:
            print("  ✅ Email already verified")
        else:
            print("  ⚠️  Email needs verification")
            print("  Should redirect to OTP verification screen")
        print()

        print("=" * 80)
        print("✅ REGISTRATION FLOW TEST: SUCCESS")
        print("=" * 80)

    else:
        print("  ❌ Registration failed!")
        print()
        error_data = response.json()
        print("Error details:")
        print(json.dumps(error_data, indent=2))
        print()

        # Check if it's an RLS policy issue
        if 'row-level security' in str(error_data):
            print("⚠️  ISSUE DETECTED: Row-Level Security (RLS) Policy Error")
            print()
            print("This means the Supabase database has RLS policies that are blocking")
            print("the registration from creating required records.")
            print()
            print("POSSIBLE FIXES:")
            print("1. Disable RLS on email_verifications table (for development)")
            print("2. Create proper RLS policy for email_verifications table")
            print("3. Use service role key for backend operations")
            print()
            print("For now, you can:")
            print("- Test login with existing admin account ✅")
            print("- Create new users manually using create_admin scripts")
            print("- Fix RLS policies in Supabase dashboard")

        print("=" * 80)
        print("❌ REGISTRATION FLOW TEST: FAILED")
        print("=" * 80)

except Exception as e:
    print(f"❌ Exception: {str(e)}")
    import traceback
    traceback.print_exc()
