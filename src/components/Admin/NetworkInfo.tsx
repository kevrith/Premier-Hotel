import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, Copy, Check, Monitor, Smartphone } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface StaffRole {
  role: string;
  path: string;
  color: string;
}

const STAFF_ROLES: StaffRole[] = [
  { role: 'Waiter',   path: '/waiter',  color: 'bg-blue-100 text-blue-800' },
  { role: 'Chef / Kitchen Display', path: '/chef', color: 'bg-orange-100 text-orange-800' },
  { role: 'Cleaner',  path: '/cleaner', color: 'bg-green-100 text-green-800' },
  { role: 'Manager',  path: '/manager', color: 'bg-purple-100 text-purple-800' },
  { role: 'Owner',    path: '/owner',   color: 'bg-yellow-100 text-yellow-800' },
];

export function NetworkInfo() {
  const [copied, setCopied] = useState<string | null>(null);
  const [isLocalNetwork, setIsLocalNetwork] = useState(false);

  const hostname = window.location.hostname;
  const port = window.location.port || '5173';
  const baseUrl = `http://${hostname}:${port}`;
  const isLan = hostname !== 'localhost' && hostname !== '127.0.0.1';

  useEffect(() => {
    setIsLocalNetwork(isLan);
  }, [isLan]);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      toast.success('Copied!');
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className={isLocalNetwork ? 'border-green-500' : 'border-yellow-500'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isLocalNetwork
              ? <><Wifi className="h-5 w-5 text-green-500" /> Local Network Mode</>
              : <><Monitor className="h-5 w-5 text-yellow-500" /> Running on Localhost</>
            }
          </CardTitle>
          <CardDescription>
            {isLocalNetwork
              ? `Staff devices on the hotel WiFi can access the system at ${baseUrl}`
              : 'Only this computer can access the app. Use start-hotel.sh to serve it on the local network.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg font-mono text-sm">
            <span className="flex-1 break-all">{baseUrl}</span>
            <Button size="sm" variant="ghost" onClick={() => copy(baseUrl, 'base')}>
              {copied === 'base' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Staff Access URLs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Staff Access URLs
          </CardTitle>
          <CardDescription>
            Share these URLs with staff. They open the app directly on their role dashboard.
            {!isLocalNetwork && <span className="text-yellow-600"> (Replace localhost with the server IP when running on the network)</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {STAFF_ROLES.map(({ role, path, color }) => {
              const url = `${baseUrl}${path}`;
              return (
                <div key={path} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Badge className={`${color} min-w-[140px] justify-center text-xs`}>{role}</Badge>
                  <span className="flex-1 font-mono text-sm text-muted-foreground break-all">{url}</span>
                  <Button size="sm" variant="ghost" onClick={() => copy(url, path)}>
                    {copied === path ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-2">
            <p className="font-semibold">1. Start the system on the server PC:</p>
            <div className="bg-muted p-3 rounded font-mono text-xs flex items-center gap-2">
              <span className="flex-1">bash start-hotel.sh</span>
              <Button size="sm" variant="ghost" onClick={() => copy('bash start-hotel.sh', 'cmd')}>
                {copied === 'cmd' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div>
            <p className="font-semibold">2. Connect staff phones to hotel WiFi</p>
            <p className="text-muted-foreground">All devices must be on the same WiFi network as the server PC.</p>
          </div>
          <div>
            <p className="font-semibold">3. Open the URL on each device</p>
            <p className="text-muted-foreground">Staff open their role URL in Chrome or any browser. Bookmark it for easy access.</p>
          </div>
          <div>
            <p className="font-semibold">4. Works without internet</p>
            <p className="text-muted-foreground">Once loaded, the app works on the local network only — no internet required. Supabase cloud data syncs whenever internet is available.</p>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-blue-800">
            <p className="font-semibold">Offline orders → Kitchen display</p>
            <p className="mt-1">When a waiter creates an order offline (no internet), it syncs to the backend as soon as the device reconnects to WiFi. The kitchen display updates automatically via the local network.</p>
          </div>
        </CardContent>
      </Card>

      {/* Network Status */}
      <Card>
        <CardHeader><CardTitle>Current Connection</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">App hostname</p>
              <p className="font-mono font-semibold">{hostname}</p>
            </div>
            <div>
              <p className="text-muted-foreground">App port</p>
              <p className="font-mono font-semibold">{port}</p>
            </div>
            <div>
              <p className="text-muted-foreground">API server</p>
              <p className="font-mono font-semibold">{hostname}:8000</p>
            </div>
            <div>
              <p className="text-muted-foreground">Network mode</p>
              {isLocalNetwork
                ? <Badge className="bg-green-100 text-green-800">LAN — staff can connect</Badge>
                : <Badge className="bg-yellow-100 text-yellow-800">Localhost only</Badge>
              }
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
