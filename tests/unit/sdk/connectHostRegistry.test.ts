/**
 * The registry is a COLLECTION, not a slot.
 *
 * DesktopLayout keeps every open tab mounted (inactive tabs are `hidden`, not
 * unmounted), so N framed dApps mean N live ConnectHosts. With a single slot a lock
 * reached only the last-registered host — every other framed dApp kept talking to a
 * wallet it believed was unlocked — and any tab's cleanup nulled a live neighbour.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ConnectHost } from '@unicitylabs/sphere-sdk/connect';
import {
  registerConnectHost,
  unregisterConnectHost,
  getConnectHostEntry,
  getConnectHosts,
  forEachConnectHost,
  clearConnectHosts,
} from '../../../src/sdk/connectHostRegistry';

function fakeHost(name: string): ConnectHost {
  return { __name: name } as unknown as ConnectHost;
}

beforeEach(() => {
  clearConnectHosts();
});

describe('connectHostRegistry', () => {
  it('starts empty', () => {
    expect(getConnectHosts()).toEqual([]);
  });

  it('keeps every registered host, not just the last one', () => {
    const a = fakeHost('a');
    const b = fakeHost('b');

    registerConnectHost(a, { origin: 'https://a.example' });
    registerConnectHost(b, { origin: 'https://b.example' });

    expect(getConnectHosts()).toEqual([a, b]);
    expect(getConnectHostEntry(a)?.origin).toBe('https://a.example');
    expect(getConnectHostEntry(b)?.origin).toBe('https://b.example');
  });

  it('unregisters ONLY the host given — a tab unmounting cannot evict a neighbour', () => {
    const a = fakeHost('a');
    const b = fakeHost('b');
    registerConnectHost(a, { origin: 'https://a.example' });
    registerConnectHost(b, { origin: 'https://b.example' });

    unregisterConnectHost(a);

    expect(getConnectHosts()).toEqual([b]);
    expect(getConnectHostEntry(a)).toBeUndefined();
  });

  it('unregistering an unknown host is a no-op', () => {
    const a = fakeHost('a');
    registerConnectHost(a, { origin: 'https://a.example' });

    expect(() => unregisterConnectHost(fakeHost('ghost'))).not.toThrow();
    expect(getConnectHosts()).toEqual([a]);
  });

  it('re-registering the same host replaces its entry rather than duplicating it', () => {
    const a = fakeHost('a');
    registerConnectHost(a, { origin: 'https://old.example' });

    registerConnectHost(a, { origin: 'https://new.example' });

    expect(getConnectHosts()).toEqual([a]);
    expect(getConnectHostEntry(a)?.origin).toBe('https://new.example');
  });

  it('fans out to EVERY host, with its entry', () => {
    const a = fakeHost('a');
    const b = fakeHost('b');
    registerConnectHost(a, { origin: 'https://a.example' });
    registerConnectHost(b, { origin: 'https://b.example' });

    const seen: Array<[ConnectHost, string]> = [];
    forEachConnectHost((host, entry) => { seen.push([host, entry.origin]); });

    expect(seen).toEqual([[a, 'https://a.example'], [b, 'https://b.example']]);
  });

  it('a throwing callback does not stop the fan-out', () => {
    const a = fakeHost('a');
    const b = fakeHost('b');
    registerConnectHost(a, { origin: 'https://a.example' });
    registerConnectHost(b, { origin: 'https://b.example' });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const reached: string[] = [];

    forEachConnectHost((host) => {
      if (host === a) throw new Error('this host is dead');
      reached.push('b');
    });

    // One dead host must not leave the others believing the wallet is unlocked.
    expect(reached).toEqual(['b']);
    warn.mockRestore();
  });

  it('iterates a snapshot, so a callback may unregister mid-fan-out', () => {
    const a = fakeHost('a');
    const b = fakeHost('b');
    registerConnectHost(a, { origin: 'https://a.example' });
    registerConnectHost(b, { origin: 'https://b.example' });
    const reached: ConnectHost[] = [];

    forEachConnectHost((host) => {
      reached.push(host);
      unregisterConnectHost(host);   // e.g. a lock tearing a popup host down
    });

    expect(reached).toEqual([a, b]);
    expect(getConnectHosts()).toEqual([]);
  });
});
