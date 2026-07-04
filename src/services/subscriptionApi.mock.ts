/**
 * Canned SGW responses for dev mock mode (SUBSCRIPTION_MOCK). Lets the
 * subscription UI (Phases 2–4) be built and visually verified without a
 * live backend. Shapes must match the real client's types exactly.
 */
import type { PlanInfo, UtilizationInfo, ProvisionResult, CheckoutResult } from './subscriptionApi';

export const mockPlans: PlanInfo[] = [
  { planId: 0, name: 'free', requestsPerSecond: 2, requestsPerDay: 500, price: '0', priceUsd: '0' },
  { planId: 1, name: 'basic', requestsPerSecond: 5, requestsPerDay: 50000, price: '1000000', priceUsd: '4.99' },
  { planId: 2, name: 'standard', requestsPerSecond: 10, requestsPerDay: 100000, price: '5000000', priceUsd: '9.99' },
  { planId: 3, name: 'premium', requestsPerSecond: 20, requestsPerDay: 500000, price: '10000000', priceUsd: '29.99' },
];

export const mockProvision: ProvisionResult = { apiKey: 'sk_mock_free', plan: 'free', created: true };

export const mockUtilization: UtilizationInfo = {
  status: 'active',
  activeUntil: null, // free keys never expire
  plan: { name: 'free', requestsPerMinute: 60, requestsPerDay: 1000 },
  utilization: {
    consumedPerMinute: 12,
    maxPerMinute: 60,
    availablePerMinute: 48,
    utilizationPercentPerMinute: 20,
    consumedPerDay: 970,
    maxPerDay: 1000,
    availablePerDay: 30,
    utilizationPercentPerDay: 97, // near-limit UI
  },
};

export const mockCheckout: CheckoutResult = {
  paymentUrl: 'https://pay.example.test/checkout/mock-session',
  sessionId: 'mock-session',
};
