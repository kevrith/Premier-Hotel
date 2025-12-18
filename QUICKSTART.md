# QuickBooks Integration - Quick Start Guide

Get your QuickBooks POS 2013 integration up and running in **15 minutes**!

---

## 🚀 Automated Deployment

Run the automated deployment script:

```bash
# Make sure you're in the project root directory
cd /home/kelvin/Desktop/Premier-Hotel

# Run the deployment script
./deploy-quickbooks.sh
```

The script will:
- ✅ Create database tables
- ✅ Install Python dependencies
- ✅ Build frontend components
- ✅ Verify installation

---

## 📋 Manual Steps (5 Steps)

### Step 1: Start the Backend (2 minutes)

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

✅ **Verify**: Visit http://localhost:8000/docs
- You should see QuickBooks endpoints in the API documentation

### Step 2: Configure QuickBooks in Admin (3 minutes)

1. Open your browser: `http://localhost:3000/admin`
2. Log in as admin
3. Navigate to: **Integrations → QuickBooks**
4. Fill in the configuration form:

   **Connection Settings:**
   - Company File Path: `C:\ProgramData\Intuit\QuickBooks POS v13\Company Files\YourCompany.qbposdb`
   - Web Connector URL: `http://your-server:8000/api/v1/quickbooks-connector/soap`

   **Credentials:**
   - Username: `qb_connector` (from QB POS setup)
   - Password: `your_password`

   **Sync Settings:**
   - ✅ Enable QuickBooks Sync
   - ✅ Sync Sales Transactions
   - ✅ Sync Inventory Levels
   - Inventory Sync Interval: `60` minutes

5. Click **Save Configuration**
6. Click **Test Connection**

✅ **Verify**: You should see "Connection successful" message

### Step 3: Setup QuickBooks Web Connector (5 minutes)

1. **Create QBWC File** ([`PremierHotel.qbwc`]()):

```xml
<?xml version="1.0"?>
<QBWCXML>
  <AppName>Premier Hotel POS Sync</AppName>
  <AppID></AppID>
  <AppURL>http://your-server:8000/api/v1/quickbooks-connector/soap</AppURL>
  <AppDescription>Synchronizes Premier Hotel with QuickBooks POS 2013</AppDescription>
  <AppSupport>http://your-server/support</AppSupport>
  <UserName>qb_connector</UserName>
  <OwnerID>{GENERATE-GUID-HERE}</OwnerID>
  <FileID>{GENERATE-GUID-HERE}</FileID>
  <QBType>QBPOS</QBType>
  <Scheduler>
    <RunEveryNMinutes>15</RunEveryNMinutes>
  </Scheduler>
  <IsReadOnly>false</IsReadOnly>
</QBWCXML>
```

2. **Generate GUIDs** (PowerShell):
```powershell
[guid]::NewGuid()  # For OwnerID
[guid]::NewGuid()  # For FileID
```

3. **Import to Web Connector**:
   - Open QuickBooks Web Connector
   - Click "Add an Application"
   - Browse to `PremierHotel.qbwc`
   - Authorize in QuickBooks POS
   - Enter password

✅ **Verify**: Web Connector shows "Premier Hotel POS Sync" in the application list

### Step 4: Map Your First Item (3 minutes)

1. Go to **Admin → QuickBooks → Item Mapping**
2. Click **Add Mapping**
3. Fill in the form:
   - **Item Type**: Menu Item
   - **Hotel Item ID**: (copy from your menu management)
   - **QB ListID**: (find in QuickBooks POS)
   - **QB Item Name**: e.g., `Food:Breakfast:Pancakes`
   - **Sync Inventory**: ✅ Enabled

4. Click **Create Mapping**

✅ **Verify**: Item appears in the mapping table

### Step 5: Test the Integration (2 minutes)

1. **Create a test order**:
   - Go to Orders
   - Create an order with the mapped item
   - Mark it as "Completed"

2. **Trigger sync**:
   - In Web Connector, click "Update Selected"
   - Watch the status: Authenticating → Sending → Receiving → Complete

3. **Verify in QuickBooks**:
   - Open QuickBooks POS
   - Go to Reports → Sales Reports
   - Look for your test order

✅ **Verify**: Order appears in QuickBooks with correct details

---

## 🎯 You're Done!

Your QuickBooks integration is now live! 🎉

### What Happens Now?

**Automatic Real-Time Sync:**
- ✅ When an order is completed → Syncs to QB immediately
- ✅ When a booking is checked out → Syncs to QB immediately
- ✅ Inventory levels sync every 60 minutes (or your configured interval)

**Monitoring:**
- Dashboard: **Admin → QuickBooks → Sync Dashboard**
- View statistics: Pending, Completed, Failed
- Retry failed syncs with one click
- Filter sync history by status/type

---

## 🔍 Quick Troubleshooting

### Connection Test Fails

**Problem**: "Connection refused" or "Configuration not found"

**Solution**:
```bash
# 1. Verify backend is running
curl http://localhost:8000/health

# 2. Check database connection
psql $DATABASE_URL -c "SELECT * FROM quickbooks_config LIMIT 1;"

# 3. Restart backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

### Transactions Stuck in "Pending"

**Problem**: Sync logs show status = "pending" for extended time

**Solution**:
1. Check Web Connector is running
2. Verify QuickBooks POS is open
3. Click "Update Selected" in Web Connector manually
4. Check sync logs for errors in dashboard

### Item Not Found Error

**Problem**: "Item not found in mapping"

**Solution**:
1. Go to **Item Mapping**
2. Create mapping for the menu/inventory item
3. Go to **Sync Dashboard**
4. Click **Retry** on the failed sync

---

## 📚 Need More Help?

**Full Documentation**:
- [Complete Setup Guide](docs/QUICKBOOKS_SETUP.md) - Detailed step-by-step
- [Implementation Details](QUICKBOOKS_INTEGRATION_COMPLETE.md) - What was built
- [API Documentation](http://localhost:8000/docs) - All endpoints

**Check Logs**:
```bash
# Backend logs
tail -f backend/logs/app.log

# Database sync logs
psql $DATABASE_URL -c "SELECT * FROM quickbooks_sync_log ORDER BY created_at DESC LIMIT 10;"
```

**Test Endpoints**:
```bash
# Health check
curl http://localhost:8000/health

# QB connector health
curl http://localhost:8000/api/v1/quickbooks-connector/health

# Get sync status
curl http://localhost:8000/api/v1/quickbooks/sync/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ✅ Checklist

Use this checklist to track your setup:

- [ ] Run `./deploy-quickbooks.sh`
- [ ] Backend server is running
- [ ] Admin dashboard accessible
- [ ] QuickBooks configuration saved
- [ ] Connection test successful
- [ ] QBWC file created and imported
- [ ] Web Connector authorized
- [ ] At least 1 item mapped
- [ ] Test order created and synced
- [ ] Order appears in QuickBooks
- [ ] Sync dashboard shows statistics
- [ ] Real-time sync is working

---

## 🎊 Success!

Once all checklist items are complete, your integration is **production ready**!

**Daily Operations**:
1. Monitor sync dashboard daily
2. Map new menu items as they're added
3. Review failed syncs and retry
4. Keep Web Connector running during business hours

**Enjoy automated syncing between Premier Hotel and QuickBooks POS 2013!** 🚀

---

**Version**: 1.0
**Last Updated**: December 18, 2025
**Estimated Setup Time**: 15 minutes
