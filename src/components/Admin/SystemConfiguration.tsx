import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, CreditCard, Bell, Globe, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SystemConfiguration() {
  const [config, setConfig] = useState({
    paymentGateway: 'mpesa',
    mpesaShortcode: '',
    mpesaPasskey: '',
    emailNotifications: true,
    smsNotifications: true,
    orderAlerts: true,
    maintenanceMode: false,
    offlineMode: true,
    defaultLanguage: 'en',
    currency: 'KES',
    taxRate: 16,
    serviceCharge: 10
  });

  const { toast } = useToast();

  const handleSave = (section) => {
    toast({
      title: "Settings saved",
      description: `${section} settings have been updated successfully`
    });
  };

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="payment">
                <CreditCard className="h-4 w-4 mr-2" />
                Payment
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="system">
                <Zap className="h-4 w-4 mr-2" />
                System
              </TabsTrigger>
              <TabsTrigger value="localization">
                <Globe className="h-4 w-4 mr-2" />
                Localization
              </TabsTrigger>
            </TabsList>

            <TabsContent value="payment" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gateway">Payment Gateway</Label>
                  <Select
                    value={config.paymentGateway}
                    onValueChange={(value) => updateConfig('paymentGateway', value)}
                  >
                    <SelectTrigger id="gateway">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="stripe">Stripe</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="cash">Cash Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {config.paymentGateway === 'mpesa' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="shortcode">M-Pesa Shortcode</Label>
                      <Input
                        id="shortcode"
                        placeholder="Enter shortcode"
                        value={config.mpesaShortcode}
                        onChange={(e) => updateConfig('mpesaShortcode', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passkey">M-Pesa Passkey</Label>
                      <Input
                        id="passkey"
                        type="password"
                        placeholder="Enter passkey"
                        value={config.mpesaPasskey}
                        onChange={(e) => updateConfig('mpesaPasskey', e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    value={config.taxRate}
                    onChange={(e) => updateConfig('taxRate', parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serviceCharge">Service Charge (%)</Label>
                  <Input
                    id="serviceCharge"
                    type="number"
                    value={config.serviceCharge}
                    onChange={(e) => updateConfig('serviceCharge', parseFloat(e.target.value))}
                  />
                </div>

                <Button onClick={() => handleSave('Payment')}>
                  Save Payment Settings
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email notifications for orders and bookings
                    </p>
                  </div>
                  <Switch
                    checked={config.emailNotifications}
                    onCheckedChange={(checked) => updateConfig('emailNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send SMS notifications for important updates
                    </p>
                  </div>
                  <Switch
                    checked={config.smsNotifications}
                    onCheckedChange={(checked) => updateConfig('smsNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Order Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Alert staff about new orders in real-time
                    </p>
                  </div>
                  <Switch
                    checked={config.orderAlerts}
                    onCheckedChange={(checked) => updateConfig('orderAlerts', checked)}
                  />
                </div>

                <Button onClick={() => handleSave('Notification')}>
                  Save Notification Settings
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="system" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Temporarily disable customer access for maintenance
                    </p>
                  </div>
                  <Switch
                    checked={config.maintenanceMode}
                    onCheckedChange={(checked) => updateConfig('maintenanceMode', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Offline Mode Support</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable offline functionality for staff and customers
                    </p>
                  </div>
                  <Switch
                    checked={config.offlineMode}
                    onCheckedChange={(checked) => updateConfig('offlineMode', checked)}
                  />
                </div>

                <Button onClick={() => handleSave('System')}>
                  Save System Settings
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="localization" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Default Language</Label>
                  <Select
                    value={config.defaultLanguage}
                    onValueChange={(value) => updateConfig('defaultLanguage', value)}
                  >
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="sw">Swahili</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={config.currency}
                    onValueChange={(value) => updateConfig('currency', value)}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KES">KES (Kenyan Shilling)</SelectItem>
                      <SelectItem value="USD">USD (US Dollar)</SelectItem>
                      <SelectItem value="EUR">EUR (Euro)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={() => handleSave('Localization')}>
                  Save Localization Settings
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}