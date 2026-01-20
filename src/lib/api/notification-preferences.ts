/**
 * Notification Preferences API
 * Handles backend synchronization of notification preferences
 */

import apiClient from './client';

export interface NotificationPreferences {
  // General preferences
  email_enabled?: boolean;
  sms_enabled?: boolean;
  push_enabled?: boolean;
  in_app_enabled?: boolean;

  // Event preferences
  bookings?: boolean;
  payments?: boolean;
  loyalty?: boolean;
  promotions?: boolean;

  // Email/Phone overrides
  email_override?: string | null;
  phone_override?: string | null;

  // Language and timezone
  language?: string;
  timezone?: string;

  // Quiet hours
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;

  // Frontend-specific (stored separately in localStorage)
  browserNotifications?: boolean;
  soundAlerts?: boolean;
  orderUpdates?: boolean;
  bookingUpdates?: boolean;
  paymentUpdates?: boolean;
  dndSchedule?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    days: number[];
  };
  roleSpecific?: Record<string, boolean>;
}

export interface NotificationPreferencesResponse extends NotificationPreferences {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get notification preferences from backend
 */
export const getNotificationPreferences = async (): Promise<NotificationPreferencesResponse> => {
  const response = await apiClient.get<NotificationPreferencesResponse>('/notifications/preferences');
  return response.data;
};

/**
 * Update notification preferences on backend
 */
export const updateNotificationPreferences = async (
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferencesResponse> => {
  const response = await apiClient.put<NotificationPreferencesResponse>(
    '/notifications/preferences',
    preferences
  );
  return response.data;
};

/**
 * Sync local preferences with backend
 * Takes frontend preferences and maps them to backend schema
 */
export const syncPreferencesWithBackend = async (
  localPreferences: NotificationPreferences
): Promise<void> => {
  // Map frontend preferences to backend schema
  const backendPreferences: Partial<NotificationPreferences> = {
    email_enabled: localPreferences.browserNotifications ?? true,
    in_app_enabled: true, // Always enabled for in-app
    push_enabled: localPreferences.browserNotifications ?? false,

    bookings: localPreferences.bookingUpdates ?? true,
    payments: localPreferences.paymentUpdates ?? true,
    promotions: localPreferences.promotions ?? false,

    quiet_hours_start: localPreferences.dndSchedule?.enabled
      ? localPreferences.dndSchedule.startTime
      : null,
    quiet_hours_end: localPreferences.dndSchedule?.enabled
      ? localPreferences.dndSchedule.endTime
      : null,
  };

  await updateNotificationPreferences(backendPreferences);
};

/**
 * Load and merge preferences from backend with local storage
 */
export const loadPreferences = async (): Promise<NotificationPreferences> => {
  try {
    // Get preferences from backend
    const backendPrefs = await getNotificationPreferences();

    // Get local preferences from localStorage
    const localPrefsStr = localStorage.getItem('notification-preferences');
    const localPrefs: NotificationPreferences = localPrefsStr
      ? JSON.parse(localPrefsStr)
      : {};

    // Merge preferences (backend takes precedence for server-side settings)
    const merged: NotificationPreferences = {
      ...localPrefs,
      // Backend preferences
      email_enabled: backendPrefs.email_enabled,
      in_app_enabled: backendPrefs.in_app_enabled,
      push_enabled: backendPrefs.push_enabled,
      bookings: backendPrefs.bookings,
      payments: backendPrefs.payments,
      loyalty: backendPrefs.loyalty,
      promotions: backendPrefs.promotions,

      // Map backend quiet hours to frontend DND schedule
      dndSchedule: backendPrefs.quiet_hours_start && backendPrefs.quiet_hours_end
        ? {
            enabled: true,
            startTime: backendPrefs.quiet_hours_start,
            endTime: backendPrefs.quiet_hours_end,
            days: localPrefs.dndSchedule?.days ?? [0, 1, 2, 3, 4, 5, 6],
          }
        : localPrefs.dndSchedule ?? {
            enabled: false,
            startTime: '22:00',
            endTime: '08:00',
            days: [0, 1, 2, 3, 4, 5, 6],
          },
    };

    return merged;
  } catch (error) {
    console.error('Failed to load preferences from backend:', error);

    // Fall back to local storage only
    const localPrefsStr = localStorage.getItem('notification-preferences');
    return localPrefsStr ? JSON.parse(localPrefsStr) : {};
  }
};
