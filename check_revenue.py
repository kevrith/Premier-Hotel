#!/usr/bin/env python3
"""
Quick script to check total revenue from the database
"""
import os
import sys
from supabase import create_client, Client
from decimal import Decimal

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Load environment variables
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), 'backend', '.env'))

def main():
    # Initialize Supabase client
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Error: Missing Supabase configuration")
        return
    
    supabase: Client = create_client(supabase_url, supabase_key)
    
    try:
        # Query all completed payments
        result = supabase.table("payments")\
            .select("amount, payment_method, created_at")\
            .eq("status", "completed")\
            .execute()
        
        payments = result.data
        
        if not payments:
            print("💰 Total Revenue: KSh 0.00")
            print("📊 No completed payments found in the database")
            return
        
        # Calculate total revenue
        total_revenue = sum(Decimal(str(payment["amount"])) for payment in payments)
        
        # Calculate by payment method
        by_method = {}
        for payment in payments:
            method = payment["payment_method"]
            by_method[method] = by_method.get(method, Decimal("0")) + Decimal(str(payment["amount"]))
        
        # Display results
        print("=" * 50)
        print("🏨 PREMIER HOTEL - REVENUE SUMMARY")
        print("=" * 50)
        print(f"💰 Total Revenue: KSh {total_revenue:,.2f}")
        print(f"📈 Total Transactions: {len(payments)}")
        print(f"📊 Average Transaction: KSh {total_revenue / len(payments):,.2f}")
        print()
        print("💳 Revenue by Payment Method:")
        for method, amount in by_method.items():
            percentage = (amount / total_revenue * 100) if total_revenue > 0 else 0
            print(f"  • {method.upper()}: KSh {amount:,.2f} ({percentage:.1f}%)")
        print("=" * 50)
        
    except Exception as e:
        print(f"❌ Error querying database: {e}")

if __name__ == "__main__":
    main()