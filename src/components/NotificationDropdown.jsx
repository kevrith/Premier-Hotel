import { CheckCheck, Clock, Mail, MessageSquare, CreditCard, Calendar, Gift, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const NotificationDropdown = ({ notifications, onMarkAsRead, onMarkAllAsRead, onClose, loading }) => {
  const getNotificationIcon = (eventType, priority) => {
    const iconClass = priority === 'urgent' ? 'text-red-500' : 'text-blue-500';

    switch (eventType) {
      case 'booking_confirmed':
      case 'booking_cancelled':
      case 'booking_reminder':
        return <Calendar className={`h-5 w-5 ${iconClass}`} />;
      case 'payment_completed':
      case 'payment_failed':
        return <CreditCard className={`h-5 w-5 ${iconClass}`} />;
      case 'order_confirmed':
      case 'order_ready':
      case 'order_delivered':
        return <MessageSquare className={`h-5 w-5 ${iconClass}`} />;
      case 'loyalty_reward':
      case 'loyalty_tier_upgrade':
        return <Gift className={`h-5 w-5 ${iconClass}`} />;
      case 'promotional_offer':
        return <Mail className={`h-5 w-5 ${iconClass}`} />;
      default:
        return <AlertCircle className={`h-5 w-5 ${iconClass}`} />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10';
      case 'high':
        return 'border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/10';
      case 'normal':
        return 'border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/10';
      default:
        return 'border-l-4 border-gray-300 bg-gray-50 dark:bg-gray-800';
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read_at) {
      onMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.reference_type === 'booking' && notification.reference_id) {
      window.location.href = `/my-bookings`;
    } else if (notification.reference_type === 'order' && notification.reference_id) {
      window.location.href = `/my-orders`;
    } else if (notification.reference_type === 'payment' && notification.reference_id) {
      window.location.href = `/my-bookings`;
    }

    onClose();
  };

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[600px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
        {notifications.some(n => !n.read_at) && (
          <button
            onClick={onMarkAllAsRead}
            disabled={loading}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
          >
            {loading ? 'Marking...' : 'Mark all as read'}
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                  !notification.read_at ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                } ${getPriorityColor(notification.priority)}`}
              >
                <div className="flex items-start space-x-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.event_type, notification.priority)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <p className={`text-sm font-medium ${
                        !notification.read_at
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {notification.title}
                      </p>
                      {!notification.read_at && (
                        <span className="ml-2 h-2 w-2 bg-blue-600 rounded-full flex-shrink-0" />
                      )}
                    </div>

                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {notification.message}
                    </p>

                    <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <a
            href="/notifications"
            className="block w-full text-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            View all notifications
          </a>
        </div>
      )}
    </div>
  );
};

// Import Bell for the empty state
import { Bell } from 'lucide-react';

export default NotificationDropdown;
