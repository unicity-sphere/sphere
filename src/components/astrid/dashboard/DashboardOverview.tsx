import { useMemo } from 'react';
import {
  Wallet,
  Boxes,
  Plug,
  TrendingUp,
  Clock,
  ArrowRight,
  ArrowLeftRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  Send,
  Repeat,
  Shuffle,
  CheckCircle2,
  CircleAlert,
} from 'lucide-react';
import { TokenRegistry, toHumanReadable } from '@unicitylabs/sphere-sdk';
import { useAgent, useAgentTasks } from '../../../hooks/useAgent';
import {
  useAgentSupportedTokens,
} from '../../../hooks/useAgentSupportedTokens';
import { getMockPrice } from '../../../utils/mockTokenPrices';
import { TokenIcon } from '../TokenIcon';
import type { AgentTaskType, AgentExecutedTask } from '../../../types/agent';
import type { DashboardTab } from '../AstridDashboard';

interface DashboardOverviewProps {
  onNavigate: (tab: DashboardTab) => void;
}

const TASK_META: Record<AgentTaskType, { label: string; Icon: typeof ArrowLeftRight; accent: string }> = {
  swap:     { label: 'Swap',     Icon: ArrowLeftRight,  accent: 'text-sky-500' },
  buy:      { label: 'Buy',      Icon: ArrowDownToLine, accent: 'text-emerald-500' },
  sell:     { label: 'Sell',     Icon: ArrowUpFromLine, accent: 'text-amber-500' },
  transfer: { label: 'Transfer', Icon: Send,            accent: 'text-violet-500' },
  dca:      { label: 'DCA',      Icon: Repeat,          accent: 'text-indigo-500' },
  bridge:   { label: 'Bridge',   Icon: Shuffle,         accent: 'text-pink-500' },
};

