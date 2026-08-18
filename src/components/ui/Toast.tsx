import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, AlertTriangle, CheckCircle, XCircle, ArrowDownLeft } from 'lucide-react';
import type { ToastType, ShowToastDetail, TransferToastData } from './toast-utils';

export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  transfer?: TransferToastData;
}

/**
 * Safety net only. Coalescing (below) collapses a multi-token receive into one
 * toast, so this engages just for genuinely unrelated bursts — it must never be
 * the thing standing between the user and their wallet (issue #490).
 */
const MAX_VISIBLE_TOASTS = 3;

const icons: Record<ToastType, React.ReactNode> = {
  info: <Info className="w-5 h-5" />,
  success: <CheckCircle className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  error: <XCircle className="w-5 h-5" />,
};

const colors: Record<ToastType, string> = {
  info: 'bg-blue-500/90 border-blue-400',
  success: 'bg-green-500/90 border-green-400',
  warning: 'bg-yellow-500/90 border-yellow-400',
  error: 'bg-red-500/90 border-red-400',
};

function TransferToast({ data, onClose }: { data: TransferToastData; onClose: () => void }) {
  return (
    <div className="pointer-events-auto rounded-2xl border border-emerald-500/30 bg-neutral-900/95 backdrop-blur-md shadow-2xl shadow-emerald-500/10 overflow-hidden min-w-80 max-w-96">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
            <ArrowDownLeft className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-medium text-emerald-400">{data.title ?? 'Incoming Transfer'}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-3.5 h-3.5 text-neutral-400" />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Token icon */}
        {data.iconUrl ? (
          <img src={data.iconUrl} className="w-10 h-10 rounded-full shrink-0" alt="" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-neutral-300">{data.symbol.slice(0, 2)}</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold text-white">
            +{data.amount} <span className="text-emerald-400">{data.symbol}</span>
          </div>
          {data.sender && (
            <div className="text-xs text-neutral-400">
              from <span className="text-neutral-200 font-medium">{data.sender}</span>
            </div>
          )}
        </div>
      </div>

      {/* Memo */}
      {data.memo && (
        <div className="px-4 pb-3 -mt-1">
          <div className="text-xs text-neutral-500 bg-neutral-800/50 rounded-lg px-3 py-1.5 italic truncate">
            &ldquo;{data.memo}&rdquo;
          </div>
        </div>
      )}
    </div>
  );
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  /** Per-toast dismiss timers, so a coalesced update can restart its own. */
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((detail: ShowToastDetail) => {
    // A caller-supplied groupId makes the toast REPLACE its live predecessor
    // instead of stacking on it. A 54-token payment arrives as 54 separate
    // events (the SDK announces per token, not per payment), so without this
    // the wallet disappears behind a wall of near-identical toasts; with it the
    // user gets one toast whose amount climbs as the tokens land.
    const id = detail.groupId ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const duration = detail.duration ?? 4000;
    const toast: ToastData = {
      id,
      message: detail.message,
      type: detail.type || 'info',
      duration,
      transfer: detail.transfer,
    };

    setToasts((prev) => {
      const at = prev.findIndex((t) => t.id === id);
      if (at === -1) return [...prev, toast];
      // Update in place: keeping the array position (and the React key) stable
      // is what stops the stack re-animating on every arrival.
      const next = [...prev];
      next[at] = toast;
      return next;
    });

    const timers = timersRef.current;
    const existing = timers.get(id);
    if (existing !== undefined) clearTimeout(existing);
    if (duration > 0) {
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id);
          removeToast(id);
        }, duration),
      );
    }
  }, [removeToast]);

  useEffect(() => {
    const handleShowToast = (event: CustomEvent<ShowToastDetail>) => {
      addToast(event.detail);
    };

    window.addEventListener('show-toast', handleShowToast as EventListener);
    return () => {
      window.removeEventListener('show-toast', handleShowToast as EventListener);
    };
  }, [addToast]);

  // Coalescing means this rarely engages; it remains so that unrelated bursts
  // still cannot grow the stack past the cap and cover the UI.
  const visible = toasts.slice(-MAX_VISIBLE_TOASTS);
  const overflowCount = toasts.length - visible.length;

  return (
    <div className="fixed bottom-4 right-4 z-100001 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {/* Reversed so the newest toast renders on top of the bottom-anchored stack. */}
        {[...visible].reverse().map((toast) => (
          <motion.div
            key={toast.id}
            data-testid="toast"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
          >
            {toast.transfer ? (
              <TransferToast data={toast.transfer} onClose={() => removeToast(toast.id)} />
            ) : (
              <div className={`
                pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl
                border shadow-lg backdrop-blur-sm text-white min-w-70 max-w-100
                ${colors[toast.type]}
              `}>
                {icons[toast.type]}
                <span className="flex-1 text-sm font-medium">{toast.message}</span>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        ))}
        {overflowCount > 0 && (
          <motion.div
            key="toast-overflow"
            data-testid="toast-overflow"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="pointer-events-none self-end rounded-full border border-white/10 bg-neutral-900/90 px-3 py-1 text-xs font-medium text-neutral-400 backdrop-blur-sm shadow-lg"
          >
            +{overflowCount} more
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
