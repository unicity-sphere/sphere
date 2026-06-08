import { motion } from 'framer-motion';
import {
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Circle,
  Waves,
  Triangle,
  Loader2,
} from 'lucide-react';
import type { AgentAvatar, AgentIntegrations, AgentPersonality } from '../../../types/agent';

interface AgentDoneScreenProps {
  name: string;
  nametag: string;
  avatar: AgentAvatar;
  personality: AgentPersonality;
  integrations: AgentIntegrations;
  isFinishing: boolean;
  onFinish: () => void;
  onBack: () => void;
}

const AVATAR_MAP: Record<AgentAvatar, { Icon: typeof Sparkles; gradient: string }> = {
  spark: { Icon: Sparkles, gradient: 'from-orange-400 to-amber-500' },
  orb: { Icon: Circle, gradient: 'from-purple-400 to-pink-500' },
  wave: { Icon: Waves, gradient: 'from-cyan-400 to-blue-500' },
  prism: { Icon: Triangle, gradient: 'from-emerald-400 to-teal-500' },
};

export function AgentDoneScreen({
  name,
  nametag,
  avatar,
  personality,
  integrations,
  isFinishing,
  onFinish,
  onBack,
}: AgentDoneScreenProps) {
  const { Icon: AvatarIcon, gradient } = AVATAR_MAP[avatar];
  const integrationCount = Object.values(integrations).filter(Boolean).length;

  return (
    <motion.div
      key="agent-done"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.1 }}
      className="relative z-10 w-full max-w-90"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="relative w-18 h-18 mx-auto mb-5"
      >
        <div className={`absolute inset-0 bg-linear-to-br ${gradient} opacity-40 rounded-full blur-xl`} />
        <div className={`relative w-full h-full rounded-full bg-linear-to-br ${gradient} flex items-center justify-center`}>
          <AvatarIcon className="w-9 h-9 text-white" />
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-2xl font-bold text-neutral-900 dark:text-white mb-2 tracking-tight"
      >
        Meet {name}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-neutral-500 dark:text-neutral-400 text-sm mb-5"
      >
        Your AI companion is ready to go.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50 rounded-xl p-4 mb-5 text-left space-y-2"
      >
        <SummaryRow label="Name" value={name} />
        <SummaryRow label="Nametag" value={`@${nametag}`} />
        <SummaryRow label="Personality" value={personality.charAt(0).toUpperCase() + personality.slice(1)} />
        <SummaryRow
          label="Integrations"
          value={integrationCount === 0 ? 'None' : `${integrationCount} connected`}
        />
        <div className="border-t border-neutral-200 dark:border-neutral-700/50 pt-2 mt-2 flex items-start gap-2 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Starter portfolio funded: UCT, BTC, ETH, SOL, USDT, USDC. You can top up or withdraw any time.
          </span>
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onClick={onFinish}
        disabled={isFinishing}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="relative w-full py-3.5 px-5 rounded-xl bg-linear-to-r from-orange-500 to-orange-600 text-white text-sm font-bold shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden group"
      >
        <div className="absolute inset-0 bg-linear-to-r from-orange-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="relative z-10 flex items-center gap-2">
          {isFinishing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Funding wallet…
            </>
          ) : (
            <>
              Go to {name}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </span>
      </motion.button>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={onBack}
        disabled={isFinishing}
        className="w-full mt-2 py-2.5 text-xs text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors disabled:opacity-50"
      >
        Back
      </motion.button>
    </motion.div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="text-neutral-900 dark:text-white font-medium">{value}</span>
    </div>
  );
}
