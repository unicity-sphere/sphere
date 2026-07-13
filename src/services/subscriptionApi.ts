/**
 * SGW (aggregator-subscription) client. Bootstrap auth is identity-bound
 * challenge/verify (Sphere signMessage); every other call authenticates with
 * the returned apiKey via the X-API-Key header. Contract: design spec §4–5.
 */
import type { Sphere } from '@unicitylabs/sphere-sdk';
import { getPublicKey, signMessage } from '@unicitylabs/sphere-sdk';
import { SUBSCRIPTION_API_URL, SUBSCRIPTION_MOCK } from '../config/subscription';
import { SPHERE_NETWORK } from '../config/network';
import { verifySgwChallenge } from './sgwChallenge';
import * as mock from './subscriptionApi.mock';

export interface PlanInfo {
  planId: number; // store endpoint calls this `id`
  name: string;
  requestsPerMinute: number;
  requestsPerDay: number;
  priceCents: number; // 0 = free (synthetic card only — store list excludes free)
  fiatCurrency: string;
}

export interface ProvisionResult {
  apiKey: string;
  /** Plan NAME string, e.g. "free" — the gateway does not return a plan object here. */
  plan: string;
  created: boolean;
}

export interface UtilizationInfo {
  status: 'active' | 'expired' | 'inactive';
  plan: { name: string; requestsPerMinute: number; requestsPerDay: number } | null;
  activeUntil: string | null;
  utilization: {
    consumedPerMinute: number;
    maxPerMinute: number;
    availablePerMinute: number;
    utilizationPercentPerMinute: number;
    consumedPerDay: number;
    maxPerDay: number;
    availablePerDay: number;
    utilizationPercentPerDay: number;
  };
}

export interface CheckoutResult {
  orderId: string;
  redirectUrl: string;
}

export interface OrderStatusInfo {
  orderId: string;
  status: 'created' | 'pending' | 'paid' | 'failed';
  statusName: string;
  fulfilled: boolean;
  confirming: boolean;
  /**
   * Fresh key of a non-upgrade order. Current gateways deliver it on EVERY
   * poll until receipt is confirmed via order-key-ack; pre-ack gateways
   * revealed it exactly once (first poll after fulfilment consumed it).
   */
  apiKey?: string;
  /** True when this order upgrades an existing key in place (absent on pre-ack gateways). */
  upgrade?: boolean;
  /** Masked upgraded key, e.g. "sk_...abcd" — upgrade orders only. */
  maskedKey?: string;
  /** Purchased plan name — fulfilled upgrade orders only. */
  planName?: string;
}

export interface KeyInfo {
  maskedKey: string;
  planName: string | null;
  subscriptionState: 'active' | 'expired' | 'inactive';
  activeUntil: string | null;
}

interface StorePlanWire {
  id: number;
  name: string;
  requestsPerMinute: number;
  requestsPerDay: number;
  priceCents: number;
  fiatCurrency: string;
}

interface Challenge {
  nonce: string;
  challenge: string;
  expiresAt: string;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${SUBSCRIPTION_API_URL}${path}`, init);
  if (!res.ok) {
    // The gateway sends {"error": "<human-readable message>"} — surface it.
    const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
    const detail = typeof body?.error === 'string' && body.error !== '' ? body.error : null;
    throw new Error(detail ?? `subscription ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function postJson<T>(path: string, body: unknown, extraHeaders?: Record<string, string>): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(extraHeaders ?? {}) },
    body: JSON.stringify(body),
  });
}

/**
 * Challenge -> validate -> signMessage -> verify. Idempotent get-or-create of
 * the wallet's free-plan key. Used by BOTH create (created=true) and restore
 * (created=false). The challenge template is validated before signing so the
 * wallet never signs unverified server-chosen text; it is still signed
 * VERBATIM (never re-serialized) once validated.
 *
 * scope 'wallet' (default): the identity is ALWAYS the wallet's index-0
 * address key — stable across active-address switches, so one wallet maps to
 * one gateway key and the same key is recovered on any device regardless of
 * which address is selected.
 * scope 'address': the ACTIVE address's own identity — gives that address its
 * own separate free key/quota (the gateway get-or-creates per pubkey).
 * (Keys are bearer tokens; the pubkey binding exists only for this free-tier
 * get-or-create.)
 */
