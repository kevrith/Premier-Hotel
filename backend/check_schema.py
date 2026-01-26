#!/usr/bin/env python3
"""
Check Database Schema - Verify the actual structure of the orders table
"""
import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def main():
    # Initialize Supabase client with service role key (admin privileges)
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not service_key:
        print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file")
        sys.exit(1)
    
    supabase: Client = create_client(supabase_url, service_key)
    
    print("🔍 Checking orders table schema...")
    
    try:
        # Get a sample order to see what columns exist
        sample_response = supabase.table("orders").select("*").limit(1).execute()
        
        if sample_response.data:
            sample_order = sample_response.data[0]
            print("📋 Current orders table columns:")
            for key, value in sample_order.items():
                print(f"  - {key}: {type(value).__name__} = {value}")
        else:
            print("❌ No orders found in database")
            
        # Also try to get just the column names by selecting specific fields
        print("\n🔍 Testing specific column access...")
        
        # Test if total_amount exists
        try:
            total_test = supabase.table("orders").select("total_amount").limit(1).execute()
            print("✅ 'total_amount' column exists")
        except Exception as e:
            print(f"❌ 'total_amount' column issue: {str(e)}")
            
        # Test if total exists
        try:
            total_test = supabase.table("orders").select("total").limit(1).execute()
            print("✅ 'total' column exists")
        except Exception as e:
            print(f"❌ 'total' column issue: {str(e)}")
            
        # Test timestamp columns
        timestamp_columns = ['confirmed_at', 'preparing_started_at', 'ready_at', 'served_at', 'completed_at', 'cancelled_at']
        for col in timestamp_columns:
            try:
                test = supabase.table("orders").select(col).limit(1).execute()
                print(f"✅ '{col}' column exists")
            except Exception as e:
                print(f"❌ '{col}' column issue: {str(e)}")
                
    except Exception as e:
        print(f"❌ Error checking schema: {str(e)}")

if __name__ == "__main__":
    main()