/**
 * "Your plan" hero for the free-tier state (testnet, paid plans not yet live).
 * Presents the plan the way a top-tier product surfaces a usage panel —
 * confident type, restraint, live usage meters against the limits, one accent —
 * and frames mainnet as an aspirational roadmap, not a paywall.
 *
 * Motion is purposeful: the card settles in, meters fill and the numbers count
 * up once. Under reduced-motion the final state renders immediately.
 */
import { useEffect, useState } from 'react';
import { motion, animate, useMotionValue, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import type { UtilizationInfo } from '../../services/subscriptionApi';

function CountUp({ to }: { to: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(reduce ? to : 0);

  useEffect(() => {
    if (reduce) {
      setDisplay(to);
      return;
    }
    const controls = animate(mv, to, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return controls.stop;
  }, [to, reduce, mv]);

  return <>{display.toLocaleString()}</>;
}

function UsageMeter({ label, used, max, sublabel }: { label: string; used: number; max: number; sublabel: string }) {
  const reduce = useReducedMotion();
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const bar = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-500' : 'bg-emerald-500';

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-neutral-700 dark:text-white/70">{label}</span>
        <span className="font-mono text-sm tabular-nums text-neutral-500 dark:text-white/50">
          <CountUp to={used} /> / {max.toLocaleString()}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-white/8">
        <motion.div
          className={`h-full rounded-full ${bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: reduce ? 0 : 1, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : 0.15 }}
        />
      </div>
      <div className="mt-1.5 text-xs text-neutral-400 dark:text-white/40">{sublabel}</div>
    </div>
  );
}

export function CurrentPlanShowcase({ util }: { util: UtilizationInfo | null }) {
  const reduce = useReducedMotion();
  const u = util?.utilization;
  const maxDay = u?.maxPerDay ?? util?.plan?.requestsPerDay ?? 0;
  const maxMinute = u?.maxPerMinute ?? util?.plan?.requestsPerMinute ?? 0;

  return (
    <div className="relative mx-auto max-w-xl">
      {/* Subtle overhead glow — depth, not spectacle */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-10 -z-10 mx-auto h-40 max-w-md rounded-full opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(55% 60% at 50% 0%, rgba(16,185,129,0.22), transparent 70%), radial-gradient(45% 50% at 70% 10%, rgba(249,115,22,0.16), transparent 70%)',
        }}
      />

      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden rounded-3xl border border-neutral-200/80 bg-white/70 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.35)] backdrop-blur-sm dark:border-white/10 dark:bg-white/3"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-7 pb-6 sm:p-8 sm:pb-7">
          <div className="min-w-0">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">Free</h2>
            <p className="mt-1.5 text-sm text-neutral-500 dark:text-white/50">
              Generous limits to build and transact — at no cost.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-medium text-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        </div>

        {/* Live usage meters */}
        <div className="space-y-5 border-y border-neutral-200/70 bg-neutral-50/50 px-7 py-6 sm:px-8 dark:border-white/8 dark:bg-white/2">
          <UsageMeter
            label="Today"
            used={u?.consumedPerDay ?? 0}
            max={maxDay}
            sublabel={`${(u?.availablePerDay ?? maxDay).toLocaleString()} commitments remaining`}
          />
          <UsageMeter
            label="This minute"
            used={u?.consumedPerMinute ?? 0}
            max={maxMinute}
            sublabel="Refills continuously"
          />
        </div>

        {/* Mainnet roadmap — aspirational, not a paywall */}
        <div className="flex items-center justify-between gap-3 p-7 pt-6 sm:px-8">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-white/40">
              <Sparkles className="h-3.5 w-3.5 text-orange-500" />
              Coming on mainnet
            </div>
            <p className="text-sm text-neutral-600 dark:text-white/60">
              Higher limits and pro tools, for when you scale up.
            </p>
          </div>
          <ArrowUpRight className="h-5 w-5 shrink-0 text-orange-500/70" />
        </div>
      </motion.div>
    </div>
  );
}
