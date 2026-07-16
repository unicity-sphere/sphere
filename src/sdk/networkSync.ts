/**
 * Cross-tab network sync. Installed ONCE in main.tsx: when another tab
 * switches the active network (setActiveNetwork in src/config/network.ts),
 * this tab reloads so it re-resolves SPHERE_NETWORK and boots on the same
 * network. Primary signal is BroadcastChannel('sphere-network'); the window
 * 'storage' event is the fallback for browsers without BroadcastChannel
 * (it never fires in the tab that made the change — that tab reloads itself).
 */
import type { NetworkType } from '@unicitylabs/sphere-sdk';
import { STORAGE_KEYS } from '../config/storageKeys';
import {
  NETWORK_BROADCAST_CHANNEL,
  isSwitchableNetwork,
  type NetworkChangedMessage,
} from '../config/network';

export function installNetworkSync(
  bootNetwork: NetworkType,
  opts: { reload?: () => void } = {},
): () => void {
  const reload = opts.reload ?? (() => window.location.reload());
  let reloaded = false;
  const reloadOnce = () => {
    if (reloaded) return;
    reloaded = true;
    reload();
  };

  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(NETWORK_BROADCAST_CHANNEL);
      channel.onmessage = (event: MessageEvent) => {
        const msg = event.data as Partial<NetworkChangedMessage> | null;
        if (
          msg?.type === 'network-changed' &&
          typeof msg.network === 'string' &&
          isSwitchableNetwork(msg.network) &&
          msg.network !== bootNetwork
        ) {
          reloadOnce();
        }
      };
    } catch {
      channel = null;
    }
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEYS.ACTIVE_NETWORK) return;
    if (event.newValue && isSwitchableNetwork(event.newValue) && event.newValue !== bootNetwork) {
      reloadOnce();
    }
  };
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener('storage', onStorage);
    channel?.close();
  };
}
