import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSphereContext } from './useSphere';
import { SPHERE_KEYS } from '../../queryKeys';

export interface UseNametagReturn {
  nametag: string | null;
  isLoading: boolean;
  register: (name: string) => Promise<void>;
  isRegistering: boolean;
  registerError: Error | null;
  resolve: (name: string) => Promise<string | null>;
}

export function useNametag(): UseNametagReturn {
  const { adapter } = useSphereContext();
  const queryClient = useQueryClient();

  const nametag = adapter?.identity?.nametag ?? null;

  const registerMutation = useMutation({
    mutationFn: async (name: string): Promise<void> => {
      if (!adapter) throw new Error('Wallet not initialized');
      await adapter.registerNametag(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.identity.all });
    },
    // onError inherited from global handler → auto-toast
  });

  const resolve = useCallback(
    async (name: string): Promise<string | null> => {
      if (!adapter) return null;
      const result = await adapter.resolve(`@${name}`);
      return result?.chainPubkey ?? null;
    },
    [adapter],
  );

  return {
    nametag,
    isLoading: false,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
    resolve,
  };
}
