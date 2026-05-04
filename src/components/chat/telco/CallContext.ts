import { createContext } from 'react';
import type { MediaType } from './types';

export interface CallContextValue {
  startCall: (peerPubkey: string, peerNametag: string | undefined, mediaType: MediaType) => void;
  acceptCall: () => void;
  declineCall: () => void;
  hangUp: () => void;
  toggleMuteAudio: () => void;
  toggleMuteVideo: () => void;
  retryRemoteAudioPlay: () => void;
  playTestTone: () => void;
  switchAudioInput: (deviceId: string) => Promise<void>;
  switchVideoInput: (deviceId: string) => Promise<void>;
  switchAudioOutput: (deviceId: string) => Promise<void>;
  /** Toggle fullscreen on the call overlay. */
  toggleFullscreen: () => Promise<void>;
  /** Open the call in a separate Document Picture-in-Picture window
   *  (Chrome 116+). Returns false if not supported. */
  toggleSeparateWindow: () => Promise<boolean>;
}

export const CallContext = createContext<CallContextValue | null>(null);
