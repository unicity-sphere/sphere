import { useCallback, useEffect, useState } from 'react';
import { useAgent } from '../../../hooks/useAgent';
import type { AgentAvatar, AgentIntegrations, AgentPersonality } from '../../../types/agent';

export type AgentOnboardingStep =
  | 'intro'
  | 'name'
  | 'personality'
  | 'nametag'
  | 'integrations'
  | 'done';

export type NametagAvailability = 'idle' | 'checking' | 'available' | 'taken';

const RESERVED_NAMETAGS = new Set(['astrid', 'admin', 'support', 'system', 'sphere', 'unicity']);

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

  const handleFinish = useCallback(() => {
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
    createOrUpdateConfig({
      name: name.trim(),
      nametag: nametagInput,
      personality,
      avatar,
      balance: 1000,
      maxTokensPerTask: 200,
      integrations,
      createdAt: Date.now(),
    });
    completeOnboarding();
    onComplete();
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
  };
}
