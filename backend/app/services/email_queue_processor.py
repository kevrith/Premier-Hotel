"""
Email Queue Processor
Processes emails from the email_queue table
"""

import logging
from datetime import datetime
from typing import Optional
from supabase import Client
from app.services.email_service import (
    send_booking_confirmation_email,
    send_payment_receipt_email,
    send_order_confirmation_email,
    send_notification_email
)

logger = logging.getLogger(__name__)


async def process_email_queue(supabase: Client, limit: int = 10) -> int:
    """
    Process pending emails from the email_queue table

    Args:
        supabase: Supabase client instance
        limit: Maximum number of emails to process in one batch

    Returns:
        int: Number of emails processed
    """
    try:
        # Fetch pending emails from queue
        result = supabase.table("email_queue").select("*").eq("status", "pending").limit(limit).execute()

        if not result.data:
            logger.info("No pending emails in queue")
            return 0

        emails_processed = 0

        for email_record in result.data:
            try:
                # Mark as processing
                supabase.table("email_queue").update({
                    "status": "processing",
                    "updated_at": datetime.now().isoformat()
                }).eq("id", email_record["id"]).execute()

                # Determine email type and send
                success = False
                email_type = email_record.get("email_type", "generic")

                if email_type == "booking_confirmation":
                    success = send_booking_confirmation_email(
                        to_email=email_record["to_email"],
                        booking_data=email_record["data"]
                    )
                elif email_type == "payment_receipt":
                    success = send_payment_receipt_email(
                        to_email=email_record["to_email"],
                        payment_data=email_record["data"]
                    )
                elif email_type == "order_confirmation":
                    success = send_order_confirmation_email(
                        to_email=email_record["to_email"],
                        order_data=email_record["data"]
                    )
                else:
                    # Generic notification
                    success = send_notification_email(
                        to_email=email_record["to_email"],
                        notification_data=email_record["data"]
                    )

                # Update queue status
                if success:
                    supabase.table("email_queue").update({
                        "status": "sent",
                        "sent_at": datetime.now().isoformat(),
                        "updated_at": datetime.now().isoformat()
                    }).eq("id", email_record["id"]).execute()

                    emails_processed += 1
                    logger.info(f"Successfully sent email to {email_record['to_email']}")
                else:
                    # Mark as failed
                    supabase.table("email_queue").update({
                        "status": "failed",
                        "error_message": "Failed to send email via SMTP",
                        "updated_at": datetime.now().isoformat()
                    }).eq("id", email_record["id"]).execute()

                    logger.error(f"Failed to send email to {email_record['to_email']}")

            except Exception as e:
                logger.error(f"Error processing email {email_record['id']}: {str(e)}")

                # Mark as failed
                try:
                    supabase.table("email_queue").update({
                        "status": "failed",
                        "error_message": str(e),
                        "updated_at": datetime.now().isoformat()
                    }).eq("id", email_record["id"]).execute()
                except Exception as update_error:
                    logger.error(f"Failed to update email status: {str(update_error)}")

        logger.info(f"Processed {emails_processed} out of {len(result.data)} emails")
        return emails_processed

    except Exception as e:
        logger.error(f"Error in email queue processor: {str(e)}")
        return 0


async def queue_booking_confirmation_email(
    supabase: Client,
    to_email: str,
    booking_data: dict
) -> bool:
    """Queue a booking confirmation email"""
    try:
        supabase.table("email_queue").insert({
            "to_email": to_email,
            "subject": f"Booking Confirmation - {booking_data.get('booking_number', 'N/A')}",
            "email_type": "booking_confirmation",
            "data": booking_data,
            "status": "pending"
        }).execute()
        logger.info(f"Queued booking confirmation email to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Error queuing booking confirmation email: {str(e)}")
        return False


async def queue_payment_receipt_email(
    supabase: Client,
    to_email: str,
    payment_data: dict
) -> bool:
    """Queue a payment receipt email"""
    try:
        supabase.table("email_queue").insert({
            "to_email": to_email,
            "subject": f"Payment Receipt - {payment_data.get('payment_id', 'N/A')}",
            "email_type": "payment_receipt",
            "data": payment_data,
            "status": "pending"
        }).execute()
        logger.info(f"Queued payment receipt email to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Error queuing payment receipt email: {str(e)}")
        return False


async def queue_order_confirmation_email(
    supabase: Client,
    to_email: str,
    order_data: dict
) -> bool:
    """Queue an order confirmation email"""
    try:
        supabase.table("email_queue").insert({
            "to_email": to_email,
            "subject": f"Order Confirmation - #{order_data.get('order_number', 'N/A')}",
            "email_type": "order_confirmation",
            "data": order_data,
            "status": "pending"
        }).execute()
        logger.info(f"Queued order confirmation email to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Error queuing order confirmation email: {str(e)}")
        return False
