"""
Backup Management Endpoints — admin-only.

GET  /api/v1/admin/backup/download  → download full JSON backup immediately
POST /api/v1/admin/backup/email     → email backup to configured admin address
"""

import io
import json
import logging
import smtplib
from datetime import datetime
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.core.supabase import get_supabase_admin
from app.middleware.auth_secure import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

# Tables included in every backup
BACKUP_TABLES = [
    "menu_items",
    "rooms",
    "bookings",
    "orders",
    "bills",
    "users",
    "location_stock",
    "kitchen_stock",
    "ingredients_stock",
    "utensils_stock",
    "office_stock",
    "expenses",
    "restaurant_tables",
    "hotel_settings",
    "discounts",
    "recipes",
]


async def _require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


def _build_backup(supabase) -> dict:
    """Query all backup tables and return a dict ready to serialise."""
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    data: dict = {"timestamp": timestamp, "generated_at": datetime.utcnow().isoformat() + "Z", "tables": {}}

    for table in BACKUP_TABLES:
        try:
            result = supabase.table(table).select("*").execute()
            rows = result.data or []
            data["tables"][table] = rows
            logger.info("Backup: %s — %d rows", table, len(rows))
        except Exception as exc:
            logger.warning("Backup: skipped %s (%s)", table, exc)
            data["tables"][table] = []

    data["row_totals"] = {t: len(r) for t, r in data["tables"].items()}
    data["total_rows"] = sum(data["row_totals"].values())
    return data


def _send_backup_email(backup_data: dict, recipient: str) -> bool:
    """Send the backup JSON as an email attachment. Returns True on success."""
    smtp_host = getattr(settings, "SMTP_HOST", "smtp.gmail.com")
    smtp_port = getattr(settings, "SMTP_PORT", 587)
    smtp_user = getattr(settings, "SMTP_USER", None)
    smtp_pass = getattr(settings, "SMTP_PASSWORD", None)

    if not smtp_user or not smtp_pass:
        logger.error("SMTP credentials not configured — cannot send backup email")
        return False

    timestamp = backup_data["timestamp"]
    filename = f"premier_hotel_backup_{timestamp}.json"
    json_bytes = json.dumps(backup_data, indent=2, default=str).encode("utf-8")

    msg = MIMEMultipart()
    msg["Subject"] = f"Premier Hotel — Daily Backup {timestamp[:8]}"
    msg["From"] = f"Premier Hotel System <{smtp_user}>"
    msg["To"] = recipient

    total = backup_data.get("total_rows", 0)
    body = (
        f"Automated daily backup from Premier Hotel.\n\n"
        f"Date: {backup_data.get('generated_at', timestamp)}\n"
        f"Total rows backed up: {total}\n\n"
        f"Tables included:\n"
        + "\n".join(f"  • {t}: {c} rows" for t, c in backup_data.get("row_totals", {}).items())
        + "\n\nThe full backup is attached as a JSON file.\n"
        "To restore, open Supabase SQL Editor and run the restore queries from the backup file."
    )
    msg.attach(MIMEText(body, "plain"))

    attachment = MIMEApplication(json_bytes, Name=filename)
    attachment["Content-Disposition"] = f'attachment; filename="{filename}"'
    msg.attach(attachment)

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        logger.info("Backup email sent to %s", recipient)
        return True
    except Exception as exc:
        logger.error("Failed to send backup email: %s", exc)
        return False


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/download", summary="Download full database backup as JSON")
async def download_backup(
    _admin=Depends(_require_admin),
    supabase=Depends(get_supabase_admin),
):
    """
    Admin only. Returns a timestamped JSON file containing every row from all
    critical tables. Use this before making schema changes or as an on-demand snapshot.
    """
    try:
        backup_data = _build_backup(supabase)
    except Exception as exc:
        logger.error("Backup generation failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Backup failed: {exc}")

    timestamp = backup_data["timestamp"]
    filename = f"premier_hotel_backup_{timestamp}.json"
    json_bytes = json.dumps(backup_data, indent=2, default=str).encode("utf-8")

    return StreamingResponse(
        io.BytesIO(json_bytes),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/email", summary="Email backup to admin address")
async def email_backup(
    _admin=Depends(_require_admin),
    supabase=Depends(get_supabase_admin),
):
    """
    Admin only. Generates a full backup and emails it to the configured admin
    address (SMTP_USER in server settings). Use this to trigger a manual email
    backup outside of the daily scheduled run.
    """
    try:
        backup_data = _build_backup(supabase)
    except Exception as exc:
        logger.error("Backup generation failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Backup failed: {exc}")

    recipient = getattr(settings, "SMTP_USER", None)
    if not recipient:
        raise HTTPException(status_code=500, detail="Email not configured on server")

    success = _send_backup_email(backup_data, recipient)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send backup email — check SMTP settings")

    return {
        "message": f"Backup emailed to {recipient}",
        "total_rows": backup_data["total_rows"],
        "timestamp": backup_data["timestamp"],
    }
