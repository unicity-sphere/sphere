import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { UpgradeContext } from './UpgradeContext';
import { UpgradeModal } from './UpgradeModal';

export function UpgradeProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();

  const openUpgrade = useCallback((r?: string) => {
    setReason(r);
    setIsOpen(true);
  }, []);

  const value = useMemo(() => ({ openUpgrade }), [openUpgrade]);

  return (
    <UpgradeContext.Provider value={value}>
      {children}
      <UpgradeModal isOpen={isOpen} reason={reason} onClose={() => setIsOpen(false)} />
    </UpgradeContext.Provider>
  );
}
