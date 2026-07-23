/**
 * Sphere Connect wallet-side (host) policy.
 */

/**
 * Minimum `@unicitylabs/sphere-sdk` version a connecting dApp must be built
 * against for this wallet to accept its Sphere Connect handshake.
 *
 * The wallet is on the 0.12.x line; apps built against < 0.12 speak an
 * incompatible Connect / token contract, so their handshake is refused by the
 * SDK's compatibility gate (`checkCompatibility` → `protocol_incompatible`),
 * surfaced to the user via `onConnectionRejected` (and silently dropped for
 * background auto-connect attempts).
 *
 * The floor is the earliest 0.12.0 PRE-RELEASE (`-0`), not `0.12.0`, because
 * semver orders prereleases below the release. The wallet ships stable
 * `0.12.0`, but dApps mid-migration (and dev builds) may still be on a
 * `0.12.0-dev.x` prerelease; a plain `0.12.0` floor would reject those
 * (`compareSemver('0.12.0-dev.1', '0.12.0') === -1`). `0.12.0-0` admits any
 * 0.12.0 prerelease and up while still rejecting every 0.11.x and below.
 *
 * Bump this in lockstep with the wallet's major.minor line.
 */
export const CONNECT_MIN_SDK_VERSION = '0.12.0-0';
