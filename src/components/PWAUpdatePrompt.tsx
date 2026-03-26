import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm">
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-700 text-white shadow-2xl shadow-indigo-900/50 border border-indigo-500/40">
        <RefreshCw className="h-5 w-5 flex-shrink-0 text-indigo-200" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-none mb-0.5">New version available</p>
          <p className="text-xs text-indigo-200">Tap Update to get the latest changes.</p>
        </div>
        <button
          onClick={() => updateServiceWorker(true)}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-white text-indigo-700 text-xs font-bold hover:bg-indigo-50 transition-colors"
        >
          Update
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="flex-shrink-0 text-indigo-300 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
