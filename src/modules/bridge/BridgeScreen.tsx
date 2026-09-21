/**
 * The bridge-in screen: pick an asset, an amount and a source-chain wallet;
 * watch the deposit progress; see the token land. Coin- and chain-agnostic:
 * everything it shows comes from the {BridgeAsset}s the providers loaded.
 * Deposits that were signed but not minted (a reload mid-flow) are listed
 * with a Resume action, since the recovery record is the only way to mint them.
 */
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, ExternalLink, Loader2, RotateCw, Trash2 } from 'lucide-react';

import { useSphereContext } from '../../sdk/hooks/core/useSphere';
import { getErrorMessage } from '../../sdk/errors';
import { WalletScreen } from '../../components/wallet/ui/WalletScreen';
import { Button, ModalHeader } from '../../components/wallet/ui';
import type { ModuleScreenProps } from '../types';
import { bridgeAssetByCoin, bridgeAssetsFor } from './assets';
import { formatUnits, parseUnits } from './format';
import type { BridgeInPhase } from './bridgeIn';
import type { PendingLock } from './store';
import type { BridgeAsset, BridgeWalletOption } from './types';
import { useBridgeIn } from './useBridgeIn';

type Step = 'form' | 'processing' | 'success';

const FIELD = 'w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] text-neutral-900 dark:text-white';

