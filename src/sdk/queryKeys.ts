export const SPHERE_KEYS = {
  all: ['sphere'] as const,

  wallet: {
    all: ['sphere', 'wallet'] as const,
    exists: ['sphere', 'wallet', 'exists'] as const,
    status: ['sphere', 'wallet', 'status'] as const,
  },

  identity: {
    all: ['sphere', 'identity'] as const,
    current: ['sphere', 'identity', 'current'] as const,
    nametag: ['sphere', 'identity', 'nametag'] as const,
    addresses: ['sphere', 'identity', 'addresses'] as const,
  },

  payments: {
    all: ['sphere', 'payments'] as const,

    tokens: {
      all: ['sphere', 'payments', 'tokens'] as const,
      list: ['sphere', 'payments', 'tokens', 'list'] as const,
      byId: (id: string) => ['sphere', 'payments', 'tokens', id] as const,
    },

    balance: {
      all: ['sphere', 'payments', 'balance'] as const,
      byCoin: (coinId: string) =>
        ['sphere', 'payments', 'balance', coinId] as const,
      total: ['sphere', 'payments', 'balance', 'total'] as const,
    },

    assets: {
      all: ['sphere', 'payments', 'assets'] as const,
      list: ['sphere', 'payments', 'assets', 'list'] as const,
    },

    transactions: {
      all: ['sphere', 'payments', 'transactions'] as const,
      history: ['sphere', 'payments', 'transactions', 'history'] as const,
      pending: ['sphere', 'payments', 'transactions', 'pending'] as const,
    },
  },

  communications: {
    all: ['sphere', 'communications'] as const,
    conversations: ['sphere', 'communications', 'conversations'] as const,
  },

  market: {
    all: ['sphere', 'market'] as const,
    prices: ['sphere', 'market', 'prices'] as const,
    registry: ['sphere', 'market', 'registry'] as const,
  },

  subscription: {
    all: ['sphere', 'subscription'] as const,
    key: (apiKey: string) => ['sphere', 'subscription', 'key', apiKey] as const,
    plans: ['sphere', 'subscription', 'plans'] as const,
    usage: (apiKey: string) => ['sphere', 'subscription', 'usage', apiKey] as const,
  },
} as const;

export type SphereQueryKey = typeof SPHERE_KEYS;
