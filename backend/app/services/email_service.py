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
