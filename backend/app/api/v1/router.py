"""
API v1 Router - Combines all endpoint routers
"""
from fastapi import APIRouter
from app.api.v1.endpoints import auth, rooms, bookings, menu, orders, payments, reports, staff, housekeeping, service_requests, reviews, checkin_checkout, expenses, inventory, loyalty, analytics, notifications, emails, websocket, messages

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(rooms.router, prefix="/rooms", tags=["Rooms"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["Bookings"])
api_router.include_router(menu.router, prefix="/menu", tags=["Menu"])
api_router.include_router(orders.router, prefix="/orders", tags=["Orders"])
api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(staff.router, prefix="/staff", tags=["Staff Management"])
api_router.include_router(housekeeping.router, prefix="/housekeeping", tags=["Housekeeping"])
api_router.include_router(service_requests.router, prefix="/service-requests", tags=["Service Requests"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["Reviews & Ratings"])
api_router.include_router(checkin_checkout.router, prefix="/checkin-checkout", tags=["Check-in/Check-out"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["Expense Tracking"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["Inventory Management"])
api_router.include_router(loyalty.router, prefix="/loyalty", tags=["Loyalty Program"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Advanced Analytics"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(emails.router, prefix="/emails", tags=["Email Management"])
api_router.include_router(websocket.router, tags=["WebSocket"])
api_router.include_router(messages.router, prefix="/messages", tags=["Messaging"])
