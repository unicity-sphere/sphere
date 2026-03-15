/**
 * Message helper functions and constants for the extension.
 */

import type { SphereRequestType, SphereResponseType } from './types';

/** Prefix for all Sphere messages to avoid collisions */
export const MESSAGE_PREFIX = 'SPHERE_';

/** Timeout for requests (30 seconds) */
export const REQUEST_TIMEOUT = 30000;

/** Generate a unique request ID. */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Check if a message type is a Sphere request. */
export function isSphereRequest(type: string): type is SphereRequestType {
  return type.startsWith(MESSAGE_PREFIX) && !type.endsWith('_RESPONSE') && !type.includes('_RESULT');
}

/** Check if a message type is a Sphere response. */
export function isSphereResponse(type: string): type is SphereResponseType {
  return type.startsWith(MESSAGE_PREFIX) && (type.endsWith('_RESPONSE') || type.includes('_RESULT'));
}
