import { useState, useEffect } from 'react';
import { Bell, Filter, CheckCheck, Trash2, Settings, Mail, MessageSquare, CreditCard, Calendar, Gift, AlertCircle } from 'lucide-react';
import { notificationService } from '../lib/api/notifications';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchNotifications();
    fetchStats();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = filter === 'unread' ? { unread_only: true } : {};
      const data = await notificationService.getNotifications(params);

      let filteredData = data;
      if (filter === 'read') {
        filteredData = data.filter(n => n.read_at !== null);
      }

      setNotifications(filteredData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await notificationService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      toast.success('Marked as read');
      fetchNotifications();
      fetchStats();
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      toast.success('All notifications marked as read');
      fetchNotifications();
      fetchStats();
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const getNotificationIcon = (eventType, priority) => {
    const iconClass = priority === 'urgent' ? 'text-red-500' : 'text-blue-500';

    switch (eventType) {
      case 'booking_confirmed':
      case 'booking_cancelled':
      case 'booking_reminder':
        return <Calendar className={`h-6 w-6 ${iconClass}`} />;
      case 'payment_completed':
      case 'payment_failed':
        return <CreditCard className={`h-6 w-6 ${iconClass}`} />;
      case 'order_confirmed':
      case 'order_ready':
      case 'order_delivered':
        return <MessageSquare className={`h-6 w-6 ${iconClass}`} />;
      case 'loyalty_reward':
      case 'loyalty_tier_upgrade':
        return <Gift className={`h-6 w-6 ${iconClass}`} />;
      case 'promotional_offer':
        return <Mail className={`h-6 w-6 ${iconClass}`} />;
      default:
        return <AlertCircle className={`h-6 w-6 ${iconClass}`} />;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Urgent</span>;
      case 'high':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">High</span>;
      case 'normal':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Normal</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">Low</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Bell className="h-8 w-8" />
                Notifications
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Stay updated with your bookings, orders, and more
              </p>
            </div>
            <a
              href="/notification-settings"
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Settings className="h-5 w-5" />
              Settings
            </a>
          </div>

          {/* Stats */}
          {stats && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_notifications}</p>
                  </div>
                  <Bell className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Unread</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.unread_count}</p>
                  </div>
                  <Mail className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Read</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {stats.total_notifications - stats.unread_count}
                    </p>
                  </div>
                  <CheckCheck className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filters and Actions */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'read'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Read
            </button>
          </div>

          {stats && stats.unread_count > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckCheck className="h-5 w-5" />
              Mark All as Read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {filter === 'unread' ? 'No unread notifications' : filter === 'read' ? 'No read notifications' : 'No notifications yet'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {filter === 'all' ? "You'll see notifications here when you have activity" : 'Try changing the filter'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    !notification.read_at ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.event_type, notification.priority)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`text-lg font-semibold ${
                              !notification.read_at
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {notification.title}
                            </h3>
                            {getPriorityBadge(notification.priority)}
                            {!notification.read_at && (
                              <span className="h-2 w-2 bg-blue-600 rounded-full" />
                            )}
                          </div>

                          <p className="text-gray-600 dark:text-gray-400 mb-3">
                            {notification.message}
                          </p>

                          <p className="text-sm text-gray-500 dark:text-gray-500">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {!notification.read_at && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="Mark as read"
                            >
                              <CheckCheck className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
