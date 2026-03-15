/// <reference types="chrome" />

/**
 * ExtensionSphereProvider — SphereProvider for extension mode.
 *
 * Uses the Adapter Pattern: creates ExtensionAdapter and ExtGroupChatAdapter
 * that route all SDK calls to the background service worker via
 * chrome.runtime.sendMessage({ type: 'POPUP_*' }).
 *
 * SDK events arrive via SDK_EVENT broadcasts from the background and are
 * dispatched through the adapter's local event emitter, so useSphereEvents
 * works unchanged.
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Sphere, PeerInfo } from '@unicitylabs/sphere-sdk';
import { TokenRegistry, NETWORKS } from '@unicitylabs/sphere-sdk';
import { SphereContext } from './SphereContext';
import type { SphereContextValue } from './SphereContext';
import { ExtensionAdapter } from './adapter/ExtensionAdapter';
import { ExtGroupChatAdapter } from './adapter/ExtGroupChatAdapter';
import type { ISphereAdapter } from './adapter/types';
import type { IGroupChatAdapter } from './adapter/group-chat-types';

// Helper to send a message to the background worker
async function sendBg<T = unknown>(message: Record<string, unknown>): Promise<T> {
  const response = await chrome.runtime.sendMessage(message);
  if (response && typeof response === 'object' && 'error' in response && !response.success) {
    throw new Error(response.error as string);
  }
  return response as T;
}

interface ExtensionSphereProviderProps {
  children: ReactNode;
}

export function ExtensionSphereProvider({ children }: ExtensionSphereProviderProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [walletExists, setWalletExists] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [adapter, setAdapter] = useState<ISphereAdapter | null>(null);
  const [groupChat, setGroupChat] = useState<IGroupChatAdapter | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [ipfsEnabled, setIpfsEnabled] = useState(true); // enabled by default
  const adapterRef = useRef<ExtensionAdapter | null>(null);

  // ---- Configure TokenRegistry for popup context ----
  // The popup is a separate JS context from the background, so it needs
  // its own TokenRegistry configured for token metadata (icons, decimals).

  useEffect(() => {
    const netConfig = NETWORKS.testnet;
    TokenRegistry.configure({
      remoteUrl: netConfig.tokenRegistryUrl,
    });
  }, []);

  // ---- State sync with background ----

  const refreshState = useCallback(async () => {
    try {
      const result = await sendBg<{ success: boolean; state: { hasWallet: boolean; isUnlocked: boolean } }>({
        type: 'POPUP_GET_STATE',
      });
      if (result.success && result.state) {
        setWalletExists(result.state.hasWallet);
        setIsUnlocked(result.state.isUnlocked);
      }
      // Fetch IPFS preference from background
      const ipfsResult = await sendBg<{ success: boolean; enabled: boolean }>({
        type: 'POPUP_GET_IPFS_STATUS',
      });
      if (ipfsResult.success) {
        setIpfsEnabled(ipfsResult.enabled);
      }
    } catch (err) {
      console.error('[ExtensionSphereProvider] refreshState error:', err);
      setError(err instanceof Error ? err : new Error('Failed to get wallet state'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  // ---- Create/destroy adapters when unlock state changes ----

  useEffect(() => {
    if (!isUnlocked) {
      if (adapterRef.current) {
        adapterRef.current.destroy();
        adapterRef.current = null;
      }
      setAdapter(null);
      setGroupChat(null);
      return;
    }

    const extAdapter = new ExtensionAdapter();
    adapterRef.current = extAdapter;
    setAdapter(extAdapter);
    setGroupChat(new ExtGroupChatAdapter());

    return () => {
      extAdapter.destroy();
      adapterRef.current = null;
    };
  }, [isUnlocked]);

  // ---- Wallet lifecycle ----

  const createWallet = useCallback(async (options?: { nametag?: string; password?: string }) => {
    const password = options?.password;
    if (!password) throw new Error('Password is required for extension wallet');

    setIsLoading(true);
    setError(null);
    try {
      const result = await sendBg<{ success: boolean; mnemonic: string; identity: Record<string, unknown> }>({
        type: 'POPUP_CREATE_WALLET',
        password,
        nametag: options?.nametag,
      });
      setIsUnlocked(true);
      setWalletExists(true);
      // Adapter will be created by the isUnlocked effect above.
      return { mnemonic: result.mnemonic, sphere: null as unknown as Sphere };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create wallet'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const importWallet = useCallback(async (mnemonic: string, options?: { nametag?: string; password?: string }) => {
    const password = options?.password;
    if (!password) throw new Error('Password is required for extension wallet');

    setIsLoading(true);
    setError(null);
    try {
      await sendBg<{ success: boolean; identity: Record<string, unknown> }>({
        type: 'POPUP_IMPORT_WALLET',
        mnemonic,
        password,
        nametag: options?.nametag,
      });
      setIsUnlocked(true);
      setWalletExists(true);
      return null as unknown as Sphere;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to import wallet'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unlockWallet = useCallback(async (password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await sendBg({ type: 'POPUP_UNLOCK_WALLET', password });
      setIsUnlocked(true);
      setWalletExists(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unlock failed'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const lockWallet = useCallback(async () => {
    await sendBg({ type: 'POPUP_LOCK_WALLET' });
    setIsUnlocked(false);
    queryClient.clear();
  }, [queryClient]);

  const deleteWallet = useCallback(async () => {
    await sendBg({ type: 'POPUP_RESET_WALLET' });
    setWalletExists(false);
    setIsUnlocked(false);
    queryClient.clear();
  }, [queryClient]);

  const toggleIpfs = useCallback(async () => {
    const next = !ipfsEnabled;
    setIpfsEnabled(next);
    try {
      await sendBg({ type: 'POPUP_TOGGLE_IPFS', enabled: next });
    } catch (err) {
      console.error('[ExtensionSphereProvider] toggleIpfs error:', err);
      setIpfsEnabled(!next); // revert on failure
    }
  }, [ipfsEnabled]);

  // resolveNametag works without wallet (onboarding nametag check)
  const resolveNametag = useCallback(async (nametag: string) => {
    const r = await sendBg<{ success: boolean; result: unknown }>({
      type: 'POPUP_RESOLVE_NAMETAG',
      nametag,
    });
    return r.result as PeerInfo | null;
  }, []);

  // ---- Context value ----

  const value: SphereContextValue = {
    adapter,
    groupChat,
    sphere: null,          // No direct SDK in extension — use adapter
    providers: null,
    isLoading,
    isInitialized: !!adapter,
    walletExists,
    error,
    isDiscoveringAddresses: false,
    initProgress: null,
    isUnlocked,
    resolveNametag,
    createWallet: createWallet as SphereContextValue['createWallet'],
    importWallet: importWallet as SphereContextValue['importWallet'],
    importFromFile: async () => { throw new Error('Not supported in extension'); },
    finalizeWallet: () => {},
    deleteWallet,
    reinitialize: refreshState,
    unlockWallet,
    lockWallet,
    ipfsEnabled,
    toggleIpfs,
  };

  return (
    <SphereContext.Provider value={value}>{children}</SphereContext.Provider>
  );
}
