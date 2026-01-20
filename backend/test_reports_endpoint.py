#!/usr/bin/env python3
"""
Test the reports/overview endpoint with proper authentication
"""
import requests
import json
from datetime import datetime, timedelta

# API Base URL
BASE_URL = "http://localhost:8000/api/v1"

def test_reports_endpoint():
    """Test the reports endpoint"""

    # First, login to get a token
    print("=== Step 1: Login ===")
    login_data = {
        "email": "admin@premier.com",
        "password": "Admin@123"
    }

    try:
        login_response = requests.post(
            f"{BASE_URL}/auth/login",
            json=login_data
        )

        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.status_code}")
            print(f"Response: {login_response.text}")
            return

        login_result = login_response.json()
        token = login_result.get("access_token")

        if not token:
            print(f"❌ No access_token in response")
            print(f"Response: {json.dumps(login_result, indent=2)}")
            return

        print(f"✓ Login successful")
        print(f"  Token: {token[:50]}...")

    except Exception as e:
        print(f"❌ Login exception: {e}")
        return

    # Now test the reports endpoint
    print("\n=== Step 2: Test Reports Overview ===")

    # Calculate date range (last 30 days)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)

    params = {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat()
    }

    headers = {
        "Authorization": f"Bearer {token}"
    }

    print(f"Request URL: {BASE_URL}/reports/overview")
    print(f"Params: {params}")

    try:
        reports_response = requests.get(
            f"{BASE_URL}/reports/overview",
            headers=headers,
            params=params
        )

        print(f"\nResponse Status: {reports_response.status_code}")

        if reports_response.status_code == 200:
            print("✓ Reports endpoint successful!")
            data = reports_response.json()
            print(f"\nData received:")
            print(json.dumps(data, indent=2))
        else:
            print(f"❌ Reports endpoint failed")
            print(f"Response: {reports_response.text}")

    except Exception as e:
        print(f"❌ Reports request exception: {e}")

if __name__ == "__main__":
    test_reports_endpoint()
