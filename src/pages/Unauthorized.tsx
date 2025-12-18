import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Unauthorized() {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const getRoleDashboard = () => {
    switch (role) {
      case 'admin':
        return '/admin';
      case 'manager':
        return '/manager';
      case 'chef':
        return '/chef';
      case 'waiter':
        return '/waiter';
      case 'cleaner':
        return '/cleaner';
      case 'customer':
      default:
        return '/menu';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Icon */}
            <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/20">
              <ShieldAlert className="h-16 w-16 text-red-600 dark:text-red-500" />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Access Denied
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                You don't have permission to access this page
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                This page is restricted and requires specific permissions.
              </p>
              {user && (
                <p>
                  You are currently logged in as:{' '}
                  <span className="font-semibold text-foreground">
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </span>
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>

              {user ? (
                <Button
                  asChild
                  className="flex-1"
                >
                  <Link to={getRoleDashboard()}>
                    <Home className="mr-2 h-4 w-4" />
                    Go to Dashboard
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  className="flex-1"
                >
                  <Link to="/login">
                    Login
                  </Link>
                </Button>
              )}
            </div>

            {/* Additional help */}
            <div className="pt-4 text-sm text-muted-foreground">
              Need help?{' '}
              <Link to="/contact" className="text-primary hover:underline">
                Contact Support
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
