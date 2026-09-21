/**
 * The bridge-in screen. Three choices, then the deposit: which source network,
 * which asset on it, then amount and the wallet that signs. Every step is
 * shown even when it has a single option, so what the wallet supports is
 * visible rather than implied. Coin- and chain-agnostic: everything here comes
 * from the {BridgeAsset}s the providers loaded. Deposits that were signed but
 * not minted (a reload mid-flow) are listed on the first step with a Resume
 * action, since their recovery record is the only way to mint them.
 */
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, CheckCircle, ChevronRight, ExternalLink, Loader2, RotateCw, Trash2 } from 'lucide-react';

import { useSphereContext } from '../../sdk/hooks/core/useSphere';
import { getErrorMessage } from '../../sdk/errors';
import { WalletScreen } from '../../components/wallet/ui/WalletScreen';
import { Button, ModalHeader } from '../../components/wallet/ui';
import type { ModuleScreenProps } from '../types';
import { bridgeAssetByCoin, bridgeAssetsFor, bridgeChainsFor } from './assets';
import { formatUnits, parseUnits } from './format';
import type { BridgeInPhase } from './bridgeIn';
import type { PendingLock } from './store';
import type { BridgeAsset, BridgeChain, BridgeWalletOption } from './types';
import { useBridgeIn } from './useBridgeIn';

type Step = 'chain' | 'asset' | 'form' | 'processing' | 'success';

const FIELD = 'w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] text-neutral-900 dark:text-white';
const MUTED = 'text-neutral-500 dark:text-white/45';

