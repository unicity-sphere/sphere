import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { UpgradeContext, type UpgradeReason } from './UpgradeContext';
import { UpgradeModal } from './UpgradeModal';
import { PlanDowngradeWatcher } from './PlanDowngradeWatcher';

export function UpgradeProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<UpgradeReason | undefined>();

  const openUpgrade = useCallback((r?: UpgradeReason) => {
    setReason(r);
    setIsOpen(true);
  }, []);

  const value = useMemo(() => ({ openUpgrade }), [openUpgrade]);

  return (
    <UpgradeContext.Provider value={value}>
      {children}
      <PlanDowngradeWatcher openUpgrade={openUpgrade} />
      <UpgradeModal isOpen={isOpen} reason={reason} onClose={() => setIsOpen(false)} />
    </UpgradeContext.Provider>
  );
}
