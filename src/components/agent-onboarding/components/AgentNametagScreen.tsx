import { motion } from 'framer-motion';
import { Bot, ArrowRight, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { NametagAvailability } from '../hooks/useAgentOnboarding';

interface AgentNametagScreenProps {
  nametagInput: string;
  availability: NametagAvailability;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  error: string | null;
}

export function AgentNametagScreen({
  nametagInput,
  availability,
  onChange,
  onSubmit,
  onBack,
  error,
}: AgentNametagScreenProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    if (/^[a-z0-9_\-.]*$/.test(value)) {
      onChange(value);
    }
  };

  const canSubmit =
    nametagInput.length >= 3 && availability !== 'taken' && availability !== 'checking';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canSubmit) onSubmit();
  };

  return (
    <motion.div
      key="agent-nametag"
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
          <Bot className="w-9 h-9 text-orange-500 dark:text-orange-400" />
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-2xl font-bold text-neutral-900 dark:text-white mb-2 tracking-tight"
      >
        Agent nametag
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-neutral-500 dark:text-neutral-400 text-sm mb-5"
      >
        Your agent gets its own{' '}
        <span className="text-orange-500 dark:text-orange-400 font-bold">@nametag</span>{' '}
        so others can DM it on Sphere.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative mb-4 group"
      >
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
          {availability === 'checking' && <Loader2 className="w-3.5 h-3.5 text-neutral-400 animate-spin" />}
          {availability === 'available' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
          {availability === 'taken' && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
          <span className="text-neutral-400 dark:text-neutral-500 group-focus-within:text-orange-500 dark:group-focus-within:text-orange-400 transition-colors text-xs font-medium">
            @unicity
          </span>
        </div>
        <input
          type="text"
          value={nametagInput}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="astrid"
          autoFocus
          className={`w-full bg-neutral-100 dark:bg-neutral-800/50 border rounded-xl py-3 pl-3 pr-28 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:bg-white dark:focus:bg-neutral-800 transition-all backdrop-blur-sm ${
            availability === 'taken'
              ? 'border-red-400 dark:border-red-500/50 focus:border-red-500'
              : availability === 'available'
                ? 'border-emerald-400 dark:border-emerald-500/50 focus:border-emerald-500'
                : 'border-neutral-200 dark:border-neutral-700/50 focus:border-orange-500'
          }`}
        />
      </motion.div>

      <div className="h-5 -mt-2 mb-1">
        {availability === 'taken' && (
          <p className="text-red-500 dark:text-red-400 text-xs">@{nametagInput} is already taken</p>
        )}
        {availability === 'available' && (
          <p className="text-emerald-500 dark:text-emerald-400 text-xs">@{nametagInput} is available</p>
        )}
      </div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onClick={onSubmit}
        disabled={!canSubmit}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="relative w-full py-3.5 px-5 rounded-xl bg-linear-to-r from-orange-500 to-orange-600 text-white text-sm font-bold shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden group"
      >
        <div className="absolute inset-0 bg-linear-to-r from-orange-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="relative z-10 flex items-center gap-2">
          Continue
          <ArrowRight className="w-4 h-4" />
        </span>
      </motion.button>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={onBack}
        className="w-full mt-2 py-2.5 text-xs text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors flex items-center justify-center gap-1.5"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </motion.button>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-red-500 dark:text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-2 rounded-lg"
        >
          {error}
        </motion.p>
      )}
    </motion.div>
  );
}
