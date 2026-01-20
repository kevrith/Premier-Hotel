/**
 * Custom hook for handling notifications with sound and visual alerts
 */
import { useEffect, useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { dbHelpers } from '../db/schema';
import type { QueuedNotification } from '../db/schema';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  playSound?: boolean;
  soundUrl?: string;
}

export interface DNDSchedule {
  enabled: boolean;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  days: number[]; // 0-6 (Sunday-Saturday)
}

export interface UseNotificationsOptions {
  enableBrowserNotifications?: boolean;
  enableSounds?: boolean;
  defaultSoundUrl?: string;
  userId?: string;
  enableOfflineQueue?: boolean;
  dndSchedule?: DNDSchedule;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const {
    enableBrowserNotifications = true,
    enableSounds = true,
    defaultSoundUrl = '/sounds/notification.mp3',
    userId,
    enableOfflineQueue = true,
    dndSchedule
  } = options;

  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check browser support and permission
  useEffect(() => {
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  // Initialize audio element
  useEffect(() => {
    if (enableSounds && !audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = 0.5;
    }
  }, [enableSounds]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Process queued notifications when coming back online
  useEffect(() => {
    if (isOnline && enableOfflineQueue) {
      processQueuedNotifications();
    }
  }, [isOnline, enableOfflineQueue]);

  /**
   * Check if current time is within DND period
   */
  const isInDNDPeriod = useCallback((): boolean => {
    if (!dndSchedule || !dndSchedule.enabled) return false;

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Check if today is in DND days
    if (!dndSchedule.days.includes(currentDay)) return false;

    const { startTime, endTime } = dndSchedule;

    // Handle overnight DND period (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    }

    // Handle same-day DND period (e.g., 13:00 to 14:00)
    return currentTime >= startTime && currentTime <= endTime;
  }, [dndSchedule]);

  /**
   * Queue notification for offline delivery
   */
  const queueNotification = useCallback(
    async (
      title: string,
      message: string,
      type: QueuedNotification['type'],
      priority: QueuedNotification['priority'] = 'normal',
      data?: any
    ) => {
      if (!enableOfflineQueue || !userId) return;

      try {
        await dbHelpers.queueNotification({
          userId,
          title,
          message,
          type,
          priority,
          data,
          createdAt: new Date().toISOString(),
          sent: false
        });
      } catch (error) {
        console.error('Failed to queue notification:', error);
      }
    },
    [enableOfflineQueue, userId]
  );

  /**
   * Process queued notifications
   */
  const processQueuedNotifications = useCallback(async () => {
    if (!enableOfflineQueue || !userId) return;

    try {
      const pending = await dbHelpers.getPendingNotificationsByPriority(userId);

      for (const notification of pending) {
        // Show the notification
        await showBrowserNotification({
          title: notification.title,
          body: notification.message,
          tag: notification.referenceId,
          requireInteraction: notification.priority === 'urgent'
        });

        // Play sound for high priority notifications
        if (notification.priority === 'urgent' || notification.priority === 'high') {
          playSound();
        }

        // Mark as sent
        if (notification.id) {
          await dbHelpers.markNotificationSent(notification.id);
        }

        // Small delay between notifications to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (pending.length > 0) {
        toast.success(`Delivered ${pending.length} queued notification${pending.length > 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error('Failed to process queued notifications:', error);
    }
  }, [enableOfflineQueue, userId]);

  /**
   * Request notification permission from the browser
   */
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      console.warn('Browser notifications are not supported');
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }, [isSupported]);

  /**
   * Play notification sound
   */
  const playSound = useCallback((soundUrl?: string) => {
    if (!enableSounds || !audioRef.current) return;

    try {
      audioRef.current.src = soundUrl || defaultSoundUrl;
      audioRef.current.play().catch((error) => {
        console.warn('Failed to play notification sound:', error);
      });
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, [enableSounds, defaultSoundUrl]);

  /**
   * Show browser notification
   */
  const showBrowserNotification = useCallback(
    async (options: NotificationOptions): Promise<Notification | null> => {
      if (!isSupported || !enableBrowserNotifications) {
        return null;
      }

      // Request permission if not granted
      if (permission === 'default') {
        const newPermission = await requestPermission();
        if (newPermission !== 'granted') {
          return null;
        }
      } else if (permission !== 'granted') {
        return null;
      }

      try {
        const notification = new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/logo.png',
          badge: options.badge,
          tag: options.tag,
          requireInteraction: options.requireInteraction ?? false,
          silent: options.silent ?? false
        });

        return notification;
      } catch (error) {
        console.error('Error showing browser notification:', error);
        return null;
      }
    },
    [isSupported, permission, enableBrowserNotifications, requestPermission]
  );

  /**
   * Show toast notification
   */
  const showToast = useCallback(
    (
      message: string,
      type: 'success' | 'error' | 'info' | 'warning' = 'info',
      duration?: number
    ) => {
      switch (type) {
        case 'success':
          toast.success(message, { duration });
          break;
        case 'error':
          toast.error(message, { duration });
          break;
        case 'warning':
          toast(message, {
            icon: '⚠️',
            duration,
            style: {
              background: '#fef3c7',
              color: '#92400e'
            }
          });
          break;
        default:
          toast(message, { duration });
      }
    },
    []
  );

  /**
   * Show complete notification with sound, browser notification, and toast
   */
  const notify = useCallback(
    async (
      notificationOptions: NotificationOptions,
      toastMessage?: string,
      toastType?: 'success' | 'error' | 'info' | 'warning',
      notificationType?: QueuedNotification['type'],
      priority?: QueuedNotification['priority']
    ) => {
      // Check if in DND period - only suppress non-urgent notifications
      if (isInDNDPeriod() && priority !== 'urgent') {
        // Queue for later delivery
        if (enableOfflineQueue && userId && notificationType) {
          await queueNotification(
            notificationOptions.title,
            notificationOptions.body,
            notificationType,
            priority || 'normal',
            { toast: toastMessage, toastType }
          );
        }
        return null;
      }

      // If offline and queue is enabled, queue the notification
      if (!isOnline && enableOfflineQueue && userId && notificationType) {
        await queueNotification(
          notificationOptions.title,
          notificationOptions.body,
          notificationType,
          priority || 'normal',
          { toast: toastMessage, toastType }
        );
        // Show toast to indicate it was queued
        showToast('Notification queued (offline)', 'info');
        return null;
      }

      // Play sound if enabled (but respect DND for sounds)
      if (notificationOptions.playSound !== false && !isInDNDPeriod()) {
        playSound(notificationOptions.soundUrl);
      }

      // Show browser notification
      const browserNotification = await showBrowserNotification(notificationOptions);

      // Show toast as fallback or additional notification
      if (toastMessage) {
        showToast(toastMessage, toastType);
      } else if (!browserNotification) {
        // If browser notification failed, show toast with title and body
        showToast(`${notificationOptions.title}: ${notificationOptions.body}`, toastType);
      }

      return browserNotification;
    },
    [playSound, showBrowserNotification, showToast, isOnline, enableOfflineQueue, userId, queueNotification, isInDNDPeriod]
  );

  /**
   * Notification presets for common scenarios
   */
  const notifyOrderUpdate = useCallback(
    async (orderId: string, status: string, message: string) => {
      await notify(
        {
          title: `Order #${orderId.slice(0, 8)}`,
          body: message,
          tag: `order-${orderId}`,
          requireInteraction: false,
          playSound: true
        },
        message,
        'info',
        'order',
        'normal'
      );
    },
    [notify]
  );

  const notifyBookingUpdate = useCallback(
    async (bookingId: string, status: string, message: string) => {
      await notify(
        {
          title: `Booking #${bookingId.slice(0, 8)}`,
          body: message,
          tag: `booking-${bookingId}`,
          requireInteraction: false,
          playSound: true
        },
        message,
        'info',
        'booking',
        'normal'
      );
    },
    [notify]
  );

  const notifyPaymentUpdate = useCallback(
    async (paymentId: string, status: string, message: string) => {
      const isSuccess = status === 'completed' || status === 'success';
      await notify(
        {
          title: isSuccess ? 'Payment Successful' : 'Payment Update',
          body: message,
          tag: `payment-${paymentId}`,
          requireInteraction: false,
          playSound: true,
          soundUrl: isSuccess ? '/sounds/success.mp3' : undefined
        },
        message,
        isSuccess ? 'success' : 'info',
        'payment',
        isSuccess ? 'normal' : 'high'
      );
    },
    [notify]
  );

  const notifyError = useCallback(
    async (title: string, message: string) => {
      await notify(
        {
          title,
          body: message,
          requireInteraction: true,
          playSound: true,
          soundUrl: '/sounds/error.mp3'
        },
        message,
        'error'
      );
    },
    [notify]
  );

  const notifySuccess = useCallback(
    async (title: string, message: string) => {
      await notify(
        {
          title,
          body: message,
          requireInteraction: false,
          playSound: true,
          soundUrl: '/sounds/success.mp3'
        },
        message,
        'success'
      );
    },
    [notify]
  );

  return {
    isSupported,
    permission,
    isOnline,
    isInDNDPeriod,
    requestPermission,
    playSound,
    showBrowserNotification,
    showToast,
    notify,
    // Offline queue
    queueNotification,
    processQueuedNotifications,
    // Presets
    notifyOrderUpdate,
    notifyBookingUpdate,
    notifyPaymentUpdate,
    notifyError,
    notifySuccess
  };
}

export default useNotifications;
