import type { QualityConfig, QualityTier } from './types';

export const TELCO_PREFIX = '__telco:';

export const TELCO_VERSION = 1;

// ── STUN / TURN ─────────────────────────────────────────────────────────────

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// ── Timeouts (ms) ───────────────────────────────────────────────────────────

export const CALL_TIMEOUT = 30_000;
export const ICE_GATHER_TIMEOUT = 10_000;
export const RECONNECT_TIMEOUT = 15_000;
export const CALL_ENDED_DISMISS_DELAY = 3_000;
export const CALL_FAILED_DISMISS_DELAY = 5_000;
export const CAPABILITY_STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Quality monitoring ──────────────────────────────────────────────────────

export const QUALITY_POLL_INTERVAL = 2_000;
export const QUALITY_UPGRADE_DELAY = 10_000;
export const QUALITY_HISTORY_SIZE = 5;

// ── Adaptive bitrate tiers ──────────────────────────────────────────────────

export const QUALITY_TIERS: Record<QualityTier, QualityConfig> = {
  high: {
    tier: 'high',
    video: { width: 1280, height: 720, frameRate: 30, maxBitrate: 2_500_000 },
    audio: { maxBitrate: 64_000 },
  },
  medium: {
    tier: 'medium',
    video: { width: 640, height: 480, frameRate: 24, maxBitrate: 1_000_000 },
    audio: { maxBitrate: 64_000 },
  },
  low: {
    tier: 'low',
    video: { width: 320, height: 240, frameRate: 15, maxBitrate: 400_000 },
    audio: { maxBitrate: 32_000 },
  },
  'audio-only': {
    tier: 'audio-only',
    video: null,
    audio: { maxBitrate: 32_000 },
  },
};

// ── Ringtone ────────────────────────────────────────────────────────────────

export const RING_FREQUENCY_1 = 440;
export const RING_FREQUENCY_2 = 480;
export const RING_ON_MS = 2_000;
export const RING_OFF_MS = 4_000;
