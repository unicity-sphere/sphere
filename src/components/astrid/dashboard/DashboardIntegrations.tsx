import { useState, useEffect } from 'react';
import { Send, Twitter, Hash, Plug, CheckCircle2, Unplug } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAgent } from '../../../hooks/useAgent';
import type { AgentIntegrations } from '../../../types/agent';

type IntegrationKey = keyof AgentIntegrations;

interface IntegrationMeta {
  key: IntegrationKey;
  label: string;
  description: string;
  placeholder: string;
  Icon: LucideIcon;
  accentClass: string;
  helpText: string;
}

const INTEGRATIONS: IntegrationMeta[] = [
  {
    key: 'telegram',
    label: 'Telegram',
    description: 'Chat with your agent via a Telegram bot',
    placeholder: '123456789:AAH...',
    Icon: Send,
    accentClass: 'bg-sky-500/15 text-sky-500 dark:text-sky-400',
    helpText: 'Create a bot with @BotFather and paste the token here.',
  },
  {
    key: 'twitter',
    label: 'Twitter / X',
    description: 'Let your agent post and reply on X',
    placeholder: 'API key',
    Icon: Twitter,
    accentClass: 'bg-blue-500/15 text-blue-500 dark:text-blue-400',
    helpText: 'Use a developer API key from developer.x.com.',
  },
  {
    key: 'discord',
    label: 'Discord',
    description: 'Send messages through a Discord webhook',
    placeholder: 'https://discord.com/api/webhooks/...',
    Icon: Hash,
    accentClass: 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-400',
    helpText: 'Channel settings → Integrations → New Webhook.',
  },
];

export function DashboardIntegrations() {
  const { config, updateIntegrations } = useAgent();
  if (!config) return null;

  const connectedCount = Object.values(config.integrations).filter(Boolean).length;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Plug className="w-4 h-4 text-orange-500" />
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Integrations</h2>
          <span className="text-xs text-neutral-500 dark:text-white/45">
            {connectedCount} of {INTEGRATIONS.length} connected
          </span>
        </div>
        <p className="text-xs text-neutral-500 dark:text-white/45">
          Connect external channels so your agent can reach you outside Sphere.
        </p>
      </div>

      <div className="space-y-3">
        {INTEGRATIONS.map((meta) => (
          <IntegrationRow
            key={meta.key}
            meta={meta}
            value={config.integrations[meta.key] ?? ''}
            onSave={(v) => updateIntegrations({ [meta.key]: v || undefined })}
          />
        ))}
      </div>
    </div>
  );
}

interface IntegrationRowProps {
  meta: IntegrationMeta;
  value: string;
  onSave: (value: string) => void;
}

function IntegrationRow({ meta, value, onSave }: IntegrationRowProps) {
  const [draft, setDraft] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const isConnected = Boolean(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleConnect = () => {
    onSave(draft.trim());
    setIsEditing(false);
  };

  const handleDisconnect = () => {
    onSave('');
    setDraft('');
    setIsEditing(false);
  };

  const showInput = !isConnected || isEditing;

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        isConnected
          ? 'bg-emerald-500/5 border-emerald-500/30'
          : 'bg-neutral-100 dark:bg-white/4 border-neutral-200 dark:border-white/8'
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.accentClass}`}>
          <meta.Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{meta.label}</h3>
            {isConnected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-white/45 mt-0.5">{meta.description}</p>
        </div>
        {isConnected && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-[11px] text-neutral-500 dark:text-white/55 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {showInput ? (
        <div className="space-y-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={meta.placeholder}
            className="w-full bg-white dark:bg-white/6 border border-neutral-200 dark:border-white/8 rounded-lg py-2 px-3 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-white/35 focus:outline-none focus:border-orange-500 transition-colors"
          />
          <p className="text-[10px] text-neutral-400 dark:text-white/35">{meta.helpText}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleConnect}
              disabled={!draft.trim()}
              className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isConnected ? 'Save' : 'Connect'}
            </button>
            {isConnected && (
              <>
                <button
                  onClick={() => {
                    setDraft(value);
                    setIsEditing(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-neutral-200 dark:bg-white/8 hover:bg-neutral-300 dark:hover:bg-white/12 text-neutral-700 dark:text-white/75 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisconnect}
                  className="ml-auto flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors"
                >
                  <Unplug className="w-3 h-3" />
                  Disconnect
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs">
          <code className="flex-1 truncate bg-neutral-200/60 dark:bg-white/6 text-neutral-600 dark:text-white/65 px-3 py-1.5 rounded-lg font-mono">
            {maskSecret(value)}
          </code>
        </div>
      )}
    </div>
  );
}

function maskSecret(value: string): string {
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 4)}${'•'.repeat(Math.max(4, value.length - 8))}${value.slice(-4)}`;
}