export async function provisionOrRecoverKey(
  sphere: Sphere,
  opts?: { scope?: 'wallet' | 'address' },
): Promise<ProvisionResult> {
  if (SUBSCRIPTION_MOCK) return mock.mockProvision;

  let pubkey: string;
  let sign: (challenge: string) => string;
  if (opts?.scope === 'address') {
    const active = sphere.identity?.chainPubkey;
    if (!active) throw new Error('Wallet identity unavailable (no active address)');
    pubkey = active;
    sign = (c) => sphere.signMessage(c); // signs with the active identity's key
  } else {
    const { privateKey } = sphere.deriveAddress(0);
    if (!privateKey) throw new Error('Wallet identity unavailable (no root key)');
    pubkey = getPublicKey(privateKey);
    sign = (c) => signMessage(privateKey, c);
  }

  const { nonce, challenge } = await postJson<Challenge>('/auth/challenge', { pubkey });
  // never sign unverified server text; pin our network so a relayed challenge
  // from another network's SGW can't be signed here (see verifySgwChallenge).
  verifySgwChallenge(challenge, { network: SPHERE_NETWORK, pubkey, nonce });
  const signature = sign(challenge);
  return postJson<ProvisionResult>('/auth/verify', { nonce, signature });
}

/** Combined plan + usage snapshot for the current key. Replaces getKeyInfo/getUsage. */
export function getUtilization(apiKey: string): Promise<UtilizationInfo> {
  if (SUBSCRIPTION_MOCK) return Promise.resolve(mock.mockUtilization);
  return request<UtilizationInfo>('/api/utilization', { headers: { 'x-api-key': apiKey } });
}

/** Store (Paymento) catalog — maps the store's `id` field to `planId`. */
export async function getStorePlans(): Promise<PlanInfo[]> {
  if (SUBSCRIPTION_MOCK) return mock.mockPlans;
  const data = await request<{ availablePlans: StorePlanWire[] }>('/api/paymento/plans');
  return data.availablePlans.map(({ id, ...rest }) => ({ planId: id, ...rest }));
}

/**
 * Starts a Paymento checkout session for the given plan; redirect the user to
 * `redirectUrl`. Passing `upgradeApiKey` asks the gateway to upgrade that
 * existing key IN PLACE (same key string, purchased plan, fresh 30-day window)
 * instead of minting a new one; the gateway rejects unknown/revoked keys with
 * a 400 up front. Pre-upgrade gateways ignore the extra field and mint a new
 * key — callers detect which happened via order-status's `upgrade` flag.
 */
export function createStoreCheckout(planId: number, email: string, upgradeApiKey?: string): Promise<CheckoutResult> {
  if (SUBSCRIPTION_MOCK) return Promise.resolve(mock.mockCheckout);
  const apiKey = upgradeApiKey?.trim();
  return postJson<CheckoutResult>('/api/paymento/checkout', apiKey ? { planId, email, apiKey } : { planId, email });
}

/** Polls the fulfillment status of a checkout order (see OrderStatusInfo for key-delivery semantics). */
export function getOrderStatus(orderId: string): Promise<OrderStatusInfo> {
  if (SUBSCRIPTION_MOCK) return Promise.resolve(mock.mockOrderStatus);
  return request<OrderStatusInfo>(`/api/paymento/order-status?orderId=${encodeURIComponent(orderId)}`);
}

/**
 * Confirms the freshly issued key was received and durably stored, ending its
 * delivery in order-status responses — call ONLY after the key is persisted,
 * since a premature ack makes a lost key unrecoverable. Never throws: true
 * when acknowledged, false on a definitive refusal (404 = unknown order or a
 * pre-ack gateway without the route; 409 = upgrade/unfulfilled order) or after
 * the retry budget for transient failures is exhausted.
 */
export async function ackOrderKeyDelivery(
  orderId: string,
  opts: { attempts?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<boolean> {
  if (SUBSCRIPTION_MOCK) return true;
  const attempts = opts.attempts ?? 3;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(
        `${SUBSCRIPTION_API_URL}/api/paymento/order-key-ack?orderId=${encodeURIComponent(orderId)}`,
        { method: 'POST' },
      );
      if (res.ok) return true;
      if (res.status === 404 || res.status === 409) return false; // definitive — retrying can't change it
    } catch {
      // transient (network) — retry below
    }
    if (attempt < attempts) await sleep(1000 * attempt);
  }
  return false;
}

/**
 * Read-only lookup of a key — the key itself is the credential. Returns null
 * ONLY on the gateway's definitive "Unknown API key." 404 (unknown or revoked
 * key); any other failure throws, including the route-missing 404 of pre-ack
 * gateways ("Not found") — a missing endpoint must never read as a dead key.
 */
export async function getKeyInfo(apiKey: string): Promise<KeyInfo | null> {
  if (SUBSCRIPTION_MOCK) return mock.mockKeyInfo;
  const res = await fetch(`${SUBSCRIPTION_API_URL}/api/paymento/key-info`, { headers: { 'x-api-key': apiKey } });
  if (res.ok) return res.json() as Promise<KeyInfo>;
  const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
  const detail = typeof body?.error === 'string' && body.error !== '' ? body.error : null;
  if (res.status === 404 && detail === 'Unknown API key.') return null;
  throw new Error(detail ?? `subscription /api/paymento/key-info failed: ${res.status}`);
}
