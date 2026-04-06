// @ts-nocheck
/**
 * Print utilities for order slips and customer bills.
 * Opens a new browser window, renders content, triggers print, then closes.
 */

/**
 * Read receipt header/footer settings.
 * If branch_id is provided, branch-specific paybill overrides the global one.
 */
function getReceiptConfig(branch_id?: string) {
  const cfg = {
    hotel_name:           localStorage.getItem('receipt:hotel_name')           || 'Premier Hotel',
    address:              localStorage.getItem('receipt:address')              || '',
    po_box:               localStorage.getItem('receipt:po_box')               || '',
    phone:                localStorage.getItem('receipt:phone')                || '',
    email:                localStorage.getItem('receipt:email')                || '',
    website:              localStorage.getItem('receipt:website')              || '',
    tax_reg:              localStorage.getItem('receipt:tax_reg')              || '',
    footer:               localStorage.getItem('receipt:footer')               || 'Thank you for dining with us!',
    footer2:              localStorage.getItem('receipt:footer2')              || 'Please settle at the counter',
    payment_instructions: localStorage.getItem('receipt:payment_instructions') || '',
  };
  // Branch-specific payment instructions override global
  if (branch_id) {
    const bp = localStorage.getItem(`branch:${branch_id}:payment_instructions`);
    if (bp) cfg.payment_instructions = bp;
  }
  return cfg;
}

/**
 * Fetch receipt config from DB and cache in localStorage.
 * Called once per session so print functions always have fresh data.
 */
export async function syncReceiptConfig(): Promise<void> {
  try {
    const base = (window as any).__API_BASE__ ||
      import.meta?.env?.VITE_API_BASE_URL ||
      '/api/v1';
    // Sync global receipt config
    const res = await fetch(`${base}/settings/receipt-config`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      Object.entries(data).forEach(([k, v]) => {
        if (v) localStorage.setItem(`receipt:${k}`, v as string);
        else localStorage.removeItem(`receipt:${k}`);
      });
    }
    // Sync branch-specific payment instructions
    const branchRes = await fetch(`${base}/owner/branches`, { credentials: 'include' });
    if (branchRes.ok) {
      const branchData = await branchRes.json();
      const branches = branchData.branches || [];
      for (const b of branches) {
        if (b.payment_instructions) localStorage.setItem(`branch:${b.id}:payment_instructions`, b.payment_instructions);
        else localStorage.removeItem(`branch:${b.id}:payment_instructions`);
      }
    }
  } catch {
    // silently ignore — localStorage fallback will be used
  }
}

