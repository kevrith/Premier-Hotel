// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { ordersApi } from '@/lib/api/orders';
import { printOrderSlip } from '@/lib/print';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Printer, Wifi, WifiOff, CheckCircle, Clock, RefreshCw } from 'lucide-react';

const POLL_INTERVAL = 5000; // check every 5 seconds
const STORAGE_KEY = 'pos:printed_order_ids';

function getPrintedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function savePrintedId(id: string) {
  const ids = getPrintedIds();
  ids.add(id);
  // keep last 200 only to avoid bloat
  const trimmed = [...ids].slice(-200);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export default function PrintStation() {
  const [isRunning, setIsRunning] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [printLog, setPrintLog] = useState<Array<{
    order_number: string;
    location: string;
    time: Date;
    auto: boolean;
  }>>([]);
  const [errorCount, setErrorCount] = useState(0);
  const startedAt = useRef(new Date().toISOString());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkAndPrint = async () => {
    try {
      const orders = await ordersApi.getAll({ limit: 50, status: 'pending' });
      const printedIds = getPrintedIds();

      // Only consider orders created after this tab was opened
      const newOrders = orders.filter(o =>
        !printedIds.has(o.id) &&
        new Date(o.created_at) >= new Date(startedAt.current)
      );

      for (const order of newOrders) {
        printOrderSlip(order);
        savePrintedId(order.id);
        setPrintLog(prev => [{
          order_number: order.order_number,
          location: order.location,
          time: new Date(),
          auto: true,
        }, ...prev].slice(0, 50));
      }

      setLastCheck(new Date());
      setErrorCount(0);
    } catch {
      setErrorCount(c => c + 1);
    }
  };

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    checkAndPrint();
    intervalRef.current = setInterval(checkAndPrint, POLL_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  const handleManualPrint = async () => {
    await checkAndPrint();
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Printer className="h-6 w-6 text-amber-400" />
            <div>
              <h1 className="text-lg font-bold">KOT Print Station</h1>
              <p className="text-xs text-gray-400">Keep this tab open on the station computer</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700 text-gray-300 hover:text-white"
              onClick={handleManualPrint}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Check Now
            </Button>

            <Button
              size="sm"
              variant={isRunning ? 'destructive' : 'default'}
              onClick={() => setIsRunning(r => !r)}
            >
              {isRunning ? 'Pause' : 'Resume'}
            </Button>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-gray-900 px-6 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between max-w-2xl mx-auto text-sm">
          <div className="flex items-center gap-2">
            {isRunning && errorCount < 3 ? (
              <><Wifi className="h-4 w-4 text-green-400" />
              <span className="text-green-400 font-medium">Listening for orders</span></>
            ) : isRunning && errorCount >= 3 ? (
              <><WifiOff className="h-4 w-4 text-red-400" />
              <span className="text-red-400 font-medium">Connection issues — retrying…</span></>
            ) : (
              <><WifiOff className="h-4 w-4 text-gray-500" />
              <span className="text-gray-500 font-medium">Paused</span></>
            )}
          </div>

          <div className="flex items-center gap-4 text-gray-400">
            <span>Checks every 5s</span>
            {lastCheck && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last check: {formatTime(lastCheck)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pulsing indicator when running */}
      {isRunning && errorCount < 3 && (
        <div className="bg-green-950 border-b border-green-900 px-6 py-2">
          <div className="flex items-center gap-2 max-w-2xl mx-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-green-300 text-xs">
              Auto-printing new orders — session started at {new Date(startedAt.current).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          </div>
        </div>
      )}

      {/* Print Log */}
      <div className="flex-1 px-6 py-6 max-w-2xl mx-auto w-full">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Printed This Session ({printLog.length})
        </h2>

        {printLog.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <Printer className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Waiting for orders…</p>
            <p className="text-sm mt-1">New orders will print automatically</p>
          </div>
        ) : (
          <div className="space-y-2">
            {printLog.map((entry, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <div>
                    <span className="font-mono font-bold text-white">{entry.order_number}</span>
                    <span className="text-gray-400 text-sm ml-3">{entry.location}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {entry.auto && (
                    <Badge variant="outline" className="text-xs border-green-800 text-green-400">
                      auto
                    </Badge>
                  )}
                  <span className="text-xs text-gray-500">{formatTime(entry.time)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer tip */}
      <div className="px-6 py-4 border-t border-gray-800 text-center text-xs text-gray-600">
        This tab must remain open on the computer connected to the printer.
        Orders placed from any device (phone, tablet, another computer) will print here automatically.
      </div>
    </div>
  );
}
