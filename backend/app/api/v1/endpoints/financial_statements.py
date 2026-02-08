"""
Profit & Loss Statement Endpoint
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import datetime, timedelta
from decimal import Decimal
from app.middleware.auth_secure import require_role
from app.core.supabase import get_supabase
from supabase import Client

router = APIRouter()


@router.get("/profit-loss")
async def get_profit_loss_statement(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Generate Profit & Loss Statement"""
    try:
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now().replace(day=1)).isoformat()

        # REVENUE
        # Room Revenue
        bookings = supabase.table("bookings").select("paid_amount, total_amount").gte(
            "created_at", start_date
        ).lte("created_at", end_date).execute()
        
        room_revenue = sum(float(b.get("paid_amount") or b.get("total_amount") or 0) for b in bookings.data)

        # F&B Revenue
        orders = supabase.table("orders").select("total_amount").gte(
            "created_at", start_date
        ).lte("created_at", end_date).eq("payment_status", "paid").execute()
        
        fb_revenue = sum(float(o.get("total_amount") or 0) for o in orders.data)

        total_revenue = room_revenue + fb_revenue

        # COST OF GOODS SOLD (COGS)
        # Inventory usage
        try:
            stock_movements = supabase.table("stock_movements").select("total_cost").gte(
                "created_at", start_date
            ).lte("created_at", end_date).eq("movement_type", "out").execute()
            cogs = sum(float(m.get("total_cost") or 0) for m in stock_movements.data)
        except Exception:
            cogs = 0

        gross_profit = total_revenue - cogs
        gross_margin = (gross_profit / total_revenue * 100) if total_revenue > 0 else 0

        # OPERATING EXPENSES
        try:
            expenses = supabase.table("expenses").select("amount, category").gte(
                "date", start_date
            ).lte("date", end_date).execute()
            expense_data = expenses.data
        except Exception:
            expense_data = []

        # Categorize expenses
        expense_categories = {}
        for exp in expense_data:
            category = exp.get("category", "Other")
            amount = float(exp.get("amount", 0))
            expense_categories[category] = expense_categories.get(category, 0) + amount

        total_expenses = sum(expense_categories.values())

        # NET PROFIT
        operating_profit = gross_profit - total_expenses
        net_profit = operating_profit  # Simplified (no tax/interest for now)
        net_margin = (net_profit / total_revenue * 100) if total_revenue > 0 else 0

        return {
            "period": {
                "start": start_date,
                "end": end_date
            },
            "revenue": {
                "room_revenue": round(room_revenue, 2),
                "fb_revenue": round(fb_revenue, 2),
                "total_revenue": round(total_revenue, 2)
            },
            "cogs": {
                "total_cogs": round(cogs, 2),
                "gross_profit": round(gross_profit, 2),
                "gross_margin": round(gross_margin, 2)
            },
            "operating_expenses": {
                "by_category": {k: round(v, 2) for k, v in expense_categories.items()},
                "total_expenses": round(total_expenses, 2)
            },
            "profit": {
                "operating_profit": round(operating_profit, 2),
                "net_profit": round(net_profit, 2),
                "net_margin": round(net_margin, 2)
            }
        }

    except Exception as e:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate P&L statement: {str(e)}"
        )


