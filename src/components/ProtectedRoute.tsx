import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import useAuthStore from '@/stores/authStore.secure';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRoles?: string[];
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  requiredRoles = [],
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { user, userRole, isLoading, isAuthenticated } = useAuth();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const location = useLocation();

  // Wait for both hydration AND auth initialization
  if (!hasHydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (requiredRoles.length > 0 && userRole && !requiredRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children ? <>{children}</> : <Outlet />;
}
