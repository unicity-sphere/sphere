import { useRef, useState } from 'react';
import { Coins } from 'lucide-react';
import { ERROR_CODES } from '@unicitylabs/sphere-sdk/connect';
import { TokenRegistry, formatAmount } from '@unicitylabs/sphere-sdk';
import { BaseModal, ModalHeader, Button } from '../wallet/ui';
import { useConnectContext } from './ConnectContext';
import { getPayments } from '../../sdk/payments';
import { getErrorMessage } from '../../sdk/errors';
import { useSphereContext } from '../../sdk';

/**
 * The refusal for a mint that failed AFTER it was journaled. The wallet resumes a
 * journaled mint, so it may still complete — the dApp is told that, and given the
 * token id to reconcile against rather than asking again.
 */
function journaledMintMessage(tokenId: string, error: string | undefined): string {
  const reason = error ? ` (${error})` : '';
  return `The mint has not finished${reason}, but it may still complete: this wallet resumes it. Token ID: ${tokenId}`;
}

/**
 * The refusal for a mint that THREW instead of answering. Nothing says whether it was
 * journaled before it threw, and a journaled mint resumes on its own, so its outcome is
 * unknown — and asking again could mint twice.
 */
function unknownMintMessage(error: string): string {
  return `The mint may have started and may still complete (${error}). Check this wallet's balance before trying again.`;
}

/** This intent's mint: whether it runs, and whether it has already settled the intent. */
interface MintRun {
  running: boolean;
  settled: boolean;
  error: string | null;
}

const IDLE: MintRun = { running: false, settled: false, error: null };

interface MintIntentModalProps {
  intentId: number;
  coinId: string;
  amount: string;
  subscriptionKeyReady: boolean;
  onCancel: () => void;
}

/**
 * The coin `mint` confirmation: self-mint a fungible token to the user's own wallet.
 * Render it keyed by the intent: the one-mint guard below holds for one intent.
 */
export function MintIntentModal({ intentId, coinId, amount, subscriptionKeyReady, onCancel }: MintIntentModalProps) {
  const { resolveIntent, rejectIntent } = useConnectContext();
  const { sphere } = useSphereContext();
  const [run, setRun] = useState<MintRun>(IDLE);
  // Set before the mint's first await: one mint per intent, whatever lands before a re-render.
  const mintStarted = useRef(false);

  // Once the mint runs, "the user declined" is no longer a true answer — the tokens may
  // be minted either way — so nothing here can settle the intent a second time.
  const locked = run.running || run.settled;
  const close = locked ? () => {} : onCancel;

  const handleMint = async () => {
    if (mintStarted.current) return;
    setRun(IDLE);
    const payments = getPayments(sphere);
    if (!payments) {
      setRun({ ...IDLE, error: 'Wallet not available' });
      return;
    }
    // Validate params before touching the engine (fail fast with INVALID_PARAMS).
    if (typeof coinId !== 'string' || !/^([0-9a-f]{2})+$/.test(coinId)) {
      rejectIntent(intentId, ERROR_CODES.INVALID_PARAMS, 'coinId must be lowercase even-length hex');
      return;
    }
    let amountBig: bigint;
    try {
      amountBig = BigInt(amount);
    } catch {
      rejectIntent(intentId, ERROR_CODES.INVALID_PARAMS, 'amount must be an integer string');
      return;
    }
    if (amountBig <= 0n) {
      rejectIntent(intentId, ERROR_CODES.INVALID_PARAMS, 'amount must be greater than zero');
      return;
    }
    // Mint is a certification_request — refuse until the subscription key is on
    // the oracle (else it 401s in the provisioning window). Reject gracefully.
    if (!subscriptionKeyReady) {
      rejectIntent(intentId, ERROR_CODES.INTERNAL_ERROR, 'Subscription is still being set up — try again in a moment');
      return;
    }

    mintStarted.current = true;
    setRun({ running: true, settled: false, error: null });
    try {
      const result = await payments.mint(coinId, amountBig);
      if (result.success) {
        resolveIntent(intentId, { tokenId: result.tokenId, coinId, amount });
      } else if (result.tokenId !== undefined) {
        // Journaled before it failed: the wallet resumes it, so it may still complete.
        rejectIntent(
          intentId,
          ERROR_CODES.INTERNAL_ERROR,
          journaledMintMessage(result.tokenId, result.error),
          { tokenId: result.tokenId },
        );
      } else {
        // Refused before anything was journaled: nothing started, so the dApp may ask again.
        rejectIntent(intentId, ERROR_CODES.INTERNAL_ERROR, result.error ?? 'Mint failed');
      }
      setRun({ running: false, settled: true, error: null });
    } catch (err) {
      // A throw is not an answer: the mint may have been journaled before it threw, and
      // a journaled mint resumes by itself. So the outcome is unknown — settled now, and
      // never offered again, because a retry could mint twice.
      const message = unknownMintMessage(getErrorMessage(err));
      rejectIntent(intentId, ERROR_CODES.INTENT_OUTCOME_UNKNOWN, message);
      setRun({ running: false, settled: true, error: message });
    }
  };

  // Resolve registry metadata for a friendlier confirmation (icon + symbol +
  // human-readable amount), falling back to the raw values when the coin is
  // unknown. Display-only — the actual mint uses the raw coinId/amount.
  const registry = TokenRegistry.getInstance();
  const def = typeof coinId === 'string' ? registry.getDefinition(coinId) : undefined;
  const iconUrl = def ? registry.getIconUrl(coinId) : null;
  const displayAmount =
    def?.symbol && def.decimals != null && /^\d+$/.test(String(amount))
      ? formatAmount(amount, { decimals: def.decimals, symbol: def.symbol, maxFractionDigits: 8 })
      : null;

  return (
    <BaseModal isOpen={true} onClose={close}>
      <ModalHeader title="Mint Tokens" icon={Coins} onClose={close} closeDisabled={locked} />

      <div className="px-6 py-5 flex-1 flex flex-col justify-center">
        <div className="bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-5 mb-5 border border-neutral-200 dark:border-white/10">
          <div className="text-sm text-neutral-500 mb-4">
            This dApp is asking to mint tokens{' '}
            <span className="text-neutral-900 dark:text-white font-medium">to your own wallet</span>.
          </div>

          <div className="flex items-center gap-3 mb-3">
            {iconUrl && (
              <img src={iconUrl} alt="" className="w-9 h-9 rounded-full shrink-0" />
            )}
            <span className="text-2xl font-semibold text-neutral-900 dark:text-white break-all">
              {displayAmount ?? amount}
            </span>
          </div>

          <div className="text-[11px] text-neutral-400 break-all">
            <span className="text-neutral-500 dark:text-neutral-400">Coin ID:</span>{' '}
            <span className="font-mono">{coinId}</span>
            {!def && (
              <div className="mt-1 text-amber-600 dark:text-amber-500">
                Unrecognized coin — verify the ID before approving
              </div>
            )}
          </div>
        </div>

        {run.error && (
          <div className="text-red-500 text-sm mb-3 text-center">{run.error}</div>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onCancel} disabled={locked}>
            Cancel
          </Button>
          <Button variant="primary" fullWidth disabled={locked} onClick={handleMint}>
            {run.running ? 'Minting…' : 'Mint'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}
