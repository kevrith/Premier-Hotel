"""
Email Service - Gmail SMTP Integration
Processes email queue and sends emails using Gmail SMTP
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional
from datetime import datetime
from jinja2 import Template
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Email service using Gmail SMTP"""

    def __init__(self):
        self.smtp_host = getattr(settings, 'SMTP_HOST', 'smtp.gmail.com')
        self.smtp_port = getattr(settings, 'SMTP_PORT', 587)
        self.smtp_user = getattr(settings, 'SMTP_USER', None)
        self.smtp_password = getattr(settings, 'SMTP_PASSWORD', None)
        self.from_email = getattr(settings, 'EMAIL_FROM', self.smtp_user)
        self.from_name = getattr(settings, 'EMAIL_FROM_NAME', 'Premier Hotel')

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """
        Send an email using Gmail SMTP

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML body content
            text_content: Plain text fallback (optional)

        Returns:
            bool: True if sent successfully, False otherwise
        """
        if not self.smtp_user or not self.smtp_password:
            logger.error("SMTP credentials not configured")
            return False

        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email

            # Add plain text version
            if text_content:
                part1 = MIMEText(text_content, 'plain')
                msg.attach(part1)

            # Add HTML version
            part2 = MIMEText(html_content, 'html')
            msg.attach(part2)

            # Connect to Gmail SMTP
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()  # Upgrade to secure connection
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except smtplib.SMTPAuthenticationError:
            logger.error("SMTP authentication failed. Check credentials and app password")
            return False
        except smtplib.SMTPException as e:
            logger.error(f"SMTP error sending email to {to_email}: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending email to {to_email}: {str(e)}")
            return False

    def send_template_email(
        self,
        to_email: str,
        subject: str,
        template_html: str,
        template_vars: Dict[str, Any]
    ) -> bool:
        """
        Send an email using a template

        Args:
            to_email: Recipient email address
            subject: Email subject
            template_html: HTML template string with Jinja2 variables
            template_vars: Dictionary of variables to render in template

        Returns:
            bool: True if sent successfully, False otherwise
        """
        try:
            # Render template
            template = Template(template_html)
            html_content = template.render(**template_vars)

            # Send email
            return self.send_email(to_email, subject, html_content)

        except Exception as e:
            logger.error(f"Error rendering email template: {str(e)}")
            return False


# Singleton instance
email_service = EmailService()


def send_booking_confirmation_email(
    to_email: str,
    booking_data: Dict[str, Any]
) -> bool:
    """Send booking confirmation email"""
    from app.templates.emails.booking_confirmation import get_template

    subject = f"Booking Confirmation - {booking_data.get('booking_number', 'N/A')}"
    template_html = get_template()

    return email_service.send_template_email(
        to_email=to_email,
        subject=subject,
        template_html=template_html,
        template_vars=booking_data
    )


def send_payment_receipt_email(
    to_email: str,
    payment_data: Dict[str, Any]
) -> bool:
    """Send payment receipt email"""
    from app.templates.emails.payment_receipt import get_template

    subject = f"Payment Receipt - {payment_data.get('payment_id', 'N/A')}"
    template_html = get_template()

    return email_service.send_template_email(
        to_email=to_email,
        subject=subject,
        template_html=template_html,
        template_vars=payment_data
    )


def send_order_confirmation_email(
    to_email: str,
    order_data: Dict[str, Any]
) -> bool:
    """Send order confirmation email"""
    from app.templates.emails.order_confirmation import get_template

    subject = f"Order Confirmation - #{order_data.get('order_number', 'N/A')}"
    template_html = get_template()

    return email_service.send_template_email(
        to_email=to_email,
        subject=subject,
        template_html=template_html,
        template_vars=order_data
    )


def send_notification_email(
    to_email: str,
    notification_data: Dict[str, Any]
) -> bool:
    """Send generic notification email"""
    from app.templates.emails.notification import get_template

    subject = notification_data.get('title', 'Notification from Premier Hotel')
    template_html = get_template()

    return email_service.send_template_email(
        to_email=to_email,
        subject=subject,
        template_html=template_html,
        template_vars=notification_data
    )


