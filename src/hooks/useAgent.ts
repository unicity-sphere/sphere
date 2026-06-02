import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { STORAGE_KEYS } from '../config/storageKeys';
import type {
  AgentChat,
  AgentConfig,
  AgentIntegrations,
  AgentMessage,
  AgentStats,
  AgentTaskType,
  Capsule,
} from '../types/agent';

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith('sphere_agent_')) fn();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('storage', onStorage);
  };
}

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
  emit();
}

function removeKey(key: string) {
  localStorage.removeItem(key);
  emit();
}

const TASK_TYPES: AgentTaskType[] = [
  'chat',
  'web-search',
  'calendar',
  'code-runner',
  'translator',
  'image-gen',
  'market-data',
];

function emptyStats(): AgentStats {
  const byTaskType = TASK_TYPES.reduce(
    (acc, t) => {
      acc[t] = { tokens: 0, count: 0 };
      return acc;
    },
    {} as AgentStats['byTaskType'],
  );
  return { byTaskType, totalTokens: 0, lastTaskAt: null };
}

const TASK_COST_RANGE: Record<AgentTaskType, [number, number]> = {
  chat: [1, 3],
  'web-search': [5, 15],
  calendar: [2, 5],
  'code-runner': [10, 30],
  translator: [1, 3],
  'image-gen': [40, 120],
  'market-data': [3, 8],
};

const DEFAULT_CAPSULES: Capsule[] = [
  {
    id: 'web-search',
    name: 'Web Search',
    description: 'Lets your agent search the web for fresh information.',
    icon: 'search',
    category: 'Information',
    version: '1.0.0',
    author: 'Sphere Labs',
    enabled: true,
    installedAt: 0,
    taskType: 'web-search',
  },
  {
    id: 'calendar',
    name: 'Calendar',
    description: 'Schedule events and read your upcoming agenda.',
    icon: 'calendar',
    category: 'Productivity',
    version: '1.2.0',
    author: 'Sphere Labs',
    enabled: true,
    installedAt: 0,
    taskType: 'calendar',
  },
  {
    id: 'code-runner',
    name: 'Code Runner',
    description: 'Execute snippets in a sandbox and return results.',
    icon: 'code',
    category: 'Developer',
    version: '0.9.1',
    author: 'Sphere Labs',
    enabled: false,
    installedAt: 0,
    taskType: 'code-runner',
  },
  {
    id: 'translator',
    name: 'Translator',
    description: 'Translate text between 40+ languages on demand.',
    icon: 'languages',
    category: 'Language',
    version: '1.0.0',
    author: 'Sphere Labs',
    enabled: true,
    installedAt: 0,
    taskType: 'translator',
  },
  {
    id: 'image-gen',
    name: 'Image Generation',
    description: 'Generate images from a text prompt.',
    icon: 'image',
    category: 'Creative',
    version: '0.5.0',
    author: 'Sphere Labs',
    enabled: false,
    installedAt: 0,
    taskType: 'image-gen',
  },
  {
    id: 'market-data',
    name: 'Market Data',
    description: 'Live crypto and equity price lookups.',
    icon: 'trending-up',
    category: 'Finance',
    version: '1.1.0',
    author: 'Sphere Labs',
    enabled: false,
    installedAt: 0,
    taskType: 'market-data',
  },
];

function getConfig(): AgentConfig | null {
  return readJSON<AgentConfig>(STORAGE_KEYS.AGENT_CONFIG);
}

function getChats(): AgentChat[] {
  return readJSON<AgentChat[]>(STORAGE_KEYS.AGENT_CHATS) ?? [];
}

function messagesKey(chatId: string) {
  return `${STORAGE_KEYS.AGENT_MESSAGES_PREFIX}${chatId}`;
}

function getMessages(chatId: string): AgentMessage[] {
  return readJSON<AgentMessage[]>(messagesKey(chatId)) ?? [];
}

export function useAgentMessages(chatId: string | null): AgentMessage[] {
  const raw = useSyncExternalStore(
    subscribe,
    () => (chatId ? localStorage.getItem(messagesKey(chatId)) : null),
    () => null,
  );
  return useMemo(() => {
    if (!chatId) return [];
    if (!raw) return [];
    try {
      return JSON.parse(raw) as AgentMessage[];
    } catch {
      return [];
    }
  }, [chatId, raw]);
}

