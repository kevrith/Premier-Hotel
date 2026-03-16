import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, Award, DollarSign, Search } from 'lucide-react';
import api from '@/lib/api/client';
import { toast } from 'react-hot-toast';

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString()}`;

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  admin: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
  manager: 'bg-indigo-500/15 text-indigo-700 border-indigo-500/30',
  chef: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  waiter: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  cleaner: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  housekeeping: 'bg-teal-500/15 text-teal-700 border-teal-500/30',
};

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-xl p-3 text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Staff Performance ────────────────────────────────────────────────────────
const StaffPerformance = () => {
  const [data, setData] = useState<any[]>([]);
  const [days, setDays] = useState('30');
  const [role, setRole] = useState('all');
  useEffect(() => {
    api.get('/owner/people/performance', { params: { days } }).then(r => setData(r.data.performance || [])).catch(() => toast.error('Performance load failed'));
  }, [days]);
  const filtered = role === 'all' ? data : data.filter(s => s.role === role);
  const chartData = filtered.slice(0, 10).map(s => ({ name: s.name.split(' ')[0], [s.metric_label]: s.metric_value }));
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />Staff Performance
            </CardTitle>
            <p className="text-xs text-muted-foreground">Top performers by role</p>
          </div>
          <div className="flex gap-2">
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="waiter">Waiters</SelectItem>
                <SelectItem value="cleaner">Cleaners</SelectItem>
              </SelectContent>
            </Select>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7D</SelectItem>
                <SelectItem value="30">30D</SelectItem>
                <SelectItem value="90">90D</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">No performance data for this period.</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip content={<ChartTip />} />
                {Object.keys(chartData[0] || {}).filter(k => k !== 'name').map((k, i) => (
                  <Bar key={k} dataKey={k} fill={i === 0 ? '#6366f1' : '#10b981'} radius={[0, 4, 4, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    {['Name', 'Role', 'Branch', 'Metric', 'Revenue'].map(h => (
                      <th key={h} className={`p-2 font-semibold text-muted-foreground uppercase tracking-wide ${h === 'Name' || h === 'Role' ? 'text-left' : 'text-right'} ${h === 'Branch' ? 'hidden md:table-cell' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 15).map((s, i) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {i < 3 && <span className="text-amber-500 font-bold">#{i + 1}</span>}
                          <span className="font-medium">{s.name}</span>
                        </div>
                      </td>
                      <td className="p-2"><span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${ROLE_COLORS[s.role] || 'bg-muted text-muted-foreground border-border'}`}>{s.role}</span></td>
                      <td className="p-2 text-muted-foreground hidden md:table-cell">{s.branch}</td>
                      <td className="p-2 text-right font-semibold">{s.metric_value} <span className="text-muted-foreground font-normal text-[10px]">{s.metric_label}</span></td>
                      <td className="p-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">{s.revenue > 0 ? fmt(s.revenue) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Staff Directory ──────────────────────────────────────────────────────────
const StaffDirectory = () => {
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  useEffect(() => {
    api.get('/owner/people/directory').then(r => setData(r.data)).catch(() => toast.error('Directory load failed'));
  }, []);

  const staff = (data?.staff || []).filter((s: any) =>
    (roleFilter === 'all' || s.role === roleFilter) &&
    (s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
     s.email?.toLowerCase().includes(search.toLowerCase()) ||
     s.branch?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" />Staff Directory
            </CardTitle>
            <p className="text-xs text-muted-foreground">{data?.total || 0} staff across all branches</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="h-7 pl-7 text-xs w-36" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {['owner', 'admin', 'manager', 'chef', 'waiter', 'cleaner'].map(r => (
                  <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-y bg-muted/40">
                {['Name', 'Role', 'Branch', 'Phone', 'Status'].map(h => (
                  <th key={h} className={`p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide ${h === 'Name' ? 'text-left pl-5' : 'text-left'} ${['Phone'].includes(h) ? 'hidden md:table-cell' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((s: any) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="p-3 pl-5">
                    <p className="font-semibold">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${ROLE_COLORS[s.role] || 'bg-muted text-muted-foreground border-border'}`}>{s.role}</span></td>
                  <td className="p-3">
                    <p className="text-sm">{s.branch}</p>
                    {s.branch_location && <p className="text-xs text-muted-foreground">{s.branch_location}</p>}
                  </td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{s.phone || '—'}</td>
                  <td className="p-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Payroll Overview ─────────────────────────────────────────────────────────
const PayrollOverview = () => {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    api.get('/owner/people/payroll').then(r => setData(r.data)).catch(() => toast.error('Payroll load failed'));
  }, []);
  if (!data) return null;
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />Payroll Overview
            </CardTitle>
            <p className="text-xs text-muted-foreground">{data.note}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Est. Monthly Total</p>
            <p className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(data.total_estimated_payroll)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 mt-2">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y bg-muted/40">
                {['Branch', 'Headcount', 'Est. Payroll', 'Role Breakdown'].map(h => (
                  <th key={h} className={`p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide ${h === 'Branch' ? 'text-left pl-5' : 'text-right'} ${h === 'Role Breakdown' ? 'text-left hidden lg:table-cell' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.branches.map((b: any) => (
                <tr key={b.branch_id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-3 pl-5 font-semibold">{b.branch_name}</td>
                  <td className="p-3 text-right">{b.headcount}</td>
                  <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{fmt(b.estimated_payroll)}</td>
                  <td className="p-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(b.by_role || {}).map(([role, stats]: any) => (
                        <span key={role} className={`text-[10px] px-1.5 py-0.5 rounded border ${ROLE_COLORS[role] || 'bg-muted text-muted-foreground border-border'}`}>
                          {role}: {stats.count}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export const PeoplePage = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold">People Management</h2>
      <p className="text-sm text-muted-foreground">Staff performance, directory, and payroll across all branches</p>
    </div>
    <StaffPerformance />
    <StaffDirectory />
    <PayrollOverview />
  </div>
);
