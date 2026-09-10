/**
 * A gateway that is BLOCKED does not answer and does not refuse — the packets
 * are simply dropped. A bare fetch waits on that for as long as the browser
 * feels like, which is how "Activate free plan" became a button that does
 * nothing at all: no plan, no error, a spinner forever.
 *
 * Reported from support: a wallet with no subscription key for weeks, a new
 * wallet in a different browser behaving identically, and sends blocked with
 * nothing on screen explaining why.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getStorePlans, createStoreCheckout, SGW_TIMEOUT_MS, CHECKOUT_TIMEOUT_MS } from '@/services/subscriptionApi';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('subscription gateway client', () => {
  it('gives up on a request that never answers', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {}))); // dropped, never settles

    const pending = getStorePlans();
    // Attach the expectation before advancing so the rejection is never unhandled.
    const assertion = expect(pending).rejects.toThrow(/reach the subscription gateway/i);
    await vi.advanceTimersByTimeAsync(SGW_TIMEOUT_MS + 1);
    await assertion;
  });

  it('aborts the request it gave up on instead of leaving it in flight', async () => {
    let seen: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        seen = init.signal ?? undefined;
        return new Promise(() => {});
      }),
    );

    const pending = getStorePlans();
    const assertion = expect(pending).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(SGW_TIMEOUT_MS + 1);
    await assertion;

    expect(seen?.aborted).toBe(true);
  });

  it('says the gateway is unreachable when the connection itself fails', async () => {
    // What a browser reports for DNS failure, a refused connection or a CORS
    // block: a bare TypeError with no status to show the user.
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));

    await expect(getStorePlans()).rejects.toThrow(/reach the subscription gateway/i);
  });

  it('waits much longer for a checkout, because abandoning one can cost money twice', () => {
    // The gateway calls Paymento to mint a payment request, so this is the only
    // call whose latency is somebody else's. Give up on it and the order may
    // exist on the server with no record in the wallet — the buyer starts over
    // and ends up with two payable links for one purchase (#503).
    expect(CHECKOUT_TIMEOUT_MS).toBeGreaterThan(SGW_TIMEOUT_MS);
  });

  it('does not abandon a slow checkout at the ordinary deadline', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));

    const pending = createStoreCheckout(2, 'buyer@example.com');
    const settled = vi.fn();
    void pending.then(settled, settled);

    await vi.advanceTimersByTimeAsync(SGW_TIMEOUT_MS + 1_000);
    expect(settled).not.toHaveBeenCalled();

    // ...but it does eventually give up rather than hanging forever.
    const assertion = expect(pending).rejects.toThrow(/reach the subscription gateway/i);
    await vi.advanceTimersByTimeAsync(CHECKOUT_TIMEOUT_MS);
    await assertion;
  });

  it('still surfaces the gateway own message when it DOES answer', async () => {

    // A refusal is not an outage: the reason must survive.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'plan not sold here' }), { status: 400 })),
    );

    await expect(getStorePlans()).rejects.toThrow(/plan not sold here/i);
  });
});
