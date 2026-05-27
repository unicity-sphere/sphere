import { useRef, useState } from 'react';
import { X, Loader2, AlertTriangle, Database, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSphereContext } from '../../sdk/hooks/core/useSphere';
import { showToast } from '../ui/toast-utils';

/**
 * Verbatim copy of the merge-overwrite confirmation modal — surfaced in
 * the PR description so reviewers can scrutinize the warning text.
 */
const MERGE_CONFIRM_HEADLINE = 'Merge Legacy → UXF (overwrite)?';
const MERGE_CONFIRM_BODY =
  'This will OVERWRITE your UXF Profile token data with your Legacy data. ' +
  'Tokens currently in Profile that aren\'t in Legacy will be lost. ' +
  'Continue?';

/**
 * Pretty-print the wallet mode for the status line.
 */
function modeLabel(mode: 'legacy' | 'profile'): string {
  return mode === 'profile' ? 'UXF Profile (new)' : 'Legacy';
}

/**
 * Human-readable label for each action — used in toast messages.
 */
function actionLabel(
  action: 'migrate' | 'switch-profile' | 'switch-legacy' | 'merge' | 'refresh',
): string {
  switch (action) {
    case 'migrate': return 'migrate to UXF Profile';
    case 'switch-profile': return 'switch to UXF Profile';
    case 'switch-legacy': return 'switch to Legacy';
    case 'merge': return 'merge Legacy → UXF';
    case 'refresh': return 'refresh probes';
  }
}

/**
 * Tooltip text for each action button — referenced from the (mode ×
 * probe) → button decision table.
 */
const TOOLTIPS = {
  migrate:
    'One-shot: copy your legacy wallet tokens into the new UXF Profile ' +
    'storage and switch this wallet to use Profile sync from now on.',
  switchToProfile:
    'Switch to UXF Profile storage. Does NOT copy any data — your ' +
    'Profile store must already contain the tokens you want to see.',
  switchToLegacy:
    'Switch back to Legacy IndexedDB storage. Does NOT copy any data — ' +
    'your Legacy store must already contain the tokens you want to see.',
  merge:
    'Copy ALL legacy data into UXF Profile, OVERWRITING anything ' +
    'currently in Profile that isn\'t in Legacy. Cannot be undone.',
  refresh: 'Re-check both stores for token data.',
} as const;

interface MergeConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

