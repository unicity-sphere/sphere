import { useState, useCallback } from 'react';
import { ShieldCheck, ShieldOff, Loader2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVaultSync } from '../../sdk/hooks';
import { HeaderTooltip } from './HeaderTooltip';

function formatLastSynced(ts: number | null): string {
  if (!ts) return '';
  const diffMs = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(ts).toLocaleDateString();
}

function getStatusText(enabled: boolean, status: string, lastSynced: number | null): string {
  if (!enabled) return 'Vault off';
  if (status === 'syncing') return 'Syncing…';
  if (status === 'error') return 'Retry sync';
  if (lastSynced) return 'Synced';
  return 'Sync now';
}

/**
 * Map a raw vault sync error (an SDK reason code or a transport message) to a
 * concrete human cause, so the header pill explains WHY rather than a bare
 * "Sync failed" the user can't act on.
 */
function describeVaultError(raw: string | null): string {
  const e = (raw ?? '').toLowerCase();
  if (!e) return 'Vault sync failed';
  if (e.includes('awaiting') || e.includes('initial-load') || e.includes('initial load'))
    return 'Vault backup starting — finishing first sync';
  if (e.includes('rollback') || e.includes('regress') || e.includes('baseline'))
    return 'Vault state mismatch (rollback protection)';
  if (
    e.includes('econnrefused') || e.includes('failed to fetch') || e.includes('networkerror') ||
    e.includes('network') || e.includes('fetch') || e.includes('timeout') || e.includes('timed out') ||
    e.includes('econn') || e.includes('enotfound') || e.includes('503') || e.includes('502')
  )
    return "Can't reach vault — is the store online?";
  if (e.includes('401') || e.includes('403') || e.includes('unauthor') || e.includes('auth'))
    return 'Vault sign-in failed';
  return `Vault sync failed: ${raw}`;
}

/**
 * VaultSyncIndicator — header status pill for the cloud Vault backup/sync.
 *
 * When the vault is ENABLED the pill is an ACTION: clicking it runs a sync — which
 * is the recovery path for an error (the old pill showed a dead "Vault: error" with
 * no recourse). While the wallet is offline/degraded a sync error is expected; one
 * tap retries. When the vault is OFF the pill is inert and the tooltip points to
 * Settings → Vault.
 */
export function VaultSyncIndicator() {
  const { enabled, status, lastSynced, lastError, triggerSync } = useVaultSync();
  const [retrying, setRetrying] = useState(false);

  const isSyncing = enabled && (status === 'syncing' || retrying);
  const isError = enabled && status === 'error' && !retrying;
  const statusText = getStatusText(enabled, retrying ? 'syncing' : status, lastSynced);
  const iconClass = 'w-4 h-4 sm:w-5 sm:h-5';

  const handleSync = useCallback(async () => {
    if (!enabled || isSyncing) return;
    setRetrying(true);
    try {
      await triggerSync();
    } catch {
      /* the error surfaces via the sync:provider event → status='error' */
    } finally {
      setRetrying(false);
    }
  }, [enabled, isSyncing, triggerSync]);

  const tooltip = !enabled
    ? 'Cloud backup off — configure in Settings → Vault'
    : isSyncing
      ? 'Syncing your vault…'
      : isError
        ? `${describeVaultError(lastError)} — click to retry`
        : lastSynced
          ? `Vault synced ${formatLastSynced(lastSynced)} — click to sync now`
          : 'Cloud backup & sync (Vault) — click to sync now';

  const icon = (
    <AnimatePresence mode="wait">
      {!enabled ? (
        <motion.div key="disabled" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}>
          <ShieldOff className={`${iconClass} text-neutral-400 dark:text-neutral-500`} />
        </motion.div>
      ) : isSyncing ? (
        <motion.div key="syncing" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}>
          <Loader2 className={`${iconClass} text-orange-500 animate-spin`} />
        </motion.div>
      ) : isError ? (
        <motion.div key="error" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }} className="relative">
          <ShieldAlert className={`${iconClass} text-red-400 dark:text-red-500`} />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
        </motion.div>
      ) : (
        <motion.div key="idle" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}>
          <ShieldCheck className={`${iconClass} ${lastSynced ? 'text-green-500/70 dark:text-green-400/70' : 'text-neutral-400 dark:text-neutral-500'}`} />
        </motion.div>
      )}
    </AnimatePresence>
  );

  const label = (
    <span className={`text-xs font-medium ${
      !enabled ? 'text-neutral-400 dark:text-neutral-500' :
      isError ? 'text-red-400 dark:text-red-500' :
      isSyncing ? 'text-orange-500' :
      lastSynced ? 'text-green-500/70 dark:text-green-400/70' :
      'text-neutral-400 dark:text-neutral-500'
    }`}>
      {statusText}
    </span>
  );

  const pillBase = 'relative flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-lg sm:rounded-xl';

  return (
    <HeaderTooltip label={tooltip}>
      {enabled ? (
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          aria-label={tooltip}
          className={`${pillBase} transition-colors hover:bg-neutral-100 dark:hover:bg-white/8 disabled:cursor-default`}
        >
          {icon}
          {label}
        </button>
      ) : (
        <span className={pillBase}>
          {icon}
          {label}
        </span>
      )}
    </HeaderTooltip>
  );
}
