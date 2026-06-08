import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  TokenRegistry,
  getCoinIdBySymbol,
  toHumanReadable,
  toSmallestUnit,
} from '@unicitylabs/sphere-sdk';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getMockPrice } from '../utils/mockTokenPrices';
import type {
  AgentChat,
  AgentConfig,
  AgentExecutedTask,
  AgentIntegrations,
  AgentMessage,
  AgentStats,
  AgentTaskType,
  Capsule,
  CapsuleId,
  CoinId,
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

const TASK_TYPES: AgentTaskType[] = ['swap', 'buy', 'sell', 'dca', 'transfer', 'bridge'];

function emptyStats(): AgentStats {
  const tasksByType = TASK_TYPES.reduce(
    (acc, t) => {
      acc[t] = { count: 0, usdValue: 0 };
      return acc;
    },
    {} as AgentStats['tasksByType'],
  );
  return { tasksByType, spendByCoin: {}, totalTasks: 0, lastTaskAt: null };
}

const DEFAULT_CAPSULES: Capsule[] = [
  {
    id: 'spot-trader',
    name: 'Spot Trader',
    description: 'Execute spot swaps between supported tokens.',
    icon: 'arrow-left-right',
    category: 'Trading',
    version: '1.0.0',
    author: 'Sphere Labs',
    enabled: true,
    installedAt: 0,
    taskTypes: ['swap', 'buy', 'sell'],
  },
  {
    id: 'dca-bot',
    name: 'DCA Bot',
    description: 'Schedule recurring buys to dollar-cost average.',
    icon: 'repeat',
    category: 'Trading',
    version: '1.0.0',
    author: 'Sphere Labs',
    enabled: true,
    installedAt: 0,
    taskTypes: ['dca'],
  },
  {
    id: 'limit-orders',
    name: 'Limit Order Watcher',
    description: 'Place limit orders that trigger when targets are hit.',
    icon: 'gauge',
    category: 'Trading',
    version: '0.9.0',
    author: 'Sphere Labs',
    enabled: false,
    installedAt: 0,
    taskTypes: [],
  },
  {
    id: 'rebalancer',
    name: 'Portfolio Rebalancer',
    description: 'Keep your portfolio aligned to a target allocation.',
    icon: 'pie-chart',
    category: 'Portfolio',
    version: '0.5.0',
    author: 'Sphere Labs',
    enabled: false,
    installedAt: 0,
    taskTypes: [],
  },
  {
    id: 'bridge',
    name: 'Cross-chain Bridge',
    description: 'Move tokens between chains through trusted bridges.',
    icon: 'shuffle',
    category: 'Infra',
    version: '1.0.0',
    author: 'Sphere Labs',
    enabled: false,
    installedAt: 0,
    taskTypes: ['bridge'],
  },
  {
    id: 'sentiment',
    name: 'News Sentiment',
    description: 'Track news sentiment for the tokens you hold.',
    icon: 'newspaper',
    category: 'Signals',
    version: '0.4.0',
    author: 'Sphere Labs',
    enabled: false,
    installedAt: 0,
    taskTypes: [],
  },
];

function wipeAgentState() {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith('sphere_agent_')) localStorage.removeItem(key);
  }
}

