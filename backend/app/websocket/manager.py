"""
WebSocket Connection Manager
Handles WebSocket connections for real-time updates
"""
from typing import Dict, Set, List, Optional
from fastapi import WebSocket
from dataclasses import dataclass, field
import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


@dataclass
class Connection:
    """Represents a WebSocket connection"""
    websocket: WebSocket
    user_id: str
    role: str
    connected_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class ConnectionManager:
    """
    Manages WebSocket connections for real-time notifications

    Supports:
    - Role-based broadcasting (send to all chefs, waiters, etc.)
    - User-specific messages
    - Connection lifecycle management
    """

    def __init__(self):
        # All active connections
        self.active_connections: Dict[str, Connection] = {}

        # Connections grouped by role for efficient role-based broadcasting
        self.role_connections: Dict[str, Set[str]] = {
            'chef': set(),
            'waiter': set(),
            'cleaner': set(),
            'manager': set(),
            'admin': set(),
            'customer': set()
        }

    async def connect(self, websocket: WebSocket, user_id: str, role: str):
        """Accept and register a new WebSocket connection"""
        await websocket.accept()

        # Create connection object
        connection = Connection(
            websocket=websocket,
            user_id=user_id,
            role=role
        )

        # Store connection
        self.active_connections[user_id] = connection

        # Add to role group
        if role in self.role_connections:
            self.role_connections[role].add(user_id)

        logger.info(f"WebSocket connected: user={user_id}, role={role}")

        # Send welcome message
        await self.send_personal_message(
            user_id,
            {
                'type': 'connection.established',
                'message': 'Connected to Premier Hotel real-time updates',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        )

    def disconnect(self, user_id: str):
        """Remove a WebSocket connection"""
        if user_id in self.active_connections:
            connection = self.active_connections[user_id]

            # Remove from role group
            if connection.role in self.role_connections:
                self.role_connections[connection.role].discard(user_id)

            # Remove from active connections
            del self.active_connections[user_id]

            logger.info(f"WebSocket disconnected: user={user_id}")

    async def send_personal_message(self, user_id: str, message: dict):
        """Send a message to a specific user"""
        if user_id in self.active_connections:
            connection = self.active_connections[user_id]
            try:
                await connection.websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to {user_id}: {str(e)}")
                self.disconnect(user_id)

    async def broadcast_to_role(self, role: str, message: dict):
        """Send a message to all users with a specific role"""
        if role not in self.role_connections:
            logger.warning(f"Unknown role: {role}")
            return

        user_ids = list(self.role_connections[role])

        logger.info(f"Broadcasting to {len(user_ids)} {role}s: {message.get('type')}")

        for user_id in user_ids:
            await self.send_personal_message(user_id, message)

    async def broadcast_to_staff(self, message: dict):
        """Send a message to all staff members (chef, waiter, manager, admin)"""
        staff_roles = ['chef', 'waiter', 'manager', 'admin']
        for role in staff_roles:
            await self.broadcast_to_role(role, message)

    async def broadcast_to_all(self, message: dict):
        """Send a message to all connected users"""
        user_ids = list(self.active_connections.keys())

        logger.info(f"Broadcasting to all {len(user_ids)} users: {message.get('type')}")

        for user_id in user_ids:
            await self.send_personal_message(user_id, message)

    def get_connection_count(self) -> int:
        """Get total number of active connections"""
        return len(self.active_connections)

    def get_role_connection_count(self, role: str) -> int:
        """Get number of connections for a specific role"""
        return len(self.role_connections.get(role, set()))

    def get_connection_stats(self) -> dict:
        """Get statistics about current connections"""
        return {
            'total': self.get_connection_count(),
            'by_role': {
                role: self.get_role_connection_count(role)
                for role in self.role_connections.keys()
            }
        }


# Global connection manager instance
connection_manager = ConnectionManager()
