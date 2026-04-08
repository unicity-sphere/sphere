import { useEffect } from 'react';
import { useSphereContext } from '../../../sdk/hooks/core/useSphere';
import { encodeTelcoMessage, decodeTelcoMessage, isTelcoMessage } from './signaling';
import { useCallStore, setPeerCapability } from './callStore';
import type { CapabilityPayload, PeerCapability, TelcoSignalDetail } from './types';
import { TELCO_VERSION } from './constants';

// SDK DM shape (local mirror)
interface SDKDirectMessage {
  id: string;
  senderPubkey: string;
  content: string;
}

/**
 * Sends a capability announcement when a conversation opens,
 * scans existing messages for peer capabilities (survives remount),
 * and listens for real-time capability responses.
 */
export function usePeerCapability(peerPubkey: string | undefined): PeerCapability | undefined {
  const { sphere } = useSphereContext();
  const capability = useCallStore(s =>
    peerPubkey ? s.peerCapabilities.get(peerPubkey) : undefined,
  );

  // Scan existing conversation messages for peer capability (survives app remount)
  useEffect(() => {
    if (!sphere || !peerPubkey) return;

    try {
      const msgs: SDKDirectMessage[] = sphere.communications.getConversation(peerPubkey);
      if (!msgs) return;

      // Scan from newest to oldest — find the most recent capability message from the peer
      for (let i = msgs.length - 1; i >= 0; i--) {
        const msg = msgs[i];
        if (msg.senderPubkey !== peerPubkey) continue;
        if (!isTelcoMessage(msg.content)) continue;

        const signal = decodeTelcoMessage(msg.content);
        if (!signal || signal.type !== 'capability') continue;

        const payload = signal.payload as unknown as CapabilityPayload;
        // Capability found in message history
        setPeerCapability(peerPubkey, {
          audio: payload.audio ?? false,
          video: payload.video ?? false,
          version: payload.version ?? 1,
          discoveredAt: Date.now(),
        });
        break;
      }
    } catch {
      // SDK may not be ready yet
    }
  }, [sphere, peerPubkey]);

  // Send capability announcement on conversation open (always, so peer discovers us)
  useEffect(() => {
    if (!sphere || !peerPubkey) return;

    const msg = encodeTelcoMessage(
      'capability',
      { audio: true, video: true, version: TELCO_VERSION } satisfies CapabilityPayload,
      '',
    );
    sphere.communications.sendDM(peerPubkey, msg).catch(() => {});
  }, [sphere, peerPubkey]);

  // Listen for real-time incoming capability messages
  useEffect(() => {
    if (!peerPubkey) return;

    const handler = (e: Event) => {
      const { peerPubkey: senderPubkey, content, isFromMe } = (e as CustomEvent<TelcoSignalDetail>).detail;
      if (isFromMe || senderPubkey !== peerPubkey) return;

      const signal = decodeTelcoMessage(content);
      if (!signal || signal.type !== 'capability') return;

      const payload = signal.payload as unknown as CapabilityPayload;
      setPeerCapability(peerPubkey, {
        audio: payload.audio ?? false,
        video: payload.video ?? false,
        version: payload.version ?? 1,
        discoveredAt: Date.now(),
      });
    };

    window.addEventListener('dm-telco-signal', handler);
    return () => window.removeEventListener('dm-telco-signal', handler);
  }, [peerPubkey]);

  return capability;
}
