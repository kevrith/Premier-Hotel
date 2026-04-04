"""
Daily Stock Taking Endpoint
Automates the kitchen and bar daily stock sheets
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timezone, date, timedelta
from supabase import Client
from pydantic import BaseModel
from app.core.supabase import get_supabase_admin
from app.middleware.auth_secure import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


class StockItemEntry(BaseModel):
    menu_item_id: Optional[str] = None
    item_name: str
    physical_closing: float
    lost: Optional[float] = 0
    notes: Optional[str] = None
    reason: Optional[str] = None  # discrepancy reason code


class SubmitStockTakeRequest(BaseModel):
    session_date: str  # YYYY-MM-DD
    session_type: str = "all"  # "kitchen", "bar", "all"
    items: List[StockItemEntry]
    notes: Optional[str] = None
    location_id: Optional[str] = None  # per-location stock (multi-location)


@router.get("/sheet")
async def get_stock_sheet(
    stock_date: str = Query(default=None, description="Date YYYY-MM-DD, defaults to today"),
    session_type: str = Query(default="all"),
    location_id: Optional[str] = Query(default=None, description="Location UUID for per-location stock"),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """
    Get the daily stock sheet for a given date.
    Pre-fills: opening stock (previous closing or current), purchases, system sales.
    When location_id is provided, uses per-location stock from location_stock table.
    """
    if not stock_date:
        stock_date = date.today().isoformat()

    stock_date_obj = date.fromisoformat(stock_date)
    prev_date = (stock_date_obj - timedelta(days=1)).isoformat()

    # Bar categories used for auto-detection when stock_department is not set
    BAR_CATEGORIES = {
        "drinks", "beverages", "beverage", "bar", "alcohol", "cocktails",
        "cocktail", "spirits", "spirit", "beer", "wine", "wines",
        "soda", "juice", "juices", "water", "soft drinks", "soft drink",
    }

    def item_department(item: dict) -> str:
        """Resolve an item's department: explicit setting wins, otherwise auto-detect from category."""
        dept = (item.get("stock_department") or "").lower().strip()
        if dept in ("kitchen", "bar", "both"):
            return dept
        # Auto-detect
        cat = (item.get("category") or "").lower().strip()
        return "bar" if cat in BAR_CATEGORIES else "kitchen"

    # Resolve location info for per-location mode
    location_info = None
    location_type_filter = None  # 'bar' | 'kitchen' | None
    if location_id:
        loc_res = supabase.table("locations").select("*").eq("id", location_id).execute()
        if loc_res.data:
            location_info = loc_res.data[0]
            location_type_filter = location_info.get("type")  # 'bar' | 'kitchen' | 'store'

    # Get all tracked menu items
    items_res = supabase.table("menu_items").select(
        "id, name, category, stock_quantity, reorder_level, unit, cost_price, base_price, track_inventory, stock_department"
    ).or_("track_inventory.eq.true,stock_quantity.gt.0").order("category,name").execute()
    all_items = items_res.data or []

    # When operating in location mode, filter items by location type
    effective_session_type = session_type
    if location_type_filter == "bar":
        effective_session_type = "bar"
    elif location_type_filter == "kitchen":
        effective_session_type = "kitchen"

    # Filter by session_type
    if effective_session_type == "kitchen":
        menu_items = [i for i in all_items if item_department(i) in ("kitchen", "both")]
    elif effective_session_type == "bar":
        menu_items = [i for i in all_items if item_department(i) in ("bar", "both")]
    else:
        menu_items = all_items

    # Get per-location stock quantities when location_id is provided
    location_stock_map: dict = {}
    if location_id:
        ls_res = supabase.table("location_stock").select(
            "menu_item_id, quantity, reorder_level, cost_price"
        ).eq("location_id", location_id).execute()
        for ls in (ls_res.data or []):
            location_stock_map[ls["menu_item_id"]] = ls

    # Get purchases (stock_receipts) for this date
    receipts_res = supabase.table("stock_receipts").select(
        "menu_item_id, quantity, unit_cost, total_cost"
    ).gte("received_at", f"{stock_date}T00:00:00").lte("received_at", f"{stock_date}T23:59:59").execute()

    purchases_by_item = {}
    for r in (receipts_res.data or []):
        mid = r["menu_item_id"]
        purchases_by_item[mid] = purchases_by_item.get(mid, 0) + float(r.get("quantity", 0))

    # Get system sales for this date from orders
    # When location_id provided, filter orders by bar_location_id
    orders_query = supabase.table("orders").select(
        "items, status, bar_location_id"
    ).gte("created_at", f"{stock_date}T00:00:00").lte("created_at", f"{stock_date}T23:59:59").in_(
        "status", ["served", "completed", "delivered", "paid"]
    )
    if location_id:
        orders_query = orders_query.eq("bar_location_id", location_id)
    orders_res = orders_query.execute()

    system_sales_by_item = {}
    for order in (orders_res.data or []):
        items_list = order.get("items", []) or []
        if isinstance(items_list, list):
            for oi in items_list:
                mid = oi.get("menu_item_id") or oi.get("id")
                qty = float(oi.get("quantity", 0))
                if mid:
                    system_sales_by_item[mid] = system_sales_by_item.get(mid, 0) + qty

    # Check for existing session (already submitted today)
    existing_session = None
    existing_items_map = {}
    try:
        session_query = supabase.table("daily_stock_sessions").select("*").eq(
            "session_date", stock_date
        ).eq("session_type", effective_session_type)
        if location_id:
            session_query = session_query.eq("location_id", location_id)
        session_res = session_query.execute()
        if session_res.data:
            existing_session = session_res.data[0]
            items_res2 = supabase.table("daily_stock_items").select("*").eq(
                "session_id", existing_session["id"]
            ).execute()
            for it in (items_res2.data or []):
                existing_items_map[it.get("menu_item_id", it["item_name"])] = it
    except Exception:
        pass

    # Get yesterday's closing stock (from previous session)
    prev_closing_map = {}
    try:
        prev_query = supabase.table("daily_stock_sessions").select("id").eq(
            "session_date", prev_date
        ).eq("session_type", effective_session_type)
        if location_id:
            prev_query = prev_query.eq("location_id", location_id)
        prev_session_res = prev_query.execute()
        if prev_session_res.data:
            prev_items_res = supabase.table("daily_stock_items").select(
                "menu_item_id, physical_closing"
            ).eq("session_id", prev_session_res.data[0]["id"]).execute()
            for it in (prev_items_res.data or []):
                if it.get("menu_item_id") and it.get("physical_closing") is not None:
                    prev_closing_map[it["menu_item_id"]] = float(it["physical_closing"])
    except Exception:
        pass

    # Build sheet rows
    sheet_items = []
    for item in menu_items:
        mid = item["id"]

        # Opening stock: per-location or global
        if location_id and mid in location_stock_map:
            current_qty = float(location_stock_map[mid].get("quantity") or 0)
        else:
            current_qty = float(item.get("stock_quantity") or 0)

        purchases = purchases_by_item.get(mid, 0)

        # Opening stock logic:
        # 1. If yesterday's physical closing exists → use it (most accurate)
        # 2. If no previous session → derive from current stock minus today's purchases
        #    (avoids double-counting: current_qty already includes today's receives)
        if mid in prev_closing_map:
            opening = prev_closing_map[mid]
        else:
            opening = max(0.0, current_qty - purchases)

        total = opening + purchases
        sys_sales = system_sales_by_item.get(mid, 0)
        calc_closing = max(0, total - sys_sales)

        # Reorder level — prefer location-specific if available
        if location_id and mid in location_stock_map:
            reorder = float(location_stock_map[mid].get("reorder_level") or 0)
        else:
            reorder = float(item.get("reorder_level") or 0)

        # If there's an existing session entry use it
        existing = existing_items_map.get(mid)
        physical_closing = None
        lost = 0
        discrepancy = None
        reason = None
        if existing:
            physical_closing = existing.get("physical_closing")
            lost = float(existing.get("lost") or 0)
            reason = existing.get("reason")
            if physical_closing is not None:
                physical_closing = float(physical_closing)
                discrepancy = physical_closing - calc_closing

        # Stock status
        check_qty = physical_closing if physical_closing is not None else calc_closing
        if check_qty <= 0:
            stock_status = "out_of_stock"
        elif reorder > 0 and check_qty <= reorder:
            stock_status = "low_stock"
        else:
            stock_status = "in_stock"

        sheet_items.append({
            "menu_item_id": mid,
            "item_name": item["name"],
            "category": item.get("category") or "Uncategorized",
            "unit": item.get("unit") or "piece",
            "reorder_level": reorder,
            "cost_price": float(item.get("cost_price") or 0),
            "selling_price": float(item.get("base_price") or 0),
            "opening_stock": round(opening, 3),
            "purchases": round(purchases, 3),
            "total_stock": round(total, 3),
            "system_sales": round(sys_sales, 3),
            "calculated_closing": round(calc_closing, 3),
            "physical_closing": physical_closing,
            "lost": lost,
            "reason": reason,
            "discrepancy": round(discrepancy, 3) if discrepancy is not None else None,
            "stock_status": stock_status,
            "is_low_stock": stock_status in ("low_stock", "out_of_stock"),
            "stock_department": item_department(item),
        })

    # Summary stats
    low_stock_items = [i for i in sheet_items if i["stock_status"] in ("low_stock", "out_of_stock")]
    items_with_discrepancy = [i for i in sheet_items if i.get("discrepancy") is not None and abs(i["discrepancy"]) > 0.01]

    return {
        "session_date": stock_date,
        "session_type": effective_session_type,
        "location_id": location_id,
        "location": location_info,
        "existing_session": existing_session,
        "items": sheet_items,
        "summary": {
            "total_items": len(sheet_items),
            "low_stock_count": len([i for i in sheet_items if i["stock_status"] == "low_stock"]),
            "out_of_stock_count": len([i for i in sheet_items if i["stock_status"] == "out_of_stock"]),
            "discrepancy_count": len(items_with_discrepancy),
            "total_system_sales": round(sum(i["system_sales"] for i in sheet_items), 2),
        },
        "low_stock_alerts": [
            {
                "name": i["item_name"],
                "category": i["category"],
                "quantity": i.get("physical_closing") if i.get("physical_closing") is not None else i["calculated_closing"],
                "unit": i["unit"],
                "reorder_level": i["reorder_level"],
                "status": i["stock_status"],
            }
            for i in low_stock_items
        ],
    }


