import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function DebugUserRole() {
  const { user, userRole, profile } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const forceAdminRole = async () => {
    if (!user) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: user.id,
          role: 'admin',
          assigned_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Role updated",
        description: "User role has been set to admin",
      });

      // Force a page reload to refresh the auth context
      window.location.reload();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive"
      });
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
            <strong>Profile Name:</strong> {profile?.full_name || 'N/A'}
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