export function BridgeScreen({ isOpen, onClose }: ModuleScreenProps) {
  const { network } = useSphereContext();
  const chains = useMemo(() => bridgeChainsFor(network), [network]);
  const allAssets = useMemo(() => bridgeAssetsFor(network), [network]);

  const [step, setStep] = useState<Step>('chain');
  const [chainId, setChainId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [maxApprove, setMaxApprove] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingLock[]>([]);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});

  const chain: BridgeChain | undefined = chains.find((c) => c.id === chainId);
  const chainAssets = useMemo(() => allAssets.filter((a) => a.chain.id === chainId), [allAssets, chainId]);
  const asset: BridgeAsset | undefined = chainAssets.find((a) => a.id === assetId);

  const { bridgeIn, progress, result, reset, pendingMints, resume, discard } = useBridgeIn();

  // Re-read the recovery records each time the screen opens.
  useEffect(() => {
    if (isOpen) setPending(pendingMints());
  }, [isOpen, pendingMints]);

  // A wallet extension can inject itself after the page (or this screen) has
  // rendered, so availability is re-checked while the form is open rather
  // than read once at render.
  useEffect(() => {
    if (!isOpen || step !== 'form' || !asset) return;
    const check = () => setAvailability(Object.fromEntries(asset.wallets.map((w) => [w.id, w.isAvailable()])));
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [isOpen, step, asset]);

  const close = () => {
    setStep('chain');
    setChainId(null);
    setAssetId(null);
    setAmountInput('');
    setError(null);
    reset();
    onClose();
  };

  /** The header's back arrow: one step back, or close from the first step. */
  const back = () => {
    setError(null);
    if (step === 'asset') setStep('chain');
    else if (step === 'form') setStep('asset');
    else close();
  };

  const pickChain = (c: BridgeChain) => {
    setChainId(c.id);
    setAssetId(null);
    setStep('asset');
  };

  const pickAsset = (a: BridgeAsset) => {
    setAssetId(a.id);
    setStep('form');
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

  const subtitle =
    step === 'chain' ? 'Step 1 of 3 · From which network'
    : step === 'asset' ? `Step 2 of 3 · ${chain?.name} ${chain?.networkName} · Which asset`
    : `${chain?.name} · ${chain?.networkName} · ${asset?.symbol}`;

  return (
    <WalletScreen isOpen={isOpen} onClose={close}>
      <ModalHeader variant="screen" title="Bridge in" subtitle={subtitle} onClose={back} closeDisabled={step === 'processing'} />

      <div className="p-6 space-y-4 text-sm">
        {chains.length === 0 && (
          <p className={MUTED}>No bridgeable assets are configured for this network.</p>
        )}

        {step === 'chain' && chains.length > 0 && (
          <>
            <p className={`text-xs ${MUTED}`}>
              Choose the network your funds are on. Only the networks listed here are supported.
            </p>
            <div className="space-y-2">
              {chains.map((c) => (
                <ChoiceRow
                  key={c.id}
                  title={c.name}
                  detail={c.networkName}
                  tag={c.testnet ? 'testnet' : undefined}
                  count={allAssets.filter((a) => a.chain.id === c.id).length}
                  countNoun="asset"
                  onClick={() => pickChain(c)}
                />
              ))}
            </div>
            {error && <ErrorLine text={error} />}
            {pending.length > 0 && (
              <PendingList locks={pending} resumingId={resumingId} onResume={onResume} onDiscard={onDiscard} />
            )}
          </>
        )}

        {step === 'asset' && chain && (
          <>
            <p className={`text-xs ${MUTED}`}>
              Assets that can be bridged from {chain.name} {chain.networkName}.
            </p>
            <div className="space-y-2">
              {chainAssets.map((a) => (
                <ChoiceRow
                  key={a.id}
                  title={a.symbol}
                  detail={a.label}
                  count={a.wallets.length}
                  countNoun="wallet"
                  onClick={() => pickAsset(a)}
                />
              ))}
            </div>
          </>
        )}

        {step === 'form' && chain && asset && (
          <>
            <SelectionSummary chain={chain} asset={asset} onChange={() => setStep('chain')} />

            <div className="space-y-2">
              <label className={`text-xs ${MUTED}`}>Amount</label>
              <div className="relative">
                <input
                  inputMode="decimal"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="0.00"
                  className={`${FIELD} pr-16 text-lg font-mono`}
                />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono ${MUTED}`}>
                  {asset.symbol}
                </span>
              </div>
            </div>

            <label className={`flex items-center gap-2 text-xs ${MUTED}`}>
              <input type="checkbox" checked={maxApprove} onChange={(e) => setMaxApprove(e.target.checked)} className="accent-orange-500" />
              One-time max approve (fewer prompts next time)
            </label>

            <p className={`text-xs ${MUTED}`}>
              You sign in your {chain.name} wallet: the lock, plus an approval first if the vault is not
              approved yet. The bridged token appears as soon as the lock is in a block; other wallets accept
              it after {asset.confirmations} confirmations.
            </p>

            {error && <ErrorLine text={error} />}

            <div className="space-y-2">
              {asset.wallets.map((w) => {
                const available = availability[w.id] ?? w.isAvailable();
                return (
                  <div key={w.id} className="space-y-1">
                    <Button onClick={() => start(w)} disabled={!available} className="w-full">
                      Continue with {w.name}
                    </Button>
                    {!available && w.unavailableHint && (
                      <div className={`text-[11px] text-center ${MUTED}`}>{w.unavailableHint}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {step === 'processing' && chain && asset && (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <div className="font-medium text-neutral-900 dark:text-white">{phaseLabel(progress?.phase, chain.name)}</div>
            {progress?.message && <div className={`text-xs ${MUTED}`}>{progress.message}</div>}
            {progress?.lockTxid && <TxLink href={asset.presentation.explorerTxUrl(progress.lockTxid)} label="lock transaction" />}
          </div>
        )}

        {step === 'success' && chain && asset && (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
            <div className="font-medium text-neutral-900 dark:text-white">Bridged in</div>
            {result && (
              <div className={`text-xs ${MUTED}`}>
                {formatUnits(result.amount, asset.decimals)} {asset.symbol} from {chain.name} is now in your wallet.
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

/** One selectable option in the network and asset steps. */
function ChoiceRow({
  title,
  detail,
  tag,
  count,
  countNoun,
  onClick,
}: {
  title: string;
  detail: string;
  tag?: string;
  count: number;
  countNoun: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full p-4 flex items-center gap-3 rounded-2xl border text-left transition-colors bg-neutral-50 dark:bg-white/4 border-neutral-200 dark:border-white/8 hover:bg-neutral-100 dark:hover:bg-white/8"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold font-mono text-neutral-900 dark:text-white">{title}</span>
          {tag && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              {tag}
            </span>
          )}
        </div>
        <div className={`text-xs mt-0.5 ${MUTED}`}>
          {detail} · {count} {countNoun}{count === 1 ? '' : 's'}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-neutral-600 shrink-0" />
    </button>
  );
}

/** What was chosen, kept in view above the form, with a way back to the first step. */
function SelectionSummary({ chain, asset, onChange }: { chain: BridgeChain; asset: BridgeAsset; onChange: () => void }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] text-xs">
      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
      <span className="flex-1 min-w-0 truncate text-neutral-900 dark:text-white">
        From <span className="font-semibold">{chain.name}</span> · {chain.networkName} · <span className="font-semibold">{asset.symbol}</span>
      </span>
      <button type="button" onClick={onChange} className="text-orange-500 hover:text-orange-600 shrink-0">
        change
      </button>
    </div>
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
      <div className={`text-xs ${MUTED}`}>Deposits waiting for their token</div>
      {locks.map((lock) => {
        const asset = bridgeAssetByCoin(lock.coinIdHex);
        const amount = asset ? `${formatUnits(BigInt(lock.amount), asset.decimals)} ${asset.symbol}` : lock.amount;
        const busy = resumingId === lock.id;
        return (
          <div key={lock.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] text-xs">
            <span className="flex-1 min-w-0">
              <span className="block font-mono text-neutral-900 dark:text-white">
                {amount}{asset ? ` · ${asset.chain.name}` : ''}
              </span>
              <span className={`block ${MUTED}`}>
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
