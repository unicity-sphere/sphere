/**
 * SGW (aggregator-subscription) client. Bootstrap auth is identity-bound
 * challenge/verify (Sphere signMessage); every other call authenticates with
 * the returned apiKey via the X-API-Key header. Contract: design spec §4–5.
 */
import type { Sphere } from '@unicitylabs/sphere-sdk';
import { SUBSCRIPTION_API_URL, SUBSCRIPTION_MOCK } from '../config/subscription';
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
  apiKey?: string; // revealed exactly once, when fulfilled
  keyShownOnce?: boolean;
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
 */
export async function provisionOrRecoverKey(sphere: Sphere): Promise<ProvisionResult> {
  if (SUBSCRIPTION_MOCK) return mock.mockProvision;
  const pubkey = sphere.identity?.chainPubkey;
  if (!pubkey) throw new Error('Wallet identity unavailable (no chainPubkey)');

  const { nonce, challenge } = await postJson<Challenge>('/auth/challenge', { pubkey });
  verifySgwChallenge(challenge, { pubkey, nonce }); // never sign unverified server text
  const signature = sphere.signMessage(challenge);
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

/** Starts a Paymento checkout session for the given plan; redirect the user to `redirectUrl`. */
export function createStoreCheckout(planId: number, email: string): Promise<CheckoutResult> {
  if (SUBSCRIPTION_MOCK) return Promise.resolve(mock.mockCheckout);
  return postJson<CheckoutResult>('/api/paymento/checkout', { planId, email });
}

/** Polls the fulfillment status of a checkout order; apiKey is surfaced exactly once, when fulfilled. */
export function getOrderStatus(orderId: string): Promise<OrderStatusInfo> {
  if (SUBSCRIPTION_MOCK) return Promise.resolve(mock.mockOrderStatus);
  return request<OrderStatusInfo>(`/api/paymento/order-status?orderId=${encodeURIComponent(orderId)}`);
}
