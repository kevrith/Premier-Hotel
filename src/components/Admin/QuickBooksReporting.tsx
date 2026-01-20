import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FileText, Download, Calendar, Filter, Settings, Mail, Clock,
  DollarSign, TrendingUp, Package, Users, CreditCard, FileBarChart,
  Briefcase, Building, Wallet, BarChart3, PieChart, ListChecks, Printer, User
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { reportsService } from '@/lib/api/reports';
import { staffService } from '@/lib/api/staff';

// QuickBooks-style Report Categories
const reportCategories = {
  financial: {
    name: 'Company & Financial',
    icon: DollarSign,
    reports: [
      'Profit & Loss Standard',
      'Profit & Loss Detail',
      'Profit & Loss by Month',
      'Profit & Loss by Class',
      'Balance Sheet Standard',
      'Balance Sheet Detail',
      'Balance Sheet Summary',
      'Statement of Cash Flows',
      'Trial Balance',
      'General Ledger',
      'Transaction Detail by Account',
      'Income by Customer Summary'
    ]
  },
  sales: {
    name: 'Sales',
    icon: TrendingUp,
    reports: [
      'Sales by Customer Summary',
      'Sales by Customer Detail',
      'Sales by Item Summary',
      'Sales by Item Detail',
      'Sales by Rep Summary',
      'Sales by Room Type',
      'Sales Orders by Customer',
      'Pending Sales',
      'Sales Tax Liability',
      'Sales Tax Revenue Summary',
      'Daily Sales Summary',
      'Monthly Sales Comparison'
    ]
  },
  inventory: {
    name: 'Inventory',
    icon: Package,
    reports: [
      'Inventory Valuation Summary',
      'Inventory Valuation Detail',
      'Inventory Stock Status by Item',
      'Inventory Stock Status by Vendor',
      'Physical Inventory Worksheet',
      'Pending Builds',
      'Average Cost',
      'Item Price List',
      'Item Profitability',
      'Stock Reorder Report',
      'Inventory Turnover',
      'Slow Moving Inventory'
    ]
  },
  customers: {
    name: 'Customers & Receivables',
    icon: Users,
    reports: [
      'A/R Aging Summary',
      'A/R Aging Detail',
      'Customer Balance Summary',
      'Customer Balance Detail',
      'Open Invoices',
      'Collections Report',
      'Average Days to Pay',
      'Customer Contact List',
      'Customer Phone List',
      'Customer Loyalty Analysis',
      'Booking Frequency Report',
      'Guest Preferences Report'
    ]
  },
  vendors: {
    name: 'Vendors & Payables',
    icon: Briefcase,
    reports: [
      'A/P Aging Summary',
      'A/P Aging Detail',
      'Vendor Balance Summary',
      'Vendor Balance Detail',
      'Unpaid Bills Detail',
      'Bills by Vendor',
      'Vendor Contact List',
      'Vendor Phone List',
      'Purchases by Vendor Summary',
      'Purchases by Item Detail',
      'Supplier Performance Report'
    ]
  },
  employees: {
    name: 'Employees & Payroll',
    icon: Users,
    reports: [
      'Payroll Summary',
      'Payroll Details',
      'Employee Earnings Summary',
      'Employee Clock-In/Out',
      'Time by Employee',
      'Time by Job',
      'Sales by Employee',
      'Commission Report',
      'Employee Performance',
      'Overtime Report',
      'Employee Contact List',
      'Staff Scheduling Report'
    ]
  },
  banking: {
    name: 'Banking',
    icon: CreditCard,
    reports: [
      'Deposit Detail',
      'Check Detail',
      'Missing Checks',
      'Reconciliation Discrepancy',
      'Previous Reconciliation',
      'Banking Summary',
      'Payment Method Analysis',
      'Cash Flow Forecast',
      'M-Pesa Transaction Report',
      'Credit Card Processing',
      'Bank Transfer Report'
    ]
  },
  budgets: {
    name: 'Budgets & Forecasts',
    icon: BarChart3,
    reports: [
      'Budget vs Actual',
      'Budget Overview',
      'Profit & Loss Budget Performance',
      'Budget vs Actual Graph',
      'Revenue Forecast',
      'Expense Forecast',
      'Occupancy Forecast',
      'Seasonal Analysis',
      'Trend Analysis'
    ]
  },
  pos: {
    name: 'POS & Operations',
    icon: Building,
    reports: [
      'Register Close Report',
      'Cash Drawer Report',
      'Daily Sales Summary',
      'Hourly Sales Report',
      'Top Selling Items',
      'Department Sales',
      'Discount Analysis',
      'Void/Refund Report',
      'Order Accuracy Report',
      'Table Turnover Report',
      'Room Service Performance',
      'Restaurant Performance'
    ]
  },
  lists: {
    name: 'List Reports',
    icon: ListChecks,
    reports: [
      'Account Listing',
      'Customer List',
      'Vendor List',
      'Employee List',
      'Item List',
      'Room List',
      'Menu Item List',
      'Price Level List',
      'Customer Type List',
      'Vendor Type List'
    ]
  }
};

interface ReportFilters {
  dateRange: string;
  startDate: string;
  endDate: string;
  customer?: string;
  vendor?: string;
  employee?: string;
  department?: string;
  role?: string;
  paymentMethod?: string;
  roomType?: string;
}

