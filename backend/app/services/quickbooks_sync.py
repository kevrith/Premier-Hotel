"""
QuickBooks Sync Orchestration Service

Coordinates all synchronization operations between Premier Hotel and QuickBooks POS 2013.
Handles real-time sync triggers, error management, and audit logging.

Features:
- Real-time order/booking sync to QuickBooks
- Bi-directional inventory synchronization
- Comprehensive error handling and retry coordination
- Transaction audit trail logging
- Status tracking and reporting

Author: Premier Hotel Management System
Date: December 18, 2025
"""

import asyncio
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from uuid import UUID

import asyncpg
from asyncpg import Connection, Pool

from ..models.quickbooks import (
    QuickBooksSyncLog,
    QuickBooksSyncLogCreate,
    SyncType,
    SyncDirection,
    SyncStatus,
    ReferenceType,
    QBXMLSalesReceipt,
    QBXMLLineItem,
    QBXMLInventoryQuery,
    QBXMLInventoryAdjustment,
    map_payment_method_to_qb,
)
from .quickbooks_adapter import QuickBooksAdapter


class QuickBooksSyncService:
    """
    Orchestrates synchronization between Premier Hotel and QuickBooks POS.

    This service acts as the central coordinator for all QB sync operations,
    managing the flow of data, error handling, and status tracking.
    """

    def __init__(self, db_pool: Pool):
        """
        Initialize the QuickBooks Sync Service.

        Args:
            db_pool: asyncpg connection pool for database operations
        """
        self.db_pool = db_pool
        self.adapter = QuickBooksAdapter()

    async def sync_completed_order(self, order_id: str) -> QuickBooksSyncLog:
        """
        Sync a completed food/beverage order to QuickBooks as a sales receipt.

        This method is triggered when an order status changes to 'completed'.
        It fetches order details, converts to QBXML format, and queues for sync.

        Args:
            order_id: UUID of the completed order

        Returns:
            QuickBooksSyncLog: Log entry for this sync transaction

        Raises:
            ValueError: If order not found or not completed
            Exception: If sync preparation fails

        Example:
            >>> sync_log = await sync_service.sync_completed_order("123e4567-e89b-12d3-a456-426614174000")
            >>> print(sync_log.status)  # 'pending'
        """
        async with self.db_pool.acquire() as conn:
            # Verify QuickBooks sync is enabled
            is_enabled = await self._is_sync_enabled(conn, sync_sales=True)
            if not is_enabled:
                raise ValueError("QuickBooks sales sync is not enabled")

            # Fetch order details
            order = await self._fetch_order_details(conn, order_id)
            if not order:
                raise ValueError(f"Order {order_id} not found")

            if order['status'] != 'completed':
                raise ValueError(f"Order {order_id} is not completed (status: {order['status']})")

            # Fetch order items
            order_items = await self._fetch_order_items(conn, order_id)
            if not order_items:
                raise ValueError(f"Order {order_id} has no items")

            # Get customer mapping (if exists)
            customer_qb_id = None
            if order.get('user_id'):
                customer_qb_id = await self._get_customer_qb_id(conn, order['user_id'])

            # Build QBXML sales receipt
            try:
                sales_receipt = await self._build_sales_receipt_from_order(
                    order, order_items, customer_qb_id
                )
                qbxml_request = self.adapter.create_sales_receipt_request(sales_receipt)

            except Exception as e:
                # Log failed sync preparation
                return await self._log_sync_transaction(
                    conn=conn,
                    sync_type=SyncType.SALE,
                    sync_direction=SyncDirection.TO_QB,
                    reference_type=ReferenceType.ORDER,
                    reference_id=order_id,
                    qbxml_request=None,
                    status=SyncStatus.FAILED,
                    error_message=f"Failed to prepare QBXML: {str(e)}"
                )

            # Log sync transaction as pending
            sync_log = await self._log_sync_transaction(
                conn=conn,
                sync_type=SyncType.SALE,
                sync_direction=SyncDirection.TO_QB,
                reference_type=ReferenceType.ORDER,
                reference_id=order_id,
                qbxml_request=qbxml_request,
                status=SyncStatus.PENDING
            )

            return sync_log

    async def sync_completed_booking(self, booking_id: str) -> QuickBooksSyncLog:
        """
        Sync a checked-out booking to QuickBooks as a sales receipt.

        This method is triggered when a booking status changes to 'checked_out'.
        It fetches booking details, room charges, and any associated services.

        Args:
            booking_id: UUID of the checked-out booking

        Returns:
            QuickBooksSyncLog: Log entry for this sync transaction

        Raises:
            ValueError: If booking not found or not checked out
            Exception: If sync preparation fails

        Example:
            >>> sync_log = await sync_service.sync_completed_booking("456e7890-e89b-12d3-a456-426614174000")
            >>> print(sync_log.qb_txn_id)  # QB transaction ID (if synced)
        """
        async with self.db_pool.acquire() as conn:
            # Verify QuickBooks sync is enabled
            is_enabled = await self._is_sync_enabled(conn, sync_sales=True)
            if not is_enabled:
                raise ValueError("QuickBooks sales sync is not enabled")

            # Fetch booking details
            booking = await self._fetch_booking_details(conn, booking_id)
            if not booking:
                raise ValueError(f"Booking {booking_id} not found")

            if booking['status'] != 'checked_out':
                raise ValueError(f"Booking {booking_id} is not checked out (status: {booking['status']})")

            # Get customer mapping
            customer_qb_id = await self._get_customer_qb_id(conn, booking['user_id'])

            # Build QBXML sales receipt
            try:
                sales_receipt = await self._build_sales_receipt_from_booking(
                    booking, customer_qb_id
                )
                qbxml_request = self.adapter.create_sales_receipt_request(sales_receipt)

            except Exception as e:
                # Log failed sync preparation
                return await self._log_sync_transaction(
                    conn=conn,
                    sync_type=SyncType.SALE,
                    sync_direction=SyncDirection.TO_QB,
                    reference_type=ReferenceType.BOOKING,
                    reference_id=booking_id,
                    qbxml_request=None,
                    status=SyncStatus.FAILED,
                    error_message=f"Failed to prepare QBXML: {str(e)}"
                )

            # Log sync transaction as pending
            sync_log = await self._log_sync_transaction(
                conn=conn,
                sync_type=SyncType.SALE,
                sync_direction=SyncDirection.TO_QB,
                reference_type=ReferenceType.BOOKING,
                reference_id=booking_id,
                qbxml_request=qbxml_request,
                status=SyncStatus.PENDING
            )

            return sync_log

    async def sync_inventory_from_qb(self) -> List[QuickBooksSyncLog]:
        """
        Pull inventory levels from QuickBooks and update Premier Hotel database.

        This method queries QuickBooks for current inventory levels of all
        mapped items and updates the local database accordingly.

        Returns:
            List[QuickBooksSyncLog]: Log entries for each item synced

        Raises:
            ValueError: If QB inventory sync is not enabled
            Exception: If sync fails

        Example:
            >>> sync_logs = await sync_service.sync_inventory_from_qb()
            >>> print(f"Synced {len(sync_logs)} items")
        """
        async with self.db_pool.acquire() as conn:
            # Verify QuickBooks inventory sync is enabled
            is_enabled = await self._is_sync_enabled(conn, sync_inventory=True)
            if not is_enabled:
                raise ValueError("QuickBooks inventory sync is not enabled")

            # Fetch all item mappings
            item_mappings = await self._fetch_item_mappings(conn)
            if not item_mappings:
                return []

            sync_logs = []

            for mapping in item_mappings:
                if not mapping['sync_inventory']:
                    continue

                try:
                    # Create inventory query request
                    inventory_query = QBXMLInventoryQuery(
                        list_id=mapping['qb_item_list_id'],
                        full_name=mapping['qb_item_full_name']
                    )
                    qbxml_request = self.adapter.create_inventory_query_request(inventory_query)

                    # Log as pending (will be processed by Web Connector)
                    sync_log = await self._log_sync_transaction(
                        conn=conn,
                        sync_type=SyncType.INVENTORY_PULL,
                        sync_direction=SyncDirection.FROM_QB,
                        reference_type=ReferenceType.INVENTORY_ITEM,
                        reference_id=mapping['hotel_item_id'],
                        qbxml_request=qbxml_request,
                        status=SyncStatus.PENDING
                    )
                    sync_logs.append(sync_log)

                except Exception as e:
                    # Log failed sync
                    sync_log = await self._log_sync_transaction(
                        conn=conn,
                        sync_type=SyncType.INVENTORY_PULL,
                        sync_direction=SyncDirection.FROM_QB,
                        reference_type=ReferenceType.INVENTORY_ITEM,
                        reference_id=mapping['hotel_item_id'],
                        qbxml_request=None,
                        status=SyncStatus.FAILED,
                        error_message=f"Failed to prepare inventory query: {str(e)}"
                    )
                    sync_logs.append(sync_log)

            # Update last inventory sync timestamp
            await self._update_last_inventory_sync(conn)

            return sync_logs

    async def process_qb_response(
        self,
        log_id: str,
        qbxml_response: str,
        success: bool = True
    ) -> QuickBooksSyncLog:
        """
        Process a response from QuickBooks Web Connector.

        Updates the sync log with the response data and extracts relevant
        information (transaction IDs, inventory levels, etc.).

        Args:
            log_id: UUID of the sync log entry
            qbxml_response: QBXML response from QuickBooks
            success: Whether the sync was successful

        Returns:
            QuickBooksSyncLog: Updated log entry

        Example:
            >>> updated_log = await sync_service.process_qb_response(
            ...     log_id="789...",
            ...     qbxml_response="<QBXML>...</QBXML>",
            ...     success=True
            ... )
        """
        async with self.db_pool.acquire() as conn:
            # Fetch sync log
            sync_log = await self._fetch_sync_log(conn, log_id)
            if not sync_log:
                raise ValueError(f"Sync log {log_id} not found")

            # Parse response based on sync type
            error_message = None
            qb_txn_id = None

            try:
                if sync_log['sync_type'] == SyncType.SALE.value:
                    response_data = self.adapter.parse_sales_receipt_response(qbxml_response)
                    if response_data.get('success'):
                        qb_txn_id = response_data.get('txn_id')
                    else:
                        error_message = response_data.get('error_message')
                        success = False

                elif sync_log['sync_type'] == SyncType.INVENTORY_PULL.value:
                    response_data = self.adapter.parse_inventory_query_response(qbxml_response)
                    if response_data.get('success'):
                        # Update local inventory
                        await self._update_local_inventory(
                            conn,
                            sync_log['reference_id'],
                            response_data.get('quantity_on_hand', 0)
                        )
                    else:
                        error_message = response_data.get('error_message')
                        success = False

            except Exception as e:
                error_message = f"Failed to parse QB response: {str(e)}"
                success = False

            # Update sync log
            status = SyncStatus.COMPLETED if success else SyncStatus.FAILED

            await conn.execute(
                """
                UPDATE quickbooks_sync_log
                SET qbxml_response = $1,
                    status = $2,
                    qb_txn_id = $3,
                    error_message = $4,
                    synced_at = $5,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $6
                """,
                qbxml_response,
                status.value,
                qb_txn_id,
                error_message,
                datetime.utcnow(),
                UUID(log_id)
            )

            # Fetch updated log
            return await self._fetch_sync_log(conn, log_id)

    async def retry_failed_sync(self, log_id: str) -> QuickBooksSyncLog:
        """
        Retry a failed sync transaction.

        Resets the sync status to pending and increments retry count.

        Args:
            log_id: UUID of the failed sync log entry

        Returns:
            QuickBooksSyncLog: Updated log entry

        Raises:
            ValueError: If log not found or not failed

        Example:
            >>> retried_log = await sync_service.retry_failed_sync("789...")
        """
        async with self.db_pool.acquire() as conn:
            sync_log = await self._fetch_sync_log(conn, log_id)
            if not sync_log:
                raise ValueError(f"Sync log {log_id} not found")

            if sync_log['status'] != SyncStatus.FAILED.value:
                raise ValueError(f"Sync log {log_id} is not failed (status: {sync_log['status']})")

            # Check retry limit
            max_retries = 5
            if sync_log['retry_count'] >= max_retries:
                raise ValueError(f"Sync log {log_id} has exceeded maximum retries ({max_retries})")

            # Reset to pending and increment retry count
            await conn.execute(
                """
                UPDATE quickbooks_sync_log
                SET status = $1,
                    retry_count = retry_count + 1,
                    error_message = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                """,
                SyncStatus.PENDING.value,
                UUID(log_id)
            )

            return await self._fetch_sync_log(conn, log_id)

    async def get_pending_requests(self, limit: int = 100) -> List[QuickBooksSyncLog]:
        """
        Fetch pending sync requests for QuickBooks Web Connector.

        Returns QBXML requests that are waiting to be sent to QuickBooks.

        Args:
            limit: Maximum number of requests to return

        Returns:
            List[QuickBooksSyncLog]: Pending sync log entries

        Example:
            >>> pending = await sync_service.get_pending_requests(limit=50)
            >>> for log in pending:
            ...     print(log.qbxml_request)
        """
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT * FROM quickbooks_sync_log
                WHERE status = $1
                ORDER BY created_at ASC
                LIMIT $2
                """,
                SyncStatus.PENDING.value,
                limit
            )

            return [dict(row) for row in rows]

    async def get_sync_statistics(self) -> Dict[str, Any]:
        """
        Get sync statistics for dashboard display.

        Returns:
            Dict with sync counts and status information

        Example:
            >>> stats = await sync_service.get_sync_statistics()
            >>> print(stats['total_synced'])
        """
        async with self.db_pool.acquire() as conn:
            stats = await conn.fetchrow(
                """
                SELECT
                    COUNT(*) FILTER (WHERE status = 'completed') as total_synced,
                    COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
                    COUNT(*) FILTER (WHERE status = 'pending') as total_pending,
                    MAX(synced_at) FILTER (WHERE status = 'completed') as last_successful_sync
                FROM quickbooks_sync_log
                """
            )

            return dict(stats) if stats else {}

    # ==================== Private Helper Methods ====================

    async def _is_sync_enabled(
        self,
        conn: Connection,
        sync_sales: bool = False,
        sync_inventory: bool = False
    ) -> bool:
        """Check if QuickBooks sync is enabled."""
        config = await conn.fetchrow(
            """
            SELECT sync_enabled, sync_sales, sync_inventory
            FROM quickbooks_config
            ORDER BY created_at DESC
            LIMIT 1
            """
        )

        if not config or not config['sync_enabled']:
            return False

        if sync_sales and not config['sync_sales']:
            return False

        if sync_inventory and not config['sync_inventory']:
            return False

        return True

    async def _fetch_order_details(self, conn: Connection, order_id: str) -> Optional[Dict]:
        """Fetch order details from database."""
        return await conn.fetchrow(
            """
            SELECT o.*, p.payment_method, p.amount as payment_amount
            FROM orders o
            LEFT JOIN payments p ON p.order_id = o.id
            WHERE o.id = $1
            """,
            UUID(order_id)
        )

    async def _fetch_order_items(self, conn: Connection, order_id: str) -> List[Dict]:
        """Fetch order items with menu item details."""
        rows = await conn.fetch(
            """
            SELECT oi.*, mi.name, mi.price, qm.qb_item_list_id, qm.qb_item_full_name
            FROM order_items oi
            JOIN menu_items mi ON mi.id = oi.menu_item_id
            LEFT JOIN quickbooks_item_mapping qm ON qm.hotel_item_id = mi.id AND qm.hotel_item_type = 'menu_item'
            WHERE oi.order_id = $1
            """,
            UUID(order_id)
        )
        return [dict(row) for row in rows]

    async def _fetch_booking_details(self, conn: Connection, booking_id: str) -> Optional[Dict]:
        """Fetch booking details from database."""
        return await conn.fetchrow(
            """
            SELECT b.*, r.number as room_number, r.type as room_type,
                   r.price_per_night, p.payment_method, p.amount as payment_amount
            FROM bookings b
            JOIN rooms r ON r.id = b.room_id
            LEFT JOIN payments p ON p.booking_id = b.id
            WHERE b.id = $1
            """,
            UUID(booking_id)
        )

    async def _get_customer_qb_id(self, conn: Connection, user_id: str) -> Optional[str]:
        """Get QuickBooks customer ListID for a user."""
        result = await conn.fetchrow(
            """
            SELECT qb_customer_list_id
            FROM quickbooks_customer_mapping
            WHERE user_id = $1
            """,
            UUID(user_id)
        )
        return result['qb_customer_list_id'] if result else None

    async def _fetch_item_mappings(self, conn: Connection) -> List[Dict]:
        """Fetch all QuickBooks item mappings."""
        rows = await conn.fetch(
            """
            SELECT * FROM quickbooks_item_mapping
            WHERE sync_inventory = true
            """
        )
        return [dict(row) for row in rows]

    async def _fetch_sync_log(self, conn: Connection, log_id: str) -> Optional[Dict]:
        """Fetch sync log entry by ID."""
        return await conn.fetchrow(
            """
            SELECT * FROM quickbooks_sync_log WHERE id = $1
            """,
            UUID(log_id)
        )

    async def _update_last_inventory_sync(self, conn: Connection) -> None:
        """Update last inventory sync timestamp."""
        await conn.execute(
            """
            UPDATE quickbooks_config
            SET last_inventory_sync = $1
            WHERE id = (SELECT id FROM quickbooks_config ORDER BY created_at DESC LIMIT 1)
            """,
            datetime.utcnow()
        )

    async def _update_local_inventory(
        self,
        conn: Connection,
        item_id: str,
        quantity: float
    ) -> None:
        """Update local inventory quantity from QuickBooks."""
        await conn.execute(
            """
            UPDATE inventory_items
            SET quantity = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            """,
            quantity,
            UUID(item_id)
        )

    async def _build_sales_receipt_from_order(
        self,
        order: Dict,
        order_items: List[Dict],
        customer_qb_id: Optional[str]
    ) -> QBXMLSalesReceipt:
        """Build QBXML sales receipt from order data."""
        line_items = []

        for item in order_items:
            if not item.get('qb_item_list_id'):
                raise ValueError(f"Menu item {item['name']} is not mapped to QuickBooks")

            line_item = QBXMLLineItem(
                item_ref_list_id=item['qb_item_list_id'],
                item_ref_full_name=item['qb_item_full_name'],
                quantity=float(item['quantity']),
                rate=float(item['price']),
                amount=float(item['quantity']) * float(item['price'])
            )
            line_items.append(line_item)

        total_amount = float(order.get('total_amount', 0))
        payment_method = map_payment_method_to_qb(order.get('payment_method', 'Cash'))

        return QBXMLSalesReceipt(
            txn_date=datetime.utcnow().strftime("%Y-%m-%d"),
            ref_number=f"ORDER-{order['id']}",
            customer_ref_list_id=customer_qb_id,
            sales_receipt_line_items=line_items,
            payment_method_ref_name=payment_method,
            subtotal=total_amount,
            total_amount=total_amount
        )

    async def _build_sales_receipt_from_booking(
        self,
        booking: Dict,
        customer_qb_id: Optional[str]
    ) -> QBXMLSalesReceipt:
        """Build QBXML sales receipt from booking data."""
        # Calculate room charges
        check_in = booking['check_in_date']
        check_out = booking['check_out_date']
        nights = (check_out - check_in).days
        rate_per_night = float(booking['price_per_night'])
        total_room_charge = nights * rate_per_night

        # Create line item for room charges
        line_items = [
            QBXMLLineItem(
                item_ref_list_id="ROOM",  # Generic room item
                item_ref_full_name=f"Room {booking['room_number']} - {booking['room_type']}",
                quantity=float(nights),
                rate=rate_per_night,
                amount=total_room_charge
            )
        ]

        total_amount = float(booking.get('total_amount', total_room_charge))
        payment_method = map_payment_method_to_qb(booking.get('payment_method', 'Cash'))

        return QBXMLSalesReceipt(
            txn_date=datetime.utcnow().strftime("%Y-%m-%d"),
            ref_number=f"BOOKING-{booking['id']}",
            customer_ref_list_id=customer_qb_id,
            sales_receipt_line_items=line_items,
            payment_method_ref_name=payment_method,
            subtotal=total_amount,
            total_amount=total_amount
        )

    async def _log_sync_transaction(
        self,
        conn: Connection,
        sync_type: SyncType,
        sync_direction: SyncDirection,
        reference_type: ReferenceType,
        reference_id: str,
        qbxml_request: Optional[str],
        status: SyncStatus = SyncStatus.PENDING,
        error_message: Optional[str] = None
    ) -> QuickBooksSyncLog:
        """Log a sync transaction to the database."""
        log_id = uuid.uuid4()

        await conn.execute(
            """
            INSERT INTO quickbooks_sync_log (
                id, sync_type, sync_direction, reference_type, reference_id,
                qbxml_request, status, error_message, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """,
            log_id,
            sync_type.value,
            sync_direction.value,
            reference_type.value,
            UUID(reference_id),
            qbxml_request,
            status.value,
            error_message,
            datetime.utcnow()
        )

        return await self._fetch_sync_log(conn, str(log_id))
