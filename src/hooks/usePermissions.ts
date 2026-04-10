import { useAuth } from '@/contexts/AuthContext';

// ── Role constants ────────────────────────────────────────────────────────────

export const ROLES = {
  ADMIN:       'admin',
  OWNER:       'owner',
  MANAGER:     'manager',
  CHEF:        'chef',
  WAITER:      'waiter',
  CLEANER:     'cleaner',
  HOUSEKEEPING:'housekeeping',
  CUSTOMER:    'customer',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/** Roles that can access staff dashboards */
export const STAFF_ROLES: Role[] = ['admin', 'owner', 'manager', 'chef', 'waiter', 'cleaner', 'housekeeping'];

/** Roles that can approve/modify orders and payments */
export const MANAGEMENT_ROLES: Role[] = ['admin', 'owner', 'manager'];

/** Roles that can view financial reports */
export const FINANCE_ROLES: Role[] = ['admin', 'owner', 'manager'];

// ── Permission constants ──────────────────────────────────────────────────────

export const PERMISSIONS = {
  MANAGE_STAFF:           'can_manage_staff',
  VIEW_REPORTS:           'can_view_reports',
  VIEW_EMPLOYEE_REPORTS:  'can_view_employee_reports',
  PRINT_ITEM_SUMMARY:     'can_print_item_summary',
  MANAGE_INVENTORY:       'can_manage_inventory',
  MANAGE_ROOMS:           'can_manage_rooms',
  MANAGE_BOOKINGS:        'can_manage_bookings',
  MANAGE_ORDERS:          'can_manage_orders',
  VOID_ORDERS:            'can_void_orders',
  PROCESS_PAYMENTS:       'can_process_payments',
  VIEW_ANALYTICS:         'can_view_analytics',
  MANAGE_MENU:            'can_manage_menu',
  MANAGE_HOUSEKEEPING:    'can_manage_housekeeping',
  ASSIGN_TASKS:           'can_assign_tasks',
  MANAGE_PERMISSIONS:     'can_manage_permissions',
} as const;

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePermissions() {
  const { user, role } = useAuth();

  const hasRole = (...roles: Role[]): boolean =>
    !!role && (roles as string[]).includes(role);

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (role === ROLES.ADMIN || role === ROLES.MANAGER || role === ROLES.OWNER) return true;
    return (user as any).permissions?.includes(permission) ?? false;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    if (role === ROLES.ADMIN) return true;
    return permissions.some(p => (user as any).permissions?.includes(p));
  };

  // Convenience role checks used across dashboards
  const isAdmin      = hasRole('admin');
  const isOwner      = hasRole('owner');
  const isManager    = hasRole('manager');
  const isChef       = hasRole('chef');
  const isWaiter     = hasRole('waiter');
  const isCleaner    = hasRole('cleaner', 'housekeeping');
  const isCustomer   = hasRole('customer');
  const isStaff      = hasRole(...STAFF_ROLES);
  const isManagement = hasRole(...MANAGEMENT_ROLES);
  const canViewFinance = hasRole(...FINANCE_ROLES);

  return {
    hasRole,
    hasPermission,
    hasAnyPermission,
    isAdmin,
    isOwner,
    isManager,
    isChef,
    isWaiter,
    isCleaner,
    isCustomer,
    isStaff,
    isManagement,
    canViewFinance,
  };
}
