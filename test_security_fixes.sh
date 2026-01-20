#!/bin/bash

# Security Fixes Testing Script
# Tests the P0 critical security fixes implementation

echo "========================================="
echo "Testing P0 Security Fixes"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:8000/api/v1"

echo "Test 1: Cookie-Based Authentication"
echo "------------------------------------"

# Test registration with cookie
echo -n "Registering test user... "
RESPONSE=$(curl -s -c /tmp/cookies.txt -w "\n%{http_code}" -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "full_name": "Test User",
    "role": "customer"
  }' 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "400" ]; then
  echo -e "${GREEN}✓${NC} Registration endpoint works"

  # Check if cookies were set
  if grep -q "access_token" /tmp/cookies.txt && grep -q "HttpOnly" /tmp/cookies.txt; then
    echo -e "${GREEN}✓${NC} httpOnly cookies are set correctly"
  else
    echo -e "${RED}✗${NC} httpOnly cookies NOT set (SECURITY ISSUE)"
  fi
else
  echo -e "${RED}✗${NC} Registration failed (HTTP $HTTP_CODE)"
fi

echo ""
echo "Test 2: Login with Cookie Authentication"
echo "----------------------------------------"

echo -n "Logging in... "
RESPONSE=$(curl -s -c /tmp/cookies.txt -b /tmp/cookies.txt -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }' 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓${NC} Login successful with cookie auth"
else
  echo -e "${YELLOW}⚠${NC} Login returned HTTP $HTTP_CODE (user may already exist)"
fi

echo ""
echo "Test 3: Access Protected Endpoint with Cookie"
echo "---------------------------------------------"

echo -n "Accessing /auth/me endpoint... "
RESPONSE=$(curl -s -b /tmp/cookies.txt -w "\n%{http_code}" "$API_URL/auth/me" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓${NC} Protected endpoint accessible with cookie"
  echo "User data: $(echo "$BODY" | python3 -m json.tool 2>/dev/null | grep -E '(email|full_name)' | head -2)"
else
  echo -e "${RED}✗${NC} Cannot access protected endpoint (HTTP $HTTP_CODE)"
fi

echo ""
echo "Test 4: Token Refresh"
echo "--------------------"

echo -n "Refreshing access token... "
RESPONSE=$(curl -s -b /tmp/cookies.txt -c /tmp/cookies.txt -w "\n%{http_code}" -X POST "$API_URL/auth/refresh" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓${NC} Token refresh successful"
else
  echo -e "${YELLOW}⚠${NC} Token refresh returned HTTP $HTTP_CODE"
fi

echo ""
echo "Test 5: Logout (Clear Cookies)"
echo "------------------------------"

echo -n "Logging out... "
RESPONSE=$(curl -s -b /tmp/cookies.txt -c /tmp/cookies.txt -w "\n%{http_code}" -X POST "$API_URL/auth/logout" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓${NC} Logout successful"

  # Verify cookies are cleared
  if ! grep -q "access_token" /tmp/cookies.txt 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Cookies cleared successfully"
  fi
else
  echo -e "${RED}✗${NC} Logout failed (HTTP $HTTP_CODE)"
fi

echo ""
echo "Test 6: XSS Prevention (DOMPurify)"
echo "----------------------------------"

echo -n "Testing HTML sanitization... "
# This would need to be tested in the frontend
echo -e "${YELLOW}⚠${NC} Manual test required in browser"
echo "  1. Open browser DevTools Console"
echo "  2. Import: import { sanitizePlainText } from '@/lib/security/sanitize';"
echo "  3. Test: sanitizePlainText('<script>alert(1)</script>Test')"
echo "  4. Expected: 'Test' (script removed)"

echo ""
echo "Test 7: Cookie Security Attributes"
echo "----------------------------------"

if [ -f /tmp/cookies.txt ]; then
  echo "Checking cookie attributes:"

  if grep -q "HttpOnly" /tmp/cookies.txt; then
    echo -e "${GREEN}✓${NC} HttpOnly flag present (prevents JavaScript access)"
  else
    echo -e "${RED}✗${NC} HttpOnly flag MISSING (SECURITY RISK)"
  fi

  # Note: SameSite and Secure flags may not appear in cookies.txt file format
  echo -e "${YELLOW}ℹ${NC} SameSite=Lax (check browser DevTools)"
  echo -e "${YELLOW}ℹ${NC} Secure flag (HTTPS only in production)"
fi

echo ""
echo "========================================="
echo "Security Test Summary"
echo "========================================="
echo ""
echo "Manual Tests Required:"
echo "1. Open browser to http://localhost:5173"
echo "2. Open DevTools > Application > Cookies"
echo "3. Login to the app"
echo "4. Verify cookies show:"
echo "   - HttpOnly: ✓"
echo "   - SameSite: Lax"
echo "   - Secure: (only in production/HTTPS)"
echo ""
echo "5. Open DevTools > Console"
echo "6. Try: document.cookie"
echo "   Expected: Should NOT show access_token (protected by HttpOnly)"
echo ""
echo "7. Try: localStorage.getItem('access_token')"
echo "   Expected: null (tokens no longer in localStorage)"
echo ""
echo "For XSS testing, create a booking with customer name:"
echo "  <script>alert('XSS')</script>John Doe"
echo "Then print the bill QR code - should show only 'John Doe'"
echo ""

# Cleanup
rm -f /tmp/cookies.txt

echo "========================================="
echo "Test script completed"
echo "========================================="
