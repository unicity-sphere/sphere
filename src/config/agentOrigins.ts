/**
 * Trust boundary for third-party "agent" iframes.
 *
 * A custom agent can frame an arbitrary URL (the feature explicitly allows
 * loading any dev/dApp URL), and Sphere attaches a live Connect bridge to it.
 * That makes the framed origin a trust boundary: we must never bridge the
 * wallet to its OWN origin, and the UI must be able to tell a curated
 * first-party origin apart from an arbitrary third party.
 *
 * This module is the single source of truth for that classification and for
 * the hardened iframe sandbox. It is pure (origins passed in) so it is fully
 * unit-testable.
 */

export type AgentOriginTrust = 'self' | 'trusted' | 'untrusted';

/**
 * Curated first-party agent origins. Anything not listed here is treated as an
 * untrusted third party (still framable, but shown as such — never as a
 * first-party feature). Kept intentionally small; grow it as a real registry
 * ships. `window.location.origin` is deliberately NOT in this list — the wallet
 * must never bridge to itself (see {@link isWalletOwnOrigin}).
 */
export const TRUSTED_AGENT_ORIGINS: readonly string[] = [];

/**
 * Hardened sandbox for agent iframes. Deliberately WITHOUT
 * `allow-popups-to-escape-sandbox`: an escaped popup runs unsandboxed with full
 * privileges, a convincing phishing surface launched from inside trusted wallet
 * chrome. `allow-same-origin` stays so normal dApps keep storage/cookies —
 * framing the wallet's own origin is refused separately (see
 * {@link isWalletOwnOrigin}) so a frame can never execute as the wallet origin.
 */
export const AGENT_IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups';

/**
 * `allow` attribute for agent iframes. Empty on purpose: `clipboard-write` is
 * dropped because programmatic clipboard access on an attacker-chosen origin is
 * the classic crypto address-swap vector.
 */
export const AGENT_IFRAME_ALLOW = '';

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * True when `origin` resolves to the same origin the wallet itself runs on.
 * Such a frame, combined with `allow-same-origin`, would execute as the wallet
 * origin and could reach the parent DOM — so it must never get a Connect bridge.
 */
export function isWalletOwnOrigin(
  origin: string,
  selfOrigin: string = window.location.origin,
): boolean {
  const a = normalizeOrigin(origin);
  const b = normalizeOrigin(selfOrigin);
  return a !== null && b !== null && a === b;
}

export interface ClassifyAgentOriginOptions {
  selfOrigin?: string;
  trustedOrigins?: readonly string[];
}

/**
 * Classify a framed agent origin. `self` (the wallet's own origin) takes
 * precedence over everything and must be refused; `trusted` is a curated
 * first-party origin; everything else is `untrusted`.
 */
export function classifyAgentOrigin(
  origin: string,
  options: ClassifyAgentOriginOptions = {},
): AgentOriginTrust {
  const selfOrigin = options.selfOrigin ?? window.location.origin;
  const trusted = options.trustedOrigins ?? TRUSTED_AGENT_ORIGINS;

  if (isWalletOwnOrigin(origin, selfOrigin)) return 'self';

  const normalized = normalizeOrigin(origin);
  if (normalized !== null && trusted.some((t) => normalizeOrigin(t) === normalized)) {
    return 'trusted';
  }
  return 'untrusted';
}
