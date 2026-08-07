/**
 * The one rule this module has to keep: it never sends a URL.
 *
 * The Google tag it replaces sent `page_location` as the full href, so the Connect
 * popup's `?origin=<dApp>` reached Google on every connect, along with `?url=` and
 * `?nametag=`. Sending a route PATTERN instead makes that structurally impossible
 * rather than filtered — which matters, because external agents deep-link into the
 * wallet with parameters no first-party code produces, so a denylist could never be
 * complete.
 *
 * Most of these therefore assert on what is ABSENT from the request body.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/config/sentry', () => ({
  detectEnvironment: () => 'production',
  SENTRY_DSN: '',
}));

import { getOrCreateClientId, routePatternFor, trackPageView } from '../../../src/services/telemetry';
import { STORAGE_KEYS } from '../../../src/config/storageKeys';

// Typed as the real fetch: `vi.fn(() => …)` infers a ZERO-arg mock, so
// `mock.calls[n][1]` is a missing tuple element and every read of the request
// init below fails to compile.
const fetchMock = vi.fn<typeof globalThis.fetch>(() =>
  Promise.resolve(new Response(null, { status: 204 }))
);

function bodyOf(call: number): Record<string, unknown> {
  const init = fetchMock.mock.calls[call]![1]!;
  return JSON.parse(init.body as string);
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('VITE_SPHERE_API_URL', 'https://api.example');
  localStorage.clear();
  sessionStorage.clear();
  document.cookie = '_ga=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  fetchMock.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('routePatternFor', () => {
  it('returns the pattern, never the path, for a parameterised route', () => {
    // `custom` is exactly the value that pairs with a ?url= naming a third-party app.
    expect(routePatternFor('/agents/custom')).toBe('/agents/:agentId');
    expect(routePatternFor('/agents/dm')).toBe('/agents/:agentId');
    expect(routePatternFor('/apps/some-slug')).toBe('/apps/:slug');
  });

  it('matches static routes exactly', () => {
    expect(routePatternFor('/')).toBe('/');
    expect(routePatternFor('/connect')).toBe('/connect');
    expect(routePatternFor('/developers/docs')).toBe('/developers/docs');
  });

  it('fails closed on anything it does not recognise', () => {
    // Guessing whether an unknown segment is a page name or somebody's nametag is
    // exactly the judgement this must not make.
    expect(routePatternFor('/agents/dm/extra')).toBeNull();
    expect(routePatternFor('/totally/new/page')).toBeNull();
  });
});

describe('trackPageView', () => {
  it('sends the pattern and no URL', () => {
    trackPageView('/agents/custom');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = bodyOf(0);
    expect(body.route).toBe('/agents/:agentId');
    expect(JSON.stringify(body)).not.toContain('custom');
  });

  it('cannot leak a query string or fragment, because it is never given one', () => {
    // The caller passes a pathname; even if it did not, matching would reject it.
    trackPageView('/agents/dm?nametag=alice');
    trackPageView('/connect?origin=https://dapp.example');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('identifies the client so the server can pick the right property', () => {
    trackPageView('/home');
    const init = fetchMock.mock.calls[0]![1]!;
    expect((init.headers as Record<string, string>)['X-Client']).toBe('sphere');
    expect(init.keepalive).toBe(true);
  });

  it('stays silent for a route it does not know', () => {
    trackPageView('/totally/new/page');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does nothing when the API base is empty, instead of posting at our own origin', () => {
    // The Docker image sed-substitutes an unset SPHERE_API_URL to '', and `??` does not
    // catch ''. Other consumers fall back to the wallet origin; telemetry must not.
    vi.stubEnv('VITE_SPHERE_API_URL', '');
    trackPageView('/home');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never throws, whatever the network does', () => {
    fetchMock.mockImplementationOnce(() => { throw new Error('offline'); });
    expect(() => trackPageView('/home')).not.toThrow();
  });
});

describe('client id', () => {
  it('is stable across calls and persisted under the sphere_ prefix', () => {
    const first = getOrCreateClientId();
    expect(getOrCreateClientId()).toBe(first);
    // The prefix is what makes clearAllSphereData() reset the analytics identity too.
    expect(localStorage.getItem(STORAGE_KEYS.TELEMETRY_CLIENT_ID)).toBe(first);
    expect(STORAGE_KEYS.TELEMETRY_CLIENT_ID.startsWith('sphere_')).toBe(true);
  });

  it('has the opaque GA shape and carries nothing about the wallet', () => {
    expect(getOrCreateClientId()).toMatch(/^\d+\.\d+$/);
  });

  it('adopts the id left behind in the _ga cookie, so returning users survive the cutover', () => {
    // _ga is first-party: the removed tag wrote it on our own domain, and it keeps its
    // two-year expiry. Reading it is not "keeping gtag around" — no script runs.
    document.cookie = '_ga=GA1.1.1837465102.1753660800';
    expect(getOrCreateClientId()).toBe('1837465102.1753660800');
  });

  it('mints a fresh id when the cookie is absent or malformed', () => {
    document.cookie = '_ga=nonsense';
    const id = getOrCreateClientId();
    expect(id).toMatch(/^\d+\.\d+$/);
    expect(id).not.toBe('nonsense');
  });

  it('prefers the value already stored over the cookie', () => {
    localStorage.setItem(STORAGE_KEYS.TELEMETRY_CLIENT_ID, '111.222');
    document.cookie = '_ga=GA1.1.1837465102.1753660800';
    expect(getOrCreateClientId()).toBe('111.222');
  });
});