@router.get("/cash-flow")
async def get_cash_flow_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Generate Cash Flow Report"""
    try:
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now().replace(day=1)).isoformat()

        # CASH INFLOWS
        payments = supabase.table("payments").select("amount, payment_method, created_at").gte(
            "created_at", start_date
        ).lte("created_at", end_date).eq("status", "completed").execute()

        cash_inflows = {"mpesa": 0, "cash": 0, "card": 0}
        for payment in payments.data:
            amount = float(payment.get("amount", 0))
            method = (payment.get("payment_method") or "cash").lower()
            if method in ["mpesa", "m-pesa"]:
                cash_inflows["mpesa"] += amount
            elif method == "card":
                cash_inflows["card"] += amount
            else:
                cash_inflows["cash"] += amount

        total_inflows = sum(cash_inflows.values())

        # CASH OUTFLOWS
        expenses = supabase.table("expenses").select("amount, category, payment_method").gte(
            "date", start_date
        ).lte("date", end_date).execute()

        cash_outflows = {}
        for exp in expenses.data:
            category = exp.get("category", "Other")
            amount = float(exp.get("amount", 0))
            cash_outflows[category] = cash_outflows.get(category, 0) + amount

        total_outflows = sum(cash_outflows.values())

        # NET CASH FLOW
        net_cash_flow = total_inflows - total_outflows

        return {
            "period": {
                "start": start_date,
                "end": end_date
            },
            "cash_inflows": {
                "by_method": {k: round(v, 2) for k, v in cash_inflows.items()},
                "total": round(total_inflows, 2)
            },
            "cash_outflows": {
                "by_category": {k: round(v, 2) for k, v in cash_outflows.items()},
                "total": round(total_outflows, 2)
            },
            "net_cash_flow": round(net_cash_flow, 2)
        }

    except Exception as e:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate cash flow report: {str(e)}"
        )


@router.get("/balance-sheet")
async def get_balance_sheet(
    as_of_date: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Generate Balance Sheet"""
    try:
        if not as_of_date:
            as_of_date = datetime.now().isoformat()

        # ASSETS
        # Cash (from completed payments)
        payments = supabase.table("payments").select("amount, payment_method").lte(
            "created_at", as_of_date
        ).eq("status", "completed").execute()
        
        cash_by_method = {"mpesa": 0, "cash": 0, "card": 0}
        for p in payments.data:
            amount = float(p.get("amount", 0))
            method = (p.get("payment_method") or "cash").lower()
            if method in ["mpesa", "m-pesa"]:
                cash_by_method["mpesa"] += amount
            elif method == "card":
                cash_by_method["card"] += amount
            else:
                cash_by_method["cash"] += amount

        # Subtract expenses
        expenses = supabase.table("expenses").select("amount").lte(
            "date", as_of_date
        ).execute()
        total_expenses = sum(float(e.get("amount", 0)) for e in expenses.data)
        
        net_cash = sum(cash_by_method.values()) - total_expenses

        # Inventory value
        inventory = supabase.table("inventory_items").select("quantity, unit_cost").eq(
            "is_active", True
        ).execute()
        inventory_value = sum(
            float(i.get("quantity", 0)) * float(i.get("unit_cost", 0)) 
            for i in inventory.data
        )

        # Accounts Receivable (unpaid bookings/orders)
        unpaid_bookings = supabase.table("bookings").select("total_amount, paid_amount").lte(
            "created_at", as_of_date
        ).neq("payment_status", "paid").execute()
        
        accounts_receivable = sum(
            float(b.get("total_amount", 0)) - float(b.get("paid_amount", 0))
            for b in unpaid_bookings.data
        )

        total_assets = net_cash + inventory_value + accounts_receivable

        # LIABILITIES
        # Accounts Payable (unpaid expenses/bills)
        unpaid_bills = supabase.table("bills").select("total_amount").lte(
            "created_at", as_of_date
        ).eq("payment_status", "unpaid").execute()
        
        accounts_payable = sum(float(b.get("total_amount", 0)) for b in unpaid_bills.data)

        total_liabilities = accounts_payable

        # EQUITY
        total_equity = total_assets - total_liabilities

        return {
            "as_of_date": as_of_date,
            "assets": {
                "current_assets": {
                    "cash": round(net_cash, 2),
                    "cash_breakdown": {k: round(v, 2) for k, v in cash_by_method.items()},
                    "inventory": round(inventory_value, 2),
                    "accounts_receivable": round(accounts_receivable, 2)
                },
                "total_assets": round(total_assets, 2)
            },
            "liabilities": {
                "current_liabilities": {
                    "accounts_payable": round(accounts_payable, 2)
                },
                "total_liabilities": round(total_liabilities, 2)
            },
            "equity": {
                "total_equity": round(total_equity, 2)
            }
        }

    except Exception as e:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate balance sheet: {str(e)}"
        )


