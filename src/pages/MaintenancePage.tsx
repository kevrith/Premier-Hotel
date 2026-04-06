import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function MaintenancePage() {
  const { logout, userRole } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-6">
            <Wrench className="h-14 w-14 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">System Maintenance</h1>
          <p className="text-muted-foreground text-base">
            The system is currently undergoing scheduled maintenance.
            Please check back shortly.
          </p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          If you need immediate assistance, please contact the administrator.
        </div>

        {userRole === 'admin' && (
          <p className="text-xs text-muted-foreground">
            You are logged in as admin. Disable maintenance mode from the Admin Dashboard → Settings tab.
          </p>
        )}

        <Button variant="outline" onClick={logout} className="w-full">
          Sign Out
        </Button>
      </div>
    </div>
  );
}
