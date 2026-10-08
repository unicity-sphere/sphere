/**
 * The return service's fee comes out of the released amount, so the wallet asks the
 * service what it charges, shows it, and writes it into the burn only when it is within
 * what the user saw and what this wallet allows. Anything else stops before the burn:
 * a reason the service or the proof would refuse leaves a burned token nobody releases.
 * Exercised against the real Sepolia USDC asset with the service's answers stubbed.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeBridgeBackReason, toHex } from '@unicitylabs/bridge-plugin';

import evmUsdc from '@/modules/bridge/assets/evm-usdc';
import { resetBridgeAssets } from '@/modules/bridge/assets';
import { coversReturnFee, tokensCoveringFee } from '@/modules/bridge/returnFee';
import type { BridgeOutSide } from '@/modules/bridge/types';

const SERVICE = 'https://return.example.test';
const COLLECTOR = '0x2b00d708fc777f174a248b9be01c8e8379d69caf';
const OTHER_ACCOUNT = `0x${'99'.repeat(20)}`;
const DESTINATION = `0x${'11'.repeat(20)}`;
const DEADLINE = Math.floor(Date.now() / 1000) + 8 * 24 * 3600;
const WALLET_CAP = 5_000_000n;

function setRuntimeConfig(config: Record<string, string>): void {
  (window as unknown as { __SPHERE_RUNTIME_CONFIG__?: unknown }).__SPHERE_RUNTIME_CONFIG__ = config;
}

function quoting(quote: unknown): ReturnType<typeof vi.fn> {
  const fetch = vi.fn(async () => new Response(JSON.stringify(quote)));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

function quote(feeAmount: string): Record<string, unknown> {
  return { feeRecipient: COLLECTOR, feeAmount, deadline: DEADLINE };
}

function sepoliaOut(payOnly = ''): BridgeOutSide {
  vi.stubEnv('VITE_BRIDGE_RETURN_SERVICE_URL_SEPOLIA_USDC', SERVICE);
  vi.stubEnv('VITE_BRIDGE_RETURN_FEE_RECIPIENT_SEPOLIA_USDC', payOnly);
  const [asset] = evmUsdc.load();
  if (!asset.out) throw new Error('Sepolia USDC offers no bridge-out');
  return asset.out;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  delete (window as unknown as { __SPHERE_RUNTIME_CONFIG__?: unknown }).__SPHERE_RUNTIME_CONFIG__;
  resetBridgeAssets();
});

describe('return fee', () => {
  it('asks the deployment return service what it charges', async () => {
    const fetch = quoting(quote('50000'));
    expect(await sepoliaOut().fee()).toBe(50_000n);
    expect((fetch.mock.calls[0] as unknown as [string])[0]).toBe(`${SERVICE}/fees`);
  });

  it('refuses a quote above what this wallet allows for the asset', async () => {
    quoting(quote((WALLET_CAP + 1n).toString()));
    await expect(sepoliaOut().fee()).rejects.toThrow(/above what this wallet allows/);
    quoting(quote(WALLET_CAP.toString()));
    expect(await sepoliaOut().fee()).toBe(WALLET_CAP);
  });

  it('writes the quoted recipient, fee and deadline into the burn reason', async () => {
    quoting(quote('50000'));
    const reasonBytes = await sepoliaOut().reasonFor({ amount: 1_000_000n, destination: DESTINATION, maxFee: 50_000n });
    const reason = decodeBridgeBackReason(reasonBytes);
    expect(`0x${toHex(reason.feeRecipient)}`).toBe(COLLECTOR);
    expect(reason.feeAmount).toBe(50_000n);
    expect(reason.deadline).toBe(BigInt(DEADLINE));
    expect(reason.amount).toBe(1_000_000n);
    expect(`0x${toHex(reason.recipient)}`).toBe(DESTINATION);
  });

  it('builds no reason when the service now asks more than the user approved', async () => {
    quoting(quote('50001'));
    await expect(sepoliaOut().reasonFor({ amount: 1_000_000n, destination: DESTINATION, maxFee: 50_000n })).rejects.toThrow(/above/);
  });

  it('builds no reason above the wallet limit, whatever was approved', async () => {
    quoting(quote((WALLET_CAP + 1n).toString()));
    await expect(sepoliaOut().reasonFor({ amount: 100_000_000n, destination: DESTINATION, maxFee: 100_000_000n })).rejects.toThrow(/above/);
  });

  it('builds no reason when the fee would take the whole token', async () => {
    quoting(quote('50000'));
    await expect(sepoliaOut().reasonFor({ amount: 50_000n, destination: DESTINATION, maxFee: 50_000n })).rejects.toThrow(/leaves nothing/);
  });

  it('builds no reason from a quote that is not a fee', async () => {
    for (const bad of [{}, { ...quote('50000'), feeRecipient: '0x2b00' }, { ...quote('50000'), deadline: 1 }, quote('-5')]) {
      quoting(bad);
      await expect(sepoliaOut().reasonFor({ amount: 1_000_000n, destination: DESTINATION, maxFee: 50_000n })).rejects.toThrow();
    }
  });

  it('builds no reason when the service does not answer', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not found', { status: 404 })));
    await expect(sepoliaOut().reasonFor({ amount: 1_000_000n, destination: DESTINATION, maxFee: 50_000n })).rejects.toThrow(/fees/);
  });

  it('says the service did not say what it charges when its quote cannot be fetched', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not found', { status: 404 })));
    await expect(sepoliaOut().fee()).rejects.toThrow(/did not say what it charges.*fees/);
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(sepoliaOut().fee()).rejects.toThrow('The bridge service did not say what it charges: Failed to fetch');
  });

  it('pays the account this wallet is set to pay', async () => {
    quoting(quote('50000'));
    const out = sepoliaOut('0x2B00d708fc777F174A248B9bE01c8E8379d69Caf');
    expect(await out.fee()).toBe(50_000n);
    const reason = decodeBridgeBackReason(await out.reasonFor({ amount: 1_000_000n, destination: DESTINATION, maxFee: 50_000n }));
    expect(`0x${toHex(reason.feeRecipient)}`).toBe(COLLECTOR);
  });

  it('refuses a service that wants its fee paid to another account', async () => {
    quoting(quote('50000'));
    const out = sepoliaOut(`0x${'99'.repeat(20)}`);
    await expect(out.fee()).rejects.toThrow(/other than the account this wallet pays/);
    await expect(out.reasonFor({ amount: 1_000_000n, destination: DESTINATION, maxFee: 50_000n })).rejects.toThrow(/other than the account/);
  });

  it('takes a free quote whichever account the wallet is set to pay', async () => {
    quoting({ feeRecipient: `0x${'00'.repeat(20)}`, feeAmount: '0', deadline: DEADLINE });
    expect(await sepoliaOut(`0x${'99'.repeat(20)}`).fee()).toBe(0n);
  });

  it('offers no asset when the account to pay is not an address', () => {
    vi.stubEnv('VITE_BRIDGE_RETURN_SERVICE_URL_SEPOLIA_USDC', SERVICE);
    vi.stubEnv('VITE_BRIDGE_RETURN_FEE_RECIPIENT_SEPOLIA_USDC', 'not-an-address');
    expect(() => evmUsdc.load()).toThrow();
  });

  it('pays only the account the container names, whichever one the build names', async () => {
    // runtime-config.sh writes every key, so staging and prod name the account without a rebuild.
    quoting(quote('50000'));
    setRuntimeConfig({ BRIDGE_RETURN_FEE_RECIPIENT_SEPOLIA_USDC: OTHER_ACCOUNT });
    await expect(sepoliaOut(COLLECTOR).fee()).rejects.toThrow(/other than the account this wallet pays/);
    setRuntimeConfig({ BRIDGE_RETURN_FEE_RECIPIENT_SEPOLIA_USDC: COLLECTOR });
    expect(await sepoliaOut(OTHER_ACCOUNT).fee()).toBe(50_000n);
  });

  it('lets a container that names no account drop the one baked at build time', async () => {
    quoting(quote('50000'));
    setRuntimeConfig({ BRIDGE_RETURN_FEE_RECIPIENT_SEPOLIA_USDC: '' });
    expect(await sepoliaOut(OTHER_ACCOUNT).fee()).toBe(50_000n);
  });

  it('pays the account the build names when no container wrote the runtime config', async () => {
    // public/runtime-config.js, which dev and Pages builds ship, is an empty object.
    quoting(quote('50000'));
    setRuntimeConfig({});
    await expect(sepoliaOut(OTHER_ACCOUNT).fee()).rejects.toThrow(/other than the account this wallet pays/);
  });

  it('offers no asset when the account the container names is not an address', () => {
    vi.stubEnv('VITE_BRIDGE_RETURN_SERVICE_URL_SEPOLIA_USDC', SERVICE);
    setRuntimeConfig({ BRIDGE_RETURN_FEE_RECIPIENT_SEPOLIA_USDC: 'not-an-address' });
    expect(() => evmUsdc.load()).toThrow();
  });

  it('writes no fee when the service charges none', async () => {
    quoting({ feeRecipient: `0x${'00'.repeat(20)}`, feeAmount: '0', deadline: DEADLINE });
    const reason = decodeBridgeBackReason(await sepoliaOut().reasonFor({ amount: 1_000_000n, destination: DESTINATION, maxFee: 0n }));
    expect(reason.feeAmount).toBe(0n);
    expect(reason.feeRecipient).toEqual(new Uint8Array(20));
  });
});

describe('coversReturnFee', () => {
  it('needs something of the token to be left after the fee', () => {
    expect(coversReturnFee(50_001n, 50_000n)).toBe(true);
    expect(coversReturnFee(50_000n, 50_000n)).toBe(false);
    expect(coversReturnFee(10_000n, 50_000n)).toBe(false);
    expect(coversReturnFee(1n, 0n)).toBe(true);
  });
});

describe('tokensCoveringFee', () => {
  const tokens = [{ id: 'small', amount: '10000' }, { id: 'exact', amount: '50000' }, { id: 'large', amount: '1000000' }, { id: 'empty', amount: '' }];

  it('keeps only the tokens larger than the fee', () => {
    expect(tokensCoveringFee(tokens, 50_000n).map((t) => t.id)).toEqual(['large']);
  });

  it('keeps every token with a value when the service charges nothing', () => {
    expect(tokensCoveringFee(tokens, 0n).map((t) => t.id)).toEqual(['small', 'exact', 'large']);
  });

  it('keeps them all while the fee is not known', () => {
    expect(tokensCoveringFee(tokens, undefined)).toHaveLength(4);
  });
});
