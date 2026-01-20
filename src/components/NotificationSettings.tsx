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
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { syncPreferencesWithBackend, loadPreferences } from '@/lib/api/notification-preferences';

interface DNDSchedule {
  enabled: boolean;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  days: number[]; // 0-6 (Sunday-Saturday)
}

interface RoleSpecificPreferences {
  // Chef preferences
  newOrders?: boolean;
  orderStatusChanges?: boolean;
  inventoryAlerts?: boolean;

  // Waiter preferences
  tableAssignments?: boolean;
  orderReadyAlerts?: boolean;
  customerRequests?: boolean;

  // Cleaner preferences
  roomAssignments?: boolean;
  maintenanceRequests?: boolean;
  priorityTasks?: boolean;

  // Admin preferences
  systemAlerts?: boolean;
  staffNotifications?: boolean;
  reportAlerts?: boolean;
}

interface NotificationPreferences {
  browserNotifications: boolean;
  soundAlerts: boolean;
  orderUpdates: boolean;
  bookingUpdates: boolean;
  paymentUpdates: boolean;
  promotions: boolean;
  dndSchedule: DNDSchedule;
  roleSpecific: RoleSpecificPreferences;
}

export default function NotificationSettings() {
  const { isSupported, permission, requestPermission, playSound } = useNotifications();
  const { user } = useAuth();

  // Get default role-specific preferences based on user role
  const getDefaultRolePreferences = (): RoleSpecificPreferences => {
    const role = user?.role?.toLowerCase();

    if (role === 'chef') {
      return {
        newOrders: true,
        orderStatusChanges: true,
        inventoryAlerts: true
      };
    } else if (role === 'waiter') {
      return {
        tableAssignments: true,
        orderReadyAlerts: true,
        customerRequests: true
      };
    } else if (role === 'cleaner') {
      return {
        roomAssignments: true,
        maintenanceRequests: true,
        priorityTasks: true
      };
    } else if (role === 'admin') {
      return {
        systemAlerts: true,
        staffNotifications: true,
        reportAlerts: true
      };
    }

    return {};
  };

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    browserNotifications: true,
    soundAlerts: true,
    orderUpdates: true,
    bookingUpdates: true,
    paymentUpdates: true,
    promotions: false,
    dndSchedule: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00',
      days: [0, 1, 2, 3, 4, 5, 6] // All days by default
    },
    roleSpecific: getDefaultRolePreferences()
  });

  const [isSaving, setIsSaving] = useState(false);

  // Load preferences from backend and localStorage
  useEffect(() => {
    const loadPrefs = async () => {
      if (!user) return;

      try {
        // Load merged preferences from backend and localStorage
        const merged = await loadPreferences();
        setPreferences(prev => ({
          ...prev,
          ...merged,
          roleSpecific: getDefaultRolePreferences(),
        }));
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
        // Fallback to localStorage only
        const saved = localStorage.getItem('notification-preferences');
        if (saved) {
          try {
            setPreferences(JSON.parse(saved));
          } catch (e) {
            console.error('Failed to parse local preferences:', e);
          }
        }
      }
    };

    loadPrefs();
  }, [user]);

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

      // Sync with backend
      await syncPreferencesWithBackend(preferences);

      toast.success('Notification preferences saved!');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error('Failed to save preferences. Changes saved locally only.');
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
      promotions: false,
      dndSchedule: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        days: [0, 1, 2, 3, 4, 5, 6]
      },
      roleSpecific: getDefaultRolePreferences()
    };
    setPreferences(defaultPrefs);
    toast.success('Settings reset to default');
  };

  const handleRoleSpecificToggle = (key: keyof RoleSpecificPreferences) => {
    setPreferences(prev => ({
      ...prev,
      roleSpecific: {
        ...prev.roleSpecific,
        [key]: !prev.roleSpecific[key]
      }
    }));
  };

  const handleDNDToggle = () => {
    setPreferences(prev => ({
      ...prev,
      dndSchedule: {
        ...prev.dndSchedule,
        enabled: !prev.dndSchedule.enabled
      }
    }));
  };

  const handleDNDTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    setPreferences(prev => ({
      ...prev,
      dndSchedule: {
        ...prev.dndSchedule,
        [field]: value
      }
    }));
  };

  const handleDNDDayToggle = (day: number) => {
    setPreferences(prev => {
      const days = prev.dndSchedule.days.includes(day)
        ? prev.dndSchedule.days.filter(d => d !== day)
        : [...prev.dndSchedule.days, day].sort();

      return {
        ...prev,
        dndSchedule: {
          ...prev.dndSchedule,
          days
        }
      };
    });
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

        {/* Do Not Disturb Schedule */}
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <Label className="text-base">Do Not Disturb</Label>
              <p className="text-sm text-muted-foreground">
                Silence notifications during specific hours
              </p>
            </div>
            <Switch
              checked={preferences.dndSchedule.enabled}
              onCheckedChange={handleDNDToggle}
            />
          </div>

          {preferences.dndSchedule.enabled && (
            <div className="pl-8 space-y-4">
              {/* Time Range */}
              <div className="space-y-2">
                <Label className="text-sm">Quiet Hours</Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">From</Label>
                    <input
                      type="time"
                      value={preferences.dndSchedule.startTime}
                      onChange={(e) => handleDNDTimeChange('startTime', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">To</Label>
                    <input
                      type="time"
                      value={preferences.dndSchedule.endTime}
                      onChange={(e) => handleDNDTimeChange('endTime', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Days of Week */}
              <div className="space-y-2">
                <Label className="text-sm">Active Days</Label>
                <div className="grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                    <button
                      key={day}
                      onClick={() => handleDNDDayToggle(index)}
                      className={`px-2 py-2 text-xs font-medium rounded-md transition-colors ${
                        preferences.dndSchedule.days.includes(index)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
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

        {/* Role-Specific Notifications */}
        {user?.role && (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="font-medium text-sm">
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Notifications
              </h4>

              <div className="space-y-4 pl-8">
                {user.role.toLowerCase() === 'chef' && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">New Orders</Label>
                        <p className="text-xs text-muted-foreground">
                          Alerts for incoming food orders
                        </p>
                      </div>
                      <Switch
                        checked={preferences.roleSpecific.newOrders ?? true}
                        onCheckedChange={() => handleRoleSpecificToggle('newOrders')}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Order Status Changes</Label>
                        <p className="text-xs text-muted-foreground">
                          Updates when order status changes
                        </p>
                      </div>
                      <Switch
                        checked={preferences.roleSpecific.orderStatusChanges ?? true}
                        onCheckedChange={() => handleRoleSpecificToggle('orderStatusChanges')}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Inventory Alerts</Label>
                        <p className="text-xs text-muted-foreground">
                          Low stock and inventory warnings
                        </p>
                      </div>
                      <Switch
                        checked={preferences.roleSpecific.inventoryAlerts ?? true}
                        onCheckedChange={() => handleRoleSpecificToggle('inventoryAlerts')}
                      />
                    </div>
                  </>
                )}

                {user.role.toLowerCase() === 'waiter' && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Table Assignments</Label>
                        <p className="text-xs text-muted-foreground">
                          New table assignment notifications
                        </p>
                      </div>
                      <Switch
                        checked={preferences.roleSpecific.tableAssignments ?? true}
                        onCheckedChange={() => handleRoleSpecificToggle('tableAssignments')}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Order Ready Alerts</Label>
                        <p className="text-xs text-muted-foreground">
                          When orders are ready for pickup
                        </p>
                      </div>
                      <Switch
                        checked={preferences.roleSpecific.orderReadyAlerts ?? true}
                        onCheckedChange={() => handleRoleSpecificToggle('orderReadyAlerts')}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Customer Requests</Label>
                        <p className="text-xs text-muted-foreground">
                          Service requests from customers
                        </p>
                      </div>
                      <Switch
                        checked={preferences.roleSpecific.customerRequests ?? true}
                        onCheckedChange={() => handleRoleSpecificToggle('customerRequests')}
                      />
                    </div>
                  </>
                )}

                {user.role.toLowerCase() === 'cleaner' && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Room Assignments</Label>
                        <p className="text-xs text-muted-foreground">
                          New room cleaning assignments
                        </p>
                      </div>
                      <Switch
                        checked={preferences.roleSpecific.roomAssignments ?? true}
                        onCheckedChange={() => handleRoleSpecificToggle('roomAssignments')}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Maintenance Requests</Label>
                        <p className="text-xs text-muted-foreground">
                          Urgent maintenance and repairs
                        </p>
                      </div>
                      <Switch
                        checked={preferences.roleSpecific.maintenanceRequests ?? true}
                        onCheckedChange={() => handleRoleSpecificToggle('maintenanceRequests')}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Priority Tasks</Label>
                        <p className="text-xs text-muted-foreground">
                          High priority cleaning tasks
                        </p>
                      </div>
                      <Switch
                        checked={preferences.roleSpecific.priorityTasks ?? true}
                        onCheckedChange={() => handleRoleSpecificToggle('priorityTasks')}
                      />
                    </div>
                  </>
                )}

                {user.role.toLowerCase() === 'admin' && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">System Alerts</Label>
                        <p className="text-xs text-muted-foreground">
                          System errors and warnings
                        </p>
                      </div>
                      <Switch
                        checked={preferences.roleSpecific.systemAlerts ?? true}
                        onCheckedChange={() => handleRoleSpecificToggle('systemAlerts')}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Staff Notifications</Label>
                        <p className="text-xs text-muted-foreground">
                          Staff activity and updates
                        </p>
                      </div>
                      <Switch
                        checked={preferences.roleSpecific.staffNotifications ?? true}
                        onCheckedChange={() => handleRoleSpecificToggle('staffNotifications')}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Report Alerts</Label>
                        <p className="text-xs text-muted-foreground">
                          Daily reports and analytics
                        </p>
                      </div>
                      <Switch
                        checked={preferences.roleSpecific.reportAlerts ?? true}
                        onCheckedChange={() => handleRoleSpecificToggle('reportAlerts')}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

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
