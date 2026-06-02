import { BarChart3, TrendingUp, Activity, Clock } from 'lucide-react';
import { useAgent } from '../../../hooks/useAgent';
import type { AgentTaskType } from '../../../types/agent';

const TASK_LABEL: Record<AgentTaskType, string> = {
  chat: 'Chat',
  'web-search': 'Web Search',
  calendar: 'Calendar',
  'code-runner': 'Code Runner',
  translator: 'Translator',
  'image-gen': 'Image Generation',
  'market-data': 'Market Data',
};

const TASK_COLOR: Record<AgentTaskType, string> = {
  chat: 'bg-neutral-400 dark:bg-neutral-500',
  'web-search': 'bg-sky-500',
  calendar: 'bg-emerald-500',
  'code-runner': 'bg-amber-500',
  translator: 'bg-pink-500',
  'image-gen': 'bg-purple-500',
  'market-data': 'bg-indigo-500',
};

export function DashboardStats() {
  const { stats, capsules } = useAgent();

  const taskEntries = (Object.entries(stats.byTaskType) as [AgentTaskType, { tokens: number; count: number }][])
    .filter(([, s]) => s.count > 0)
    .sort(([, a], [, b]) => b.tokens - a.tokens);

  const maxTokens = Math.max(1, ...taskEntries.map(([, s]) => s.tokens));
  const totalTasks = taskEntries.reduce((sum, [, s]) => sum + s.count, 0);

  if (taskEntries.length === 0) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex flex-col items-center justify-center text-center py-12">
          <div className="w-12 h-12 rounded-full bg-orange-500/15 flex items-center justify-center mb-3">
            <BarChart3 className="w-6 h-6 text-orange-500 dark:text-orange-400" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">No activity yet</h3>
          <p className="text-xs text-neutral-500 dark:text-white/45 max-w-xs">
            Start chatting with your agent. Spend per task type will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryTile
          label="Total spent"
          value={`${stats.totalTokens.toLocaleString()} tokens`}
          Icon={TrendingUp}
        />
        <SummaryTile
          label="Tasks completed"
          value={`${totalTasks}`}
          Icon={Activity}
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
          {taskEntries.map(([type, s]) => {
            const pct = Math.round((s.tokens / maxTokens) * 100);
            const sharePct = stats.totalTokens > 0 ? Math.round((s.tokens / stats.totalTokens) * 100) : 0;
            const capsule = capsules.find((c) => c.taskType === type);
            return (
              <div key={type}>
                <div className="flex items-center justify-between mb-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${TASK_COLOR[type]}`} />
                    <span className="font-medium text-neutral-700 dark:text-white/75">
                      {TASK_LABEL[type]}
                    </span>
                    {capsule && !capsule.enabled && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-white/8 text-neutral-500 dark:text-white/45">
                        Capsule off
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-neutral-500 dark:text-white/55">
                    <span>{s.count} task{s.count === 1 ? '' : 's'}</span>
                    <span className="text-neutral-300 dark:text-white/25">·</span>
                    <span className="font-medium text-neutral-900 dark:text-white">
                      {s.tokens} tokens
                    </span>
                    <span className="text-neutral-400 dark:text-white/35 w-9 text-right">
                      {sharePct}%
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-neutral-200 dark:bg-white/6 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${TASK_COLOR[type]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
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
