/**
 * Canned SGW responses for dev mock mode (SUBSCRIPTION_MOCK). Lets the
 * subscription UI (Phases 2–4) be built and visually verified without a
 * live backend. Shapes must match the real client's types exactly.
 */
import type { PlanInfo, UtilizationInfo, ProvisionResult, CheckoutResult, OrderStatusInfo } from './subscriptionApi';

// Per-minute values are the seeded gateway plans (V25 = old rps × 60; V23 cents).
export const mockPlans: PlanInfo[] = [
  { planId: 2, name: 'basic', requestsPerMinute: 300, requestsPerDay: 50000, priceCents: 500, fiatCurrency: 'USD' },
  { planId: 3, name: 'standard', requestsPerMinute: 600, requestsPerDay: 100000, priceCents: 1500, fiatCurrency: 'USD' },
  { planId: 4, name: 'premium', requestsPerMinute: 1200, requestsPerDay: 500000, priceCents: 3000, fiatCurrency: 'USD' },
  { planId: 5, name: 'enterprise', requestsPerMinute: 3000, requestsPerDay: 1000000, priceCents: 10000, fiatCurrency: 'USD' },
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
  orderId: 'ssc-mock',
  redirectUrl: 'https://pay.example.test/gateway?token=mock',
};

export const mockOrderStatus: OrderStatusInfo = {
  orderId: 'ssc-mock',
  status: 'paid',
  statusName: 'Confirmed',
  fulfilled: true,
  confirming: false,
  apiKey: 'sk_mock_upgraded',
  keyShownOnce: true,
};
