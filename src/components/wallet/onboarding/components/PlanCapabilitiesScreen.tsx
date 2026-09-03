/**
 * Onboarding's plan step. Shown after wallet creation/restore, before entering
 * the wallet.
 *
 * Deliberately thin: the plan line-up, the purchase steps and the decline are
 * ONE component (PlanScreen) shared with Settings → Subscription and the quota
 * / expiry prompts (sphere#496). This file only supplies the onboarding
 * framing — which plan was just provisioned, whether it was created or
 * restored, and what "continue" means here.
 */
import { PlanScreen } from '../../../upgrade/PlanScreen';

interface PlanCapabilitiesScreenProps {
  /** Plan NAME provisioned during finalize (header fallback until utilization loads). */
  planName: string | null;
  created: boolean;
  onContinue: () => void;
  isBusy?: boolean;
}

export function PlanCapabilitiesScreen({ planName, created, onContinue, isBusy }: PlanCapabilitiesScreenProps) {
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
