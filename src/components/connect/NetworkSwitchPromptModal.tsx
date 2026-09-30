import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { BaseModal, ModalHeader, Button } from '../wallet/ui';
import { useConnectContext, type NetworkSwitchAnswer, type PendingNetworkSwitch } from './ConnectContext';
import { isTestMoney } from '../../config/networkCapabilities';
import { INTENT_SETTLE_MS } from './settleWindow';

/**
 * The third Connect consent surface: "this site runs on another network, switch?".
 *
 * TRUST. Like ConnectionApprovalModal it names the TRANSPORT-VERIFIED origin, and
 * both network labels come from the offer, which evaluateSwitchOffer built from the
 * wallet's own network table. Nothing the peer sent is read here: a hostile origin
 * can declare mainnet's id under the name "Testnet", the offer has already resolved
 * that to what the id really is, and printing a peer string would undo it. The
 * entry does not even carry one.
 *
 * ANSWERS ONLY. It reports the checkbox in `suppressFuturePrompts` and never writes
 * the "do not ask again" record: the handler that owns the origin and the target
 * owns that write, so two writers can never diverge.
 */
export function NetworkSwitchPromptModal() {
  const { pendingNetworkSwitch, answerNetworkSwitch } = useConnectContext();
  if (!pendingNetworkSwitch) return null;
  // Keyed on the entry, so the checkbox and the half-way live-network step belong to ONE
  // prompt and are gone with it: one origin's tick can never carry onto the next.
  return (
    <NetworkSwitchPrompt
      key={pendingNetworkSwitch.id}
      pending={pendingNetworkSwitch}
      onAnswer={answerNetworkSwitch}
    />
  );
}

interface NetworkSwitchPromptProps {
  pending: PendingNetworkSwitch;
  onAnswer: (id: number, answer: NetworkSwitchAnswer) => void;
}

function NetworkSwitchPrompt({ pending, onAnswer }: NetworkSwitchPromptProps) {
  const { id, origin, offer } = pending;
  const { targetLabel, currentLabel } = offer;
  // The one gate between a click and real funds, so it must not rest on two fields of a
  // structural type staying in sync: either signal saying "real funds" is enough. An offer
  // that disagrees with itself (a hand-built fixture, a future refactor of
  // evaluateSwitchOffer) gets the confirmation rather than a one-click accept under a
  // correct-looking label, which is drawn from the target. Gating too often costs a click;
  // too seldom costs funds.
  //
  // BOTH signals come from the fail-closed test-money allowlist, never from a literal
  // network name: the offer's flag was computed from it, and the second asks it again about
  // the target itself. A network that list does not name is real money until it is listed.
  const needsLiveNetworkConfirmation = offer.movesRealFunds || !isTestMoney(offer.target);
  const [suppress, setSuppress] = useState(false);
  const [confirmingLiveNetwork, setConfirmingLiveNetwork] = useState(false);

  const accept = () => onAnswer(id, { accepted: true, suppressFuturePrompts: suppress });
  // The explicit "Not now": the only refusal that can carry a mute.
  const decline = () => onAnswer(id, { accepted: false, suppressFuturePrompts: suppress });
  // The close button and the backdrop. Still a refusal, but never a mute: a
  // persistent "never ask" must come from a deliberate click, not a stray one.
  // Failing to honour a tick asks again; honouring an accident hides the prompt
  // for good.
  const dismiss = () => onAnswer(id, { accepted: false, suppressFuturePrompts: false });

  const handleSwitch = () => {
    // A network whose money is real is the one target where a mistaken click moves real
    // funds, so accepting it takes a second, explicit confirmation.
    if (needsLiveNetworkConfirmation) setConfirmingLiveNetwork(true);
    else accept();
  };

  return (
    <BaseModal isOpen={true} onClose={dismiss}>
      <ModalHeader title="Switch network?" icon={ArrowLeftRight} onClose={dismiss} closeLabel="Close" />

      <div
        data-testid="network-switch-prompt"
        className="relative z-10 px-6 py-5 overflow-y-auto flex-1"
      >
        <p className="text-sm text-neutral-700 dark:text-white/80 mb-3">
          <span
            data-testid="network-switch-verified-origin"
            className="font-mono text-neutral-900 dark:text-white break-all"
          >
            {origin}
          </span>{' '}
          runs on <strong>{targetLabel}</strong>. Your wallet is on <strong>{currentLabel}</strong>.
        </p>

        <p className="text-xs text-neutral-500 dark:text-white/45 mb-4">
          Switching reloads Sphere and disconnects apps connected on {currentLabel}. Your wallet,
          keys and balances are not affected.
        </p>

        <label className="flex items-center gap-3 p-2.5 -mx-2.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-white/4 cursor-pointer">
          <input
            type="checkbox"
            checked={suppress}
            onChange={(e) => setSuppress(e.target.checked)}
            className="w-4 h-4 rounded accent-orange-500"
          />
          <span className="text-sm text-neutral-700 dark:text-white/65">Do not ask again for this site</span>
        </label>
      </div>

      <div className="relative z-10 px-6 py-4 border-t border-neutral-200/50 dark:border-white/8 shrink-0">
        {confirmingLiveNetwork ? (
          <LiveNetworkConfirmation
            targetLabel={targetLabel}
            onContinue={accept}
            onCancel={() => setConfirmingLiveNetwork(false)}
          />
        ) : (
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={decline}>
              Not now
            </Button>
            <Button variant="primary" fullWidth onClick={handleSwitch}>
              Switch to {targetLabel}
            </Button>
          </div>
        )}
      </div>
    </BaseModal>
  );
}

interface LiveNetworkConfirmationProps {
  targetLabel: string;
  onContinue: () => void;
  onCancel: () => void;
}

/**
 * The second step, REPLACING the buttons until confirmed. A component of its own
 * so the settle window is armed when the step is first PRESENTED: it swaps a fresh
 * Continue in under the cursor that just clicked "Switch to ...", and a double-tap
 * would otherwise walk through both steps as one. Same window and same reasoning as
 * the intent modals and SendModal's confirm step (settleWindow.ts). Cancel is never
 * held back: backing out is always safe.
 */
function LiveNetworkConfirmation({ targetLabel, onContinue, onCancel }: LiveNetworkConfirmationProps) {
  const [live, setLive] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setLive(true), INTENT_SETTLE_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      <div
        data-testid="network-switch-mainnet-confirm"
        role="alert"
        className="flex items-start gap-2 mb-3 p-3 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300"
      >
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <div className="text-xs">
          <strong>{targetLabel} is the live network.</strong> Transactions there move real funds.
        </div>
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" fullWidth onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" fullWidth disabled={!live} onClick={onContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
