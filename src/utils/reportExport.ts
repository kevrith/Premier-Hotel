import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const exportToPDF = (title: string, data: any[], columns: string[], filename?: string) => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 20);
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
  
  // Add table
  autoTable(doc, {
    head: [columns],
    body: data.map(row => columns.map(col => row[col] || '')),
    startY: 35,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] }
  });
  
  doc.save(filename || `${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
};

export const exportToExcel = (title: string, data: any[], filename?: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, title);
  
  XLSX.writeFile(workbook, filename || `${title.replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
};

export const exportTableToExcel = (tableId: string, filename?: string) => {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  const wb = XLSX.utils.table_to_book(table);
  XLSX.writeFile(wb, filename || `export_${Date.now()}.xlsx`);
};
