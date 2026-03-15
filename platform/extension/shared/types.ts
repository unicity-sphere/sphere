/**
 * Shared types for the Sphere extension integration.
 */

export interface IdentityInfo {
  id: string;
  label: string;
  publicKey: string;
  createdAt: string;
}

export interface TokenBalance {
  coinId: string;
  symbol: string;
  amount: string;
  pendingAmount?: string;
}

export interface NametagResolution {
  nametag: string;
  pubkey: string;
  proxyAddress: string;
}

/** Message types from inject script to content script */
export type SphereRequestType =
  | 'SPHERE_CONNECT'
  | 'SPHERE_DISCONNECT'
  | 'SPHERE_GET_ACTIVE_IDENTITY'
  | 'SPHERE_GET_BALANCES'
  | 'SPHERE_SEND_TOKENS'
  | 'SPHERE_SIGN_MESSAGE'
  | 'SPHERE_GET_NOSTR_PUBLIC_KEY'
  | 'SPHERE_SIGN_NOSTR_EVENT'
  | 'SPHERE_RESOLVE_NAMETAG'
  | 'SPHERE_MINT_NAMETAG'
  | 'SPHERE_GET_MY_NAMETAGS'
  | 'SPHERE_GET_MY_NAMETAG'
  | 'SPHERE_CHECK_NAMETAG_AVAILABLE';

/** Message types from background to content/inject */
export type SphereResponseType =
  | 'SPHERE_CONNECT_RESPONSE'
  | 'SPHERE_DISCONNECT_RESPONSE'
  | 'SPHERE_GET_ACTIVE_IDENTITY_RESPONSE'
  | 'SPHERE_GET_BALANCES_RESPONSE'
  | 'SPHERE_SEND_TOKENS_RESPONSE'
  | 'SPHERE_SIGN_MESSAGE_RESPONSE'
  | 'SPHERE_GET_NOSTR_PUBLIC_KEY_RESPONSE'
  | 'SPHERE_SIGN_NOSTR_EVENT_RESPONSE'
  | 'SPHERE_TRANSACTION_RESULT'
  | 'SPHERE_RESOLVE_NAMETAG_RESPONSE'
  | 'SPHERE_MINT_NAMETAG_RESPONSE'
  | 'SPHERE_GET_MY_NAMETAGS_RESPONSE'
  | 'SPHERE_GET_MY_NAMETAG_RESPONSE'
  | 'SPHERE_CHECK_NAMETAG_AVAILABLE_RESPONSE';

/** Generic Sphere response shape */
export interface SphereResponse {
  type: string;
  requestId: string;
  success?: boolean;
  error?: string;
  [key: string]: unknown;
}
