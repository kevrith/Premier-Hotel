#!/bin/bash

# Reset password for premierhotel2023@gmail.com
# New password will be: Admin123!

echo "========================================="
echo "Resetting Password for Account"
echo "========================================="
echo ""
echo "Email: premierhotel2023@gmail.com"
echo "New Password: Admin123!"
echo ""

# Generate bcrypt hash for Admin123!
# Using Python to generate the hash
NEW_HASH=$(python3 -c "from passlib.hash import bcrypt; print(bcrypt.hash('Admin123!'))")

echo "Generated password hash: ${NEW_HASH:0:50}..."
echo ""
echo "Updating database..."

# Update the password in Supabase
curl -s -X PATCH "https://njhjpxfozgpoiqwksple.supabase.co/rest/v1/users?email=eq.premierhotel2023@gmail.com" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qaGpweGZvemdwb2lxd2tzcGxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ0ODk4MCwiZXhwIjoyMDgxMDI0OTgwfQ.bjmZ4q_bbthcszDn55ciS2RbctYaMiDvGhCRz5lTx1Y" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qaGpweGZvemdwb2lxd2tzcGxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ0ODk4MCwiZXhwIjoyMDgxMDI0OTgwfQ.bjmZ4q_bbthcszDn55ciS2RbctYaMiDvGhCRz5lTx1Y" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"password_hash\": \"$NEW_HASH\", \"status\": \"active\"}"

echo ""
echo ""
echo "========================================="
echo "✓ Password Reset Complete!"
echo "========================================="
echo ""
echo "Login Credentials:"
echo "  Email: premierhotel2023@gmail.com"
echo "  Password: Admin123!"
echo ""
echo "You can now login at: http://localhost:5173"
echo "========================================="
