import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, MessageSquare, Wallet, Zap } from 'lucide-react';

interface AgentIntroScreenProps {
  onStart: () => void;
  onSkip: () => void;
}

export function AgentIntroScreen({ onStart, onSkip }: AgentIntroScreenProps) {
  return (
    <motion.div
      key="agent-intro"
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
        <div className="absolute inset-0 bg-orange-500/30 rounded-full blur-xl" />
        <div className="relative w-full h-full rounded-full bg-neutral-100 dark:bg-neutral-800/80 border-2 border-orange-500/50 flex items-center justify-center backdrop-blur-sm">
          <Sparkles className="w-9 h-9 text-orange-500 dark:text-orange-400" />
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-2xl font-bold text-neutral-900 dark:text-white mb-2 tracking-tight"
      >
        Meet your AI companion
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-neutral-500 dark:text-neutral-400 text-sm mb-5 leading-relaxed"
      >
        Set up your personal{' '}
        <span className="text-orange-500 dark:text-orange-400 font-bold">AI agent</span>{' '}
        that lives on Sphere and works for you across messengers.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-2 mb-6 text-left"
      >
        {[
          { Icon: MessageSquare, text: 'Chat with it directly or wire it to Telegram, Twitter, Discord' },
          { Icon: Zap, text: 'Extend it with capsules — calendar, web search, code runner, and more' },
          { Icon: Wallet, text: 'Fund a balance and cap spend per task — you stay in control' },
        ].map(({ Icon, text }, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50"
          >
            <div className="w-7 h-7 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0">
              <Icon className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed pt-0.5">
              {text}
            </p>
          </div>
        ))}
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onClick={onStart}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="relative w-full py-3.5 px-5 rounded-xl bg-linear-to-r from-orange-500 to-orange-600 text-white text-sm font-bold shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 overflow-hidden group"
      >
        <div className="absolute inset-0 bg-linear-to-r from-orange-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="relative z-10 flex items-center gap-2">
          Create agent
          <ArrowRight className="w-4 h-4" />
        </span>
      </motion.button>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={onSkip}
        className="w-full mt-3 py-2.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
      >
        Skip for now
      </motion.button>
    </motion.div>
  );
}