@router.get("/vat-report")
async def get_vat_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Generate VAT Report (16% Kenya VAT)"""
    try:
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now().replace(day=1)).isoformat()

        VAT_RATE = 0.16

        # OUTPUT VAT (Sales)
        # Room revenue
        bookings = supabase.table("bookings").select("paid_amount, total_amount").gte(
            "created_at", start_date
        ).lte("created_at", end_date).execute()
        
        room_revenue = sum(float(b.get("paid_amount") or b.get("total_amount") or 0) for b in bookings.data)

        # F&B revenue
        orders = supabase.table("orders").select("total_amount").gte(
            "created_at", start_date
        ).lte("created_at", end_date).eq("payment_status", "paid").execute()
        
        fb_revenue = sum(float(o.get("total_amount") or 0) for o in orders.data)

        total_sales = room_revenue + fb_revenue
        sales_excl_vat = total_sales / (1 + VAT_RATE)
        output_vat = total_sales - sales_excl_vat

        # INPUT VAT (Purchases)
        expenses = supabase.table("expenses").select("amount").gte(
            "date", start_date
        ).lte("date", end_date).execute()
        
        total_purchases = sum(float(e.get("amount", 0)) for e in expenses.data)
        purchases_excl_vat = total_purchases / (1 + VAT_RATE)
        input_vat = total_purchases - purchases_excl_vat

        # NET VAT PAYABLE
        net_vat_payable = output_vat - input_vat

        return {
            "period": {
                "start": start_date,
                "end": end_date
            },
            "vat_rate": VAT_RATE,
            "output_vat": {
                "room_revenue": round(room_revenue, 2),
                "fb_revenue": round(fb_revenue, 2),
                "total_sales_incl_vat": round(total_sales, 2),
                "total_sales_excl_vat": round(sales_excl_vat, 2),
                "output_vat": round(output_vat, 2)
            },
            "input_vat": {
                "total_purchases_incl_vat": round(total_purchases, 2),
                "total_purchases_excl_vat": round(purchases_excl_vat, 2),
                "input_vat": round(input_vat, 2)
            },
            "net_vat_payable": round(net_vat_payable, 2)
        }

    except Exception as e:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate VAT report: {str(e)}"
        )


@router.get("/comparative-analysis")
async def get_comparative_analysis(
    current_start: str = Query(...),
    current_end: str = Query(...),
    compare_to: str = Query("previous_period", description="previous_period or previous_year"),
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Generate Comparative Analysis Report"""
    try:
        # Calculate comparison period
        current_start_dt = datetime.fromisoformat(current_start)
        current_end_dt = datetime.fromisoformat(current_end)
        period_days = (current_end_dt - current_start_dt).days

        if compare_to == "previous_year":
            prev_start_dt = current_start_dt.replace(year=current_start_dt.year - 1)
            prev_end_dt = current_end_dt.replace(year=current_end_dt.year - 1)
        else:  # previous_period
            prev_end_dt = current_start_dt - timedelta(days=1)
            prev_start_dt = prev_end_dt - timedelta(days=period_days)

        prev_start = prev_start_dt.isoformat()
        prev_end = prev_end_dt.isoformat()

        # Get current period data
        current_bookings = supabase.table("bookings").select("paid_amount, total_amount").gte(
            "created_at", current_start
        ).lte("created_at", current_end).execute()
        
        current_orders = supabase.table("orders").select("total_amount").gte(
            "created_at", current_start
        ).lte("created_at", current_end).eq("payment_status", "paid").execute()

        current_revenue = (
            sum(float(b.get("paid_amount") or b.get("total_amount") or 0) for b in current_bookings.data) +
            sum(float(o.get("total_amount") or 0) for o in current_orders.data)
        )

        # Get previous period data
        prev_bookings = supabase.table("bookings").select("paid_amount, total_amount").gte(
            "created_at", prev_start
        ).lte("created_at", prev_end).execute()
        
        prev_orders = supabase.table("orders").select("total_amount").gte(
            "created_at", prev_start
        ).lte("created_at", prev_end).eq("payment_status", "paid").execute()

        prev_revenue = (
            sum(float(b.get("paid_amount") or b.get("total_amount") or 0) for b in prev_bookings.data) +
            sum(float(o.get("total_amount") or 0) for o in prev_orders.data)
        )

        # Calculate changes
        revenue_change = current_revenue - prev_revenue
        revenue_change_pct = (revenue_change / prev_revenue * 100) if prev_revenue > 0 else 0

        bookings_change = len(current_bookings.data) - len(prev_bookings.data)
        bookings_change_pct = (bookings_change / len(prev_bookings.data) * 100) if len(prev_bookings.data) > 0 else 0

        orders_change = len(current_orders.data) - len(prev_orders.data)
        orders_change_pct = (orders_change / len(prev_orders.data) * 100) if len(prev_orders.data) > 0 else 0

        return {
            "current_period": {
                "start": current_start,
                "end": current_end,
                "revenue": round(current_revenue, 2),
                "bookings": len(current_bookings.data),
                "orders": len(current_orders.data)
            },
            "previous_period": {
                "start": prev_start,
                "end": prev_end,
                "revenue": round(prev_revenue, 2),
                "bookings": len(prev_bookings.data),
                "orders": len(prev_orders.data)
            },
            "comparison": {
                "revenue_change": round(revenue_change, 2),
                "revenue_change_pct": round(revenue_change_pct, 2),
                "bookings_change": bookings_change,
                "bookings_change_pct": round(bookings_change_pct, 2),
                "orders_change": orders_change,
                "orders_change_pct": round(orders_change_pct, 2)
            }
        }

    except Exception as e:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate comparative analysis: {str(e)}"
        )


