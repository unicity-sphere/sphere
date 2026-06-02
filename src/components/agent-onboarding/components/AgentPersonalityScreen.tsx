import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Smile, Briefcase, PartyPopper, Minimize2, Palette } from 'lucide-react';
import type { AgentPersonality } from '../../../types/agent';

interface AgentPersonalityScreenProps {
  personality: AgentPersonality;
  onChange: (value: AgentPersonality) => void;
  onSubmit: () => void;
  onBack: () => void;
}

const PERSONALITIES: {
  id: AgentPersonality;
  label: string;
  description: string;
  Icon: typeof Smile;
}[] = [
  { id: 'friendly', label: 'Friendly', description: 'Warm, casual, encouraging', Icon: Smile },
  { id: 'professional', label: 'Professional', description: 'Polished, precise, focused', Icon: Briefcase },
  { id: 'playful', label: 'Playful', description: 'Witty, energetic, fun', Icon: PartyPopper },
  { id: 'concise', label: 'Concise', description: 'Short answers, no fluff', Icon: Minimize2 },
  { id: 'creative', label: 'Creative', description: 'Imaginative, exploratory', Icon: Palette },
];

export function AgentPersonalityScreen({
  personality,
  onChange,
  onSubmit,
  onBack,
}: AgentPersonalityScreenProps) {
  return (
    <motion.div
      key="agent-personality"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.1 }}
      className="relative z-10 w-full max-w-90"
    >
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-neutral-900 dark:text-white mb-2 tracking-tight"
      >
        Pick a personality
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-neutral-500 dark:text-neutral-400 text-sm mb-5"
      >
        Sets the tone of how your agent talks.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-2 mb-5"
      >
        {PERSONALITIES.map(({ id, label, description, Icon }) => {
          const isActive = id === personality;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-neutral-200 dark:border-neutral-700/50 bg-neutral-100 dark:bg-neutral-800/50 hover:border-neutral-300 dark:hover:border-neutral-600'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isActive ? 'bg-orange-500/20' : 'bg-neutral-200 dark:bg-neutral-700/50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-orange-500 dark:text-orange-400' : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isActive ? 'text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-200'}`}>
                  {label}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
              </div>
              {isActive && (
                <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              )}
            </button>
          );
        })}
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onClick={onSubmit}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="relative w-full py-3.5 px-5 rounded-xl bg-linear-to-r from-orange-500 to-orange-600 text-white text-sm font-bold shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 overflow-hidden group"
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
        transition={{ delay: 0.4 }}
        onClick={onBack}
        className="w-full mt-2 py-2.5 text-xs text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors flex items-center justify-center gap-1.5"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </motion.button>
    </motion.div>
  );
}
