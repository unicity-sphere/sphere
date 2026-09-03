/**
 * Onboarding's plan step. Shown after wallet creation/restore, before entering
 * the wallet.
 *
 * Deliberately thin: the plan line-up, the purchase steps and the decline are
 * ONE component (PlanScreen) shared with Settings → Subscription, the quota /
 * expiry prompts and the free-plan offer on wallet entry (sphere#496). This
 * file only supplies the onboarding framing — which plan was just provisioned,
 * whether it was created or restored, and what "continue" means here.
 */
import { useEffect } from 'react';
import { PlanScreen } from '../../../upgrade/PlanScreen';
import { markFreePlanEntryOffered } from '../../../upgrade/freePlanEntryOffer';

interface PlanCapabilitiesScreenProps {
  /** Plan NAME provisioned during finalize (header fallback until utilization loads). */
  planName: string | null;
  created: boolean;
  onContinue: () => void;
  isBusy?: boolean;
}

export function PlanCapabilitiesScreen({ planName, created, onContinue, isBusy }: PlanCapabilitiesScreenProps) {
  // Onboarding IS this app load's plan offer. Without claiming it, declining
  // here finalizes the wallet, walletExists flips, and FreePlanEntryWatcher
  // immediately reopens the very same screen as a dialog — one click after
  // the user said no.
  useEffect(() => {
    markFreePlanEntryOffered();
  }, []);

  return (
    <PlanScreen
      isOpen
      // Onboarding has no dismissal: every exit — declining, finishing a
      // purchase — is entering the wallet.
      onClose={onContinue}
      onboarding={{ planName, created, isBusy, onContinue }}
    />
  );
}
