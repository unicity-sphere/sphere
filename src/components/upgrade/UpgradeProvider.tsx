import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { UpgradeContext, type UpgradeReason } from './UpgradeContext';
import { PlanScreen } from './PlanScreen';
import { PlanDowngradeWatcher } from './PlanDowngradeWatcher';
import { FreePlanEntryWatcher } from './FreePlanEntryWatcher';
import { AddressKeyPromptModal } from '../subscription/AddressKeyPromptModal';

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
      <FreePlanEntryWatcher openUpgrade={openUpgrade} />
      <AddressKeyPromptModal />
      {/* Same component onboarding renders — here in its dialog mode. */}
      <PlanScreen isOpen={isOpen} reason={reason} onClose={() => setIsOpen(false)} />
    </UpgradeContext.Provider>
  );
}
