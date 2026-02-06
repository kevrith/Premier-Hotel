import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportFinancialReportToPDF = (data: {
  title: string;
  dateRange: string;
  summary: { label: string; value: string }[];
  tableData: { headers: string[]; rows: string[][] };
  footer?: string;
}) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Premier Hotel', 105, 15, { align: 'center' });
  doc.setFontSize(16);
  doc.text(data.title, 105, 25, { align: 'center' });
  doc.setFontSize(10);
  doc.text(data.dateRange, 105, 32, { align: 'center' });
  
  // Summary section
  let yPos = 45;
  doc.setFontSize(12);
  doc.text('Summary', 14, yPos);
  yPos += 7;
  
  doc.setFontSize(10);
  data.summary.forEach((item) => {
    doc.text(`${item.label}:`, 14, yPos);
    doc.text(item.value, 100, yPos);
    yPos += 6;
  });
  
  // Table
  yPos += 5;
  autoTable(doc, {
    startY: yPos,
    head: [data.tableData.headers],
    body: data.tableData.rows,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
  });
  
  // Footer
  if (data.footer) {
    const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;
    doc.setFontSize(8);
    doc.text(data.footer, 105, finalY + 10, { align: 'center' });
  }
  
  // Save
  doc.save(`${data.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
};

export const exportDailySalesReportToPDF = (salesData: any[], date: string) => {
  const totalRevenue = salesData.reduce((sum, item) => sum + item.amount, 0);
  const totalOrders = salesData.length;
  
  exportFinancialReportToPDF({
    title: 'Daily Sales Report',
    dateRange: date,
    summary: [
      { label: 'Total Revenue', value: `KES ${totalRevenue.toLocaleString()}` },
      { label: 'Total Orders', value: totalOrders.toString() },
      { label: 'Average Order Value', value: `KES ${(totalRevenue / totalOrders || 0).toFixed(2)}` },
    ],
    tableData: {
      headers: ['Order ID', 'Time', 'Items', 'Amount', 'Payment Method'],
      rows: salesData.map((sale) => [
        sale.id.substring(0, 8),
        new Date(sale.created_at).toLocaleTimeString(),
        sale.items?.length.toString() || '0',
        `KES ${sale.amount.toLocaleString()}`,
        sale.payment_method || 'N/A',
      ]),
    },
    footer: `Generated on ${new Date().toLocaleString()} | Premier Hotel Management System`,
  });
};

export const exportEmployeeSalesReportToPDF = (employeeData: any[], dateRange: string) => {
  const totalRevenue = employeeData.reduce((sum, emp) => sum + emp.total_sales, 0);
  
  exportFinancialReportToPDF({
    title: 'Employee Sales Report',
    dateRange,
    summary: [
      { label: 'Total Revenue', value: `KES ${totalRevenue.toLocaleString()}` },
      { label: 'Total Employees', value: employeeData.length.toString() },
      { label: 'Top Performer', value: employeeData[0]?.name || 'N/A' },
    ],
    tableData: {
      headers: ['Employee', 'Role', 'Orders', 'Total Sales', 'Avg Order Value'],
      rows: employeeData.map((emp) => [
        emp.name,
        emp.role,
        emp.order_count.toString(),
        `KES ${emp.total_sales.toLocaleString()}`,
        `KES ${(emp.total_sales / emp.order_count || 0).toFixed(2)}`,
      ]),
    },
    footer: `Generated on ${new Date().toLocaleString()} | Premier Hotel Management System`,
  });
};
