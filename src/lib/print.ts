// @ts-nocheck
/**
 * Print utilities for order slips and customer bills.
 * Opens a new browser window, renders content, triggers print, then closes.
 */

/**
 * Read receipt header/footer settings from localStorage.
 * Admins configure these in Settings → Receipt.
 */
function getReceiptConfig() {
  return {
    hotel_name:  localStorage.getItem('receipt:hotel_name')  || 'Premier Hotel',
    address:     localStorage.getItem('receipt:address')     || '',
    po_box:      localStorage.getItem('receipt:po_box')      || '',
    phone:       localStorage.getItem('receipt:phone')       || '',
    email:       localStorage.getItem('receipt:email')       || '',
    website:     localStorage.getItem('receipt:website')     || '',
    tax_reg:     localStorage.getItem('receipt:tax_reg')     || '',
    footer:      localStorage.getItem('receipt:footer')      || 'Thank you for dining with us!',
    footer2:     localStorage.getItem('receipt:footer2')     || 'Please settle at the counter',
  };
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
        padding: 10px;
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
        body { padding: 4px; }
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

  const now = new Date().toLocaleString('en-KE', {
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
}) {
  const cfg = getReceiptConfig();

  const now = new Date().toLocaleString('en-KE', {
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
      </div>
    </body>
    </html>
  `;

  openPrintWindow(html, `Bill ${order.order_number}`);
}
