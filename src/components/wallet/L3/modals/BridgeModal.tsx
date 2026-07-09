/**
 * BridgeModal (06 §W2/§W3) — bridge Tron USDT in (lock → mint, live with
 * TronLink) and out (burn → return service). Modeled on `SendModal`'s step
 * machine. Bridge-in is the demo's live path; bridge-out hands off to the Part-B
 * return service (07) and is shown when a returnable bridged balance exists.
 */
import { useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CheckCircle, Loader2, ExternalLink, AlertTriangle, Trash2 } from 'lucide-react';
import { useTokens } from '../../../../sdk';
import { useBridgeIn } from '../../../../sdk/hooks/payments/useBridgeIn';
import { useBridgeBack, useBridgeClaims } from '../../../../sdk/hooks/payments/useBridgeBack';
import { bridgePresentationFor, getAppTronWallets, type TronWalletProvider } from '../../../../bridge/loadBridges';
import { useSphereContext } from '../../../../sdk/hooks/core/useSphere';
import { getErrorMessage } from '../../../../sdk/errors';
import { isSpendableToken } from '../../../../sdk/tokenVisibility';
import { WalletScreen } from '../../ui/WalletScreen';
import { ModalHeader, Button } from '../../ui';

type Tab = 'in' | 'out';
type InStep = 'form' | 'processing' | 'success';

interface BridgeModalProps {
  isOpen: boolean;
  onClose: (result?: { success: boolean }) => void;
}