function getConfig(): AgentConfig | null {
  const raw = readJSON<Partial<AgentConfig> & { balance?: number }>(STORAGE_KEYS.AGENT_CONFIG);
  if (!raw) return null;
  // Detect pre-multi-coin shape: had a single `balance: number` and no
  // `balances` map. Wipe all agent state so onboarding seeds fresh balances.
  if (raw.balance !== undefined && !raw.balances) {
    wipeAgentState();
    return null;
  }
  return {
    name: raw.name ?? '',
    nametag: raw.nametag ?? '',
    personality: raw.personality ?? 'friendly',
    avatar: raw.avatar ?? 'spark',
    integrations: raw.integrations ?? {},
    createdAt: raw.createdAt ?? Date.now(),
    balances: raw.balances && typeof raw.balances === 'object' ? raw.balances : {},
    maxPerTask: raw.maxPerTask && typeof raw.maxPerTask === 'object' ? raw.maxPerTask : {},
  };
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

function getStats(): AgentStats {
  const raw = readJSON<Partial<AgentStats>>(STORAGE_KEYS.AGENT_STATS);
  const empty = emptyStats();
  if (!raw) return empty;
  return {
    tasksByType: { ...empty.tasksByType, ...(raw.tasksByType ?? {}) },
    spendByCoin: raw.spendByCoin && typeof raw.spendByCoin === 'object' ? raw.spendByCoin : {},
    totalTasks: typeof raw.totalTasks === 'number' ? raw.totalTasks : 0,
    lastTaskAt: typeof raw.lastTaskAt === 'number' ? raw.lastTaskAt : null,
  };
}

function getTasks(): AgentExecutedTask[] {
  return readJSON<AgentExecutedTask[]>(STORAGE_KEYS.AGENT_TASKS) ?? [];
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

// ----- Mock chat reply pool -----
const MOCK_REPLIES_CHAT: string[] = [
  "Got it. Anything else you'd like me to handle?",
  "Sure. What else?",
  "Noted. I'll keep an eye on it.",
  "Happy to help — just let me know what to do next.",
  "Tell me more about what you'd like me to do.",
];

function pickChatReply(): string {
  return MOCK_REPLIES_CHAT[Math.floor(Math.random() * MOCK_REPLIES_CHAT.length)];
}

function id() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ----- Task parser -----
interface ParsedCommand {
  type: AgentTaskType;
  sourceSymbol?: string;
  sourceAmount?: string;
  targetSymbol?: string;
  recipient?: string;
  recurrence?: 'daily' | 'weekly' | 'monthly';
}

function parseCommand(text: string): ParsedCommand | null {
  const lc = text.trim();

  let m = lc.match(/\bswap\s+([\d.]+)\s+([a-z]{2,8})\s+(?:to|for|into)\s+([a-z]{2,8})/i);
  if (m) {
    return {
      type: 'swap',
      sourceAmount: m[1],
      sourceSymbol: m[2].toUpperCase(),
      targetSymbol: m[3].toUpperCase(),
    };
  }

  m = lc.match(/\bbuy\s+([a-z]{2,8})\s+(?:for|with)\s+([\d.]+)\s+([a-z]{2,8})/i);
  if (m) {
    return {
      type: 'buy',
      targetSymbol: m[1].toUpperCase(),
      sourceAmount: m[2],
      sourceSymbol: m[3].toUpperCase(),
    };
  }

  m = lc.match(/\bbuy\s+([\d.]+)\s+([a-z]{2,8})/i);
  if (m) {
    return {
      type: 'buy',
      targetSymbol: m[2].toUpperCase(),
      sourceAmount: m[1],
      sourceSymbol: 'USDT',
    };
  }

  m = lc.match(/\bsell\s+([\d.]+)\s+([a-z]{2,8})(?:\s+(?:to|for)\s+([a-z]{2,8}))?/i);
  if (m) {
    return {
      type: 'sell',
      sourceAmount: m[1],
      sourceSymbol: m[2].toUpperCase(),
      targetSymbol: (m[3] ?? 'USDT').toUpperCase(),
    };
  }

  m = lc.match(/\b(?:send|transfer)\s+([\d.]+)\s+([a-z]{2,8})\s+to\s+(@?[a-z0-9_-]+)/i);
  if (m) {
    return {
      type: 'transfer',
      sourceAmount: m[1],
      sourceSymbol: m[2].toUpperCase(),
      recipient: m[3],
    };
  }

  m = lc.match(/\bdca\s+([\d.]+)\s+([a-z]{2,8})\s+(?:to|into)\s+([a-z]{2,8})(?:\s+(daily|weekly|monthly))?/i);
  if (m) {
    return {
      type: 'dca',
      sourceAmount: m[1],
      sourceSymbol: m[2].toUpperCase(),
      targetSymbol: m[3].toUpperCase(),
      recurrence: (m[4] as 'daily' | 'weekly' | 'monthly' | undefined) ?? 'daily',
    };
  }

  m = lc.match(/\bbridge\s+([\d.]+)\s+([a-z]{2,8})/i);
  if (m) {
    return {
      type: 'bridge',
      sourceAmount: m[1],
      sourceSymbol: m[2].toUpperCase(),
    };
  }

  return null;
}

interface TokenMeta {
  coinId: CoinId;
  name: string;
  symbol: string;
  decimals: number;
  priceUsd: number;
}

function resolveTokenBySymbol(symbol: string): TokenMeta | null {
  const coinId = getCoinIdBySymbol(symbol);
  if (!coinId) return null;
  const def = TokenRegistry.getInstance().getDefinition(coinId);
  if (!def || def.assetKind !== 'fungible') return null;
  return {
    coinId: def.id,
    name: def.name,
    symbol: def.symbol ?? symbol,
    decimals: def.decimals ?? 6,
    priceUsd: getMockPrice(def.name),
  };
}

function bigintMin(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

function executeTask(
  parsed: ParsedCommand,
  chatId: string,
  cfg: AgentConfig,
  enabledCapsules: Capsule[],
): { task: AgentExecutedTask; reply: string; updatedBalances: Record<CoinId, string> } {
  const sourceMeta = parsed.sourceSymbol ? resolveTokenBySymbol(parsed.sourceSymbol) : null;
  const targetMeta = parsed.targetSymbol ? resolveTokenBySymbol(parsed.targetSymbol) : null;

  const fail = (reason: string): ReturnType<typeof executeTask> => ({
    task: {
      id: id(),
      type: parsed.type,
      status: 'failed',
      sourceCoinId: sourceMeta?.coinId ?? '',
      sourceAmount: '0',
      targetCoinId: targetMeta?.coinId,
      recipient: parsed.recipient,
      recurrence: parsed.recurrence,
      timestamp: Date.now(),
      chatId,
    },
    reply: reason,
    updatedBalances: cfg.balances,
  });

  if (!sourceMeta) return fail(`I don't recognise the token "${parsed.sourceSymbol}".`);
  if (!parsed.sourceAmount) return fail("Please specify an amount.");
  if ((parsed.type === 'swap' || parsed.type === 'buy' || parsed.type === 'sell' || parsed.type === 'dca') && !targetMeta) {
    return fail(`I don't recognise the target token "${parsed.targetSymbol}".`);
  }

  const requiredCapsule = capsuleForTask(parsed.type, enabledCapsules);
  if (requiredCapsule.gated && !requiredCapsule.capsule) {
    return fail(
      `That requires the ${requiredCapsule.requiredName} capsule. Enable it in your dashboard and try again.`,
    );
  }

  let amountSmallest: bigint;
  try {
    amountSmallest = toSmallestUnit(parsed.sourceAmount, sourceMeta.decimals);
  } catch {
    return fail(`Invalid amount "${parsed.sourceAmount}".`);
  }

  const balanceSmallest = BigInt(cfg.balances[sourceMeta.coinId] ?? '0');
  if (amountSmallest > balanceSmallest) {
    const have = toHumanReadable(balanceSmallest, sourceMeta.decimals);
    return fail(
      `Insufficient ${sourceMeta.symbol} balance. You have ${have} ${sourceMeta.symbol}.`,
    );
  }

  const capSmallest = BigInt(cfg.maxPerTask[sourceMeta.coinId] ?? '0');
  if (capSmallest > 0n && amountSmallest > capSmallest) {
    const cap = toHumanReadable(capSmallest, sourceMeta.decimals);
    return fail(
      `Amount exceeds your per-task cap of ${cap} ${sourceMeta.symbol}. Adjust it in the Balance tab.`,
    );
  }

  // Compute target amount via mock price ratio
  let targetAmountSmallest: bigint | undefined;
  if (targetMeta && sourceMeta.priceUsd > 0 && targetMeta.priceUsd > 0) {
    const humanSource = Number(toHumanReadable(amountSmallest, sourceMeta.decimals));
    const humanTarget = (humanSource * sourceMeta.priceUsd) / targetMeta.priceUsd;
    targetAmountSmallest = toSmallestUnit(
      humanTarget.toFixed(Math.min(targetMeta.decimals, 12)),
      targetMeta.decimals,
    );
  }

  const updatedBalances: Record<CoinId, string> = { ...cfg.balances };
  if (parsed.type !== 'dca') {
    updatedBalances[sourceMeta.coinId] = (balanceSmallest - amountSmallest).toString();
    if (targetMeta && targetAmountSmallest != null) {
      const prev = BigInt(updatedBalances[targetMeta.coinId] ?? '0');
      updatedBalances[targetMeta.coinId] = (prev + targetAmountSmallest).toString();
    }
  }

  const task: AgentExecutedTask = {
    id: id(),
    type: parsed.type,
    status: parsed.type === 'dca' ? 'pending' : 'completed',
    sourceCoinId: sourceMeta.coinId,
    sourceAmount: amountSmallest.toString(),
    targetCoinId: targetMeta?.coinId,
    targetAmount: targetAmountSmallest?.toString(),
    recipient: parsed.recipient,
    recurrence: parsed.recurrence,
    timestamp: Date.now(),
    chatId,
    capsuleId: requiredCapsule.capsule?.id,
  };

  const humanSource = toHumanReadable(amountSmallest, sourceMeta.decimals);
  let reply = '';
  switch (parsed.type) {
    case 'swap':
    case 'buy':
      reply = `Done. Swapped ${humanSource} ${sourceMeta.symbol} for ${targetMeta && targetAmountSmallest ? toHumanReadable(targetAmountSmallest, targetMeta.decimals) : '?'} ${targetMeta?.symbol ?? ''}.`;
      break;
    case 'sell':
      reply = `Sold ${humanSource} ${sourceMeta.symbol} for ${targetMeta && targetAmountSmallest ? toHumanReadable(targetAmountSmallest, targetMeta.decimals) : '?'} ${targetMeta?.symbol ?? ''}.`;
      break;
    case 'transfer':
      reply = `Sent ${humanSource} ${sourceMeta.symbol} to ${parsed.recipient}.`;
      break;
    case 'dca': {
      const cadence = parsed.recurrence ?? 'daily';
      reply = `DCA scheduled: ${humanSource} ${sourceMeta.symbol} into ${targetMeta?.symbol ?? '?'} ${cadence}. I'll execute the first run shortly.`;
      break;
    }
    case 'bridge':
      reply = `Bridged ${humanSource} ${sourceMeta.symbol}. Funds should land on the destination chain shortly.`;
      break;
  }

  return { task, reply, updatedBalances };
}

interface CapsuleResolution {
  gated: boolean;
  requiredName?: string;
  capsule?: Capsule;
}

function capsuleForTask(type: AgentTaskType, enabledCapsules: Capsule[]): CapsuleResolution {
  const requirements: Record<AgentTaskType, { id: CapsuleId; name: string } | null> = {
    swap: { id: 'spot-trader', name: 'Spot Trader' },
    buy: { id: 'spot-trader', name: 'Spot Trader' },
    sell: { id: 'spot-trader', name: 'Spot Trader' },
    dca: { id: 'dca-bot', name: 'DCA Bot' },
    bridge: { id: 'bridge', name: 'Cross-chain Bridge' },
    transfer: null,
  };
  const req = requirements[type];
  if (!req) return { gated: false };
  const capsule = enabledCapsules.find((c) => c.id === req.id);
  return { gated: true, requiredName: req.name, capsule };
}

export function useAgentMessages(chatId: string | null): AgentMessage[] {
  const raw = useSyncExternalStore(
    subscribe,
    () => (chatId ? localStorage.getItem(messagesKey(chatId)) : null),
    () => null,
  );
  return useMemo(() => {
    if (!chatId || !raw) return [];
    try {
      return JSON.parse(raw) as AgentMessage[];
    } catch {
      return [];
    }
  }, [chatId, raw]);
}

export function useAgentTasks(): AgentExecutedTask[] {
  const raw = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(STORAGE_KEYS.AGENT_TASKS),
    () => null,
  );
  return useMemo(() => {
    if (!raw) return [];
    try {
      return JSON.parse(raw) as AgentExecutedTask[];
    } catch {
      return [];
    }
  }, [raw]);
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

  const topUp = useCallback((coinId: CoinId, amountSmallest: string) => {
    const current = getConfig();
    if (!current) return;
    const prev = BigInt(current.balances[coinId] ?? '0');
    const next = prev + BigInt(amountSmallest);
    writeJSON(STORAGE_KEYS.AGENT_CONFIG, {
      ...current,
      balances: { ...current.balances, [coinId]: next.toString() },
    });
  }, []);

  const withdraw = useCallback((coinId: CoinId, amountSmallest: string) => {
    const current = getConfig();
    if (!current) return;
    const prev = BigInt(current.balances[coinId] ?? '0');
    const amount = BigInt(amountSmallest);
    const next = bigintMin(prev, amount) > 0n ? prev - bigintMin(prev, amount) : 0n;
    writeJSON(STORAGE_KEYS.AGENT_CONFIG, {
      ...current,
      balances: { ...current.balances, [coinId]: next.toString() },
    });
  }, []);

  const setMaxPerTask = useCallback((coinId: CoinId, amountSmallest: string) => {
    const current = getConfig();
    if (!current) return;
    writeJSON(STORAGE_KEYS.AGENT_CONFIG, {
      ...current,
      maxPerTask: { ...current.maxPerTask, [coinId]: amountSmallest },
    });
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

  const sendMessage = useCallback(async (chatId: string, content: string): Promise<void> => {
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
    writeJSON(messagesKey(chatId), [...existing, userMsg]);

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

    await new Promise((r) => setTimeout(r, 700 + Math.random() * 700));

    const cfg = getConfig();
    if (!cfg) return;

    const enabledCapsules = getCapsules().filter((c) => c.enabled);
    const parsed = parseCommand(trimmed);

    let replyContent: string;
    let taskRef: AgentExecutedTask | null = null;

    if (parsed) {
      const result = executeTask(parsed, chatId, cfg, enabledCapsules);
      taskRef = result.task;
      replyContent = result.reply;

      if (result.task.status === 'completed' || result.task.status === 'pending') {
        const sourceMeta = TokenRegistry.getInstance().getDefinition(result.task.sourceCoinId);
        const sourcePrice = getMockPrice(sourceMeta?.name);
        const sourceDecimals = sourceMeta?.decimals ?? 6;
        const humanSource = Number(toHumanReadable(result.task.sourceAmount, sourceDecimals));
        const usdValue = humanSource * sourcePrice;

        const stats = getStats();
        const slot = stats.tasksByType[result.task.type];
        const prevSpend = BigInt(stats.spendByCoin[result.task.sourceCoinId] ?? '0');
        const nextStats: AgentStats = {
          ...stats,
          tasksByType: {
            ...stats.tasksByType,
            [result.task.type]: { count: slot.count + 1, usdValue: slot.usdValue + usdValue },
          },
          spendByCoin: {
            ...stats.spendByCoin,
            [result.task.sourceCoinId]: (prevSpend + BigInt(result.task.sourceAmount)).toString(),
          },
          totalTasks: stats.totalTasks + 1,
          lastTaskAt: Date.now(),
        };
        writeJSON(STORAGE_KEYS.AGENT_STATS, nextStats);

        writeJSON(STORAGE_KEYS.AGENT_CONFIG, { ...cfg, balances: result.updatedBalances });
      }

      writeJSON(STORAGE_KEYS.AGENT_TASKS, [result.task, ...getTasks()]);
    } else {
      replyContent = pickChatReply();
    }

    const agentMsg: AgentMessage = {
      id: id(),
      chatId,
      role: 'agent',
      content: replyContent,
      timestamp: Date.now(),
      taskId: taskRef?.id,
    };

    writeJSON(messagesKey(chatId), [...getMessages(chatId), agentMsg]);
    const chats2 = getChats().map((c) =>
      c.id === chatId
        ? { ...c, lastMessageAt: Date.now(), messageCount: c.messageCount + 1 }
        : c,
    );
    writeJSON(STORAGE_KEYS.AGENT_CHATS, chats2);
  }, []);

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
    setMaxPerTask,
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
