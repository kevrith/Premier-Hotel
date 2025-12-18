import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { notificationService } from '../lib/api/notifications';
import NotificationDropdown from './NotificationDropdown';
import { useWebSocket, WS_EVENTS } from '../hooks/useWebSocket';
import toast from 'react-hot-toast';

const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // WebSocket connection for real-time updates
  const { isConnected, on } = useWebSocket({
    autoConnect: true,
    onConnect: () => console.log('Notification WebSocket connected'),
    onDisconnect: () => console.log('Notification WebSocket disconnected')
  });

  useEffect(() => {
    fetchNotifications();

    // Subscribe to real-time notification events
    const unsubscribe = on(WS_EVENTS.NOTIFICATION, (notificationData) => {
      console.log('New notification received:', notificationData);

      // Show toast notification
      toast.success(notificationData.title || 'New notification', {
        duration: 4000
      });

      // Refresh notifications
      fetchNotifications();
    });

    return () => {
      unsubscribe();
    };
  }, [on]);

  const fetchNotifications = async () => {
    try {
      const stats = await notificationService.getStats();
      setUnreadCount(stats.unread_count);

      // Fetch recent notifications
      const notifs = await notificationService.getNotifications({ limit: 10 });
      setNotifications(notifs);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      await fetchNotifications(); // Refresh
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      await notificationService.markAllAsRead();
      await fetchNotifications(); // Refresh
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Panel */}
          <NotificationDropdown
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onClose={() => setIsOpen(false)}
            loading={loading}
          />
        </>
      )}
    </div>
  );
};

export default NotificationBell;
