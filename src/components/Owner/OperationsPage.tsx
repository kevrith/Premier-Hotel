import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BedDouble, Package, Sparkles, Bell, RefreshCw, AlertTriangle, CheckCircle2, Clock, Wrench } from 'lucide-react';
import api from '@/lib/api/client';
import { toast } from 'react-hot-toast';

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString()}`;

const ROOM_STATUS_CFG: Record<string, { label: string; cls: string; icon: string }> = {
  occupied:          { label: 'Occupied',     cls: 'bg-rose-500/15 text-rose-600 border-rose-500/30',    icon: '🔴' },
  available:         { label: 'Available',    cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', icon: '🟢' },
  dirty:             { label: 'Dirty',        cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30', icon: '🟡' },
  cleaning:          { label: 'Cleaning',     cls: 'bg-blue-500/15 text-blue-600 border-blue-500/30',    icon: '🔵' },
  under_maintenance: { label: 'Maintenance',  cls: 'bg-slate-500/15 text-slate-500 border-slate-500/30', icon: '⚫' },
  reserved:          { label: 'Reserved',     cls: 'bg-purple-500/15 text-purple-600 border-purple-500/30', icon: '🟣' },
  out_of_order:      { label: 'Out of Order', cls: 'bg-slate-500/15 text-slate-500 border-slate-500/30', icon: '⚫' },
};

// ─── Room Status Board ───────────────────────────────────────────────────────
const RoomsBoard = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    api.get('/owner/operations/rooms').then(r => { setData(r.data); setLoading(false); })
      .catch(() => { toast.error('Failed to load room status'); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="p-8 text-center text-muted-foreground text-sm">Loading rooms...</div>;
  if (!data) return null;
  const { summary, branches } = data;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-indigo-500" />Live Room Status Board
            </CardTitle>
            <p className="text-xs text-muted-foreground">Real-time across all branches</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { label: 'Occupied', val: summary.occupied, cls: 'bg-rose-500/10 text-rose-600' },
            { label: 'Available', val: summary.vacant, cls: 'bg-emerald-500/10 text-emerald-600' },
            { label: 'Dirty', val: summary.dirty, cls: 'bg-amber-500/10 text-amber-600' },
            { label: 'Maintenance', val: summary.maintenance, cls: 'bg-slate-500/10 text-slate-500' },
            { label: `Occupancy`, val: `${summary.occupancy_rate}%`, cls: 'bg-indigo-500/10 text-indigo-600 font-bold' },
          ].map(s => (
            <span key={s.label} className={`text-xs font-medium px-3 py-1 rounded-full ${s.cls}`}>
              {s.label}: {s.val}
            </span>
          ))}
        </div>

        {branches.map((branch: any) => (
          <div key={branch.id || branch.name} className="mb-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{branch.name}</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5">
              {branch.rooms.map((r: any) => {
                const cfg = ROOM_STATUS_CFG[r.status] || ROOM_STATUS_CFG.available;
                return (
                  <div key={r.id} className={`relative p-2 rounded-lg border text-center cursor-default hover:scale-105 transition-transform ${cfg.cls}`}
                    title={`Room ${r.room_number} — ${cfg.label}\n${r.type}`}>
                    <p className="text-xs font-bold leading-none">{r.room_number}</p>
                    <p className="text-[10px] opacity-70 mt-0.5 leading-none truncate">{r.type?.slice(0, 4)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t">
          {Object.entries(ROOM_STATUS_CFG).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className={`w-2.5 h-2.5 rounded-sm border ${v.cls}`} />{v.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Inventory Alerts ────────────────────────────────────────────────────────
const InventoryAlerts = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/owner/operations/inventory-alerts').then(r => { setData(r.data); setLoading(false); })
      .catch(() => { toast.error('Failed to load inventory'); setLoading(false); });
  }, []);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Package className="h-4 w-4 text-amber-500" />Inventory Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div> : !data || data.total === 0 ? (
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-600">All stock levels are healthy</span>
          </div>
        ) : (
          <>
            <div className="flex gap-3 mb-3">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600">{data.critical} Critical</span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600">{data.low} Low</span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground ml-auto">Reorder: {fmt(data.total_reorder_cost)}</span>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {data.alerts.map((a: any) => (
                <div key={a.id} className={`flex items-center justify-between p-2.5 rounded-lg border text-sm ${a.level === 'critical' ? 'border-rose-500/30 bg-rose-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                  <div>
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.quantity} / {a.min_quantity} {a.unit} min</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold ${a.level === 'critical' ? 'text-rose-600' : 'text-amber-600'}`}>
                      {a.level === 'critical' ? '⚠ OUT' : '↓ LOW'}
                    </span>
                    {a.reorder_cost > 0 && <p className="text-xs text-muted-foreground">{fmt(a.reorder_cost)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Housekeeping Status ──────────────────────────────────────────────────────
const HousekeepingStatus = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/owner/operations/housekeeping').then(r => { setData(r.data); setLoading(false); })
      .catch(() => { toast.error('Failed to load housekeeping'); setLoading(false); });
  }, []);

  const PRIORITY_CLS: Record<string, string> = {
    urgent: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
    high:   'bg-amber-500/10 text-amber-600 border-amber-500/30',
    normal: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    low:    'bg-muted text-muted-foreground border-border',
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-500" />Housekeeping Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div> : (
          <>
            <div className="flex gap-2 flex-wrap mb-3">
              {[
                { label: 'Pending Tasks', val: data?.pending_tasks, cls: 'bg-indigo-500/10 text-indigo-600' },
                { label: 'Urgent', val: data?.urgent_tasks, cls: 'bg-rose-500/10 text-rose-600' },
                { label: 'Dirty Rooms', val: data?.dirty_rooms, cls: 'bg-amber-500/10 text-amber-600' },
              ].map(s => (
                <span key={s.label} className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.cls}`}>
                  {s.label}: {s.val ?? 0}
                </span>
              ))}
            </div>
            {(data?.tasks || []).length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-600">No pending housekeeping tasks</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {(data.tasks || []).map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border text-sm">
                    <div>
                      <p className="font-medium capitalize">{t.task_type?.replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">{t.assigned_to_name}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${PRIORITY_CLS[t.priority] || PRIORITY_CLS.normal}`}>
                      {t.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Service Requests ─────────────────────────────────────────────────────────
const ServiceRequestsWidget = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/owner/operations/service-requests').then(r => { setData(r.data); setLoading(false); })
      .catch(() => { toast.error('Failed to load service requests'); setLoading(false); });
  }, []);

  const PRIORITY_CLS: Record<string, string> = {
    urgent: 'text-rose-600 bg-rose-500/10',
    high: 'text-amber-600 bg-amber-500/10',
    normal: 'text-blue-600 bg-blue-500/10',
    low: 'text-muted-foreground bg-muted',
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4 text-rose-500" />Pending Service Requests
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div> : (
          <>
            <div className="flex gap-2 flex-wrap mb-3">
              {[
                { label: 'Urgent', val: data?.urgent, cls: 'bg-rose-500/10 text-rose-600' },
                { label: 'High', val: data?.high, cls: 'bg-amber-500/10 text-amber-600' },
                { label: 'Normal', val: data?.normal, cls: 'bg-blue-500/10 text-blue-600' },
              ].map(s => (
                <span key={s.label} className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.cls}`}>
                  {s.label}: {s.val ?? 0}
                </span>
              ))}
            </div>
            {(data?.requests || []).length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-600">No pending requests</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {(data.requests || []).map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{r.title || r.category}</p>
                      <p className="text-xs text-muted-foreground capitalize">{r.status?.replace('_', ' ')} · #{r.request_number}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${PRIORITY_CLS[r.priority] || PRIORITY_CLS.normal}`}>
                      {r.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export const OperationsPage = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold">Operations Center</h2>
      <p className="text-sm text-muted-foreground">Live status across all branches</p>
    </div>
    <RoomsBoard />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <InventoryAlerts />
      <HousekeepingStatus />
      <ServiceRequestsWidget />
    </div>
  </div>
);
