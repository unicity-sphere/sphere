import { useEffect, useState } from 'react';
import { ArrowLeftRight, ArrowRight } from 'lucide-react';
import { NETWORKS, type NetworkType } from '@unicitylabs/sphere-sdk';
import {
  AlertMessage, BaseModal, Button, DetailRow, DetailsDisclosure, ModalHeader, NetworkTile, networkMoneyLabel,
} from '../wallet/ui';
import { useConnectContext, type NetworkSwitchAnswer, type PendingNetworkSwitch } from './ConnectContext';
import { VerifiedOrigin } from './VerifiedOrigin';
import { SPHERE_NETWORK } from '../../config/network';
import { isTestMoney } from '../../config/networkCapabilities';
import type { SwitchOffer } from './networkSwitchOffer';
import { INTENT_SETTLE_MS } from './settleWindow';

/**
 * The third Connect consent surface: "this site runs on another network, switch?".
 *
 * ONE QUESTION PER SCREEN. The verified origin is the subject of that question and the single
 * consequence is its predicate; the two network tiles carry the answer the eye needs before any
 * word is read, because colour here says what kind of money a network holds. Everything the user
 * is not being asked — the reload, the per-network approvals, the numeric ids — sits behind the
 * disclosure, which holds exactly the things that are not the question.
 *
 * TRUST. Like ConnectionApprovalModal it names the TRANSPORT-VERIFIED origin, and both network
 * labels come from the offer, which evaluateSwitchOffer built from the wallet's own network
 * table. Nothing the peer sent is read here: a hostile origin can declare mainnet's id under the
 * name "Testnet", the offer has already resolved that to what the id really is, and printing a
 * peer string would undo it. The entry does not even carry one. The COLOURS need the two
 * NetworkType ids rather than the labels: the target's is `offer.target`, and the current one is
 * SPHERE_NETWORK — the same value the offer built `currentLabel` from, so colour and label agree
 * by construction.
 *
 * ANSWERS ONLY. It reports the checkbox in `suppressFuturePrompts` and never writes the "do not
 * ask again" record: the handler that owns the origin and the target owns that write, so two
 * writers can never diverge.
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
      <ModalHeader
        title="Switch network?"
        icon={ArrowLeftRight}
        iconVariant="gradient"
        onClose={dismiss}
        closeLabel="Close"
      />

      {/* The testid encloses BOTH steps: it is the "a prompt is open" probe for the queue and
          unmute suites, and that must not go false halfway through the prompt. */}
      <div data-testid="network-switch-prompt" className="relative z-10 flex-1 min-h-0 flex flex-col">
        {confirmingLiveNetwork ? (
          <LiveNetworkStep
            key="live"
            origin={origin}
            target={offer.target}
            targetLabel={targetLabel}
            muting={suppress}
            onContinue={accept}
            onCancel={() => setConfirmingLiveNetwork(false)}
          />
        ) : (
          <SwitchOfferStep
            key="offer"
            origin={origin}
            offer={offer}
            targetLabel={targetLabel}
            currentLabel={currentLabel}
            suppress={suppress}
            onSuppressChange={setSuppress}
            onDecline={decline}
            onSwitch={handleSwitch}
          />
        )}
      </div>
    </BaseModal>
  );
}

interface SwitchOfferStepProps {
  origin: string;
  offer: Extract<SwitchOffer, { kind: 'offer' }>;
  targetLabel: string;
  currentLabel: string;
  suppress: boolean;
  onSuppressChange: (next: boolean) => void;
  onDecline: () => void;
  onSwitch: () => void;
}

