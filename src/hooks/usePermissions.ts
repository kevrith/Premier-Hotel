import { useAuth } from '@/contexts/AuthContext';

export const usePermissions = () => {
  const { user } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Admins have all permissions
    if (user.role === 'admin') return true;
    
    // Check user's permissions array
    return user.permissions?.includes(permission) || false;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    return permissions.some(permission => user.permissions?.includes(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    return permissions.every(permission => user.permissions?.includes(permission));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
};

// Permission constants
export const PERMISSIONS = {
  MANAGE_STAFF: 'can_manage_staff',
  VIEW_REPORTS: 'can_view_reports',
  MANAGE_INVENTORY: 'can_manage_inventory',
  MANAGE_ROOMS: 'can_manage_rooms',
  MANAGE_BOOKINGS: 'can_manage_bookings',
  MANAGE_ORDERS: 'can_manage_orders',
  PROCESS_PAYMENTS: 'can_process_payments',
  VIEW_ANALYTICS: 'can_view_analytics',
  MANAGE_MENU: 'can_manage_menu',
  MANAGE_HOUSEKEEPING: 'can_manage_housekeeping',
  ASSIGN_TASKS: 'can_assign_tasks',
  MANAGE_PERMISSIONS: 'can_manage_permissions',
} as const;
