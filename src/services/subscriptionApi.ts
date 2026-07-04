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
  planId: number;
  name: string;
  requestsPerSecond: number;
  requestsPerDay: number;
  price: string; // legacy on-chain amount (UCT smallest units) — NOT for display
  /**
   * USD display price as a decimal string, e.g. "9.99"; "0"/absent = free.
   * Shown on the plan cards. The external checkout page lets the user pick the
   * actual payment currency; this is only the reference/base price.
   */
  priceUsd?: string;
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
  paymentUrl: string;
  sessionId: string;
}

interface Challenge {
  nonce: string;
  challenge: string;
  expiresAt: string;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${SUBSCRIPTION_API_URL}${path}`, init);
  if (!res.ok) throw new Error(`subscription ${path} failed: ${res.status}`);
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

export function createCheckout(apiKey: string, targetPlanId: number, returnUrl?: string): Promise<CheckoutResult> {
  if (SUBSCRIPTION_MOCK) return Promise.resolve(mock.mockCheckout);
  return postJson<CheckoutResult>(
    '/api/payment/checkout',
    { targetPlanId, ...(returnUrl ? { returnUrl } : {}) },
    { 'x-api-key': apiKey },
  );
}
