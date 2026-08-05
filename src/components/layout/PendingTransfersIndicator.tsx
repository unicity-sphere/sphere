import { useState, useEffect, useRef } from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { TokenRegistry } from '@unicitylabs/sphere-sdk';
import type { PendingTransfer } from '@unicitylabs/sphere-sdk/payments-v2';
import { usePendingTransfers, formatAmount } from '../../sdk';
import { isChainPubkey, truncateId, stripDirectScheme } from '../../utils/identifiers';

/** "just now" / "3m ago" / "2h ago" / "5d ago" — compact age for the list rows. */
function formatAge(createdAt: number): string {
  const elapsedMs = Date.now() - createdAt;
  if (elapsedMs < 60_000) return 'just now';
  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatRecipient(recipient: string): string {
  const bare = stripDirectScheme(recipient);
  if (isChainPubkey(bare) || bare !== recipient) return truncateId(bare);
  return recipient.startsWith('@') ? recipient : `@${recipient}`;
}

function formatPendingAmount(row: PendingTransfer): string {
  const def = TokenRegistry.getInstance().getDefinition(row.coinId);
  const amount = formatAmount(row.amount, def?.decimals ?? 0);
  return def?.symbol ? `${amount} ${def.symbol}` : amount;
}

/**
 * Compact header chip for in-flight (keep-open / shortfall) outgoing
 * transfers — `payments.pendingTransfers()` via usePendingTransfers, so
 * transfers still converging across a close/reopen are visible immediately at
 * mount. Hidden entirely while the list is empty. Expands to a small list
 * (amount, recipient, certified/total legs, age) with a "Retry now" action.
 *
 * MONEY-SAFETY: "Retry now" calls payments.resumeNow() — the SDK converges
 * the SAME transferIds. It must never trigger send() (double-pay).
 */
export function PendingTransfersIndicator() {
  const { pending, resumeNow, isResuming } = usePendingTransfers();
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close the panel on an outside click (same lightweight idiom as other
  // header popovers — no portal needed at header z-index).
  useEffect(() => {
    if (!expanded) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [expanded]);

  if (pending.length === 0) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        title="Transfers completing in the background"
        className="relative flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-lg sm:rounded-xl bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
      >
        <span className="relative">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 dark:text-amber-400" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500" />
        </span>
        <span className="text-xs font-medium text-amber-500 dark:text-amber-400">
          {pending.length} pending
        </span>
      </button>

      {expanded && (
        <div className="absolute right-0 top-full mt-2 w-72 z-50 rounded-xl bg-white dark:bg-modal-bg border border-neutral-200 dark:border-white/10 shadow-xl dark:shadow-[0_8px_40px_rgba(0,0,0,0.5)] p-3">
          <div className="text-xs text-neutral-500 dark:text-white/45 mb-2">
            These transfers are safe and will complete automatically.
          </div>
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {pending.map((row) => (
              <li
                key={row.transferId}
                className="p-2 rounded-lg bg-neutral-50 dark:bg-white/4 border border-neutral-200 dark:border-white/5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {formatPendingAmount(row)}
                  </span>
                  <span className="text-[11px] text-neutral-400 dark:text-white/35 shrink-0">
                    {formatAge(row.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-xs text-neutral-500 dark:text-white/45 truncate" title={row.recipient}>
                    to {formatRecipient(row.recipient)}
                  </span>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 shrink-0">
                    {row.legs.total > 1
                      ? `${row.legs.certified}/${row.legs.total} certified`
                      : row.deliveryPending
                        ? 'delivering'
                        : 'certifying'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              // Best-effort nudge — on failure the SDK's in-session auto-retry
              // (and this chip's poll) keep converging; nothing to surface.
              resumeNow().catch(() => {});
            }}
            disabled={isResuming}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResuming ? 'animate-spin' : ''}`} />
            {isResuming ? 'Retrying…' : 'Retry now'}
          </button>
        </div>
      )}
    </div>
  );
}
