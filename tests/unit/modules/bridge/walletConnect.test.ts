/**
 * Wallet apps on a phone, through WalletConnect: the Ethereum asset offers it after the browser
 * wallets, only where the deployment names a Reown project, and loads the provider only when the
 * user picks it. Exercised against the real Sepolia USDC asset with the provider package mocked.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SourceSigner } from '@unicitylabs/bridge-plugin/wallet';

import evmUsdc from '@/modules/bridge/assets/evm-usdc';
import { isSafe } from '@/modules/bridge/assets/evm-usdc/walletConnect';
import { resetBridgeAssets } from '@/modules/bridge/assets';
import type { BridgeWalletOption } from '@/modules/bridge/types';

const ACCOUNT = '0x2B00d708fc777F174A248B9bE01c8E8379d69Caf';
const SEPOLIA = 11155111;
const PROJECT = '0123456789abcdef0123456789abcdef';

const wc = vi.hoisted(() => ({
  inits: [] as Record<string, unknown>[],
  peer: { name: 'MetaMask Wallet', url: 'https://metamask.io' },
  sent: [] as { from: string; to: string; data: string }[],
}));

/** Behaves as `@walletconnect/ethereum-provider` does: no request before a session, a numeric chain id. */
vi.mock('@walletconnect/ethereum-provider', () => ({
  EthereumProvider: {
    init: async (opts: Record<string, unknown>) => {
      wc.inits.push(opts);
      let session: { namespaces: Record<string, { accounts: string[] }>; peer: { metadata: { name: string; url: string } } } | undefined;
      let chain = SEPOLIA;
      return {
        get session() {
          return session;
        },
        async enable() {
          session = { namespaces: { eip155: { accounts: [`eip155:${SEPOLIA}:${ACCOUNT}`] } }, peer: { metadata: { ...wc.peer } } };
          return [ACCOUNT];
        },
        async disconnect() {
          session = undefined;
        },
        async request({ method, params }: { method: string; params?: unknown[] }) {
          if (!session) throw new Error('Please call connect() before request()');
          switch (method) {
            case 'eth_chainId':
              return chain;
            case 'eth_accounts':
              return [ACCOUNT];
            case 'wallet_switchEthereumChain':
              chain = Number.parseInt((params![0] as { chainId: string }).chainId, 16);
              return null;
            case 'eth_sendTransaction':
              wc.sent.push(params![0] as (typeof wc.sent)[number]);
              return `0x${'ee'.repeat(32)}`;
          }
          throw new Error(`unexpected ${method}`);
        },
        on() {},
        removeListener() {},
      };
    },
  },
}));

function walletConnectOption(): BridgeWalletOption {
  const [asset] = evmUsdc.load();
  const option = asset.wallets().find((w) => w.id === 'walletconnect');
  if (!option) throw new Error('WalletConnect is not offered');
  return option;
}

function setRuntimeConfig(config: Record<string, string>): void {
  (window as unknown as { __SPHERE_RUNTIME_CONFIG__?: unknown }).__SPHERE_RUNTIME_CONFIG__ = config;
}

afterEach(() => {
  wc.inits.length = 0;
  wc.sent.length = 0;
  wc.peer = { name: 'MetaMask Wallet', url: 'https://metamask.io' };
  vi.unstubAllEnvs();
  delete (window as unknown as { __SPHERE_RUNTIME_CONFIG__?: unknown }).__SPHERE_RUNTIME_CONFIG__;
  resetBridgeAssets();
});