@router.get("/inventory-closing-stock")
async def get_inventory_closing_stock(
    as_of_date: str = Query(..., description="Date to get closing stock (YYYY-MM-DD)"),
    category_id: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Get Inventory Closing Stock Report for any date"""
    try:
        # Get all inventory items
        items_query = supabase.table("inventory_items").select(
            "id, sku, name, category_id, unit, quantity, unit_cost, min_quantity, reorder_point"
        ).eq("is_active", True)
        
        if category_id:
            items_query = items_query.eq("category_id", category_id)
        
        items_result = items_query.execute()
        items = items_result.data

        # Get all stock movements AFTER the specified date
        as_of_datetime = datetime.strptime(as_of_date, "%Y-%m-%d")
        as_of_end = as_of_datetime.replace(hour=23, minute=59, second=59).isoformat()
        
        movements_result = supabase.table("stock_movements").select(
            "item_id, quantity, movement_type, created_at"
        ).gt("created_at", as_of_end).execute()
        
        movements_after = movements_result.data

        # Build map of movements per item
        movements_by_item = {}
        for movement in movements_after:
            item_id = movement["item_id"]
            if item_id not in movements_by_item:
                movements_by_item[item_id] = []
            movements_by_item[item_id].append(movement)

        # Calculate closing stock for each item
        closing_stock_items = []
        total_value = 0
        low_stock_count = 0
        out_of_stock_count = 0

        for item in items:
            current_quantity = Decimal(str(item["quantity"]))
            closing_quantity = current_quantity

            # Reverse all movements after the cutoff date
            item_movements = movements_by_item.get(item["id"], [])
            for movement in item_movements:
                movement_qty = Decimal(str(movement["quantity"]))
                movement_type = movement["movement_type"]

                # Reverse the movement effect
                if movement_type in ["in", "return"]:
                    closing_quantity -= movement_qty
                elif movement_type in ["out", "damage", "expired"]:
                    closing_quantity += movement_qty

            # Ensure non-negative
            closing_quantity = max(Decimal("0"), closing_quantity)
            unit_cost = Decimal(str(item["unit_cost"]))
            item_value = closing_quantity * unit_cost
            total_value += float(item_value)

            # Check stock levels
            min_qty = Decimal(str(item.get("min_quantity", 0)))
            if closing_quantity == 0:
                out_of_stock_count += 1
                stock_status = "Out of Stock"
            elif closing_quantity <= min_qty:
                low_stock_count += 1
                stock_status = "Low Stock"
            else:
                stock_status = "In Stock"

            closing_stock_items.append({
                "item_id": item["id"],
                "sku": item["sku"],
                "name": item["name"],
                "category_id": item.get("category_id"),
                "unit": item["unit"],
                "closing_quantity": float(closing_quantity),
                "current_quantity": float(current_quantity),
                "quantity_change": float(current_quantity - closing_quantity),
                "unit_cost": float(unit_cost),
                "closing_value": float(item_value),
                "min_quantity": float(min_qty),
                "reorder_point": float(item.get("reorder_point", 0)),
                "stock_status": stock_status,
                "movements_since": len(item_movements)
            })

        # Get categories for reference
        categories_result = supabase.table("inventory_categories").select("id, name").execute()
        categories_map = {c["id"]: c["name"] for c in categories_result.data}

        # Add category names
        for item in closing_stock_items:
            item["category_name"] = categories_map.get(item.get("category_id"), "Uncategorized")

        # Sort by value (highest first)
        closing_stock_items.sort(key=lambda x: x["closing_value"], reverse=True)

        return {
            "as_of_date": as_of_date,
            "summary": {
                "total_items": len(closing_stock_items),
                "total_value": round(total_value, 2),
                "low_stock_items": low_stock_count,
                "out_of_stock_items": out_of_stock_count,
                "in_stock_items": len(closing_stock_items) - low_stock_count - out_of_stock_count
            },
            "items": closing_stock_items
        }

    except Exception as e:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate inventory closing stock: {str(e)}"
        )



@router.get("/occupancy-report")
async def get_occupancy_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Generate Occupancy & Room Performance Report"""
    try:
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()

        # Get all rooms
        rooms = supabase.table("rooms").select("id, room_number, room_type, price_per_night").execute()
        total_rooms = len(rooms.data)
        
        # Get bookings in period
        bookings = supabase.table("bookings").select(
            "room_id, check_in, check_out, total_amount, paid_amount, guests, status"
        ).gte("check_in", start_date).lte("check_out", end_date).execute()

        # Calculate room nights
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        total_days = (end_dt - start_dt).days + 1
        total_room_nights = total_rooms * total_days

        # Calculate occupied room nights
        occupied_nights = 0
        revenue_by_type = {}
        bookings_by_type = {}
        
        for booking in bookings.data:
            if booking.get("status") in ["confirmed", "checked_in", "checked_out"]:
                check_in = datetime.fromisoformat(booking["check_in"].replace('Z', '+00:00'))
                check_out = datetime.fromisoformat(booking["check_out"].replace('Z', '+00:00'))
                nights = (check_out - check_in).days
                occupied_nights += nights
                
                # Get room type
                room = next((r for r in rooms.data if r["id"] == booking["room_id"]), None)
                if room:
                    room_type = room["room_type"]
                    revenue = float(booking.get("paid_amount") or booking.get("total_amount") or 0)
                    revenue_by_type[room_type] = revenue_by_type.get(room_type, 0) + revenue
                    bookings_by_type[room_type] = bookings_by_type.get(room_type, 0) + 1

        # Calculate metrics
        occupancy_rate = (occupied_nights / total_room_nights * 100) if total_room_nights > 0 else 0
        total_revenue = sum(revenue_by_type.values())
        revpar = total_revenue / total_room_nights if total_room_nights > 0 else 0
        adr = total_revenue / occupied_nights if occupied_nights > 0 else 0

        # Room type performance
        room_performance = []
        for room_type, revenue in revenue_by_type.items():
            type_rooms = len([r for r in rooms.data if r["room_type"] == room_type])
            type_bookings = bookings_by_type.get(room_type, 0)
            room_performance.append({
                "room_type": room_type,
                "total_rooms": type_rooms,
                "bookings": type_bookings,
                "revenue": round(revenue, 2),
                "avg_rate": round(revenue / type_bookings, 2) if type_bookings > 0 else 0
            })

        return {
            "period": {"start": start_date, "end": end_date},
            "summary": {
                "total_rooms": total_rooms,
                "total_room_nights": total_room_nights,
                "occupied_nights": occupied_nights,
                "occupancy_rate": round(occupancy_rate, 2),
                "total_revenue": round(total_revenue, 2),
                "revpar": round(revpar, 2),
                "adr": round(adr, 2)
            },
            "by_room_type": room_performance
        }

    except Exception as e:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate occupancy report: {str(e)}"
        )


