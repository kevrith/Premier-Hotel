"""
Comprehensive Login and Registration Test
Tests both backend endpoints and verifies token response
"""
import requests
import json
from datetime import datetime

API_URL = "http://localhost:8000/api/v1/auth"

def print_header(title):
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)

def print_success(message):
    print(f"✅ {message}")

def print_error(message):
    print(f"❌ {message}")

def print_info(message):
    print(f"ℹ️  {message}")

def test_login():
    """Test admin login"""
    print_header("Testing Admin Login")

    credentials = {
        "email": "premierhotel2023@gmail.com",
        "password": "Admin123!"
    }

    print(f"Attempting login with: {credentials['email']}")

    try:
        response = requests.post(
            f"{API_URL}/login",
            json=credentials,
            headers={"Content-Type": "application/json"}
        )

        print(f"\nStatus Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")

        if response.status_code == 200:
            data = response.json()
            print_success("LOGIN SUCCESSFUL!")
            print("\nResponse Data:")
            print(json.dumps(data, indent=2, default=str))

            # Verify required fields
            print("\nVerifying Response Structure:")
            required_fields = ['access_token', 'refresh_token', 'user', 'token_type']
            for field in required_fields:
                if field in data:
                    print_success(f"{field}: Present")
                else:
                    print_error(f"{field}: MISSING")

            # Verify user data
            user = data.get('user', {})
            print("\nUser Data:")
            print(f"  - ID: {user.get('id')}")
            print(f"  - Email: {user.get('email')}")
            print(f"  - Full Name: {user.get('full_name')}")
            print(f"  - Role: {user.get('role')}")
            print(f"  - Status: {user.get('status')}")
            print(f"  - Email Verified: {user.get('email_verified')}")

            # Test token is valid JWT
            access_token = data.get('access_token', '')
            if access_token:
                parts = access_token.split('.')
                if len(parts) == 3:
                    print_success(f"Access token is valid JWT format (3 parts)")
                    print(f"  - Token length: {len(access_token)} characters")
                    print(f"  - Preview: {access_token[:50]}...")
                else:
                    print_error(f"Access token is NOT valid JWT format (has {len(parts)} parts)")

            return True, data
        else:
            print_error("LOGIN FAILED!")
            print(f"\nError Response: {response.text}")
            return False, None

    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        return False, None

def test_registration():
    """Test new user registration"""
    print_header("Testing User Registration")

    # Create unique email for testing
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    test_user = {
        "email": f"testuser{timestamp}@example.com",
        "password": "TestPass123!",
        "full_name": "Test User"
    }

    print(f"Attempting registration with: {test_user['email']}")

    try:
        response = requests.post(
            f"{API_URL}/register",
            json=test_user,
            headers={"Content-Type": "application/json"}
        )

        print(f"\nStatus Code: {response.status_code}")

        if response.status_code == 200 or response.status_code == 201:
            data = response.json()
            print_success("REGISTRATION SUCCESSFUL!")
            print("\nResponse Data:")
            print(json.dumps(data, indent=2, default=str))

            # Verify required fields
            print("\nVerifying Response Structure:")
            required_fields = ['access_token', 'refresh_token', 'user']
            for field in required_fields:
                if field in data:
                    print_success(f"{field}: Present")
                else:
                    print_error(f"{field}: MISSING")

            return True, data
        else:
            print_error("REGISTRATION FAILED!")
            print(f"\nError Response: {response.text}")
            return False, None

    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        return False, None

def test_protected_endpoint(token):
    """Test accessing a protected endpoint with token"""
    print_header("Testing Protected Endpoint Access")

    print(f"Using token: {token[:50]}...")

    try:
        response = requests.get(
            f"{API_URL}/me",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        )

        print(f"\nStatus Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print_success("PROTECTED ENDPOINT ACCESS SUCCESSFUL!")
            print("\nUser Profile Data:")
            print(json.dumps(data, indent=2, default=str))
            return True
        else:
            print_error("PROTECTED ENDPOINT ACCESS FAILED!")
            print(f"\nError Response: {response.text}")
            return False

    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        return False

def main():
    print_header("🧪 PREMIER HOTEL AUTHENTICATION TEST SUITE")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"API URL: {API_URL}")

    results = {
        "login": False,
        "registration": False,
        "protected_access": False
    }

    # Test 1: Login
    login_success, login_data = test_login()
    results["login"] = login_success

    # Test 2: Registration
    reg_success, reg_data = test_registration()
    results["registration"] = reg_success

    # Test 3: Protected Endpoint (if login succeeded)
    if login_success and login_data:
        token = login_data.get('access_token')
        if token:
            protected_success = test_protected_endpoint(token)
            results["protected_access"] = protected_success

    # Print Summary
    print_header("📊 TEST SUMMARY")
    total_tests = len(results)
    passed_tests = sum(1 for result in results.values() if result)

    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name.upper()}: {status}")

    print(f"\nTotal: {passed_tests}/{total_tests} tests passed")

    if passed_tests == total_tests:
        print_success("\n🎉 ALL TESTS PASSED! Authentication system is working correctly.")
    else:
        print_error(f"\n⚠️  {total_tests - passed_tests} test(s) failed. Please review the errors above.")

    print("\n" + "=" * 80)

if __name__ == "__main__":
    main()
