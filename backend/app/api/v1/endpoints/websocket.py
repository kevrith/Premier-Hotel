"""
WebSocket Endpoint
Real-time communication endpoint
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.services.websocket_manager import manager, EventType
import logging
import json

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
):
    """
    WebSocket endpoint for real-time updates

    Usage:
        ws://localhost:8000/api/v1/ws?token=YOUR_JWT_TOKEN

    Events sent to client:
        - notification: New notification
        - booking_created: New booking created
        - booking_updated: Booking updated
        - payment_completed: Payment successful
        - order_status_changed: Order status changed
        - new_message: New chat message
        - system_announcement: System-wide announcement
    """
    user_id = None

    try:
        # Validate token and get user
        # For now, we'll extract user_id from token manually
        # In production, you'd decode the JWT token
        from jose import jwt
        from app.core.config import settings

        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = payload.get("sub")

            if not user_id:
                await websocket.close(code=1008, reason="Invalid token")
                return
        except Exception as e:
            logger.error(f"Token validation error: {str(e)}")
            await websocket.close(code=1008, reason="Invalid token")
            return

        # Accept connection
        await manager.connect(websocket, user_id)

        # Send connection acknowledgment
        await websocket.send_json({
            "type": EventType.CONNECTION_ACK,
            "data": {
                "user_id": user_id,
                "message": "Connected successfully"
            }
        })

        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_text()
                message = json.loads(data)

                # Handle ping/pong for keepalive
                if message.get("type") == EventType.PING:
                    await websocket.send_json({
                        "type": EventType.PONG,
                        "timestamp": message.get("timestamp")
                    })

                # Handle other message types
                elif message.get("type") == "subscribe":
                    # Client wants to subscribe to specific events
                    # This can be extended to support topic-based subscriptions
                    logger.info(f"User {user_id} subscribed to: {message.get('topics', [])}")

                elif message.get("type") == "unsubscribe":
                    # Client wants to unsubscribe from specific events
                    logger.info(f"User {user_id} unsubscribed from: {message.get('topics', [])}")

            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected for user {user_id}")
                break
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received from user {user_id}")
                continue
            except Exception as e:
                logger.error(f"Error handling message from user {user_id}: {str(e)}")
                continue

    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")

    finally:
        # Clean up connection
        if user_id:
            manager.disconnect(websocket)


@router.get("/ws/stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics (for monitoring)"""
    return {
        "total_connections": manager.get_connection_count(),
        "connected_users": len(manager.get_connected_users()),
        "user_ids": list(manager.get_connected_users())
    }
