import { createContext, useContext } from 'react';

export type UpgradeReason = 'quota' | 'expired' | 'settings';

export interface UpgradeContextValue {
  openUpgrade: (reason?: UpgradeReason) => void;
}

export const UpgradeContext = createContext<UpgradeContextValue | null>(null);

export function useUpgrade(): UpgradeContextValue {
  const ctx = useContext(UpgradeContext);
  if (!ctx) throw new Error('useUpgrade must be used within UpgradeProvider');
  return ctx;
}
