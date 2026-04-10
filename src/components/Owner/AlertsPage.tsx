// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Bell, AlertTriangle, Plus, Trash2, RefreshCw, CheckCircle2, Shield, Clock } from 'lucide-react';
import api from '@/lib/api/client';
import { toast } from 'react-hot-toast';

const METRICS = [
  { value: 'occupancy_rate', label: 'Occupancy Rate (%)', unit: '%' },
  { value: 'daily_revenue', label: 'Daily Revenue (KES)', unit: 'KES' },
  { value: 'pending_requests', label: 'Pending Service Requests', unit: 'count' },
  { value: 'low_stock_items', label: 'Low Stock Items', unit: 'count' },
];

const SEVERITY_CFG = {
  critical: { cls: 'bg-rose-500/10 border-rose-500/30 text-rose-600', icon: '🔴', label: 'Critical' },
  warning:  { cls: 'bg-amber-500/10 border-amber-500/30 text-amber-600', icon: '🟡', label: 'Warning' },
};

// ─── Alert Center ─────────────────────────────────────────────────────────────
const AlertCenter = ({ isOwner }: { isOwner: boolean }) => {
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [form, setForm] = useState({ branch_id: '', name: '', metric: 'occupancy_rate', operator: 'below', threshold_value: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, aRes, bRes] = await Promise.all([
        api.get('/owner/alerts/thresholds'),
        api.get('/owner/alerts/active'),
        api.get('/owner/branches'),
      ]);
      setThresholds(tRes.data.thresholds || []);
      setActiveAlerts(aRes.data);
      setBranches(bRes.data.branches || []);
    } catch { toast.error('Failed to load alerts'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name || !form.threshold_value) return toast.error('Name and threshold are required');
    setSaving(true);
    try {
      await api.post('/owner/alerts/thresholds', {
        ...form,
        branch_id: form.branch_id || null,
        threshold_value: parseFloat(form.threshold_value),
      });
      toast.success('Alert created'); setShowDialog(false); load();
    } catch { toast.error('Save failed'); }
    setSaving(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      const t = thresholds.find(x => x.id === id);
      if (!t) return;
      await api.patch(`/owner/alerts/thresholds/${id}`, { ...t, is_active: !current });
      load();
    } catch { toast.error('Update failed'); }
  };

  const deleteThreshold = async (id: string) => {
    if (!confirm('Delete this alert threshold?')) return;
    try { await api.delete(`/owner/alerts/thresholds/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  const metricLabel = (m: string) => METRICS.find(x => x.value === m)?.label || m;

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-indigo-500" />Alert Center
              </CardTitle>
              <p className="text-xs text-muted-foreground">Configurable thresholds — get notified when metrics go out of range</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load} disabled={loading}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowDialog(true)}>
                <Plus className="h-3 w-3" />Add Alert
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Currently triggered */}
          {activeAlerts && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Live Status {activeAlerts.total > 0 && <span className="text-rose-500">({activeAlerts.total} triggered)</span>}
              </p>
              {activeAlerts.total === 0 ? (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-600">All metrics are within thresholds</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {(activeAlerts.alerts || []).map((a: any) => {
                    const cfg = SEVERITY_CFG[a.severity as keyof typeof SEVERITY_CFG] || SEVERITY_CFG.warning;
                    return (
                      <div key={a.id} className={`flex items-start justify-between p-3 rounded-lg border ${cfg.cls}`}>
                        <div>
                          <p className="font-semibold text-sm">{cfg.icon} {a.name}</p>
                          <p className="text-xs opacity-80 mt-0.5">
                            {metricLabel(a.metric)} is {a.operator} {a.threshold} — current: <strong>{a.current_value}</strong>
                          </p>
                        </div>
                        <span className="text-xs font-bold ml-2 flex-shrink-0">{cfg.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Metric snapshot */}
              {activeAlerts.metric_snapshot && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                  {Object.entries(activeAlerts.metric_snapshot).map(([k, v]) => (
                    <div key={k} className="p-2 bg-muted/30 rounded-lg text-center">
                      <p className="text-[10px] text-muted-foreground">{METRICS.find(m => m.value === k)?.label || k}</p>
                      <p className="font-bold text-sm">{String(v)}{k === 'occupancy_rate' ? '%' : ''}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Configured thresholds */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Configured Thresholds ({thresholds.length})</p>
            {thresholds.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm border border-dashed rounded-lg">
                No alert thresholds configured. Click "Add Alert" to set one up.
              </div>
            ) : (
              <div className="space-y-2">
                {thresholds.map((t: any) => (
                  <div key={t.id} className={`flex items-center justify-between p-3 rounded-lg border ${t.is_active ? 'bg-muted/20 border-border' : 'bg-muted/10 border-border opacity-50'}`}>
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="font-medium text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {metricLabel(t.metric)} {t.operator} {t.threshold_value}
                        {t.branch_name !== 'All Branches' && ` · ${t.branch_name}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch checked={t.is_active} onCheckedChange={() => toggleActive(t.id, t.is_active)} />
                      {isOwner && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteThreshold(t.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Bell className="h-4 w-4" />New Alert Threshold</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-1 block">Alert Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Low Occupancy Warning" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Branch (optional)</Label>
              <Select value={form.branch_id || 'all'} onValueChange={v => setForm(f => ({ ...f, branch_id: v === 'all' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="All Branches" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Metric</Label>
              <Select value={form.metric} onValueChange={v => setForm(f => ({ ...f, metric: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METRICS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Condition</Label>
                <Select value={form.operator} onValueChange={v => setForm(f => ({ ...f, operator: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="below">Falls Below</SelectItem>
                    <SelectItem value="above">Rises Above</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Threshold Value</Label>
                <Input type="number" value={form.threshold_value} onChange={e => setForm(f => ({ ...f, threshold_value: e.target.value }))} placeholder="e.g. 30" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Create Alert'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ─── Audit Log ────────────────────────────────────────────────────────────────
const AuditLog = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    api.get('/owner/alerts/audit-log', { params: { limit: 100 } })
      .then(r => { setLogs(r.data.logs || []); setLoading(false); })
      .catch(() => { toast.error('Audit log failed'); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const ACTION_CFG: Record<string, string> = {
    create: 'bg-emerald-500/10 text-emerald-600',
    upsert: 'bg-blue-500/10 text-blue-600',
    update: 'bg-indigo-500/10 text-indigo-600',
    delete: 'bg-rose-500/10 text-rose-600',
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-slate-500" />Audit Log
            </CardTitle>
            <p className="text-xs text-muted-foreground">Track who changed what across your system</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? <div className="p-6 text-center text-muted-foreground text-sm">Loading...</div> : logs.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">
            <Shield className="h-8 w-8 mx-auto mb-2 opacity-20" />
            No audit events yet. Actions taken in the owner dashboard will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background">
                <tr className="border-y bg-muted/40">
                  {['Time', 'User', 'Action', 'Resource', 'Details'].map(h => (
                    <th key={h} className={`p-3 font-semibold text-muted-foreground uppercase tracking-wide ${h === 'Time' || h === 'Resource' ? 'text-left pl-5' : 'text-left'} ${h === 'Details' ? 'hidden md:table-cell' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((l: any) => (
                  <tr key={l.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 pl-5 text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {(l.created_at || '').replace('T', ' ').slice(0, 16)}
                      </div>
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{l.user_email || '—'}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{l.user_role}</p>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ACTION_CFG[l.action] || 'bg-muted text-muted-foreground'}`}>
                        {l.action?.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 capitalize">{l.resource?.replace(/_/g, ' ')}</td>
                    <td className="p-3 text-muted-foreground hidden md:table-cell max-w-xs truncate">
                      {l.details ? JSON.stringify(l.details).slice(0, 60) + (JSON.stringify(l.details).length > 60 ? '…' : '') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const AlertsPage = ({ isOwner }: { isOwner: boolean }) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold">Alerts & Governance</h2>
      <p className="text-sm text-muted-foreground">Monitor thresholds and track all system actions</p>
    </div>
    <AlertCenter isOwner={isOwner} />
    <AuditLog />
  </div>
);
