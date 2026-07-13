import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useIdentity } from '../../../src/sdk/hooks/core/useIdentity';

const PUBKEY = '02' + 'ab'.repeat(32);
const DIRECT = 'DIRECT://0000abcd1234';

// The hook reads sphere.identity via useSphereContext — swap in a fake.
let fakeSphere: { identity: Record<string, string> } | null = null;
vi.mock('../../../src/sdk/hooks/core/useSphere', () => ({
  useSphereContext: () => ({ sphere: fakeSphere }),
}));

function Wrapper({ children }: { children: ReactNode }) {
  const [qc] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  fakeSphere = null;
});

describe('useIdentity — pubkey-first display (#411)', () => {
  it('prefers @nametag for displayName', async () => {
    fakeSphere = { identity: { chainPubkey: PUBKEY, directAddress: DIRECT, nametag: 'alice' } };
    const { result } = renderHook(() => useIdentity(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.identity).not.toBeNull());
    expect(result.current.displayName).toBe('@alice');
    expect(result.current.chainPubkey).toBe(PUBKEY);
  });

  it('falls back to truncated chainPubkey — never the DIRECT address', async () => {
    fakeSphere = { identity: { chainPubkey: PUBKEY, directAddress: DIRECT } };
    const { result } = renderHook(() => useIdentity(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.identity).not.toBeNull());
    expect(result.current.displayName).toBe(`${PUBKEY.slice(0, 6)}...${PUBKEY.slice(-4)}`);
    expect(result.current.shortAddress).toBe(`${PUBKEY.slice(0, 6)}...${PUBKEY.slice(-4)}`);
    expect(result.current.displayName).not.toContain('DIRECT');
    // directAddress itself stays exposed for internal (non-display) consumers
    expect(result.current.directAddress).toBe(DIRECT);
  });

  it('returns Unknown / empty when there is no identity', () => {
    const { result } = renderHook(() => useIdentity(), { wrapper: Wrapper });
    expect(result.current.displayName).toBe('Unknown');
    expect(result.current.shortAddress).toBe('');
    expect(result.current.chainPubkey).toBeNull();
  });
});
