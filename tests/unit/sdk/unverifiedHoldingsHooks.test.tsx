import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import type { Asset, Token } from '@unicitylabs/sphere-sdk';

const COIN = 'bb'.repeat(32);
const asset = (over: Partial<Asset> = {}) => ({ coinId: COIN, symbol: 'X', name: 'x', decimals: 0, totalAmount: '10', ...over }) as Asset;
const token = (id: string, over: Partial<Token> = {}) => ({ id, coinId: COIN, symbol: 'X', name: 'x', decimals: 0, amount: '10', status: 'confirmed', ...over }) as Token;

const payments = {
  assets: vi.fn(async () => [asset()]),
  unverifiedAssets: vi.fn(async () => [asset({ unverified: 'refused' })]),
  tokens: vi.fn(() => [token('v')]),
  unverifiedTokens: vi.fn(() => [token('u', { unverified: 'pending' })]),
};

vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: { payments }, walletApiEnabled: false }),
}));
vi.mock('../../../src/sdk/hooks/payments/useRegistryReady', () => ({ useRegistryReady: () => false }));

import { useAssets, useUnverifiedAssets } from '../../../src/sdk/hooks/payments/useAssets';
import { useTokens, useUnverifiedTokens } from '../../../src/sdk/hooks/payments/useTokens';

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => React.createElement(QueryClientProvider, { client }, children);
}

describe('holdings hooks', () => {
  it('useAssets and useTokens return only holdings that count, as the SDK reads them', async () => {
    const assets = renderHook(() => useAssets(), { wrapper: wrapper() });
    const tokens = renderHook(() => useTokens(), { wrapper: wrapper() });

    await waitFor(() => expect(assets.result.current.assets).toHaveLength(1));
    await waitFor(() => expect(tokens.result.current.tokens).toHaveLength(1));
    expect(assets.result.current.assets[0]?.unverified).toBeUndefined();
    expect(tokens.result.current.tokens.map((t) => t.id)).toEqual(['v']);
  });

  it('useUnverifiedAssets and useUnverifiedTokens return the rest, for the list views only', async () => {
    const assets = renderHook(() => useUnverifiedAssets(), { wrapper: wrapper() });
    const tokens = renderHook(() => useUnverifiedTokens(), { wrapper: wrapper() });

    await waitFor(() => expect(assets.result.current.assets).toHaveLength(1));
    await waitFor(() => expect(tokens.result.current.tokens).toHaveLength(1));
    expect(assets.result.current.assets[0]?.unverified).toBe('refused');
    expect(tokens.result.current.tokens.map((t) => [t.id, t.unverified])).toEqual([['u', 'pending']]);
  });
});
