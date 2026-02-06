#!/usr/bin/env python3
"""Check monthly revenue data for sales projection"""
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

print("\n📊 CHECKING MONTHLY REVENUE DATA FOR SALES PROJECTION")
print("=" * 70)

# Get orders from last 6 months grouped by month
end_date = datetime.now()
start_date = end_date - timedelta(days=180)

print(f"\nDate range: {start_date.date()} to {end_date.date()}")

# Get all orders
response = supabase.table("orders").select("total_amount, created_at, status").gte(
    "created_at", start_date.isoformat()
).execute()

if not response.data:
    print("\n❌ No orders found in the last 6 months")
    print("\n💡 SOLUTION: Sales projection needs at least 3 months of order data")
    print("   Create more orders across different months to see projections")
else:
    # Group by month
    monthly_data = {}
    for order in response.data:
        created = datetime.fromisoformat(order['created_at'].replace('Z', '+00:00'))
        month_key = created.strftime('%Y-%m')
        
        if month_key not in monthly_data:
            monthly_data[month_key] = {'total': 0, 'count': 0}
        
        monthly_data[month_key]['total'] += float(order.get('total_amount', 0))
        monthly_data[month_key]['count'] += 1
    
    print(f"\n✅ Found {len(response.data)} orders across {len(monthly_data)} months:\n")
    
    for month in sorted(monthly_data.keys()):
        data = monthly_data[month]
        print(f"  {month}: KES {data['total']:,.2f} ({data['count']} orders)")
    
    print(f"\n{'='*70}")
    
    if len(monthly_data) < 3:
        print(f"\n⚠️  ISSUE FOUND: Only {len(monthly_data)} month(s) of data")
        print("   Sales projection requires at least 3 months of historical data")
        print("\n💡 SOLUTIONS:")
        print("   1. Wait and collect more monthly data naturally")
        print("   2. Create test orders with backdated timestamps for testing")
        print("   3. Lower the threshold in SystemOverview.tsx (line 137)")
    else:
        print(f"\n✅ Sufficient data: {len(monthly_data)} months")
        print("   Sales projection should be working!")
