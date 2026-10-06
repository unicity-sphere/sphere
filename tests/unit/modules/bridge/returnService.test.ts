/**
 * A deployment's burns go only to the return service its deployment config names: the
 * container's runtime config, else the build env. Nothing in code names a service, so a
 * build or container that sets none offers the asset for bridging in only, and no token is
 * burned with nowhere to send it. Exercised against the real providers, which read the
 * URL when an asset loads.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import evmUsdc from '@/modules/bridge/assets/evm-usdc';
import tronUsdt from '@/modules/bridge/assets/tron-usdt';
import { bridgeAssetsFor, resetBridgeAssets } from '@/modules/bridge/assets';
import type { BridgeAssetProvider } from '@/modules/bridge/types';

const SEPOLIA_ENV = 'VITE_BRIDGE_RETURN_SERVICE_URL_SEPOLIA_USDC';
const NILE_ENV = 'VITE_BRIDGE_RETURN_SERVICE_URL_NILE_USDT';

function setRuntimeConfig(config: Record<string, string>): void {
  (window as unknown as { __SPHERE_RUNTIME_CONFIG__?: unknown }).__SPHERE_RUNTIME_CONFIG__ = config;
}

async function postedTo(provider: BridgeAssetProvider): Promise<string> {
  const fetch = vi.fn(async () => new Response(JSON.stringify({ returnId: 'r-1', status: 'queued', updatedAtMs: 0 })));
  vi.stubGlobal('fetch', fetch);
  const [asset] = provider.load();
  if (!asset.out) throw new Error(`${asset.id} offers no bridge-out`);
  await asset.out.returns.submit(new Uint8Array([1]), new Uint8Array([2]));
  expect(fetch).toHaveBeenCalledTimes(1);
  const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(init.method).toBe('POST');
  return url;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  delete (window as unknown as { __SPHERE_RUNTIME_CONFIG__?: unknown }).__SPHERE_RUNTIME_CONFIG__;
  resetBridgeAssets();
});

describe('bridge return service', () => {
  it('offers Sepolia USDC for bridging in only when no service is configured', () => {
    vi.stubEnv(SEPOLIA_ENV, '');
    const [asset] = evmUsdc.load();
    expect(asset.out).toBeUndefined();
    expect(asset.wallets().length).toBeGreaterThan(0);
  });

  it('treats a blank setting as none', () => {
    vi.stubEnv(SEPOLIA_ENV, '  ');
    expect(evmUsdc.load()[0].out).toBeUndefined();
  });

  it('lets a container that sets none override a URL baked at build time', () => {
    // runtime-config.sh writes every key, so an empty one is the container saying "none here".
    vi.stubEnv(SEPOLIA_ENV, 'https://build.example.test');
    setRuntimeConfig({ BRIDGE_RETURN_SERVICE_URL_SEPOLIA_USDC: '' });
    expect(evmUsdc.load()[0].out).toBeUndefined();
  });

  it('uses the build env when no container wrote the runtime config', async () => {
    // public/runtime-config.js, which dev and Pages builds ship, is an empty object.
    vi.stubEnv(SEPOLIA_ENV, 'https://build.example.test');
    setRuntimeConfig({});
    expect(await postedTo(evmUsdc)).toBe('https://build.example.test/returns');
  });

  it('posts Sepolia USDC burns to the service the build names', async () => {
    vi.stubEnv(SEPOLIA_ENV, 'https://build.example.test');
    expect(await postedTo(evmUsdc)).toBe('https://build.example.test/returns');
  });

  it("prefers the container's runtime config to the build env", async () => {
    vi.stubEnv(SEPOLIA_ENV, 'https://build.example.test');
    setRuntimeConfig({ BRIDGE_RETURN_SERVICE_URL_SEPOLIA_USDC: 'https://container.example.test' });
    expect(await postedTo(evmUsdc)).toBe('https://container.example.test/returns');
  });

  it('configures each deployment on its own', async () => {
    vi.stubEnv(SEPOLIA_ENV, 'https://sepolia.example.test');
    vi.stubEnv(NILE_ENV, '');
    expect(tronUsdt.load()[0].out).toBeUndefined();

    vi.stubEnv(NILE_ENV, 'http://localhost:8787');
    expect(await postedTo(tronUsdt)).toBe('http://localhost:8787/returns');
    expect(await postedTo(evmUsdc)).toBe('https://sepolia.example.test/returns');
  });

  it('offers no asset on mainnet, so no mainnet burn reaches a testnet2 service', () => {
    vi.stubEnv(SEPOLIA_ENV, 'https://sepolia.example.test');
    expect(bridgeAssetsFor('mainnet')).toEqual([]);
    expect(bridgeAssetsFor('testnet2').map((a) => [a.symbol, a.out !== undefined])).toEqual([['USDC', true]]);
  });
});
