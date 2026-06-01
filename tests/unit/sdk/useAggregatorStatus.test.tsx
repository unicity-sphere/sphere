/**
 * useAggregatorStatus — banner-side aggregator reachability probe (#329).
 *
 * The hook independently probes the aggregator from the page using
 * `GET /health` as the primary signal and a `POST /` JSON-RPC liveness
 * call as a fallback. It MUST NOT depend on the SDK's
 * `connectivity.aggregator` so the banner can read truth even when the
 * SDK pinger is mis-verdicting.
 *
 * The acceptance criteria in issue #329:
 *   - Probe returns 'up' even when `get_block_height` would be slow,
 *     as long as `GET /health` is healthy.
 *   - Probe returns 'down' when both `GET /health` is unreachable AND
 *     `get_block_height` throws.
 *   - Pure `fetch` — no new external dependencies.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { useAggregatorStatus } from '../../../src/sdk/hooks/core/useAggregatorStatus';
import { STORAGE_KEYS } from '../../../src/config/storageKeys';

/** Minimal Response stand-in: enough for the hook's `res.status` and
 *  `res.json()` reads. We avoid the real Response constructor so jsdom
 *  doesn't get cute about body streams in fake-timer mode. */
function fakeResponse(
  status: number,
  body: unknown,
): Response {
  return {
    status,
    json: async () => body,
  } as unknown as Response;
}

/** Standard healthy /health JSON shape from infra-probe. */
const HEALTHY_BODY = {
  status: 'healthy',
  database: 'ok',
  aggregators: { '0': 'ok', '1': 'ok' },
};

/** A structured JSON-RPC error reply. Any reply with .error or .result
 *  proves the handler is alive. */
const RPC_ERROR_BODY = {
  jsonrpc: '2.0',
  error: { code: -32602, message: 'Shard ID not found: __sphere_aggregator_probe__' },
  id: 1,
};

function renderHook() {
  function Harness() {
    const status = useAggregatorStatus();
    return <span data-testid="status">{status}</span>;
  }
  return render(<Harness />);
}

async function readStatus(): Promise<string | null> {
  return screen.getByTestId('status').textContent;
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useAggregatorStatus — primary /health verdict', () => {
  it('returns up when /health responds 200 healthy', async () => {
    const fetchMock = vi.fn(async () => fakeResponse(200, HEALTHY_BODY));
    vi.stubGlobal('fetch', fetchMock);

    renderHook();
    expect(await readStatus()).toBe('unknown');

    // Drain the queued microtask + the setTimeout(0) → probe → setState.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(await readStatus()).toBe('up');
    // /health was hit; JSON-RPC fallback was NOT.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0][0] as string)).toContain('/health');
  });

  it('returns degraded when /health responds 200 degraded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        fakeResponse(200, { ...HEALTHY_BODY, status: 'degraded' }),
      ),
    );

    renderHook();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(await readStatus()).toBe('degraded');
  });

  it('returns down when /health responds 200 unhealthy', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        fakeResponse(200, { ...HEALTHY_BODY, status: 'unhealthy' }),
      ),
    );

    renderHook();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(await readStatus()).toBe('down');
  });

  it('returns down when /health responds 5xx (server reachable but broken)', async () => {
    const fetchMock = vi.fn(async () => fakeResponse(503, 'unavailable'));
    vi.stubGlobal('fetch', fetchMock);

    renderHook();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(await readStatus()).toBe('down');
    // 5xx must NOT trigger a JSON-RPC fallback — same server, same
    // outcome, and the operator surface should alert on the 5xx
    // directly without waiting for the second probe to also fail.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('useAggregatorStatus — JSON-RPC fallback', () => {
  it('falls back to JSON-RPC when /health 4xx (older aggregator)', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/health')) return fakeResponse(404, 'Not Found');
      return fakeResponse(200, RPC_ERROR_BODY);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderHook();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(await readStatus()).toBe('up');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls back to JSON-RPC when /health throws (network error)', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/health')) throw new TypeError('Failed to fetch');
      return fakeResponse(200, RPC_ERROR_BODY);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderHook();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(await readStatus()).toBe('up');
  });

  it('falls back to JSON-RPC when /health 200 returns non-JSON body', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/health')) {
        return {
          status: 200,
          json: async () => {
            throw new SyntaxError('Unexpected token < in JSON');
          },
        } as unknown as Response;
      }
      return fakeResponse(200, { jsonrpc: '2.0', result: 42, id: 1 });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderHook();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(await readStatus()).toBe('up');
  });

  it('falls back to JSON-RPC when /health 200 has no status field', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/health')) return fakeResponse(200, { foo: 'bar' });
      return fakeResponse(200, RPC_ERROR_BODY);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderHook();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(await readStatus()).toBe('up');
  });
});

