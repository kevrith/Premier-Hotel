"""
WebSocket Event Handlers and Event Types
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from .manager import connection_manager


class WebSocketEvents:
    """Event types and handlers for WebSocket communications"""

    # Event types
    ORDER_CREATED = "order.created"
    ORDER_STATUS_CHANGED = "order.status_changed"
    ORDER_ASSIGNED = "order.assigned"
    ORDER_READY = "order.ready"
    ORDER_DELIVERED = "order.delivered"

    INVENTORY_LOW = "inventory.low"
    INVENTORY_CRITICAL = "inventory.critical"

    TABLE_STATUS_CHANGED = "table.status_changed"
    TABLE_ASSIGNED = "table.assigned"

    ROOM_STATUS_CHANGED = "room.status_changed"
    CLEANING_TASK_ASSIGNED = "cleaning.task_assigned"
    CLEANING_TASK_COMPLETED = "cleaning.task_completed"

    BOOKING_CREATED = "booking.created"
    BOOKING_STATUS_CHANGED = "booking.status_changed"

    MESSAGE_RECEIVED = "message.received"

    NOTIFICATION = "notification"

    @staticmethod
    async def emit_order_created(order: Dict[str, Any]):
        """
        Emit event when a new order is created
        Notifies: All chefs, assigned waiter, customer
        """
        event_data = {
            'type': WebSocketEvents.ORDER_CREATED,
            'data': {
                'order_id': order['id'],
                'order_number': order['order_number'],
                'location': order['location'],
                'location_type': order['location_type'],
                'items': order['items'],
                'priority': order['priority'],
                'special_instructions': order.get('special_instructions'),
                'estimated_ready_time': order.get('estimated_ready_time'),
                'customer_id': order['customer_id'],
            },
            'timestamp': datetime.utcnow().isoformat(),
            'message': f"New order {order['order_number']} from {order['location']}"
        }

        # Notify all chefs
        await connection_manager.broadcast_to_role('chef', event_data)

        # Notify customer
        await connection_manager.send_personal_message(
            order['customer_id'],
            {
                **event_data,
                'message': f"Your order {order['order_number']} has been placed!"
            }
        )

    @staticmethod
    async def emit_order_status_changed(
        order_id: str,
        order_number: str,
        old_status: str,
        new_status: str,
        customer_id: str,
        location: str,
        assigned_waiter_id: Optional[str] = None,
        assigned_chef_id: Optional[str] = None
    ):
        """
        Emit event when order status changes
        Notifies: Customer, assigned staff, relevant role groups
        """
        event_data = {
            'type': WebSocketEvents.ORDER_STATUS_CHANGED,
            'data': {
                'order_id': order_id,
                'order_number': order_number,
                'old_status': old_status,
                'new_status': new_status,
                'location': location,
            },
            'timestamp': datetime.utcnow().isoformat()
        }

        # Customer-friendly messages
        status_messages = {
            'confirmed': f"Order {order_number} confirmed! Your food is being prepared.",
            'preparing': f"Chef is preparing your order {order_number}",
            'ready': f"Order {order_number} is ready!",
            'served': f"Order {order_number} has been served",
            'completed': f"Order {order_number} completed. Thank you!",
            'cancelled': f"Order {order_number} has been cancelled"
        }

        # Notify customer
        await connection_manager.send_personal_message(
            customer_id,
            {
                **event_data,
                'message': status_messages.get(new_status, f"Order {order_number} status: {new_status}")
            }
        )

        # Notify assigned waiter
        if assigned_waiter_id:
            await connection_manager.send_personal_message(
                assigned_waiter_id,
                {
                    **event_data,
                    'message': f"Order {order_number} status: {new_status}"
                }
            )

        # Notify assigned chef
        if assigned_chef_id:
            await connection_manager.send_personal_message(
                assigned_chef_id,
                {
                    **event_data,
                    'message': f"Order {order_number} status: {new_status}"
                }
            )

        # Special notifications based on status
        if new_status == 'ready':
            # Notify all waiters that order is ready for pickup
            await connection_manager.broadcast_to_role(
                'waiter',
                {
                    **event_data,
                    'type': WebSocketEvents.ORDER_READY,
                    'message': f"Order {order_number} ready for pickup at {location}"
                }
            )

        elif new_status == 'served':
            # Notify managers about delivered order
            await connection_manager.broadcast_to_role(
                'manager',
                {
                    **event_data,
                    'type': WebSocketEvents.ORDER_DELIVERED,
                    'message': f"Order {order_number} delivered to {location}"
                }
            )

    @staticmethod
    async def emit_inventory_low(item_name: str, current_quantity: float, unit: str, reorder_level: float):
        """
        Emit event when inventory is low
        Notifies: All chefs, managers, admin
        """
        severity = 'critical' if current_quantity < reorder_level * 0.5 else 'low'
        event_type = WebSocketEvents.INVENTORY_CRITICAL if severity == 'critical' else WebSocketEvents.INVENTORY_LOW

        event_data = {
            'type': event_type,
            'data': {
                'item_name': item_name,
                'current_quantity': current_quantity,
                'unit': unit,
                'reorder_level': reorder_level,
                'severity': severity
            },
            'timestamp': datetime.utcnow().isoformat(),
            'message': f"⚠️ {item_name} is running low: {current_quantity}{unit} (reorder at {reorder_level}{unit})"
        }

        # Notify chefs (they need to know what's running out)
        await connection_manager.broadcast_to_role('chef', event_data)

        # Notify managers and admin (they need to reorder)
        await connection_manager.broadcast_to_role('manager', event_data)
        await connection_manager.broadcast_to_role('admin', event_data)

    @staticmethod
    async def emit_room_status_changed(room_id: str, room_number: str, old_status: str, new_status: str):
        """
        Emit event when room status changes
        Notifies: All cleaners, managers, admin
        """
        event_data = {
            'type': WebSocketEvents.ROOM_STATUS_CHANGED,
            'data': {
                'room_id': room_id,
                'room_number': room_number,
                'old_status': old_status,
                'new_status': new_status,
            },
            'timestamp': datetime.utcnow().isoformat(),
            'message': f"Room {room_number} status changed: {old_status} → {new_status}"
        }

        # Notify cleaners
        await connection_manager.broadcast_to_role('cleaner', event_data)

        # Notify managers
        await connection_manager.broadcast_to_role('manager', event_data)

    @staticmethod
    async def emit_cleaning_task_assigned(task_id: str, room_number: str, cleaner_id: str, priority: str):
        """
        Emit event when cleaning task is assigned
        Notifies: Assigned cleaner
        """
        event_data = {
            'type': WebSocketEvents.CLEANING_TASK_ASSIGNED,
            'data': {
                'task_id': task_id,
                'room_number': room_number,
                'priority': priority,
            },
            'timestamp': datetime.utcnow().isoformat(),
            'message': f"New {priority} priority cleaning task: Room {room_number}"
        }

        # Notify assigned cleaner
        await connection_manager.send_personal_message(cleaner_id, event_data)

    @staticmethod
    async def emit_booking_created(booking: Dict[str, Any]):
        """
        Emit event when new booking is created
        Notifies: Managers, admin, customer
        """
        event_data = {
            'type': WebSocketEvents.BOOKING_CREATED,
            'data': {
                'booking_id': booking['id'],
                'booking_reference': booking['booking_reference'],
                'room_id': booking['room_id'],
                'check_in_date': booking['check_in_date'],
                'check_out_date': booking['check_out_date'],
                'guests': booking.get('guests', 1),
                'total_amount': booking['total_amount'],
            },
            'timestamp': datetime.utcnow().isoformat(),
            'message': f"New booking {booking['booking_reference']} created"
        }

        # Notify managers
        await connection_manager.broadcast_to_role('manager', event_data)
        await connection_manager.broadcast_to_role('admin', event_data)

        # Notify customer
        if booking.get('customer_id'):
            await connection_manager.send_personal_message(
                booking['customer_id'],
                {
                    **event_data,
                    'message': f"Booking confirmed! Reference: {booking['booking_reference']}"
                }
            )

    @staticmethod
    async def emit_notification(
        user_id: str,
        title: str,
        message: str,
        notification_type: str = 'info',
        data: Optional[Dict[str, Any]] = None
    ):
        """
        Send a generic notification to a specific user
        """
        event_data = {
            'type': WebSocketEvents.NOTIFICATION,
            'data': {
                'title': title,
                'message': message,
                'notification_type': notification_type,  # info, success, warning, error
                'extra_data': data or {}
            },
            'timestamp': datetime.utcnow().isoformat()
        }

        await connection_manager.send_personal_message(user_id, event_data)

    @staticmethod
    async def emit_message_received(sender_id: str, receiver_id: str, message_id: str, content: str):
        """
        Emit event when a new message is sent
        Notifies: Receiver
        """
        event_data = {
            'type': WebSocketEvents.MESSAGE_RECEIVED,
            'data': {
                'message_id': message_id,
                'sender_id': sender_id,
                'content': content,
            },
            'timestamp': datetime.utcnow().isoformat(),
            'message': 'New message received'
        }

        await connection_manager.send_personal_message(receiver_id, event_data)


# Export singleton
events = WebSocketEvents()