function SwitchOfferStep({
  origin, offer, targetLabel, currentLabel, suppress, onSuppressChange, onDecline, onSwitch,
}: SwitchOfferStepProps) {
  return (
    <>
      {/* min-h-full on the CHILD plus justify-center: centred while the content is short, growing
          and scrolling once it is not. justify-center on the scroll container itself clips the top
          of overflowing content. Nothing is added to fill the full-height sheet on a phone — it is
          filled by centring and by letting the network pair take the room it deserves. */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col justify-center gap-6 px-6 py-6">
          <div className="text-center space-y-1.5">
            <VerifiedOrigin origin={origin} testId="network-switch-verified-origin" size="md" />
            <p className="text-base text-neutral-700 dark:text-white/80">
              wants to move your wallet to another network.
            </p>
          </div>

          <NetworkChange
            from={SPHERE_NETWORK}
            fromLabel={currentLabel}
            to={offer.target}
            toLabel={targetLabel}
          />

          <div>
            <DetailsDisclosure label="What happens when you switch" testId="network-switch-details">
              <DetailRow label="Connections">
                Sphere reloads, and every site connected on {currentLabel} is disconnected.
              </DetailRow>
              <DetailRow label="Your wallet">
                Your keys, recovery phrase and balances are untouched. Each network keeps its own
                assets and history.
              </DetailRow>
              <DetailRow label="Approvals">
                Permissions are per network, so sites you approved on {currentLabel} will ask again
                on {targetLabel}.
              </DetailRow>
              <DetailRow label="Network ids" mono>
                {describeNetworkId(currentLabel, SPHERE_NETWORK)}{' '}
                {describeNetworkId(targetLabel, offer.target)}
              </DetailRow>
              <DetailRow label="Do not ask again">
                Applies to this site and to {targetLabel} only. You can undo it in Connected Sites.
              </DetailRow>
            </DetailsDisclosure>

            {/* The same bordered stack as the disclosure above it, so the mute reads as the
                deliberate act it has to be. */}
            <label className="flex items-center gap-3 py-3 cursor-pointer border-t border-neutral-200/60 dark:border-white/8">
              <input
                type="checkbox"
                checked={suppress}
                onChange={(e) => onSuppressChange(e.target.checked)}
                className="w-4 h-4 rounded accent-orange-500"
              />
              <span className="text-sm text-neutral-700 dark:text-white/65">
                Do not ask again for this site
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-neutral-200/50 dark:border-white/8 shrink-0 flex gap-3">
        <Button variant="secondary" fullWidth onClick={onDecline}>
          Not now
        </Button>
        <Button variant="primary" fullWidth onClick={onSwitch}>
          Switch to {targetLabel}
        </Button>
      </div>
    </>
  );
}

/**
 * One side of the "Network ids" line.
 *
 * Indexed defensively on purpose. A target the wallet's table does not list is a REAL case, not a
 * malformed fixture — it is the case `isTestMoney` fails closed for, and `evaluateSwitchOffer`
 * can hand one through. JSX evaluates children eagerly, so a bare `NETWORKS[x].networkId` throws
 * while the disclosure is still closed and takes the whole prompt down with it. A consent screen
 * must not be able to crash on the network it is warning you about.
 */
function describeNetworkId(label: string, network: NetworkType): string {
  const id = NETWORKS[network]?.networkId;
  return id === undefined ? `${label} is not in this wallet's network table.` : `${label} is network ${id}.`;
}

function NetworkChange({ from, fromLabel, to, toLabel }: {
  from: NetworkType; fromLabel: string; to: NetworkType; toLabel: string;
}) {
  return (
    <div className="flex items-stretch gap-3">
      <NetworkCell network={from} label={fromLabel} />
      <ArrowRight className="w-5 h-5 self-center shrink-0 text-neutral-300 dark:text-white/25" />
      <NetworkCell network={to} label={toLabel} emphasis />
    </div>
  );
}

function NetworkCell({ network, label, emphasis = false }: {
  network: NetworkType; label: string; emphasis?: boolean;
}) {
  return (
    <div
      className={`flex-1 min-w-0 flex flex-col items-center gap-2 rounded-2xl px-3 py-4 ${
        emphasis
          ? 'bg-neutral-50 dark:bg-white/6 ring-1 ring-neutral-200 dark:ring-white/10'
          : 'bg-neutral-50/60 dark:bg-white/3'
      }`}
    >
      <NetworkTile network={network} size="md" />
      <div className="text-center min-w-0">
        <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{label}</p>
        <p
          className={`text-[11px] font-medium ${
            isTestMoney(network)
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {networkMoneyLabel(network)}
        </p>
      </div>
    </div>
  );
}

interface LiveNetworkStepProps {
  origin: string;
  target: NetworkType;
  targetLabel: string;
  muting: boolean;
  onContinue: () => void;
  onCancel: () => void;
}

/**
 * The second step, replacing the WHOLE body rather than only the buttons: one question on screen
 * at a time, and the warning arrives with its question instead of after the click that chose it.
 *
 * A component of its own so the settle window is armed when the step is first PRESENTED: it swaps
 * a fresh Continue in under the cursor that just clicked "Switch to ...", and a double-tap would
 * otherwise walk through both steps as one. Same window and same reasoning as the intent modals
 * and SendModal's confirm step (settleWindow.ts). Cancel is never held back: backing out is
 * always safe.
 *
 * The tile is emerald because emerald means real money on a network tile; the alert stays amber
 * because an alert is a different axis, and painting the one gate between a click and real funds
 * in the wallet's "good" colour would drain the alarm.
 */
function LiveNetworkStep({ origin, target, targetLabel, muting, onContinue, onCancel }: LiveNetworkStepProps) {
  const [live, setLive] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setLive(true), INTENT_SETTLE_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col justify-center gap-5 px-6 py-6">
          <VerifiedOrigin
            origin={origin}
            testId="network-switch-verified-origin"
            size="md"
            className="text-center"
          />

          <div className="flex flex-col items-center gap-2">
            <NetworkTile network={target} size="lg" />
            <p className="text-lg font-semibold text-neutral-900 dark:text-white">{targetLabel}</p>
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {networkMoneyLabel(target)}
            </p>
          </div>

          {/* AlertMessage forwards no data-testid, so it lives on this wrapper, which also carries
              role="alert". The sentence inside is byte-identical to the one it replaces: the
              wording of the one gate between a click and real funds does not get churned. */}
          <div data-testid="network-switch-mainnet-confirm" role="alert">
            <AlertMessage variant="warning">
              <strong>{targetLabel} is the live network.</strong> Transactions there move real funds.
            </AlertMessage>
          </div>

          {/* Read-only, and shown because hiding a ticked box and then acting on it would be sneaky. */}
          {muting && (
            <p className="text-xs text-center text-neutral-500 dark:text-white/45">
              You will not be asked again for this site.
            </p>
          )}
        </div>
      </div>

      <div className="px-6 py-4 border-t border-neutral-200/50 dark:border-white/8 shrink-0 flex gap-3">
        <Button variant="secondary" fullWidth onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" fullWidth disabled={!live} onClick={onContinue}>
          Continue
        </Button>
      </div>
    </>
  );
}
