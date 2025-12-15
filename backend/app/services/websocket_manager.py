"""
WebSocket Connection Manager
Manages WebSocket connections for real-time updates
"""

import logging
import json
from typing import Dict, List, Set
from fastapi import WebSocket
from datetime import datetime

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections"""

    def __init__(self):
        # Store active connections by user_id
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Store user info for each connection
        self.connection_users: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept a new WebSocket connection"""
        await websocket.accept()

        # Add connection to user's connection list
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []

        self.active_connections[user_id].append(websocket)
        self.connection_users[websocket] = user_id

        logger.info(f"WebSocket connected for user {user_id}. Total connections: {self.get_connection_count()}")

    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        if websocket in self.connection_users:
            user_id = self.connection_users[websocket]

            # Remove from user's connection list
            if user_id in self.active_connections:
                self.active_connections[user_id].remove(websocket)

                # Clean up empty lists
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]

            # Remove user mapping
            del self.connection_users[websocket]

            logger.info(f"WebSocket disconnected for user {user_id}. Total connections: {self.get_connection_count()}")

    async def send_personal_message(self, message: dict, user_id: str):
        """Send a message to a specific user (all their connections)"""
        if user_id in self.active_connections:
            disconnected = []

            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {str(e)}")
                    disconnected.append(connection)

            # Clean up disconnected connections
            for conn in disconnected:
                self.disconnect(conn)

    async def broadcast(self, message: dict, exclude_user: str = None):
        """Broadcast a message to all connected users (except excluded)"""
        disconnected = []

        for user_id, connections in self.active_connections.items():
            if exclude_user and user_id == exclude_user:
                continue

            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to user {user_id}: {str(e)}")
                    disconnected.append(connection)

        # Clean up disconnected connections
        for conn in disconnected:
            self.disconnect(conn)

    async def send_to_role(self, message: dict, role: str):
        """Send a message to all users with a specific role"""
        # Note: This requires role information to be passed during connection
        # For now, this is a placeholder for future implementation
        pass

    def get_connection_count(self) -> int:
        """Get total number of active connections"""
        return sum(len(connections) for connections in self.active_connections.values())

    def get_connected_users(self) -> Set[str]:
        """Get set of currently connected user IDs"""
        return set(self.active_connections.keys())

    def is_user_connected(self, user_id: str) -> bool:
        """Check if a user has any active connections"""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0


# Singleton instance
manager = ConnectionManager()


# Event types for real-time updates
class EventType:
    """WebSocket event types"""
    # Notifications
    NOTIFICATION = "notification"

    # Bookings
    BOOKING_CREATED = "booking_created"
    BOOKING_UPDATED = "booking_updated"
    BOOKING_CANCELLED = "booking_cancelled"

    # Payments
    PAYMENT_COMPLETED = "payment_completed"
    PAYMENT_FAILED = "payment_failed"

    # Orders
    ORDER_CREATED = "order_created"
    ORDER_STATUS_CHANGED = "order_status_changed"
    ORDER_READY = "order_ready"
    ORDER_DELIVERED = "order_delivered"

    # Rooms
    ROOM_AVAILABILITY_CHANGED = "room_availability_changed"

    # Messages
    NEW_MESSAGE = "new_message"
    MESSAGE_READ = "message_read"

    # System
    SYSTEM_ANNOUNCEMENT = "system_announcement"
    CONNECTION_ACK = "connection_ack"
    PING = "ping"
    PONG = "pong"


async def send_notification_event(user_id: str, notification_data: dict):
    """Send a notification event to a user"""
    await manager.send_personal_message({
        "type": EventType.NOTIFICATION,
        "data": notification_data,
        "timestamp": datetime.now().isoformat()
    }, user_id)


async def send_booking_event(user_id: str, event_type: str, booking_data: dict):
    """Send a booking-related event to a user"""
    await manager.send_personal_message({
        "type": event_type,
        "data": booking_data,
        "timestamp": datetime.now().isoformat()
    }, user_id)


async def send_payment_event(user_id: str, event_type: str, payment_data: dict):
    """Send a payment-related event to a user"""
    await manager.send_personal_message({
        "type": event_type,
        "data": payment_data,
        "timestamp": datetime.now().isoformat()
    }, user_id)


async def send_order_event(user_id: str, event_type: str, order_data: dict):
    """Send an order-related event to a user"""
    await manager.send_personal_message({
        "type": event_type,
        "data": order_data,
        "timestamp": datetime.now().isoformat()
    }, user_id)


async def send_message_event(user_id: str, message_data: dict):
    """Send a new message event to a user"""
    await manager.send_personal_message({
        "type": EventType.NEW_MESSAGE,
        "data": message_data,
        "timestamp": datetime.now().isoformat()
    }, user_id)


async def broadcast_room_availability():
    """Broadcast room availability changes to all connected users"""
    await manager.broadcast({
        "type": EventType.ROOM_AVAILABILITY_CHANGED,
        "timestamp": datetime.now().isoformat()
    })


async def broadcast_announcement(announcement: str, priority: str = "normal"):
    """Broadcast a system announcement to all users"""
    await manager.broadcast({
        "type": EventType.SYSTEM_ANNOUNCEMENT,
        "data": {
            "message": announcement,
            "priority": priority
        },
        "timestamp": datetime.now().isoformat()
    })
