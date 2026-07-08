/**
 * Placeholder shown in place of the individual paid plans while they aren't
 * purchasable yet (testnet). Deliberately vague — the concrete tiers/prices
 * are not finalized, so it only signals that paid tiers are coming on mainnet.
 * Matches PlanCard's dimensions so it sits cleanly in the plans row.
 */
import { motion, type Variants } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export function PaidPlansComingSoonCard({ variants }: { variants?: Variants }) {
  return (
    <motion.div
      variants={variants}
      className="relative flex w-full flex-col rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 opacity-75 sm:w-58 dark:border-white/12 dark:bg-white/3"
    >
      <span className="absolute right-4 top-4 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-neutral-500 dark:text-white/50">
        Coming on Mainnet
      </span>

      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10">
        <Sparkles className="h-4 w-4 text-orange-500" />
      </div>

      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Paid plans</h3>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500 dark:text-white/45">
        Higher daily and per-minute limits for heavier usage — arriving on mainnet.
      </p>

      <div className="mt-5 min-h-10">
        <div className="w-full rounded-xl border border-neutral-200 py-2 text-center text-sm font-medium text-neutral-400 dark:border-white/10 dark:text-white/40">
          Coming on Mainnet
        </div>
      </div>
    </motion.div>
  );
}
