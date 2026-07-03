/**
 * SGW (aggregator-subscription) client. Bootstrap auth is identity-bound
 * challenge/verify (Sphere signMessage); every other call authenticates with
 * the returned apiKey via the X-API-Key header. Contract: design spec §4–5.
 */
import type { Sphere } from '@unicitylabs/sphere-sdk';
import { SUBSCRIPTION_API_URL, SUBSCRIPTION_MOCK } from '../config/subscription';
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
  plan: PlanInfo;
  created: boolean;
}

export interface UsageInfo {
  perDay: { limit: number; used: number; remaining: number; resetAt: string | null };
  perSecond: { limit: number; remaining: number };
}

export interface KeyInfo {
  status: string;
  expiresAt: string | null;
  // NB: the key-info endpoint's plan node uses `id` (NOT `planId`) for the plan
  // id — /api/payment/plans uses `planId` for the same value. See
  // aggregator-subscription docs/API.md (GET /api/payment/key/{apiKey}).
  pricingPlan: {
    id: number;
    name: string;
    requestsPerSecond: number;
    requestsPerDay: number;
    price: string;
  } | null;
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
 * Challenge -> signMessage -> verify. Idempotent get-or-create of the wallet's
 * free-plan key. Used by BOTH create (created=true) and restore (created=false).
 */
export async function provisionOrRecoverKey(sphere: Sphere): Promise<ProvisionResult> {
  if (SUBSCRIPTION_MOCK) return mock.mockProvision;
  const pubkey = sphere.identity?.chainPubkey;
  if (!pubkey) throw new Error('Wallet identity unavailable (no chainPubkey)');

  const { nonce, challenge } = await postJson<Challenge>('/auth/challenge', { pubkey });
  const signature = sphere.signMessage(challenge);
  return postJson<ProvisionResult>('/auth/verify', { nonce, signature });
}

export async function getPlans(): Promise<PlanInfo[]> {
  if (SUBSCRIPTION_MOCK) return mock.mockPlans;
  const data = await request<{ availablePlans: PlanInfo[] }>('/api/payment/plans');
  return data.availablePlans;
}

export function getKeyInfo(apiKey: string): Promise<KeyInfo> {
  if (SUBSCRIPTION_MOCK) return Promise.resolve(mock.mockKeyInfo);
  return request<KeyInfo>(`/api/payment/key/${encodeURIComponent(apiKey)}`, {
    headers: { 'x-api-key': apiKey },
  });
}

export function getUsage(apiKey: string): Promise<UsageInfo> {
  if (SUBSCRIPTION_MOCK) return Promise.resolve(mock.mockUsage);
  return request<UsageInfo>(`/api/payment/key/${encodeURIComponent(apiKey)}/usage`, {
    headers: { 'x-api-key': apiKey },
  });
}

export function createCheckout(apiKey: string, targetPlanId: number, returnUrl?: string): Promise<CheckoutResult> {
  if (SUBSCRIPTION_MOCK) return Promise.resolve(mock.mockCheckout);
  return postJson<CheckoutResult>(
    '/api/payment/checkout',
    { targetPlanId, ...(returnUrl ? { returnUrl } : {}) },
    { 'x-api-key': apiKey },
  );
}
