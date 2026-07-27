import { useState, useEffect } from 'react';
import { MessageSquare, PenLine, Coins, Inbox } from 'lucide-react';
import { ERROR_CODES } from '@unicitylabs/sphere-sdk/connect';
import { TokenRegistry, formatAmount } from '@unicitylabs/sphere-sdk';
import { BaseModal, ModalHeader, Button } from '../wallet/ui';
import { SendIntentModal } from './SendIntentModal';
import { PaymentRequestIntentModal } from './PaymentRequestIntentModal';
import { useConnectContext } from './ConnectContext';
import { useSendDM } from '../../sdk/hooks/comms/useSendDM';
import { getErrorMessage } from '../../sdk/errors';
import { useSphereContext } from '../../sdk';
import { useSubscriptionKeyGuard } from '../../sdk/hooks/subscription';

/** Intents this wallet actually implements. Anything else is rejected cleanly. */
const SUPPORTED_INTENTS = new Set(['send', 'payment_request', 'dm', 'sign_message', 'mint', 'receive']);

type IntentError = { code: number; message: string };

/** Canonical coinId: even-length lowercase hex (same shape the mint intent requires). */
const COIN_ID_RE = /^([0-9a-f]{2})+$/;

/**
 * Validate dApp-supplied intent params up front. Returns a structured error to
 * reject with (INVALID_PARAMS / METHOD_NOT_FOUND), or null when the intent is
 * supported and well-formed. `mint` does its own engine-specific validation in
 * its handler, so it is only checked for support here.
 */
function validateIntent(action: string, params: Record<string, unknown>): IntentError | null {
  if (!SUPPORTED_INTENTS.has(action)) {
    return {
      code: ERROR_CODES.METHOD_NOT_FOUND,
      message: `Intent "${action}" is not supported by this wallet`,
    };
  }
  if (action === 'send' || action === 'payment_request') {
    if (typeof params.to !== 'string' || params.to.trim() === '') {
      return { code: ERROR_CODES.INVALID_PARAMS, message: 'Missing or invalid "to"' };
    }
    // amount is in BASE UNITS (smallest indivisible unit) — a positive integer
    // string, exactly like the `mint` intent. Whole-token/decimal amounts are
    // rejected: every major wallet carries dApp-requested amounts in base units
    // (exactness, no float), and the dApp converts at its own UI edge.
    const amountStr = params.amount == null ? '' : String(params.amount).trim();
    if (!/^\d+$/.test(amountStr) || BigInt(amountStr) <= 0n) {
      return { code: ERROR_CODES.INVALID_PARAMS, message: 'amount must be a positive integer string in base units' };
    }
    if (typeof params.coinId !== 'string' || !COIN_ID_RE.test(params.coinId)) {
      return { code: ERROR_CODES.INVALID_PARAMS, message: 'coinId must be lowercase even-length hex' };
    }
    return null;
  }
  if (action === 'dm') {
    if (typeof params.to !== 'string' || params.to.trim() === '') {
      return { code: ERROR_CODES.INVALID_PARAMS, message: 'Missing or invalid "to"' };
    }
    if (typeof params.message !== 'string' || params.message === '') {
      return { code: ERROR_CODES.INVALID_PARAMS, message: 'Missing or invalid "message"' };
    }
    return null;
  }
  if (action === 'sign_message') {
    if (typeof params.message !== 'string' || params.message === '') {
      return { code: ERROR_CODES.INVALID_PARAMS, message: 'Missing or invalid "message"' };
    }
    return null;
  }
  return null;
}

