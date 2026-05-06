"""
Daily backup email script — run by the Render cron job every day at 09:00 UTC (12:00 EAT).

Usage (manual):
    cd backend
    ./venv/bin/python3 send_backup_email.py

Environment variables required (set in Render dashboard):
    SUPABASE_URL, SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY),
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, BACKUP_EMAIL_RECIPIENT
"""

import json
import logging
import os
import smtplib
import sys
from datetime import datetime
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

from app.core.supabase import SupabaseClient

TABLES = [
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


def build_backup() -> dict:
    supabase = SupabaseClient.get_admin_client()
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    data = {"timestamp": timestamp, "generated_at": datetime.utcnow().isoformat() + "Z", "tables": {}}

    for table in TABLES:
        try:
            result = supabase.table(table).select("*").execute()
            rows = result.data or []
            data["tables"][table] = rows
            logger.info("  OK  %-30s %d rows", table, len(rows))
        except Exception as exc:
            logger.warning("  --  %-30s skipped (%s)", table, exc)
            data["tables"][table] = []

    data["row_totals"] = {t: len(r) for t, r in data["tables"].items()}
    data["total_rows"] = sum(data["row_totals"].values())
    return data


def send_email(backup_data: dict, recipient: str) -> bool:
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")

    if not smtp_user or not smtp_pass:
        logger.error("SMTP_USER / SMTP_PASSWORD not set — cannot send email")
        return False

    timestamp = backup_data["timestamp"]
    date_label = f"{timestamp[:4]}-{timestamp[4:6]}-{timestamp[6:8]}"
    filename = f"premier_hotel_backup_{timestamp}.json"
    json_bytes = json.dumps(backup_data, indent=2, default=str).encode("utf-8")

    msg = MIMEMultipart()
    msg["Subject"] = f"Premier Hotel — Daily Backup {date_label}"
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
        "Keep this email — it contains everything needed to restore the database."
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


if __name__ == "__main__":
    recipient = os.getenv("BACKUP_EMAIL_RECIPIENT") or os.getenv("SMTP_USER")
    if not recipient:
        logger.error("BACKUP_EMAIL_RECIPIENT env var not set")
        sys.exit(1)

    logger.info("Building backup…")
    backup_data = build_backup()
    logger.info("Total rows: %d", backup_data["total_rows"])

    logger.info("Sending email to %s…", recipient)
    ok = send_email(backup_data, recipient)
    sys.exit(0 if ok else 1)
