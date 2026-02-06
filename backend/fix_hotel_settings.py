#!/usr/bin/env python3
"""Fix hotel_settings table foreign key reference"""
import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

try:
    # Drop and recreate table
    cur.execute("""
        DROP TABLE IF EXISTS public.hotel_settings CASCADE;
        
        CREATE TABLE public.hotel_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          setting_key TEXT UNIQUE NOT NULL,
          setting_value JSONB NOT NULL,
          updated_by UUID REFERENCES public.profiles(id),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        INSERT INTO public.hotel_settings (setting_key, setting_value) VALUES
        ('tax_config', '{
          "vat_enabled": true,
          "vat_rate": 0.16,
          "tourism_levy_enabled": false,
          "tourism_levy_rate": 0.02,
          "tax_inclusive": true
        }'::jsonb);
    """)
    
    conn.commit()
    print("✓ hotel_settings table fixed successfully")
    
except Exception as e:
    conn.rollback()
    print(f"✗ Error: {e}")
finally:
    cur.close()
    conn.close()
