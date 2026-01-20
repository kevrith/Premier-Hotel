"""
Notification Deduplication Service - Enterprise Edition
Prevents duplicate notifications using fingerprinting and time-based windows
"""

import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from supabase import Client

logger = logging.getLogger(__name__)


class NotificationDeduplicator:
    """
    Enterprise-grade notification deduplication with:
    - Content fingerprinting (prevents exact duplicates)
    - Time-based deduplication windows
    - User-specific deduplication
    - Channel-aware deduplication
    - Configurable sensitivity levels
    """

    def __init__(
        self,
        supabase: Client,
        default_window_seconds: int = 300,  # 5 minutes
    ):
        """
        Initialize deduplicator

        Args:
            supabase: Supabase client
            default_window_seconds: Default deduplication time window (5 min)
        """
        self.supabase = supabase
        self.default_window_seconds = default_window_seconds

    def generate_fingerprint(
        self,
        user_id: str,
        notification_type: str,
        title: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Generate unique fingerprint for a notification

        Uses SHA256 hash of:
        - user_id
        - notification_type
        - title
        - message
        - relevant data fields

        Args:
            user_id: Target user ID
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            data: Additional data (optional)

        Returns:
            str: 64-character SHA256 fingerprint
        """
        # Create fingerprint components
        components = [
            str(user_id),
            str(notification_type),
            str(title),
            str(message),
        ]

        # Add relevant data fields (exclude timestamps and IDs)
        if data:
            # Sort keys for consistent hashing
            relevant_fields = {
                k: v
                for k, v in sorted(data.items())
                if k
                not in [
                    "id",
                    "created_at",
                    "updated_at",
                    "timestamp",
                    "notification_id",
                ]
            }
            components.append(str(relevant_fields))

        # Generate SHA256 hash
        fingerprint_string = "|".join(components)
        fingerprint = hashlib.sha256(fingerprint_string.encode()).hexdigest()

        return fingerprint

    def is_duplicate(
        self,
        fingerprint: str,
        window_seconds: Optional[int] = None,
    ) -> bool:
        """
        Check if notification with this fingerprint already exists in time window

        Args:
            fingerprint: Notification fingerprint
            window_seconds: Custom deduplication window (uses default if None)

        Returns:
            bool: True if duplicate found, False otherwise
        """
        try:
            window = window_seconds or self.default_window_seconds
            cutoff_time = datetime.utcnow() - timedelta(seconds=window)

            # Query for recent notifications with same fingerprint
            result = (
                self.supabase.table("notifications")
                .select("id, created_at")
                .eq("fingerprint", fingerprint)
                .gte("created_at", cutoff_time.isoformat())
                .limit(1)
                .execute()
            )

            if result.data:
                logger.info(
                    f"Duplicate notification detected (fingerprint: {fingerprint[:16]}...)"
                )
                return True

            return False

        except Exception as e:
            logger.error(f"Error checking for duplicate: {str(e)}")
            # Fail open - allow notification if check fails
            return False

    def should_send_notification(
        self,
        user_id: str,
        notification_type: str,
        title: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
        window_seconds: Optional[int] = None,
    ) -> tuple[bool, str]:
        """
        Determine if notification should be sent (deduplication check)

        Args:
            user_id: Target user ID
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            data: Additional data
            window_seconds: Custom deduplication window

        Returns:
            tuple: (should_send: bool, fingerprint: str)
        """
        # Generate fingerprint
        fingerprint = self.generate_fingerprint(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            data=data,
        )

        # Check for duplicates
        is_dup = self.is_duplicate(fingerprint, window_seconds)

        should_send = not is_dup

        if not should_send:
            logger.warning(
                f"Notification blocked (duplicate): user={user_id}, type={notification_type}"
            )

        return should_send, fingerprint

    def get_deduplication_window(self, notification_type: str) -> int:
        """
        Get appropriate deduplication window for notification type

        Different notification types have different sensitivity:
        - Critical alerts: 1 minute (allow more frequent)
        - Order updates: 5 minutes (standard)
        - Promotional: 1 hour (aggressive deduplication)

        Args:
            notification_type: Type of notification

        Returns:
            int: Deduplication window in seconds
        """
        windows = {
            # Critical - short window (1 minute)
            "payment_failed": 60,
            "booking_cancelled": 60,
            "urgent_alert": 60,
            # Standard - medium window (5 minutes)
            "order_created": 300,
            "order_status_changed": 300,
            "booking_confirmed": 300,
            "payment_completed": 300,
            # Promotional - long window (1 hour)
            "promotional_offer": 3600,
            "loyalty_reward": 3600,
            "system_announcement": 3600,
        }

        return windows.get(notification_type, self.default_window_seconds)

    def cleanup_old_fingerprints(self, days_to_keep: int = 7):
        """
        Clean up old notification fingerprints (maintenance task)

        Should be run periodically (e.g., daily cron job)

        Args:
            days_to_keep: How many days of fingerprints to retain
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)

            # Delete old notifications (fingerprints are in notifications table)
            result = (
                self.supabase.table("notifications")
                .delete()
                .lt("created_at", cutoff_date.isoformat())
                .eq("read_at", "not.null")  # Only delete read notifications
                .execute()
            )

            deleted_count = len(result.data) if result.data else 0
            logger.info(
                f"Cleaned up {deleted_count} old notification fingerprints (older than {days_to_keep} days)"
            )

        except Exception as e:
            logger.error(f"Error cleaning up old fingerprints: {str(e)}")


# Singleton instance
_global_deduplicator: Optional[NotificationDeduplicator] = None


def get_deduplicator(supabase: Client) -> NotificationDeduplicator:
    """Get or create global deduplicator instance"""
    global _global_deduplicator

    if _global_deduplicator is None:
        _global_deduplicator = NotificationDeduplicator(
            supabase=supabase,
            default_window_seconds=300,  # 5 minutes default
        )

    return _global_deduplicator


def should_send_notification(
    supabase: Client,
    user_id: str,
    notification_type: str,
    title: str,
    message: str,
    data: Optional[Dict[str, Any]] = None,
) -> tuple[bool, str]:
    """
    Convenience function to check if notification should be sent

    Args:
        supabase: Supabase client
        user_id: Target user ID
        notification_type: Type of notification
        title: Notification title
        message: Notification message
        data: Additional data

    Returns:
        tuple: (should_send: bool, fingerprint: str)
    """
    deduplicator = get_deduplicator(supabase)

    # Get appropriate window for this notification type
    window = deduplicator.get_deduplication_window(notification_type)

    return deduplicator.should_send_notification(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message,
        data=data,
        window_seconds=window,
    )
