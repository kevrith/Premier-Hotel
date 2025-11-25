import { useAuth } from '@/contexts/AuthContext';

export default function RoleBasedContent({ 
  children, 
  allowedRoles, 
  fallback = null 
}) {
  const { userRole } = useAuth();

  if (!userRole || !allowedRoles.includes(userRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}