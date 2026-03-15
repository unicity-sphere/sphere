/**
 * useCreateAddress - Hook for creating new wallet addresses
 *
 * Uses adapter for:
 * 1. Deriving new address via adapter.deriveAddress()
 * 2. Checking nametag availability via adapter.isNametagAvailable()
 * 3. Atomic address creation with nametag via adapter.switchToAddress()
 */
import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSphereContext } from '../../../../sdk/hooks/core/useSphere';
import { SPHERE_KEYS } from '../../../../sdk/queryKeys';

export type CreateAddressStep =
  | 'idle'
  | 'deriving'
  | 'nametag_input'
  | 'checking_availability'
  | 'creating'
  | 'complete'
  | 'error';

export interface CreateAddressState {
  step: CreateAddressStep;
  error: string | null;
  newAddress: {
    l1Address: string;
    path: string;
    index: number;
  } | null;
  progress: string;
}

export interface ExistingAddressData {
  l1Address: string;
  l3Address: string;
  path: string;
  index: number;
  privateKey: string;
  publicKey: string;
}

export interface UseCreateAddressReturn {
  state: CreateAddressState;
  startCreateAddress: () => Promise<void>;
  setExistingAddress: (address: ExistingAddressData) => void;
  submitNametag: (nametag: string) => Promise<void>;
  reset: () => void;
  isNametagAvailable: (nametag: string) => Promise<boolean>;
}

export function useCreateAddress(): UseCreateAddressReturn {
  const queryClient = useQueryClient();
  const { adapter } = useSphereContext();

  const [state, setState] = useState<CreateAddressState>({
    step: 'idle',
    error: null,
    newAddress: null,
    progress: '',
  });

  // Warn user about closing during critical steps
  useEffect(() => {
    if (state.step !== 'creating') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Your Unicity ID is being created. Closing now may cause issues.";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [state.step]);

  const reset = useCallback(() => {
    setState({ step: 'idle', error: null, newAddress: null, progress: '' });
  }, []);

  const setStep = useCallback((step: CreateAddressStep, progress: string = '') => {
    setState(prev => ({ ...prev, step, progress, error: null }));
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, step: 'error', error }));
  }, []);

  /**
   * Step 1: Derive new address using adapter, then check for existing nametag
   */
  const startCreateAddress = useCallback(async () => {
    if (!adapter) {
      setError("Wallet not initialized");
      return;
    }

    try {
      setStep('deriving', 'Generating new address...');

      // Determine next index from adapter's tracked addresses
      const tracked = await adapter.getActiveAddresses();
      const nextIndex = tracked.length > 0
        ? Math.max(...tracked.map(a => a.index)) + 1
        : 0;

      // Switch to the new address (derives internally if needed)
      // Timeout guards against SDK hanging on Nostr publish when relay is not connected
      try {
        await Promise.race([
          adapter.switchToAddress(nextIndex),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ]);
      } catch (e) {
        if (!(e instanceof Error && e.message === 'timeout')) throw e;
      }
      const derived = await adapter.deriveAddress(nextIndex);

      // Check if SDK recovered a nametag during the switch.
      // After timeout, adapter.identity is already set to the NEW address.
      if (adapter.identity?.nametag) {
        setState(prev => ({
          ...prev,
          step: 'complete',
          progress: 'Address created successfully!',
          newAddress: {
            l1Address: derived.address,
            path: derived.path,
            index: derived.index,
          },
        }));
        window.dispatchEvent(new Event("wallet-updated"));
        await queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.identity.all });
        await queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.payments.tokens.all });
        await queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.l1.all });
        return;
      }

      setState(prev => ({
        ...prev,
        step: 'nametag_input',
        progress: '',
        newAddress: {
          l1Address: derived.address,
          path: derived.path,
          index: derived.index,
        },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create address";
      console.error("createAddress error:", err);
      setError(message);
    }
  }, [adapter, setStep, setError, queryClient]);

  /**
   * Set existing address (for addresses without nametag)
   * Skips derivation step and goes straight to nametag input
   */
  const setExistingAddress = useCallback((address: ExistingAddressData) => {
    setState({
      step: 'nametag_input',
      error: null,
      progress: '',
      newAddress: {
        l1Address: address.l1Address,
        path: address.path,
        index: address.index,
      },
    });
  }, []);

  /**
   * Check if nametag is available
   */
  const isNametagAvailable = useCallback(async (nametag: string): Promise<boolean> => {
    if (!adapter) return false;
    return await adapter.isNametagAvailable(nametag);
  }, [adapter]);

  /**
   * Step 2: Register nametag on the current address (already switched in startCreateAddress)
   */
  const submitNametag = useCallback(async (nametag: string) => {
    if (!adapter) {
      setError("Wallet not initialized");
      return;
    }

    const cleanTag = nametag.trim().replace("@", "").toLowerCase();

    try {
      // Check availability
      setStep('checking_availability', 'Checking if name is available...');
      const available = await adapter.isNametagAvailable(cleanTag);
      if (!available) {
        setError(`@${cleanTag} is already taken`);
        return;
      }

      // Register nametag on the current address
      setStep('creating', 'Creating Unicity ID...');
      await adapter.registerNametag(cleanTag);

      // Complete
      setStep('complete', 'Address created successfully!');

      // Dispatch event to trigger UI updates
      window.dispatchEvent(new Event("wallet-updated"));

      // Invalidate queries to refresh UI
      await queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.identity.all });
      await queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.identity.nametag });
      await queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.payments.tokens.all });
      await queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.l1.all });

    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create nametag";
      console.error("submitNametag error:", err);
      setError(message);
    }
  }, [adapter, queryClient, setStep, setError]);

  return {
    state,
    startCreateAddress,
    setExistingAddress,
    submitNametag,
    reset,
    isNametagAvailable,
  };
}
