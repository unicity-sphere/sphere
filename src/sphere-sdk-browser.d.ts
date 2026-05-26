/**
 * Type declarations for @unicitylabs/sphere-sdk/impl/browser
 *
 * The SDK's tsup config has dts: false for the browser entry point,
 * so no .d.ts files are emitted. This module declaration provides
 * the types needed by our adapter layer.
 *
 * TODO: Remove once sphere-sdk enables dts for impl/browser.
 */
declare module '@unicitylabs/sphere-sdk/impl/browser' {
  import type {
    NetworkType,
    StorageProvider,
    TransportProvider,
    OracleProvider,
    TokenStorageProvider,
    TxfStorageDataBase,
    PriceProvider,
  } from '@unicitylabs/sphere-sdk';

  export interface BrowserProvidersConfig {
    network?: NetworkType;
    storage?: Record<string, unknown>;
    transport?: Record<string, unknown>;
    oracle?: Record<string, unknown>;
    l1?: Record<string, unknown>;
    tokenSync?: Record<string, unknown>;
    price?: Record<string, unknown>;
    groupChat?: Record<string, unknown> | boolean;
    market?: Record<string, unknown> | boolean;
  }

  export interface BrowserProviders {
    storage: StorageProvider;
    transport: TransportProvider;
    oracle: OracleProvider;
    tokenStorage: TokenStorageProvider<TxfStorageDataBase>;
    l1?: Record<string, unknown>;
    price?: PriceProvider;
    ipfsTokenStorage?: TokenStorageProvider<TxfStorageDataBase>;
    groupChat?: Record<string, unknown> | boolean;
    market?: Record<string, unknown> | boolean;
    tokenSyncConfig?: Record<string, unknown>;
  }

  export function createBrowserProviders(
    config?: BrowserProvidersConfig,
  ): BrowserProviders;

  /**
   * Subset of {@link IndexedDBTokenStorageProvider} we use in
   * sphere.telco for cross-mode data-presence probing. The SDK class
   * has a wider surface — we only declare the bits we touch here.
   */
  export interface IndexedDBTokenStorageProviderConfig {
    readonly dbNamePrefix?: string;
    readonly debug?: boolean;
  }
  export class IndexedDBTokenStorageProvider
    implements TokenStorageProvider<TxfStorageDataBase>
  {
    constructor(config?: IndexedDBTokenStorageProviderConfig);
    readonly id: string;
    readonly name: string;
    readonly type: string;
    setIdentity(identity: { directAddress?: string; l1Address: string; chainPubkey: string; privateKey?: string }): void;
    initialize(): Promise<boolean>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    shutdown(opts?: Record<string, unknown>): Promise<void>;
    isConnected(): boolean;
    getStatus(): string;
    sync?(other: TokenStorageProvider<TxfStorageDataBase>): Promise<unknown>;
    load(): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string; source?: string; timestamp?: number }>;
    save(data: Record<string, unknown>): Promise<{ success: boolean; error?: string; timestamp?: number }>;
  }
  export function createIndexedDBTokenStorageProvider(
    config?: IndexedDBTokenStorageProviderConfig,
  ): IndexedDBTokenStorageProvider;
}