function openPrintWindow(html: string, title: string) {
  const w = window.open('', '_blank', 'width=340,height=600,menubar=no,toolbar=no');
  if (!w) {
    alert('Please allow pop-ups for this site to enable printing.');
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  // Small delay so the browser can render before printing
  setTimeout(() => {
    // Register afterprint BEFORE calling print so the event fires correctly
    w.addEventListener('afterprint', () => w.close());
    w.print();
  }, 300);
}

function receiptStyles(): string {
  return `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Courier New', Courier, monospace;
        font-size: 13px;
        font-weight: bold;
        width: 280px;
        margin: 0 auto;
        padding: 10px 2px 10px 10px;
        color: #000;
      }
      .center { text-align: center; }
      .bold { font-weight: bold; }
      .divider { border-top: 1px dashed #000; margin: 8px 0; }
      .divider-solid { border-top: 2px solid #000; margin: 8px 0; }
      .row { display: flex; justify-content: space-between; margin: 3px 0; }
      .row-right { text-align: right; }
      .total { font-size: 15px; font-weight: bold; }
      .small { font-size: 11px; font-weight: bold; }
      .mt { margin-top: 6px; }
      @media print {
        @page { margin: 0; size: 80mm auto; }
        body { padding: 4px 2px 4px 4px; }
      }
    </style>
  `;
}

/** Build the header block shared by both slip types */
function buildHeader(cfg: ReturnType<typeof getReceiptConfig>): string {
  const lines: string[] = [];
  lines.push(`<div class="bold" style="font-size:16px;">${cfg.hotel_name}</div>`);
  if (cfg.address)  lines.push(`<div class="small">${cfg.address}</div>`);
  if (cfg.po_box)   lines.push(`<div class="small">P.O. Box ${cfg.po_box}</div>`);
  if (cfg.phone)    lines.push(`<div class="small">Tel: ${cfg.phone}</div>`);
  if (cfg.email)    lines.push(`<div class="small">${cfg.email}</div>`);
  if (cfg.website)  lines.push(`<div class="small">${cfg.website}</div>`);
  if (cfg.tax_reg)  lines.push(`<div class="small">PIN: ${cfg.tax_reg}</div>`);
  return lines.join('\n');
}

/**
 * Print a kitchen/order slip immediately after order creation.
 * Shows items + quantities + special instructions.
 */
export function printOrderSlip(order: {
  order_number: string;
  location: string;
  location_type?: string;
  items: Array<{ name: string; quantity: number; special_instructions?: string; customizations?: Record<string, any> }>;
  special_instructions?: string;
  created_at?: string;
  waiter_name?: string;
}) {
  const cfg = getReceiptConfig();

  const dateToUse = order.created_at ? new Date(order.created_at) : new Date();
  const now = dateToUse.toLocaleString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const itemRows = (order.items || [])
    .map(item => {
      const customNote = item.customizations
        ? Object.entries(item.customizations)
            .filter(([, v]) => v)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')
        : '';
      return `
        <div class="row">
          <span class="bold">${item.quantity}x</span>
          <span style="flex:1; padding: 0 6px;">${item.name}${customNote ? `<br><span class="small" style="color:#555">${customNote}</span>` : ''}</span>
        </div>
        ${item.special_instructions ? `<div class="small" style="padding-left:20px; color:#333">↳ ${item.special_instructions}</div>` : ''}
      `;
    })
    .join('');

  // Parse customer info from special_instructions
  const customerLine = order.special_instructions
    ? order.special_instructions.replace('Customer: ', '').replace(', Phone:', ' |')
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head><title>Order ${order.order_number}</title>${receiptStyles()}</head>
    <body>
      <div class="center">
        ${buildHeader(cfg)}
        <div class="bold" style="font-size:14px; margin-top:4px;">⊞ ORDER SLIP ⊞</div>
      </div>
      <div class="divider-solid"></div>

      <div class="row"><span class="bold">Order #</span><span>${order.order_number}</span></div>
      <div class="row"><span class="bold">${order.location_type === 'room' ? 'Room' : 'Table'}</span><span>${order.location}</span></div>
      <div class="row"><span class="bold">Time</span><span>${now}</span></div>
      ${order.waiter_name ? `<div class="row"><span class="bold">Waiter</span><span>${order.waiter_name}</span></div>` : ''}
      ${customerLine ? `<div class="row"><span class="bold">Customer</span><span class="small">${customerLine}</span></div>` : ''}

      <div class="divider"></div>
      <div class="bold mt" style="margin-bottom:4px;">ITEMS</div>
      ${itemRows}
      <div class="divider-solid"></div>

      <div class="center small mt">*** Kitchen Copy — Not a Receipt ***</div>
    </body>
    </html>
  `;

  openPrintWindow(html, `Order ${order.order_number}`);
}

/**
 * Print a customer-facing bill (itemised totals).
 * Called when the customer asks for the bill.
 */
export function printBill(order: {
  order_number: string;
  location: string;
  location_type?: string;
  items: Array<{ name: string; quantity: number; price: number; customizations?: Record<string, any> }>;
  subtotal: number;
  tax: number;
  total_amount: number;
  special_instructions?: string;
  status?: string;
  waiter_name?: string;
  created_at?: string;
  branch_id?: string;
}) {
  const cfg = getReceiptConfig(order.branch_id);

  const dateToUse = order.created_at ? new Date(order.created_at) : new Date();
  const now = dateToUse.toLocaleString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const fmt = (n: number) => `KES ${(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const itemRows = (order.items || [])
    .map(item => {
      const lineTotal = (item.price || 0) * (item.quantity || 1);
      return `
        <div class="row">
          <span>${item.quantity}x ${item.name}</span>
          <span>${fmt(lineTotal)}</span>
        </div>
      `;
    })
    .join('');

  // Parse customer name from special_instructions
  const customerName = order.special_instructions
    ? order.special_instructions.split(',')[0].replace('Customer:', '').trim()
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head><title>Bill ${order.order_number}</title>${receiptStyles()}</head>
    <body>
      <div class="center">
        ${buildHeader(cfg)}
        <div class="bold" style="font-size:14px; margin-top:6px;">CUSTOMER BILL</div>
      </div>
      <div class="divider-solid"></div>

      <div class="row"><span class="bold">Bill #</span><span>${order.order_number}</span></div>
      <div class="row"><span class="bold">${order.location_type === 'room' ? 'Room' : 'Table'}</span><span>${order.location}</span></div>
      ${customerName ? `<div class="row"><span class="bold">Customer</span><span>${customerName}</span></div>` : ''}
      ${order.waiter_name ? `<div class="row"><span class="bold">Waiter</span><span>${order.waiter_name}</span></div>` : ''}
      <div class="row"><span class="bold">Date</span><span class="small">${now}</span></div>

      <div class="divider"></div>
      <div class="bold" style="margin-bottom:4px;">ITEMS</div>
      ${itemRows}
      <div class="divider"></div>

      <div class="row"><span>Subtotal</span><span>${fmt(order.subtotal)}</span></div>
      <div class="row"><span>Tax (VAT)</span><span>${fmt(order.tax)}</span></div>
      <div class="divider-solid"></div>
      <div class="row total"><span>TOTAL DUE</span><span>${fmt(order.total_amount)}</span></div>
      <div class="divider"></div>

      <div class="center mt">
        <div>${cfg.footer}</div>
        ${cfg.footer2 ? `<div class="small">${cfg.footer2}</div>` : ''}
        ${cfg.payment_instructions ? `
        <div class="divider"></div>
        <div class="bold small" style="margin-bottom:3px">PAYMENT</div>
        ${cfg.payment_instructions.split('\n').map((line: string) => `<div class="small">${line}</div>`).join('')}
        ` : ''}
      </div>
    </body>
    </html>
  `;

  openPrintWindow(html, `Bill ${order.order_number}`);
}

/**
 * Thermal print for the Item Summary report.
 * Format mirrors QuickBooks POS: Dept | Qty | Ext Price | Item Name
 */

type ItemSummaryParams = {
  categories: Array<{
    category: string;
    items: Array<{ name: string; qty: number; revenue: number }>;
    total_qty: number;
    total_revenue: number;
  }>;
  grand_total_qty: number;
  grand_total_revenue: number;
  startDate: string;
  endDate: string;
  employeeName?: string;
};

/** Returns the receipt HTML string without opening any window — use for preview modal. */
export function buildItemSummaryHtml(params: ItemSummaryParams): string {
  const cfg = getReceiptConfig();
  const fmtAmt = (n: number) =>
    (n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const now = new Date().toLocaleString('en-KE', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const startDay = DAYS[new Date(params.startDate).getDay()];
  const dateLabel = params.startDate === params.endDate
    ? `${startDay}, ${params.startDate}`
    : `${params.startDate} to ${params.endDate}`;

  // Column widths — Dept 4-char, Qty spaced from Ext Price, right margin minimal
  const COL = `
    <div class="row" style="font-size:10px;border-bottom:1px solid #000;padding-bottom:2px;margin-bottom:2px">
      <span style="width:22px;flex-shrink:0">Dept</span>
      <span style="width:30px;flex-shrink:0;text-align:right">Qty</span>
      <span style="width:68px;flex-shrink:0;text-align:right">Ext Price</span>
      <span style="flex:1;padding-left:4px">Item Name</span>
    </div>`;

  const rows = params.categories.map(cat => {
    const abbr = cat.category.substring(0, 4).toUpperCase();
    const itemRows = cat.items.map(item => `
      <div class="row" style="font-size:11px">
        <span style="width:22px;flex-shrink:0;font-size:10px">${abbr}</span>
        <span style="width:30px;flex-shrink:0;text-align:right">${item.qty}</span>
        <span style="width:68px;flex-shrink:0;text-align:right">${fmtAmt(item.revenue)}</span>
        <span style="flex:1;padding-left:4px;word-break:break-word">${item.name}</span>
      </div>`).join('');

    return `
      ${itemRows}
      <div class="row bold" style="font-size:11px;border-top:1px solid #555;margin-top:1px">
        <span style="width:22px;flex-shrink:0;font-size:10px">${abbr}</span>
        <span style="width:30px;flex-shrink:0;text-align:right">${cat.total_qty}</span>
        <span style="width:68px;flex-shrink:0;text-align:right">${fmtAmt(cat.total_revenue)}</span>
        <span style="flex:1;padding-left:4px"></span>
      </div>
      <div class="divider"></div>`;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head><title>Item Summary</title>${receiptStyles()}</head>
    <body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
        <div class="small">${now}</div>
        <div class="bold center" style="font-size:13px;text-align:right">
          ${cfg.hotel_name}<br/>
          <span style="font-size:11px">Item Summary</span>
        </div>
      </div>
      <div class="small" style="margin-bottom:2px">${dateLabel}</div>
      ${params.employeeName ? `<div class="small" style="margin-bottom:4px">Waiter: <span class="bold">${params.employeeName}</span></div>` : ''}
      <div class="divider-solid"></div>
      ${COL}
      ${rows}
      <div class="row bold" style="font-size:12px;border-top:2px solid #000;padding-top:3px">
        <span style="width:22px;flex-shrink:0"></span>
        <span style="width:30px;flex-shrink:0;text-align:right">${params.grand_total_qty}</span>
        <span style="width:68px;flex-shrink:0;text-align:right">${fmtAmt(params.grand_total_revenue)}</span>
        <span style="flex:1;padding-left:4px"></span>
      </div>
      <div class="center small mt">Total Items: ${params.grand_total_qty}</div>
    </body>
    </html>
  `;
  return html;
}

/** Opens a new print window directly (instant print, no preview). */
export function printItemSummary(params: ItemSummaryParams) {
  openPrintWindow(buildItemSummaryHtml(params), 'Item Summary');
}

/**
 * Print both kitchen order slip AND customer bill in one action.
 * Opens a single print window with both documents separated by a page break.
 * The first copy goes to the kitchen, the second to the customer.
 */
export function printOrderSlipAndBill(order: {
  order_number: string;
  location: string;
  location_type?: string;
  items: Array<{ name: string; quantity: number; price: number; special_instructions?: string; customizations?: Record<string, any> }>;
  subtotal: number;
  tax: number;
  total_amount: number;
  special_instructions?: string;
  status?: string;
  waiter_name?: string;
  created_at?: string;
  branch_id?: string;
}) {
  const cfg = getReceiptConfig(order.branch_id);
  const fmt = (n: number) => `KES ${(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const dateToUse = order.created_at ? new Date(order.created_at) : new Date();
  const now = dateToUse.toLocaleString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  // Kitchen slip items (qty + name + instructions)
  const kitchenRows = (order.items || []).map(item => {
    const customNote = item.customizations
      ? Object.entries(item.customizations).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ')
      : '';
    return `
      <div class="row">
        <span class="bold">${item.quantity}x</span>
        <span style="flex:1;padding:0 6px">${item.name}${customNote ? `<br><span class="small" style="color:#555">${customNote}</span>` : ''}</span>
      </div>
      ${item.special_instructions ? `<div class="small" style="padding-left:20px;color:#333">↳ ${item.special_instructions}</div>` : ''}
    `;
  }).join('');

  // Bill items (qty + name + price)
  const billRows = (order.items || []).map(item => {
    const lineTotal = (item.price || 0) * (item.quantity || 1);
    return `<div class="row"><span>${item.quantity}x ${item.name}</span><span>${fmt(lineTotal)}</span></div>`;
  }).join('');

  const customerName = order.special_instructions
    ? order.special_instructions.split(',')[0].replace('Customer:', '').trim()
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Order ${order.order_number}</title>
      ${receiptStyles()}
      <style>
        .page-break { page-break-after: always; border-top: 2px dashed #000; margin: 10px 0 4px 0; }
        .copy-label { text-align:center; font-size:11px; font-weight:bold; letter-spacing:1px; margin-bottom:6px; }
      </style>
    </head>
    <body>

      <!-- ===== COPY 1: KITCHEN SLIP ===== -->
      <div class="copy-label">*** KITCHEN COPY ***</div>
      <div class="center">
        ${buildHeader(cfg)}
        <div class="bold" style="font-size:14px;margin-top:4px">⊞ ORDER SLIP ⊞</div>
      </div>
      <div class="divider-solid"></div>
      <div class="row"><span class="bold">Order #</span><span>${order.order_number}</span></div>
      <div class="row"><span class="bold">${order.location_type === 'room' ? 'Room' : 'Table'}</span><span>${order.location}</span></div>
      <div class="row"><span class="bold">Time</span><span>${now}</span></div>
      ${order.waiter_name ? `<div class="row"><span class="bold">Waiter</span><span>${order.waiter_name}</span></div>` : ''}
      ${customerName ? `<div class="row"><span class="bold">Customer</span><span class="small">${customerName}</span></div>` : ''}
      <div class="divider"></div>
      <div class="bold mt" style="margin-bottom:4px">ITEMS</div>
      ${kitchenRows}
      <div class="divider-solid"></div>
      <div class="center small mt">*** Kitchen Copy — Not a Receipt ***</div>

      <!-- ===== PAGE BREAK ===== -->
      <div class="page-break"></div>

      <!-- ===== COPY 2: CUSTOMER BILL ===== -->
      <div class="copy-label">*** CUSTOMER COPY ***</div>
      <div class="center">
        ${buildHeader(cfg)}
        <div class="bold" style="font-size:14px;margin-top:6px">CUSTOMER BILL</div>
      </div>
      <div class="divider-solid"></div>
      <div class="row"><span class="bold">Bill #</span><span>${order.order_number}</span></div>
      <div class="row"><span class="bold">${order.location_type === 'room' ? 'Room' : 'Table'}</span><span>${order.location}</span></div>
      ${customerName ? `<div class="row"><span class="bold">Customer</span><span>${customerName}</span></div>` : ''}
      ${order.waiter_name ? `<div class="row"><span class="bold">Waiter</span><span>${order.waiter_name}</span></div>` : ''}
      <div class="row"><span class="bold">Date</span><span class="small">${now}</span></div>
      <div class="divider"></div>
      <div class="bold" style="margin-bottom:4px">ITEMS</div>
      ${billRows}
      <div class="divider"></div>
      <div class="row"><span>Subtotal</span><span>${fmt(order.subtotal)}</span></div>
      <div class="row"><span>Tax (VAT)</span><span>${fmt(order.tax)}</span></div>
      <div class="divider-solid"></div>
      <div class="row total"><span>TOTAL DUE</span><span>${fmt(order.total_amount)}</span></div>
      <div class="divider"></div>
      <div class="center mt">
        <div>${cfg.footer}</div>
        ${cfg.footer2 ? `<div class="small">${cfg.footer2}</div>` : ''}
        ${cfg.payment_instructions ? `
        <div class="divider"></div>
        <div class="bold small" style="margin-bottom:3px">PAYMENT</div>
        ${cfg.payment_instructions.split('\n').map((line: string) => `<div class="small">${line}</div>`).join('')}
        ` : ''}
      </div>

    </body>
    </html>
  `;

  openPrintWindow(html, `Order ${order.order_number}`);
}

/**
 * Thermal print for the Employee Sales Report.
 * Prints one section per employee: header, sales summary, item breakdown, payment breakdown.
 */

type EmployeeSalesParams = {
  employees: Array<{
    employee_name: string;
    role: string;
    department: string;
    total_sales: number;
    total_orders: number;
    total_items_sold: number;
    avg_order_value: number;
    top_selling_item: string;
    completion_rate: number;
    payment_summary: {
      cash: number; mpesa: number; card: number;
      room_charge: number; other: number; total_collected: number;
    };
    items_summary?: Array<{
      department: string;
      items: Array<{ name: string; qty: number; revenue: number }>;
      total_qty: number;
      total_revenue: number;
    }>;
  }>;
  periodLabel: string;
  totalSales: number;
  totalOrders: number;
  unattributedSales: number;
};

export function buildEmployeeSalesHtml(params: EmployeeSalesParams): string {
  const cfg = getReceiptConfig();
  const fmt = (n: number) =>
    `KES ${(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const now = new Date().toLocaleString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const empBlocks = params.employees.map((e, idx) => {
    const payRows = [
      ['Cash', e.payment_summary.cash],
      ['M-Pesa', e.payment_summary.mpesa],
      ['Card', e.payment_summary.card],
      ['Room Charge', e.payment_summary.room_charge],
      ...(e.payment_summary.other > 0 ? [['Other', e.payment_summary.other] as [string, number]] : []),
    ].filter(([, v]) => (v as number) > 0)
      .map(([label, val]) => `<div class="row"><span>${label}</span><span>${fmt(val as number)}</span></div>`)
      .join('');

    const itemRows = (e.items_summary || []).map(dept => {
      const abbr = dept.department.substring(0, 4).toUpperCase();
      const deptItems = dept.items.map((item: any) => `
        <div class="row" style="font-size:11px">
          <span style="width:22px;flex-shrink:0;font-size:10px">${abbr}</span>
          <span style="width:30px;flex-shrink:0;text-align:right">${item.qty}</span>
          <span style="width:68px;flex-shrink:0;text-align:right">${fmt(item.revenue)}</span>
          <span style="flex:1;padding-left:4px;font-size:10px;word-break:break-word">${item.name}</span>
        </div>`).join('');
      return `
        ${deptItems}
        <div class="row bold" style="font-size:11px;border-top:1px solid #555;margin-top:1px">
          <span style="width:22px;flex-shrink:0;font-size:10px">${abbr}</span>
          <span style="width:30px;flex-shrink:0;text-align:right">${dept.total_qty}</span>
          <span style="width:68px;flex-shrink:0;text-align:right">${fmt(dept.total_revenue)}</span>
          <span style="flex:1;padding-left:4px;font-size:10px">subtotal</span>
        </div>
        <div class="divider"></div>`;
    }).join('');

    return `
      <div class="center bold" style="font-size:14px;margin-top:${idx > 0 ? 16 : 0}px">${idx + 1}. ${e.employee_name}</div>
      <div class="center small">${e.role.charAt(0).toUpperCase() + e.role.slice(1)} • ${e.department}</div>
      <div class="divider"></div>
      <div class="row"><span>Total Sales</span><span class="bold">${fmt(e.total_sales)}</span></div>
      <div class="row"><span>Orders</span><span>${e.total_orders}</span></div>
      <div class="row"><span>Items Sold</span><span>${e.total_items_sold}</span></div>
      <div class="row"><span>Avg Order</span><span>${fmt(e.avg_order_value)}</span></div>
      <div class="row"><span>Completion</span><span>${e.completion_rate}%</span></div>
      ${(e.items_summary || []).length > 0 ? `
      <div class="divider"></div>
      <div class="bold small" style="margin-bottom:3px">ITEMS SOLD</div>
      <div class="row small" style="border-bottom:1px solid #000;padding-bottom:2px;margin-bottom:2px;font-size:10px">
        <span style="width:22px;flex-shrink:0">Dept</span>
        <span style="width:30px;flex-shrink:0;text-align:right">Qty</span>
        <span style="width:68px;flex-shrink:0;text-align:right">Revenue</span>
        <span style="flex:1;padding-left:4px">Item</span>
      </div>
      ${itemRows}` : ''}
      <div class="divider"></div>
      <div class="bold small" style="margin-bottom:3px">PAYMENTS</div>
      ${payRows}
      <div class="divider-solid"></div>
      <div class="row bold"><span>COLLECTED</span><span>${fmt(e.payment_summary.total_collected)}</span></div>
    `;
  }).join('<div class="divider-solid" style="margin:10px 0;border-top:2px dashed #000"></div>');

  const html = `
    <!DOCTYPE html>
    <html>
    <head><title>Employee Sales Report</title>${receiptStyles()}</head>
    <body>
      <div class="center">
        ${buildHeader(cfg)}
        <div class="bold" style="font-size:14px;margin-top:6px;">EMPLOYEE SALES REPORT</div>
        <div class="small">${params.periodLabel}</div>
      </div>
      <div class="divider-solid"></div>

      <div class="row bold"><span>Grand Total</span><span>${fmt(params.totalSales)}</span></div>
      <div class="row"><span>Total Orders</span><span>${params.totalOrders}</span></div>
      <div class="row"><span>Staff Count</span><span>${params.employees.length}</span></div>
      ${params.unattributedSales > 0 ? `<div class="row small"><span>Unattributed</span><span>${fmt(params.unattributedSales)}</span></div>` : ''}
      <div class="divider-solid"></div>

      ${empBlocks}

      <div class="divider-solid"></div>
      <div class="center small mt">Printed: ${now}</div>
      <div class="center small">${cfg.footer}</div>
    </body>
    </html>
  `;
  return html;
}

export function printEmployeeSalesReport(params: EmployeeSalesParams) {
  openPrintWindow(buildEmployeeSalesHtml(params), 'Employee Sales Report');
}
