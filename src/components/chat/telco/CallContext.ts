import { createContext } from 'react';
import type { MediaType } from './types';

export interface CallContextValue {
  startCall: (peerPubkey: string, peerNametag: string | undefined, mediaType: MediaType) => void;
  acceptCall: () => void;
  declineCall: () => void;
  hangUp: () => void;
  toggleMuteAudio: () => void;
  toggleMuteVideo: () => void;
}

export const CallContext = createContext<CallContextValue | null>(null);
