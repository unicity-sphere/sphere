// ── Signaling protocol ──────────────────────────────────────────────────────

export type TelcoSignalType =
  | 'capability'
  | 'offer'
  | 'answer'
  | 'decline'
  | 'hangup'
  | 'busy'
  | 'timeout'
  | 'ice-restart';

export interface TelcoSignalEnvelope {
  type: TelcoSignalType;
  payload: Record<string, unknown>;
  v: 1;
  ts: number;
  callId: string;
}

export interface CapabilityPayload {
  audio: boolean;
  video: boolean;
  version: number;
}

export interface OfferPayload {
  sdp: string;
  mediaType: MediaType;
}

export interface AnswerPayload {
  sdp: string;
}

export interface DeclinePayload {
  reason?: string;
}

export interface HangupPayload {
  reason?: 'user' | 'error' | 'timeout';
}

// ── Call state machine ──────────────────────────────────────────────────────

export type CallDirection = 'outgoing' | 'incoming';

export type CallState =
  | 'idle'
  | 'requesting-media'
  | 'gathering-ice'
  | 'calling'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'ended'
  | 'failed';

export type MediaType = 'audio' | 'video';

export interface CallInfo {
  callId: string;
  peerPubkey: string;
  peerNametag?: string;
  direction: CallDirection;
  mediaType: MediaType;
  state: CallState;
  startedAt: number;
  connectedAt?: number;
  endedAt?: number;
  endReason?: string;
  remoteSdp?: string; // Stored when receiving an offer, consumed on accept
}

// ── Quality / adaptive bitrate ──────────────────────────────────────────────

export type QualityTier = 'high' | 'medium' | 'low' | 'audio-only';

export interface QualityConfig {
  tier: QualityTier;
  video: { width: number; height: number; frameRate: number; maxBitrate: number } | null;
  audio: { maxBitrate: number };
}

export interface ConnectionQuality {
  tier: QualityTier;
  score: number;
  rtt: number;
  packetLoss: number;
  jitter: number;
  availableBandwidth: number;
}

// ── Peer capabilities ───────────────────────────────────────────────────────

export interface PeerCapability {
  audio: boolean;
  video: boolean;
  version: number;
  discoveredAt: number;
}

// ── Call store state ────────────────────────────────────────────────────────

export interface CallStoreState {
  currentCall: CallInfo | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  audioMuted: boolean;
  videoMuted: boolean;
  connectionQuality: ConnectionQuality | null;
  peerCapabilities: Map<string, PeerCapability>;
  // Real-time audio level meters (0.0 - 1.0)
  localAudioLevel: number;
  remoteAudioLevel: number;
}

// ── Event detail types ──────────────────────────────────────────────────────

export interface TelcoSignalDetail {
  peerPubkey: string;
  content: string;
  messageId: string;
  isFromMe: boolean;
}
