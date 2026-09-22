/**
 * The `@unicitylabs/sphere-sdk` version this app is pinned to.
 *
 * `/developers/docs` documents the SDK this app runs against, so the version it
 * advertises must be that pin and nothing else. There is no runtime source for
 * it: the SDK exports no version constant, its `exports` map has no
 * `./package.json` entry, and this app's tsconfig has no `resolveJsonModule`,
 * so `package.json` cannot be imported into the client bundle either.
 *
 * Hence a literal — but a guarded one. `tests/unit/config/sdkVersion.test.ts`
 * asserts it equals the `dependencies` pin in package.json, so a bump that
 * forgets this file fails the suite. An unguarded literal is exactly how the
 * page came to advertise `v0.4.7` for many releases.
 */
export const SDK_VERSION = '0.17.6';
