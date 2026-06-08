import { useCallback, useEffect, useState } from 'react';
import {
  TokenRegistry,
  getCoinIdBySymbol,
  toSmallestUnit,
} from '@unicitylabs/sphere-sdk';
import { useAgent } from '../../../hooks/useAgent';
import type {
  AgentAvatar,
  AgentIntegrations,
  AgentPersonality,
  CoinId,
} from '../../../types/agent';

export type AgentOnboardingStep =
  | 'intro'
  | 'name'
  | 'personality'
  | 'nametag'
  | 'integrations'
  | 'done';

export type NametagAvailability = 'idle' | 'checking' | 'available' | 'taken';

const RESERVED_NAMETAGS = new Set(['astrid', 'admin', 'support', 'system', 'sphere', 'unicity']);

interface SeedTokenSpec {
  symbol: string;
  initial: string;
  maxPerTask: string;
}

const SEED_TOKENS: SeedTokenSpec[] = [
  { symbol: 'UCT',  initial: '1000', maxPerTask: '250' },
  { symbol: 'BTC',  initial: '0.01', maxPerTask: '0.0025' },
  { symbol: 'ETH',  initial: '0.5',  maxPerTask: '0.125' },
  { symbol: 'SOL',  initial: '5',    maxPerTask: '1.25' },
  { symbol: 'USDT', initial: '200',  maxPerTask: '50' },
  { symbol: 'USDC', initial: '100',  maxPerTask: '25' },
];

async function buildSeedBalances(): Promise<{
  balances: Record<CoinId, string>;
  maxPerTask: Record<CoinId, string>;
}> {
  await TokenRegistry.waitForReady(5000);
  const registry = TokenRegistry.getInstance();
  const balances: Record<CoinId, string> = {};
  const maxPerTask: Record<CoinId, string> = {};
  for (const spec of SEED_TOKENS) {
    const coinId = getCoinIdBySymbol(spec.symbol);
    if (!coinId) continue;
    const def = registry.getDefinition(coinId);
    if (!def || def.assetKind !== 'fungible') continue;
    const decimals = def.decimals ?? 6;
    try {
      balances[coinId] = toSmallestUnit(spec.initial, decimals).toString();
      maxPerTask[coinId] = toSmallestUnit(spec.maxPerTask, decimals).toString();
    } catch {
      // skip if conversion fails
    }
  }
  return { balances, maxPerTask };
}

export function useAgentOnboarding(onComplete: () => void) {
  const { createOrUpdateConfig, completeOnboarding } = useAgent();

  const [step, setStep] = useState<AgentOnboardingStep>('intro');

  const [name, setName] = useState('Astrid');
  const [avatar, setAvatar] = useState<AgentAvatar>('spark');
  const [personality, setPersonality] = useState<AgentPersonality>('friendly');
  const [nametagInput, setNametagInput] = useState('astrid');
  const [availability, setAvailability] = useState<NametagAvailability>('idle');
  const [integrations, setIntegrations] = useState<AgentIntegrations>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (step !== 'nametag') return;
    if (!nametagInput) {
      setAvailability('idle');
      return;
    }
    if (nametagInput.length < 3) {
      setAvailability('idle');
      return;
    }
    setAvailability('checking');
    const handle = setTimeout(() => {
      if (RESERVED_NAMETAGS.has(nametagInput) && nametagInput !== 'astrid') {
        setAvailability('taken');
      } else {
        setAvailability('available');
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [nametagInput, step]);

  const goNext = useCallback(() => {
    setError(null);
    setStep((s) => {
      switch (s) {
        case 'intro':
          return 'name';
        case 'name':
          return 'personality';
        case 'personality':
          return 'nametag';
        case 'nametag':
          return 'integrations';
        case 'integrations':
          return 'done';
        default:
          return s;
      }
    });
  }, []);

  const goBack = useCallback(() => {
    setError(null);
    setStep((s) => {
      switch (s) {
        case 'name':
          return 'intro';
        case 'personality':
          return 'name';
        case 'nametag':
          return 'personality';
        case 'integrations':
          return 'nametag';
        case 'done':
          return 'integrations';
        default:
          return s;
      }
    });
  }, []);

  const [isFinishing, setIsFinishing] = useState(false);

  const handleFinish = useCallback(async () => {
    if (!name.trim()) {
      setError('Name is required');
      setStep('name');
      return;
    }
    if (!nametagInput || availability === 'taken') {
      setError('Pick a valid nametag');
      setStep('nametag');
      return;
    }
    setIsFinishing(true);
    try {
      const { balances, maxPerTask } = await buildSeedBalances();
      createOrUpdateConfig({
        name: name.trim(),
        nametag: nametagInput,
        personality,
        avatar,
        balances,
        maxPerTask,
        integrations,
        createdAt: Date.now(),
      });
      completeOnboarding();
      onComplete();
    } finally {
      setIsFinishing(false);
    }
  }, [
    name,
    nametagInput,
    availability,
    personality,
    avatar,
    integrations,
    createOrUpdateConfig,
    completeOnboarding,
    onComplete,
  ]);

  const updateIntegration = useCallback((patch: Partial<AgentIntegrations>) => {
    setIntegrations((prev) => ({ ...prev, ...patch }));
  }, []);

  return {
    step,
    setStep,
    goNext,
    goBack,
    error,
    name,
    setName,
    avatar,
    setAvatar,
    personality,
    setPersonality,
    nametagInput,
    setNametagInput,
    availability,
    integrations,
    updateIntegration,
    handleFinish,
    isFinishing,
  };
}
