import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Sheet1') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}_${Date.now()}.xlsx`);
};

export const exportDailySalesReportToExcel = (salesData: any[], date: string) => {
  const formattedData = salesData.map((sale) => ({
    'Order ID': sale.id,
    'Date': new Date(sale.created_at).toLocaleDateString(),
    'Time': new Date(sale.created_at).toLocaleTimeString(),
    'Customer': sale.customer_name || 'N/A',
    'Items': sale.items?.length || 0,
    'Amount (KES)': sale.amount,
    'Payment Method': sale.payment_method || 'N/A',
    'Status': sale.status,
  }));
  
  exportToExcel(formattedData, `Daily_Sales_Report_${date}`, 'Daily Sales');
};

export const exportEmployeeSalesReportToExcel = (employeeData: any[], dateRange: string) => {
  const formattedData = employeeData.map((emp) => ({
    'Employee Name': emp.name,
    'Role': emp.role,
    'Total Orders': emp.order_count,
    'Total Sales (KES)': emp.total_sales,
    'Average Order Value (KES)': (emp.total_sales / emp.order_count || 0).toFixed(2),
    'Commission (KES)': emp.commission || 0,
  }));
  
  exportToExcel(formattedData, `Employee_Sales_Report_${dateRange}`, 'Employee Sales');
};

export const exportFinancialSummaryToExcel = (summaryData: {
  revenue: any[];
  expenses: any[];
  summary: any;
}) => {
  const workbook = XLSX.utils.book_new();
  
  // Revenue sheet
  const revenueSheet = XLSX.utils.json_to_sheet(summaryData.revenue);
  XLSX.utils.book_append_sheet(workbook, revenueSheet, 'Revenue');
  
  // Expenses sheet
  const expensesSheet = XLSX.utils.json_to_sheet(summaryData.expenses);
  XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Expenses');
  
  // Summary sheet
  const summarySheet = XLSX.utils.json_to_sheet([summaryData.summary]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  XLSX.writeFile(workbook, `Financial_Summary_${Date.now()}.xlsx`);
};
