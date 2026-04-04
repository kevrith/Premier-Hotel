"""
Profit & Loss Statement Endpoint
"""
from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import Optional
from datetime import datetime, timedelta
from decimal import Decimal
from pydantic import BaseModel
import asyncio
from concurrent.futures import ThreadPoolExecutor
from app.middleware.auth_secure import require_role
from app.core.supabase import get_supabase, get_supabase_admin
from supabase import Client

router = APIRouter()

from app.core.cache import cache_get, cache_set

_thread_pool = ThreadPoolExecutor(max_workers=12)


async def _par(*fns):
    """Run multiple zero-argument callables in parallel using the thread pool."""
    loop = asyncio.get_event_loop()
    return await asyncio.gather(*[loop.run_in_executor(_thread_pool, fn) for fn in fns])


def _start(date_str: str) -> str:
    """Append T00:00:00 if no time component present."""
    return date_str if 'T' in date_str else date_str + 'T00:00:00'


def _end(date_str: str) -> str:
    """Append T23:59:59 if no time component present."""
    return date_str if 'T' in date_str else date_str + 'T23:59:59'


@router.get("/profit-loss")
async def get_profit_loss_statement(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(["owner", "admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """Generate Profit & Loss Statement"""
    try:
        # Serve from cache if available (5-minute TTL)
        cached = cache_get("pl", start_date=start_date, end_date=end_date)
        if cached:
            return cached

        # Parse and format dates properly
        if not end_date:
            end_dt = datetime.now()
        else:
            end_dt = datetime.fromisoformat(end_date.replace('Z', ''))
        
        if not start_date:
            start_dt = datetime.now().replace(day=1)
        else:
            start_dt = datetime.fromisoformat(start_date.replace('Z', ''))
        
        # Format for query with full day range
        start_query = start_dt.strftime("%Y-%m-%dT00:00:00")
        end_query = end_dt.strftime("%Y-%m-%dT23:59:59")

        # Run all revenue/expense queries in parallel
        def _fetch_bookings():
            return supabase.table("bookings").select("paid_amount, total_amount").gte(
                "created_at", start_query).lte("created_at", end_query).execute()

        def _fetch_orders():
            return supabase.table("orders").select("total_amount").gte(
                "created_at", start_query).lte("created_at", end_query).in_(
                "status", ["completed", "delivered", "served"]).execute()

        def _fetch_stock():
            try:
                return supabase.table("stock_movements").select("total_cost").gte(
                    "created_at", start_query).lte("created_at", end_query).eq(
                    "movement_type", "out").execute()
            except Exception:
                return None

        def _fetch_expenses():
            try:
                return supabase.table("expenses").select("amount, expense_type").gte(
                    "expense_date", start_query).lte("expense_date", end_query).execute()
            except Exception:
                return None

        bookings_res, orders_res, stock_res, expenses_res = await _par(
            _fetch_bookings, _fetch_orders, _fetch_stock, _fetch_expenses
        )

        # REVENUE
        room_revenue = sum(float(b.get("paid_amount") or b.get("total_amount") or 0)
                           for b in (bookings_res.data or []))
        fb_revenue = sum(float(o.get("total_amount") or 0) for o in (orders_res.data or []))
        total_revenue = room_revenue + fb_revenue

        # COST OF GOODS SOLD (COGS)
        cogs = sum(float(m.get("total_cost") or 0) for m in (stock_res.data if stock_res else []))
        gross_profit = total_revenue - cogs
        gross_margin = (gross_profit / total_revenue * 100) if total_revenue > 0 else 0

        # OPERATING EXPENSES
        expense_data = expenses_res.data if expenses_res else []

        # Categorize expenses
        expense_categories = {}
        for exp in expense_data:
            category = exp.get("expense_type", "Other")
            amount = float(exp.get("amount", 0))
            expense_categories[category] = expense_categories.get(category, 0) + amount

        total_expenses = sum(expense_categories.values())

        # NET PROFIT
        operating_profit = gross_profit - total_expenses
        net_profit = operating_profit  # Simplified (no tax/interest for now)
        net_margin = (net_profit / total_revenue * 100) if total_revenue > 0 else 0

        result = {
            "period": {
                "start": start_dt.strftime("%Y-%m-%d"),
                "end": end_dt.strftime("%Y-%m-%d")
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
        cache_set("pl", result, ttl=300, start_date=start_date, end_date=end_date)
        return result

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
    current_user: dict = Depends(require_role(["owner", "admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """Generate Cash Flow Report"""
    try:
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now().replace(day=1)).isoformat()

        # Normalise to full day range
        start_date = _start(start_date)
        end_date = _end(end_date)

        # CASH INFLOWS - grouped by payment method (mpesa, cash, card)
        cash_inflows = {"mpesa": 0, "cash": 0, "card": 0}

        # From completed orders (F&B revenue)
        orders = supabase.table("orders").select("total_amount, payment_method, created_at").gte(
            "created_at", start_date
        ).lte("created_at", end_date).in_("status", ["completed", "delivered", "served"]).execute()

        for order in orders.data:
            amount = float(order.get("total_amount", 0))
            method = (order.get("payment_method") or "cash").lower()
            if "mpesa" in method or "m-pesa" in method:
                cash_inflows["mpesa"] += amount
            elif "card" in method:
                cash_inflows["card"] += amount
            else:
                cash_inflows["cash"] += amount

        # From bookings (room revenue)
        bookings = supabase.table("bookings").select("paid_amount, payment_method, created_at").gte(
            "created_at", start_date
        ).lte("created_at", end_date).execute()

        for booking in bookings.data:
            amount = float(booking.get("paid_amount", 0))
            if amount <= 0:
                continue
            method = (booking.get("payment_method") or "cash").lower()
            if "mpesa" in method or "m-pesa" in method:
                cash_inflows["mpesa"] += amount
            elif "card" in method:
                cash_inflows["card"] += amount
            else:
                cash_inflows["cash"] += amount

        total_inflows = sum(cash_inflows.values())

        # CASH OUTFLOWS
        expenses = supabase.table("expenses").select("amount, description, payment_method").gte(
            "expense_date", start_date
        ).lte("expense_date", end_date).execute()

        cash_outflows = {}
        for exp in expenses.data:
            category = exp.get("description", "Other")
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
    current_user: dict = Depends(require_role(["owner", "admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """Generate Balance Sheet"""
    try:
        if not as_of_date:
            as_of_date = datetime.now().isoformat()

        # Serve from cache (5-minute TTL — balance sheet changes slowly)
        cached = cache_get("balance_sheet", as_of_date=as_of_date[:10])
        if cached:
            return cached

        # Run all 8 Supabase queries in parallel instead of sequentially
        (
            payments_res,
            paid_bills_res,
            orders_res,
            expenses_res,
            inventory_res,
            unpaid_bookings_res,
            unpaid_bills_res,
            adjustments_res,
        ) = await _par(
            lambda: supabase.table("payments").select("amount, payment_method").lte(
                "created_at", as_of_date).eq("payment_status", "completed").execute(),
            lambda: supabase.table("bills").select("total_amount").lte(
                "created_at", as_of_date).eq("payment_status", "paid").execute(),
            lambda: supabase.table("orders").select("total_amount").lte(
                "created_at", as_of_date).in_("status", ["completed", "delivered", "served"]).execute(),
            lambda: supabase.table("expenses").select("amount").lte(
                "expense_date", as_of_date).execute(),
            lambda: supabase.table("inventory_items").select("current_stock").eq(
                "status", "active").execute(),
            lambda: supabase.table("bookings").select("total_amount, paid_amount").lte(
                "created_at", as_of_date).neq("payment_status", "paid").execute(),
            lambda: supabase.table("bills").select("total_amount").lte(
                "created_at", as_of_date).eq("payment_status", "unpaid").execute(),
            lambda: supabase.table("balance_sheet_adjustments").select("*").execute(),
        )

        # ASSETS — Cash
        cash_by_method = {"mpesa": 0, "cash": 0, "card": 0}
        for p in (payments_res.data or []):
            amount = float(p.get("amount", 0))
            method = (p.get("payment_method") or "cash").lower()
            if method in ["mpesa", "m-pesa"]:
                cash_by_method["mpesa"] += amount
            elif method == "card":
                cash_by_method["card"] += amount
            else:
                cash_by_method["cash"] += amount

        order_revenue = sum(float(o.get("total_amount", 0)) for o in (orders_res.data or []))
        cash_by_method["cash"] += order_revenue
        bill_revenue = sum(float(b.get("total_amount", 0)) for b in (paid_bills_res.data or []))
        cash_by_method["cash"] += bill_revenue

        total_expenses = sum(float(e.get("amount", 0)) for e in (expenses_res.data or []))
        net_cash = sum(cash_by_method.values()) - total_expenses

        inventory_value = sum(float(i.get("current_stock", 0)) for i in (inventory_res.data or []))

        accounts_receivable = sum(
            float(b.get("total_amount", 0)) - float(b.get("paid_amount", 0))
            for b in (unpaid_bookings_res.data or [])
        )

        accounts_payable = sum(float(b.get("total_amount", 0)) for b in (unpaid_bills_res.data or []))

        # MANUAL ADJUSTMENTS
        try:
            adjustments = adjustments_res.data or []
        except Exception:
            adjustments = []

        def adj_total(section: str) -> float:
            return sum(float(a["amount"]) for a in adjustments if a["section"] == section)

        def adj_items(section: str) -> list:
            return [{"name": a["name"], "amount": float(a["amount"]), "notes": a.get("notes"), "id": a["id"]}
                    for a in adjustments if a["section"] == section]

        fixed_assets_total = adj_total("fixed_assets")
        other_assets_total = adj_total("other_assets")
        loans_total = adj_total("loans")
        other_liabilities_total = adj_total("other_liabilities")
        owner_capital = adj_total("owner_capital")
        owner_drawings = adj_total("owner_drawings")

        total_assets = net_cash + inventory_value + accounts_receivable + fixed_assets_total + other_assets_total
        total_liabilities = accounts_payable + loans_total + other_liabilities_total

        # EQUITY  =  Capital + Retained Earnings (Assets − Liabilities) − Drawings
        retained_earnings = total_assets - total_liabilities - owner_capital + owner_drawings
        total_equity = owner_capital - owner_drawings + retained_earnings

        return {
            "as_of_date": as_of_date,
            "assets": {
                "current_assets": {
                    "cash": round(net_cash, 2),
                    "cash_breakdown": {k: round(v, 2) for k, v in cash_by_method.items()},
                    "inventory": round(inventory_value, 2),
                    "accounts_receivable": round(accounts_receivable, 2)
                },
                "fixed_assets": {
                    "total": round(fixed_assets_total, 2),
                    "items": adj_items("fixed_assets")
                },
                "other_assets": {
                    "total": round(other_assets_total, 2),
                    "items": adj_items("other_assets")
                },
                "total_assets": round(total_assets, 2)
            },
            "liabilities": {
                "current_liabilities": {
                    "accounts_payable": round(accounts_payable, 2)
                },
                "loans": {
                    "total": round(loans_total, 2),
                    "items": adj_items("loans")
                },
                "other_liabilities": {
                    "total": round(other_liabilities_total, 2),
                    "items": adj_items("other_liabilities")
                },
                "total_liabilities": round(total_liabilities, 2)
            },
            "equity": {
                "owner_capital": round(owner_capital, 2),
                "owner_drawings": round(owner_drawings, 2),
                "retained_earnings": round(retained_earnings, 2),
                "total_equity": round(total_assets - total_liabilities, 2)
            }
        }

        cache_set("balance_sheet", result, ttl=300, as_of_date=as_of_date[:10])
        return result

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
    current_user: dict = Depends(require_role(["owner", "admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """Generate VAT Report (16% Kenya VAT)"""
    try:
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now().replace(day=1)).isoformat()

        # Normalise to full day range
        start_date = _start(start_date)
        end_date = _end(end_date)

        VAT_RATE = 0.16

        # OUTPUT VAT (Sales)
        # Room revenue
        bookings = supabase.table("bookings").select("paid_amount, total_amount").gte(
            "created_at", start_date
        ).lte("created_at", end_date).execute()
        
        room_revenue = sum(float(b.get("paid_amount") or b.get("total_amount") or 0) for b in bookings.data)

        # F&B revenue (from completed orders)
        orders = supabase.table("orders").select("total_amount").gte(
            "created_at", start_date
        ).lte("created_at", end_date).in_("status", ["completed", "delivered", "served"]).execute()

        fb_revenue = sum(float(o.get("total_amount") or 0) for o in orders.data)

        total_sales = room_revenue + fb_revenue
        sales_excl_vat = total_sales / (1 + VAT_RATE)
        output_vat = total_sales - sales_excl_vat

        # INPUT VAT (Purchases)
        expenses = supabase.table("expenses").select("amount").gte(
            "expense_date", start_date
        ).lte("expense_date", end_date).execute()
        
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
    current_user: dict = Depends(require_role(["owner", "admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """Generate Comparative Analysis Report"""
    try:
        # Normalise to full day range
        current_start = _start(current_start)
        current_end = _end(current_end)

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
        
        current_orders = supabase.table("orders").select("total_amount, status").gte(
            "created_at", current_start
        ).lte("created_at", current_end).in_("status", ["completed", "delivered", "served"]).execute()

        current_revenue = (
            sum(float(b.get("paid_amount") or b.get("total_amount") or 0) for b in current_bookings.data) +
            sum(float(o.get("total_amount") or 0) for o in current_orders.data)
        )

        # Get previous period data
        prev_bookings = supabase.table("bookings").select("paid_amount, total_amount").gte(
            "created_at", prev_start
        ).lte("created_at", prev_end).execute()
        
        prev_orders = supabase.table("orders").select("total_amount, status").gte(
            "created_at", prev_start
        ).lte("created_at", prev_end).in_("status", ["completed", "delivered", "served"]).execute()

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
    current_user: dict = Depends(require_role(["owner", "admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Get Inventory Closing Stock Report for a specific historical date.

    Strategy (most accurate first):
    1. If a daily stock take was submitted ON that date → use its physical closing counts.
    2. Otherwise reconstruct from current stock by reversing all movements AFTER that date:
       - Add back sales that occurred after as_of_date (those consumed stock since then)
       - Subtract receipts received after as_of_date (those added stock since then)
       - Add back stock adjustments that reduced stock after as_of_date / reverse increases
    """
    from datetime import date as date_type
    try:
        as_of = date_type.fromisoformat(as_of_date)
        cutoff_ts = f"{as_of_date}T23:59:59"   # end of the selected day
        after_ts  = f"{as_of_date}T23:59:59"   # everything STRICTLY after this moment

        # ── 1. Fetch all tracked menu items ──────────────────────────────────
        items_result = supabase.table("menu_items").select(
            "id, name, category, stock_quantity, reorder_level, unit, cost_price, base_price, track_inventory"
        ).or_("track_inventory.eq.true,stock_quantity.gt.0").execute()
        items = items_result.data or []
        item_map = {i["id"]: i for i in items}

        # ── 2. Check for daily stock-take sessions on that exact date ───────
        #    Multiple sessions may exist (Bar A, Bar B, Kitchen…). Combine them all.
        #    Physical closing qty per item = sum across all location sessions.
        physical_map: dict = {}   # item_id → combined physical closing qty
        try:
            session_res = supabase.table("daily_stock_sessions").select("id").eq(
                "session_date", as_of_date
            ).execute()
            for session in (session_res.data or []):
                items_res = supabase.table("daily_stock_items").select(
                    "menu_item_id, physical_closing"
                ).eq("session_id", session["id"]).execute()
                for row in (items_res.data or []):
                    mid = row.get("menu_item_id")
                    phys = row.get("physical_closing")
                    if mid and phys is not None:
                        physical_map[mid] = physical_map.get(mid, 0.0) + float(phys)
        except Exception:
            pass

        # ── 3. Reconstruct quantities for items WITHOUT a physical count ──────
        #    current_qty + sales_after - receipts_after ± adjustments_after

        # Sales after as_of_date — exclude voided items
        sales_after: dict = {}  # item_id → qty sold after cutoff
        try:
            orders_res = supabase.table("orders").select("items, status").gt(
                "created_at", after_ts
            ).not_.in_("status", ["voided", "void", "cancelled", "canceled", "void_requested"]).execute()
            for order in (orders_res.data or []):
                for oi in (order.get("items") or []):
                    if oi.get("voided"):
                        continue
                    mid = oi.get("menu_item_id") or oi.get("id")
                    if mid:
                        sales_after[mid] = sales_after.get(mid, 0.0) + float(oi.get("quantity", 0))
        except Exception:
            pass

        # Stock receipts after as_of_date (these added stock AFTER the date we want)
        receipts_after: dict = {}  # item_id → qty received after cutoff
        try:
            rcpt_res = supabase.table("stock_receipts").select(
                "menu_item_id, quantity"
            ).gt("received_at", after_ts).execute()
            for r in (rcpt_res.data or []):
                mid = r.get("menu_item_id")
                if mid:
                    receipts_after[mid] = receipts_after.get(mid, 0.0) + float(r.get("quantity", 0))
        except Exception:
            pass

        # Stock adjustments after as_of_date
        #   quantity_after − quantity_before = net change applied AFTER the date
        #   To reverse: subtract that net change from current stock
        #   Exclude void_return — already handled by not counting voided sales above
        adj_after_net: dict = {}  # item_id → net qty change applied after cutoff
        try:
            adj_res = supabase.table("stock_adjustments").select(
                "menu_item_id, quantity_before, quantity_after, adjustment_type"
            ).gt("adjusted_at", after_ts).execute()
            for a in (adj_res.data or []):
                if a.get("adjustment_type") == "void_return":
                    continue
                mid = a.get("menu_item_id")
                if mid:
                    net = float(a.get("quantity_after", 0)) - float(a.get("quantity_before", 0))
                    adj_after_net[mid] = adj_after_net.get(mid, 0.0) + net
        except Exception:
            pass

        # ── 4. Build report rows ──────────────────────────────────────────────
        closing_stock_items = []
        total_cost_value = 0.0
        total_selling_value = 0.0
        low_stock_count = 0
        out_of_stock_count = 0

        for item in items:
            mid = item["id"]
            cost_price   = float(item.get("cost_price") or 0)
            selling_price = float(item.get("base_price") or 0)
            reorder      = float(item.get("reorder_level") or 0)

            if mid in physical_map:
                # Physical count from daily stock take — most accurate
                qty = physical_map[mid]
                source = "stocktake"
            else:
                # Reconstruct: current stock
                #   + sales that happened AFTER as_of_date  (add back — those weren't consumed yet)
                #   − receipts received AFTER as_of_date   (subtract — those hadn't arrived yet)
                #   − net adjustments applied AFTER as_of_date
                current = float(item.get("stock_quantity") or 0)
                qty = (
                    current
                    + sales_after.get(mid, 0.0)
                    - receipts_after.get(mid, 0.0)
                    - adj_after_net.get(mid, 0.0)
                )
                qty = max(0.0, round(qty, 3))
                source = "reconstructed"

            cost_value    = qty * cost_price
            selling_value = qty * selling_price
            total_cost_value    += cost_value
            total_selling_value += selling_value

            if qty <= 0:
                out_of_stock_count += 1
                stock_status = "Out of Stock"
            elif reorder > 0 and qty <= reorder:
                low_stock_count += 1
                stock_status = "Low Stock"
            else:
                stock_status = "In Stock"

            closing_stock_items.append({
                "item_id":          mid,
                "sku":              "",
                "name":             item["name"],
                "category_name":    item.get("category") or "Uncategorized",
                "unit":             item.get("unit") or "piece",
                "closing_quantity": qty,
                "unit_cost":        cost_price,
                "selling_price":    selling_price,
                "closing_value":        round(selling_value, 2),
                "closing_value_cost":   round(cost_value, 2),
                "min_quantity":     reorder,
                "stock_status":     stock_status,
                "source":           source,  # 'stocktake' | 'reconstructed'
            })

        # Sort by category then name for readability
        closing_stock_items.sort(key=lambda x: (x["category_name"], x["name"]))

        today = date_type.today().isoformat()
        is_today = (as_of_date == today)

        return {
            "as_of_date": as_of_date,
            "is_today": is_today,
            "has_stocktake": len(physical_map) > 0,
            "summary": {
                "total_items":        len(closing_stock_items),
                "total_value":        round(total_selling_value, 2),
                "total_cost_value":   round(total_cost_value, 2),
                "total_selling_value": round(total_selling_value, 2),
                "low_stock_items":    low_stock_count,
                "out_of_stock_items": out_of_stock_count,
                "in_stock_items":     len(closing_stock_items) - low_stock_count - out_of_stock_count,
            },
            "items": closing_stock_items,
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate inventory closing stock: {str(e)}"
        )



@router.get("/occupancy-report")
async def get_occupancy_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(["owner", "admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """Generate Occupancy & Room Performance Report"""
    try:
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()

        # Get all rooms (column is 'type' not 'room_type', 'base_price' not 'price_per_night')
        rooms = supabase.table("rooms").select("id, room_number, type, base_price").execute()
        total_rooms = len(rooms.data)

        # Get bookings in period (columns are check_in_date/check_out_date)
        bookings = supabase.table("bookings").select(
            "room_id, check_in_date, check_out_date, total_amount, paid_amount, guests, status"
        ).gte("check_in_date", start_date).lte("check_out_date", end_date).execute()

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
                check_in = datetime.fromisoformat(booking["check_in_date"].replace('Z', '+00:00'))
                check_out = datetime.fromisoformat(booking["check_out_date"].replace('Z', '+00:00'))
                nights = (check_out - check_in).days
                occupied_nights += nights

                # Get room type (column is 'type')
                room = next((r for r in rooms.data if r["id"] == booking["room_id"]), None)
                if room:
                    room_type = room["type"]
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
            type_rooms = len([r for r in rooms.data if r["type"] == room_type])
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
    current_user: dict = Depends(require_role(["owner", "admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """Generate Menu Item Profitability Report"""
    try:
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()

        # Get completed/served orders (items stored as JSON in orders.items)
        orders = supabase.table("orders").select("id, items, total_amount, status").gte(
            "created_at", start_date
        ).lte("created_at", end_date).in_("status", ["completed", "delivered", "served"]).execute()

        if not orders.data:
            return {"period": {"start": start_date, "end": end_date}, "summary": {"total_revenue": 0, "total_cost": 0, "total_profit": 0, "avg_profit_margin": 0}, "items": []}

        # Get menu items for cost data
        menu_items = supabase.table("menu_items").select(
            "id, name, category, base_price"
        ).execute()

        menu_map = {item["id"]: item for item in menu_items.data}

        # Calculate profitability by parsing items JSON from each order
        import json as json_module
        item_stats = {}
        for order in orders.data:
            items_data = order.get("items", [])
            if isinstance(items_data, str):
                try:
                    items_data = json_module.loads(items_data)
                except (json_module.JSONDecodeError, TypeError):
                    items_data = []
            if not isinstance(items_data, list):
                items_data = []

            for item in items_data:
                item_name = item.get("name", "Unknown")
                qty = int(item.get("quantity", 1))
                price = float(item.get("price", 0))
                revenue = price * qty
                # Use menu item cost if available, otherwise estimate at 30%
                menu_id = item.get("menu_item_id", item.get("id", ""))
                menu = menu_map.get(menu_id, {})
                cost_per_unit = float(menu.get("cost", price * 0.3))
                cost = cost_per_unit * qty
                profit = revenue - cost

                if item_name not in item_stats:
                    item_stats[item_name] = {
                        "name": item_name,
                        "category": menu.get("category", "Uncategorized"),
                        "quantity_sold": 0,
                        "revenue": 0,
                        "cost": 0,
                        "profit": 0
                    }

                item_stats[item_name]["quantity_sold"] += qty
                item_stats[item_name]["revenue"] += revenue
                item_stats[item_name]["cost"] += cost
                item_stats[item_name]["profit"] += profit

        # Format results
        profitability_items = []
        for item_key, stats in item_stats.items():
            profit_margin = (stats["profit"] / stats["revenue"] * 100) if stats["revenue"] > 0 else 0
            profitability_items.append({
                "item_id": item_key,
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
    current_user: dict = Depends(require_role(["owner", "admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """Generate Customer Lifetime Value Report using bookings and orders data"""
    try:
        # Get all bookings with customer_id
        bookings = supabase.table("bookings").select(
            "customer_id, total_amount, paid_amount, created_at"
        ).execute()

        # Get all completed/served orders with customer_id
        orders = supabase.table("orders").select(
            "customer_id, total_amount, created_at, status, customer_name, customer_phone"
        ).in_("status", ["completed", "delivered", "served"]).execute()

        # Aggregate by customer_id
        customer_stats = {}

        # Process bookings
        for booking in bookings.data:
            customer_id = booking.get("customer_id")
            if not customer_id:
                continue
            amount = float(booking.get("paid_amount") or booking.get("total_amount") or 0)
            if amount <= 0:
                continue
            created_at = datetime.fromisoformat(booking["created_at"].replace('Z', '+00:00'))

            if customer_id not in customer_stats:
                customer_stats[customer_id] = {
                    "total_spent": 0,
                    "transaction_count": 0,
                    "first_purchase": created_at,
                    "last_purchase": created_at,
                    "name": None,
                    "phone": None
                }

            customer_stats[customer_id]["total_spent"] += amount
            customer_stats[customer_id]["transaction_count"] += 1
            if created_at < customer_stats[customer_id]["first_purchase"]:
                customer_stats[customer_id]["first_purchase"] = created_at
            if created_at > customer_stats[customer_id]["last_purchase"]:
                customer_stats[customer_id]["last_purchase"] = created_at

        # Process orders
        for order in orders.data:
            customer_id = order.get("customer_id")
            if not customer_id:
                continue
            amount = float(order.get("total_amount") or 0)
            if amount <= 0:
                continue
            created_at = datetime.fromisoformat(order["created_at"].replace('Z', '+00:00'))

            if customer_id not in customer_stats:
                customer_stats[customer_id] = {
                    "total_spent": 0,
                    "transaction_count": 0,
                    "first_purchase": created_at,
                    "last_purchase": created_at,
                    "name": order.get("customer_name"),
                    "phone": order.get("customer_phone")
                }

            customer_stats[customer_id]["total_spent"] += amount
            customer_stats[customer_id]["transaction_count"] += 1
            if not customer_stats[customer_id]["name"] and order.get("customer_name"):
                customer_stats[customer_id]["name"] = order.get("customer_name")
            if created_at < customer_stats[customer_id]["first_purchase"]:
                customer_stats[customer_id]["first_purchase"] = created_at
            if created_at > customer_stats[customer_id]["last_purchase"]:
                customer_stats[customer_id]["last_purchase"] = created_at

        # Get user details for those with user IDs
        user_ids = list(customer_stats.keys())
        user_map = {}
        if user_ids:
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
                "name": user.get("full_name") or stats.get("name") or "Unknown",
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate CLV report: {str(e)}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# Balance Sheet Manual Adjustments
# Lets the owner/admin record fixed assets, loans, owner capital & drawings.
# ─────────────────────────────────────────────────────────────────────────────

VALID_SECTIONS = {
    "fixed_assets",     # Land, Building, Equipment, Vehicles
    "other_assets",     # Deposits, Prepaid expenses
    "loans",            # Bank loans, Director loans
    "other_liabilities",# Tax payable, Accruals
    "owner_capital",    # Capital injected by owner
    "owner_drawings",   # Money withdrawn by owner
}

SECTION_LABELS = {
    "fixed_assets":      "Fixed Assets",
    "other_assets":      "Other Assets",
    "loans":             "Loans & Borrowings",
    "other_liabilities": "Other Liabilities",
    "owner_capital":     "Owner's Capital",
    "owner_drawings":    "Owner's Drawings",
}


class AdjustmentCreate(BaseModel):
    section: str
    name: str
    amount: float
    notes: Optional[str] = None


class AdjustmentUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    notes: Optional[str] = None


@router.get("/adjustments")
async def list_adjustments(
    # Owner, Admin, and Manager can VIEW (read-only for manager)
    current_user: dict = Depends(require_role(["owner", "admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """List all balance sheet manual adjustments."""
    try:
        result = supabase.table("balance_sheet_adjustments").select("*").order("section").order("name").execute()
        grouped: dict = {}
        for row in result.data:
            sec = row["section"]
            grouped.setdefault(sec, []).append(row)
        # Return caller's role so the frontend can conditionally show edit controls
        return {
            "adjustments": result.data,
            "by_section": grouped,
            "caller_role": current_user.get("role"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/adjustments", status_code=201)
async def create_adjustment(
    body: AdjustmentCreate,
    # Owner and Admin can ADD entries — Manager cannot
    current_user: dict = Depends(require_role(["owner", "admin"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """Add a new balance sheet adjustment (fixed asset, loan, owner drawing, etc.)."""
    if body.section not in VALID_SECTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid section. Must be one of: {', '.join(VALID_SECTIONS)}")
    result = supabase.table("balance_sheet_adjustments").insert({
        "section": body.section,
        "name": body.name,
        "amount": body.amount,
        "notes": body.notes,
    }).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create adjustment")
    return result.data[0]


@router.patch("/adjustments/{adjustment_id}")
async def update_adjustment(
    adjustment_id: str,
    body: AdjustmentUpdate,
    # Owner and Admin can EDIT — Manager cannot
    current_user: dict = Depends(require_role(["owner", "admin"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """Update an existing balance sheet adjustment."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updated_at"] = datetime.now().isoformat()
    result = supabase.table("balance_sheet_adjustments").update(updates).eq("id", adjustment_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Adjustment not found")
    return result.data[0]


@router.delete("/adjustments/{adjustment_id}", status_code=204)
async def delete_adjustment(
    adjustment_id: str,
    # ONLY the Owner can DELETE — permanent financial records require highest authority
    current_user: dict = Depends(require_role(["owner"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """Delete a balance sheet adjustment. Owner only — preserves audit trail."""
    supabase.table("balance_sheet_adjustments").delete().eq("id", adjustment_id).execute()
    return
