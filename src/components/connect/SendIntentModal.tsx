import { useState } from 'react';
import { Send } from 'lucide-react';
import { TokenRegistry, formatAmount } from '@unicitylabs/sphere-sdk';
import type { TransferResult } from '@unicitylabs/sphere-sdk';
import { useAssets, useTransfer } from '../../sdk';
import { getErrorMessage, isKeepOpenPendingResult } from '../../sdk/errors';
import { QuotaBlockedError } from '../../sdk/quotaGate';
import { useUpgrade } from '../upgrade';
import { showToast } from '../ui/toast-utils';
import { IntentConfirmModal } from './IntentConfirmModal';
import { sendIntentRecipient } from './duplicateSendGuard';

interface SendIntentModalProps {
  /** Recipient: Unicity ID (@tag) or DIRECT:// address, as supplied by the dApp. */
  to: string;
  /** Amount in BASE UNITS (smallest indivisible unit) — integer string. */
  amount: string;
  /** Token coinId (lowercase even-length hex). */
  coinId: string;
  memo?: string;
  /** Called after the transfer succeeds (resolves the intent with the result). */
  onResolve: (result: TransferResult) => void;
  /** Called when the transfer fails (rejects the intent with the message). */
  onReject: (message: string) => void;
  /** Called when the user cancels (rejects the intent). */
  onCancel: () => void;
}

/**
 * Confirm-only modal for the Connect `send` intent. The dApp specifies the
 * recipient, coin and amount (in base units); the user approves or rejects — the
 * amount is NOT editable here (a different amount = a different dApp request).
 * The base-unit amount is handed to the SDK verbatim; `formatAmount` is used only
 * to render a human-readable figure for review. A failed transfer rejects the
 * intent (the dApp is told) rather than leaving it hanging.
 */
export function SendIntentModal({ to, amount, coinId, memo, onResolve, onReject, onCancel }: SendIntentModalProps) {
  const { assets } = useAssets();
  const { transfer } = useTransfer();
  const { openUpgrade } = useUpgrade();
  const [busy, setBusy] = useState(false);

  // Prefer the held asset (gives balance); fall back to the registry for
  // metadata when the coin isn't held, so we can still display it sensibly.
  const asset = assets.find((a) => a.coinId === coinId);
  const registry = TokenRegistry.getInstance();
  const def = registry.getDefinition(coinId);
  const decimals = asset?.decimals ?? def?.decimals ?? 0;
  const symbol = asset?.symbol ?? def?.symbol ?? '';
  const iconUrl = asset?.iconUrl ?? (def ? registry.getIconUrl(coinId) : null) ?? undefined;

  // `amount` is validated as a positive integer (base units) before this renders.
  const amountBig = BigInt(amount);
  const held = asset ? BigInt(asset.totalAmount) : 0n;
  const insufficient = amountBig > held;

  const displayAmount = formatAmount(amount, { decimals, symbol, maxFractionDigits: 8 });

  const handleSend = async () => {
    setBusy(true);
    try {
      // Shared with the duplicate-send guard, so the identifier this modal
      // spends against is the identifier the guard resolved and matched.
      const recipient = sendIntentRecipient(to);
      const result = await transfer({ coinId, amount, recipient, ...(memo ? { memo } : {}) });
      // #433: a deliveryPending result means the spend certified on-chain but the
      // recipient-side delivery is journaled for retry (§3.1). The dApp learns it
      // via the intent result; this modal unmounts on resolve, so the wallet-side
      // signal has to be a toast (SendModal's equivalent is its pending screen).
      // A keep-open outcome (useTransfer's synthetic pending result for
      // PENDING_COMMIT_CODES) gets the honest "network busy" copy instead —
      // sphere-sdk 0.14 converges the SAME transfer in-session; it must never
      // read as something to re-send.
      if (isKeepOpenPendingResult(result)) {
        showToast(
          'Network is busy — your transfer is safe and will complete automatically.',
          'info',
          8000,
        );
      } else if (result.deliveryPending) {
        showToast(
          'Sent — delivery to the recipient is pending and will retry automatically.',
          'info',
          8000,
        );
      }
      onResolve(result);
    } catch (err) {
      // Proactive quota block (useTransfer's mutationFn, Task 3) does NOT open
      // the Upgrade modal itself — that only happens on the reactive
      // CERTIFICATION_UNCONFIRMED 429/401 branch (Task 4). This modal unmounts
      // as soon as onReject resolves the intent, so — unlike SendModal, which
      // stays on its confirm step and lets the user click an Upgrade button —
      // there's no lingering UI here to host that CTA. Open it directly so the
      // dApp user still gets an upgrade path, mirroring SendModal's intent
      // without double-opening (the hook never opens it on this path).
      if (err instanceof QuotaBlockedError) {
        openUpgrade(err.reason === 'expired' ? 'expired' : 'quota');
        onReject(
          err.reason === 'expired'
            ? 'Wallet subscription expired'
            : 'Wallet subscription quota exceeded'
        );
        return;
      }
      // Tell the dApp it failed instead of leaving the request hanging; the
      // wallet's global query handler also surfaces a toast.
      onReject(getErrorMessage(err));
    }
  };

  return (
    <IntentConfirmModal
      title="Send Tokens"
      icon={Send}
      busy={busy}
      confirmLabel="Send"
      busyLabel="Sending…"
      confirmDisabled={insufficient}
      onConfirm={handleSend}
      onCancel={onCancel}
    >
      <div className="bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-5 mb-5 border border-neutral-200 dark:border-white/10">
        <div className="text-sm text-neutral-500 mb-4">
          This dApp is asking to send tokens from your wallet.
        </div>

        <div className="flex items-center gap-3 mb-3">
          {iconUrl && <img src={iconUrl} alt="" className="w-9 h-9 rounded-full shrink-0" />}
          <span className="text-2xl font-semibold text-neutral-900 dark:text-white break-all">
            {displayAmount}
          </span>
        </div>

        <div className="text-[11px] text-neutral-400 break-all mb-1">
          <span className="text-neutral-500 dark:text-neutral-400">To:</span>{' '}
          <span className="font-mono">{to}</span>
        </div>

        {memo && (
          <div className="text-sm text-neutral-500 dark:text-white/45 italic mt-2">&ldquo;{memo}&rdquo;</div>
        )}

        {insufficient && (
          <div className="mt-3 text-amber-600 dark:text-amber-500 text-xs break-all">
            {asset
              ? `Insufficient balance — you have ${formatAmount(asset.totalAmount, { decimals, symbol, maxFractionDigits: 8 })}`
              : "You don't hold this token"}
          </div>
        )}
      </div>
    </IntentConfirmModal>
  );
}