export function ConnectIntentHandler() {
  const { pendingIntent, resolveIntent, rejectIntent, registerAutoIntent } = useConnectContext();
  const { sphere } = useSphereContext();
  const { ready: subscriptionKeyReady } = useSubscriptionKeyGuard();
  const { sendDM, isLoading: isSendingDM } = useSendDM();
  const [dmError, setDmError] = useState<string | null>(null);
  const [autoApproveDM, setAutoApproveDM] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);
  const [isReceiving, setIsReceiving] = useState(false);

  // Validate/normalize params up front: reject malformed or unsupported intents
  // cleanly (INVALID_PARAMS / METHOD_NOT_FOUND) instead of opening a modal that
  // silently hangs (unresolved coinId) or crashes (missing sign_message body).
  // Runs once per pending intent.
  useEffect(() => {
    if (!pendingIntent) return;
    const error = validateIntent(pendingIntent.action, pendingIntent.params);
    if (error) rejectIntent(pendingIntent.id, error.code, error.message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingIntent]);

  if (!pendingIntent) return null;

  // Captured HERE, so every callback below settles the intent this render belongs to. The
  // queue head advances while a modal's async work is in flight, so reading the head at
  // callback time delivered a completed transfer's result against a different dApp's intent.
  const intentId = pendingIntent.id;
  const { action, params } = pendingIntent;

  // Malformed / unsupported intents are rejected by the effect above — render nothing.
  if (validateIntent(action, params)) return null;

  const handleClose = () => {
    rejectIntent(intentId, ERROR_CODES.USER_REJECTED, 'User cancelled');
  };

  // --- Send Intent: confirm-only (amount fixed, base units, approve/reject) ---
  if (action === 'send') {
    return (
      <SendIntentModal
        to={params.to as string}
        amount={String(params.amount)}
        coinId={params.coinId as string}
        memo={params.memo as string | undefined}
        // #433: additive result fields so the dApp can distinguish "delivered"
        // from "certified on-chain, delivery journaled for retry" and correlate
        // the send with wallet history. transferId is omitted on the synthetic
        // pending results (#631/#665) — those carry an empty id by design.
        onResolve={(result) =>
          resolveIntent(intentId, {
            success: true,
            ...(result.id ? { transferId: result.id } : {}),
            status: result.status,
            deliveryPending: result.deliveryPending ?? false,
          })
        }
        onReject={(message) => rejectIntent(intentId, ERROR_CODES.TRANSFER_FAILED, message)}
        onCancel={handleClose}
      />
    );
  }

  // --- Payment Request Intent: confirm-only (amount fixed, base units) ---
  if (action === 'payment_request') {
    return (
      <PaymentRequestIntentModal
        to={params.to as string}
        amount={String(params.amount)}
        coinId={params.coinId as string}
        message={params.message as string | undefined}
        onResolve={(requestId) => resolveIntent(intentId, { success: true, requestId })}
        onReject={(message) => rejectIntent(intentId, ERROR_CODES.INTERNAL_ERROR, message)}
        onCancel={handleClose}
      />
    );
  }

  // --- DM Intent ---
  if (action === 'dm') {
    const to = params.to as string;
    const message = params.message as string;

    const handleSendDM = async () => {
      setDmError(null);
      try {
        const dm = await sendDM({ recipient: to, content: message });

        // Register auto-approve if user checked the checkbox.
        // Uses ConnectProvider-level auto-handler (bypasses ConnectHost entirely)
        // so it's immune to ConnectHost lifecycle issues.
        if (autoApproveDM && sphere) {
          const sphereRef = sphere;
          const approvedTo = to;
          registerAutoIntent(pendingIntent.host, 'dm', async (_action, intentParams) => {
            const nextTo = intentParams.to;
            const nextMessage = intentParams.message;
            // Auto-approval is scoped to the recipient the user approved. A DM to
            // any other recipient falls back to the normal confirmation modal
            // (return null) instead of being sent silently.
            if (typeof nextTo !== 'string' || nextTo !== approvedTo) return null;
            if (typeof nextMessage !== 'string' || nextMessage === '') {
              return { error: { code: ERROR_CODES.INVALID_PARAMS, message: 'Missing or invalid "message"' } };
            }
            try {
              const result = await sphereRef.communications.sendDM(nextTo, nextMessage);
              return { result: { sent: true, messageId: result.id, timestamp: result.timestamp } };
            } catch (err) {
              return {
                error: {
                  code: ERROR_CODES.INTERNAL_ERROR,
                  message: err instanceof Error ? err.message : 'DM failed',
                },
              };
            }
          });
        }

        resolveIntent(intentId, { sent: true, messageId: dm.id, timestamp: dm.timestamp });
      } catch (err) {
        setDmError(getErrorMessage(err));
      }
    };

    return (
      <BaseModal isOpen={true} onClose={handleClose}>
        <ModalHeader title="dApp DM Request" icon={MessageSquare} onClose={handleClose} />

        <div className="px-6 py-5 flex-1 flex flex-col justify-center">
          <div className="bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-5 mb-5 border border-neutral-200 dark:border-white/10">
            <div className="text-sm text-neutral-500 mb-2">
              Send DM to <span className="text-neutral-900 dark:text-white font-medium">{to}</span>
            </div>
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-3 text-neutral-700 dark:text-neutral-300 text-sm">
              {message}
            </div>
          </div>

          {/* Auto-approve checkbox */}
          <label className="flex items-center gap-3 mb-4 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoApproveDM}
              onChange={(e) => setAutoApproveDM(e.target.checked)}
              className="w-4 h-4 rounded accent-orange-500"
            />
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Allow this dApp to send DMs without confirmation
            </span>
          </label>

          {dmError && (
            <div className="text-red-500 text-sm mb-3 text-center">{dmError}</div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={handleClose} disabled={isSendingDM}>
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              disabled={isSendingDM}
              onClick={handleSendDM}
            >
              {isSendingDM ? 'Sending…' : 'Send DM'}
            </Button>
          </div>
        </div>
      </BaseModal>
    );
  }

  // --- Sign Message Intent ---
  if (action === 'sign_message') {
    const message = params.message as string;

    // Parse domain from challenge for display (e.g. "Domain: quests.unicity.network")
    const domainMatch = message.match(/^Domain:\s*(.+)$/m);
    const displayDomain = domainMatch ? domainMatch[1].trim() : null;

    const handleSign = () => {
      setSignError(null);
      if (!sphere) {
        setSignError('Wallet not available');
        return;
      }
      try {
        const signature = sphere.signMessage(message);
        const identity = sphere.identity;
        resolveIntent(intentId, { signature, publicKey: identity?.chainPubkey });
      } catch (err) {
        setSignError(getErrorMessage(err));
      }
    };

    return (
      <BaseModal isOpen={true} onClose={handleClose}>
        <ModalHeader title="Sign Message" icon={PenLine} onClose={handleClose} />

        <div className="px-6 py-5 flex-1 flex flex-col justify-center">
          {displayDomain && (
            <div className="text-sm text-neutral-500 mb-3 text-center">
              Requested by <span className="font-medium text-neutral-800 dark:text-neutral-200">{displayDomain}</span>
            </div>
          )}

          <div className="bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-4 mb-5 border border-neutral-200 dark:border-white/10">
            <div className="text-xs text-neutral-400 mb-2 uppercase tracking-wide">Message</div>
            <pre className="text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap break-all font-mono leading-relaxed">
              {message}
            </pre>
          </div>

          {signError && (
            <div className="text-red-500 text-sm mb-3 text-center">{signError}</div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" fullWidth onClick={handleSign}>
              Sign
            </Button>
          </div>
        </div>
      </BaseModal>
    );
  }

  // --- Mint Intent: self-mint a fungible token to the user's own wallet ---
  if (action === 'mint') {
    const coinId = params.coinId as string;
    const amount = params.amount as string;

    const handleMint = async () => {
      setMintError(null);
      if (!sphere) {
        setMintError('Wallet not available');
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

      setIsMinting(true);
      try {
        const result = await sphere.payments.mintFungibleToken(coinId, amountBig);
        if (result.success) {
          resolveIntent(intentId, { tokenId: result.tokenId, coinId, amount });
        } else {
          rejectIntent(intentId, ERROR_CODES.INTERNAL_ERROR, result.error);
        }
      } catch (err) {
        setMintError(getErrorMessage(err));
      } finally {
        setIsMinting(false);
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
      <BaseModal isOpen={true} onClose={handleClose}>
        <ModalHeader title="Mint Tokens" icon={Coins} onClose={handleClose} />

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

          {mintError && (
            <div className="text-red-500 text-sm mb-3 text-center">{mintError}</div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={handleClose} disabled={isMinting}>
              Cancel
            </Button>
            <Button variant="primary" fullWidth disabled={isMinting} onClick={handleMint}>
              {isMinting ? 'Minting…' : 'Mint'}
            </Button>
          </div>
        </div>
      </BaseModal>
    );
  }

  // --- Receive Intent: fetch the user's pending incoming transfers ---
  if (action === 'receive') {
    const handleReceive = async () => {
      setReceiveError(null);
      if (!sphere) {
        setReceiveError('Wallet not available');
        return;
      }
      setIsReceiving(true);
      try {
        const { transfers } = await sphere.payments.receive();
        resolveIntent(intentId, { transfers });
      } catch (err) {
        setReceiveError(getErrorMessage(err));
      } finally {
        setIsReceiving(false);
      }
    };

    return (
      <BaseModal isOpen={true} onClose={handleClose}>
        <ModalHeader title="Check for Transfers" icon={Inbox} onClose={handleClose} />

        <div className="px-6 py-5 flex-1 flex flex-col justify-center">
          <div className="bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-5 mb-5 border border-neutral-200 dark:border-white/10">
            <div className="text-sm text-neutral-500">
              This dApp wants to check your wallet for{' '}
              <span className="text-neutral-900 dark:text-white font-medium">incoming transfers</span>.
            </div>
          </div>

          {receiveError && (
            <div className="text-red-500 text-sm mb-3 text-center">{receiveError}</div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={handleClose} disabled={isReceiving}>
              Cancel
            </Button>
            <Button variant="primary" fullWidth disabled={isReceiving} onClick={handleReceive}>
              {isReceiving ? 'Checking…' : 'Check'}
            </Button>
          </div>
        </div>
      </BaseModal>
    );
  }

  // Unsupported intents are rejected up front by the validation effect
  // (METHOD_NOT_FOUND), so there is nothing to render here.
  return null;
}
