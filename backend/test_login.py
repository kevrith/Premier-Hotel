"""
Test Login Endpoint
"""
import requests

API_URL = "http://localhost:8000/api/v1/auth"

def test_login():
    print("=" * 60)
    print("🧪 Testing Login Endpoint")
    print("=" * 60)
    print()

    email = "premierhotel2023@gmail.com"
    password = "Admin123!"

    print(f"Logging in as: {email}")
    print()

    try:
        response = requests.post(
            f"{API_URL}/login",
            json={
                "email": email,
                "password": password
            },
            headers={"Content-Type": "application/json"}
        )

        print(f"Status Code: {response.status_code}")
        print()

        if response.status_code == 200:
            data = response.json()
            print("✅ LOGIN SUCCESSFUL!")
            print()
            print("Response:")
            print(f"  - User ID: {data.get('user', {}).get('id')}")
            print(f"  - Email: {data.get('user', {}).get('email')}")
            print(f"  - Role: {data.get('user', {}).get('role')}")
            print(f"  - Access Token: {data.get('access_token', '')[:50]}...")
            print(f"  - Refresh Token: {data.get('refresh_token', '')[:50]}...")
        else:
            print("❌ LOGIN FAILED!")
            print()
            print(f"Response: {response.text}")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_login()
