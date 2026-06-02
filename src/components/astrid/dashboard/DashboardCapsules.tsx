import {
  Search,
  Calendar,
  Code,
  Languages,
  Image,
  TrendingUp,
  Boxes,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAgent } from '../../../hooks/useAgent';
import type { Capsule } from '../../../types/agent';

const ICON_MAP: Record<string, LucideIcon> = {
  search: Search,
  calendar: Calendar,
  code: Code,
  languages: Languages,
  image: Image,
  'trending-up': TrendingUp,
};

export function DashboardCapsules() {
  const { capsules, toggleCapsule } = useAgent();
  const enabled = capsules.filter((c) => c.enabled);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Boxes className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Capsules</h2>
            <span className="text-xs text-neutral-500 dark:text-white/45">
              {enabled.length} / {capsules.length} enabled
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-white/45">
            Extend your agent with plugins. Toggle them on or off any time.
          </p>
        </div>

        <button
          type="button"
          disabled
          title="Explore page coming soon"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-100 dark:bg-white/6 border border-dashed border-neutral-300 dark:border-white/15 text-xs font-medium text-neutral-400 dark:text-white/35 cursor-not-allowed opacity-70"
        >
          <Plus className="w-3.5 h-3.5" />
          Add capsule
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {capsules.map((c) => (
          <CapsuleCard key={c.id} capsule={c} onToggle={() => toggleCapsule(c.id)} />
        ))}
      </div>
    </div>
  );
}

interface CapsuleCardProps {
  capsule: Capsule;
  onToggle: () => void;
}

function CapsuleCard({ capsule, onToggle }: CapsuleCardProps) {
  const Icon = ICON_MAP[capsule.icon] ?? Boxes;
  return (
    <div
      className={`relative p-4 rounded-2xl border transition-colors ${
        capsule.enabled
          ? 'bg-orange-500/5 border-orange-500/30'
          : 'bg-neutral-100 dark:bg-white/4 border-neutral-200 dark:border-white/8'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            capsule.enabled
              ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
              : 'bg-neutral-200 dark:bg-white/8 text-neutral-500 dark:text-white/55'
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
              {capsule.name}
            </h3>
            {capsule.enabled && (
              <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            )}
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-white/45 mt-0.5 line-clamp-2">
            {capsule.description}
          </p>
          <div className="flex items-center gap-2 mt-2 text-[10px] text-neutral-400 dark:text-white/35">
            <span>v{capsule.version}</span>
            <span>·</span>
            <span>{capsule.category}</span>
            <span>·</span>
            <span>by {capsule.author}</span>
          </div>
        </div>

        <Toggle enabled={capsule.enabled} onToggle={onToggle} />
      </div>
    </div>
  );
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      className={`relative shrink-0 w-9 h-5 rounded-full transition-colors ${
        enabled ? 'bg-orange-500' : 'bg-neutral-300 dark:bg-white/15'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
          enabled ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
