import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Send, Twitter, Hash } from 'lucide-react';
import type { AgentIntegrations } from '../../../types/agent';

interface AgentIntegrationsScreenProps {
  integrations: AgentIntegrations;
  onChange: (patch: Partial<AgentIntegrations>) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export function AgentIntegrationsScreen({
  integrations,
  onChange,
  onSubmit,
  onBack,
}: AgentIntegrationsScreenProps) {
  return (
    <motion.div
      key="agent-integrations"
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
        External channels
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-neutral-500 dark:text-neutral-400 text-sm mb-5"
      >
        Optional — connect your agent to messengers. You can add these later in the dashboard.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3 mb-5 text-left"
      >
        <IntegrationField
          Icon={Send}
          label="Telegram bot token"
          placeholder="123456789:AAH..."
          value={integrations.telegram ?? ''}
          onChange={(v) => onChange({ telegram: v || undefined })}
          iconColor="text-sky-500"
        />
        <IntegrationField
          Icon={Twitter}
          label="Twitter / X API key"
          placeholder="API key"
          value={integrations.twitter ?? ''}
          onChange={(v) => onChange({ twitter: v || undefined })}
          iconColor="text-blue-500"
        />
        <IntegrationField
          Icon={Hash}
          label="Discord webhook URL"
          placeholder="https://discord.com/api/webhooks/..."
          value={integrations.discord ?? ''}
          onChange={(v) => onChange({ discord: v || undefined })}
          iconColor="text-indigo-500"
        />
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
        onClick={onSubmit}
        className="w-full mt-3 py-2.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
      >
        Skip
      </motion.button>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={onBack}
        className="w-full mt-1 py-2.5 text-xs text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors flex items-center justify-center gap-1.5"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </motion.button>
    </motion.div>
  );
}

interface IntegrationFieldProps {
  Icon: typeof Send;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  iconColor: string;
}

function IntegrationField({ Icon, label, placeholder, value, onChange, iconColor }: IntegrationFieldProps) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-1.5">
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50 rounded-lg py-2.5 px-3 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-orange-500 focus:bg-white dark:focus:bg-neutral-800 transition-all"
      />
    </div>
  );
}
