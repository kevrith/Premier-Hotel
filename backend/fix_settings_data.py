#!/usr/bin/env python3
"""Fix hotel_settings table"""
import asyncio
from app.core.supabase import get_supabase_admin

async def fix_table():
    supabase = get_supabase_admin()
    
    try:
        # Delete existing records
        supabase.table("hotel_settings").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print("✓ Cleared existing records")
        
        # Insert default config
        result = supabase.table("hotel_settings").insert({
            "setting_key": "tax_config",
            "setting_value": {
                "vat_enabled": True,
                "vat_rate": 0.16,
                "tourism_levy_enabled": False,
                "tourism_levy_rate": 0.02,
                "tax_inclusive": True
            }
        }).execute()
        
        print("✓ Inserted default tax config")
        print(f"Result: {result.data}")
        
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == "__main__":
    asyncio.run(fix_table())
