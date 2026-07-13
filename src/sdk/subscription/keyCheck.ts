/**
 * Server-side sanity check for keys the user pastes by hand (Settings'
 * "Use a different key", the upgrade claim step). Only a DEFINITIVE
 * unknown/revoked verdict rejects; a failed lookup (pre-key-info gateway,
 * network hiccup) fails open — the gateway still gates actual usage, so a
 * transient error must not lock the user out of adopting a valid key.
 */
import { getKeyInfo } from '../../services/subscriptionApi';

export interface PastedKeyVerdict {
  valid: boolean;
  message?: string;
}

export async function validatePastedKey(apiKey: string): Promise<PastedKeyVerdict> {
  try {
    const info = await getKeyInfo(apiKey);
    if (info === null) {
      return { valid: false, message: "This key wasn't found or has been revoked — check it for typos." };
    }
    return { valid: true };
  } catch {
    return { valid: true };
  }
}