def send_otp_email(to_email: str, otp_code: str) -> bool:
    """
    Send OTP verification code via email

    Args:
        to_email: Recipient email address
        otp_code: 6-digit OTP code

    Returns:
        bool: True if sent successfully
    """
    subject = "Premier Hotel - Email Verification Code"

    # HTML email template
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
            }}
            .content {{
                background: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 10px 10px;
            }}
            .otp-code {{
                background: white;
                border: 2px dashed #667eea;
                padding: 20px;
                text-align: center;
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                color: #667eea;
                margin: 20px 0;
                border-radius: 8px;
            }}
            .footer {{
                text-align: center;
                margin-top: 20px;
                font-size: 12px;
                color: #666;
            }}
            .warning {{
                background: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🏨 Premier Hotel</h1>
            <p>Email Verification</p>
        </div>
        <div class="content">
            <h2>Hello!</h2>
            <p>Thank you for registering with Premier Hotel. To complete your registration, please use the verification code below:</p>

            <div class="otp-code">
                {otp_code}
            </div>

            <p>This code will expire in <strong>10 minutes</strong>.</p>

            <div class="warning">
                <strong>⚠️ Security Notice:</strong> Never share this code with anyone. Premier Hotel will never ask for your verification code.
            </div>

            <p>If you didn't request this code, please ignore this email or contact our support team.</p>

            <div class="footer">
                <p>© {datetime.now().year} Premier Hotel. All rights reserved.</p>
                <p>This is an automated message, please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """

    # Plain text fallback
    text_content = f"""
Premier Hotel - Email Verification

Your verification code is: {otp_code}

This code will expire in 10 minutes.

Security Notice: Never share this code with anyone. Premier Hotel will never ask for your verification code.

If you didn't request this code, please ignore this email.

© {datetime.now().year} Premier Hotel
    """

    return email_service.send_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        text_content=text_content
    )


def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """
    Send password reset token via email

    Args:
        to_email: Recipient email address
        reset_token: Password reset token

    Returns:
        bool: True if sent successfully
    """
    subject = "Premier Hotel - Password Reset Request"

    # HTML email template
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
            }}
            .content {{
                background: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 10px 10px;
            }}
            .token {{
                background: white;
                border: 2px solid #dc3545;
                padding: 15px;
                text-align: center;
                font-size: 16px;
                font-weight: bold;
                color: #dc3545;
                margin: 20px 0;
                border-radius: 8px;
                word-break: break-all;
            }}
            .button {{
                display: inline-block;
                background: #667eea;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
            }}
            .footer {{
                text-align: center;
                margin-top: 20px;
                font-size: 12px;
                color: #666;
            }}
            .warning {{
                background: #f8d7da;
                border-left: 4px solid #dc3545;
                padding: 15px;
                margin: 20px 0;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🏨 Premier Hotel</h1>
            <p>Password Reset Request</p>
        </div>
        <div class="content">
            <h2>Reset Your Password</h2>
            <p>We received a request to reset your password. Use the token below to reset your password:</p>

            <div class="token">
                {reset_token}
            </div>

            <p>This token will expire in <strong>1 hour</strong>.</p>

            <div class="warning">
                <strong>⚠️ Security Alert:</strong> If you didn't request a password reset, please ignore this email and ensure your account is secure.
            </div>

            <div class="footer">
                <p>© {datetime.now().year} Premier Hotel. All rights reserved.</p>
                <p>This is an automated message, please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """

    # Plain text fallback
    text_content = f"""
Premier Hotel - Password Reset Request

We received a request to reset your password.

Your password reset token is: {reset_token}

This token will expire in 1 hour.

Security Alert: If you didn't request a password reset, please ignore this email.

© {datetime.now().year} Premier Hotel
    """

    return email_service.send_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        text_content=text_content
    )
