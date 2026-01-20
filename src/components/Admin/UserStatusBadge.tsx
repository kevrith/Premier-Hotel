/**
 * UserStatusBadge Component
 * Displays user status with color coding
 */

import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Ban, Trash2 } from 'lucide-react';

interface UserStatusBadgeProps {
  status: 'active' | 'inactive' | 'suspended' | 'terminated' | 'deleted';
  showIcon?: boolean;
}

export function UserStatusBadge({ status, showIcon = true }: UserStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          label: 'Active',
          className: 'bg-green-100 text-green-800 hover:bg-green-200',
          icon: CheckCircle,
        };
      case 'inactive':
        return {
          label: 'Inactive',
          className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
          icon: AlertCircle,
        };
      case 'suspended':
        return {
          label: 'Suspended',
          className: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
          icon: Ban,
        };
      case 'terminated':
        return {
          label: 'Terminated',
          className: 'bg-red-100 text-red-800 hover:bg-red-200',
          icon: XCircle,
        };
      case 'deleted':
        return {
          label: 'Deleted',
          className: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
          icon: Trash2,
        };
      default:
        return {
          label: status,
          className: 'bg-gray-100 text-gray-800',
          icon: AlertCircle,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge className={config.className}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );
}