export function DashboardOverview({ onNavigate }: DashboardOverviewProps) {
  const { config, capsules, stats } = useAgent();
  const tasks = useAgentTasks();
  const { tokens } = useAgentSupportedTokens();

  const portfolioUsd = useMemo(() => {
    if (!config) return 0;
    let total = 0;
    for (const token of tokens) {
      const balanceSmallest = config.balances[token.coinId];
      if (!balanceSmallest) continue;
      const human = Number(toHumanReadable(balanceSmallest, token.decimals));
      total += human * token.priceUsd;
    }
    return total;
  }, [config, tokens]);

  const topHoldings = useMemo(() => {
    if (!config) return [] as { coinId: string; symbol: string; usd: number }[];
    return tokens
      .map((t) => {
        const balanceSmallest = config.balances[t.coinId];
        const human = balanceSmallest ? Number(toHumanReadable(balanceSmallest, t.decimals)) : 0;
        return { coinId: t.coinId, symbol: t.symbol, usd: human * t.priceUsd };
      })
      .filter((r) => r.usd > 0)
      .sort((a, b) => b.usd - a.usd)
      .slice(0, 4);
  }, [config, tokens]);

  const recentTasks = useMemo(() => tasks.slice(0, 5), [tasks]);

  const totalSpentUsd = useMemo(
    () =>
      (Object.entries(stats.tasksByType) as [AgentTaskType, { usdValue: number }][]).reduce(
        (sum, [, slot]) => sum + slot.usdValue,
        0,
      ),
    [stats],
  );

  if (!config) return null;

  const activeCapsules = capsules.filter((c) => c.enabled);
  const integrationsCount = Object.values(config.integrations).filter(Boolean).length;
  const lastTaskRelative = stats.lastTaskAt ? formatRelative(stats.lastTaskAt) : 'No activity yet';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard
          label="Portfolio"
          value={`$${portfolioUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
          sublabel={
            topHoldings.length > 0
              ? topHoldings.map((h) => h.symbol).join(' · ')
              : 'Top up to fund tasks'
          }
          Icon={Wallet}
          tone="orange"
          onClick={() => onNavigate('balance')}
        />
        <StatCard
          label="Total spent"
          value={`$${totalSpentUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
          sublabel={`${stats.totalTasks} task${stats.totalTasks === 1 ? '' : 's'} · ${lastTaskRelative}`}
          Icon={TrendingUp}
          tone="emerald"
          onClick={() => onNavigate('stats')}
        />
        <StatCard
          label="Active capsules"
          value={`${activeCapsules.length} / ${capsules.length}`}
          sublabel={activeCapsules.slice(0, 3).map((c) => c.name).join(' · ') || 'None enabled'}
          Icon={Boxes}
          tone="purple"
          onClick={() => onNavigate('capsules')}
        />
        <StatCard
          label="Integrations"
          value={integrationsCount === 0 ? 'None' : `${integrationsCount} connected`}
          sublabel="Telegram · Twitter · Discord"
          Icon={Plug}
          tone="blue"
          onClick={() => onNavigate('integrations')}
        />
      </div>

      {topHoldings.length > 0 && (
        <div className="bg-neutral-100 dark:bg-white/4 border border-neutral-200 dark:border-white/8 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Top holdings</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {topHoldings.map((h) => (
              <div key={h.coinId} className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-white/4">
                <TokenIcon coinId={h.coinId} size={24} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-neutral-900 dark:text-white">{h.symbol}</p>
                  <p className="text-[10px] text-neutral-500 dark:text-white/45 tabular-nums">
                    ${h.usd.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-neutral-100 dark:bg-white/4 border border-neutral-200 dark:border-white/8 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Recent tasks</h3>
        </div>

        {recentTasks.length === 0 ? (
          <div className="flex flex-col items-center text-center py-6">
            <Clock className="w-8 h-8 text-neutral-300 dark:text-white/25 mb-2" />
            <p className="text-xs text-neutral-500 dark:text-white/45">
              Ask {config.name} to do something — like "swap 50 UCT to BTC" — and it'll show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentTasks.map((task) => (
              <RecentTaskRow key={task.id} task={task} />
            ))}
            <button
              onClick={() => onNavigate('stats')}
              className="w-full mt-2 py-2 text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 flex items-center justify-center gap-1 transition-colors"
            >
              View full stats
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function RecentTaskRow({ task }: { task: AgentExecutedTask }) {
  const meta = TASK_META[task.type];
  const sourceDef = TokenRegistry.getInstance().getDefinition(task.sourceCoinId);
  const human = sourceDef
    ? Number(toHumanReadable(task.sourceAmount, sourceDef.decimals ?? 6)).toLocaleString('en-US', {
        maximumFractionDigits: 6,
      })
    : '?';
  const usd = sourceDef
    ? Number(human.replace(/,/g, '')) * getMockPrice(sourceDef.name)
    : 0;
  const StatusIcon = task.status === 'pending' ? Clock : task.status === 'failed' ? CircleAlert : CheckCircle2;
  const statusColor =
    task.status === 'pending'
      ? 'text-amber-500'
      : task.status === 'failed'
        ? 'text-red-500'
        : 'text-emerald-500';

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white dark:bg-white/4">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-neutral-100 dark:bg-white/6 ${meta.accent}`}>
        <meta.Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-neutral-900 dark:text-white truncate">
          {meta.label}: {human} {sourceDef?.symbol ?? ''}
        </p>
        <p className="text-[10px] text-neutral-500 dark:text-white/45">{formatRelative(task.timestamp)}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-medium text-neutral-900 dark:text-white tabular-nums">
          ${usd.toLocaleString('en-US', { maximumFractionDigits: 2 })}
        </p>
      </div>
      <StatusIcon className={`w-3.5 h-3.5 ${statusColor} shrink-0`} />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  sublabel: string;
  Icon: typeof Wallet;
  tone: 'orange' | 'emerald' | 'purple' | 'blue';
  onClick: () => void;
}

const TONE_BG: Record<StatCardProps['tone'], string> = {
  orange: 'bg-orange-500/15 text-orange-500 dark:text-orange-400',
  emerald: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400',
  purple: 'bg-purple-500/15 text-purple-500 dark:text-purple-400',
  blue: 'bg-sky-500/15 text-sky-500 dark:text-sky-400',
};

function StatCard({ label, value, sublabel, Icon, tone, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-neutral-100 dark:bg-white/4 border border-neutral-200 dark:border-white/8 hover:border-orange-500/40 dark:hover:bg-white/6 rounded-2xl p-4 transition-colors group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${TONE_BG[tone]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-neutral-400 dark:text-white/35 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-xs text-neutral-500 dark:text-white/45 mb-0.5">{label}</p>
      <p className="text-lg font-bold text-neutral-900 dark:text-white truncate">{value}</p>
      <p className="text-[10px] text-neutral-400 dark:text-white/35 mt-0.5 truncate">{sublabel}</p>
    </button>
  );
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
