#!/usr/bin/env python3
"""Test Email OTP integration"""
import asyncio
import os
import sys
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Add app to path
sys.path.insert(0, os.path.dirname(__file__))

from app.services.email_service import send_otp_email


async def test_email():
    """Test sending email OTP"""
    print("=" * 70)
    print("📧 Email OTP Test")
    print("=" * 70)
    print()

    # Show configuration
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = os.getenv("SMTP_PORT", "587")

    print("📋 Configuration:")
    print(f"   SMTP Host: {smtp_host}")
    print(f"   SMTP Port: {smtp_port}")
    print(f"   SMTP User: {smtp_user if smtp_user else '(not configured)'}")
    print()

    if not smtp_user or smtp_user == "your_gmail@gmail.com":
        print("❌ Email not configured!")
        print()
        print("Please configure email in .env file:")
        print("  1. Set SMTP_USER to your Gmail address")
        print("  2. Set SMTP_PASSWORD to your Gmail App Password")
        print("  3. Set EMAIL_FROM to the same Gmail address")
        print()
        print("See EMAIL_SETUP_GUIDE.md for detailed instructions")
        return

    # Get recipient email
    email = input("Enter recipient email address: ").strip()

    if not email:
        print("❌ Email address required")
        return

    print(f"\n📤 Sending OTP email to {email}...")

    try:
        # Send test OTP
        test_otp = "123456"
        success = send_otp_email(email, test_otp)

        if success:
            print("\n✅ SUCCESS! Email sent successfully!")
            print(f"   OTP Code: {test_otp}")
            print()
            print("📬 Check your email inbox (and spam folder)")
        else:
            print("\n❌ Failed to send email")
            print()
            print("Common issues:")
            print("  1. Incorrect Gmail address or App Password")
            print("  2. 2-Factor Authentication not enabled on Gmail")
            print("  3. App Password not generated correctly")
            print("  4. Gmail blocking less secure apps")
            print()
            print("See EMAIL_SETUP_GUIDE.md for troubleshooting")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        print()
        print("Troubleshooting:")
        print("  1. Verify SMTP credentials in .env")
        print("  2. Check that you're using App Password (not regular password)")
        print("  3. Ensure 2FA is enabled on your Gmail account")
        print("  4. Try generating a new App Password")


if __name__ == "__main__":
    asyncio.run(test_email())
