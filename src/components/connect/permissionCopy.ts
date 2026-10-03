import { METHOD_PERMISSIONS } from '@unicitylabs/sphere-sdk/connect';
import type { PermissionScope } from '@unicitylabs/sphere-sdk/connect';

interface AccessCopy {
  /** The row's value line. Near-black, first. */
  title: string;
  /**
   * Second line, ONLY for a scope that moves value, signs as the user, or reads their messages.
   * Its ABSENCE is the signal: the rows that matter are physically taller than the rest without
   * needing a colour, a badge or an icon to shout.
   *
   * It says the ONE thing the group heading does not — what the site gets to choose. "You approve
   * every transfer" belongs to the heading above it, and repeating it on each row is how a screen
   * grows into a wall of text that gets skipped whole.
   */
  consequence?: string;
}

/**
 * What each permission scope lets a site do, in the user's words.
 *
 * Exhaustive by type. A scope the SDK adds does not compile until it has copy here, the way
 * SWITCH_REFUSAL_CLAUSES already works in rejectionMessage.ts. There is deliberately NO
 * `?? scope` fallback: the one it replaced is why `dm:manage` — present in the SDK, absent from
 * the old label map — rendered on a consent screen as the raw string `dm:manage`. A silent
 * degradation into developer vocabulary is the worst failure mode a permission list has.
 */
export const ACCESS_COPY: Record<PermissionScope, AccessCopy> = {
  'identity:read': { title: 'Your wallet address and Unicity ID' },
  'balance:read': { title: 'Your balance' },
  'tokens:read': { title: 'Your tokens' },
  'history:read': { title: 'Your transaction history' },
  'events:subscribe': { title: 'Live updates while connected' },
  'resolve:peer': { title: 'Look up Unicity IDs' },
  'dm:read': {
    title: 'Your direct messages',
    consequence: 'Every conversation in this wallet.',
  },
  'dm:manage': { title: 'Mark your messages as read' },
  'transfer:request': {
    title: 'Send tokens from your wallet',
    consequence: 'It picks the amount and the recipient.',
  },
  'nft:transfer': {
    title: 'Send an NFT from your wallet',
    consequence: 'It picks which NFT and where it goes.',
  },
  'mint:request': { title: 'Mint tokens into your wallet' },
  'nft:mint': {
    title: 'Mint an NFT, signed as you',
    consequence: 'You sign content the site chose.',
  },
  'payment:request': {
    title: 'Send you a payment request',
    consequence: 'It picks the amount.',
  },
  'dm:request': {
    title: 'Send a direct message as you',
    consequence: 'It writes the message.',
  },
  'sign:request': {
    title: 'Sign a message as you',
    consequence: 'Proves you control this wallet.',
  },
};

/**
 * Scopes reachable by an RPC METHOD are answered with no UI at all, for as long as the session
 * lives. Everything else can only arrive as an INTENT, and every intent raises its own modal.
 *
 * DERIVED from the SDK's own table rather than listed here, so a scope the SDK adds lands in the
 * right group with no edit — and anything in neither map falls into the stronger group. That is
 * what makes the group heading a true statement about what the wallet will do instead of
 * reassuring copy somebody wrote once.
 *
 * `identity:read` is in BOTH SDK maps (a query and the `receive` intent). The rule is therefore
 * "silent iff it is a value of METHOD_PERMISSIONS", which puts it in the silent group — correct,
 * because it is readable with no prompt.
 */
const SILENT_SCOPES: ReadonlySet<string> = new Set(Object.values(METHOD_PERMISSIONS));

/**
 * Deduplicated — a peer may repeat a scope — and filtered to the ones we can describe.
 *
 * A scope with no copy is not rendered, and the approval modal must not grant it either: showing
 * a shorter list than what is granted is how a consent screen lies.
 */
export function describableScopes(perms: PermissionScope[]): PermissionScope[] {
  return [...new Set(perms)].filter((scope) => scope in ACCESS_COPY);
}

export function splitScopes(perms: PermissionScope[]): {
  silent: PermissionScope[];
  prompted: PermissionScope[];
} {
  const unique = describableScopes(perms);
  return {
    silent: unique.filter((scope) => SILENT_SCOPES.has(scope)),
    prompted: unique.filter((scope) => !SILENT_SCOPES.has(scope)),
  };
}