export function BridgeModal({ isOpen, onClose }: BridgeModalProps) {
  const { sphere } = useSphereContext();
  const bridges = sphere?.bridges ?? [];

  const [tab, setTab] = useState<Tab>('in');
  const [step, setStep] = useState<InStep>('form');
  const [coinIdHex, setCoinIdHex] = useState<string>(bridges[0]?.coinIdHex ?? '');
  const [amountInput, setAmountInput] = useState('');
  const [maxApprove, setMaxApprove] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { bridgeIn, progress, result, reset } = useBridgeIn();

  // The wallets the picker offers (TronLink always; WalletConnect when configured).
  const wallets = useMemo(() => getAppTronWallets(), []);

  const selectedBridge = useMemo(
    () => bridges.find((b) => b.coinIdHex === coinIdHex) ?? bridges[0],
    [bridges, coinIdHex],
  );

  const close = (success = false) => {
    setStep('form');
    setAmountInput('');
    setError(null);
    reset();
    onClose(success ? { success: true } : undefined);
  };

  const onBridgeIn = async (provider: TronWalletProvider) => {
    if (!selectedBridge) return;
    setError(null);
    const decimals = selectedBridge.decimals;
    const amount = parseUnits(amountInput, decimals);
    if (amount <= 0n) {
      setError('Enter an amount greater than zero.');
      return;
    }
    // The picked wallet supplies the signer; the flow drives it uniformly (08 Phase 3).
    let signer: ReturnType<TronWalletProvider['create']>;
    try {
      signer = provider.create(selectedBridge.chainId);
    } catch (e) {
      setError(getErrorMessage(e));
      return;
    }
    setStep('processing');
    try {
      await bridgeIn({ coinIdHex: selectedBridge.coinIdHex, amount: amount.toString(), maxApprove, signer });
      setStep('success');
    } catch (e) {
      setError(getErrorMessage(e));
      setStep('form');
    }
  };

  if (!isOpen) return null;

  // No bridges configured — nothing to show.
  if (bridges.length === 0) {
    return (
      <WalletScreen isOpen={isOpen} onClose={() => close()}>
        <ModalHeader variant="screen" title="Bridge" onClose={() => close()} />
        <div className="p-6 text-sm text-neutral-500">No bridged assets are configured for this network.</div>
      </WalletScreen>
    );
  }

  return (
    <WalletScreen isOpen={isOpen} onClose={() => close()}>
      <ModalHeader variant="screen" title="Bridge" onClose={() => close()} />

      {/* Tabs */}
      <div className="flex gap-1 p-1 mx-4 mt-2 rounded-xl bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)]">
        <TabButton active={tab === 'in'} onClick={() => setTab('in')} icon={<ArrowDownLeft className="w-4 h-4" />} label="Bridge in" />
        <TabButton active={tab === 'out'} onClick={() => setTab('out')} icon={<ArrowUpRight className="w-4 h-4" />} label="Bridge out" />
      </div>

      <div className="p-4 space-y-4">
        {tab === 'in' && step === 'form' && (
          <>
            <div className="space-y-2">
              <label className="text-xs text-neutral-500">Asset</label>
              <select
                value={selectedBridge?.coinIdHex}
                onChange={(e) => setCoinIdHex(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] text-sm"
              >
                {bridges.map((b) => (
                  <option key={b.coinIdHex} value={b.coinIdHex}>{b.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-neutral-500">Amount</label>
              <input
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] text-lg"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-neutral-500">
              <input type="checkbox" checked={maxApprove} onChange={(e) => setMaxApprove(e.target.checked)} />
              One-time max approve (fewer prompts next time)
            </label>

            <p className="text-xs text-neutral-500">
              You'll sign in your wallet — just the lock if the vault is already approved, otherwise an approval
              first. The bridged token mints immediately and is spendable; it's "final for others" after{' '}
              {selectedBridge?.confirmations} blocks.
            </p>

            {error && (
              <div className="flex items-start gap-2 text-xs text-red-500">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <div className="space-y-2">
              {wallets.map((w) => (
                <Button key={w.id} onClick={() => onBridgeIn(w)} className="w-full">
                  Bridge in with {w.name}
                </Button>
              ))}
            </div>
          </>
        )}

        {tab === 'in' && step === 'processing' && (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
            <div className="text-sm font-medium">{progressLabel(progress?.phase)}</div>
            {progress?.message && <div className="text-xs text-neutral-500">{progress.message}</div>}
            {progress?.lockTxid && selectedBridge && (
              <a href={bridgePresentationFor(selectedBridge.coinIdHex)?.explorerTxUrl(progress.lockTxid)} target="_blank" rel="noreferrer" className="text-xs text-brand-orange inline-flex items-center gap-1">
                lock tx <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {tab === 'in' && step === 'success' && (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
            <div className="text-sm font-medium">Bridged in</div>
            {result && (
              <div className="text-xs text-neutral-500">{selectedBridge?.label} is now spendable in your wallet.</div>
            )}
            <Button onClick={() => close(true)} className="w-full mt-2">Done</Button>
          </div>
        )}

        {tab === 'out' && (
          <BridgeOutPanel
            coinIdHex={selectedBridge?.coinIdHex ?? coinIdHex}
            decimals={selectedBridge?.decimals ?? 6}
          />
        )}
      </div>
    </WalletScreen>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm transition-colors ${
        active ? 'bg-white dark:bg-[rgba(255,255,255,0.1)] text-neutral-900 dark:text-white' : 'text-neutral-500'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * Bridge-out (06 §W3): pick a returnable bridged balance, Tron destination +
 * amount, sign the Unicity burn, hand off to the return service, then track
 * `queued→proving→submitted→settled` (+ self-settle). Burns one token whole — for
 * a partial amount, split first (existing split flow) and burn the child.
 */
function BridgeOutPanel({ coinIdHex, decimals }: { coinIdHex: string; decimals: number }) {
  const { tokens } = useTokens();
  const { bridgeBack, isLoading, error } = useBridgeBack();
  const { claims, dismissReturn } = useBridgeClaims();
  const [dest, setDest] = useState('');
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const presentation = useMemo(() => bridgePresentationFor(coinIdHex), [coinIdHex]);

  // Bridged tokens of this coin the user can return.
  const returnable = useMemo(
    () => (tokens ?? []).filter((t) => t.coinId?.toLowerCase() === coinIdHex && isSpendableToken(t)),
    [coinIdHex, tokens],
  );
  const selectedTokens = useMemo(
    () => returnable.filter((t) => selectedIds.has(t.id)),
    [returnable, selectedIds],
  );
  const selectedAmount = useMemo(
    () => selectedTokens.reduce((sum, t) => sum + BigInt(t.amount ?? '0'), 0n),
    [selectedTokens],
  );

  useEffect(() => {
    setSelectedIds((prev) => {
      const liveIds = new Set(returnable.map((t) => t.id));
      const next = new Set(Array.from(prev).filter((id) => liveIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [returnable]);

  const toggleToken = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setAllSelected = (selected: boolean) => {
    setSelectedIds(selected ? new Set(returnable.map((t) => t.id)) : new Set());
  };

  const onBurn = async () => {
    setLocalErr(null);
    if (selectedTokens.length === 0) {
      setLocalErr('Select at least one token to return.');
      return;
    }
    if (!presentation?.validateAddress(dest)) {
      setLocalErr('Enter a valid Tron (T…) destination address.');
      return;
    }
    try {
      for (const token of selectedTokens) {
        await bridgeBack({ coinIdHex, tokenId: token.id, destination: dest, amount: String(token.amount ?? '0') });
      }
      setSelectedIds(new Set());
    } catch (err) {
      setLocalErr(getErrorMessage(err));
    }
  };

  if (returnable.length === 0) {
    return <p className="text-xs text-neutral-500">No returnable balance — bridge some USDT in first.</p>;
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-neutral-500">Tokens to return</label>
          <button
            type="button"
            onClick={() => setAllSelected(selectedIds.size !== returnable.length)}
            className="text-xs text-brand-orange hover:text-orange-600"
          >
            {selectedIds.size === returnable.length ? 'Clear' : 'All'}
          </button>
        </div>
        <div className="max-h-44 overflow-y-auto rounded-xl bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] divide-y divide-neutral-200 dark:divide-white/10">
          {returnable.map((t) => (
            <label key={t.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-neutral-200/60 dark:hover:bg-white/5">
              <input
                type="checkbox"
                checked={selectedIds.has(t.id)}
                onChange={() => toggleToken(t.id)}
                className="h-4 w-4 accent-orange-500"
              />
              <span className="flex-1 min-w-0">
                <span className="block text-sm">{formatUnits(BigInt(t.amount ?? '0'), decimals)} USDT</span>
                <span className="block truncate text-[11px] font-mono text-neutral-500">{t.id}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="text-xs text-neutral-500">
          Selected {selectedTokens.length} token{selectedTokens.length === 1 ? '' : 's'} · {formatUnits(selectedAmount, decimals)} USDT
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs text-neutral-500">Tron destination</label>
        <input value={dest} onChange={(e) => setDest(e.target.value.trim())} placeholder="T…" className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] text-sm font-mono" />
      </div>
      <p className="text-xs text-neutral-500">
        You sign only the burn — the return service releases USDT to the Tron address (no gas to receive). A passed
        deadline only drops the relayer fee; principal is always claimable (self-settle).
      </p>
      {(localErr || error) && (
        <div className="flex items-start gap-2 text-xs text-red-500"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {localErr || getErrorMessage(error)}</div>
      )}
      <Button onClick={onBurn} className="w-full" disabled={isLoading}>
        {isLoading ? 'Burning…' : selectedTokens.length > 1 ? `Bridge out ${selectedTokens.length} tokens` : 'Bridge out'}
      </Button>

      {claims.length > 0 && (
        <div className="pt-2 space-y-1">
          <div className="text-xs text-neutral-500">Returns</div>
          {claims.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-xs">
              <span className="font-mono text-neutral-500">{c.nullifierHex.slice(0, 10)}…</span>
              <span className={c.status === 'settled' ? 'text-green-500' : 'text-amber-500'}>{c.status}</span>
              {c.settleTxid && (
                <a href={presentation?.explorerTxUrl(c.settleTxid)} target="_blank" rel="noreferrer" className="text-brand-orange inline-flex items-center gap-1">tx <ExternalLink className="w-3 h-3" /></a>
              )}
              <button
                type="button"
                onClick={() => dismissReturn(c.id)}
                className="ml-auto p-1 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-500/10"
                title="Remove return row"
                aria-label="Remove return row"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function progressLabel(phase?: string): string {
  switch (phase) {
    case 'deriving': return 'Preparing…';
    case 'approving': return 'Approving on Tron…';
    case 'locking': return 'Locking on Tron…';
    case 'waiting-lock': return 'Locking on Tron…';
    case 'minting': return 'Minting bridged token…';
    case 'done': return 'Done';
    default: return 'Working…';
  }
}

/** Parse a decimal string into the asset's smallest unit (no float rounding). */
function parseUnits(input: string, decimals: number): bigint {
  const [whole, frac = ''] = input.split('.');
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  const digits = (whole || '0') + fracPadded;
  try {
    return BigInt(digits.replace(/^0+(?=\d)/, ''));
  } catch {
    return 0n;
  }
}

function formatUnits(amount: bigint, decimals: number): string {
  const sign = amount < 0n ? '-' : '';
  const abs = amount < 0n ? -amount : amount;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = abs % base;
  if (decimals === 0 || frac === 0n) return `${sign}${whole.toString()}`;
  return `${sign}${whole.toString()}.${frac.toString().padStart(decimals, '0').replace(/0+$/, '')}`;
}