describe('WalletConnect on the Ethereum asset', () => {
  it('is not offered without a project ID', () => {
    vi.stubEnv('VITE_WALLETCONNECT_PROJECT_ID', '');
    const [asset] = evmUsdc.load();
    expect(asset.wallets().map((w) => w.id)).toEqual(['injected-evm']);
  });

  it('is offered after the browser wallets when the build names a project, and loads nothing until used', () => {
    vi.stubEnv('VITE_WALLETCONNECT_PROJECT_ID', PROJECT);
    const [asset] = evmUsdc.load();
    const wallets = asset.wallets();
    expect(wallets.map((w) => [w.id, w.name, w.isAvailable()])).toEqual([
      ['injected-evm', 'Browser wallet', false],
      ['walletconnect', 'WalletConnect', true],
    ]);
    wallets[1].open();
    expect(wc.inits).toEqual([]);
  });

  it("follows a container's key over the build's, an empty key included", async () => {
    vi.stubEnv('VITE_WALLETCONNECT_PROJECT_ID', PROJECT);
    setRuntimeConfig({ WALLETCONNECT_PROJECT_ID: '' });
    expect(evmUsdc.load()[0].wallets().map((w) => w.id)).not.toContain('walletconnect');

    resetBridgeAssets();
    setRuntimeConfig({ WALLETCONNECT_PROJECT_ID: ` ${'f'.repeat(32)} ` });
    await walletConnectOption().open().wallet.connect();
    expect(wc.inits[0].projectId).toBe('f'.repeat(32));
  });

  it("connects with the manifest's chain and RPC and no link back, and the picker can end the session", async () => {
    vi.stubEnv('VITE_WALLETCONNECT_PROJECT_ID', PROJECT);
    const option = walletConnectOption();
    expect(option.connected?.()).toBe(false);
    expect(await option.open().wallet.connect()).toBe(ACCOUNT);
    expect(wc.inits).toHaveLength(1);
    expect(wc.inits[0]).toMatchObject({
      projectId: PROJECT,
      optionalChains: [SEPOLIA],
      rpcMap: { [SEPOLIA]: 'https://sepolia.gateway.tenderly.co' },
      showQrModal: true,
      metadata: { url: window.location.origin },
    });
    expect(wc.inits[0].metadata).not.toHaveProperty('redirect');
    expect(option.connected?.()).toBe(true);
    await option.disconnect?.();
    expect(option.connected?.()).toBe(false);
  });

  it('collects through the session from the account it holds', async () => {
    vi.stubEnv('VITE_WALLETCONNECT_PROJECT_ID', PROJECT);
    expect(await walletConnectOption().collect?.(ACCOUNT)).toBe(`0x${'ee'.repeat(32)}`);
    expect(wc.sent).toHaveLength(1);
    expect(wc.sent[0].from).toBe(ACCOUNT);
    expect(wc.sent[0].to.toLowerCase()).toBe('0x9c2bf4ed5b85130ffd14be8fa65c60f299fc9a2e');
  });

  it('refuses a Safe session at connect, ends it, and sends nothing through it', async () => {
    vi.stubEnv('VITE_WALLETCONNECT_PROJECT_ID', PROJECT);
    wc.peer = { name: 'Safe{Wallet}', url: 'https://app.safe.global' };
    const option = walletConnectOption();
    const { wallet } = option.open();
    await expect(wallet.connect()).rejects.toThrow(/Safe cannot bridge here/);
    expect(option.connected?.()).toBe(false);
    // The same signer the deposit adapter sends through.
    const signer = wallet as unknown as SourceSigner;
    await expect(signer.sendCall({ contractHex: '00'.repeat(20), functionSignature: 'withdraw()', parameters: [] })).rejects.toThrow(
      /Safe cannot bridge here/,
    );
    expect(wc.sent).toEqual([]);
  });

  it('tells Safe from other wallets by its name or its safe.global site', () => {
    expect(isSafe({ name: 'Safe{Wallet}', url: 'https://app.safe.global' })).toBe(true);
    expect(isSafe({ name: 'Safe', url: '' })).toBe(true);
    expect(isSafe({ name: 'Multisig', url: 'https://app.safe.global/home' })).toBe(true);
    expect(isSafe({ name: 'SafePal', url: 'https://www.safepal.com' })).toBe(false);
    expect(isSafe({ name: 'MetaMask Wallet', url: 'https://metamask.io' })).toBe(false);
    expect(isSafe(undefined)).toBe(false);
  });
});
