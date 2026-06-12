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
   * Browser oracle (network-config) provider factory. Used to select the
   * engine port at composition time (createSphereProviders) when the app
   * must point at a non-preset gateway + the trustbase it serves — e.g. the
   * LOCAL dev-stack mock aggregator in the two-profile smoke.
   */
  export interface BrowserAggregatorProviderConfig {
    /** Aggregator (gateway) URL */
    url: string;
    /** API key for authentication */
    apiKey?: string;
    /** Request timeout (ms) */
    timeout?: number;
    /** Skip trust base loading (dev only) */
    skipVerification?: boolean;
    /** Enable debug logging */
    debug?: boolean;
    /** Trust base JSON URL (fetched by the browser loader) */
    trustBaseUrl?: string;
    /** Embedded-fallback network (required when trustBaseUrl is set) */
    network?: NetworkType;
  }

  export function createUnicityAggregatorProvider(
    config: BrowserAggregatorProviderConfig,
  ): OracleProvider;
}
