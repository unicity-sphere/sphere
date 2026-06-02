import { useState } from 'react';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Sliders, AlertCircle } from 'lucide-react';
import { useAgent } from '../../../hooks/useAgent';

export function DashboardBalance() {
  const { config, topUp, withdraw, setMaxTokensPerTask } = useAgent();
  const [topUpAmount, setTopUpAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!config) return null;

  const handleTopUp = () => {
    const n = Number(topUpAmount);
    if (!Number.isFinite(n) || n <= 0) {
      setError('Enter a positive amount');
      return;
    }
    topUp(Math.floor(n));
    setTopUpAmount('');
    setError(null);
  };

  const handleWithdraw = () => {
    const n = Number(withdrawAmount);
    if (!Number.isFinite(n) || n <= 0) {
      setError('Enter a positive amount');
      return;
    }
    if (n > config.balance) {
      setError(`You only have ${config.balance} tokens`);
      return;
    }
    withdraw(Math.floor(n));
    setWithdrawAmount('');
    setError(null);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="bg-linear-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-orange-500/20">
        <div className="flex items-center gap-2 mb-2 opacity-90">
          <Wallet className="w-4 h-4" />
          <p className="text-xs font-medium uppercase tracking-wider">Agent balance</p>
        </div>
        <p className="text-4xl font-bold tracking-tight mb-1">
          {config.balance.toLocaleString('en-US')}
        </p>
        <p className="text-xs opacity-80">tokens available</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ActionCard
          Icon={ArrowDownToLine}
          title="Top up"
          description="Add tokens from your wallet"
          inputValue={topUpAmount}
          onInputChange={setTopUpAmount}
          onAction={handleTopUp}
          actionLabel="Add tokens"
          tone="emerald"
        />
        <ActionCard
          Icon={ArrowUpFromLine}
          title="Withdraw"
          description="Move tokens back to your wallet"
          inputValue={withdrawAmount}
          onInputChange={setWithdrawAmount}
          onAction={handleWithdraw}
          actionLabel="Withdraw"
          tone="neutral"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="bg-neutral-100 dark:bg-white/4 border border-neutral-200 dark:border-white/8 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sliders className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Max tokens per task</h3>
        </div>
        <p className="text-xs text-neutral-500 dark:text-white/45 mb-4">
          The agent will never spend more than this on a single task.
        </p>

        <div className="flex items-center gap-3">
          <input
            type="range"
            min={10}
            max={1000}
            step={10}
            value={config.maxTokensPerTask}
            onChange={(e) => setMaxTokensPerTask(Number(e.target.value))}
            className="flex-1 accent-orange-500"
          />
          <div className="w-24 text-right">
            <span className="text-lg font-bold text-neutral-900 dark:text-white">
              {config.maxTokensPerTask}
            </span>
            <span className="text-xs text-neutral-500 dark:text-white/45 ml-1">tokens</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ActionCardProps {
  Icon: typeof Wallet;
  title: string;
  description: string;
  inputValue: string;
  onInputChange: (v: string) => void;
  onAction: () => void;
  actionLabel: string;
  tone: 'emerald' | 'neutral';
}

function ActionCard({
  Icon,
  title,
  description,
  inputValue,
  onInputChange,
  onAction,
  actionLabel,
  tone,
}: ActionCardProps) {
  const buttonClass =
    tone === 'emerald'
      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
      : 'bg-neutral-200 dark:bg-white/8 hover:bg-neutral-300 dark:hover:bg-white/12 text-neutral-700 dark:text-white/75';

  return (
    <div className="bg-neutral-100 dark:bg-white/4 border border-neutral-200 dark:border-white/8 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-neutral-500 dark:text-white/55" />
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</h3>
      </div>
      <p className="text-[11px] text-neutral-500 dark:text-white/45 mb-3">{description}</p>
      <div className="flex gap-2">
        <input
          type="number"
          min={0}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Amount"
          className="flex-1 bg-white dark:bg-white/6 border border-neutral-200 dark:border-white/8 rounded-lg py-2 px-3 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-white/35 focus:outline-none focus:border-orange-500 transition-colors"
        />
        <button
          onClick={onAction}
          disabled={!inputValue}
          className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${buttonClass}`}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
