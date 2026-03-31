import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, CreditCard, Bell, Globe, Zap, Receipt, Loader2, Monitor, Printer, ShieldCheck, KeyRound, MapPin, Navigation } from 'lucide-react';
import { GEO_DEFAULTS } from '@/hooks/useGeoGate';
import { useToast } from '@/hooks/use-toast';
import { toast as hotToast } from 'react-hot-toast';
import TaxSettings from './TaxSettings';
import apiClient from '@/lib/api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaymentConfig {
  payment_gateway: string;
  accepted_payment_methods: string[];
  paypal_currency: string;
  paypal_kes_rate: string;
  // M-Pesa
  mpesa_shortcode: string;
  mpesa_consumer_key: string;
  mpesa_consumer_secret: string;
  mpesa_passkey: string;
  mpesa_callback_url: string;
  mpesa_environment: string;
  // Paystack
  paystack_secret_key: string;
  paystack_public_key: string;
  paystack_webhook_secret: string;
  // PayPal
  paypal_client_id: string;
  paypal_secret: string;
  paypal_mode: string;
}

interface NotificationConfig {
  email_notifications: boolean;
  sms_notifications: boolean;
  order_alerts: boolean;
}

interface SystemConfig {
  maintenance_mode: boolean;
  offline_mode: boolean;
}

