import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Sphere } from '@unicitylabs/sphere-sdk';
import { createAnnouncementsClient } from '@/services/announcementsClient';

const fetchMock = vi.fn();

// A JWT is already in storage for every test here, so ensureJwt()
// short-circuits on its cached-token path and never touches
// sphere.identity/signMessage — see src/services/userApi.ts. That keeps this
// suite about announcementsClient's own request shape, not sign-in.
const getSphere = () => ({} as Sphere);

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  localStorage.setItem('sphere_user_jwt', 'test-jwt');
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

function ok(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
}

function noContent() {
  return Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve(undefined) } as Response);
}

function headersOf(callIndex: number): Headers {
  const init = fetchMock.mock.calls[callIndex][1] as RequestInit | undefined;
  return new Headers(init?.headers);
}

describe('announcementsClient (sphere)', () => {
  it('fetches the feed and returns it unwrapped', async () => {
    const feed = { items: [{ id: 'a1' }], unreadCount: 1, autoOpen: null, prefs: { autoOpenEnabled: true } };
    fetchMock.mockReturnValueOnce(ok(feed));
    const client = createAnnouncementsClient(getSphere);
    await expect(client.getFeed()).resolves.toEqual(feed);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/announcements');
  });

  it('sends the sphere client header and the bearer token', async () => {
    fetchMock.mockReturnValueOnce(ok({ items: [], unreadCount: 0, autoOpen: null, prefs: { autoOpenEnabled: true } }));
    const client = createAnnouncementsClient(getSphere);
    await client.getFeed();
    expect(headersOf(0).get('x-client')).toBe('sphere');
    expect(headersOf(0).get('authorization')).toBe('Bearer test-jwt');
  });

  it('paginates the archive with a cursor', async () => {
    fetchMock.mockReturnValueOnce(ok({ items: [], nextCursor: null }));
    const client = createAnnouncementsClient(getSphere);
    await client.getArchive('2026-07-01T00:00:00.000Z');
    // `toContain`, not an absolute-URL `toBe`: the base URL is
    // VITE_SPHERE_API_URL ?? the localhost default, so a developer with the
    // env var set in `.env` would otherwise fail this for no real reason.
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/announcements/archive?cursor=2026-07-01T00%3A00%3A00.000Z');
  });

  it('omits the cursor query entirely when none is given', async () => {
    fetchMock.mockReturnValueOnce(ok({ items: [], nextCursor: null }));
    const client = createAnnouncementsClient(getSphere);
    await client.getArchive();
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/api/announcements/archive');
    expect(url).not.toContain('?');
  });

  it('marks a single announcement read with its via', async () => {
    fetchMock.mockReturnValueOnce(noContent());
    const client = createAnnouncementsClient(getSphere);
    await client.markRead('a1', 'modal');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain('/api/announcements/a1/read');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ via: 'modal' });
  });

  it('marks everything read through its own endpoint', async () => {
    fetchMock.mockReturnValueOnce(noContent());
    const client = createAnnouncementsClient(getSphere);
    await client.markAllRead();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain('/api/announcements/read-all');
    expect(init.method).toBe('POST');
  });

  it('records a click', async () => {
    fetchMock.mockReturnValueOnce(noContent());
    const client = createAnnouncementsClient(getSphere);
    await client.recordClick('a1');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain('/api/announcements/a1/click');
    expect(init.method).toBe('POST');
  });

  it('sets the auto-open preference via PUT', async () => {
    fetchMock.mockReturnValueOnce(noContent());
    const client = createAnnouncementsClient(getSphere);
    await client.setPrefs(false);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain('/api/announcements/prefs');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ autoOpenEnabled: false });
  });

  it('refuses to call out before the wallet is initialized, rather than crash', async () => {
    const client = createAnnouncementsClient(() => null);
    await expect(client.getFeed()).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
