/**
 * Notification Settings Component
 * Allows users to configure notification preferences
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bell, Volume2, Monitor, CheckCircle, AlertCircle } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import toast from 'react-hot-toast';

interface NotificationPreferences {
  browserNotifications: boolean;
  soundAlerts: boolean;
  orderUpdates: boolean;
  bookingUpdates: boolean;
  paymentUpdates: boolean;
  promotions: boolean;
}

export default function NotificationSettings() {
  const { isSupported, permission, requestPermission, playSound } = useNotifications();

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    browserNotifications: true,
    soundAlerts: true,
    orderUpdates: true,
    bookingUpdates: true,
    paymentUpdates: true,
    promotions: false
  });

  const [isSaving, setIsSaving] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('notification-preferences');
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
      }
    }
  }, []);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      toast.success('Browser notifications enabled!');
      setPreferences((prev) => ({ ...prev, browserNotifications: true }));
    } else if (result === 'denied') {
      toast.error('Please enable notifications in your browser settings');
      setPreferences((prev) => ({ ...prev, browserNotifications: false }));
    }
  };

  const handleTestSound = () => {
    playSound();
    toast.success('Test sound played!');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('notification-preferences', JSON.stringify(preferences));

      // TODO: Save to backend API
      // await api.patch('/user/notification-preferences', preferences);

      toast.success('Notification preferences saved!');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const defaultPrefs: NotificationPreferences = {
      browserNotifications: true,
      soundAlerts: true,
      orderUpdates: true,
      bookingUpdates: true,
      paymentUpdates: true,
      promotions: false
    };
    setPreferences(defaultPrefs);
    toast.success('Settings reset to default');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Manage how you receive notifications about orders, bookings, and updates
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Browser Notifications */}
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Monitor className="w-5 h-5 mt-0.5 text-muted-foreground" />
              <div className="space-y-1">
                <Label className="text-base">Browser Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive desktop notifications when important events occur
                </p>
                {!isSupported && (
                  <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-500 mt-2">
                    <AlertCircle className="w-3 h-3" />
                    Not supported in this browser
                  </div>
                )}
                {isSupported && permission === 'denied' && (
                  <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-500 mt-2">
                    <AlertCircle className="w-3 h-3" />
                    Notifications blocked - check browser settings
                  </div>
                )}
                {isSupported && permission === 'granted' && (
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-500 mt-2">
                    <CheckCircle className="w-3 h-3" />
                    Enabled
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Switch
                checked={preferences.browserNotifications && permission === 'granted'}
                onCheckedChange={() => handleToggle('browserNotifications')}
                disabled={!isSupported || permission === 'denied'}
              />
              {isSupported && permission !== 'granted' && (
                <Button size="sm" variant="outline" onClick={handleRequestPermission}>
                  Enable
                </Button>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Sound Alerts */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Volume2 className="w-5 h-5 mt-0.5 text-muted-foreground" />
            <div className="space-y-1">
              <Label className="text-base">Sound Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Play sounds for notifications
              </p>
              <Button size="sm" variant="ghost" onClick={handleTestSound} className="px-0 h-auto text-xs">
                Test sound
              </Button>
            </div>
          </div>
          <Switch
            checked={preferences.soundAlerts}
            onCheckedChange={() => handleToggle('soundAlerts')}
          />
        </div>

        <Separator />

        {/* Notification Types */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Notification Types</h4>

          <div className="space-y-4 pl-8">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Order Updates</Label>
                <p className="text-xs text-muted-foreground">
                  Status changes, delivery updates
                </p>
              </div>
              <Switch
                checked={preferences.orderUpdates}
                onCheckedChange={() => handleToggle('orderUpdates')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Booking Updates</Label>
                <p className="text-xs text-muted-foreground">
                  Confirmation, check-in reminders
                </p>
              </div>
              <Switch
                checked={preferences.bookingUpdates}
                onCheckedChange={() => handleToggle('bookingUpdates')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Payment Updates</Label>
                <p className="text-xs text-muted-foreground">
                  Payment confirmations, receipts
                </p>
              </div>
              <Switch
                checked={preferences.paymentUpdates}
                onCheckedChange={() => handleToggle('paymentUpdates')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Promotions & Offers</Label>
                <p className="text-xs text-muted-foreground">
                  Special deals and discounts
                </p>
              </div>
              <Switch
                checked={preferences.promotions}
                onCheckedChange={() => handleToggle('promotions')}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={isSaving} className="flex-1">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