@router.get("/menu-profitability")
async def get_menu_profitability(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Generate Menu Item Profitability Report"""
    try:
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()

        # Get paid orders
        orders = supabase.table("orders").select("id").gte(
            "created_at", start_date
        ).lte("created_at", end_date).eq("payment_status", "paid").execute()

        if not orders.data:
            return {"period": {"start": start_date, "end": end_date}, "items": []}

        order_ids = [o["id"] for o in orders.data]
        
        # Get order items
        order_items = supabase.table("order_items").select(
            "menu_item_id, quantity, price"
        ).in_("order_id", order_ids).execute()

        # Get menu items
        menu_items = supabase.table("menu_items").select(
            "id, name, category, price, cost"
        ).execute()
        
        menu_map = {item["id"]: item for item in menu_items.data}

        # Calculate profitability
        item_stats = {}
        for order_item in order_items.data:
            menu_id = order_item["menu_item_id"]
            if menu_id not in menu_map:
                continue
                
            menu = menu_map[menu_id]
            qty = order_item["quantity"]
            revenue = float(order_item["price"]) * qty
            cost = float(menu.get("cost", 0)) * qty
            profit = revenue - cost
            
            if menu_id not in item_stats:
                item_stats[menu_id] = {
                    "name": menu["name"],
                    "category": menu.get("category", "Uncategorized"),
                    "quantity_sold": 0,
                    "revenue": 0,
                    "cost": 0,
                    "profit": 0
                }
            
            item_stats[menu_id]["quantity_sold"] += qty
            item_stats[menu_id]["revenue"] += revenue
            item_stats[menu_id]["cost"] += cost
            item_stats[menu_id]["profit"] += profit

        # Format results
        profitability_items = []
        for item_id, stats in item_stats.items():
            profit_margin = (stats["profit"] / stats["revenue"] * 100) if stats["revenue"] > 0 else 0
            profitability_items.append({
                "item_id": item_id,
                "name": stats["name"],
                "category": stats["category"],
                "quantity_sold": stats["quantity_sold"],
                "revenue": round(stats["revenue"], 2),
                "cost": round(stats["cost"], 2),
                "profit": round(stats["profit"], 2),
                "profit_margin": round(profit_margin, 2)
            })

        # Sort by profit
        profitability_items.sort(key=lambda x: x["profit"], reverse=True)

        total_revenue = sum(item["revenue"] for item in profitability_items)
        total_cost = sum(item["cost"] for item in profitability_items)
        total_profit = total_revenue - total_cost

        return {
            "period": {"start": start_date, "end": end_date},
            "summary": {
                "total_revenue": round(total_revenue, 2),
                "total_cost": round(total_cost, 2),
                "total_profit": round(total_profit, 2),
                "avg_profit_margin": round((total_profit / total_revenue * 100), 2) if total_revenue > 0 else 0
            },
            "items": profitability_items
        }

    except Exception as e:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate menu profitability report: {str(e)}"
        )


@router.get("/customer-lifetime-value")
async def get_customer_lifetime_value(
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Generate Customer Lifetime Value Report"""
    try:
        # Get all completed payments
        payments = supabase.table("payments").select(
            "user_id, amount, created_at"
        ).eq("status", "completed").execute()

        # Aggregate by customer
        customer_stats = {}
        for payment in payments.data:
            user_id = payment["user_id"]
            amount = float(payment["amount"])
            created_at = datetime.fromisoformat(payment["created_at"].replace('Z', '+00:00'))
            
            if user_id not in customer_stats:
                customer_stats[user_id] = {
                    "total_spent": 0,
                    "transaction_count": 0,
                    "first_purchase": created_at,
                    "last_purchase": created_at
                }
            
            customer_stats[user_id]["total_spent"] += amount
            customer_stats[user_id]["transaction_count"] += 1
            
            if created_at < customer_stats[user_id]["first_purchase"]:
                customer_stats[user_id]["first_purchase"] = created_at
            if created_at > customer_stats[user_id]["last_purchase"]:
                customer_stats[user_id]["last_purchase"] = created_at

        # Get user details
        user_ids = list(customer_stats.keys())
        users = supabase.table("users").select("id, full_name, email").in_("id", user_ids).execute()
        user_map = {u["id"]: u for u in users.data}

        # Format results
        clv_list = []
        for user_id, stats in customer_stats.items():
            user = user_map.get(user_id, {})
            customer_lifetime_days = (stats["last_purchase"] - stats["first_purchase"]).days + 1
            avg_transaction = stats["total_spent"] / stats["transaction_count"]
            
            clv_list.append({
                "user_id": user_id,
                "name": user.get("full_name", "Unknown"),
                "email": user.get("email", ""),
                "lifetime_value": round(stats["total_spent"], 2),
                "transaction_count": stats["transaction_count"],
                "avg_transaction": round(avg_transaction, 2),
                "first_purchase": stats["first_purchase"].strftime("%Y-%m-%d"),
                "last_purchase": stats["last_purchase"].strftime("%Y-%m-%d"),
                "customer_lifetime_days": customer_lifetime_days
            })

        # Sort by lifetime value
        clv_list.sort(key=lambda x: x["lifetime_value"], reverse=True)

        # Calculate summary
        total_clv = sum(c["lifetime_value"] for c in clv_list)
        avg_clv = total_clv / len(clv_list) if clv_list else 0

        return {
            "summary": {
                "total_customers": len(clv_list),
                "total_clv": round(total_clv, 2),
                "avg_clv": round(avg_clv, 2)
            },
            "customers": clv_list[:limit]
        }

    except Exception as e:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate CLV report: {str(e)}"
        )