function getStats(): AgentStats {
  return readJSON<AgentStats>(STORAGE_KEYS.AGENT_STATS) ?? emptyStats();
}

function getCapsules(): Capsule[] {
  const stored = readJSON<Capsule[]>(STORAGE_KEYS.AGENT_CAPSULES);
  if (stored && stored.length > 0) return stored;
  const seeded = DEFAULT_CAPSULES.map((c) => ({ ...c, installedAt: Date.now() }));
  writeJSON(STORAGE_KEYS.AGENT_CAPSULES, seeded);
  return seeded;
}

function isOnboardingCompleted(): boolean {
  return localStorage.getItem(STORAGE_KEYS.AGENT_ONBOARDING_COMPLETED) === 'true';
}

const MOCK_REPLIES: string[] = [
  "Got it. I'll take care of that for you.",
  "Here's what I found — let me know if you want to dig deeper.",
  "Done. Anything else you'd like me to handle?",
  "Interesting question. Based on what I know, here's the short answer.",
  "I can help with that. Give me a second to think it through.",
  "Looks straightforward. I've drafted a response below.",
  "Let me break this down step by step for you.",
  "Sure, I can do that — shall I proceed with the default settings?",
];

function pickReply(): string {
  return MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
}

function pickTaskType(content: string, enabledCapsules: Capsule[]): AgentTaskType {
  const lc = content.toLowerCase();
  const match = enabledCapsules.find((c) => {
    if (c.taskType === 'web-search') return /search|find|look up|google/.test(lc);
    if (c.taskType === 'calendar') return /calendar|schedule|meeting|event/.test(lc);
    if (c.taskType === 'code-runner') return /code|run|script|function/.test(lc);
    if (c.taskType === 'translator') return /translate|translation|language/.test(lc);
    if (c.taskType === 'image-gen') return /image|picture|draw|generate/.test(lc);
    if (c.taskType === 'market-data') return /price|market|stock|crypto|btc|eth/.test(lc);
    return false;
  });
  return match?.taskType ?? 'chat';
}

