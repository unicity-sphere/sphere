# Mainnet deployment — DevOps handoff

Exactly which variables to set, where, and what each one does. Written against
`main` + `feat/network-switcher` as of 2026-07-15.

---

## TL;DR — what you actually add

Three new container env vars. **Nothing else changes**, and no image rebuild is
needed for them (they are read at container start, not baked at build):

| Variable | Set it to | Effect |
|---|---|---|
| `WALLET_API_URL_TESTNET2` | your testnet2 wallet-api base | Serves testnet2. **Optional today** — if unset it is seeded from the legacy `WALLET_API_URL`, so existing task definitions keep working untouched. |
| `WALLET_API_URL_MAINNET` | your mainnet wallet-api base | Serves mainnet. **Empty/unset ⇒ this deployment does not offer mainnet at all** and the Settings → Network row stays greyed out. |
| `MAINNET_ROLLOUT_ENABLED` | `true` | The deliberate go-live switch. Anything but exactly `true` keeps mainnet unselectable even when everything else is configured. |

A wallet only offers a network when **all three** are true:

```
the SDK knows the network   AND   this deployment has its wallet-api URL   AND   (mainnet only) the rollout switch is on
```

Today the first condition is still false — SDK 0.11.14 has no mainnet
`networkId` — so mainnet stays greyed out no matter what you set. Setting the
vars early is safe and does nothing.

## Why per-network URLs at all

The wallet now lets a user switch networks at runtime, and the SDK's wallet-api
client is **bound to the active network**: it refuses a challenge naming a
different one. So a mainnet session pointed at a testnet2 backend does not
degrade — it dies at sign-in and takes the whole asset/custody path with it.
One URL per deployment cannot serve two networks.

## Where each value goes

| Variable | Where | Notes |
|---|---|---|
| `WALLET_API_URL_TESTNET2` · `WALLET_API_URL_MAINNET` · `MAINNET_ROLLOUT_ENABLED` | **ECS task definition / `docker -e`** | Read at container start into `window.__SPHERE_RUNTIME_CONFIG__`. No Dockerfile ARG, no rebuild. |
| `SPHERE_API_URL` · `WALLET_API_URL` · `REQUIRE_WALLET_API` · `DEV_PORTAL_URL` · `AGGREGATOR_API_KEY` | ECS task definition / `docker -e` | Existing contract, unchanged (sed-substituted into the built JS). |
| `SUBSCRIPTION_ENABLED` · `PAID_PLANS_ENABLED` | ECS task definition / `docker -e` | Existing runtime flags. |

**Why the new ones do not use the `__RUNTIME_*__` placeholder mechanism:** they
decide whether a network is *offered*, and an availability decision is a branch.
Rollup evaluates branch conditions against the baked placeholder at build time
and prunes the dead side — and this fold goes the **dangerous** way:
`Boolean('__RUNTIME_…__')` is `true`, so mainnet would look available in every
container regardless of your task definition. Worse, the fold *erases* the
placeholder, so the CI guard that greps for surviving `__RUNTIME_` strings
cannot see it. This was verified empirically against this repo's toolchain. A
`window` global read cannot be folded, so these values ride that instead — the
same mechanism the subscription flags already use.

## Full variable reference for a mainnet deployment

| Variable | testnet2 deployment | mainnet deployment |
|---|---|---|
| `SPHERE_API_URL` | quest-api URL | **same** — quests are network-blind (the identity address is identical on every network, so XP carries over) |
| `WALLET_API_URL_TESTNET2` | testnet2 wallet-api | set only if this deployment also offers testnet2 |
| `WALLET_API_URL_MAINNET` | *unset* (hides mainnet) | **mainnet wallet-api** |
| `MAINNET_ROLLOUT_ENABLED` | *unset* | **`true`** |
| `REQUIRE_WALLET_API` | as today | as today |
| `SUBSCRIPTION_ENABLED` | `true` | **`true` — required, see below** |
| `AGGREGATOR_API_KEY` | non-secret testnet2 key | **leave UNSET** — see below |
| `PAID_PLANS_ENABLED` | not `true` | **`true`** |
| `DEV_PORTAL_URL` | unchanged | unchanged |

### `SUBSCRIPTION_ENABLED=true` is mandatory on mainnet
Not for convenience. `AGGREGATOR_API_KEY` is substituted **into the JS the
browser downloads**, so a static aggregator key is **not a secret on any
client** — every visitor can read it from devtools and spend the operator's
quota. With subscriptions on there is no shared key in the bundle at all: each
wallet signs a challenge for its own SGW key, metered and revocable per key.
The app now **refuses to start** on a real-value network with subscriptions off,
rather than leak the key.

### What you must NOT configure — it follows the network by itself
The aggregator gateway URL **and the SGW base URL**, Nostr relays, IPFS
gateways, token registry, trust base, `networkId`. These come from the SDK's
per-network table. Adding env vars for them re-breaks the switcher.