export function BridgeScreen({ isOpen, onClose }: ModuleScreenProps) {
  const { network } = useSphereContext();
  const assets = useMemo(() => bridgeAssetsFor(network), [network]);

  const [assetId, setAssetId] = useState<string>('');
  const asset: BridgeAsset | undefined = assets.find((a) => a.id === assetId) ?? assets[0];
  const [step, setStep] = useState<Step>('form');
  const [amountInput, setAmountInput] = useState('');
  const [maxApprove, setMaxApprove] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingLock[]>([]);
  const [resumingId, setResumingId] = useState<string | null>(null);

  const { bridgeIn, progress, result, reset, pendingMints, resume, discard } = useBridgeIn();

  // Re-read the recovery records each time the screen opens.
  useEffect(() => {
    if (isOpen) setPending(pendingMints());
  }, [isOpen, pendingMints]);

  const close = () => {
    setStep('form');
    setAmountInput('');
    setError(null);
    reset();
    onClose();
  };

  const start = async (wallet: BridgeWalletOption) => {
    if (!asset) return;
    setError(null);
    const amount = parseUnits(amountInput, asset.decimals);
    if (amount <= 0n) {
      setError('Enter an amount greater than zero.');
      return;
    }
    setStep('processing');
    try {
      await bridgeIn({ asset, wallet, amount, maxApprove });
      setStep('success');
    } catch (e) {
      setError(getErrorMessage(e));
      setStep('form');
      setPending(pendingMints());
    }
  };

  const onResume = async (lock: PendingLock) => {
    setError(null);
    setResumingId(lock.id);
    try {
      await resume(lock);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setResumingId(null);
      setPending(pendingMints());
    }
  };

  const onDiscard = (lock: PendingLock) => {
    discard(lock.id);
    setPending(pendingMints());
  };

  if (!isOpen) return null;

  return (
    <WalletScreen isOpen={isOpen} onClose={close}>
      <ModalHeader variant="screen" title="Bridge in" onClose={close} closeDisabled={step === 'processing'} />

      <div className="p-6 space-y-4 text-sm">
        {!asset && (
          <p className="text-neutral-500 dark:text-white/45">No bridgeable assets are configured for this network.</p>
        )}

        {asset && step === 'form' && (
          <>
            {assets.length > 1 && (
              <div className="space-y-2">
                <label className="text-xs text-neutral-500 dark:text-white/45">Asset</label>
                <select value={asset.id} onChange={(e) => setAssetId(e.target.value)} className={FIELD}>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs text-neutral-500 dark:text-white/45">
                Amount{assets.length === 1 ? ` · ${asset.label}` : ''}
              </label>
              <div className="relative">
                <input
                  inputMode="decimal"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="0.00"
                  className={`${FIELD} pr-16 text-lg font-mono`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 dark:text-white/45 font-mono">
                  {asset.symbol}
                </span>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-neutral-500 dark:text-white/45">
              <input type="checkbox" checked={maxApprove} onChange={(e) => setMaxApprove(e.target.checked)} className="accent-orange-500" />
              One-time max approve (fewer prompts next time)
            </label>

            <p className="text-xs text-neutral-500 dark:text-white/45">
              You sign in your {asset.chainName} wallet: the lock, plus an approval first if the vault is not
              approved yet. The bridged token appears as soon as the lock is in a block; other wallets accept
              it after {asset.confirmations} confirmations.
            </p>

            {error && <ErrorLine text={error} />}

            <div className="space-y-2">
              {asset.wallets.map((w) => {
                const available = w.isAvailable();
                return (
                  <div key={w.id} className="space-y-1">
                    <Button onClick={() => start(w)} disabled={!available} className="w-full">
                      Continue with {w.name}
                    </Button>
                    {!available && w.unavailableHint && (
                      <div className="text-[11px] text-neutral-500 dark:text-white/45 text-center">{w.unavailableHint}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {pending.length > 0 && (
              <PendingList
                locks={pending}
                resumingId={resumingId}
                onResume={onResume}
                onDiscard={onDiscard}
              />
            )}
          </>
        )}

        {asset && step === 'processing' && (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <div className="font-medium text-neutral-900 dark:text-white">{phaseLabel(progress?.phase, asset.chainName)}</div>
            {progress?.message && <div className="text-xs text-neutral-500 dark:text-white/45">{progress.message}</div>}
            {progress?.lockTxid && <TxLink href={asset.presentation.explorerTxUrl(progress.lockTxid)} label="lock transaction" />}
          </div>
        )}

        {asset && step === 'success' && (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
            <div className="font-medium text-neutral-900 dark:text-white">Bridged in</div>
            {result && (
              <div className="text-xs text-neutral-500 dark:text-white/45">
                {formatUnits(result.amount, asset.decimals)} {asset.symbol} is now in your wallet.
              </div>
            )}
            {progress?.lockTxid && <TxLink href={asset.presentation.explorerTxUrl(progress.lockTxid)} label="lock transaction" />}
            <Button onClick={close} className="w-full mt-2">Done</Button>
          </div>
        )}
      </div>
    </WalletScreen>
  );
}

function PendingList({
  locks,
  resumingId,
  onResume,
  onDiscard,
}: {
  locks: PendingLock[];
  resumingId: string | null;
  onResume: (lock: PendingLock) => void;
  onDiscard: (lock: PendingLock) => void;
}) {
  return (
    <div className="pt-2 space-y-2">
      <div className="text-xs text-neutral-500 dark:text-white/45">Deposits waiting for their token</div>
      {locks.map((lock) => {
        const asset = bridgeAssetByCoin(lock.coinIdHex);
        const amount = asset ? `${formatUnits(BigInt(lock.amount), asset.decimals)} ${asset.symbol}` : lock.amount;
        const busy = resumingId === lock.id;
        return (
          <div key={lock.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] text-xs">
            <span className="flex-1 min-w-0">
              <span className="block font-mono text-neutral-900 dark:text-white">{amount}</span>
              <span className="block text-neutral-500 dark:text-white/45">
                {lock.lockTxid ? (lock.status === 'locked' ? 'locked, not yet minted' : 'lock sent') : 'not signed'}
              </span>
            </span>
            {lock.lockTxid && asset && <TxLink href={asset.presentation.explorerTxUrl(lock.lockTxid)} label="tx" />}
            {lock.lockTxid && asset && (
              <button
                type="button"
                onClick={() => onResume(lock)}
                disabled={busy}
                className="p-1.5 rounded-md text-orange-500 hover:bg-orange-500/10 disabled:opacity-50"
                title="Resume the mint"
                aria-label="Resume the mint"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
              </button>
            )}
            {(!lock.lockTxid || !asset) && (
              <button
                type="button"
                onClick={() => onDiscard(lock)}
                className="p-1.5 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-500/10"
                title="Discard this record"
                aria-label="Discard this record"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ErrorLine({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-xs text-red-500">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {text}
    </div>
  );
}

function TxLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-xs text-orange-500 inline-flex items-center gap-1">
      {label} <ExternalLink className="w-3 h-3" />
    </a>
  );
}

function phaseLabel(phase: BridgeInPhase | undefined, chainName: string): string {
  switch (phase) {
    case 'deriving': return 'Preparing…';
    case 'approving': return `Approving on ${chainName}…`;
    case 'locking':
    case 'waiting-lock': return `Locking on ${chainName}…`;
    case 'minting': return 'Minting the bridged token…';
    case 'done': return 'Done';
    default: return 'Working…';
  }
}