interface LocalizationConfig {
  default_language: string;
  currency: string;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_PAYMENT: PaymentConfig = {
  payment_gateway: 'mpesa',
  accepted_payment_methods: ['cash', 'mpesa', 'card', 'paystack', 'paypal'],
  paypal_currency: 'USD',
  paypal_kes_rate: '130',
  mpesa_shortcode: '',
  mpesa_consumer_key: '',
  mpesa_consumer_secret: '',
  mpesa_passkey: '',
  mpesa_callback_url: '',
  mpesa_environment: 'sandbox',
  paystack_secret_key: '',
  paystack_public_key: '',
  paystack_webhook_secret: '',
  paypal_client_id: '',
  paypal_secret: '',
  paypal_mode: 'sandbox',
};

const DEFAULT_NOTIFICATION: NotificationConfig = {
  email_notifications: true,
  sms_notifications: true,
  order_alerts: true,
};

const DEFAULT_SYSTEM: SystemConfig = {
  maintenance_mode: false,
  offline_mode: true,
};

const DEFAULT_LOCALIZATION: LocalizationConfig = {
  default_language: 'en',
  currency: 'KES',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function SystemConfiguration() {
  const { toast } = useToast();

  const [payment,      setPayment]      = useState<PaymentConfig>(DEFAULT_PAYMENT);
  const [notification, setNotification] = useState<NotificationConfig>(DEFAULT_NOTIFICATION);
  const [system,       setSystem]       = useState<SystemConfig>(DEFAULT_SYSTEM);
  const [localization, setLocalization] = useState<LocalizationConfig>(DEFAULT_LOCALIZATION);

  // POS settings — stored in localStorage (device-level settings)
  const [posAutoLogout, setPosAutoLogout] = useState<boolean>(
    () => localStorage.getItem('pos:auto_logout_desktop') === 'true'
  );
  const [posPrintOnOrder, setPosPrintOnOrder] = useState<boolean>(
    () => localStorage.getItem('pos:print_on_order') !== 'false' // default ON
  );

  // Shift code — protects the staff PIN login screen
  const shiftKey = () => `staff:shift_code:${new Date().toISOString().slice(0, 10)}`;
  const [shiftCode, setShiftCode] = useState(() => localStorage.getItem(shiftKey()) || '');
  const [shiftCodeInput, setShiftCodeInput] = useState('');

  const saveShiftCode = () => {
    const code = shiftCodeInput.trim();
    if (!code) {
      // Clear shift code (disable gate)
      localStorage.removeItem(shiftKey());
      setShiftCode('');
      sessionStorage.removeItem('staff:shift_unlocked');
      hotToast.success('Shift code cleared — staff PIN screen is open');
      return;
    }
    localStorage.setItem(shiftKey(), code);
    setShiftCode(code);
    sessionStorage.removeItem('staff:shift_unlocked'); // force re-entry on next use
    hotToast.success(`Today's shift code set: ${code}`);
    setShiftCodeInput('');
  };

  // Geo gate — location-based Staff PIN visibility
  const [geoEnabled, setGeoEnabled] = useState<boolean>(
    () => localStorage.getItem('pos:geo_enabled') !== 'false'
  );
  const [geoLat, setGeoLat] = useState(
    () => localStorage.getItem('pos:geo_lat') ?? String(GEO_DEFAULTS.lat)
  );
  const [geoLon, setGeoLon] = useState(
    () => localStorage.getItem('pos:geo_lon') ?? String(GEO_DEFAULTS.lon)
  );
  const [geoRadius, setGeoRadius] = useState(
    () => localStorage.getItem('pos:geo_radius') ?? String(GEO_DEFAULTS.radius)
  );

  const saveGeoSettings = () => {
    localStorage.setItem('pos:geo_enabled', String(geoEnabled));
    localStorage.setItem('pos:geo_lat', geoLat);
    localStorage.setItem('pos:geo_lon', geoLon);
    localStorage.setItem('pos:geo_radius', geoRadius);
    hotToast.success('Location settings saved');
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      hotToast.error('Geolocation not available on this device');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLat(String(pos.coords.latitude));
        setGeoLon(String(pos.coords.longitude));
        hotToast.success('Current location captured — save to apply');
      },
      () => hotToast.error('Could not get location. Check browser permissions.'),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  const savePosSettings = () => {
    localStorage.setItem('pos:auto_logout_desktop', String(posAutoLogout));
    localStorage.setItem('pos:print_on_order', String(posPrintOnOrder));
    hotToast.success('POS settings saved');
  };

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState<string | null>(null); // which section is saving

  // ── Load all settings on mount ────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      try {
        const [p, n, s, l] = await Promise.allSettled([
          apiClient.get('/settings/payment-config'),
          apiClient.get('/settings/notification-config'),
          apiClient.get('/settings/system-config'),
          apiClient.get('/settings/localization-config'),
        ]);

        if (p.status === 'fulfilled') setPayment({ ...DEFAULT_PAYMENT, ...p.value.data });
        if (n.status === 'fulfilled') setNotification({ ...DEFAULT_NOTIFICATION, ...n.value.data });
        if (s.status === 'fulfilled') setSystem({ ...DEFAULT_SYSTEM, ...s.value.data });
        if (l.status === 'fulfilled') setLocalization({ ...DEFAULT_LOCALIZATION, ...l.value.data });
      } catch {
        // silently fall back to defaults
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Save helpers ──────────────────────────────────────────────────────────

  const save = async (section: string, endpoint: string, data: object) => {
    setSaving(section);
    try {
      await apiClient.put(endpoint, data);
      toast({ title: 'Settings saved', description: `${section} settings updated successfully` });
    } catch (err: any) {
      hotToast.error(err?.response?.data?.detail || `Failed to save ${section} settings`);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Configuration
          </CardTitle>
          <CardDescription>
            Manage system-wide settings and configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="payment" className="space-y-4">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="payment"><CreditCard className="h-4 w-4 mr-1" />Payment</TabsTrigger>
              <TabsTrigger value="tax"><Receipt className="h-4 w-4 mr-1" />Tax</TabsTrigger>
              <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-1" />Alerts</TabsTrigger>
              <TabsTrigger value="system"><Zap className="h-4 w-4 mr-1" />System</TabsTrigger>
              <TabsTrigger value="localization"><Globe className="h-4 w-4 mr-1" />Locale</TabsTrigger>
              <TabsTrigger value="pos"><Monitor className="h-4 w-4 mr-1" />POS</TabsTrigger>
            </TabsList>

            {/* ── Payment ── */}
            <TabsContent value="payment" className="space-y-4">
              <div className="space-y-4">

                {/* Accepted Payment Methods */}
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <p className="text-sm font-medium">Accepted Payment Methods</p>
                  <p className="text-xs text-muted-foreground">
                    Only checked methods will appear at checkout for customers and waiters.
                  </p>
                  {[
                    { id: 'cash',     label: 'Cash',                         desc: 'Physical cash payments' },
                    { id: 'mpesa',    label: 'M-Pesa',                       desc: 'Safaricom mobile money STK push' },
                    { id: 'card',     label: 'Card (Physical Terminal)',      desc: 'In-person card swipe / tap — waiter enters terminal ref' },
                    { id: 'paystack', label: 'Paystack (Online Card / Bank)', desc: 'Visa, Mastercard, bank transfer via Paystack — redirect to hosted page' },
                    { id: 'paypal',   label: 'PayPal',                       desc: 'International payments via PayPal — redirect to PayPal' },
                  ].map(m => {
                    const checked = payment.accepted_payment_methods.includes(m.id);
                    return (
                      <div key={m.id} className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id={`pm_${m.id}`}
                          checked={checked}
                          onChange={() => {
                            setPayment(p => ({
                              ...p,
                              accepted_payment_methods: checked
                                ? p.accepted_payment_methods.filter(x => x !== m.id)
                                : [...p.accepted_payment_methods, m.id],
                            }));
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300"
                        />
                        <label htmlFor={`pm_${m.id}`} className="cursor-pointer">
                          <span className="text-sm font-medium">{m.label}</span>
                          <p className="text-xs text-muted-foreground">{m.desc}</p>
                        </label>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gateway">Payment Gateway (Primary)</Label>
                  <Select
                    value={payment.payment_gateway}
                    onValueChange={(v) => setPayment(p => ({ ...p, payment_gateway: v }))}
                  >
                    <SelectTrigger id="gateway"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="cash">Cash Only</SelectItem>
                      <SelectItem value="paystack">Paystack (Card / Bank)</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Used as the default gateway for booking payments.</p>
                </div>

                {payment.payment_gateway === 'mpesa' && (
                  <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                    <p className="text-sm font-medium text-muted-foreground">Safaricom Daraja API Credentials</p>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="shortcode">Shortcode / Till Number</Label>
                        <Input id="shortcode" placeholder="e.g. 174379"
                          value={payment.mpesa_shortcode}
                          onChange={(e) => setPayment(p => ({ ...p, mpesa_shortcode: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="environment">Environment</Label>
                        <Select value={payment.mpesa_environment}
                          onValueChange={(v) => setPayment(p => ({ ...p, mpesa_environment: v }))}>
                          <SelectTrigger id="environment"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                            <SelectItem value="production">Production (Live)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="consumer_key">Consumer Key</Label>
                      <Input id="consumer_key" placeholder="From Daraja portal"
                        value={payment.mpesa_consumer_key}
                        onChange={(e) => setPayment(p => ({ ...p, mpesa_consumer_key: e.target.value }))} />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="consumer_secret">Consumer Secret</Label>
                      <Input id="consumer_secret" type="password"
                        placeholder={payment.mpesa_consumer_secret === '***' ? 'Already configured — leave blank to keep' : 'From Daraja portal'}
                        value={payment.mpesa_consumer_secret === '***' ? '' : payment.mpesa_consumer_secret}
                        onChange={(e) => setPayment(p => ({ ...p, mpesa_consumer_secret: e.target.value }))} />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="passkey">Passkey</Label>
                      <Input id="passkey" type="password"
                        placeholder={payment.mpesa_passkey === '***' ? 'Already configured — leave blank to keep' : 'From Daraja portal'}
                        value={payment.mpesa_passkey === '***' ? '' : payment.mpesa_passkey}
                        onChange={(e) => setPayment(p => ({ ...p, mpesa_passkey: e.target.value }))} />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="callback_url">Callback URL</Label>
                      <Input id="callback_url" placeholder="https://your-server.com/api/v1/payments/mpesa/callback"
                        value={payment.mpesa_callback_url}
                        onChange={(e) => setPayment(p => ({ ...p, mpesa_callback_url: e.target.value }))} />
                      <p className="text-xs text-muted-foreground">Must be a public HTTPS URL reachable by Safaricom</p>
                    </div>
                  </div>
                )}

                {/* Paystack */}
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <p className="text-sm font-medium text-muted-foreground">Paystack Credentials</p>
                  <div className="space-y-1">
                    <Label htmlFor="ps_pk">Public Key</Label>
                    <Input id="ps_pk" placeholder="pk_live_…"
                      value={payment.paystack_public_key}
                      onChange={(e) => setPayment(p => ({ ...p, paystack_public_key: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ps_sk">Secret Key</Label>
                    <Input id="ps_sk" type="password"
                      placeholder={payment.paystack_secret_key === '***' ? 'Already configured — leave blank to keep' : 'sk_live_…'}
                      value={payment.paystack_secret_key === '***' ? '' : payment.paystack_secret_key}
                      onChange={(e) => setPayment(p => ({ ...p, paystack_secret_key: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ps_wh">Webhook Secret</Label>
                    <Input id="ps_wh" type="password"
                      placeholder={payment.paystack_webhook_secret === '***' ? 'Already configured — leave blank to keep' : 'From Paystack dashboard'}
                      value={payment.paystack_webhook_secret === '***' ? '' : payment.paystack_webhook_secret}
                      onChange={(e) => setPayment(p => ({ ...p, paystack_webhook_secret: e.target.value }))} />
                    <p className="text-xs text-muted-foreground">Webhook URL: /api/v1/pos-payments/paystack/webhook</p>
                  </div>
                </div>

                {/* PayPal */}
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <p className="text-sm font-medium text-muted-foreground">PayPal Credentials</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="pp_mode">Mode</Label>
                      <Select value={payment.paypal_mode}
                        onValueChange={(v) => setPayment(p => ({ ...p, paypal_mode: v }))}>
                        <SelectTrigger id="pp_mode"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                          <SelectItem value="live">Live (Production)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="pp_cid">Client ID</Label>
                      <Input id="pp_cid" placeholder="AYj4…"
                        value={payment.paypal_client_id}
                        onChange={(e) => setPayment(p => ({ ...p, paypal_client_id: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="pp_sec">Secret</Label>
                    <Input id="pp_sec" type="password"
                      placeholder={payment.paypal_secret === '***' ? 'Already configured — leave blank to keep' : 'From PayPal Developer Dashboard'}
                      value={payment.paypal_secret === '***' ? '' : payment.paypal_secret}
                      onChange={(e) => setPayment(p => ({ ...p, paypal_secret: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="pp_currency">Charge Currency</Label>
                      <Select value={payment.paypal_currency}
                        onValueChange={(v) => setPayment(p => ({ ...p, paypal_currency: v }))}>
                        <SelectTrigger id="pp_currency"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD — US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR — Euro</SelectItem>
                          <SelectItem value="GBP">GBP — British Pound</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="pp_rate">KES per 1 {payment.paypal_currency || 'USD'}</Label>
                      <Input id="pp_rate" type="number" placeholder="e.g. 130"
                        value={payment.paypal_kes_rate}
                        onChange={(e) => setPayment(p => ({ ...p, paypal_kes_rate: e.target.value }))} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PayPal does not support KES. Amounts are converted at this rate before charging.
                    E.g. KES 13,000 ÷ 130 = $100 USD.
                  </p>
                </div>

                <Button
                  onClick={() => save('Payment', '/settings/payment-config', payment)}
                  disabled={saving === 'Payment'}
                >
                  {saving === 'Payment' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Payment Settings
                </Button>
              </div>
            </TabsContent>

            {/* ── Tax ── */}
            <TabsContent value="tax" className="space-y-4">
              <TaxSettings />
            </TabsContent>

            {/* ── Notifications ── */}
            <TabsContent value="notifications" className="space-y-4">
              <div className="space-y-4">
                {([
                  { key: 'email_notifications',  label: 'Email Notifications', desc: 'Send email notifications for orders and bookings' },
                  { key: 'sms_notifications',    label: 'SMS Notifications',   desc: 'Send SMS notifications for important updates' },
                  { key: 'order_alerts',         label: 'Order Alerts',        desc: 'Alert staff about new orders in real-time' },
                ] as const).map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{label}</Label>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                    <Switch
                      checked={notification[key]}
                      onCheckedChange={(v) => setNotification(n => ({ ...n, [key]: v }))}
                    />
                  </div>
                ))}
                <Button
                  onClick={() => save('Notification', '/settings/notification-config', notification)}
                  disabled={saving === 'Notification'}
                >
                  {saving === 'Notification' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Notification Settings
                </Button>
              </div>
            </TabsContent>

            {/* ── System ── */}
            <TabsContent value="system" className="space-y-4">
              <div className="space-y-4">
                {([
                  { key: 'maintenance_mode', label: 'Maintenance Mode',    desc: 'Temporarily disable customer access for maintenance' },
                  { key: 'offline_mode',     label: 'Offline Mode Support', desc: 'Enable offline functionality for staff and customers' },
                ] as const).map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{label}</Label>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                    <Switch
                      checked={system[key]}
                      onCheckedChange={(v) => setSystem(s => ({ ...s, [key]: v }))}
                    />
                  </div>
                ))}
                <Button
                  onClick={() => save('System', '/settings/system-config', system)}
                  disabled={saving === 'System'}
                >
                  {saving === 'System' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save System Settings
                </Button>
              </div>
            </TabsContent>

            {/* ── Localization ── */}
            <TabsContent value="localization" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Default Language</Label>
                  <Select value={localization.default_language}
                    onValueChange={(v) => setLocalization(l => ({ ...l, default_language: v }))}>
                    <SelectTrigger id="language"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="sw">Swahili</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={localization.currency}
                    onValueChange={(v) => setLocalization(l => ({ ...l, currency: v }))}>
                    <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KES">KES (Kenyan Shilling)</SelectItem>
                      <SelectItem value="USD">USD (US Dollar)</SelectItem>
                      <SelectItem value="EUR">EUR (Euro)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() => save('Localization', '/settings/localization-config', localization)}
                  disabled={saving === 'Localization'}
                >
                  {saving === 'Localization' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Localization Settings
                </Button>
              </div>
            </TabsContent>

            {/* ── POS Settings ── */}
            <TabsContent value="pos" className="space-y-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Device-level POS settings. These apply to this browser/device only and take effect immediately.
                </p>

                {/* Auto-logout */}
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-start gap-3">
                    <Monitor className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Auto-logout after order (Desktop only)</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        When enabled, waiters are automatically logged out on desktop computers after
                        successfully placing an order. On mobile devices they stay logged in.
                        Useful for shared POS terminals.
                      </p>
                    </div>
                    <Switch
                      checked={posAutoLogout}
                      onCheckedChange={setPosAutoLogout}
                    />
                  </div>
                </div>

                {/* Print on order */}
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-start gap-3">
                    <Printer className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Auto-print order slip after order creation</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Automatically opens a print dialog with an order slip whenever a waiter
                        creates a new order. Turn off if you do not have a receipt printer connected.
                      </p>
                    </div>
                    <Switch
                      checked={posPrintOnOrder}
                      onCheckedChange={setPosPrintOnOrder}
                    />
                  </div>
                </div>

                <Button onClick={savePosSettings}>
                  Save POS Settings
                </Button>

                {/* Shift code */}
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Daily Shift Code</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Set a code that staff must enter before they can see the Staff PIN login screen.
                        Change it each shift. Leave blank to remove the gate.
                        {shiftCode && <span className="ml-1 font-medium text-green-600 dark:text-green-400">Active today.</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="shift-code" className="flex items-center gap-1 text-xs">
                        <KeyRound className="h-3 w-3" /> New shift code
                      </Label>
                      <Input
                        id="shift-code"
                        placeholder={shiftCode ? 'Enter new code to replace…' : 'e.g. SHIFT1 or 2025'}
                        value={shiftCodeInput}
                        onChange={(e) => setShiftCodeInput(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button variant="outline" onClick={saveShiftCode}>
                        {shiftCodeInput.trim() ? 'Set Code' : 'Clear Code'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Geo gate */}
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Location-based Staff PIN Access</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        The Staff PIN login tab is only shown when the device is within the set radius of the hotel.
                        Staff logging in from outside the premises won't see the tab.
                      </p>
                    </div>
                    <Switch checked={geoEnabled} onCheckedChange={setGeoEnabled} />
                  </div>

                  {geoEnabled && (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="geo-lat" className="text-xs">Latitude</Label>
                          <Input
                            id="geo-lat"
                            value={geoLat}
                            onChange={(e) => setGeoLat(e.target.value)}
                            placeholder="-0.071158"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="geo-lon" className="text-xs">Longitude</Label>
                          <Input
                            id="geo-lon"
                            value={geoLon}
                            onChange={(e) => setGeoLon(e.target.value)}
                            placeholder="37.667504"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="geo-radius" className="text-xs">Allowed radius (metres)</Label>
                        <Input
                          id="geo-radius"
                          type="number"
                          min={10}
                          max={5000}
                          value={geoRadius}
                          onChange={(e) => setGeoRadius(e.target.value)}
                          placeholder="100"
                        />
                        <p className="text-xs text-muted-foreground">
                          Recommended: 50–150 m to account for GPS drift. Hotel: WMH8+JX4, Nkubu.
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={useCurrentLocation} className="flex items-center gap-2">
                        <Navigation className="h-3.5 w-3.5" />
                        Use my current location as hotel pin
                      </Button>
                    </div>
                  )}

                  <Button onClick={saveGeoSettings}>Save Location Settings</Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