function MergeConfirmModal({ onConfirm, onCancel }: MergeConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="uxf-merge-confirm-headline"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="relative z-10 w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        style={{
          background: 'var(--color-bg-secondary)',
          borderColor: 'rgba(239, 68, 68, 0.35)',
          boxShadow: '0 0 40px rgba(239, 68, 68, 0.15)',
        }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div
            className="p-2 rounded-full flex-shrink-0"
            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h2
              id="uxf-merge-confirm-headline"
              className="text-base font-semibold mb-1"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {MERGE_CONFIRM_HEADLINE}
            </h2>
            <p
              className="text-xs leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {MERGE_CONFIRM_BODY}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onConfirm}
            className="flex-1 py-2 px-4 rounded-xl text-xs font-semibold transition-colors"
            style={{
              background: '#ef4444',
              color: '#fff',
            }}
          >
            Yes, overwrite Profile
          </button>
          <button
            onClick={onCancel}
            className="py-2 px-4 rounded-xl text-xs font-medium border transition-colors"
            style={{
              borderColor: 'var(--color-border-primary)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface ActionButtonProps {
  label: string;
  tooltip: string;
  variant: 'primary' | 'secondary' | 'danger';
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}

function ActionButton({ label, tooltip, variant, loading, disabled, onClick }: ActionButtonProps) {
  const variantStyles: Record<typeof variant, React.CSSProperties> = {
    primary: {
      background: 'var(--color-brand-uxf, #22c55e)',
      color: '#000',
    },
    secondary: {
      background: 'transparent',
      color: 'var(--color-brand-uxf, #22c55e)',
      border: '1px solid var(--color-brand-uxf-border, rgba(34,197,94,0.30))',
    },
    danger: {
      background: 'transparent',
      color: '#ef4444',
      border: '1px solid rgba(239, 68, 68, 0.45)',
    },
  };
  return (
    <button
      type="button"
      title={tooltip}
      aria-label={label}
      onClick={onClick}
      disabled={disabled || loading}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-opacity whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
      style={variantStyles[variant]}
    >
      {loading && <Loader2 className="w-3 h-3 animate-spin" />}
      <span>{label}</span>
    </button>
  );
}

/**
 * Banner state matrix:
 *
 * | Current mode | Profile data | Buttons                                                 |
 * |--------------|--------------|---------------------------------------------------------|
 * | Legacy       | none         | "Migrate to UXF Profile" (primary)                      |
 * | Legacy       | exists       | "Switch to UXF Profile" + "Merge Legacy → UXF (over.)"  |
 * | UXF Profile  | (legacy yes) | "Switch back to Legacy" + "Merge Legacy → UXF (over.)"  |
 * | UXF Profile  | (legacy no)  | (no buttons — Profile is the only store with data)      |
 *
 * The merge button always carries a confirmation modal because it is
 * the only destructive action.
 */
export function UxfBanner() {
  const ctx = useSphereContext();
  const {
    walletMode,
    hasLegacyData,
    hasProfileData,
    isSwitchingMode,
    switchWalletMode,
    runLegacyToProfileMigration,
    refreshDataProbes,
    walletExists,
  } = ctx;

  const [dismissed, setDismissed] = useState(false);
  const [activeAction, setActiveAction] = useState<null | 'migrate' | 'switch-profile' | 'switch-legacy' | 'merge' | 'refresh'>(null);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  // Synchronous double-click guard. `disabled` on the button only takes
  // effect after React re-renders — a fast double-tap that fires in the
  // same task can race past it. A ref flipped inside the handler closes
  // that window.
  const actionLockRef = useRef(false);

  // The banner is dismissible — but only the "experimental build" advisory
  // text is hidden. The mode controls keep rendering once probes settle.
  // We DON'T offer a way to re-show the advisory after dismissal because
  // it would clutter every reload.
  if (dismissed) return null;
  // Without a wallet the storage-mode banner is meaningless — the user
  // hasn't created/imported a wallet yet. Hide it during onboarding.
  if (!walletExists) return null;

  const probesPending = hasLegacyData === null || hasProfileData === null;
  // Whether each button should be shown
  const showMigrate = walletMode === 'legacy' && hasProfileData === false;
  const showSwitchToProfile = walletMode === 'legacy' && hasProfileData === true;
  const showSwitchToLegacy = walletMode === 'profile' && hasLegacyData === true;
  // Merge is offered in both legacy/profile when there's legacy data to copy.
  const showMerge =
    (walletMode === 'legacy' && hasProfileData === true) ||
    (walletMode === 'profile' && hasLegacyData === true);

  const anyActionRunning = activeAction !== null || isSwitchingMode;

  async function runWithGuard(
    action: 'migrate' | 'switch-profile' | 'switch-legacy' | 'merge' | 'refresh',
    op: () => Promise<void>,
  ) {
    // Synchronous double-click guard FIRST — closes the window where
    // two clicks fire before React applies `disabled` on the buttons.
    if (actionLockRef.current || anyActionRunning) return;
    actionLockRef.current = true;
    setActiveAction(action);
    try {
      await op();
      if (action !== 'refresh') {
        showToast(`Wallet ${actionLabel(action)} complete`, 'success');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`${actionLabel(action)} failed: ${msg}`, 'error', 8000);
    } finally {
      setActiveAction(null);
      actionLockRef.current = false;
    }
  }

  function handleMigrate() {
    void runWithGuard('migrate', () =>
      runLegacyToProfileMigration({ force: false }),
    );
  }

  function handleSwitchToProfile() {
    void runWithGuard('switch-profile', () => switchWalletMode('profile'));
  }

  function handleSwitchToLegacy() {
    void runWithGuard('switch-legacy', () => switchWalletMode('legacy'));
  }

  function handleMergeRequest() {
    // Open the confirmation modal — the actual merge happens after
    // confirm.
    setShowMergeConfirm(true);
  }

  function handleMergeConfirm() {
    setShowMergeConfirm(false);
    void runWithGuard('merge', () =>
      runLegacyToProfileMigration({ force: true }),
    );
  }

  function handleRefresh() {
    void runWithGuard('refresh', () => refreshDataProbes());
  }

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        className="relative flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-4 py-2 text-xs font-medium"
        style={{
          background: 'var(--color-brand-uxf-dim, rgba(34,197,94,0.08))',
          borderBottom: '1px solid var(--color-brand-uxf-border, rgba(34,197,94,0.30))',
          color: 'var(--color-brand-uxf, #22c55e)',
        }}
      >
        {/* Left cluster: status text + dismiss */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Database className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">
            <span className="font-semibold">Wallet storage:</span>{' '}
            {modeLabel(walletMode)}
            {probesPending && (
              <span className="ml-2 opacity-70">(checking stores…)</span>
            )}
          </span>
        </div>

        {/* Right cluster: action buttons + dismiss */}
        <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap justify-end">
          {showMigrate && (
            <ActionButton
              label={activeAction === 'migrate' ? 'Migrating…' : 'Migrate to UXF Profile'}
              tooltip={TOOLTIPS.migrate}
              variant="primary"
              loading={activeAction === 'migrate'}
              disabled={anyActionRunning}
              onClick={handleMigrate}
            />
          )}
          {showSwitchToProfile && (
            <ActionButton
              label={activeAction === 'switch-profile' ? 'Switching…' : 'Switch to UXF Profile'}
              tooltip={TOOLTIPS.switchToProfile}
              variant="secondary"
              loading={activeAction === 'switch-profile'}
              disabled={anyActionRunning}
              onClick={handleSwitchToProfile}
            />
          )}
          {showSwitchToLegacy && (
            <ActionButton
              label={activeAction === 'switch-legacy' ? 'Switching…' : 'Switch back to Legacy'}
              tooltip={TOOLTIPS.switchToLegacy}
              variant="secondary"
              loading={activeAction === 'switch-legacy'}
              disabled={anyActionRunning}
              onClick={handleSwitchToLegacy}
            />
          )}
          {showMerge && (
            <ActionButton
              label={activeAction === 'merge' ? 'Merging…' : 'Merge Legacy → UXF (overwrite)'}
              tooltip={TOOLTIPS.merge}
              variant="danger"
              loading={activeAction === 'merge'}
              disabled={anyActionRunning}
              onClick={handleMergeRequest}
            />
          )}
          {/* Refresh probes — always available. Tiny icon-only button. */}
          <button
            type="button"
            title={TOOLTIPS.refresh}
            aria-label="Re-check stores"
            onClick={handleRefresh}
            disabled={anyActionRunning}
            className="p-1 rounded-md text-[11px] transition-opacity opacity-70 hover:opacity-100 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: 'inherit' }}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${activeAction === 'refresh' ? 'animate-spin' : ''}`}
            />
          </button>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss UXF banner"
            className="p-0.5 rounded opacity-70 hover:opacity-100 transition-opacity"
            style={{ color: 'inherit' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showMergeConfirm && (
          <MergeConfirmModal
            onConfirm={handleMergeConfirm}
            onCancel={() => setShowMergeConfirm(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
