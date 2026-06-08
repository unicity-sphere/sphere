import { useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Clock,
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
import { getMockPrice } from '../../../utils/mockTokenPrices';
import { TokenIcon } from '../TokenIcon';
import type { AgentExecutedTask, AgentTaskType, CoinId } from '../../../types/agent';

const TASK_META: Record<
  AgentTaskType,
  { label: string; Icon: typeof ArrowLeftRight; accent: string }
> = {
  swap:     { label: 'Swap',     Icon: ArrowLeftRight,  accent: 'text-sky-500' },
  buy:      { label: 'Buy',      Icon: ArrowDownToLine, accent: 'text-emerald-500' },
  sell:     { label: 'Sell',     Icon: ArrowUpFromLine, accent: 'text-amber-500' },
  transfer: { label: 'Transfer', Icon: Send,            accent: 'text-violet-500' },
  dca:      { label: 'DCA',      Icon: Repeat,          accent: 'text-indigo-500' },
  bridge:   { label: 'Bridge',   Icon: Shuffle,         accent: 'text-pink-500' },
};

const TASK_BG: Record<AgentTaskType, string> = {
  swap: 'bg-sky-500',
  buy: 'bg-emerald-500',
  sell: 'bg-amber-500',
  transfer: 'bg-violet-500',
  dca: 'bg-indigo-500',
  bridge: 'bg-pink-500',
};

export function DashboardStats() {
  const { stats } = useAgent();
  const tasks = useAgentTasks();

  const completedTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'failed').slice(0, 20),
    [tasks],
  );

  const totalSpentUsd = useMemo(() => {
    return (Object.entries(stats.tasksByType) as [AgentTaskType, { usdValue: number }][]).reduce(
      (sum, [, slot]) => sum + slot.usdValue,
      0,
    );
  }, [stats]);

  const typeEntries = (Object.entries(stats.tasksByType) as [AgentTaskType, { count: number; usdValue: number }][])
    .filter(([, slot]) => slot.count > 0)
    .sort(([, a], [, b]) => b.usdValue - a.usdValue);

  const maxUsd = Math.max(1, ...typeEntries.map(([, s]) => s.usdValue));

  const coinSpend = useMemo(() => {
    const entries: { coinId: CoinId; symbol: string; humanAmount: string; usd: number }[] = [];
    const registry = TokenRegistry.getInstance();
    for (const [coinId, smallest] of Object.entries(stats.spendByCoin)) {
      const def = registry.getDefinition(coinId);
      if (!def) continue;
      const human = Number(toHumanReadable(smallest, def.decimals ?? 6));
      entries.push({
        coinId,
        symbol: def.symbol ?? '?',
        humanAmount: human.toLocaleString('en-US', { maximumFractionDigits: 6 }),
        usd: human * getMockPrice(def.name),
      });
    }
    return entries.sort((a, b) => b.usd - a.usd);
  }, [stats.spendByCoin]);

  if (stats.totalTasks === 0) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex flex-col items-center justify-center text-center py-12">
          <div className="w-12 h-12 rounded-full bg-orange-500/15 flex items-center justify-center mb-3">
            <BarChart3 className="w-6 h-6 text-orange-500 dark:text-orange-400" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">No tasks yet</h3>
          <p className="text-xs text-neutral-500 dark:text-white/45 max-w-xs">
            Give your agent a task in chat — like "swap 50 UCT to BTC" — and the history will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryTile
          label="Tasks completed"
          value={`${stats.totalTasks}`}
          Icon={Activity}
        />
        <SummaryTile
          label="Total spent"
          value={`$${totalSpentUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
          Icon={TrendingUp}
        />
        <SummaryTile
          label="Last task"
          value={stats.lastTaskAt ? formatRelative(stats.lastTaskAt) : '—'}
          Icon={Clock}
        />
      </div>

      <div className="bg-neutral-100 dark:bg-white/4 border border-neutral-200 dark:border-white/8 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Spend by task type</h3>
        </div>

        <div className="space-y-3">
          {typeEntries.map(([type, slot]) => {
            const pct = Math.round((slot.usdValue / maxUsd) * 100);
            const sharePct = totalSpentUsd > 0 ? Math.round((slot.usdValue / totalSpentUsd) * 100) : 0;
            const meta = TASK_META[type];
            return (
              <div key={type}>
                <div className="flex items-center justify-between mb-1 text-xs">
                  <div className="flex items-center gap-2">
                    <meta.Icon className={`w-3.5 h-3.5 ${meta.accent}`} />
                    <span className="font-medium text-neutral-700 dark:text-white/75">
                      {meta.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-500 dark:text-white/55">
                    <span>{slot.count} task{slot.count === 1 ? '' : 's'}</span>
                    <span className="text-neutral-300 dark:text-white/25">·</span>
                    <span className="font-medium text-neutral-900 dark:text-white">
                      ${slot.usdValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-neutral-400 dark:text-white/35 w-9 text-right">
                      {sharePct}%
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-neutral-200 dark:bg-white/6 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${TASK_BG[type]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {coinSpend.length > 0 && (
        <div className="bg-neutral-100 dark:bg-white/4 border border-neutral-200 dark:border-white/8 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">
            Spend by token
          </h3>
          <div className="space-y-2">
            {coinSpend.map((row) => (
              <div
                key={row.coinId}
                className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white dark:bg-white/4"
              >
                <TokenIcon coinId={row.coinId} size={24} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    {row.symbol}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white tabular-nums">
                    {row.humanAmount}
                  </p>
                  <p className="text-[10px] text-neutral-500 dark:text-white/45 tabular-nums">
                    ${row.usd.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-neutral-100 dark:bg-white/4 border border-neutral-200 dark:border-white/8 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">Recent tasks</h3>
        <div className="space-y-1.5">
          {completedTasks.map((task) => (
            <TaskHistoryRow key={task.id} task={task} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, Icon }: { label: string; value: string; Icon: typeof TrendingUp }) {
  return (
    <div className="bg-neutral-100 dark:bg-white/4 border border-neutral-200 dark:border-white/8 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-neutral-500 dark:text-white/55" />
        <p className="text-[11px] text-neutral-500 dark:text-white/45 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-lg font-bold text-neutral-900 dark:text-white truncate">{value}</p>
    </div>
  );
}

function TaskHistoryRow({ task }: { task: AgentExecutedTask }) {
  const meta = TASK_META[task.type];
  const sourceDef = TokenRegistry.getInstance().getDefinition(task.sourceCoinId);
  const sourceHuman = sourceDef
    ? Number(toHumanReadable(task.sourceAmount, sourceDef.decimals ?? 6)).toLocaleString('en-US', {
        maximumFractionDigits: 6,
      })
    : '?';
  const targetDef = task.targetCoinId
    ? TokenRegistry.getInstance().getDefinition(task.targetCoinId)
    : undefined;
  const targetHuman = targetDef && task.targetAmount
    ? Number(toHumanReadable(task.targetAmount, targetDef.decimals ?? 6)).toLocaleString('en-US', {
        maximumFractionDigits: 6,
      })
    : null;

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
          {meta.label}: {sourceHuman} {sourceDef?.symbol ?? ''}
          {task.recipient && ` → ${task.recipient}`}
          {targetHuman && ` → ${targetHuman} ${targetDef?.symbol ?? ''}`}
        </p>
        <p className="text-[10px] text-neutral-500 dark:text-white/45">
          {formatRelative(task.timestamp)}
          {task.recurrence && ` · ${task.recurrence}`}
          {task.capsuleId && ` · ${task.capsuleId}`}
        </p>
      </div>
      <StatusIcon className={`w-3.5 h-3.5 ${statusColor} shrink-0`} />
    </div>
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
