import { useEffect, useState } from 'react';
import { Lock, X } from 'lucide-react';
import { UnlockScreen } from '../wallet/onboarding/components/UnlockScreen';
import { useSphereContext } from '../../sdk/hooks/core/useSphere';

/** Aggregated locked-request tally, owned by ConnectProvider. */
export interface LockedRequestCounts {
  /** How many requests have been refused WALLET_LOCKED since the wallet locked. */
  readonly total: number;
  /** Verified origins those requests came from, in first-seen order. */
  readonly origins: readonly string[];
}

/** Label for a host that was constructed without an origin (ConnectHostConfig.origin
 *  is optional — the nodejs mock host and any WebSocket host have no browser origin).
 *  Never claim a name we cannot verify. */
const UNNAMED_APP = 'a connected app';

function describeOrigins(origins: readonly string[]): string {
  if (origins.length === 0) return UNNAMED_APP;
  if (origins.length === 1) return origins[0]!;
  return `${origins.length} connected apps`;
}

/**
 * The wallet's ONLY reaction to a dApp request refused WALLET_LOCKED (4009).
 *
 * PASSIVE by contract (graceful lock §8.3, FINAL DECISION 4): it is a badge, not
 * a prompt. A forged consent prompt gains an attacker nothing; a forged
 * CREDENTIAL prompt harvests the password that decrypts the seed — so a framed
 * origin must never control the moment a genuine password field appears. The
 * field is mounted here only from the click handler below, which is why
 * `autoFocus` on it is correct: a human asked for it.
 *
 * Rendered by ConnectProvider, which main.tsx mounts ABOVE ThemeInitializer /
 * BrowserRouter / App, so this is permanent chrome: route-independent and outside
 * DashboardLayout's `relative z-10` stacking context (and therefore above
 * DesktopLayout's z-99999 fullscreen layer, which lives inside it). Toasts own
 * z-100001; this sits one below, on the opposite corner.
 */
export function LockedRequestBadge({ counts }: { counts: LockedRequestCounts }) {
  const { isLocked } = useSphereContext();
  const [showUnlock, setShowUnlock] = useState(false);

  // The wallet came back: no surface, no badge, nothing to explain.
  useEffect(() => {
    if (!isLocked) setShowUnlock(false);
  }, [isLocked]);

  if (!isLocked || counts.total === 0) return null;

  const who = describeOrigins(counts.origins);

  return (
    <>
      <button
        type="button"
        data-testid="locked-request-badge"
        onClick={() => setShowUnlock(true)}
        className="fixed bottom-4 left-4 z-100000 flex items-center gap-2 max-w-[min(22rem,calc(100vw-2rem))] px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-amber-500/40 shadow-lg text-left"
      >
        <Lock className="w-4 h-4 shrink-0 text-amber-500" />
        <span className="min-w-0 text-xs text-neutral-700 dark:text-neutral-200">
          <span data-testid="locked-request-count" className="font-semibold">{counts.total}</span>
          {' '}request{counts.total === 1 ? '' : 's'} blocked —{' '}
          <span className="font-mono break-all">{who}</span>
        </span>
        <span className="shrink-0 text-xs font-semibold text-orange-500 dark:text-brand-orange">Unlock</span>
      </button>

      {showUnlock && (
        <div
          data-testid="locked-request-unlock-surface"
          className="fixed inset-0 z-100000 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 shadow-xl overflow-hidden">
            <div className="flex items-center justify-end p-2">
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowUnlock(false)}
                className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* autoFocus TRUE: a human clicked the badge to get here, so claiming
                the caret is correct by construction. No onRestore — restoring
                installs a DIFFERENT seed behind origin-keyed approvals and must
                not be reachable from a surface a dApp's activity led us to; the
                wallet panel's own unlock screen owns that flow. */}
            <UnlockScreen autoFocus origin={counts.origins[0]} />
          </div>
        </div>
      )}
    </>
  );
}
