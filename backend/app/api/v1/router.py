"""
API v1 Router - Combines all endpoint routers
SECURITY: Using auth_secure for httpOnly cookie-based authentication
"""
from fastapi import APIRouter
from app.api.v1.endpoints import auth_secure as auth, admin_enhanced as admin, rooms, bookings, menu, orders, bills, payments, reports, staff, housekeeping, service_requests, reviews, checkin_checkout, expenses, inventory, loyalty, analytics, notifications, emails, websocket, messages, quickbooks, quickbooks_connector, customers, purchase_orders, order_payments, recipes, combined_checkout, test_bills, permissions, settings, financial_statements, manager_orders, system_health

api_router = APIRouter()

# Include all endpoint routers (using auth_secure for secure cookie-based authentication)
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication - Secure"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin Management - Enhanced"])
api_router.include_router(rooms.router, prefix="/rooms", tags=["Rooms"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["Bookings"])
api_router.include_router(menu.router, prefix="/menu", tags=["Menu"])
api_router.include_router(orders.router, prefix="/orders", tags=["Orders"])
api_router.include_router(manager_orders.router, prefix="/orders/manager", tags=["Manager Orders"])
api_router.include_router(order_payments.router, prefix="/order-billing", tags=["Order Billing"])
api_router.include_router(combined_checkout.router, prefix="/checkout", tags=["Combined Checkout"])
api_router.include_router(bills.router, prefix="/bills", tags=["Bills & Payments"])
api_router.include_router(payments.router, prefix="/pos-payments", tags=["POS Payments"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(staff.router, prefix="/staff", tags=["Staff Management"])
api_router.include_router(housekeeping.router, prefix="/housekeeping", tags=["Housekeeping"])
api_router.include_router(service_requests.router, prefix="/service-requests", tags=["Service Requests"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["Reviews & Ratings"])
api_router.include_router(checkin_checkout.router, prefix="/checkin-checkout", tags=["Check-in/Check-out"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["Expense Tracking"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["Inventory Management"])
api_router.include_router(purchase_orders.router, prefix="/purchase-orders", tags=["Purchase Orders & Procurement"])
api_router.include_router(loyalty.router, prefix="/loyalty", tags=["Loyalty Program"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Advanced Analytics"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(emails.router, prefix="/emails", tags=["Email Management"])
api_router.include_router(websocket.router, tags=["WebSocket"])
api_router.include_router(messages.router, prefix="/messages", tags=["Messaging"])

# Customer History & Lookup
api_router.include_router(customers.router, prefix="/customers", tags=["Customer Management"])

# QuickBooks POS Integration
api_router.include_router(quickbooks.router, prefix="/quickbooks", tags=["QuickBooks Admin"])
api_router.include_router(quickbooks_connector.router, prefix="/quickbooks-connector", tags=["QuickBooks Web Connector"])

# Recipes
api_router.include_router(recipes.router, prefix="/recipes", tags=["Recipes"])

# Permission Management
api_router.include_router(permissions.router, prefix="/permissions", tags=["Permission Management"])

# Financial Statements
api_router.include_router(financial_statements.router, prefix="/financial", tags=["Financial Statements"])

# Hotel Settings
api_router.include_router(settings.router, prefix="/settings", tags=["Hotel Settings"])

# System Health
api_router.include_router(system_health.router, prefix="/system/health", tags=["System Health"])

# Test endpoints (remove in production)
api_router.include_router(test_bills.router, prefix="/test", tags=["Testing"])