describe('useAggregatorStatus — issue #329 acceptance criteria', () => {
  it('returns up even when get_block_height would be slow, as long as /health is healthy', async () => {
    // The acceptance criterion: a slow read-path must NOT drag the
    // verdict down when /health is healthy. We satisfy this by never
    // even issuing the JSON-RPC call on a healthy verdict.
    const slowRpc = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          // Resolves at t=10s — well past the SDK's 8s timeout.
          setTimeout(() => resolve(fakeResponse(200, RPC_ERROR_BODY)), 10_000);
        }),
    );
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/health')) return fakeResponse(200, HEALTHY_BODY);
      return slowRpc();
    });
    vi.stubGlobal('fetch', fetchMock);

    renderHook();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(await readStatus()).toBe('up');
    // The slow JSON-RPC was never called because /health gave a clean
    // verdict. This is the design intent.
    expect(slowRpc).not.toHaveBeenCalled();
  });

  it('returns down when both /health is unreachable and JSON-RPC throws', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    vi.stubGlobal('fetch', fetchMock);

    renderHook();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(await readStatus()).toBe('down');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns down when /health 4xx AND JSON-RPC returns non-RPC garbage', async () => {
    // Steelman: a server that 404s `/health` AND replies to POST `/`
    // with an HTML 200 page is NOT a live JSON-RPC handler. We must
    // verdict 'down' — anything else would be a false-positive.
    const fetchMock = vi.fn(async () => fakeResponse(200, '<html>404</html>'));
    vi.stubGlobal('fetch', fetchMock);

    renderHook();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(await readStatus()).toBe('down');
  });
});

describe('useAggregatorStatus — dev override + backoff', () => {
  it('honors DEV_AGGREGATOR_URL when probing', async () => {
    localStorage.setItem(
      STORAGE_KEYS.DEV_AGGREGATOR_URL,
      'http://127.0.0.1:11003',
    );
    const fetchMock = vi.fn(async () => fakeResponse(200, HEALTHY_BODY));
    vi.stubGlobal('fetch', fetchMock);

    renderHook();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(await readStatus()).toBe('up');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:11003/health',
      expect.any(Object),
    );
  });

  it('strips trailing slashes from the dev override URL', async () => {
    localStorage.setItem(
      STORAGE_KEYS.DEV_AGGREGATOR_URL,
      'http://127.0.0.1:11003//',
    );
    const fetchMock = vi.fn(async () => fakeResponse(200, HEALTHY_BODY));
    vi.stubGlobal('fetch', fetchMock);

    renderHook();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:11003/health',
      expect.any(Object),
    );
  });

  it('resets backoff after recovery and re-probes within the shortest step (5s)', async () => {
    // Failing probe → step advances to 1 (15s delay).
    // We then advance time, swap in a passing fetch, and verify the
    // verdict flips back to 'up' and the next-probe delay resets to 5s.
    let healthy = false;
    const fetchMock = vi.fn(async () => {
      if (!healthy) throw new TypeError('Failed to fetch');
      return fakeResponse(200, HEALTHY_BODY);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderHook();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(await readStatus()).toBe('down');

    // Flip the world to healthy. The next probe runs at +5s (step 0).
    // After the FIRST failure, stepRef is 1 → delay 15s. So we have to
    // wait the full 15s before the next probe fires.
    healthy = true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(await readStatus()).toBe('up');

    // After success, backoff resets to step 0 → next probe in 5s.
    // Verify that by advancing 4s: still on 'up', no new probe yet.
    const callsAfterRecover = fetchMock.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(fetchMock.mock.calls.length).toBe(callsAfterRecover);

    // Advance the remaining 1s — probe fires at the 5s mark.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterRecover);
  });

  it('re-probes immediately on dev-config-changed', async () => {
    const fetchMock = vi.fn(async () => fakeResponse(200, HEALTHY_BODY));
    vi.stubGlobal('fetch', fetchMock);

    renderHook();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(await readStatus()).toBe('up');
    const callsBefore = fetchMock.mock.calls.length;

    // User flips DEV_AGGREGATOR_URL via the console. The event listener
    // calls setEpoch which triggers a re-render; the [epoch] effect
    // tears down and re-mounts, queuing a fresh setTimeout(probe, 0).
    // The two-act split ensures React's re-render + effect re-run
    // flushes BEFORE we advance fake timers — otherwise the 0ms timer
    // hasn't been scheduled yet when we try to drain it.
    await act(async () => {
      window.dispatchEvent(new Event('dev-config-changed'));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});

describe('useAggregatorStatus — probe shape', () => {
  it('uses GET for /health and POST + JSON-RPC body for the fallback', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/health')) throw new TypeError('Failed to fetch');
      return fakeResponse(200, RPC_ERROR_BODY);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderHook();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [healthUrl, healthInit] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(healthUrl).toContain('/health');
    expect(healthInit.method).toBe('GET');

    const [rpcUrl, rpcInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(rpcUrl.endsWith('/')).toBe(true);
    expect(rpcInit.method).toBe('POST');
    expect(
      (rpcInit.headers as Record<string, string>)['Content-Type'],
    ).toBe('application/json');
    const body = JSON.parse(rpcInit.body as string);
    expect(body.jsonrpc).toBe('2.0');
    expect(body.method).toBe('get_block_height');
    // Deliberately bogus shardId — cheap, guarantees a structured
    // error reply rather than triggering real SMT work.
    expect(typeof body.params.shardId).toBe('string');
  });
});
