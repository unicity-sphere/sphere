/**
 * Canned SGW responses for dev mock mode (SUBSCRIPTION_MOCK). Lets the
 * subscription UI (Phases 2–4) be built and visually verified without a
 * live backend. Shapes must match the real client's types exactly.
 */
import type { PlanInfo, UsageInfo, KeyInfo, ProvisionResult, CheckoutResult } from './subscriptionApi';

export const mockPlans: PlanInfo[] = [
  { planId: 0, name: 'free', requestsPerSecond: 2, requestsPerDay: 500, price: '0' },
  { planId: 1, name: 'basic', requestsPerSecond: 5, requestsPerDay: 50000, price: '1000000' },
  { planId: 2, name: 'standard', requestsPerSecond: 10, requestsPerDay: 100000, price: '5000000' },
  { planId: 3, name: 'premium', requestsPerSecond: 20, requestsPerDay: 500000, price: '10000000' },
];

export const mockProvision: ProvisionResult = { apiKey: 'key_mock_free', plan: mockPlans[0], created: true };

export const mockUsage: UsageInfo = {
  perDay: { limit: 500, used: 497, remaining: 3, resetAt: null }, // low remaining → exercises the gate UX
  perSecond: { limit: 2, remaining: 2 },
};

export const mockKeyInfo: KeyInfo = {
  status: 'active',
  expiresAt: '2026-08-01T00:00:00Z',
  pricingPlan: { id: 0, planId: 0, name: 'free', requestsPerSecond: 2, requestsPerDay: 500, price: '0' },
};

export const mockCheckout: CheckoutResult = {
  paymentUrl: 'https://pay.example.test/checkout/mock-session',
  sessionId: 'mock-session',
};
