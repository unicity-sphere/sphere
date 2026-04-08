import { TELCO_PREFIX, TELCO_VERSION } from './constants';
import type { TelcoSignalEnvelope, TelcoSignalType } from './types';

/**
 * Check if a DM content string is a telco signaling message.
 */
export function isTelcoMessage(content: string): boolean {
  return content.startsWith(TELCO_PREFIX);
}

/**
 * Encode a telco signal into a DM content string.
 */
export function encodeTelcoMessage(
  type: TelcoSignalType,
  payload: Record<string, unknown>,
  callId: string,
): string {
  const envelope: TelcoSignalEnvelope = {
    type,
    payload,
    v: TELCO_VERSION,
    ts: Date.now(),
    callId,
  };
  return TELCO_PREFIX + JSON.stringify(envelope);
}

/**
 * Decode a telco signal from a DM content string.
 * Returns null if the content is not a valid telco message.
 */
export function decodeTelcoMessage(content: string): TelcoSignalEnvelope | null {
  if (!isTelcoMessage(content)) return null;
  try {
    const json = content.slice(TELCO_PREFIX.length);
    const envelope = JSON.parse(json) as TelcoSignalEnvelope;
    if (!envelope.type || envelope.v !== TELCO_VERSION || typeof envelope.callId !== 'string') return null;
    return envelope;
  } catch {
    return null;
  }
}

/**
 * Get a human-readable description for a telco message (for conversation preview / system pills).
 */
export function getTelcoDisplayText(content: string): string | null {
  const signal = decodeTelcoMessage(content);
  if (!signal) return null;
  switch (signal.type) {
    case 'offer':
      return signal.payload.mediaType === 'video' ? 'Video call' : 'Voice call';
    case 'decline':
      return 'Call declined';
    case 'hangup':
      return 'Call ended';
    case 'busy':
      return 'Busy';
    case 'timeout':
      return 'Missed call';
    default:
      return null; // capability, answer, ice-restart — not user-visible
  }
}

/**
 * Check whether a telco message should be rendered as a visible system pill in the chat.
 */
export function isTelcoVisibleMessage(content: string): boolean {
  return getTelcoDisplayText(content) !== null;
}