@router.post("/submit")
async def submit_stock_take(
    req: SubmitStockTakeRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Submit the physical stock count for a day."""
    try:
        user_role = current_user.get("role", "")
        if user_role not in ["admin", "manager", "waiter", "chef", "barman", "staff"]:
            raise HTTPException(status_code=403, detail="Not authorized to submit stock takes")

        # Get system sales for this date (best-effort — don't fail if orders table is slow)
        system_sales_by_item: dict = {}
        try:
            orders_res = supabase.table("orders").select(
                "items, status"
            ).gte("created_at", f"{req.session_date}T00:00:00").lte("created_at", f"{req.session_date}T23:59:59").in_(
                "status", ["served", "completed", "delivered", "paid"]
            ).execute()
            for order in (orders_res.data or []):
                items_list = order.get("items", []) or []
                if isinstance(items_list, list):
                    for oi in items_list:
                        mid = oi.get("menu_item_id") or oi.get("id")
                        qty = float(oi.get("quantity", 0))
                        if mid:
                            system_sales_by_item[mid] = system_sales_by_item.get(mid, 0) + qty
        except Exception:
            pass  # System sales are informational — don't block submission

        # Get purchases for this date (best-effort)
        purchases_by_item: dict = {}
        try:
            receipts_res = supabase.table("stock_receipts").select(
                "menu_item_id, quantity"
            ).gte("received_at", f"{req.session_date}T00:00:00").lte("received_at", f"{req.session_date}T23:59:59").execute()
            for r in (receipts_res.data or []):
                mid = r["menu_item_id"]
                purchases_by_item[mid] = purchases_by_item.get(mid, 0) + float(r.get("quantity", 0))
        except Exception:
            pass

        # Get current stock quantities for opening (batch by chunks to avoid URL length limits)
        opening_map: dict = {}
        item_ids = [i.menu_item_id for i in req.items if i.menu_item_id]
        try:
            for chunk_start in range(0, len(item_ids), 50):
                chunk = item_ids[chunk_start:chunk_start + 50]
                chunk_res = supabase.table("menu_items").select("id, stock_quantity").in_("id", chunk).execute()
                for it in (chunk_res.data or []):
                    opening_map[it["id"]] = float(it.get("stock_quantity") or 0)
        except Exception:
            pass

        # Upsert session
        session_id: str
        session_q = supabase.table("daily_stock_sessions").select("id").eq(
            "session_date", req.session_date
        ).eq("session_type", req.session_type)
        if req.location_id:
            session_q = session_q.eq("location_id", req.location_id)
        else:
            session_q = session_q.is_("location_id", "null")
        existing = session_q.execute()

        if existing.data:
            session_id = existing.data[0]["id"]
            supabase.table("daily_stock_sessions").update({
                "status": "submitted",
                "submitted_by": current_user.get("id"),
                "notes": req.notes,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", session_id).execute()
        else:
            ins: dict = {
                "session_date": req.session_date,
                "session_type": req.session_type,
                "status": "submitted",
                "submitted_by": current_user.get("id"),
                "notes": req.notes,
            }
            if req.location_id:
                ins["location_id"] = req.location_id
            res = supabase.table("daily_stock_sessions").insert(ins).execute()
            if not res.data:
                raise HTTPException(status_code=500, detail="Session insert returned no data — check DB constraints")
            session_id = res.data[0]["id"]

        # Delete existing items for this session and re-insert
        try:
            supabase.table("daily_stock_items").delete().eq("session_id", session_id).execute()
        except Exception:
            pass

        # Build items payload
        items_to_insert = []
        now_iso = datetime.now(timezone.utc).isoformat()
        for item in req.items:
            mid = item.menu_item_id
            opening = opening_map.get(mid, 0) if mid else 0
            purchases = purchases_by_item.get(mid, 0) if mid else 0
            sys_sales = system_sales_by_item.get(mid, 0) if mid else 0

            items_to_insert.append({
                "session_id": session_id,
                "menu_item_id": mid,
                "item_name": item.item_name,
                "unit": "piece",
                "opening_stock": opening,
                "purchases": purchases,
                "system_sales": sys_sales,
                "physical_closing": item.physical_closing,
                "lost": item.lost or 0,
                "notes": item.notes,
                "reason": item.reason,
            })

            # Update location/global stock with physical count (best-effort per item)
            if mid:
                try:
                    if req.location_id:
                        ls_existing = supabase.table("location_stock").select("id").eq(
                            "location_id", req.location_id
                        ).eq("menu_item_id", mid).execute()
                        if ls_existing.data:
                            supabase.table("location_stock").update({
                                "quantity": item.physical_closing,
                                "item_name": item.item_name,
                                "updated_at": now_iso,
                            }).eq("id", ls_existing.data[0]["id"]).execute()
                        else:
                            supabase.table("location_stock").insert({
                                "location_id": req.location_id,
                                "menu_item_id": mid,
                                "item_name": item.item_name,
                                "quantity": item.physical_closing,
                                "updated_at": now_iso,
                            }).execute()
                    else:
                        supabase.table("menu_items").update({
                            "stock_quantity": item.physical_closing,
                            "is_available": item.physical_closing > 0,
                        }).eq("id", mid).execute()
                except Exception:
                    pass

        # Insert items in batches of 100 to avoid payload size limits
        if items_to_insert:
            try:
                for chunk_start in range(0, len(items_to_insert), 100):
                    chunk = items_to_insert[chunk_start:chunk_start + 100]
                    supabase.table("daily_stock_items").insert(chunk).execute()
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to save stock items: {str(e)}")

        # ── Sync global menu_items.stock_quantity after per-location stock take ──
        # Sum quantities across BAR locations only for each submitted item,
        # then write that combined total back to menu_items so "Current Stock" tab
        # reflects the true physical count across bars.
        # Central Store and Kitchen are excluded — they have their own stock flow.
        if req.location_id and item_ids:
            try:
                # Get IDs of all bar-type locations only
                bar_locs_res = supabase.table("locations").select("id").eq("type", "bar").eq("is_active", True).execute()
                bar_loc_ids = [loc["id"] for loc in (bar_locs_res.data or [])]

                if bar_loc_ids:
                    combined: dict = {}  # menu_item_id → combined qty across bars only
                    for chunk_start in range(0, len(item_ids), 50):
                        chunk = item_ids[chunk_start:chunk_start + 50]
                        ls_all = supabase.table("location_stock").select(
                            "menu_item_id, quantity, location_id"
                        ).in_("menu_item_id", chunk).in_("location_id", bar_loc_ids).execute()
                        for row in (ls_all.data or []):
                            mid = row["menu_item_id"]
                            combined[mid] = combined.get(mid, 0.0) + float(row.get("quantity") or 0)

                    # Update menu_items.stock_quantity for each item
                    for mid, total_qty in combined.items():
                        supabase.table("menu_items").update({
                            "stock_quantity": round(total_qty, 3),
                            "is_available": total_qty > 0,
                        }).eq("id", mid).execute()

                    logger.info(f"[STOCK] ✅ Synced global stock for {len(combined)} items from {len(bar_loc_ids)} bar locations")
            except Exception as sync_err:
                logger.warning(f"[STOCK] ⚠️ Global stock sync failed: {sync_err}")
                # Don't fail the submission — sync is a best-effort post-step

        return {
            "success": True,
            "session_id": session_id,
            "session_date": req.session_date,
            "items_recorded": len(items_to_insert),
            "message": f"Stock take submitted for {req.session_date}",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"submit_stock_take error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Stock take failed: {str(e)}")


@router.get("/alerts")
async def get_low_stock_alerts(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Get low stock alerts — used by chef dashboard on login."""
    items_res = supabase.table("menu_items").select(
        "id, name, category, stock_quantity, reorder_level, unit, track_inventory"
    ).or_("track_inventory.eq.true,stock_quantity.gt.0").execute()

    items = items_res.data or []
    alerts = []
    for item in items:
        qty = float(item.get("stock_quantity") or 0)
        reorder = float(item.get("reorder_level") or 0)
        if qty <= 0:
            alerts.append({**item, "alert_type": "out_of_stock", "stock_quantity": qty})
        elif reorder > 0 and qty <= reorder:
            alerts.append({**item, "alert_type": "low_stock", "stock_quantity": qty})

    alerts.sort(key=lambda x: (0 if x["alert_type"] == "out_of_stock" else 1, x["stock_quantity"]))
    return {
        "total_alerts": len(alerts),
        "out_of_stock": [a for a in alerts if a["alert_type"] == "out_of_stock"],
        "low_stock": [a for a in alerts if a["alert_type"] == "low_stock"],
    }


@router.get("/rollup")
async def get_bar_rollup(
    stock_date: str = Query(default=None),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """
    Returns Bar A + Bar B physical counts side-by-side, with a combined total per item.
    Used for the combined stock view.
    """
    if not stock_date:
        stock_date = date.today().isoformat()

    # Fetch all bar locations
    locs_res = supabase.table("locations").select("*").eq("type", "bar").eq("is_active", True).order("name").execute()
    bar_locations = locs_res.data or []

    if not bar_locations:
        return {"date": stock_date, "locations": [], "items": [], "summary": {}}

    # For each bar location, get the latest submitted session items
    location_data: dict[str, dict] = {}  # location_id -> {name, items_map}
    all_item_ids: set = set()

    for loc in bar_locations:
        lid = loc["id"]
        session_res = supabase.table("daily_stock_sessions").select("id, status").eq(
            "session_date", stock_date
        ).eq("location_id", lid).execute()

        items_map: dict = {}
        if session_res.data:
            sid = session_res.data[0]["id"]
            items_res = supabase.table("daily_stock_items").select(
                "menu_item_id, item_name, category, unit, opening_stock, purchases, system_sales, physical_closing, lost"
            ).eq("session_id", sid).execute()
            for it in (items_res.data or []):
                mid = it["menu_item_id"]
                if mid:
                    items_map[mid] = it
                    all_item_ids.add(mid)
        else:
            # No session yet — pull from location_stock for current quantities
            ls_res = supabase.table("location_stock").select(
                "menu_item_id, item_name, category, unit, quantity"
            ).eq("location_id", lid).execute()
            for ls in (ls_res.data or []):
                mid = ls["menu_item_id"]
                if mid:
                    items_map[mid] = {
                        "menu_item_id": mid,
                        "item_name": ls.get("item_name", ""),
                        "category": ls.get("category", ""),
                        "unit": ls.get("unit", "piece"),
                        "opening_stock": float(ls.get("quantity") or 0),
                        "purchases": 0,
                        "system_sales": 0,
                        "physical_closing": None,
                        "lost": 0,
                    }
                    all_item_ids.add(mid)

        location_data[lid] = {"location": loc, "items_map": items_map}

    # Get item metadata for all referenced items
    item_meta: dict = {}
    if all_item_ids:
        meta_res = supabase.table("menu_items").select(
            "id, name, category, unit, cost_price, reorder_level"
        ).in_("id", list(all_item_ids)).execute()
        for m in (meta_res.data or []):
            item_meta[m["id"]] = m

    # Build combined rows
    combined_rows = []
    for mid in sorted(all_item_ids):
        meta = item_meta.get(mid, {})
        row: dict = {
            "menu_item_id": mid,
            "item_name": meta.get("name") or next(
                (location_data[lid]["items_map"][mid]["item_name"]
                 for lid in location_data if mid in location_data[lid]["items_map"]), ""
            ),
            "category": meta.get("category") or "",
            "unit": meta.get("unit") or "piece",
            "cost_price": float(meta.get("cost_price") or 0),
            "reorder_level": float(meta.get("reorder_level") or 0),
            "locations": {},
            "combined_physical": 0.0,
            "combined_opening": 0.0,
            "combined_purchases": 0.0,
            "combined_sales": 0.0,
        }

        has_any_physical = False
        for lid, ld in location_data.items():
            it = ld["items_map"].get(mid)
            phys = float(it["physical_closing"]) if it and it.get("physical_closing") is not None else None
            opening = float(it["opening_stock"]) if it else 0.0
            purchases = float(it["purchases"]) if it else 0.0
            sales = float(it["system_sales"]) if it else 0.0
            lost = float(it["lost"]) if it else 0.0

            row["locations"][lid] = {
                "location_name": ld["location"]["name"],
                "opening_stock": round(opening, 3),
                "purchases": round(purchases, 3),
                "system_sales": round(sales, 3),
                "physical_closing": phys,
                "lost": round(lost, 3),
            }

            if phys is not None:
                row["combined_physical"] += phys
                has_any_physical = True
            row["combined_opening"] += opening
            row["combined_purchases"] += purchases
            row["combined_sales"] += sales

        if not has_any_physical:
            row["combined_physical"] = None

        combined_rows.append(row)

    # Sort by category then name
    combined_rows.sort(key=lambda r: (r["category"], r["item_name"]))

    return {
        "date": stock_date,
        "locations": [ld["location"] for ld in location_data.values()],
        "items": combined_rows,
        "summary": {
            "total_items": len(combined_rows),
            "locations_count": len(bar_locations),
            "total_combined_physical": round(
                sum(r["combined_physical"] for r in combined_rows if r["combined_physical"] is not None), 2
            ),
        },
    }


@router.get("/history")
async def get_stock_take_history(
    days: int = Query(default=7),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Get stock take session history."""
    start_date = (date.today() - timedelta(days=days)).isoformat()
    sessions_res = supabase.table("daily_stock_sessions").select("*").gte(
        "session_date", start_date
    ).order("session_date", desc=True).execute()
    return sessions_res.data or []
