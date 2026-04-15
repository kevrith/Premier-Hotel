/**
 * toastManager — deduplicating toast wrapper around react-hot-toast.
 *
 * Prevents the same message from stacking when multiple API calls fail
 * simultaneously (e.g. going offline fires many 401s / network errors at once).
 *
 * Usage:  import { toastManager as toast } from '@/lib/toastManager';
 *         toast.error('Your session has expired. Please sign in to continue.');   // fires once, even if called 10×
 */

import { toast, type ToastOptions } from 'react-hot-toast';

// Active toast IDs — cleared when the toast dismisses
const active = new Set<string>();

function makeId(message: string): string {
  // Normalise whitespace so minor variations don't bypass dedup
  return message.trim().toLowerCase().replace(/\s+/g, ' ');
}

function fire(
  fn: (msg: string, opts?: ToastOptions) => string,
  message: string,
  opts?: ToastOptions,
): string {
  const id = opts?.id ?? makeId(message);
  if (active.has(id)) return id;

  active.add(id);
  const toastId = fn(message, { id, ...opts });

  // Remove from active set once the toast disappears
  const duration = opts?.duration ?? 4000;
  setTimeout(() => active.delete(id), duration + 500);

  return toastId;
}

export const toastManager = {
  success: (msg: string, opts?: ToastOptions) =>
    fire(toast.success, msg, opts),

  error: (msg: string, opts?: ToastOptions) =>
    fire(toast.error, msg, { duration: 5000, ...opts }),

  info: (msg: string, opts?: ToastOptions) =>
    fire((m, o) => toast(m, o), msg, opts),

  loading: (msg: string, opts?: ToastOptions) =>
    fire(toast.loading, msg, { duration: Infinity, ...opts }),

  dismiss: (id?: string) => {
    if (id) active.delete(id);
    toast.dismiss(id);
  },

  dismissAll: () => {
    active.clear();
    toast.dismiss();
  },
};

export default toastManager;
