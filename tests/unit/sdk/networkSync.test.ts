import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * The storage-event fallback, used when BroadcastChannel is missing or its
 * constructor throws.
 *
 * resetActiveNetwork() REMOVES the key, which fires a StorageEvent whose
 * newValue is null. Treating null as "nothing happened" left every other tab on
 * the previous network while the resetting tab reloaded onto the default — the
 * wallet split across networks until each tab was refreshed by hand.
 */
describe('installNetworkSync — storage fallback', () => {
  beforeEach(() => {
    vi.stubGlobal('BroadcastChannel', undefined);
    (window as unknown as { __SPHERE_RUNTIME_CONFIG__?: unknown }).__SPHERE_RUNTIME_CONFIG__ = {};
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as unknown as { __SPHERE_RUNTIME_CONFIG__?: unknown }).__SPHERE_RUNTIME_CONFIG__;
  });

  const fire = (newValue: string | null): void => {
    window.dispatchEvent(
      Object.assign(new Event('storage'), { key: 'sphere_active_network', newValue }),
    );
  };

  it('reloads when the active network is REMOVED (reset to default)', async () => {
    const { installNetworkSync } = await import('../../../src/sdk/networkSync');
    const { DEFAULT_NETWORK } = await import('../../../src/config/network');
    const reload = vi.fn();
    // Boot on something other than the default, so the reset is a real change.
    const stop = installNetworkSync('mainnet' as never, { reload });

    fire(null);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(DEFAULT_NETWORK).not.toBe('mainnet');
    stop();
  });

  it('does NOT reload when the removal resolves back to the booted network', async () => {
    const { installNetworkSync } = await import('../../../src/sdk/networkSync');
    const { DEFAULT_NETWORK } = await import('../../../src/config/network');
    const reload = vi.fn();
    const stop = installNetworkSync(DEFAULT_NETWORK, { reload });

    fire(null);

    expect(reload).not.toHaveBeenCalled();
    stop();
  });
});
