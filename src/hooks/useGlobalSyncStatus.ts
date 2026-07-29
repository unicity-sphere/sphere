/**
 * useGlobalSyncStatus - Provides sync status for UI components
 *
 * Assets ride wallet-api, which has no user-visible sync phase, so this always
 * reports idle. Kept for API compatibility with LogoutConfirmModal and
 * DeleteConfirmationModal.
 */

export interface GlobalSyncStatus {
  isAnySyncing: boolean;
  statusMessage: string;
}

export function useGlobalSyncStatus(): GlobalSyncStatus {
  return {
    isAnySyncing: false,
    statusMessage: 'All data synced',
  };
}