export function QuickBooksReporting() {
  const [selectedCategory, setSelectedCategory] = useState('financial');
  const [selectedReport, setSelectedReport] = useState('');
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: 'this-month',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [showCustomization, setShowCustomization] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [employeeDetails, setEmployeeDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'summary' | 'detail'>('summary');

  // Load employees on component mount
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const staffData = await staffService.getAllStaff({ status: 'active' });
        setEmployees(staffData);
      } catch (error) {
        console.error('Failed to load employees:', error);
        toast.error('Failed to load employee list');
      }
    };

    loadEmployees();
  }, []);

  // Generate sample data based on report type
  const generateReportData = async (reportName: string) => {
    // This would normally fetch from API
    switch (reportName) {
      case 'Profit & Loss Standard':
        return generateProfitLossData();
      case 'Balance Sheet Standard':
        return generateBalanceSheetData();
      case 'Sales by Customer Summary':
        return generateSalesByCustomerData();
      case 'Inventory Valuation Summary':
        return generateInventoryValuationData();
      case 'Daily Sales Summary':
        return generateDailySalesData();
      case 'Sales by Employee':
        return await generateEmployeeSalesData();
      default:
        return generateGenericReportData(reportName);
    }
  };

  const generateProfitLossData = () => ({
    reportName: 'Profit & Loss',
    period: `${filters.startDate} to ${filters.endDate}`,
    sections: [
      {
        name: 'Income',
        accounts: [
          { name: 'Room Revenue', amount: 2850000, percent: 62.5 },
          { name: 'Restaurant Revenue', amount: 980000, percent: 21.5 },
          { name: 'Bar Revenue', amount: 420000, percent: 9.2 },
          { name: 'Room Service Revenue', amount: 210000, percent: 4.6 },
          { name: 'Event Space Revenue', amount: 100000, percent: 2.2 },
        ],
        total: 4560000
      },
      {
        name: 'Cost of Goods Sold',
        accounts: [
          { name: 'Food Costs', amount: 350000, percent: 7.7 },
          { name: 'Beverage Costs', amount: 140000, percent: 3.1 },
          { name: 'Room Supplies', amount: 85000, percent: 1.9 },
        ],
        total: 575000
      },
      {
        name: 'Operating Expenses',
        accounts: [
          { name: 'Salaries & Wages', amount: 1200000, percent: 26.3 },
          { name: 'Utilities', amount: 180000, percent: 3.9 },
          { name: 'Maintenance', amount: 120000, percent: 2.6 },
          { name: 'Marketing', amount: 95000, percent: 2.1 },
          { name: 'Insurance', amount: 75000, percent: 1.6 },
          { name: 'Supplies', amount: 65000, percent: 1.4 },
        ],
        total: 1735000
      }
    ],
    grossProfit: 3985000,
    netIncome: 2250000,
    netMargin: 49.3
  });

  const generateBalanceSheetData = () => ({
    reportName: 'Balance Sheet',
    asOfDate: filters.endDate,
    assets: {
      current: [
        { name: 'Checking Account', amount: 850000 },
        { name: 'Savings Account', amount: 1200000 },
        { name: 'Accounts Receivable', amount: 320000 },
        { name: 'Inventory', amount: 180000 },
      ],
      fixed: [
        { name: 'Property & Buildings', amount: 15000000 },
        { name: 'Furniture & Fixtures', amount: 2500000 },
        { name: 'Equipment', amount: 800000 },
        { name: 'Less: Accumulated Depreciation', amount: -1800000 },
      ],
      totalAssets: 18050000
    },
    liabilities: {
      current: [
        { name: 'Accounts Payable', amount: 180000 },
        { name: 'Salaries Payable', amount: 95000 },
        { name: 'Taxes Payable', amount: 120000 },
      ],
      longTerm: [
        { name: 'Mortgage Loan', amount: 8500000 },
        { name: 'Equipment Loan', amount: 450000 },
      ],
      totalLiabilities: 9345000
    },
    equity: {
      items: [
        { name: 'Owner\'s Equity', amount: 6500000 },
        { name: 'Retained Earnings', amount: 2205000 },
      ],
      totalEquity: 8705000
    }
  });

  const generateSalesByCustomerData = () => ({
    reportName: 'Sales by Customer Summary',
    period: `${filters.startDate} to ${filters.endDate}`,
    customers: [
      { name: 'Alice Johnson', sales: 485000, transactions: 12, avgSale: 40417 },
      { name: 'Bob Smith', sales: 320000, transactions: 8, avgSale: 40000 },
      { name: 'Carol White', sales: 298000, transactions: 15, avgSale: 19867 },
      { name: 'David Brown', sales: 245000, transactions: 6, avgSale: 40833 },
      { name: 'Emma Davis', sales: 198000, transactions: 10, avgSale: 19800 },
      { name: 'Frank Wilson', sales: 175000, transactions: 7, avgSale: 25000 },
      { name: 'Grace Miller', sales: 152000, transactions: 9, avgSale: 16889 },
      { name: 'Henry Taylor', sales: 138000, transactions: 5, avgSale: 27600 },
    ],
    total: 2011000
  });

  const generateInventoryValuationData = () => ({
    reportName: 'Inventory Valuation Summary',
    asOfDate: filters.endDate,
    items: [
      { category: 'Meat & Poultry', items: 15, qty: 450, avgCost: 850, value: 382500 },
      { category: 'Seafood', items: 12, qty: 180, avgCost: 1200, value: 216000 },
      { category: 'Vegetables', items: 25, qty: 800, avgCost: 120, value: 96000 },
      { category: 'Dairy Products', items: 18, qty: 350, avgCost: 180, value: 63000 },
      { category: 'Grains & Pasta', items: 10, qty: 500, avgCost: 85, value: 42500 },
      { category: 'Beverages', items: 30, qty: 1200, avgCost: 250, value: 300000 },
      { category: 'Room Supplies', items: 20, qty: 600, avgCost: 150, value: 90000 },
      { category: 'Cleaning Supplies', items: 15, qty: 400, avgCost: 95, value: 38000 },
    ],
    totalValue: 1228000,
    totalItems: 145,
    totalQty: 4480
  });

  const generateDailySalesData = () => ({
    reportName: 'Daily Sales Summary',
    date: filters.endDate,
    departments: [
      { name: 'Rooms', transactions: 45, sales: 95000, avgSale: 2111 },
      { name: 'Restaurant', transactions: 128, sales: 32000, avgSale: 250 },
      { name: 'Bar', transactions: 95, sales: 14000, avgSale: 147 },
      { name: 'Room Service', transactions: 32, sales: 9500, avgSale: 297 },
      { name: 'Events', transactions: 2, sales: 12000, avgSale: 6000 },
    ],
    paymentMethods: [
      { method: 'M-Pesa', transactions: 168, amount: 89200 },
      { method: 'Credit Card', transactions: 95, amount: 56800 },
      { method: 'Cash', transactions: 28, amount: 12500 },
      { method: 'Bank Transfer', transactions: 11, amount: 4000 },
    ],
    totalSales: 162500,
    totalTransactions: 302,
    avgTransaction: 538
  });

  const generateEmployeeSalesData = async () => {
    try {
      // If a specific employee is selected, get detailed report for that employee
      if (selectedEmployee) {
        const response = await reportsService.getEmployeeDetails(
          selectedEmployee,
          filters.startDate,
          filters.endDate
        );

        return {
          reportName: `Sales Report - ${response.employee.name}`,
          period: `${filters.startDate} to ${filters.endDate}`,
          employee: response.employee,
          summary: response.summary,
          transactions: response.transactions,
          top_items: response.top_items,
          payment_methods: response.payment_methods,
          trends: response.trends
        };
      } else {
        // Get summary for all employees
        const response = await reportsService.getEmployeeSales(
          filters.startDate,
          filters.endDate,
          undefined, // employeeId
          filters.department,
          filters.role
        );

        return {
          reportName: 'Sales by Employee',
          period: `${filters.startDate} to ${filters.endDate}`,
          employees: response.employees,
          total_employees: response.total_employees,
          total_sales: response.total_sales,
          total_orders: response.total_orders
        };
      }
    } catch (error: any) {
      console.error('Failed to fetch employee sales data:', error);
      toast.error('Failed to load employee sales data');
      // Return sample data as fallback
      return selectedEmployee ? generateSampleEmployeeDetailData() : generateSampleEmployeeSalesData();
    }
  };

  const generateSampleEmployeeSalesData = () => {
    // Calculate date range difference to scale the data
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);
    const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Scale factors based on period
    const scaleFactor = daysDiff <= 1 ? 0.1 : daysDiff <= 7 ? 0.3 : daysDiff <= 30 ? 1 : daysDiff / 30;

    const employees = [
      {
        employee_id: 'EMP001',
        employee_name: 'John Mwangi',
        role: 'Senior Waiter',
        department: 'Restaurant',
        total_sales: Math.round(450000 * scaleFactor),
        total_orders: Math.round(180 * scaleFactor),
        avg_order_value: 2500,
        total_items_sold: Math.round(720 * scaleFactor),
        orders_today: daysDiff <= 1 ? Math.round(8 * scaleFactor) : 0,
        orders_this_week: daysDiff <= 7 ? Math.round(45 * scaleFactor) : 0,
        orders_this_month: daysDiff <= 30 ? Math.round(180 * scaleFactor) : 0,
        top_selling_item: 'Grilled Chicken',
        first_sale_time: '08:30 AM',
        last_sale_time: '10:45 PM',
        completion_rate: 95
      },
      {
        employee_id: 'EMP002',
        employee_name: 'Jane Akinyi',
        role: 'Waiter',
        department: 'Restaurant',
        total_sales: Math.round(320000 * scaleFactor),
        total_orders: Math.round(140 * scaleFactor),
        avg_order_value: 2286,
        total_items_sold: Math.round(560 * scaleFactor),
        orders_today: daysDiff <= 1 ? Math.round(6 * scaleFactor) : 0,
        orders_this_week: daysDiff <= 7 ? Math.round(35 * scaleFactor) : 0,
        orders_this_month: daysDiff <= 30 ? Math.round(140 * scaleFactor) : 0,
        top_selling_item: 'Beef Stew',
        first_sale_time: '09:00 AM',
        last_sale_time: '9:30 PM',
        completion_rate: 92
      },
      {
        employee_id: 'EMP003',
        employee_name: 'Peter Kamau',
        role: 'Bartender',
        department: 'Bar',
        total_sales: Math.round(280000 * scaleFactor),
        total_orders: Math.round(95 * scaleFactor),
        avg_order_value: 2947,
        total_items_sold: Math.round(380 * scaleFactor),
        orders_today: daysDiff <= 1 ? Math.round(4 * scaleFactor) : 0,
        orders_this_week: daysDiff <= 7 ? Math.round(25 * scaleFactor) : 0,
        orders_this_month: daysDiff <= 30 ? Math.round(95 * scaleFactor) : 0,
        top_selling_item: 'Cocktails',
        first_sale_time: '11:00 AM',
        last_sale_time: '11:00 PM',
        completion_rate: 98
      }
    ];

    // Calculate totals
    const total_sales = employees.reduce((sum, emp) => sum + emp.total_sales, 0);
    const total_orders = employees.reduce((sum, emp) => sum + emp.total_orders, 0);

    return {
      reportName: 'Sales by Employee',
      period: `${filters.startDate} to ${filters.endDate}`,
      employees,
      total_employees: 3,
      total_sales,
      total_orders
    };
  };

  const generateSampleEmployeeDetailData = () => {
    // Calculate date range difference to scale the data
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);
    const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Scale factors based on period
    const scaleFactor = daysDiff <= 1 ? 0.1 : daysDiff <= 7 ? 0.3 : daysDiff <= 30 ? 1 : daysDiff / 30;

    const scaledTotal = Math.round(450000 * scaleFactor);
    const scaledOrders = Math.round(180 * scaleFactor);

    return {
      reportName: `Sales Report - John Mwangi`,
      period: `${filters.startDate} to ${filters.endDate}`,
      employee: {
        id: 'EMP001',
        name: 'John Mwangi',
        email: 'john.mwangi@hotel.com',
        role: 'Senior Waiter',
        department: 'Restaurant',
        phone: '+254700123456',
        status: 'active'
      },
      summary: {
        total_sales: scaledTotal,
        total_orders: scaledOrders,
        completed_orders: Math.round(171 * scaleFactor),
        avg_order_value: 2500,
        completion_rate: 95,
        rank: 1,
        total_peers: 3,
        team_average: Math.round(350000 * scaleFactor),
        performance_vs_average: 28.57
      },
      transactions: [
        {
          order_id: 'ORD001',
          date: filters.startDate,
          total: Math.round(25000 * scaleFactor),
          status: 'completed',
          payment_method: 'M-Pesa',
          delivery_location: 'Room 201',
          mpesa_code: 'QWE123ABC',
          items: [
            { name: 'Grilled Chicken', quantity: 2, price: 8000 },
            { name: 'French Fries', quantity: 1, price: 2000 },
            { name: 'Soda', quantity: 2, price: 1000 }
          ]
        },
        {
          order_id: 'ORD002',
          date: filters.startDate,
          total: Math.round(18500 * scaleFactor),
          status: 'completed',
          payment_method: 'Cash',
          delivery_location: 'Table 5',
          items: [
            { name: 'Beef Stew', quantity: 1, price: 12000 },
            { name: 'Rice', quantity: 1, price: 3000 },
            { name: 'Juice', quantity: 1, price: 1500 }
          ]
        },
        {
          order_id: 'ORD003',
          date: filters.endDate,
          total: Math.round(32000 * scaleFactor),
          status: 'completed',
          payment_method: 'M-Pesa',
          delivery_location: 'Room 305',
          mpesa_code: 'RTY456DEF',
          items: [
            { name: 'Fish Curry', quantity: 1, price: 15000 },
            { name: 'Chapati', quantity: 2, price: 4000 },
            { name: 'Mineral Water', quantity: 1, price: 2000 }
          ]
        }
      ],
      top_items: [
        { name: 'Grilled Chicken', quantity: Math.round(45 * scaleFactor), revenue: Math.round(360000 * scaleFactor) },
        { name: 'Beef Stew', quantity: Math.round(32 * scaleFactor), revenue: Math.round(384000 * scaleFactor) },
        { name: 'French Fries', quantity: Math.round(28 * scaleFactor), revenue: Math.round(56000 * scaleFactor) }
      ],
      payment_methods: [
        { method: 'M-Pesa', total: Math.round(225000 * scaleFactor), percentage: 50, transactions: [
          { code: 'QWE123ABC', amount: Math.round(25000 * scaleFactor), date: filters.startDate },
          { code: 'RTY456DEF', amount: Math.round(32000 * scaleFactor), date: filters.endDate }
        ]},
        { method: 'Cash', total: Math.round(135000 * scaleFactor), percentage: 30 },
        { method: 'Credit Card', total: Math.round(90000 * scaleFactor), percentage: 20 }
      ],
      trends: {
        daily: [
          { date: filters.startDate, revenue: Math.round(25000 * scaleFactor) },
          { date: filters.endDate, revenue: Math.round(22000 * scaleFactor) }
        ],
        hourly: [
          { hour: '12:00', revenue: Math.round(15000 * scaleFactor) },
          { hour: '13:00', revenue: Math.round(18000 * scaleFactor) },
          { hour: '14:00', revenue: Math.round(12000 * scaleFactor) }
        ]
      }
    };
  };

  const generateGenericReportData = (reportName: string) => ({
    reportName,
    period: `${filters.startDate} to ${filters.endDate}`,
    message: 'Report data will be populated when connected to database',
    sampleData: []
  });

  const runReport = async () => {
    if (!selectedReport) {
      toast.error('Please select a report to run');
      return;
    }

    try {
      const data = await generateReportData(selectedReport);
      setReportData(data);
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.error('Failed to generate report');
    }
  };

  const exportReport = (format: 'pdf' | 'excel' | 'csv') => {
    if (!reportData) {
      toast.error('Please run a report first');
      return;
    }
    toast.success(`Exporting to ${format.toUpperCase()}...`);
    // Implement actual export logic
  };

  const emailReport = () => {
    if (!reportData) {
      toast.error('Please run a report first');
      return;
    }
    toast.success('Email dialog would open here');
  };

  const scheduleReport = () => {
    toast.success('Schedule dialog would open here');
  };

  const printReport = () => {
    if (!reportData) {
      toast.error('Please run a report first');
      return;
    }

    // Create a print-friendly version of the report optimized for thermal printers
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Unable to open print window. Please check your popup blocker.');
      return;
    }

    const reportTitle = reportData.reportName || 'Report';
    const reportPeriod = reportData.period || '';

    // Generate HTML content optimized for thermal printers (POS machines)
    let htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body {
              font-family: 'Courier New', 'Lucida Console', monospace;
              font-size: 10px;
              line-height: 1.2;
              margin: 0;
              padding: 5px;
              color: #000;
              background: #fff;
              max-width: 80mm;
            }
            .header {
              text-align: center;
              border-bottom: 1px solid #000;
              padding-bottom: 5px;
              margin-bottom: 10px;
              font-size: 12px;
              font-weight: bold;
            }
            .report-title {
              margin-bottom: 3px;
            }
            .report-period {
              font-size: 9px;
              color: #666;
            }
            .hotel-info {
              text-align: center;
              font-size: 11px;
              margin-bottom: 10px;
              border-bottom: 1px dashed #000;
              padding-bottom: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
              font-size: 9px;
            }
            th, td {
              padding: 2px 4px;
              text-align: left;
              border-bottom: 1px dotted #ccc;
            }
            th {
              font-weight: bold;
              border-bottom: 1px solid #000;
              font-size: 10px;
            }
            .text-right {
              text-align: right !important;
            }
            .text-center {
              text-align: center !important;
            }
            .font-bold {
              font-weight: bold !important;
            }
            .total-row {
              border-top: 1px solid #000;
              border-bottom: 1px solid #000;
              font-weight: bold !important;
              background-color: #f0f0f0;
            }
            .section-title {
              font-size: 11px;
              font-weight: bold;
              margin: 10px 0 5px 0;
              border-bottom: 1px dashed #000;
              padding-bottom: 2px;
              text-transform: uppercase;
            }
            .employee-info {
              margin-bottom: 10px;
              font-size: 9px;
            }
            .employee-info div {
              margin-bottom: 2px;
            }
            .mpesa-codes {
              font-family: 'Courier New', monospace;
              font-size: 8px;
              background: #f9f9f9;
              padding: 2px;
              margin: 1px 0;
              border: 1px solid #ddd;
            }
            .footer {
              text-align: center;
              font-size: 8px;
              margin-top: 10px;
              border-top: 1px dashed #000;
              padding-top: 5px;
              color: #666;
            }
            @media print {
              body {
                margin: 0;
                padding: 2px;
                max-width: none;
              }
              .no-print { display: none; }
              @page {
                size: 80mm auto;
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="hotel-info">
            <div>PREMIER HOTEL</div>
            <div>Nairobi, Kenya</div>
            <div>Tel: +254 700 123 456</div>
          </div>
          <div class="header">
            <div class="report-title">${reportTitle}</div>
            <div class="report-period">${reportPeriod}</div>
            <div>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
          </div>
    `;

    // Add report-specific content
    if (reportData.reportName?.includes('Sales Report -')) {
      // Employee Detail Report
      htmlContent += `
        <div class="employee-info">
          <strong>Employee:</strong> ${reportData.employee?.name || 'N/A'}<br>
          <strong>Role:</strong> ${reportData.employee?.role || 'N/A'}<br>
          <strong>Department:</strong> ${reportData.employee?.department || 'N/A'}<br>
          <strong>Total Sales:</strong> KES ${reportData.summary?.total_sales?.toLocaleString() || '0'}<br>
          <strong>Total Orders:</strong> ${reportData.summary?.total_orders || '0'}<br>
          <strong>Completion Rate:</strong> ${reportData.summary?.completion_rate || '0'}%
        </div>

        <div class="section-title">Transaction Details</div>
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Items</th>
              <th class="text-right">Total</th>
              <th>Payment Method</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
      `;

      reportData.transactions?.forEach((transaction: any) => {
        const itemsText = transaction.items?.map((item: any) =>
          `${item.quantity}x ${item.name} - KES ${item.price?.toLocaleString() || '0'}`
        ).join('; ') || '';

        htmlContent += `
          <tr>
            <td>${transaction.order_id || ''}</td>
            <td>${transaction.date ? new Date(transaction.date).toLocaleDateString() : ''}</td>
            <td>${itemsText}</td>
            <td class="text-right">KES ${transaction.total?.toLocaleString() || '0'}</td>
            <td>${transaction.payment_method || ''}</td>
            <td>${transaction.delivery_location || ''}</td>
          </tr>
        `;
      });

      htmlContent += `
          </tbody>
        </table>

        <div class="section-title">Top Selling Items</div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th class="text-right">Quantity</th>
              <th class="text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
      `;

      reportData.top_items?.forEach((item: any) => {
        htmlContent += `
          <tr>
            <td>${item.name || ''}</td>
            <td class="text-right">${item.quantity || 0}</td>
            <td class="text-right">KES ${item.revenue?.toLocaleString() || '0'}</td>
          </tr>
        `;
      });

      htmlContent += `
          </tbody>
        </table>
      `;
    } else if (reportData.reportName === 'Sales by Employee') {
      // Employee Summary Report
      htmlContent += `
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Role</th>
              <th class="text-right">Total Sales</th>
              <th class="text-right">Orders</th>
              <th class="text-right">Avg Order</th>
              <th class="text-right">Items Sold</th>
              <th class="text-right">Completion %</th>
            </tr>
          </thead>
          <tbody>
      `;

      reportData.employees?.forEach((employee: any) => {
        htmlContent += `
          <tr>
            <td>${employee.employee_name || ''} (${employee.employee_id || ''})</td>
            <td>${employee.role || ''}</td>
            <td class="text-right">KES ${employee.total_sales?.toLocaleString() || '0'}</td>
            <td class="text-right">${employee.total_orders || 0}</td>
            <td class="text-right">KES ${employee.avg_order_value?.toLocaleString() || '0'}</td>
            <td class="text-right">${employee.total_items_sold || 0}</td>
            <td class="text-right">${employee.completion_rate || 0}%</td>
          </tr>
        `;
      });

      if (reportData.total_sales) {
        htmlContent += `
          <tr class="total-row">
            <td><strong>Total</strong></td>
            <td></td>
            <td class="text-right"><strong>KES ${reportData.total_sales?.toLocaleString() || '0'}</strong></td>
            <td class="text-right"><strong>${reportData.total_orders || 0}</strong></td>
            <td></td>
            <td class="text-right"><strong>${reportData.employees?.reduce((sum: number, emp: any) => sum + (emp.total_items_sold || 0), 0) || 0}</strong></td>
            <td></td>
          </tr>
        `;
      }

      htmlContent += `
          </tbody>
        </table>
      `;
    }

    htmlContent += `
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };

    toast.success('Print dialog opened');
  };

  const renderProfitLossReport = (data: any) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b pb-2">
        <div>
          <h3 className="text-xl font-bold">{data.reportName}</h3>
          <p className="text-sm text-muted-foreground">{data.period}</p>
        </div>
      </div>

      {data.sections.map((section: any, idx: number) => (
        <div key={idx} className="space-y-2">
          <h4 className="font-semibold text-lg">{section.name}</h4>
          <Table>
            <TableBody>
              {section.accounts.map((account: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="pl-6">{account.name}</TableCell>
                  <TableCell className="text-right">KES {account.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{account.percent}%</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold bg-muted/50">
                <TableCell>Total {section.name}</TableCell>
                <TableCell className="text-right">KES {section.total.toLocaleString()}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ))}

      <div className="space-y-2 pt-4 border-t-2">
        <div className="flex justify-between font-semibold text-lg">
          <span>Gross Profit</span>
          <span>KES {data.grossProfit.toLocaleString()}</span>
        </div>
        <div className="flex justify-between font-bold text-xl text-green-600">
          <span>Net Income</span>
          <span>KES {data.netIncome.toLocaleString()}</span>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          Net Margin: {data.netMargin}%
        </div>
      </div>
    </div>
  );

  const renderBalanceSheetReport = (data: any) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b pb-2">
        <div>
          <h3 className="text-xl font-bold">{data.reportName}</h3>
          <p className="text-sm text-muted-foreground">As of {data.asOfDate}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">Assets</h4>
          <div>
            <p className="font-medium mb-2">Current Assets</p>
            <Table>
              <TableBody>
                {data.assets.current.map((item: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="pl-4">{item.name}</TableCell>
                    <TableCell className="text-right">KES {item.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div>
            <p className="font-medium mb-2">Fixed Assets</p>
            <Table>
              <TableBody>
                {data.assets.fixed.map((item: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="pl-4">{item.name}</TableCell>
                    <TableCell className="text-right">KES {item.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="font-bold text-lg pt-2 border-t-2">
            <div className="flex justify-between">
              <span>Total Assets</span>
              <span>KES {data.assets.totalAssets.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-lg">Liabilities & Equity</h4>
          <div>
            <p className="font-medium mb-2">Current Liabilities</p>
            <Table>
              <TableBody>
                {data.liabilities.current.map((item: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="pl-4">{item.name}</TableCell>
                    <TableCell className="text-right">KES {item.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div>
            <p className="font-medium mb-2">Long-term Liabilities</p>
            <Table>
              <TableBody>
                {data.liabilities.longTerm.map((item: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="pl-4">{item.name}</TableCell>
                    <TableCell className="text-right">KES {item.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="font-semibold pt-2 border-t">
            <div className="flex justify-between mb-2">
              <span>Total Liabilities</span>
              <span>KES {data.liabilities.totalLiabilities.toLocaleString()}</span>
            </div>
          </div>
          <div>
            <p className="font-medium mb-2">Equity</p>
            <Table>
              <TableBody>
                {data.equity.items.map((item: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="pl-4">{item.name}</TableCell>
                    <TableCell className="text-right">KES {item.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="font-bold text-lg pt-2 border-t-2">
            <div className="flex justify-between">
              <span>Total Liabilities & Equity</span>
              <span>KES {(data.liabilities.totalLiabilities + data.equity.totalEquity).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSalesByCustomerReport = (data: any) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b pb-2">
        <div>
          <h3 className="text-xl font-bold">{data.reportName}</h3>
          <p className="text-sm text-muted-foreground">{data.period}</p>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead className="text-right">Sales</TableHead>
            <TableHead className="text-right">Transactions</TableHead>
            <TableHead className="text-right">Avg Sale</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.customers.map((customer: any, i: number) => (
            <TableRow key={i}>
              <TableCell>{customer.name}</TableCell>
              <TableCell className="text-right">KES {customer.sales.toLocaleString()}</TableCell>
              <TableCell className="text-right">{customer.transactions}</TableCell>
              <TableCell className="text-right">KES {customer.avgSale.toLocaleString()}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold bg-muted/50">
            <TableCell>Total</TableCell>
            <TableCell className="text-right">KES {data.total.toLocaleString()}</TableCell>
            <TableCell className="text-right">{data.customers.reduce((sum: number, c: any) => sum + c.transactions, 0)}</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );

  const renderInventoryValuationReport = (data: any) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b pb-2">
        <div>
          <h3 className="text-xl font-bold">{data.reportName}</h3>
          <p className="text-sm text-muted-foreground">As of {data.asOfDate}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total Items: {data.totalItems}</p>
          <p className="text-lg font-bold">KES {data.totalValue.toLocaleString()}</p>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Items</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Avg Cost</TableHead>
            <TableHead className="text-right">Total Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((item: any, i: number) => (
            <TableRow key={i}>
              <TableCell>{item.category}</TableCell>
              <TableCell className="text-right">{item.items}</TableCell>
              <TableCell className="text-right">{item.qty}</TableCell>
              <TableCell className="text-right">KES {item.avgCost.toLocaleString()}</TableCell>
              <TableCell className="text-right">KES {item.value.toLocaleString()}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold bg-muted/50">
            <TableCell>Total</TableCell>
            <TableCell className="text-right">{data.totalItems}</TableCell>
            <TableCell className="text-right">{data.totalQty}</TableCell>
            <TableCell></TableCell>
            <TableCell className="text-right">KES {data.totalValue.toLocaleString()}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );

  const renderDailySalesReport = (data: any) => (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-2">
        <div>
          <h3 className="text-xl font-bold">{data.reportName}</h3>
          <p className="text-sm text-muted-foreground">{data.date}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total Transactions: {data.totalTransactions}</p>
          <p className="text-lg font-bold">KES {data.totalSales.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Avg: KES {data.avgTransaction}</p>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-3">Sales by Department</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department</TableHead>
              <TableHead className="text-right">Transactions</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">Avg Sale</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.departments.map((dept: any, i: number) => (
              <TableRow key={i}>
                <TableCell>{dept.name}</TableCell>
                <TableCell className="text-right">{dept.transactions}</TableCell>
                <TableCell className="text-right">KES {dept.sales.toLocaleString()}</TableCell>
                <TableCell className="text-right">KES {dept.avgSale.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <h4 className="font-semibold mb-3">Payment Methods</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Transactions</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">% of Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.paymentMethods.map((method: any, i: number) => (
              <TableRow key={i}>
                <TableCell>{method.method}</TableCell>
                <TableCell className="text-right">{method.transactions}</TableCell>
                <TableCell className="text-right">KES {method.amount.toLocaleString()}</TableCell>
                <TableCell className="text-right">{((method.amount / data.totalSales) * 100).toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const handleEmployeeClick = async (employeeId: string) => {
    setSelectedEmployee(employeeId);
    setViewMode('detail');
    setLoading(true);

    try {
      const data = await generateEmployeeSalesData();
      setReportData(data);
      toast.success('Employee details loaded');
    } catch (error) {
      console.error('Failed to load employee details:', error);
      toast.error('Failed to load employee details');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSummary = () => {
    setSelectedEmployee('');
    setViewMode('summary');
    setReportData(null);
  };

  const renderSalesByEmployeeReport = (data: any) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b pb-2">
        <div>
          <h3 className="text-xl font-bold">{data.reportName}</h3>
          <p className="text-sm text-muted-foreground">{data.period}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total Employees: {data.total_employees}</p>
          <p className="text-lg font-bold">KES {data.total_sales?.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Total Orders: {data.total_orders}</p>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Total Sales</TableHead>
            <TableHead className="text-right">Orders</TableHead>
            <TableHead className="text-right">Avg Order</TableHead>
            <TableHead className="text-right">Items Sold</TableHead>
            <TableHead className="text-right">Completion %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.employees?.map((employee: any, i: number) => (
            <TableRow key={i} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEmployeeClick(employee.employee_id)}>
              <TableCell>
                <div>
                  <div className="font-medium text-blue-600 hover:text-blue-800">{employee.employee_name}</div>
                  <div className="text-sm text-muted-foreground">{employee.employee_id}</div>
                </div>
              </TableCell>
              <TableCell>{employee.role}</TableCell>
              <TableCell className="text-right font-medium">KES {employee.total_sales?.toLocaleString()}</TableCell>
              <TableCell className="text-right">{employee.total_orders}</TableCell>
              <TableCell className="text-right">KES {employee.avg_order_value?.toLocaleString()}</TableCell>
              <TableCell className="text-right">{employee.total_items_sold}</TableCell>
              <TableCell className="text-right">{employee.completion_rate}%</TableCell>
            </TableRow>
          ))}
          {data.employees?.length > 0 && (
            <TableRow className="font-bold bg-muted/50">
              <TableCell>Total</TableCell>
              <TableCell></TableCell>
              <TableCell className="text-right">KES {data.total_sales?.toLocaleString()}</TableCell>
              <TableCell className="text-right">{data.total_orders}</TableCell>
              <TableCell></TableCell>
              <TableCell className="text-right">
                {data.employees.reduce((sum: number, emp: any) => sum + (emp.total_items_sold || 0), 0)}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  const renderEmployeeDetailReport = (data: any) => (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-2">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBackToSummary} className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Back to Summary
          </Button>
          <div>
            <h3 className="text-xl font-bold">{data.reportName}</h3>
            <p className="text-sm text-muted-foreground">{data.period}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Employee ID: {data.employee.id}</p>
          <p className="text-lg font-bold">KES {data.summary.total_sales.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Total Orders: {data.summary.total_orders}</p>
        </div>
      </div>

      {/* Employee Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Employee Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium">Name</Label>
              <p className="text-lg">{data.employee.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Role</Label>
              <p className="text-lg">{data.employee.role}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Department</Label>
              <p className="text-lg">{data.employee.department}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Total Sales</Label>
              <p className="text-lg font-bold text-green-600">KES {data.summary.total_sales.toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Avg Order Value</Label>
              <p className="text-lg">KES {data.summary.avg_order_value.toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Completion Rate</Label>
              <p className="text-lg">{data.summary.completion_rate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Details */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.transactions?.map((transaction: any) => (
                <TableRow key={transaction.order_id}>
                  <TableCell className="font-medium">{transaction.order_id}</TableCell>
                  <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {transaction.items.map((item: any, idx: number) => (
                        <div key={idx} className="text-sm">
                          {item.quantity}x {item.name} - KES {item.price.toLocaleString()}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">KES {transaction.total.toLocaleString()}</TableCell>
                  <TableCell>{transaction.payment_method}</TableCell>
                  <TableCell>{transaction.delivery_location}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Items & Payment Methods */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.top_items?.map((item: any) => (
                  <TableRow key={item.name}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">KES {item.revenue.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Percentage</TableHead>
                  <TableHead>Transaction Codes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.payment_methods?.map((method: any) => (
                  <TableRow key={method.method}>
                    <TableCell>{method.method}</TableCell>
                    <TableCell className="text-right">KES {method.total.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{method.percentage}%</TableCell>
                    <TableCell>
                      {method.method === 'M-Pesa' && method.transactions ? (
                        <div className="space-y-1">
                          {method.transactions.map((transaction: any, idx: number) => (
                            <div key={idx} className="text-xs">
                              <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">{transaction.code}</span>
                              <span className="ml-2 text-gray-600">KES {transaction.amount.toLocaleString()}</span>
                              <span className="ml-2 text-gray-500">{new Date(transaction.date).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderReportOutput = () => {
    if (!reportData) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>Select a report and click "Run Report" to view results</p>
        </div>
      );
    }

    // Route to appropriate renderer based on report type
    if (reportData.reportName?.includes('Sales Report -')) {
      return renderEmployeeDetailReport(reportData);
    } else if (reportData.reportName === 'Profit & Loss') {
      return renderProfitLossReport(reportData);
    } else if (reportData.reportName === 'Balance Sheet') {
      return renderBalanceSheetReport(reportData);
    } else if (reportData.reportName === 'Sales by Customer Summary') {
      return renderSalesByCustomerReport(reportData);
    } else if (reportData.reportName === 'Inventory Valuation Summary') {
      return renderInventoryValuationReport(reportData);
    } else if (reportData.reportName === 'Daily Sales Summary') {
      return renderDailySalesReport(reportData);
    } else if (reportData.reportName === 'Sales by Employee') {
      return renderSalesByEmployeeReport(reportData);
    } else {
      return (
        <div className="text-center py-12">
          <h3 className="text-xl font-bold mb-2">{reportData.reportName}</h3>
          <p className="text-muted-foreground mb-4">{reportData.period}</p>
          <p className="text-sm text-muted-foreground">{reportData.message}</p>
        </div>
      );
    }
  };

  const category = reportCategories[selectedCategory as keyof typeof reportCategories];
  const CategoryIcon = category.icon;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileBarChart className="h-5 w-5" />
                QuickBooks-Style Reporting Center
              </CardTitle>
              <CardDescription>
                Comprehensive financial and operational reports
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {Object.keys(reportCategories).length} Report Categories
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Category Selection */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(reportCategories).map(([key, cat]) => {
              const Icon = cat.icon;
              return (
                <Button
                  key={key}
                  variant={selectedCategory === key ? 'default' : 'outline'}
                  className="h-auto flex-col py-4"
                  onClick={() => {
                    setSelectedCategory(key);
                    setSelectedReport('');
                    setReportData(null);
                  }}
                >
                  <Icon className="h-5 w-5 mb-2" />
                  <span className="text-xs text-center">{cat.name}</span>
                </Button>
              );
            })}
          </div>

          {/* Report Selection and Filters */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CategoryIcon className="h-5 w-5" />
                {category.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Report Selection */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Select Report</Label>
                  <Select value={selectedReport} onValueChange={(value) => {
                    setSelectedReport(value);
                    setReportData(null);
                    setEmployeeDetails(null);
                    setSelectedEmployee('');
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a report..." />
                    </SelectTrigger>
                    <SelectContent>
                      {category.reports.map((report) => (
                        <SelectItem key={report} value={report}>
                          {report}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <Select
                    value={filters.dateRange}
                    onValueChange={(value) => {
                      setFilters({ ...filters, dateRange: value });
                      // Auto-calculate dates based on selection
                      const today = new Date();
                      let start = new Date();

                      switch (value) {
                        case 'today':
                          start = today;
                          break;
                        case 'this-week':
                          start = new Date(today.setDate(today.getDate() - today.getDay()));
                          break;
                        case 'this-month':
                          start = new Date(today.getFullYear(), today.getMonth(), 1);
                          break;
                        case 'this-quarter':
                          const quarter = Math.floor(today.getMonth() / 3);
                          start = new Date(today.getFullYear(), quarter * 3, 1);
                          break;
                        case 'this-year':
                          start = new Date(today.getFullYear(), 0, 1);
                          break;
                      }

                      setFilters({
                        ...filters,
                        dateRange: value,
                        startDate: start.toISOString().split('T')[0],
                        endDate: new Date().toISOString().split('T')[0]
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="this-week">This Week</SelectItem>
                      <SelectItem value="this-month">This Month</SelectItem>
                      <SelectItem value="this-quarter">This Quarter</SelectItem>
                      <SelectItem value="this-year">This Year</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Employee Selection for Sales by Employee Report */}
              {selectedReport === 'Sales by Employee' && employees.length > 0 && (
                <div className="space-y-2">
                  <Label>Select Employee (Optional - Leave blank for all employees)</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="All employees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All employees</SelectItem>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.first_name} {employee.last_name} - {employee.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Custom Date Range */}
              {filters.dateRange === 'custom' && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button onClick={runReport} className="flex-1 sm:flex-none">
                  <FileText className="h-4 w-4 mr-2" />
                  Run Report
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCustomization(!showCustomization)}
                  className="flex-1 sm:flex-none"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Customize
                </Button>
                <div className="flex gap-2 flex-1 sm:flex-none">
                  <Button variant="outline" size="icon" onClick={printReport} title="Print Report">
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => exportReport('pdf')} title="Export to PDF">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => exportReport('excel')} title="Export to Excel">
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={emailReport} title="Email Report">
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={scheduleReport} title="Schedule Report">
                    <Clock className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Customization Options */}
              {showCustomization && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-4">Report Customization</h4>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Sort By</Label>
                        <Select defaultValue="default">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default</SelectItem>
                            <SelectItem value="amount-desc">Amount (High to Low)</SelectItem>
                            <SelectItem value="amount-asc">Amount (Low to High)</SelectItem>
                            <SelectItem value="name">Name (A-Z)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Display Columns</Label>
                        <Select defaultValue="all">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Columns</SelectItem>
                            <SelectItem value="summary">Summary Only</SelectItem>
                            <SelectItem value="detailed">Detailed View</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Format</Label>
                        <Select defaultValue="standard">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="compact">Compact</SelectItem>
                            <SelectItem value="expanded">Expanded</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Report Output */}
          <Card>
            <CardContent className="pt-6">
              {renderReportOutput()}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
