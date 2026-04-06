// @ts-nocheck
import { useEffect, useState } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import useAuthStore from '@/stores/authStore.secure';
import apiClient from '@/lib/api/client';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRoles?: string[];
  redirectTo?: string;
}

// Cache maintenance status for 60 s so every ProtectedRoute doesn't re-fetch
let _maintenanceCache: { value: boolean; fetchedAt: number } | null = null;

/** Call this after toggling maintenance mode in Settings so the cache is immediately cleared. */
export function invalidateMaintenanceCache() {
  _maintenanceCache = null;
}

async function fetchMaintenanceMode(): Promise<boolean> {
  const now = Date.now();
  if (_maintenanceCache && now - _maintenanceCache.fetchedAt < 60_000) {
    return _maintenanceCache.value;
  }
  try {
    const res = await apiClient.get('/settings/maintenance-status');
    const value = Boolean((res.data as any)?.maintenance_mode);
    _maintenanceCache = { value, fetchedAt: now };
    return value;
  } catch {
    return false; // fail open — never block on network error
  }
}

export default function ProtectedRoute({
  children,
  requiredRoles = [],
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { user, userRole, isLoading, isAuthenticated } = useAuth();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isOfflineSession = useAuthStore((state) => state.isOfflineSession);
  const location = useLocation();

  const [maintenanceChecked, setMaintenanceChecked] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Only check maintenance once we know who the user is
  useEffect(() => {
    if (!hasHydrated || (isLoading && !isOfflineSession)) return;
    if (!user) { setMaintenanceChecked(true); return; } // not logged in — let redirect handle it

    fetchMaintenanceMode().then((on) => {
      setMaintenanceMode(on);
      setMaintenanceChecked(true);
    });
  }, [hasHydrated, isLoading, isOfflineSession, user]);

  // Wait for hydration
  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If loading but we have an offline session with cached user, don't block
  if (isLoading && !isOfflineSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Wait for maintenance check
  if (!maintenanceChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Block non-admins when maintenance mode is on
  if (maintenanceMode && userRole !== 'admin') {
    return <Navigate to="/maintenance" replace />;
  }

  if (requiredRoles.length > 0 && userRole && !requiredRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
