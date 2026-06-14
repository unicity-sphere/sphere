import { useState, useEffect, useCallback } from 'react';
import { useSphereContext } from './useSphere';

/**
 * The vault token-storage provider's id, as registered by the SDK
 * (`RemoteTokenStorageProvider.id` / `VAULT_PROVIDER_ID`). Used to filter the
 * per-provider `sync:provider` / `sync:remote-update` events so this hook
 * reflects the VAULT specifically, not the IPFS provider.
 */
const VAULT_PROVIDER_ID = 'remote-token-storage';

export type VaultSyncStatus = 'idle' | 'syncing' | 'error';

export interface VaultSyncState {
  status: VaultSyncStatus;
  /** ms timestamp of the last successful vault sync, or null. */
  lastSynced: number | null;
  lastError: string | null;
}

export interface UseVaultSyncReturn extends VaultSyncState {
  /** Whether the wallet is currently configured to use a cloud vault. */
  enabled: boolean;
  triggerSync: () => Promise<void>;
}

/**
 * useVaultSync — tracks the cloud Vault backup/sync status by subscribing to the
 * SDK's storage/sync events. `enabled` is derived from whether a vault provider
 * is actually wired into the running Sphere instance, so it stays truthful even
 * if the persisted setting and the live instance disagree (e.g. before reload).
 */
export function useVaultSync(): UseVaultSyncReturn {
  const { sphere } = useSphereContext();
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<VaultSyncState>({
    status: 'idle',
    lastSynced: null,
    lastError: null,
  });

  useEffect(() => {
    if (!sphere) {
      setEnabled(false);
      return;
    }

    // Is a vault provider actually registered on this instance? The SDK keys the
    // provider Map by id, and the vault registers under VAULT_PROVIDER_ID.
    try {
      setEnabled(sphere.getTokenStorageProviders().has(VAULT_PROVIDER_ID));
    } catch {
      setEnabled(false);
    }

    const handleSyncStarted = () => {
      setState((prev) => ({ ...prev, status: 'syncing', lastError: null }));
    };

    // Per-provider result — the authoritative signal for the vault specifically.
    const handleSyncProvider = (data: {
      providerId: string;
      success: boolean;
      error?: string;
    }) => {
      if (data.providerId !== VAULT_PROVIDER_ID) return;
      setEnabled(true);
      if (data.success) {
        setState((prev) => ({ ...prev, status: 'idle', lastSynced: Date.now(), lastError: null }));
      } else {
        setState((prev) => ({ ...prev, status: 'error', lastError: data.error ?? 'Sync failed' }));
      }
    };

    const handleRemoteUpdate = (data: { providerId: string }) => {
      if (data.providerId !== VAULT_PROVIDER_ID) return;
      setEnabled(true);
      setState((prev) => ({ ...prev, lastSynced: Date.now() }));
    };

    // Global sync completion clears a transient "syncing" if no provider error
    // arrived; harmless when the vault is off.
    const handleSyncCompleted = () => {
      setState((prev) => (prev.status === 'syncing' ? { ...prev, status: 'idle' } : prev));
    };

    // Vault status is provider-SPECIFIC. We deliberately do NOT subscribe to the GLOBAL
    // 'sync:error' event: it fires for ANY provider (e.g. IPFS), so honouring it would
    // mislabel the VAULT as failed when an UNRELATED provider errors — e.g. right after
    // toggling IPFS off. The vault's OWN failures arrive via the provider-filtered
    // 'sync:provider' (success:false) handler above.
    sphere.on('sync:started', handleSyncStarted);
    sphere.on('sync:provider', handleSyncProvider);
    sphere.on('sync:remote-update', handleRemoteUpdate);
    sphere.on('sync:completed', handleSyncCompleted);

    return () => {
      sphere.off('sync:started', handleSyncStarted);
      sphere.off('sync:provider', handleSyncProvider);
      sphere.off('sync:remote-update', handleRemoteUpdate);
      sphere.off('sync:completed', handleSyncCompleted);
    };
  }, [sphere]);

  const triggerSync = useCallback(async () => {
    if (!sphere) return;
    await sphere.sync();
  }, [sphere]);

  return { ...state, enabled, triggerSync };
}
