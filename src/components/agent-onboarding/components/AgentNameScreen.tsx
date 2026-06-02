import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Sparkles, Circle, Waves, Triangle } from 'lucide-react';
import type { AgentAvatar } from '../../../types/agent';

interface AgentNameScreenProps {
  name: string;
  onNameChange: (value: string) => void;
  avatar: AgentAvatar;
  onAvatarChange: (value: AgentAvatar) => void;
  onSubmit: () => void;
  onBack: () => void;
}

const AVATARS: { id: AgentAvatar; label: string; Icon: typeof Sparkles; gradient: string }[] = [
  { id: 'spark', label: 'Spark', Icon: Sparkles, gradient: 'from-orange-400 to-amber-500' },
  { id: 'orb', label: 'Orb', Icon: Circle, gradient: 'from-purple-400 to-pink-500' },
  { id: 'wave', label: 'Wave', Icon: Waves, gradient: 'from-cyan-400 to-blue-500' },
  { id: 'prism', label: 'Prism', Icon: Triangle, gradient: 'from-emerald-400 to-teal-500' },
];

export function AgentNameScreen({
  name,
  onNameChange,
  avatar,
  onAvatarChange,
  onSubmit,
  onBack,
}: AgentNameScreenProps) {
  const canSubmit = name.trim().length >= 2;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canSubmit) onSubmit();
  };

  const selected = AVATARS.find((a) => a.id === avatar) ?? AVATARS[0];

  return (
    <motion.div
      key="agent-name"
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
        <div className={`absolute inset-0 bg-linear-to-br ${selected.gradient} opacity-40 rounded-full blur-xl`} />
        <div className={`relative w-full h-full rounded-full bg-linear-to-br ${selected.gradient} flex items-center justify-center`}>
          <selected.Icon className="w-9 h-9 text-white" />
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-2xl font-bold text-neutral-900 dark:text-white mb-2 tracking-tight"
      >
        Name your agent
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-neutral-500 dark:text-neutral-400 text-sm mb-5"
      >
        Give your AI companion an identity.
      </motion.p>

      <motion.input
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Astrid"
        maxLength={24}
        autoFocus
        className="w-full bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50 rounded-xl py-3 px-4 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-orange-500 focus:bg-white dark:focus:bg-neutral-800 transition-all backdrop-blur-sm mb-4"
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mb-5"
      >
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2 text-left">
          Pick an avatar
        </p>
        <div className="grid grid-cols-4 gap-2">
          {AVATARS.map(({ id, label, Icon, gradient }) => {
            const isActive = id === avatar;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onAvatarChange(id)}
                className={`group relative flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                  isActive
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-neutral-200 dark:border-neutral-700/50 bg-neutral-100 dark:bg-neutral-800/50 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <div className={`w-9 h-9 rounded-full bg-linear-to-br ${gradient} flex items-center justify-center`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'text-orange-500 dark:text-orange-400' : 'text-neutral-500 dark:text-neutral-400'}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

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
    </motion.div>
  );
}
