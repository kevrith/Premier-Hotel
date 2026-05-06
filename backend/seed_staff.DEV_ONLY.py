"""
Seed test staff accounts for development/testing.

Creates one account for each staff role:
  - cleaner   / cleaner@hotel.com    / Cleaner123!
  - waiter    / waiter@hotel.com     / Waiter123!
  - chef      / chef@hotel.com       / Chef123!
  - manager   / manager@hotel.com    / Manager123!

Run from the backend directory:
    ./venv/bin/python3 seed_staff.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from app.core.supabase import SupabaseClient
from app.core.security import get_password_hash

STAFF = [
    # ── Highest privilege ──────────────────────────────────────────────────
    # owner: full access including delete on financial records (balance sheet)
    {
        "email": "owner@premierhotel.com",
        "password": "Owner@123!",
        "full_name": "Hotel Owner",
        "phone": "+254700000099",
        "role": "owner",
    },
    # ── Management ──────────────────────────────────────────────────────────
    # admin: add/edit financial records, full system access (no delete on BS)
    # manager: operational access + read-only on financial records
    {
        "email": "manager@hotel.com",
        "password": "Manager123!",
        "full_name": "David Manager",
        "phone": "+254700000004",
        "role": "manager",
    },
    # ── Operations ──────────────────────────────────────────────────────────
    {
        "email": "chef@hotel.com",
        "password": "Chef123!",
        "full_name": "Carol Chef",
        "phone": "+254700000003",
        "role": "chef",
    },
    {
        "email": "waiter@hotel.com",
        "password": "Waiter123!",
        "full_name": "Bob Waiter",
        "phone": "+254700000002",
        "role": "waiter",
    },
    {
        "email": "cleaner@hotel.com",
        "password": "Cleaner123!",
        "full_name": "Alice Cleaner",
        "phone": "+254700000001",
        "role": "cleaner",
    },
]


def seed():
    supabase = SupabaseClient.get_admin_client()

    for staff in STAFF:
        email = staff["email"]

        # Check if already exists
        existing = supabase.table("users").select("id").eq("email", email).execute()
        if existing.data:
            print(f"  SKIP  {email} (already exists)")
            continue

        result = supabase.table("users").insert({
            "email": email,
            "full_name": staff["full_name"],
            "phone": staff["phone"],
            "password_hash": get_password_hash(staff["password"]),
            "role": staff["role"],
            "email_verified": True,
            "phone_verified": True,
            "is_verified": True,
            "status": "active",
        }).execute()

        if result.data:
            print(f"  OK    {staff['role']:<10}  {email}  /  {staff['password']}")
        else:
            print(f"  FAIL  {email}")

    print("\nDone. Login at http://localhost:5173/login")


if __name__ == "__main__":
    seed()
