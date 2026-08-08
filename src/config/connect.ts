/**
 * Sphere Connect wallet-side (host) policy.
 */

/**
 * Minimum `@unicitylabs/sphere-sdk` version a connecting dApp must be built
 * against for this wallet to accept its Sphere Connect handshake.
 *
 * The wallet is on the 0.14.x line (post-P11-flip: payments-v2 is the only
 * money path). Apps below 0.14.1 still CONNECT correctly — the host's
 * wire-compat adapter serves the old query and event names — but they read a
 * surface that has moved underneath them: `Asset.unconfirmed*` is pinned to
 * zero, `Token.status` lost values they filter on, `payment_request:settling`
 * and `:response` never fire, and history `tokenIds[].id` carries a coinId.
 * Those are silent wrong answers, which is worse than a refusal that names
 * the required version.
 *
 * `-0` admits any 0.14.1 PRERELEASE (semver orders prereleases below the
 * release), so dev builds mid-migration are not refused.
 *
 * Keep in lockstep with the SDK's own `DEFAULT_MIN_CLIENT_SDK_VERSION`
 * (sphere-sdk connect/protocol.ts) — this constant OVERRIDES that default,
 * so a stale value here silently disables the SDK floor entirely (it did:
 * this sat at 0.12.0-0 through the 0.13 and 0.14 lines).
 *
 * NOT a double-pay control: re-issuing a `send` intent after a keep-open
 * outcome is version-independent. That is guarded in ConnectIntentHandler
 * against `payments.pendingTransfers()`.
 */
export const CONNECT_MIN_SDK_VERSION = '0.14.1-0';
