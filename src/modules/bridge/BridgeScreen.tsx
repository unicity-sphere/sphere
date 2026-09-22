/**
 * The bridge screen. First a direction, then which source network and which
 * asset on it, then the form: for assets in, an amount and the wallet that
 * signs the deposit; for assets out, the tokens to burn and the destination
 * address. Every step is shown even when it has a single option, so what the
 * wallet supports is visible rather than implied. Coin- and chain-agnostic:
 * everything here comes from the {BridgeAsset}s the providers loaded.
 *
 * The first step also lists what is in flight: deposits signed but not yet
 * minted (a reload mid-flow), with Resume, and burns waiting for their release
 * on the source chain, with their status from the return service.
 */
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Check, CheckCircle, ChevronRight, ExternalLink, Loader2, RotateCw, Trash2 } from 'lucide-react';
import type { Token } from '@unicitylabs/sphere-sdk';

import { useTokens } from '../../sdk';
import { useSphereContext } from '../../sdk/hooks/core/useSphere';
import { getErrorMessage } from '../../sdk/errors';
import { WalletScreen } from '../../components/wallet/ui/WalletScreen';
import { Button, ModalHeader } from '../../components/wallet/ui';
import type { ModuleScreenProps } from '../types';
import { bridgeAssetByCoin, bridgeAssetsFor, bridgeChainsFor } from './assets';
import { formatUnits, parseUnits, returnStatusSentence } from './format';
import type { BridgeInPhase } from './bridgeIn';
import { isTerminalReturn, type PendingLock, type PendingReturn } from './store';
import type { BridgeAsset, BridgeChain, BridgeWalletOption } from './types';
import { useBridgeIn } from './useBridgeIn';
import { useBridgeOut, useReturnableTokens } from './useBridgeOut';

type Direction = 'in' | 'out';
type Step = 'direction' | 'chain' | 'asset' | 'form' | 'processing' | 'success';

const FIELD = 'w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] text-neutral-900 dark:text-white';
const MUTED = 'text-neutral-500 dark:text-white/45';

