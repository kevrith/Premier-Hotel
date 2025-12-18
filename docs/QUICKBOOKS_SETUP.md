# QuickBooks POS 2013 Integration - Setup Guide

Complete guide for setting up bi-directional synchronization between Premier Hotel Management System and QuickBooks POS 2013.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [QuickBooks POS Setup](#quickbooks-pos-setup)
3. [Web Connector Installation](#web-connector-installation)
4. [Database Configuration](#database-configuration)
5. [Premier Hotel Configuration](#premier-hotel-configuration)
6. [QBWC File Setup](#qbwc-file-setup)
7. [Testing the Connection](#testing-the-connection)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **QuickBooks POS 2013** (Professional, Multi-Store, or Advanced)
- **QuickBooks Web Connector** v2.x or higher
- **Windows Server** or Windows 10/11 (for running QB POS and Web Connector)
- **Premier Hotel Backend** accessible via network/internet
- **Administrator access** to QuickBooks POS
- **Network connectivity** between QB machine and Premier Hotel server

### Software Downloads

1. **QuickBooks POS 2013** - Available from Intuit
2. **QuickBooks Web Connector** - [Download from Intuit](https://marketplace.intuit.com/webconnector)
3. **QuickBooks SDK 13.0** - Required for QBXML processing

---

## QuickBooks POS Setup

### Step 1: Create or Open Company File

1. Launch QuickBooks POS 2013
2. Create a new company file or open your existing company file
3. Note the full path to your company file (e.g., `C:\ProgramData\Intuit\QuickBooks POS v13\Company Files\MyHotel.qbposdb`)

### Step 2: Set Up User Permissions

1. Go to **Manager → Employees**
2. Create a new user for Web Connector integration:
   - **Username**: `qb_webconnector` (or your preferred name)
   - **Password**: Create a strong password
   - **Role**: Manager (needs full access for sync operations)
3. Grant permissions:
   - ✅ Sales transactions
   - ✅ Inventory management
   - ✅ Customer management
   - ✅ Reports access

### Step 3: Configure Company File Settings

1. Go to **Manager → Preferences**
2. Enable **Multi-User Mode** if using Web Connector on a different machine
3. Configure **Inventory Tracking**:
   - Ensure inventory tracking is enabled
   - Set up inventory locations if needed
4. Set **Tax Preferences** to match your hotel's tax structure

### Step 4: Create Item Categories

Organize your QuickBooks items to match your hotel structure:

```
Food
  ├─ Breakfast
  ├─ Lunch
  ├─ Dinner
  └─ Beverages

Room Services
  ├─ Standard Rooms
  ├─ Deluxe Rooms
  └─ Suites

Services
  ├─ Laundry
  ├─ Housekeeping
  └─ Other Services
```

---

## Web Connector Installation

### Step 1: Install QuickBooks Web Connector

1. Download QuickBooks Web Connector from Intuit
2. Run the installer as Administrator
3. Complete the installation wizard
4. Launch QuickBooks Web Connector

### Step 2: Configure Web Connector

1. Open **QuickBooks Web Connector**
2. Go to **Edit → Preferences**
3. Configure settings:
   - **Auto-run**: Enable for automatic sync
   - **Run every**: 15 minutes (or your preferred interval)
   - **Notification**: Enable for sync status updates

---

## Database Configuration

### Step 1: Run Database Migration

Execute the QuickBooks sync tables migration:

```bash
# Navigate to backend directory
cd backend

# Run the migration script
psql -U your_username -d your_database -f sql/create_quickbooks_sync_tables.sql
```

This creates the following tables:
- `quickbooks_config` - Configuration and credentials
- `quickbooks_sync_log` - Sync transaction audit trail
- `quickbooks_item_mapping` - Hotel items → QB items mapping
- `quickbooks_customer_mapping` - Hotel users → QB customers mapping

### Step 2: Verify Tables Created

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'quickbooks%';
```

You should see 4 tables created.

---

## Premier Hotel Configuration

### Step 1: Access Admin Dashboard

1. Log in to Premier Hotel admin panel
2. Navigate to **Admin → Integrations → QuickBooks**

### Step 2: Configure Connection Settings

Fill in the QuickBooks configuration form:

**Connection Settings:**
- **Company File Path**: `C:\ProgramData\Intuit\QuickBooks POS v13\Company Files\MyHotel.qbposdb`
  - ⚠️ Use the EXACT path from Step 1 of QB POS Setup
- **Web Connector URL**: `http://your-server:3000/api/v1/quickbooks-connector/soap`
  - Replace `your-server` with your actual server address
  - Use `https://` if SSL is configured

**Credentials:**
- **Username**: `qb_webconnector` (from Step 2 of QB POS Setup)
- **Password**: Enter the password you created
  - ⚠️ Password is hashed and stored securely

**Sync Settings:**
- ✅ **Enable QuickBooks Sync**: Turn on after initial setup
- ✅ **Sync Sales Transactions**: Auto-sync orders and bookings
- ✅ **Sync Inventory Levels**: Bi-directional inventory sync
- **Inventory Sync Interval**: 60 minutes (recommended)

### Step 3: Save Configuration

1. Click **Save Configuration**
2. Verify success message appears
3. Configuration is now saved to database

---

## QBWC File Setup

### Step 1: Create QBWC File

Create a file named `PremierHotel.qbwc` with the following content:

```xml
<?xml version="1.0"?>
<QBWCXML>
  <AppName>Premier Hotel POS Sync</AppName>
  <AppID></AppID>
  <AppURL>http://your-server:3000/api/v1/quickbooks-connector/soap</AppURL>
  <AppDescription>Synchronizes Premier Hotel transactions with QuickBooks POS 2013</AppDescription>
  <AppSupport>http://your-server/support</AppSupport>
  <UserName>qb_webconnector</UserName>
  <OwnerID>{YOUR-GUID-HERE}</OwnerID>
  <FileID>{YOUR-FILE-GUID-HERE}</FileID>
  <QBType>QBPOS</QBType>
  <Scheduler>
    <RunEveryNMinutes>15</RunEveryNMinutes>
  </Scheduler>
  <IsReadOnly>false</IsReadOnly>
</QBWCXML>
```

**Replace placeholders:**
- `your-server`: Your Premier Hotel server address
- `YOUR-GUID-HERE`: Generate a GUID for OwnerID
- `YOUR-FILE-GUID-HERE`: Generate a GUID for FileID

**Generate GUIDs** (PowerShell):
```powershell
[guid]::NewGuid()
```

### Step 2: Import QBWC File

1. Open **QuickBooks Web Connector**
2. Click **Add an Application**
3. Browse to `PremierHotel.qbwc` file
4. Click **Open**
5. QuickBooks POS will prompt for authorization:
   - Click **Yes, always allow access**
   - Confirm the application

### Step 3: Enter Credentials

When prompted by Web Connector:
- **Password**: Enter the same password from Premier Hotel configuration
- ✅ **Save password**: Check this box for automatic sync

---

## Testing the Connection

### Step 1: Test from Premier Hotel

1. Go to **Admin → Integrations → QuickBooks**
2. Click **Test Connection** button
3. Wait for response:
   - ✅ **Success**: "QuickBooks configuration is valid"
   - ❌ **Failed**: Check error message and troubleshooting section

### Step 2: Run Manual Sync

1. In Web Connector, select **Premier Hotel POS Sync**
2. Click **Update Selected**
3. Watch the status:
   - **Authenticating**: Verifying credentials
   - **Sending Requests**: Sending QBXML to QuickBooks
   - **Receiving Responses**: Processing QB responses
   - **Complete**: Sync finished successfully

### Step 3: Verify Sync in Dashboard

1. Navigate to **Admin → QuickBooks → Sync Dashboard**
2. Check statistics:
   - **Pending**: Transactions waiting to sync
   - **Completed**: Successfully synced transactions
   - **Failed**: Transactions that need attention

### Step 4: Verify Data in QuickBooks

1. Open QuickBooks POS
2. Go to **Reports → Sales Reports**
3. Look for recent transactions from Premier Hotel
4. Verify transaction details match your orders/bookings

---

## Item Mapping

### Step 1: Map Menu Items

1. Go to **Admin → QuickBooks → Item Mapping**
2. Click **Add Mapping**
3. Fill in mapping details:
   - **Item Type**: Menu Item
   - **Hotel Item ID**: Copy from menu management
   - **QB ListID**: Find in QuickBooks POS item list
   - **QB Item Name**: Full path (e.g., `Food:Breakfast:Pancakes`)
   - **Sync Inventory**: Enable for inventory tracking

### Step 2: Find QuickBooks ListIDs

**Method 1: Use QB SDK Explorer**
1. Install QuickBooks SDK
2. Run OSR (Object Schema Reference)
3. Query items to get ListIDs

**Method 2: Use QBXML Query** (Advanced)
1. Create inventory query request
2. Send via Web Connector
3. Parse response for ListIDs

### Step 3: Map Critical Items First

Priority mapping order:
1. **Top 20 menu items** (highest revenue)
2. **Room types** (Standard, Deluxe, Suite)
3. **Common inventory items** (beverages, supplies)
4. **Additional services** (laundry, parking, etc.)

### Step 4: Verify Mappings

1. Create a test order with mapped item
2. Complete the order
3. Check QuickBooks for the transaction
4. Verify item details are correct

---

## Sync Schedule Configuration

### Automatic Sync

**Real-Time Triggers** (immediate):
- Order completed → QuickBooks sales receipt
- Booking checked out → QuickBooks sales receipt

**Scheduled Sync** (periodic):
- Inventory levels from QB → Premier Hotel (every 60 min)
- Failed sync retry → Exponential backoff

### Manual Sync

Trigger manual sync from dashboard:
1. **Sync Inventory**: Pull latest inventory from QB
2. **Manual Sync**: Sync all pending transactions

---

## Troubleshooting

### Connection Issues

#### Error: "QuickBooks configuration not found"
**Solution**:
1. Complete Premier Hotel configuration first
2. Save configuration before testing
3. Verify database tables exist

#### Error: "Connection refused"
**Solution**:
1. Check Web Connector URL is correct
2. Verify server is accessible from QB machine
3. Check firewall allows port 3000 (or your port)
4. Try `curl http://your-server:3000/api/v1/quickbooks-connector/health`

#### Error: "Authentication failed (nvu)"
**Solution**:
1. Verify username matches exactly
2. Check password is correct
3. Ensure QB user has Manager permissions
4. Re-enter password in Premier Hotel config

### Sync Issues

#### Transactions stuck in "Pending"
**Solution**:
1. Check Web Connector is running
2. Verify QB POS is open
3. Click "Update Selected" in Web Connector manually
4. Check sync logs for errors

#### Error: "Item not found in mapping"
**Solution**:
1. Go to Item Mapping in admin
2. Create mapping for the item
3. Retry the failed sync
4. Verify QB item exists in QuickBooks

#### Inventory not syncing
**Solution**:
1. Enable inventory sync in configuration
2. Verify item mappings have "Sync Inventory" enabled
3. Check inventory sync interval setting
4. Manual trigger: Click "Sync Inventory" button

### Data Issues

#### Duplicate transactions in QuickBooks
**Solution**:
1. Check sync logs for the transaction
2. Verify QB TxnID is recorded
3. System prevents duplicates automatically
4. Contact support if duplicates persist

#### Incorrect amounts in QuickBooks
**Solution**:
1. Verify tax calculation matches QB settings
2. Check payment method mapping
3. Review QB account code assignments
4. Verify currency settings match

### Performance Issues

#### Slow sync performance
**Solution**:
1. Reduce inventory sync interval
2. Limit concurrent sync requests
3. Check network latency
4. Optimize database indexes

#### High retry count on syncs
**Solution**:
1. Review error messages in logs
2. Check QB POS is not locked
3. Verify network stability
4. Increase retry delay in config

---

## Best Practices

### Daily Operations

✅ **Morning Routine**:
1. Check sync dashboard for failed syncs
2. Verify Web Connector is running
3. Review yesterday's transaction count

✅ **During Service**:
1. Monitor real-time sync status
2. Watch for error notifications
3. Keep QB POS open during peak hours

✅ **Evening Routine**:
1. Reconcile QB transactions with hotel system
2. Review sync statistics
3. Address any failed syncs

### Maintenance

🔧 **Weekly**:
1. Review item mappings for new items
2. Clean up old sync logs (keep 90 days)
3. Check QB disk space

🔧 **Monthly**:
1. Update QuickBooks POS if patches available
2. Review sync performance metrics
3. Optimize item mappings
4. Archive old sync logs

### Security

🔒 **Important**:
1. Use strong passwords for QB user
2. Enable HTTPS for production
3. Restrict network access to QB server
4. Regular backups of QB company file
5. Monitor sync logs for unusual activity

---

## Support Resources

### Documentation

- [QuickBooks POS 2013 User Guide](https://quickbooks.intuit.com/pos/)
- [QuickBooks SDK Documentation](https://developer.intuit.com/)
- [QBXML Reference](https://developer.intuit.com/app/developer/qbdesktop/docs/develop/qbxml-reference)

### Premier Hotel Support

- **Email**: support@premierhotel.com
- **Documentation**: `/docs/QUICKBOOKS_MAPPING.md`
- **API Docs**: `/docs/api`

### Common Commands

```bash
# Check backend logs
tail -f backend/logs/quickbooks.log

# Query sync status
psql -d premier_hotel -c "SELECT * FROM quickbooks_sync_log ORDER BY created_at DESC LIMIT 10;"

# Test SOAP endpoint
curl -X POST http://localhost:3000/api/v1/quickbooks-connector/health
```

---

## Appendix

### A. QBXML Version Compatibility

This integration uses **QBXML 13.0** which is compatible with:
- QuickBooks POS 2013
- QuickBooks POS v12 (with limitations)

### B. Supported Transaction Types

| Transaction | QB Equivalent | Sync Direction |
|------------|---------------|----------------|
| Completed Order | Sales Receipt | Hotel → QB |
| Checked Out Booking | Sales Receipt | Hotel → QB |
| Inventory Level | Inventory Adjustment | QB → Hotel |
| Customer Info | Customer | Hotel → QB |

### C. Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 0 | Success | None |
| 3120 | Item not found | Create item mapping |
| 3180 | Duplicate transaction | Check for existing TxnID |
| 500 | QB error | Check QB POS logs |

---

**Version**: 1.0
**Last Updated**: December 18, 2025
**Compatibility**: QuickBooks POS 2013, Premier Hotel v1.1+
