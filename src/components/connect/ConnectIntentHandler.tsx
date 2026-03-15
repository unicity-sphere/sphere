import { useState, useCallback } from 'react';
import { MessageSquare, PenLine } from 'lucide-react';
import { ERROR_CODES } from '@unicitylabs/sphere-sdk/connect';
import { BaseModal, ModalHeader, Button } from '../wallet/ui';
import { SendModal } from '../wallet/L3/modals/SendModal';
import { SendPaymentRequestModal } from '../wallet/L3/modals/SendPaymentRequestModal';
import { SendModal as L1SendModal } from '../wallet/L1/components/modals/SendModal';
import { useConnectContext } from './ConnectContext';
import { useSendDM } from '../../sdk/hooks/comms/useSendDM';
import { getErrorMessage } from '../../sdk/errors';
import { useIdentity, useL1Balance, useL1Send, useSphereContext } from '../../sdk';

export function ConnectIntentHandler() {
  const { pendingIntent, resolveIntent, rejectIntent, registerAutoIntent } = useConnectContext();
  const { adapter, isUnlocked } = useSphereContext();
  const { sendDM, isLoading: isSendingDM } = useSendDM();
  const [dmError, setDmError] = useState<string | null>(null);
  const [autoApproveDM, setAutoApproveDM] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  // L1 hooks (always called — hooks cannot be conditional)
  const { l1Address } = useIdentity();
  const { balance: l1BalanceData } = useL1Balance();
  const { send: l1Send, estimateFee, resolveAddress } = useL1Send();
  const l1VestingBalances = l1BalanceData ? {
    vested: BigInt(l1BalanceData.vested),
    unvested: BigInt(l1BalanceData.unvested),
    all: BigInt(l1BalanceData.total),
  } : { vested: 0n, unvested: 0n, all: 0n };

  const handleL1Send = useCallback(async (destination: string, amount: string) => {
    const amountAlpha = Number(amount);
    if (isNaN(amountAlpha) || amountAlpha <= 0) throw new Error('Invalid amount');
    const amountSatoshis = Math.round(amountAlpha * 1e8).toString();
    await l1Send({ toAddress: destination, amount: amountSatoshis });
  }, [l1Send]);

  // In extension mode, don't show until wallet is unlocked
  if (import.meta.env.VITE_PLATFORM === 'extension' && !isUnlocked) return null;
  if (!pendingIntent) return null;

  const { action, params } = pendingIntent;

  const handleClose = () => {
    rejectIntent(ERROR_CODES.USER_REJECTED, 'User cancelled');
  };

  // --- Send Intent: reuse the wallet's SendModal ---
  if (action === 'send') {
    return (
      <SendModal
        isOpen={true}
        onClose={(result) => {
          if (result?.success) {
            resolveIntent({ success: true });
          } else {
            rejectIntent(ERROR_CODES.USER_REJECTED, 'User cancelled');
          }
        }}
        prefill={{
          to: params.to as string,
          amount: params.amount as string,
          coinId: (params.coinId as string) ?? 'UCT',
          memo: params.memo as string | undefined,
        }}
      />
    );
  }

  // --- Payment Request Intent: reuse SendPaymentRequestModal ---
  if (action === 'payment_request') {
    return (
      <SendPaymentRequestModal
        isOpen={true}
        onClose={(result) => {
          if (result?.success) {
            resolveIntent({ success: true, requestId: result.requestId });
          } else {
            rejectIntent(ERROR_CODES.USER_REJECTED, 'User cancelled');
          }
        }}
        prefill={{
          to: params.to as string,
          amount: params.amount as string,
          coinId: (params.coinId as string) ?? 'UCT',
          message: params.message as string | undefined,
        }}
      />
    );
  }

  // --- L1 Send Intent ---
  if (action === 'l1_send') {
    const toParam = params.to as string | undefined;
    const amountParam = params.amount as string | undefined;
    // Convert sats to ALPHA if amount looks like sats (integer >= 1000)
    let amountAlpha = amountParam;
    if (amountParam && /^\d+$/.test(amountParam) && Number(amountParam) >= 1000) {
      amountAlpha = (Number(amountParam) / 1e8).toString();
    }

    return (
      <L1SendModal
        show={true}
        selectedAddress={l1Address ?? ''}
        onClose={(result) => {
          if (result?.success) {
            resolveIntent({ success: true });
          } else {
            rejectIntent(ERROR_CODES.USER_REJECTED, 'User cancelled');
          }
        }}
        onSend={handleL1Send}
        vestingBalances={l1VestingBalances}
        onEstimateFee={estimateFee}
        onResolveAddress={resolveAddress}
        prefill={toParam ? { to: toParam, amount: amountAlpha ?? '' } : undefined}
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
        if (autoApproveDM && adapter) {
          if (import.meta.env.VITE_PLATFORM === 'extension') {
            // Extension mode: tell background ConnectHost to auto-approve DMs
            chrome.runtime.sendMessage({ type: 'POPUP_SET_DM_AUTO_APPROVE' }).catch(() => {});
          } else {
            // Web mode: register in ConnectProvider memory
            const adapterRef = adapter;
            registerAutoIntent('dm', async (_action, intentParams) => {
              try {
                const result = await adapterRef.sendDM(
                  intentParams.to as string,
                  intentParams.message as string,
                );
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
        }

        resolveIntent({ sent: true, messageId: dm.id, timestamp: dm.timestamp });
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

    const handleSign = async () => {
      setSignError(null);
      if (!adapter) {
        setSignError('Wallet not available');
        return;
      }
      try {
        const signature = await adapter.signMessage(message);
        const identity = adapter.identity;
        resolveIntent({ signature, publicKey: identity?.chainPubkey });
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

  // --- Unknown Intent ---
  return (
    <BaseModal isOpen={true} onClose={handleClose}>
      <ModalHeader title="Unknown Request" onClose={handleClose} />
      <div className="px-6 py-5 text-center">
        <p className="text-neutral-500 mb-4">
          Unsupported intent: <code className="text-neutral-700 dark:text-neutral-300">{action}</code>
        </p>
        <Button variant="secondary" onClick={handleClose}>
          Dismiss
        </Button>
      </div>
    </BaseModal>
  );
}