export function BridgeScreen({ isOpen, onClose }: ModuleScreenProps) {
  const { network } = useSphereContext();
  const allAssets = useMemo(() => bridgeAssetsFor(network), [network]);

  const [direction, setDirection] = useState<Direction>('in');
  const [step, setStep] = useState<Step>('direction');
  const [chainId, setChainId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Assets in.
  const [amountInput, setAmountInput] = useState('');
  const [pending, setPending] = useState<PendingLock[]>([]);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const { bridgeIn, progress, result, reset: resetIn, pendingMints, resume, discard } = useBridgeIn();

  // Assets out.
  const [destination, setDestination] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [burnProgress, setBurnProgress] = useState<{ done: number; total: number } | null>(null);
  const [burned, setBurned] = useState<PendingReturn[]>([]);
  const { bridgeOut, returns, dismiss, retry, reset: resetOut } = useBridgeOut();
  const { tokens } = useTokens();

  // The assets offered depend on the direction: out needs a return path.
  const directionAssets = useMemo(
    () => (direction === 'out' ? allAssets.filter((a) => a.out) : allAssets),
    [allAssets, direction],
  );
  const chains = useMemo(() => bridgeChainsFor(network).filter((c) => directionAssets.some((a) => a.chain.id === c.id)), [network, directionAssets]);
  const chain: BridgeChain | undefined = chains.find((c) => c.id === chainId);
  const chainAssets = useMemo(() => directionAssets.filter((a) => a.chain.id === chainId), [directionAssets, chainId]);
  const asset: BridgeAsset | undefined = chainAssets.find((a) => a.id === assetId);

  // Tokens of the chosen asset this bridge can release, and those of the same coin it cannot.
  const { eligible: returnable, ineligible: superseded } = useReturnableTokens(asset, tokens);
  const selectedTokens = useMemo(() => returnable.filter((t) => selectedIds.has(t.id)), [returnable, selectedIds]);
  const selectedAmount = useMemo(() => selectedTokens.reduce((sum, t) => sum + BigInt(t.amount || '0'), 0n), [selectedTokens]);

  // Re-read the recovery records each time the screen opens.
  useEffect(() => {
    if (isOpen) setPending(pendingMints());
  }, [isOpen, pendingMints]);

  // A wallet extension can inject itself after the page (or this screen) has
  // rendered, so availability is re-checked while the form is open rather
  // than read once at render.
  useEffect(() => {
    if (!isOpen || step !== 'form' || direction !== 'in' || !asset) return;
    const check = () => setAvailability(Object.fromEntries(asset.wallets.map((w) => [w.id, w.isAvailable()])));
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [isOpen, step, direction, asset]);

  // Selection follows the live inventory.
  useEffect(() => {
    setSelectedIds((prev) => {
      const live = new Set(returnable.map((t) => t.id));
      const next = new Set([...prev].filter((id) => live.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [returnable]);

  const close = () => {
    setStep('direction');
    setChainId(null);
    setAssetId(null);
    setAmountInput('');
    setDestination('');
    setSelectedIds(new Set());
    setBurnProgress(null);
    setError(null);
    resetIn();
    resetOut();
    onClose();
  };

  /** The header's back arrow: one step back, or close from the first step. */
  const back = () => {
    setError(null);
    if (step === 'chain') setStep('direction');
    else if (step === 'asset') setStep('chain');
    else if (step === 'form') setStep('asset');
    else if (step === 'success') setStep('direction');
    else close();
  };

  const pickDirection = (d: Direction) => {
    setDirection(d);
    setChainId(null);
    setAssetId(null);
    setStep('chain');
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

  const startIn = async (wallet: BridgeWalletOption) => {
    if (!asset) return;
    setError(null);
    const amount = parseUnits(amountInput, asset.decimals);
    if (amount <= 0n) {
      setError('Enter an amount greater than zero.');
      return;
    }
    setStep('processing');
    try {
      await bridgeIn({ asset, wallet, amount });
      setStep('success');
    } catch (e) {
      setError(getErrorMessage(e));
      setStep('form');
      setPending(pendingMints());
    }
  };

  const startOut = async () => {
    if (!asset) return;
    setError(null);
    if (selectedTokens.length === 0) {
      setError('Select at least one token to send out.');
      return;
    }
    if (!asset.presentation.validateAddress(destination)) {
      setError(`Enter a valid ${asset.chain.name} destination address.`);
      return;
    }
    setStep('processing');
    setBurnProgress({ done: 0, total: selectedTokens.length });
    try {
      // One burn per token, in order; each record lands in the returns list as it is made.
      const records: PendingReturn[] = [];
      for (let i = 0; i < selectedTokens.length; i++) {
        const t = selectedTokens[i];
        records.push(...(await bridgeOut({ asset, tokens: [{ id: t.id, amount: BigInt(t.amount || '0') }], destination })));
        setBurnProgress({ done: i + 1, total: selectedTokens.length });
      }
      setBurned(records);
      setSelectedIds(new Set());
      setStep('success');
    } catch (e) {
      setError(getErrorMessage(e));
      setStep('form');
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

  const toggleToken = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (!isOpen) return null;

  const verb = direction === 'in' ? 'Bridge in' : 'Bridge out';
  const subtitle =
    step === 'direction' ? 'Which way'
    : step === 'chain' ? `${verb} · Step 1 of 3 · Which network`
    : step === 'asset' ? `${verb} · Step 2 of 3 · ${chain?.name} ${chain?.networkName} · Which asset`
    : `${verb} · ${chain?.name} · ${chain?.networkName} · ${asset?.symbol}`;

  return (
    <WalletScreen isOpen={isOpen} onClose={close}>
      <ModalHeader variant="screen" title="Bridge" subtitle={subtitle} onClose={back} closeDisabled={step === 'processing'} />

      <div className="p-6 space-y-4 text-sm">
        {step === 'direction' && (
          <>
            <div className="space-y-2">
              <ChoiceRow
                icon={<ArrowDownLeft className="w-4 h-4 text-emerald-500" />}
                title="Bring assets in"
                detail="Lock on another network, receive here"
                count={allAssets.length}
                countNoun="asset"
                onClick={() => pickDirection('in')}
              />
              <ChoiceRow
                icon={<ArrowUpRight className="w-4 h-4 text-orange-500" />}
                title="Send assets out"
                detail="Burn here, receive on the other network"
                count={allAssets.filter((a) => a.out).length}
                countNoun="asset"
                onClick={() => pickDirection('out')}
              />
            </div>
            {error && <ErrorLine text={error} />}
            {pending.length > 0 && (
              <PendingList locks={pending} resumingId={resumingId} onResume={onResume} onDiscard={onDiscard} />
            )}
            {returns.length > 0 && <ReturnsList returns={returns} onDismiss={dismiss} onRetry={retry} />}
          </>
        )}

        {step === 'chain' && (
          <>
            <p className={`text-xs ${MUTED}`}>
              {direction === 'in'
                ? 'Choose the network your funds are on. Only the networks listed here are supported.'
                : 'Choose the network to receive on. Only the networks listed here are supported.'}
            </p>
            {chains.length === 0 && <p className={MUTED}>No assets can be bridged this way on this network.</p>}
            <div className="space-y-2">
              {chains.map((c) => (
                <ChoiceRow
                  key={c.id}
                  title={c.name}
                  detail={c.networkName}
                  tag={c.testnet ? 'testnet' : undefined}
                  count={directionAssets.filter((a) => a.chain.id === c.id).length}
                  countNoun="asset"
                  onClick={() => pickChain(c)}
                />
              ))}
            </div>
          </>
        )}

        {step === 'asset' && chain && (
          <>
            <p className={`text-xs ${MUTED}`}>
              {direction === 'in' ? `Assets that can be bridged from ${chain.name} ${chain.networkName}.` : `Assets that can be sent back to ${chain.name} ${chain.networkName}.`}
            </p>
            <div className="space-y-2">
              {chainAssets.map((a) => (
                <ChoiceRow
                  key={a.id}
                  title={a.symbol}
                  detail={a.label}
                  count={direction === 'in' ? a.wallets.length : tokens.filter((t) => t.coinId.toLowerCase() === a.coinIdHex).length}
                  countNoun={direction === 'in' ? 'wallet' : 'token'}
                  onClick={() => pickAsset(a)}
                />
              ))}
            </div>
          </>
        )}

        {step === 'form' && chain && asset && direction === 'in' && (
          <>
            <SelectionSummary chain={chain} asset={asset} prefix="From" onChange={() => setStep('chain')} />

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
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono ${MUTED}`}>{asset.symbol}</span>
              </div>
            </div>

            <p className={`text-xs ${MUTED}`}>
              You sign in your {chain.name} wallet: an approval for exactly this amount, then the lock. The
              bridged token appears as soon as the lock is in a block; other wallets accept it after{' '}
              {asset.confirmations} confirmations.
            </p>

            {error && <ErrorLine text={error} />}

            <div className="space-y-2">
              {asset.wallets.map((w) => {
                const available = availability[w.id] ?? w.isAvailable();
                return (
                  <div key={w.id} className="space-y-1">
                    <Button onClick={() => startIn(w)} disabled={!available} className="w-full">
                      Continue with {w.name}
                    </Button>
                    {!available && w.unavailableHint && <div className={`text-[11px] text-center ${MUTED}`}>{w.unavailableHint}</div>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {step === 'form' && chain && asset && direction === 'out' && (
          <>
            <SelectionSummary chain={chain} asset={asset} prefix="To" onChange={() => setStep('chain')} />

            {returnable.length === 0 ? (
              <>
                <p className={`text-xs ${MUTED}`}>No {asset.symbol} tokens to send out. Bridge some in first.</p>
                <SupersededTokens tokens={superseded} asset={asset} />
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs ${MUTED}`}>Tokens to send out</label>
                    <button
                      type="button"
                      onClick={() => setSelectedIds(selectedIds.size === returnable.length ? new Set() : new Set(returnable.map((t) => t.id)))}
                      className="text-xs text-orange-500 hover:text-orange-600"
                    >
                      {selectedIds.size === returnable.length ? 'Clear' : 'All'}
                    </button>
                  </div>
                  <div className="max-h-44 overflow-y-auto rounded-xl bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] divide-y divide-neutral-200 dark:divide-white/10">
                    {returnable.map((t) => (
                      <TokenChoice key={t.id} token={t} asset={asset} checked={selectedIds.has(t.id)} onToggle={() => toggleToken(t.id)} />
                    ))}
                  </div>
                  <div className={`text-xs ${MUTED}`}>
                    {selectedTokens.length} token{selectedTokens.length === 1 ? '' : 's'} · {formatUnits(selectedAmount, asset.decimals)} {asset.symbol}. Each token is sent whole; to send a
                    different amount, send yourself that amount first and pick the new token.
                  </div>
                  <SupersededTokens tokens={superseded} asset={asset} />
                </div>

                <div className="space-y-2">
                  <label className={`text-xs ${MUTED}`}>{asset.chain.name} destination address</label>
                  <input
                    value={destination}
                    onChange={(e) => setDestination(e.target.value.trim())}
                    placeholder={asset.chain.name === 'Tron' ? 'T…' : 'address'}
                    className={`${FIELD} font-mono`}
                  />
                </div>

                <p className={`text-xs ${MUTED}`}>
                  You sign only the burn here. The return service proves it and releases the funds to that address;
                  you pay nothing on {asset.chain.name} to receive. The burned token is kept in this wallet's records until
                  the release lands, and anyone holding it can resubmit it.
                </p>

                {error && <ErrorLine text={error} />}

                <Button onClick={startOut} className="w-full" disabled={selectedTokens.length === 0}>
                  {selectedTokens.length > 1 ? `Bridge out ${selectedTokens.length} tokens` : 'Bridge out'}
                </Button>
              </>
            )}
          </>
        )}

        {step === 'processing' && chain && asset && (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            {direction === 'in' ? (
              <>
                <div className="font-medium text-neutral-900 dark:text-white">{phaseLabel(progress?.phase, chain.name)}</div>
                {progress?.message && <div className={`text-xs ${MUTED}`}>{progress.message}</div>}
                {progress?.lockTxid && <TxLink href={asset.presentation.explorerTxUrl(progress.lockTxid)} label="lock transaction" />}
              </>
            ) : (
              <>
                <div className="font-medium text-neutral-900 dark:text-white">Burning…</div>
                {burnProgress && (
                  <div className={`text-xs ${MUTED}`}>
                    Token {Math.min(burnProgress.done + 1, burnProgress.total)} of {burnProgress.total}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {step === 'success' && chain && asset && (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
            {direction === 'in' ? (
              <>
                <div className="font-medium text-neutral-900 dark:text-white">Bridged in</div>
                {result && (
                  <div className={`text-xs ${MUTED}`}>
                    {formatUnits(result.amount, asset.decimals)} {asset.symbol} from {chain.name} is now in your wallet.
                  </div>
                )}
                {progress?.lockTxid && <TxLink href={asset.presentation.explorerTxUrl(progress.lockTxid)} label="lock transaction" />}
              </>
            ) : (
              <BurnedSummary asset={asset} burned={burned.map((b) => returns.find((r) => r.id === b.id) ?? b)} />
            )}
            <Button onClick={close} className="w-full mt-2">Done</Button>
          </div>
        )}
      </div>
    </WalletScreen>
  );
}

/** One selectable option in the direction, network and asset steps. */
function ChoiceRow({
  icon,
  title,
  detail,
  tag,
  count,
  countNoun,
  onClick,
}: {
  icon?: React.ReactNode;
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
      {icon && <div className="shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold font-mono text-neutral-900 dark:text-white">{title}</span>
          {tag && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">{tag}</span>
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

function TokenChoice({ token, asset, checked, onToggle }: { token: Token; asset: BridgeAsset; checked: boolean; onToggle: () => void }) {
  return (
    <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-neutral-200/60 dark:hover:bg-white/5">
      <input type="checkbox" checked={checked} onChange={onToggle} className="h-4 w-4 accent-orange-500" />
      <span className="flex-1 min-w-0">
        <span className="block text-sm text-neutral-900 dark:text-white">
          {formatUnits(BigInt(token.amount || '0'), asset.decimals)} {asset.symbol}
        </span>
        <span className={`block truncate text-[11px] font-mono ${MUTED}`}>{token.id}</span>
      </span>
    </label>
  );
}

/** Tokens of this coin the active vault does not back: listed so the balance adds up, never offered for a burn. */
function SupersededTokens({ tokens, asset }: { tokens: Token[]; asset: BridgeAsset }) {
  if (tokens.length === 0) return null;
  const total = tokens.reduce((sum, t) => sum + BigInt(t.amount || '0'), 0n);
  return (
    <div className={`text-xs ${MUTED}`}>
      {tokens.length} token{tokens.length === 1 ? '' : 's'} · {formatUnits(total, asset.decimals)} {asset.symbol} cannot be sent out here:{' '}
      {tokens.length === 1 ? 'it was' : 'they were'} bridged in through a vault this bridge no longer settles.
    </div>
  );
}

/** What was chosen, kept in view above the form, with a way back to the first choice. */
function SelectionSummary({ chain, asset, prefix, onChange }: { chain: BridgeChain; asset: BridgeAsset; prefix: string; onChange: () => void }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] text-xs">
      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
      <span className="flex-1 min-w-0 truncate text-neutral-900 dark:text-white">
        {prefix} <span className="font-semibold">{chain.name}</span> · {chain.networkName} · <span className="font-semibold">{asset.symbol}</span>
      </span>
      <button type="button" onClick={onChange} className="text-orange-500 hover:text-orange-600 shrink-0">
        change
      </button>
    </div>
  );
}

function BurnedSummary({ asset, burned }: { asset: BridgeAsset; burned: PendingReturn[] }) {
  const total = burned.reduce((sum, r) => sum + BigInt(r.amount), 0n);
  const destination = burned[0]?.destination ?? '';
  return (
    <>
      <div className="font-medium text-neutral-900 dark:text-white">Burned on Unicity</div>
      <div className={`text-xs ${MUTED}`}>
        {formatUnits(total, asset.decimals)} {asset.symbol} left this wallet. The same amount is released as {asset.symbol} on{' '}
        {asset.chain.name} to <span className="font-mono break-all">{destination}</span> once the return service has proved the burn.
      </div>
      {burned.map((r) => (
        <div key={r.id} className={`text-xs ${MUTED}`}>
          {burned.length > 1 && `${formatUnits(BigInt(r.amount), asset.decimals)} ${asset.symbol}: `}
          {returnStatusSentence(r, asset.chain.name)}
        </div>
      ))}
      <div className={`text-xs ${MUTED}`}>Open Bridge again to follow it under Returns.</div>
    </>
  );
}

/** Burns waiting for their release, with the service's status for each. */
function ReturnsList({ returns, onDismiss, onRetry }: { returns: PendingReturn[]; onDismiss: (id: string) => void; onRetry: (id: string) => void }) {
  return (
    <div className="pt-2 space-y-2">
      <div className={`text-xs ${MUTED}`}>Returns</div>
      {returns.map((r) => (
        <ReturnRow key={r.id} r={r} onDismiss={onDismiss} onRetry={onRetry} />
      ))}
    </div>
  );
}

function ReturnRow({ r, onDismiss, onRetry }: { r: PendingReturn; onDismiss: (id: string) => void; onRetry: (id: string) => void }) {
  const [addressExpanded, setAddressExpanded] = useState(false);
  const asset = bridgeAssetByCoin(r.coinIdHex);
  const amount = asset ? `${formatUnits(BigInt(r.amount), asset.decimals)} ${asset.symbol}` : r.amount;
  const color = r.status === 'settled' ? 'text-emerald-500' : r.status === 'failed' ? 'text-red-500' : 'text-amber-500';
  const retryable = r.status === 'failed' && r.recoverable === true;
  const toggleAddress = () => setAddressExpanded((v) => !v);
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] text-xs">
      <span className="flex-1 min-w-0">
        <span className="block font-mono text-neutral-900 dark:text-white">
          {amount}{asset ? ` → ${asset.chain.name}` : ''}
        </span>
        <span
          className={`block font-mono cursor-pointer ${MUTED} ${addressExpanded ? 'break-all' : 'truncate'}`}
          title={r.destination}
          role="button"
          tabIndex={0}
          aria-expanded={addressExpanded}
          onClick={toggleAddress}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAddress(); } }}
        >
          {r.destination}
        </span>
        {r.message && r.status === 'failed' && <span className="block text-red-500">{r.message}</span>}
      </span>
      <span className={`shrink-0 ${color}`}>{returnStatusLabel(r.status)}</span>
      {r.settleTxid && asset && <TxLink href={asset.presentation.explorerTxUrl(r.settleTxid)} label="tx" />}
      {retryable && (
        <button
          type="button"
          onClick={() => onRetry(r.id)}
          className="p-1.5 rounded-md text-neutral-400 hover:text-orange-500 hover:bg-orange-500/10"
          title="Send this burn to the service again"
          aria-label="Send this burn to the service again"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
      )}
      {isTerminalReturn(r) && (
        <button
          type="button"
          onClick={() => onDismiss(r.id)}
          className="p-1.5 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-500/10"
          title="Remove this record"
          aria-label="Remove this record"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function returnStatusLabel(status: PendingReturn['status']): string {
  switch (status) {
    case 'burned': return 'burned, sending to the service';
    case 'queued': return 'queued';
    case 'proving': return 'proving';
    case 'proven': return 'proven';
    case 'submitted': return 'settling';
    case 'settled': return 'released';
    case 'failed': return 'failed';
  }
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
                {lock.lockTxid ? (lock.status === 'locked' ? 'locked, not yet minted' : 'lock sent') : 'not signed, nothing is locked'}
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
