export type AgentPersonality = 'friendly' | 'professional' | 'playful' | 'concise' | 'creative';

export type AgentAvatar = 'spark' | 'orb' | 'wave' | 'prism';

export interface AgentIntegrations {
  telegram?: string;
  twitter?: string;
  discord?: string;
}

export interface AgentConfig {
  name: string;
  nametag: string;
  personality: AgentPersonality;
  avatar: AgentAvatar;
  balance: number;
  maxTokensPerTask: number;
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

export type AgentTaskType =
  | 'chat'
  | 'web-search'
  | 'calendar'
  | 'code-runner'
  | 'translator'
  | 'image-gen'
  | 'market-data';

export interface AgentMessage {
  id: string;
  chatId: string;
  role: AgentMessageRole;
  content: string;
  timestamp: number;
  taskType?: AgentTaskType;
}

export interface AgentTaskStat {
  tokens: number;
  count: number;
}

export interface AgentStats {
  byTaskType: Record<AgentTaskType, AgentTaskStat>;
  totalTokens: number;
  lastTaskAt: number | null;
}

export interface Capsule {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  version: string;
  author: string;
  enabled: boolean;
  installedAt: number;
  taskType: AgentTaskType;
}
