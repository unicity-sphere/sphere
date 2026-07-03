/**
 * WalletConnect wiring for Tron bridge-in (08 Phase 3). This is the **single** place
 * the WalletConnect dependency is introduced — the plugin and the bridge-in
 * orchestrator stay WC-free by taking an injected signer factory
 * ({TronWalletConfig}). The heavy `@tronweb3/walletconnect-tron` (+ Reown AppKit) and
 * `tronweb` packages are pulled in via **dynamic import** inside the signer, so they
 * land in a lazy chunk loaded only when a user actually picks WalletConnect — never
 * in the main bundle.
 *
 * The WalletConnect adapter only *signs*; the transaction is built + broadcast
 * against the bridge's own node (a key-less TronWeb), so the tx is bound to the
 * bridge's chain by construction (see {AdapterTronSigner}).
 *
 * Trust-on-Tron is deliberately **not** advertised: Trust's WalletConnect namespaces
 * are EVM+Solana, not Tron (08 Phase 3). We hide the "All Wallets" button (Reown's
 * recommended setting for Tron) and never feature Trust; enabling it would require an
 * acceptance test proving Trust-on-Tron actually round-trips.
 */
import {
  AdapterTronSigner,
  type AdapterWallet,
  type InjectedTronWeb,
  type TronSigner,
  type TronWalletConfig,
} from '@unicitylabs/bridge-plugin-tron-usdt/lib/wallet/index.js';

import { getAppBridges } from './loadBridges';

/**
 * WalletConnect projectId (a **public**, client-embedded value — not a secret).
 * Env-overridable; defaults to the app's registered project so WalletConnect works
 * out of the box.
 */
const WC_PROJECT_ID =
  (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined) ??
  '775df3a6346fcca5010a2c970a94856e';

const WC_METADATA = {
  name: 'Unicity Sphere',
  description: 'Bridge USDT into the Unicity network',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://unicity.network',
  icons: [typeof window !== 'undefined' ? `${window.location.origin}/favicon.ico` : ''],
};

/** The app's Tron wallet config: TronLink always; WalletConnect when a projectId is set. */
export function appTronWalletConfig(): TronWalletConfig {
  if (!WC_PROJECT_ID) return {};
  return {
    walletConnect: {
      signerFactory: (chainId) => createWalletConnectSigner(WC_PROJECT_ID, chainId),
    },
  };
}

/** The bridge node (full-node URL + optional key) for a source chainId. */
function nodeFor(chainId: number): { rpcUrl: string; apiKey?: string } {
  const bridge = getAppBridges().registry.all.find((b) => b.manifest.chainId === chainId);
  if (!bridge) throw new Error(`No bridge node configured for chainId ${chainId}.`);
  return { rpcUrl: bridge.manifest.rpcUrl, apiKey: bridge.manifest.apiKey };
}

/**
 * Build a {TronSigner} backed by the WalletConnect Tron adapter. `chainId` maps
 * straight to the WalletConnect CAIP chain ref (`tron:0x<hex>`), which is exactly the
 * bridge manifest's `chainRef` (e.g. Nile → `tron:0xcd8690dc`).
 */
function createWalletConnectSigner(projectId: string, chainId: number): TronSigner {
  const network = `tron:0x${chainId.toString(16)}` as const;

  // Lazily created on connect() so the WalletConnect/AppKit bundle stays off the
  // main chunk; reused across signTransaction/disconnect for one session.
  let wc: import('@tronweb3/walletconnect-tron').WalletConnectWallet | null = null;

  const wallet: AdapterWallet = {
    connect: async () => {
      const { WalletConnectWallet } = await import('@tronweb3/walletconnect-tron');
      wc = new WalletConnectWallet({
        network,
        options: { projectId, metadata: WC_METADATA },
        allWallets: 'HIDE', // Tron: don't surface the EVM-heavy "All Wallets" list (Trust, etc.)
      });
      const { address } = await wc.connect();
      return address;
    },
    signTransaction: (unsignedTx) => {
      if (!wc) throw new Error('WalletConnect: signTransaction before connect().');
      return wc.signTransaction(unsignedTx);
    },
    disconnect: async () => {
      await wc?.disconnect();
    },
    onChange: (cb) => {
      if (!wc) return () => {};
      const offAccounts = wc.on('accountsChanged', () => cb({ kind: 'accountsChanged' }));
      const offDisconnect = wc.on('disconnect', () => cb({ kind: 'disconnect' }));
      return () => {
        offAccounts();
        offDisconnect();
      };
    },
  };

  const tronWebProvider = async (): Promise<InjectedTronWeb> => {
    const { rpcUrl, apiKey } = nodeFor(chainId);
    const { TronWeb } = await import('tronweb');
    const tw = new TronWeb({
      fullHost: rpcUrl,
      headers: apiKey ? { 'TRON-PRO-API-KEY': apiKey } : undefined,
    });
    return tw as unknown as InjectedTronWeb;
  };

  return new AdapterTronSigner(wallet, tronWebProvider, chainId);
}
