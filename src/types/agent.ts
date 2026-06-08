export type AgentPersonality = 'friendly' | 'professional' | 'playful' | 'concise' | 'creative';

export type AgentAvatar = 'spark' | 'orb' | 'wave' | 'prism';

export interface AgentIntegrations {
  telegram?: string;
  twitter?: string;
  discord?: string;
}

export type CoinId = string;

export interface AgentConfig {
  name: string;
  nametag: string;
  personality: AgentPersonality;
  avatar: AgentAvatar;
  balances: Record<CoinId, string>;
  maxPerTask: Record<CoinId, string>;
  integrations: AgentIntegrations;
  createdAt: number;
}

export interface AgentChat {
  id: string;
  title: string;
  createdAt: number;
  lastMessageAt: number;
  messageCount: number;
}

export type AgentMessageRole = 'user' | 'agent';

export type AgentTaskType = 'swap' | 'buy' | 'sell' | 'dca' | 'transfer' | 'bridge';

export type AgentTaskStatus = 'completed' | 'pending' | 'failed';

export interface AgentExecutedTask {
  id: string;
  type: AgentTaskType;
  status: AgentTaskStatus;
  sourceCoinId: CoinId;
  sourceAmount: string;
  targetCoinId?: CoinId;
  targetAmount?: string;
  recipient?: string;
  recurrence?: 'daily' | 'weekly' | 'monthly';
  timestamp: number;
  chatId?: string;
  messageId?: string;
  capsuleId?: string;
}

export interface AgentMessage {
  id: string;
  chatId: string;
  role: AgentMessageRole;
  content: string;
  timestamp: number;
  taskId?: string;
}

export interface AgentStatsTypeSlot {
  count: number;
  usdValue: number;
}

export interface AgentStats {
  tasksByType: Record<AgentTaskType, AgentStatsTypeSlot>;
  spendByCoin: Record<CoinId, string>;
  totalTasks: number;
  lastTaskAt: number | null;
}

export type CapsuleId =
  | 'spot-trader'
  | 'dca-bot'
  | 'limit-orders'
  | 'rebalancer'
  | 'bridge'
  | 'sentiment';

export interface Capsule {
  id: CapsuleId;
  name: string;
  description: string;
  icon: string;
  category: string;
  version: string;
  author: string;
  enabled: boolean;
  installedAt: number;
  taskTypes: AgentTaskType[];
}
