import { useState } from 'react';
import { getPayments } from '../../sdk/payments';
import { Receipt } from 'lucide-react';
import { TokenRegistry, formatAmount } from '@unicitylabs/sphere-sdk';
import { useSphereContext } from '../../sdk';
import { getErrorMessage } from '../../sdk/errors';
import { IntentConfirmModal } from './IntentConfirmModal';

interface PaymentRequestIntentModalProps {
  /** Who should pay: Unicity ID (@tag) or DIRECT:// address, as supplied by the dApp. */
  to: string;
  /** Requested amount in BASE UNITS (smallest indivisible unit) — integer string. */
  amount: string;
  /** Token coinId (lowercase even-length hex). */
  coinId: string;
  message?: string;
  /** Called after the request is sent (resolves the intent). */
  onResolve: (requestId?: string) => void;
  /** Called when sending the request fails (rejects the intent with the message). */
  onReject: (message: string) => void;
  /** Called when the user cancels (rejects the intent). */
  onCancel: () => void;
}

/**
 * Confirm-only modal for the Connect `payment_request` intent. The dApp
 * specifies who to bill, the coin and the amount (in base units); the user
 * approves or rejects — the amount is NOT editable here. The base-unit amount is
 * passed to the SDK verbatim; `formatAmount` renders a human-readable figure for
 * review only. Coin metadata comes from the registry (a request needs no
 * balance). A failed send rejects the intent rather than leaving it hanging.
 */
export function PaymentRequestIntentModal({
  to,
  amount,
  coinId,
  message,
  onResolve,
  onReject,
  onCancel,
}: PaymentRequestIntentModalProps) {
  const { sphere } = useSphereContext();
  const [busy, setBusy] = useState(false);

  const registry = TokenRegistry.getInstance();
  const def = registry.getDefinition(coinId);
  const decimals = def?.decimals ?? 0;
  const symbol = def?.symbol ?? '';
  const iconUrl = (def ? registry.getIconUrl(coinId) : null) ?? undefined;

  const displayAmount = formatAmount(amount, { decimals, symbol, maxFractionDigits: 8 });

  const handleSend = async () => {
    const payments = getPayments(sphere);
    if (!payments) {
      onReject('Wallet not available');
      return;
    }
    setBusy(true);
    try {
      const recipient = to.startsWith('DIRECT://') ? to : `@${to.replace(/^@/, '')}`;
      const result = await payments.requests.create(recipient, {
        amount,
        coinId,
        ...(message ? { memo: message } : {}),
      });
      if (!result.success) throw new Error(result.error || 'Failed to send payment request');
      onResolve(result.requestId || undefined);
    } catch (err) {
      onReject(getErrorMessage(err));
    }
  };

  return (
    <IntentConfirmModal
      title="Payment Request"
      icon={Receipt}
      busy={busy}
      confirmLabel="Send Request"
      busyLabel="Sending…"
      onConfirm={handleSend}
      onCancel={onCancel}
    >
      <div className="bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-5 mb-5 border border-neutral-200 dark:border-white/10">
        <div className="text-sm text-neutral-500 mb-4">
          This dApp wants to send a payment request on your behalf.
        </div>

        <div className="flex items-center gap-3 mb-3">
          {iconUrl && <img src={iconUrl} alt="" className="w-9 h-9 rounded-full shrink-0" />}
          <span className="text-2xl font-semibold text-neutral-900 dark:text-white break-all">
            {displayAmount}
          </span>
        </div>

        <div className="text-[11px] text-neutral-400 break-all mb-1">
          <span className="text-neutral-500 dark:text-neutral-400">Requested from:</span>{' '}
          <span className="font-mono">{to}</span>
        </div>

        {!def && (
          <div className="mt-1 text-amber-600 dark:text-amber-500 text-xs break-all">
            Unrecognized coin ({coinId}) — verify before approving
          </div>
        )}

        {message && (
          <div className="text-sm text-neutral-500 dark:text-white/45 italic mt-2">&ldquo;{message}&rdquo;</div>
        )}
      </div>
    </IntentConfirmModal>
  );
}
