/**
 * The Ethereum asset lists the wallets on the page the standard way: each extension announces
 * its own provider through EIP-6963, and the asset signs with the one the user picked. The
 * wallet behind `window.ethereum` stays as the browser wallet when no announced wallet owns it.
 * Exercised against the real Sepolia USDC asset with fake providers announced on the window.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SEPOLIA_USDC_BRIDGE, type Eip1193Provider, type Eip6963ProviderInfo } from '@unicitylabs/bridge-plugin/wallet';

import evmUsdc from '@/modules/bridge/assets/evm-usdc';
import { resetBridgeAssets } from '@/modules/bridge/assets';
import type { BridgeAsset } from '@/modules/bridge/types';

const ACCOUNT = '0x2B00d708fc777F174A248B9bE01c8E8379d69Caf';
const OTHER = `0x${'99'.repeat(20)}`;

function fakeProvider(account = ACCOUNT, chainIdHex = '0xaa36a7') {
  const requests: { method: string; params?: unknown[] }[] = [];
  const provider: Eip1193Provider = {
    async request(args) {
      requests.push(args);
      switch (args.method) {
        case 'eth_requestAccounts':
        case 'eth_accounts':
          return [account];
        case 'eth_chainId':
          return chainIdHex;
        case 'wallet_switchEthereumChain':
          throw new Error('User rejected the request.');
        case 'eth_sendTransaction':
          return `0x${'ee'.repeat(32)}`;
        default:
          throw new Error(`unexpected ${args.method}`);
      }
    },
  };
  return { provider, requests };
}

function info(rdns: string, name: string): Eip6963ProviderInfo {
  return { uuid: rdns, name, icon: `data:image/svg+xml,${rdns}`, rdns };
}

function announce(wallet: Eip6963ProviderInfo, provider: Eip1193Provider): void {
  window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: { info: wallet, provider } }));
}

/** A wallet extension that is on the page before the asset loads answers the request for providers. */
function install(wallet: Eip6963ProviderInfo, provider: Eip1193Provider): () => void {
  const reply = () => announce(wallet, provider);
  window.addEventListener('eip6963:requestProvider', reply);
  return () => window.removeEventListener('eip6963:requestProvider', reply);
}

function sepoliaUsdc(): BridgeAsset {
  vi.stubEnv('VITE_BRIDGE_RETURN_SERVICE_URL_SEPOLIA_USDC', 'https://return.example.test');
  const [asset] = evmUsdc.load();
  return asset;
}

const uninstall: (() => void)[] = [];

afterEach(() => {
  uninstall.splice(0).forEach((f) => f());
  delete (window as { ethereum?: unknown }).ethereum;
  vi.unstubAllEnvs();
  resetBridgeAssets();
});

describe('Ethereum wallets', () => {
  it('lists an announced wallet by rdns with its name and icon', () => {
    uninstall.push(install(info('io.rabby', 'Rabby'), fakeProvider().provider));
    const [wallet] = sepoliaUsdc().wallets();
    expect([wallet.id, wallet.name, wallet.icon, wallet.isAvailable()]).toEqual(['io.rabby', 'Rabby', 'data:image/svg+xml,io.rabby', true]);
  });

  it('shows a wallet that announces itself after the asset loaded', () => {
    const asset = sepoliaUsdc();
    expect(asset.wallets().map((w) => w.id)).toEqual(['injected-evm']);
    announce(info('io.metamask', 'MetaMask'), fakeProvider().provider);
    expect(asset.wallets().map((w) => w.id)).toEqual(['io.metamask']);
  });

  it('offers the browser wallet, unavailable with a hint, when nothing is on the page', () => {
    const [wallet] = sepoliaUsdc().wallets();
    expect(wallet.name).toBe('Browser wallet');
    expect(wallet.isAvailable()).toBe(false);
    expect(wallet.unavailableHint).toMatch(/Install an Ethereum browser wallet/);
  });

  it('collects through the wallet the user picked and asks for the right account, naming no wallet, when it holds another', async () => {
    const rabby = fakeProvider(OTHER);
    const metamask = fakeProvider(ACCOUNT);
    uninstall.push(install(info('io.rabby', 'Rabby'), rabby.provider), install(info('io.metamask', 'MetaMask'), metamask.provider));
    const [viaRabby, viaMetaMask] = sepoliaUsdc().wallets();

    await expect(viaRabby.collect!(ACCOUNT)).rejects.toThrow(`To collect, switch your wallet to the correct account: 0x2B00...9Caf`);
    expect(metamask.requests).toHaveLength(0);

    expect(await viaMetaMask.collect!(ACCOUNT)).toBe(`0x${'ee'.repeat(32)}`);
    const sent = metamask.requests.at(-1)!.params![0] as { to: string };
    expect(sent.to.toLowerCase()).toBe(SEPOLIA_USDC_BRIDGE.vault.toLowerCase());
  });

  it('does not collect through a wallet left on another chain, so no transaction is sent there', async () => {
    const mainnet = fakeProvider(ACCOUNT, '0x1');
    uninstall.push(install(info('io.metamask', 'MetaMask'), mainnet.provider));
    const [viaMetaMask] = sepoliaUsdc().wallets();
    await expect(viaMetaMask.collect!(ACCOUNT)).rejects.toThrow(/Wrong network.*needs chain 11155111/);
    expect(mainnet.requests.map((r) => r.method)).not.toContain('eth_sendTransaction');
  });
});
