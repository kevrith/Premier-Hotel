/**
 * Shared formatting utilities — single source of truth for currency, dates, and status display.
 * Import from here instead of reimplementing in each component.
 */

// ── Currency ─────────────────────────────────────────────────────────────────

const KES_FORMATTER = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format a number as KES 1,500 */
export function formatKES(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return KES_FORMATTER.format(isNaN(n) ? 0 : n);
}

/** Format a number with commas but no currency symbol: 1,500 */
export function formatNumber(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return isNaN(n) ? '0' : Math.round(n).toLocaleString('en-KE');
}

// ── Dates ─────────────────────────────────────────────────────────────────────

/** 29 Mar 2026 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** 29 Mar 2026, 14:30 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** 14:30 */
export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
}

// ── Order / Room status ───────────────────────────────────────────────────────

const ORDER_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:    { label: 'Pending',     className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  confirmed:  { label: 'Confirmed',   className: 'bg-blue-100 text-blue-800 border-blue-200' },
  preparing:  { label: 'Preparing',   className: 'bg-orange-100 text-orange-800 border-orange-200' },
  ready:      { label: 'Ready',       className: 'bg-green-100 text-green-800 border-green-200' },
  delivered:  { label: 'Delivered',   className: 'bg-teal-100 text-teal-800 border-teal-200' },
  completed:  { label: 'Completed',   className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelled:  { label: 'Cancelled',   className: 'bg-red-100 text-red-800 border-red-200' },
  voided:     { label: 'Voided',      className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const ROOM_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  available:   { label: 'Available',    className: 'bg-green-100 text-green-800 border-green-200' },
  occupied:    { label: 'Occupied',     className: 'bg-blue-100 text-blue-800 border-blue-200' },
  maintenance: { label: 'Maintenance',  className: 'bg-red-100 text-red-800 border-red-200' },
  cleaning:    { label: 'Cleaning',     className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  reserved:    { label: 'Reserved',     className: 'bg-purple-100 text-purple-800 border-purple-200' },
  checked_in:  { label: 'Checked In',  className: 'bg-teal-100 text-teal-800 border-teal-200' },
  checked_out: { label: 'Checked Out', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const BOOKING_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:   { label: 'Pending',    className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  confirmed: { label: 'Confirmed',  className: 'bg-blue-100 text-blue-800 border-blue-200' },
  checked_in:  { label: 'Checked In',  className: 'bg-green-100 text-green-800 border-green-200' },
  checked_out: { label: 'Checked Out', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  cancelled: { label: 'Cancelled',  className: 'bg-red-100 text-red-800 border-red-200' },
  no_show:   { label: 'No Show',    className: 'bg-orange-100 text-orange-800 border-orange-200' },
};

const USER_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active:    { label: 'Active',    className: 'bg-green-100 text-green-800 border-green-200' },
  inactive:  { label: 'Inactive',  className: 'bg-gray-100 text-gray-600 border-gray-200' },
  suspended: { label: 'Suspended', className: 'bg-red-100 text-red-800 border-red-200' },
};

const FALLBACK = { label: 'Unknown', className: 'bg-gray-100 text-gray-500 border-gray-200' };

export function getOrderStatusConfig(status: string) {
  return ORDER_STATUS_CONFIG[status?.toLowerCase()] ?? { ...FALLBACK, label: status ?? 'Unknown' };
}

export function getRoomStatusConfig(status: string) {
  return ROOM_STATUS_CONFIG[status?.toLowerCase()] ?? { ...FALLBACK, label: status ?? 'Unknown' };
}

export function getBookingStatusConfig(status: string) {
  return BOOKING_STATUS_CONFIG[status?.toLowerCase()] ?? { ...FALLBACK, label: status ?? 'Unknown' };
}

export function getUserStatusConfig(status: string) {
  return USER_STATUS_CONFIG[status?.toLowerCase()] ?? { ...FALLBACK, label: status ?? 'Unknown' };
}

// ── Pricing ───────────────────────────────────────────────────────────────────

const DEFAULT_TAX_RATE  = 0.16;  // 16% VAT
const DEFAULT_SERVICE   = 0.10;  // 10% service charge

export interface PriceBreakdown {
  subtotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
}

export function calculatePriceBreakdown(
  subtotal: number,
  taxRate = DEFAULT_TAX_RATE,
  serviceRate = DEFAULT_SERVICE,
): PriceBreakdown {
  const tax = subtotal * taxRate;
  const serviceCharge = subtotal * serviceRate;
  return { subtotal, tax, serviceCharge, total: subtotal + tax + serviceCharge };
}
