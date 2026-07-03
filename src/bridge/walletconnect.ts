/**
 * WalletConnect wiring for Tron bridge-in (08 Phase 3). This is the **single** place
 * the WalletConnect dependency is introduced — the plugin and the bridge-in
 * orchestrator stay WC-free by taking an injected signer factory
 * ({TronWalletConfig}). That keeps `@tronweb3/walletconnect-tron` out of every
 * module that merely typechecks against the wallet surface.
 *
 * To enable WalletConnect:
 *   1. `npm i @tronweb3/tronwallet-adapters @tronweb3/walletconnect-tron`
 *   2. set `VITE_WALLETCONNECT_PROJECT_ID` in the environment
 *   3. implement {createWalletConnectSigner} against the adapter (the TODO below)
 *
 * Until (2), WalletConnect is not offered (only TronLink). Until (1)+(3), selecting
 * WalletConnect surfaces a clear, actionable error rather than failing obscurely.
 */
import type {
  TronSigner,
  TronWalletConfig,
} from '@unicitylabs/bridge-plugin-tron-usdt/lib/wallet/index.js';

/** WalletConnect projectId (non-secret) — set per environment; absent ⇒ WC not offered. */
const WC_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;

/** The app's Tron wallet config: TronLink always; WalletConnect when a projectId is set. */
export function appTronWalletConfig(): TronWalletConfig {
  if (!WC_PROJECT_ID) return {};
  return {
    walletConnect: {
      signerFactory: (chainId) => createWalletConnectSigner(WC_PROJECT_ID, chainId),
    },
  };
}

/**
 * Build a {TronSigner} backed by the WalletConnect Tron adapter.
 *
 * TODO(08 Phase 3): once `@tronweb3/walletconnect-tron` is installed, construct the
 * adapter with `{ projectId }` and wrap it as a `TronSigner`:
 *   - `connect()`  → `adapter.connect()` (opens the WC modal), return `adapter.address`
 *   - `getAddress()` → `adapter.address`
 *   - `getNetwork()` → derive the chainId from `adapter.network()`
 *   - `sendCall(call)` → build the tx with a node-only TronWeb, `adapter.signTransaction(tx)`,
 *                        then broadcast (reuse `sendCallVia`-style build/broadcast)
 *   - `onChange(cb)` → forward the adapter's `accountsChanged`/`chainChanged`/`disconnect`
 * The plugin's `TronWalletProvider` seam (providers.ts) drives it identically to TronLink.
 */
function createWalletConnectSigner(projectId: string, chainId: number): TronSigner {
  void projectId;
  void chainId;
  throw new Error(
    'WalletConnect is configured (projectId set) but not wired yet: install ' +
      '`@tronweb3/walletconnect-tron` and implement createWalletConnectSigner() in ' +
      'src/bridge/walletconnect.ts.',
  );
}
