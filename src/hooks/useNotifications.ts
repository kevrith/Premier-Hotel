/**
 * Custom hook for handling notifications with sound and visual alerts
 */
import { useEffect, useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';

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

export interface UseNotificationsOptions {
  enableBrowserNotifications?: boolean;
  enableSounds?: boolean;
  defaultSoundUrl?: string;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const {
    enableBrowserNotifications = true,
    enableSounds = true,
    defaultSoundUrl = '/sounds/notification.mp3'
  } = options;

  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
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
      toastType?: 'success' | 'error' | 'info' | 'warning'
    ) => {
      // Play sound if enabled
      if (notificationOptions.playSound !== false) {
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
    [playSound, showBrowserNotification, showToast]
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
        'info'
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
        'info'
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
        isSuccess ? 'success' : 'info'
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
    requestPermission,
    playSound,
    showBrowserNotification,
    showToast,
    notify,
    // Presets
    notifyOrderUpdate,
    notifyBookingUpdate,
    notifyPaymentUpdate,
    notifyError,
    notifySuccess
  };
}

export default useNotifications;
