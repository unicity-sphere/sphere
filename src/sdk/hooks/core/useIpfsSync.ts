import { useState, useEffect, useCallback } from 'react';
import { useSphereContext } from './useSphere';

export type IpfsSyncStatus = 'idle' | 'syncing' | 'error';

export interface IpfsSyncState {
  status: IpfsSyncStatus;
  lastSynced: number | null;
  lastError: string | null;
  lastRemoteUpdate: {
    cid: string;
    added: number;
    removed: number;
  } | null;
}

export interface UseIpfsSyncReturn extends IpfsSyncState {
  triggerSync: () => Promise<void>;
}

export function useIpfsSync(): UseIpfsSyncReturn {
  const { adapter } = useSphereContext();
  const [state, setState] = useState<IpfsSyncState>({
    status: 'idle',
    lastSynced: null,
    lastError: null,
    lastRemoteUpdate: null,
  });

  useEffect(() => {
    if (!adapter) return;

    const handleSyncStarted = () => {
      setState(prev => ({ ...prev, status: 'syncing', lastError: null }));
    };

    const handleSyncCompleted = () => {
      setState(prev => ({
        ...prev,
        status: 'idle',
        lastSynced: Date.now(),
        lastError: null,
      }));
    };

    const handleSyncError = (data: { source: string; error: string }) => {
      setState(prev => ({
        ...prev,
        status: 'error',
        lastError: data.error,
      }));
    };

    const handleRemoteUpdate = (data: {
      providerId: string;
      cid: string;
      added: number;
      removed: number;
    }) => {
      setState(prev => ({
        ...prev,
        lastSynced: Date.now(),
        lastRemoteUpdate: {
          cid: data.cid,
          added: data.added,
          removed: data.removed,
        },
      }));
    };

    adapter.on('sync:started', handleSyncStarted as (data?: unknown) => void);
    adapter.on('sync:completed', handleSyncCompleted);
    adapter.on('sync:error', handleSyncError as (data?: unknown) => void);
    adapter.on('sync:remote-update', handleRemoteUpdate as (data?: unknown) => void);

    return () => {
      adapter.off('sync:started', handleSyncStarted as (data?: unknown) => void);
      adapter.off('sync:completed', handleSyncCompleted);
      adapter.off('sync:error', handleSyncError as (data?: unknown) => void);
      adapter.off('sync:remote-update', handleRemoteUpdate as (data?: unknown) => void);
    };
  }, [adapter]);

  const triggerSync = useCallback(async () => {
    if (!adapter) return;
    await adapter.sync();
  }, [adapter]);

  return { ...state, triggerSync };
}
