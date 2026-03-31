// @ts-nocheck
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, Table2, Users, TrendingUp, Building2, RefreshCw } from 'lucide-react';
import api from '@/lib/api/client';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString()}`;
const today = new Date().toISOString().slice(0, 10);
const monthStart = today.slice(0, 7) + '-01';

// ─── Helper: download XLSX ────────────────────────────────────────────────────
function downloadXLSX(sheets: { name: string; data: any[][] }[], filename: string) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(s => {
    const ws = XLSX.utils.aoa_to_sheet(s.data);
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  });
  XLSX.writeFile(wb, filename);
}

// ─── P&L PDF Export ───────────────────────────────────────────────────────────
const PLExport = () => {
  const [start, setStart] = useState(monthStart);
  const [end, setEnd] = useState(today);
  const [loading, setLoading] = useState(false);

  const exportPDF = async () => {
    setLoading(true);
    try {
      const [finRes, ovRes] = await Promise.all([
        api.get('/owner/consolidated-financials', { params: { start_date: start, end_date: end } }),
        api.get('/owner/overview', { params: { start_date: start, end_date: end } }),
      ]);
      const fin = finRes.data;
      const branches: any[] = ovRes.data?.branches || [];

      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(67, 56, 202);
      doc.rect(0, 0, pageW, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Premier Hotels — Profit & Loss Statement', 14, 12);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Period: ${start} to ${end}`, 14, 20);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - 14, 20, { align: 'right' });

      doc.setTextColor(0, 0, 0);
      let y = 36;

      // Consolidated P&L
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Consolidated Summary', 14, y);
      y += 6;

      autoTable(doc, {
        startY: y,
        head: [['Item', 'Amount (KES)']],
        body: [
          ['F&B Revenue', fmt(fin.revenue?.fb || 0)],
          ['Room Revenue', fmt(fin.revenue?.rooms || 0)],
          ['Total Revenue', fmt(fin.revenue?.total || 0)],
          ['Total Expenses', `(${fmt(fin.expenses || 0)})`],
          ['Gross Profit', fmt(fin.gross_profit || 0)],
          ['Profit Margin', `${Number(fin.profit_margin || 0).toFixed(1)}%`],
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [67, 56, 202] },
        columnStyles: { 1: { halign: 'right' } },
        didParseCell: (data) => {
          if (data.row.index >= 2 && data.row.index <= 4 && data.section === 'body') {
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // Branch breakdown
      if (branches.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Branch Breakdown', 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [['Branch', 'Status', 'Revenue', 'F&B', 'Rooms', 'Occupancy', 'Orders', 'Bookings']],
          body: branches.map((b: any) => [
            b.name,
            b.status,
            fmt(b.stats.total_revenue),
            fmt(b.stats.fb_revenue),
            fmt(b.stats.room_revenue),
            `${Number(b.stats.occupancy_rate || 0).toFixed(1)}%`,
            b.stats.total_orders,
            b.stats.total_bookings,
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [67, 56, 202] },
          columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
        });
      }

      doc.save(`PnL_${start}_${end}.pdf`);
      toast.success('PDF downloaded');
    } catch {
      toast.error('Export failed');
    }
    setLoading(false);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 text-rose-500" />P&L Statement — PDF
        </CardTitle>
        <p className="text-xs text-muted-foreground">Full profit &amp; loss with branch breakdown</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-1 block">From</Label>
            <Input type="date" value={start} onChange={e => setStart(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs mb-1 block">To</Label>
            <Input type="date" value={end} onChange={e => setEnd(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>
        <Button onClick={exportPDF} disabled={loading} className="w-full gap-2 h-8 text-xs">
          {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {loading ? 'Generating...' : 'Download PDF'}
        </Button>
      </CardContent>
    </Card>
  );
};

// ─── Branch Stats XLSX Export ────────────────────────────────────────────────
const BranchStatsExport = () => {
  const [days, setDays] = useState('30');
  const [loading, setLoading] = useState(false);

  const exportXLSX = async () => {
    setLoading(true);
    try {
      const res = await api.get('/owner/overview', { params: { days } });
      const branches: any[] = res.data?.branches || [];
      const c = res.data?.consolidated || {};

      const header = ['Branch', 'Status', 'Total Revenue', 'F&B Revenue', 'Room Revenue',
        'Total Orders', 'Completed Orders', 'Total Bookings', 'Unique Customers',
        'Occupancy %', 'Total Rooms', 'Occupied Rooms', 'Total Staff', 'Active Staff'];

      const rows = branches.map((b: any) => [
        b.name, b.status,
        b.stats.total_revenue, b.stats.fb_revenue, b.stats.room_revenue,
        b.stats.total_orders, b.stats.completed_orders, b.stats.total_bookings,
        b.stats.unique_customers,
        Number(b.stats.occupancy_rate || 0).toFixed(1),
        b.stats.total_rooms, b.stats.occupied_rooms,
        b.stats.total_staff, b.stats.active_staff,
      ]);

      const summaryRow = [
        'ALL BRANCHES (Consolidated)', '—',
        c.total_revenue, c.fb_revenue, c.room_revenue,
        c.total_orders, c.completed_orders, c.total_bookings,
        c.unique_customers,
        Number(c.avg_occupancy_rate || 0).toFixed(1),
        '—', '—', c.total_staff, c.active_staff,
      ];

      downloadXLSX([
        { name: 'Branch Stats', data: [header, ...rows, [], summaryRow] },
      ], `BranchStats_Last${days}d.xlsx`);

      toast.success('Excel downloaded');
    } catch {
      toast.error('Export failed');
    }
    setLoading(false);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4 text-indigo-500" />Branch Statistics — Excel
        </CardTitle>
        <p className="text-xs text-muted-foreground">Revenue, occupancy, orders per branch</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs mb-1 block">Period</Label>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={exportXLSX} disabled={loading} className="w-full gap-2 h-8 text-xs" variant="outline">
          {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {loading ? 'Generating...' : 'Download Excel'}
        </Button>
      </CardContent>
    </Card>
  );
};

// ─── Staff List XLSX Export ───────────────────────────────────────────────────
const StaffExport = () => {
  const [loading, setLoading] = useState(false);

  const exportXLSX = async () => {
    setLoading(true);
    try {
      const [dirRes, perfRes] = await Promise.all([
        api.get('/owner/people/directory'),
        api.get('/owner/people/performance', { params: { days: 30 } }),
      ]);
      const staff: any[] = dirRes.data?.staff || [];
      const perf: any[] = perfRes.data?.performance || [];

      const dirHeader = ['Name', 'Email', 'Role', 'Branch', 'Phone', 'Status', 'Joined'];
      const dirRows = staff.map((s: any) => [
        s.full_name, s.email, s.role, s.branch, s.phone || '', s.status, (s.created_at || '').slice(0, 10),
      ]);

      const perfHeader = ['Name', 'Role', 'Branch', 'Metric', 'Metric Value', 'Revenue (KES)'];
      const perfRows = perf.map((p: any) => [
        p.name, p.role, p.branch, p.metric_label, p.metric_value, p.revenue,
      ]);

      downloadXLSX([
        { name: 'Staff Directory', data: [dirHeader, ...dirRows] },
        { name: 'Performance (30d)', data: [perfHeader, ...perfRows] },
      ], `Staff_Export_${today}.xlsx`);

      toast.success('Excel downloaded');
    } catch {
      toast.error('Export failed');
    }
    setLoading(false);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-500" />Staff List — Excel
        </CardTitle>
        <p className="text-xs text-muted-foreground">Full directory + 30-day performance on two sheets</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg border border-dashed">
          Exports all staff with their roles, branches, contact info, and performance metrics.
        </p>
        <Button onClick={exportXLSX} disabled={loading} className="w-full gap-2 h-8 text-xs" variant="outline">
          {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {loading ? 'Generating...' : 'Download Excel'}
        </Button>
      </CardContent>
    </Card>
  );
};

// ─── Revenue Report XLSX Export ───────────────────────────────────────────────
const RevenueExport = () => {
  const [start, setStart] = useState(monthStart);
  const [end, setEnd] = useState(today);
  const [loading, setLoading] = useState(false);

  const exportXLSX = async () => {
    setLoading(true);
    try {
      const [ovRes, expRes, vatRes] = await Promise.all([
        api.get('/owner/overview', { params: { start_date: start, end_date: end } }),
        api.get('/owner/reports/expenses', { params: { start_date: start, end_date: end } }),
        api.get('/owner/reports/vat'),
      ]);

      const branches: any[] = ovRes.data?.branches || [];
      const expenses: any[] = expRes.data?.by_type || [];
      const vatRows: any[] = vatRes.data?.monthly || [];

      const revHeader = ['Branch', 'Total Revenue', 'F&B Revenue', 'Room Revenue', 'Orders', 'Bookings', 'Occupancy %'];
      const revRows = branches.map((b: any) => [
        b.name, b.stats.total_revenue, b.stats.fb_revenue, b.stats.room_revenue,
        b.stats.total_orders, b.stats.total_bookings,
        Number(b.stats.occupancy_rate || 0).toFixed(1),
      ]);

      const expHeader = ['Expense Type', 'Total Amount (KES)', 'Count'];
      const expRows = expenses.map((e: any) => [e.type, e.total, e.count]);

      const vatHeader = ['Month', 'Gross Revenue', 'VAT Collected', 'VATable Expenses', 'VAT Paid', 'Net VAT'];
      const vatData = vatRows.map((v: any) => [
        v.month, v.gross_revenue, v.vat_collected, v.vatable_expenses, v.vat_paid, v.net_vat,
      ]);

      downloadXLSX([
        { name: 'Revenue by Branch', data: [revHeader, ...revRows] },
        { name: 'Expense Breakdown', data: [expHeader, ...expRows] },
        { name: 'VAT Summary', data: [vatHeader, ...vatData] },
      ], `Revenue_Report_${start}_${end}.xlsx`);

      toast.success('Excel downloaded');
    } catch {
      toast.error('Export failed');
    }
    setLoading(false);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-amber-500" />Revenue Report — Excel
        </CardTitle>
        <p className="text-xs text-muted-foreground">Branch revenue, expense breakdown, VAT on 3 sheets</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-1 block">From</Label>
            <Input type="date" value={start} onChange={e => setStart(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs mb-1 block">To</Label>
            <Input type="date" value={end} onChange={e => setEnd(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>
        <Button onClick={exportXLSX} disabled={loading} className="w-full gap-2 h-8 text-xs" variant="outline">
          {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {loading ? 'Generating...' : 'Download Excel'}
        </Button>
      </CardContent>
    </Card>
  );
};

// ─── Customer Report XLSX Export ─────────────────────────────────────────────
const CustomerExport = () => {
  const [loading, setLoading] = useState(false);

  const exportXLSX = async () => {
    setLoading(true);
    try {
      const [clvRes, rrRes] = await Promise.all([
        api.get('/owner/analytics/clv', { params: { limit: 100 } }),
        api.get('/owner/customers/repeat-rate', { params: { days: 90 } }),
      ]);

      const customers: any[] = clvRes.data?.customers || [];
      const rr = rrRes.data || {};

      const custHeader = ['Rank', 'Customer Name', 'Email', 'Total Spend (KES)', 'Total Visits', 'Avg Spend/Visit'];
      const custRows = customers.map((c: any, i: number) => [
        i + 1, c.name, c.email, c.total_spend, c.total_visits, c.avg_spend,
      ]);

      const rrHeader = ['Metric', 'Value'];
      const rrData = [
        ['Total Customers', rr.total_customers],
        ['Repeat Customers', rr.repeat_customers],
        ['Repeat Rate', `${rr.repeat_rate_pct}%`],
        ['Loyal Customers (5+ visits)', rr.loyal_customers],
        ['1 Visit', rr.frequency_distribution?.['1']],
        ['2-3 Visits', rr.frequency_distribution?.['2-3']],
        ['4-6 Visits', rr.frequency_distribution?.['4-6']],
        ['7+ Visits', rr.frequency_distribution?.['7+']],
      ];

      downloadXLSX([
        { name: 'Top Customers (CLV)', data: [custHeader, ...custRows] },
        { name: 'Repeat Rate (90d)', data: [rrHeader, ...rrData] },
      ], `Customer_Report_${today}.xlsx`);

      toast.success('Excel downloaded');
    } catch {
      toast.error('Export failed');
    }
    setLoading(false);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Table2 className="h-4 w-4 text-purple-500" />Customer Report — Excel
        </CardTitle>
        <p className="text-xs text-muted-foreground">Top 100 customers by lifetime value + repeat rate metrics</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg border border-dashed">
          Exports top 100 customers with lifetime spend, visit count, and 90-day repeat rate breakdown.
        </p>
        <Button onClick={exportXLSX} disabled={loading} className="w-full gap-2 h-8 text-xs" variant="outline">
          {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {loading ? 'Generating...' : 'Download Excel'}
        </Button>
      </CardContent>
    </Card>
  );
};

// ─── Export Page ──────────────────────────────────────────────────────────────
export const ExportPage = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold">Export Center</h2>
      <p className="text-sm text-muted-foreground">Download financial reports, branch data, staff lists, and customer analytics</p>
    </div>

    <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl text-sm text-indigo-700 dark:text-indigo-300">
      <strong>All exports pull live data</strong> — select your date range, then click Download. PDFs open immediately; Excel files save to your downloads folder.
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <PLExport />
      <BranchStatsExport />
      <StaffExport />
      <RevenueExport />
      <CustomerExport />
    </div>
  </div>
);
