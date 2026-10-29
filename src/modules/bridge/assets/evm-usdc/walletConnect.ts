import { walletConnectEvmWallet, type SourceSigner, type SourceWalletProvider } from '@unicitylabs/bridge-plugin/wallet';
import type { EthereumProvider } from '@walletconnect/ethereum-provider';

import { readRuntimeConfig } from '../../../../config/runtimeConfig';

/**
 * The deployment's Reown (WalletConnect) project ID, from its runtime config or the build env.
 * Without one, WalletConnect is not offered. A container writes every key, so its empty value
 * means "none here" and does not fall back to an ID baked at build time.
 */
export function walletConnectProjectId(): string | undefined {
  const runtime = readRuntimeConfig()?.WALLETCONNECT_PROJECT_ID;
  const id = runtime ?? (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined);
  return id?.trim() || undefined;
}

type WalletConnectProvider = Awaited<ReturnType<(typeof EthereumProvider)['init']>>;

export interface WalletConnectWallet {
  readonly wallet: SourceWalletProvider;
  /** Whether a session is open. False until WalletConnect has loaded, even if one is stored. */
  connected(): boolean;
}

/**
 * Wallet apps on a phone, reached through WalletConnect: a QR code on a desktop, a link that opens
 * the app on the phone itself. The provider and its modal load only when the user picks this
 * wallet. Create one per page: each builds its own provider, and two would each open a session.
 */
export function walletConnectWallet(projectId: string, chainId: number, rpcUrl: string): WalletConnectWallet {
  let provider: WalletConnectProvider | undefined;
  const entry = walletConnectEvmWallet(async () => {
    const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
    provider = await EthereumProvider.init({
      projectId,
      optionalChains: [chainId],
      // The manifest's RPC, so reads do not go to WalletConnect's own RPC and its quota.
      rpcMap: { [chainId]: rpcUrl },
      showQrModal: true,
      // No `redirect`: on iOS a link back from the wallet opens a second Sphere tab over the
      // same wallet storage, so the user switches back by hand.
      metadata: {
        name: 'Unicity Sphere',
        description: 'Bridge assets into your Unicity Sphere wallet',
        url: window.location.origin,
        icons: [new URL(`${import.meta.env.BASE_URL}Union.svg`, window.location.href).href],
      },
    });
    await endUnusableSession(provider);
    return provider;
  });
  return {
    wallet: { ...entry, create: (id) => refusingSafe(entry.create(id), () => provider?.session?.peer.metadata) },
    connected: () => Boolean(provider?.session),
  };
}

/**
 * The provider routes a wallet method to the wallet only when the session's namespace lists it,
 * and it saves those namespaces only when the page that proposed the session sees the wallet
 * approve it. A phone browser often reloads a background tab while the user is in the wallet
 * app. The approval still lands, and a later load restores a session whose namespace lists no
 * methods, so the first `eth_sendTransaction` throws "this.namespace.methods is undefined".
 * Such a session is ended when the provider loads, and the next connect pairs again.
 */
async function endUnusableSession(provider: WalletConnectProvider): Promise<void> {
  const eip155 = provider.session ? provider.signer.rpcProviders.eip155 : undefined;
  if (!eip155 || Array.isArray(eip155.namespace?.methods)) return;
  await provider.disconnect();
}

const SAFE_REFUSED =
  'Safe cannot bridge here: it turns a transaction into a proposal for its owners to sign, so the bridge would wait for a transaction that is not sent. Connect another wallet.';

/**
 * Safe answers `eth_sendTransaction` with the hash of a multisig proposal, not of a transaction,
 * so the approve receipt the bridge waits for never arrives. Its session is ended at connect, and
 * nothing is sent through it.
 */
function refusingSafe(signer: SourceSigner, peer: () => { name?: string; url?: string } | undefined): SourceSigner {
  const refuseSafe = async (): Promise<void> => {
    if (!isSafe(peer())) return;
    await signer.disconnect?.().catch(() => undefined);
    throw new Error(SAFE_REFUSED);
  };
  return {
    connect: async () => {
      const address = await signer.connect();
      await refuseSafe();
      return address;
    },
    getAddress: () => signer.getAddress(),
    getNetwork: () => signer.getNetwork(),
    sendCall: async (call) => {
      await signer.connect();
      await refuseSafe();
      return signer.sendCall(call);
    },
    onChange: signer.onChange && ((cb) => signer.onChange!(cb)),
    disconnect: signer.disconnect && (() => signer.disconnect!()),
  };
}

/** Safe{Wallet} names itself "Safe…" and lives on safe.global. SafePal, a different wallet, is neither. */
export function isSafe(metadata: { name?: string; url?: string } | undefined): boolean {
  if (!metadata) return false;
  let host = '';
  try {
    host = new URL(metadata.url ?? '').hostname;
  } catch {
    // no usable URL: judge by the name alone
  }
  return host === 'safe.global' || host.endsWith('.safe.global') || /^safe(?![a-z])/i.test(metadata.name?.trim() ?? '');
}
