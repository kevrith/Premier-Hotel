#!/bin/bash
# Authentication Flow Testing Script
# This script tests the complete auth flow and shows you where to find OTP/tokens

set -e

API_URL="http://localhost:8000/api/v1/auth"

echo "=========================================="
echo "Authentication Testing Guide"
echo "=========================================="
echo ""
echo "IMPORTANT: Make sure your backend server is running!"
echo "Run: cd backend && ./venv/bin/python3.12 -m uvicorn app.main:app --reload"
echo ""
echo "Press Enter when server is running..."
read

echo ""
echo "=========================================="
echo "Test 1: Phone Registration & OTP"
echo "=========================================="
echo ""
echo "Registering user with phone number..."
echo ""

REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+254712345678",
    "full_name": "Phone Test User",
    "password": "SecurePass123!",
    "role": "customer"
  }')

echo "Response:"
echo "$REGISTER_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$REGISTER_RESPONSE"
echo ""
echo "📱 CHECK YOUR SERVER CONSOLE NOW!"
echo "You should see a line like:"
echo "   📱 OTP for +254712345678: 123456"
echo ""
echo "Enter the OTP code you see: "
read OTP_CODE

if [ ! -z "$OTP_CODE" ]; then
    echo ""
    echo "Verifying OTP: $OTP_CODE"
    echo ""

    VERIFY_RESPONSE=$(curl -s -X POST "$API_URL/phone/verify-otp" \
      -H "Content-Type: application/json" \
      -d "{
        \"phone\": \"+254712345678\",
        \"otp_code\": \"$OTP_CODE\"
      }")

    echo "Response:"
    echo "$VERIFY_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$VERIFY_RESPONSE"
fi

echo ""
echo "=========================================="
echo "Test 2: Email Registration & Verification"
echo "=========================================="
echo ""
echo "Registering user with email..."
echo ""

EMAIL_RESPONSE=$(curl -s -X POST "$API_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "full_name": "Email Test User",
    "password": "SecurePass123!",
    "role": "customer"
  }')

echo "Response:"
echo "$EMAIL_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$EMAIL_RESPONSE"
echo ""
echo "📧 CHECK YOUR SERVER CONSOLE NOW!"
echo "You should see a line like:"
echo "   📧 Email verification token for test@example.com: Xa9kL2mN5pQ..."
echo ""
echo "Enter the verification token you see: "
read EMAIL_TOKEN

if [ ! -z "$EMAIL_TOKEN" ]; then
    echo ""
    echo "Verifying email with token..."
    echo ""

    EMAIL_VERIFY_RESPONSE=$(curl -s -X POST "$API_URL/email/verify" \
      -H "Content-Type: application/json" \
      -d "{
        \"token\": \"$EMAIL_TOKEN\"
      }")

    echo "Response:"
    echo "$EMAIL_VERIFY_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$EMAIL_VERIFY_RESPONSE"
fi

echo ""
echo "=========================================="
echo "Test 3: Login with Email"
echo "=========================================="
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }')

echo "Response:"
echo "$LOGIN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$LOGIN_RESPONSE"

echo ""
echo "=========================================="
echo "Test 4: Guest User Creation"
echo "=========================================="
echo ""

GUEST_RESPONSE=$(curl -s -X POST "$API_URL/guest/create" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "test-device-123",
    "session_id": "test-session-456"
  }')

echo "Response:"
echo "$GUEST_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$GUEST_RESPONSE"

echo ""
echo "=========================================="
echo "Testing Complete!"
echo "=========================================="
echo ""
echo "Summary of where to find verification codes:"
echo "  📱 Phone OTP: Check server console for '📱 OTP for...'"
echo "  📧 Email Token: Check server console for '📧 Email verification token for...'"
echo "  🔐 Password Reset: Check server console for reset token"
echo ""
