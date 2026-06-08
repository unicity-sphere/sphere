import { useMemo, useState } from 'react';
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Sliders,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { toHumanReadable, toSmallestUnit } from '@unicitylabs/sphere-sdk';
import { useAgent } from '../../../hooks/useAgent';
import {
  useAgentSupportedTokens,
  type SupportedToken,
} from '../../../hooks/useAgentSupportedTokens';
import { TokenIcon } from '../TokenIcon';
import type { CoinId } from '../../../types/agent';

type PanelMode = 'topup' | 'withdraw' | 'cap' | null;

export function DashboardBalance() {
  const { config, topUp, withdraw, setMaxPerTask } = useAgent();
  const { tokens, isReady } = useAgentSupportedTokens();
  const [openCoin, setOpenCoin] = useState<CoinId | null>(null);
  const [panel, setPanel] = useState<PanelMode>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const portfolio = useMemo(() => {
    if (!config) return { totalUsd: 0, rows: [] as PortfolioRow[] };
    let totalUsd = 0;
    const rows: PortfolioRow[] = tokens.map((token) => {
      const balanceSmallest = BigInt(config.balances[token.coinId] ?? '0');
      const balanceHuman = Number(toHumanReadable(balanceSmallest, token.decimals));
      const usd = balanceHuman * token.priceUsd;
      totalUsd += usd;
      return {
        token,
        balanceSmallest: balanceSmallest.toString(),
        balanceHuman,
        usd,
        capSmallest: config.maxPerTask[token.coinId] ?? '0',
      };
    });
    rows.sort((a, b) => b.usd - a.usd);
    return { totalUsd, rows };
  }, [config, tokens]);

  if (!config) return null;

  const togglePanel = (coinId: CoinId, mode: PanelMode) => {
    setError(null);
    setDraft('');
    if (openCoin === coinId && panel === mode) {
      setOpenCoin(null);
      setPanel(null);
    } else {
      setOpenCoin(coinId);
      setPanel(mode);
    }
  };

  const submit = (row: PortfolioRow) => {
    setError(null);
    if (!draft.trim()) return;
    if (panel === 'topup') {
      try {
        const amount = toSmallestUnit(draft.trim(), row.token.decimals);
        if (amount <= 0n) {
          setError('Enter a positive amount');
          return;
        }
        topUp(row.token.coinId, amount.toString());
        setDraft('');
        setOpenCoin(null);
        setPanel(null);
      } catch {
        setError('Invalid amount');
      }
    } else if (panel === 'withdraw') {
      try {
        const amount = toSmallestUnit(draft.trim(), row.token.decimals);
        if (amount <= 0n) {
          setError('Enter a positive amount');
          return;
        }
        if (amount > BigInt(row.balanceSmallest)) {
          setError(`You only have ${row.balanceHuman} ${row.token.symbol}`);
          return;
        }
        withdraw(row.token.coinId, amount.toString());
        setDraft('');
        setOpenCoin(null);
        setPanel(null);
      } catch {
        setError('Invalid amount');
      }
    } else if (panel === 'cap') {
      try {
        const amount = toSmallestUnit(draft.trim(), row.token.decimals);
        if (amount < 0n) {
          setError('Cap must be ≥ 0');
          return;
        }
        setMaxPerTask(row.token.coinId, amount.toString());
        setDraft('');
        setOpenCoin(null);
        setPanel(null);
      } catch {
        setError('Invalid amount');
      }
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="bg-linear-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-orange-500/20">
        <div className="flex items-center gap-2 mb-2 opacity-90">
          <Wallet className="w-4 h-4" />
          <p className="text-xs font-medium uppercase tracking-wider">Portfolio total</p>
        </div>
        <p className="text-4xl font-bold tracking-tight mb-1">
          ${portfolio.totalUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}
        </p>
        <p className="text-xs opacity-80">
          Across {portfolio.rows.filter((r) => r.balanceHuman > 0).length} tokens · mock prices
        </p>
      </div>

      {!isReady ? (
        <div className="flex items-center justify-center py-10 text-xs text-neutral-500 dark:text-white/45">
          Loading token registry…
        </div>
      ) : (
        <div className="space-y-2">
          {portfolio.rows.map((row) => {
            const isOpen = openCoin === row.token.coinId && panel !== null;
            return (
              <div
                key={row.token.coinId}
                className="rounded-2xl border border-neutral-200 dark:border-white/8 bg-neutral-100 dark:bg-white/4 overflow-hidden"
              >
                <div className="flex items-center gap-3 p-3">
                  <TokenIcon coinId={row.token.coinId} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                      {row.token.symbol}
                    </p>
                    <p className="text-[10px] text-neutral-500 dark:text-white/45 capitalize truncate">
                      {row.token.name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-neutral-900 dark:text-white tabular-nums">
                      {row.balanceHuman.toLocaleString('en-US', { maximumFractionDigits: 6 })}
                    </p>
                    <p className="text-[10px] text-neutral-500 dark:text-white/45 tabular-nums">
                      ${row.usd.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <PanelButton
                      Icon={ArrowDownToLine}
                      title="Top up"
                      active={isOpen && panel === 'topup'}
                      onClick={() => togglePanel(row.token.coinId, 'topup')}
                    />
                    <PanelButton
                      Icon={ArrowUpFromLine}
                      title="Withdraw"
                      active={isOpen && panel === 'withdraw'}
                      onClick={() => togglePanel(row.token.coinId, 'withdraw')}
                    />
                    <PanelButton
                      Icon={Sliders}
                      title="Per-task cap"
                      active={isOpen && panel === 'cap'}
                      onClick={() => togglePanel(row.token.coinId, 'cap')}
                    />
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-neutral-200 dark:border-white/8 bg-white dark:bg-white/4 px-3 py-3">
                    {panel === 'cap' && (
                      <p className="text-[11px] text-neutral-500 dark:text-white/45 mb-2">
                        Current cap:{' '}
                        <span className="font-medium text-neutral-700 dark:text-white/75">
                          {Number(
                            toHumanReadable(row.capSmallest, row.token.decimals),
                          ).toLocaleString('en-US', { maximumFractionDigits: 6 })}{' '}
                          {row.token.symbol}
                        </span>
                        . Set 0 to disable.
                      </p>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder={`Amount (${row.token.symbol})`}
                        autoFocus
                        className="flex-1 bg-neutral-100 dark:bg-white/6 border border-neutral-200 dark:border-white/8 rounded-lg py-2 px-3 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-white/35 focus:outline-none focus:border-orange-500 transition-colors"
                      />
                      <button
                        onClick={() => submit(row)}
                        disabled={!draft.trim()}
                        className="px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {panel === 'topup' ? 'Top up' : panel === 'withdraw' ? 'Withdraw' : 'Set cap'}
                      </button>
                    </div>
                    {error && (
                      <div className="mt-2 flex items-start gap-1.5 text-[11px] text-red-600 dark:text-red-400">
                        <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                        {error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-neutral-400 dark:text-white/35 text-center pt-2 flex items-center justify-center gap-1.5">
        <ChevronDown className="w-3 h-3" />
        USD values use mock prices. Real price feed will be wired in later.
      </p>
    </div>
  );
}

interface PortfolioRow {
  token: SupportedToken;
  balanceSmallest: string;
  balanceHuman: number;
  usd: number;
  capSmallest: string;
}

function PanelButton({
  Icon,
  title,
  active,
  onClick,
}: {
  Icon: typeof ArrowDownToLine;
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
        active
          ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
          : 'text-neutral-500 dark:text-white/55 hover:bg-neutral-200/60 dark:hover:bg-white/8'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