function id() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useAgent() {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => {
      return JSON.stringify({
        c: localStorage.getItem(STORAGE_KEYS.AGENT_CONFIG),
        chats: localStorage.getItem(STORAGE_KEYS.AGENT_CHATS),
        s: localStorage.getItem(STORAGE_KEYS.AGENT_STATS),
        caps: localStorage.getItem(STORAGE_KEYS.AGENT_CAPSULES),
        ob: localStorage.getItem(STORAGE_KEYS.AGENT_ONBOARDING_COMPLETED),
      });
    },
    () => '',
  );

  const data = useMemo(() => {
    void snapshot;
    return {
      config: getConfig(),
      chats: getChats().sort((a, b) => b.lastMessageAt - a.lastMessageAt),
      stats: getStats(),
      capsules: getCapsules(),
      onboardingCompleted: isOnboardingCompleted(),
    };
  }, [snapshot]);

  const createOrUpdateConfig = useCallback((cfg: AgentConfig) => {
    writeJSON(STORAGE_KEYS.AGENT_CONFIG, cfg);
  }, []);

  const updateConfig = useCallback((patch: Partial<AgentConfig>) => {
    const current = getConfig();
    if (!current) return;
    writeJSON(STORAGE_KEYS.AGENT_CONFIG, { ...current, ...patch });
  }, []);

  const updateIntegrations = useCallback((patch: Partial<AgentIntegrations>) => {
    const current = getConfig();
    if (!current) return;
    writeJSON(STORAGE_KEYS.AGENT_CONFIG, {
      ...current,
      integrations: { ...current.integrations, ...patch },
    });
  }, []);

  const topUp = useCallback((amount: number) => {
    const current = getConfig();
    if (!current) return;
    writeJSON(STORAGE_KEYS.AGENT_CONFIG, { ...current, balance: current.balance + amount });
  }, []);

  const withdraw = useCallback((amount: number) => {
    const current = getConfig();
    if (!current) return;
    const next = Math.max(0, current.balance - amount);
    writeJSON(STORAGE_KEYS.AGENT_CONFIG, { ...current, balance: next });
  }, []);

  const setMaxTokensPerTask = useCallback((value: number) => {
    const current = getConfig();
    if (!current) return;
    writeJSON(STORAGE_KEYS.AGENT_CONFIG, { ...current, maxTokensPerTask: value });
  }, []);

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.AGENT_ONBOARDING_COMPLETED, 'true');
    emit();
  }, []);

  const resetOnboarding = useCallback(() => {
    removeKey(STORAGE_KEYS.AGENT_ONBOARDING_COMPLETED);
  }, []);

  const createChat = useCallback((title?: string): AgentChat => {
    const chat: AgentChat = {
      id: id(),
      title: title?.trim() || 'New conversation',
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
      messageCount: 0,
    };
    const all = getChats();
    writeJSON(STORAGE_KEYS.AGENT_CHATS, [chat, ...all]);
    return chat;
  }, []);

  const deleteChat = useCallback((chatId: string) => {
    const all = getChats().filter((c) => c.id !== chatId);
    writeJSON(STORAGE_KEYS.AGENT_CHATS, all);
    removeKey(messagesKey(chatId));
  }, []);

  const renameChat = useCallback((chatId: string, title: string) => {
    const all = getChats().map((c) => (c.id === chatId ? { ...c, title } : c));
    writeJSON(STORAGE_KEYS.AGENT_CHATS, all);
  }, []);

  const getChatMessages = useCallback((chatId: string) => getMessages(chatId), []);

  const sendMessage = useCallback(
    async (chatId: string, content: string): Promise<void> => {
      const trimmed = content.trim();
      if (!trimmed) return;

      const userMsg: AgentMessage = {
        id: id(),
        chatId,
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      };

      const existing = getMessages(chatId);
      const afterUser = [...existing, userMsg];
      writeJSON(messagesKey(chatId), afterUser);

      const chats = getChats().map((c) =>
        c.id === chatId
          ? {
              ...c,
              lastMessageAt: Date.now(),
              messageCount: c.messageCount + 1,
              title: c.messageCount === 0 ? trimmed.slice(0, 40) : c.title,
            }
          : c,
      );
      writeJSON(STORAGE_KEYS.AGENT_CHATS, chats);

      await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));

      const cfg = getConfig();
      const caps = getCapsules().filter((c) => c.enabled);
      const taskType = pickTaskType(trimmed, caps);

      const [minCost, maxCost] = TASK_COST_RANGE[taskType];
      const rawCost = minCost + Math.floor(Math.random() * (maxCost - minCost + 1));
      const cost = Math.min(cfg?.maxTokensPerTask ?? Infinity, rawCost);

      const agentMsg: AgentMessage = {
        id: id(),
        chatId,
        role: 'agent',
        content: pickReply(),
        timestamp: Date.now(),
        taskType,
      };

      const finalMessages = [...getMessages(chatId), agentMsg];
      writeJSON(messagesKey(chatId), finalMessages);

      const chats2 = getChats().map((c) =>
        c.id === chatId
          ? { ...c, lastMessageAt: Date.now(), messageCount: c.messageCount + 1 }
          : c,
      );
      writeJSON(STORAGE_KEYS.AGENT_CHATS, chats2);

      const stats = getStats();
      const slot = stats.byTaskType[taskType] ?? { tokens: 0, count: 0 };
      const nextStats: AgentStats = {
        ...stats,
        byTaskType: {
          ...stats.byTaskType,
          [taskType]: { tokens: slot.tokens + cost, count: slot.count + 1 },
        },
        totalTokens: stats.totalTokens + cost,
        lastTaskAt: Date.now(),
      };
      writeJSON(STORAGE_KEYS.AGENT_STATS, nextStats);

      const cfg2 = getConfig();
      if (cfg2) {
        writeJSON(STORAGE_KEYS.AGENT_CONFIG, {
          ...cfg2,
          balance: Math.max(0, cfg2.balance - cost),
        });
      }
    },
    [],
  );

  const toggleCapsule = useCallback((capsuleId: string) => {
    const all = getCapsules().map((c) =>
      c.id === capsuleId ? { ...c, enabled: !c.enabled } : c,
    );
    writeJSON(STORAGE_KEYS.AGENT_CAPSULES, all);
  }, []);

  return {
    ...data,
    createOrUpdateConfig,
    updateConfig,
    updateIntegrations,
    topUp,
    withdraw,
    setMaxTokensPerTask,
    completeOnboarding,
    resetOnboarding,
    createChat,
    deleteChat,
    renameChat,
    getChatMessages,
    sendMessage,
    toggleCapsule,
  };
}
