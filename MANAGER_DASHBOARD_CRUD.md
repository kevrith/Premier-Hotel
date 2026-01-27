# Manager Dashboard - Staff Management

The Manager Dashboard now includes comprehensive CRUD operations for staff management, allowing managers to create, read, update, and delete staff accounts.

## Features Added

### 1. Staff Management Tab
- **Location**: Manager Dashboard → "Manage Staff" tab
- **Purpose**: Full CRUD operations for staff members (waiter, chef, cleaner roles only)

### 2. CRUD Operations

#### Create Staff
- **Component**: `StaffAddDialog`
- **Functionality**: Create new staff accounts with roles: waiter, chef, cleaner
- **Fields**: Full name, email, password, phone number, role
- **Permissions**: Managers can only create staff roles (not admin/manager/customer)

#### Read Staff
- **Component**: `StaffManagement`
- **Functionality**: View all staff members with filtering and search
- **Features**: 
  - Search by name, email, or phone
  - Filter by role (waiter, chef, cleaner)
  - Real-time staff statistics
  - Display creation date and contact info

#### Update Staff
- **Functionality**: Change staff member roles
- **Permissions**: Managers can only change between staff roles (waiter ↔ chef ↔ cleaner)
- **Interface**: Dropdown menu in the actions column

#### Delete Staff
- **Functionality**: Deactivate staff accounts (soft delete)
- **Process**: Sets user status to "inactive" rather than permanent deletion
- **Interface**: "Remove Staff" option in actions dropdown

### 3. Real-time Statistics
- **Hook**: `useStaffStats`
- **Data**: 
  - Total staff count
  - Active staff count
  - Staff breakdown by role
  - Recent hires (last 30 days)

### 4. Backend Permissions
- **Endpoints Updated**: 
  - `POST /admin/users` - Managers can create staff roles
  - `PATCH /admin/users/{id}/role` - Managers can update staff roles
  - `DELETE /admin/users/{id}` - Managers can deactivate staff
  - `GET /admin/users` - Managers can list all users

## Usage

1. **Access**: Login as a manager and navigate to Manager Dashboard
2. **View Staff**: Click "Manage Staff" tab to see all staff members
3. **Add Staff**: Click "Add Staff" button and fill in the form
4. **Edit Role**: Use the dropdown in the Actions column to change roles
5. **Remove Staff**: Click the three dots menu and select "Remove Staff"
6. **Search/Filter**: Use the search bar and role filter to find specific staff

## Security

- Managers can only manage staff roles (waiter, chef, cleaner)
- Cannot create or modify admin, manager, or customer accounts
- Cannot access admin-only features
- All actions are logged and audited
- Role-based access control enforced at API level

## Components Structure

```
src/components/Manager/
├── StaffManagement.tsx      # Main staff management interface
├── StaffAddDialog.tsx       # Create new staff dialog
└── StaffDeleteDialog.tsx    # Delete confirmation (unused - direct deletion)

src/hooks/
└── useStaffStats.ts         # Real-time staff statistics hook

src/pages/
└── ManagerDashboard.tsx     # Updated with staff management tab
```

## API Integration

The manager dashboard uses the existing admin API endpoints with enhanced role-based permissions:

- **Create**: `POST /api/v1/admin/users`
- **Read**: `GET /api/v1/admin/users`
- **Update**: `PATCH /api/v1/admin/users/{id}/role`
- **Delete**: `DELETE /api/v1/admin/users/{id}` (deactivation)

All endpoints now support manager role access with appropriate restrictions.