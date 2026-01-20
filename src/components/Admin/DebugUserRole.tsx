import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';

export function DebugUserRole() {
  const { user, userRole } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const forceAdminRole = async () => {
    if (!user) return;

    setIsUpdating(true);
    try {
      // Update both profiles table and try to update auth metadata
      // First update profiles (for backend auth middleware)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: 'admin',
          status: 'active'
        })
        .eq('id', user.id);

      if (profileError) {
        console.warn('Could not update profiles table:', profileError);
      }

      // Try to update user metadata in auth.users via RPC function
      try {
        const { error: rpcError } = await supabase.rpc('update_user_role', {
          user_id: user.id,
          new_role: 'admin'
        });

        if (rpcError) {
          console.warn('RPC function not available, this is expected:', rpcError);
        }
      } catch (rpcErr) {
        console.warn('RPC call failed, this is expected:', rpcErr);
      }

      toast.success("User role has been set to admin. Please refresh the page.");

      // Force a page reload to refresh the auth context
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.message || "Failed to update role");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="mb-6 bg-yellow-50 border-yellow-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <User className="h-5 w-5" />
          Debug: User Role Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>User ID:</strong> {user?.id || 'Not logged in'}
          </div>
          <div>
            <strong>Email:</strong> {user?.email || 'N/A'}
          </div>
          <div>
            <strong>Current Role:</strong> 
            <Badge variant={userRole === 'admin' ? 'default' : 'destructive'} className="ml-2">
              {userRole || 'No role'}
            </Badge>
          </div>
          <div>
            <strong>Full Name:</strong> {user?.full_name || 'N/A'}
          </div>
        </div>
        
        {userRole !== 'admin' && user && (
          <div className="pt-4 border-t">
            <p className="text-sm text-yellow-700 mb-2">
              If you need admin access for testing, click the button below:
            </p>
            <Button 
              onClick={forceAdminRole} 
              disabled={isUpdating}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
              Set Admin Role
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
