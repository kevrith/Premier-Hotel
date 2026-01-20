"""
Email Queue Processor - Enterprise Edition
Automatic background processing with retry logic, delivery tracking, and error handling
"""

import logging
import asyncio
from datetime import datetime, timedelta
from typing import Optional
from supabase import Client
from app.services.email_service import (
    send_booking_confirmation_email,
    send_payment_receipt_email,
    send_order_confirmation_email,
    send_notification_email,
    email_service
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


# ==================== ENTERPRISE FEATURES ====================


class EmailQueueProcessor:
    """
    Enterprise-grade automatic email queue processor with:
    - Background processing loop
    - Retry logic with exponential backoff
    - Delivery tracking
    - Error handling and logging
    - Rate limiting
    """

    def __init__(
        self,
        supabase: Client,
        batch_size: int = 10,
        process_interval: int = 30,  # seconds
        max_retries: int = 3,
        retry_delay_base: int = 300,  # 5 minutes base delay
    ):
        self.supabase = supabase
        self.batch_size = batch_size
        self.process_interval = process_interval
        self.max_retries = max_retries
        self.retry_delay_base = retry_delay_base
        self.running = False
        self._task = None

    async def start(self):
        """Start the automatic background processor"""
        if self.running:
            logger.warning("Email queue processor already running")
            return

        self.running = True
        self._task = asyncio.create_task(self._process_loop())
        logger.info("✅ Email queue processor started (running every %ds)", self.process_interval)

    async def stop(self):
        """Stop the background processor"""
        self.running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Email queue processor stopped")

    async def _process_loop(self):
        """Main processing loop"""
        while self.running:
            try:
                await self._process_batch()
                await asyncio.sleep(self.process_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in email processing loop: {str(e)}")
                await asyncio.sleep(self.process_interval)

    async def _process_batch(self):
        """Process a batch of emails with retry logic"""
        try:
            # Get emails that need processing
            current_time = datetime.utcnow().isoformat()

            result = (
                self.supabase.table("email_queue")
                .select("*")
                .in_("status", ["pending", "failed"])
                .or_(f"scheduled_for.is.null,scheduled_for.lte.{current_time}")
                .limit(self.batch_size)
                .execute()
            )

            emails = result.data
            if not emails:
                logger.debug("No pending emails in queue")
                return

            logger.info(f"📧 Processing {len(emails)} emails from queue")

            for email_record in emails:
                try:
                    await self._process_single_email(email_record)
                except Exception as e:
                    logger.error(f"Error processing email {email_record.get('id')}: {str(e)}")

        except Exception as e:
            logger.error(f"Error fetching email batch: {str(e)}")

    async def _process_single_email(self, email_record: dict):
        """Process a single email with retry and delivery tracking"""
        email_id = email_record.get("id")
        to_email = email_record.get("to_email")
        subject = email_record.get("subject")
        email_type = email_record.get("email_type", "generic")
        data = email_record.get("data", {})
        retry_count = email_record.get("retry_count", 0)

        # Check if max retries exceeded
        if retry_count >= self.max_retries:
            logger.warning(f"Email {email_id} exceeded max retries ({self.max_retries})")
            self.supabase.table("email_queue").update({
                "status": "failed",
                "error_message": "Max retries exceeded",
                "failed_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", email_id).execute()
            return

        # Mark as sending
        self.supabase.table("email_queue").update({
            "status": "sending",
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", email_id).execute()

        # Send email based on type
        success = False
        try:
            if email_type == "booking_confirmation":
                success = send_booking_confirmation_email(to_email, data)
            elif email_type == "payment_receipt":
                success = send_payment_receipt_email(to_email, data)
            elif email_type == "order_confirmation":
                success = send_order_confirmation_email(to_email, data)
            else:
                success = send_notification_email(to_email, data)

        except Exception as send_error:
            logger.error(f"Exception sending email {email_id}: {str(send_error)}")
            success = False

        # Update based on result
        if success:
            # Successfully sent
            self.supabase.table("email_queue").update({
                "status": "sent",
                "sent_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", email_id).execute()

            # Log successful delivery
            await self._log_delivery(
                email_record,
                "delivered",
                {"success": True, "timestamp": datetime.utcnow().isoformat()}
            )

            logger.info(f"✅ Email {email_id} sent successfully to {to_email}")

        else:
            # Failed - schedule retry
            new_retry_count = retry_count + 1

            if new_retry_count >= self.max_retries:
                # Permanent failure
                self.supabase.table("email_queue").update({
                    "status": "failed",
                    "retry_count": new_retry_count,
                    "failed_at": datetime.utcnow().isoformat(),
                    "error_message": "SMTP send failed - max retries exceeded",
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", email_id).execute()

                await self._log_delivery(
                    email_record,
                    "failed",
                    {"error": "Max retries exceeded", "retry_count": new_retry_count}
                )

                logger.error(f"❌ Email {email_id} permanently failed after {new_retry_count} attempts")

            else:
                # Schedule retry with exponential backoff
                delay_seconds = self.retry_delay_base * (2 ** (new_retry_count - 1))
                next_retry = datetime.utcnow() + timedelta(seconds=delay_seconds)

                self.supabase.table("email_queue").update({
                    "status": "failed",
                    "retry_count": new_retry_count,
                    "scheduled_for": next_retry.isoformat(),
                    "error_message": "SMTP send failed",
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", email_id).execute()

                await self._log_delivery(
                    email_record,
                    "failed",
                    {
                        "error": "SMTP send failed",
                        "retry_count": new_retry_count,
                        "next_retry": next_retry.isoformat()
                    }
                )

                logger.warning(
                    f"⚠️  Email {email_id} failed, retry {new_retry_count}/{self.max_retries} at {next_retry.strftime('%H:%M:%S')}"
                )

    async def _log_delivery(self, email_record: dict, status: str, response_data: dict):
        """Log delivery attempt to notification_delivery_log"""
        try:
            log_entry = {
                "notification_id": email_record.get("notification_id"),
                "channel": "email",
                "recipient": email_record.get("to_email"),
                "status": status,
                "provider_response": response_data,
                "sent_at": datetime.utcnow().isoformat()
            }

            self.supabase.table("notification_delivery_log").insert(log_entry).execute()

        except Exception as e:
            logger.error(f"Error logging delivery: {str(e)}")


# Global processor instance (initialized in main.py)
_global_processor: Optional[EmailQueueProcessor] = None


async def start_email_queue_processor(supabase: Client):
    """Start the global email queue processor"""
    global _global_processor

    if _global_processor and _global_processor.running:
        logger.warning("Email queue processor already running")
        return

    _global_processor = EmailQueueProcessor(
        supabase=supabase,
        batch_size=10,
        process_interval=30,  # Process every 30 seconds
        max_retries=3,
        retry_delay_base=300  # 5 minutes base, exponential backoff
    )

    await _global_processor.start()


async def stop_email_queue_processor():
    """Stop the global email queue processor"""
    global _global_processor

    if _global_processor:
        await _global_processor.stop()
        _global_processor = None
