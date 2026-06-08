import { useMemo } from 'react';
import { TokenRegistry, toHumanReadable } from '@unicitylabs/sphere-sdk';
import {
  ArrowLeftRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  Send,
  Repeat,
  Shuffle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import type { AgentExecutedTask, AgentTaskType, CoinId } from '../../types/agent';
import { useAgentTasks } from '../../hooks/useAgent';
import { TokenIcon } from './TokenIcon';

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

interface TaskCardProps {
  taskId: string;
}

export function TaskCard({ taskId }: TaskCardProps) {
  const tasks = useAgentTasks();
  const task = useMemo(() => tasks.find((t) => t.id === taskId), [tasks, taskId]);

  if (!task) return null;
  if (task.status === 'failed') return null;

  const meta = TASK_META[task.type];
  const sourceInfo = describeAmount(task.sourceCoinId, task.sourceAmount);
  const targetInfo =
    task.targetCoinId && task.targetAmount
      ? describeAmount(task.targetCoinId, task.targetAmount)
      : null;

  const StatusIcon = task.status === 'pending' ? Clock : CheckCircle2;
  const statusColor =
    task.status === 'pending' ? 'text-amber-500' : 'text-emerald-500';
  const statusLabel = task.status === 'pending' ? 'Pending' : 'Completed';

  return (
    <div className="mt-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/4 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-200 dark:border-white/8 bg-neutral-50 dark:bg-white/4">
        <meta.Icon className={`w-3.5 h-3.5 ${meta.accent}`} />
        <span className="text-xs font-semibold text-neutral-900 dark:text-white">
          {meta.label}
        </span>
        {task.recurrence && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-white/8 text-neutral-600 dark:text-white/65 capitalize">
            {task.recurrence}
          </span>
        )}
        <div className={`ml-auto flex items-center gap-1 text-[10px] ${statusColor}`}>
          <StatusIcon className="w-3 h-3" />
          {statusLabel}
        </div>
      </div>

      <div className="px-3 py-2.5">
        {task.type === 'transfer' ? (
          <div className="flex items-center gap-2 text-xs">
            <TokenIcon coinId={task.sourceCoinId} size={20} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-neutral-900 dark:text-white truncate">
                {sourceInfo.display} {sourceInfo.symbol}
              </p>
              <p className="text-[10px] text-neutral-500 dark:text-white/45 truncate">
                → {task.recipient}
              </p>
            </div>
          </div>
        ) : task.type === 'bridge' || !targetInfo ? (
          <div className="flex items-center gap-2 text-xs">
            <TokenIcon coinId={task.sourceCoinId} size={20} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-neutral-900 dark:text-white truncate">
                {sourceInfo.display} {sourceInfo.symbol}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <TokenIcon coinId={task.sourceCoinId} size={20} />
              <span className="font-medium text-neutral-900 dark:text-white truncate">
                {sourceInfo.display} {sourceInfo.symbol}
              </span>
            </div>
            <ArrowLeftRight className="w-3 h-3 text-neutral-400 dark:text-white/35 shrink-0" />
            <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
              <span className="font-medium text-neutral-900 dark:text-white truncate text-right">
                {targetInfo.display} {targetInfo.symbol}
              </span>
              <TokenIcon coinId={task.targetCoinId!} size={20} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface DescribedAmount {
  display: string;
  symbol: string;
}

function describeAmount(coinId: CoinId, amount: string): DescribedAmount {
  const def = TokenRegistry.getInstance().getDefinition(coinId);
  const decimals = def?.decimals ?? 6;
  const human = toHumanReadable(amount, decimals);
  const num = Number(human);
  const display = Number.isFinite(num)
    ? num.toLocaleString('en-US', { maximumFractionDigits: 6 })
    : human;
  return {
    display,
    symbol: def?.symbol ?? '?',
  };
}

export type { AgentExecutedTask };