## Mainnet SGW (subscription gateway)

Mainnet needs its **own SGW instance with its own Postgres**. Keys are bearer
tokens scoped to one instance — a testnet2 key is unknown to a mainnet SGW
(401/404), and free keys re-provision per network automatically.

**Critical setting:** `GATEWAY_AUTH_NETWORK=mainnet`.

The gateway embeds this string in every auth challenge, and the wallet **refuses
to sign a challenge whose network differs from its active one** (anti
cross-network key harvesting). A mainnet SGW left at the default `testnet2`
means **no wallet can provision a key** — it fails client-side with "network
mismatch", which looks like a wallet bug, not a config one.

## Fail-closed behaviour — the container refuses to start if:
- `REQUIRE_WALLET_API` is truthy but neither `WALLET_API_URL_TESTNET2` nor the
  legacy `WALLET_API_URL` is set (#351: a missing URL silently changes the
  custody model);
- `MAINNET_ROLLOUT_ENABLED=true` but `WALLET_API_URL_MAINNET` is empty on a
  wallet-api deployment (you would believe mainnet is live while the row stays
  greyed out);
- `AGGREGATOR_API_KEY` is empty while `SUBSCRIPTION_ENABLED` is not `true`;
- any of the runtime-config values contains a CR/LF (it would break the
  generated `runtime-config.js` and silently revert *every* flag — a trailing
  `\r` from a CRLF paste is exactly how that happens).

A **missing** `WALLET_API_URL_MAINNET` is deliberately **not** an error:
offering fewer networks is legitimate. The container logs which networks it
offers at start — grep for `wallet-api networks offered:` when a network is
unexpectedly greyed out. That log is the intended first stop for
"why can't I select mainnet".

Flags are compared against **exactly `true`**; `TRUE`, `1`, `yes` mean off (the
script warns).

### After changing any value
Filenames are content-hashed and these values are patched **inside** the hashed
JS, so filenames do not change: **invalidate the CDN/CloudFront** or clients
keep the old config.

## Traps

1. **Never pin `VITE_SUBSCRIPTION_API_URL`** in a deployed build. It is a
   local-dev override only. Pinned, it keeps calling the old network's SGW after
   a switch and key provisioning dies with "network mismatch". Unset, it follows
   the network.
2. **Never point `WALLET_API_URL_MAINNET` at a testnet backend** (or vice
   versa). It fails at sign-in, not at request time, so the whole asset path
   dies at once.
3. **Do not commit a mainnet `AGGREGATOR_API_KEY`** — and prefer not to set it
   at all on mainnet (see above).
4. **Do not add a `NETWORK` variable** to the sed contract expecting it to
   work — Vite const-folds branch conditions against baked literals. Values that
   gate a branch belong on `window.__SPHERE_RUNTIME_CONFIG__` (as the new
   per-network vars do). Network *selection* itself is a persisted user choice
   (`sphere_active_network` in localStorage) plus the build default.

## Blocking prerequisites (not DevOps, but gate the rollout)

Do not flip `MAINNET_ROLLOUT_ENABLED` before these land — both are money-safety:

- **Network-scoped relay cursors** (SDK) — without it, switching networks can
  permanently skip incoming token transfers.
- **Self-mint gating** (wallet) — done on `feat/network-switcher`: Top Up, Swap
  and the Connect `mint` intent are refused off test networks. Without it, the
  moment a mainnet trust base ships anyone could mint real coinIds for free.

Plus the SDK/protocol side: mainnet trust base + `networkId`, a v2 mainnet
gateway, and a mainnet token registry. See
`docs/superpowers/plans/2026-07-15-mainnet-readiness-roadmap.md`.

## Smoke checklist for a mainnet deployment

1. Container starts; logs show `wallet-api networks offered: mainnet`.
2. `GET /runtime-config.js` shows the per-network URLs and
   `MAINNET_ROLLOUT_ENABLED`.
3. Settings → Network shows **Mainnet — Current** (a greyed row reading
   "Not available here" means this deployment has no URL for it; "Coming soon"
   means the SDK or the rollout switch, not you).
4. Onboard a fresh wallet → a subscription key provisions (no "network
   mismatch") → Settings → Subscription shows a plan.
5. Wallet actions show **no Top Up button** and a **disabled Swap** — their
   presence on mainnet is a release blocker.
6. Send a small amount between two wallets; confirm receipt.

## Known gap (tracked, not shipped)

`VITE_AGGREGATOR_URL` / `VITE_TRUSTBASE_URL` (`getEngineOverride`) are still
one-per-deployment with no network dimension, and are applied to whatever
network is active. They are only set for local/e2e stacks today (never in the
deployed images), which bounds the risk — but a `dev`-hatch switch could mix one
network's gateway with another's trust base. Do not set them in a deployed
environment.
