# Mainnet deployment — DevOps handoff

What operations has to prepare for the Sphere wallet on mainnet, what belongs to
other teams, and the exact variables to set. Written against `main` as of
2026-07-15.

---

## 1. Status: mainnet is not deployable yet, and that is deliberate

The wallet already ships the Settings → Network screen, where **Mainnet is
listed as "Coming soon" and cannot be selected**. That is not a UI placeholder —
the SDK has no mainnet trust base, so provider construction throws
`INVALID_CONFIG` for `mainnet` and the wallet could not boot on it anyway.

**Nothing DevOps sets can turn mainnet on.** The row enables *itself* once the
SDK's `NETWORKS.mainnet` entry carries a `networkId`. Ship order is therefore:

```
SDK onboards mainnet  →  wallet picks it up automatically  →  DevOps supplies the backends
```

## 2. Ownership

| Item | Owner | Status |
|---|---|---|
| Mainnet trust base JSON + `networkId` | Protocol / SDK | ❌ missing (`TRUSTBASE_MAINNET = null`) |
| Mainnet v2 aggregator gateway URL | Protocol / infra | ❌ current entry is a v1-era URL |
| `unicity-ids.mainnet.json` token registry | Protocol | ❌ mainnet currently points at the **testnet** registry |
| SDK `NETWORKS.mainnet` + `SPHERE_NETWORKS.mainnet` | SDK | ❌ blocked on the three above |
| **Mainnet SGW deployment** (subscription gateway) | **DevOps** | ⬜ to do |
| **Mainnet wallet-api deployment** | **DevOps** | ⬜ to do |
| **Wallet env per environment** | **DevOps** | ⬜ to do (§4) |

## 3. What follows the network on its own — do NOT configure these

These are derived from the SDK's per-network table. There is no env var for them
and adding one would break the switcher:

- Aggregator gateway URL **and the SGW base URL** (the SGW *is* the aggregator
  gateway — see `src/config/subscription.ts`)
- Nostr relays, group relays, IPFS gateways
- Token registry URL, trust base, `networkId`

## 4. Runtime contract (ECS task definition / `docker -e`)

One image is built once and promoted across environments;
`deploy/runtime-config.sh` rewrites these at container start.

| Variable | Purpose | testnet2 | mainnet |
|---|---|---|---|
| `SPHERE_API_URL` | Quest API base | quest-api URL | **same** — quests are network-blind (the DIRECT:// identity is identical on every network, so XP carries over) |
| `WALLET_API_URL` | wallet-api backend (asset custody) | testnet2 wallet-api | **must be a MAINNET wallet-api** |
| `REQUIRE_WALLET_API` | Fail-closed custody flag | as today | as today |
| `DEV_PORTAL_URL` | Developer-portal link | unchanged | unchanged |
| `AGGREGATOR_API_KEY` | Static aggregator key | non-secret testnet2 key | **REAL SECRET** — deploy env only, never in git. *Ignored when `SUBSCRIPTION_ENABLED=true`* |
| `SUBSCRIPTION_ENABLED` | Per-wallet SGW keys | `true` | `true` |
| `PAID_PLANS_ENABLED` | Sell paid plans | not `true` | **`true`** — the one-shot mainnet switch |

Flags are compared against **exactly `true`**; `TRUE`, `1`, `yes` silently mean
off (the script warns).

### Fail-closed behaviour already built in — the container refuses to start if:
- `REQUIRE_WALLET_API` is truthy but `WALLET_API_URL` is empty (#351: a missing
  URL would silently change the custody model);
- `AGGREGATOR_API_KEY` is empty while `SUBSCRIPTION_ENABLED` is not `true` (the
  wallet would have no key to send with).

### After changing any value
Vite content-hashes filenames, and these values are patched **inside** the
already-hashed JS. Filenames do not change, so **any CDN/CloudFront in front of
the app must be invalidated** or clients keep the old config.

## 5. Mainnet SGW (subscription gateway)

Mainnet needs its **own SGW instance with its own Postgres**. Keys are bearer
tokens scoped to one instance — a testnet2 key is simply unknown to a mainnet
SGW (401/404), and free keys are re-provisioned per network automatically.

**Critical setting:** `GATEWAY_AUTH_NETWORK=mainnet`.

The gateway embeds this string in every auth challenge, and the wallet **refuses
to sign a challenge whose network differs from its active one** (anti
cross-network key harvesting). A mainnet SGW left at the default `testnet2`
means **no wallet can provision a key** — it fails client-side with "network
mismatch", which looks like a wallet bug, not a config one.

## 6. Traps

1. **Never pin `VITE_SUBSCRIPTION_API_URL`** in a deployed build. It is a
   local-dev override only. Pinned, it keeps calling the old network's SGW after
   a switch and key provisioning dies with "network mismatch". Unset, it follows
   the network. (This trap was live in a local `.env`; `.env.example` now
   documents it.)
2. **Never ship a testnet `WALLET_API_URL` in a mainnet build.** The client is
   configured with the active network and rejects a challenge naming a different
   one — the asset path breaks with an auth error.
3. **Do not commit a mainnet `AGGREGATOR_API_KEY`.** The testnet2 key in
   `.env.example` is intentionally non-secret; the mainnet one is not.
4. **Do not add a `NETWORK` variable** to the runtime contract expecting it to
   work. Vite const-folds branch conditions against baked literals — this is why
   the subscription flags use `window.__SPHERE_RUNTIME_CONFIG__` instead of the
   sed placeholders. Network selection is a persisted user choice
   (`sphere_active_network` in localStorage) plus the build default.

## 7. Open decision before mainnet ships (needs product + infra)

`WALLET_API_URL` is **one value per deployment with no per-network dimension**,
but the network is now a runtime user choice. A user switching to mainnet inside
a testnet deployment would keep the testnet wallet-api URL and break custody
auth. Pick one:

- **(a) Mainnet is a separate deployment** — simplest; the network switcher then
  only makes sense between networks sharing a deployment's backends.
- **(b) Per-network env vars** — `WALLET_API_URL_TESTNET2` / `WALLET_API_URL_MAINNET`.
- **(c) Put `walletApiUrl` in the SDK `NETWORKS` table** — cleanest conceptually,
  but wrong if wallet-api URLs differ per *environment* (staging vs prod) as well
  as per network, which they do today.

Until this is decided, treat mainnet as **(a)**: a separate deployment.

## 8. Blocking prerequisites in the app (not DevOps, but gate the rollout)

Do not expose mainnet to users before these land — both are money-safety:

- **Network-scoped relay cursors** (SDK) — without it, switching networks can
  permanently skip incoming token transfers.
- **Self-mint gating** (wallet) — done on `feat/network-switcher`: Top Up, Swap
  and the Connect `mint` intent are refused on any network that is not an
  explicit test network. Without it, the moment a mainnet trust base ships,
  anyone could mint real coinIds for free.

See `docs/superpowers/plans/2026-07-15-mainnet-readiness-roadmap.md` for the full
programme.

## 9. Smoke checklist for a mainnet deployment

1. Container starts (no fail-closed error in logs).
2. `GET /runtime-config.js` shows `SUBSCRIPTION_ENABLED` / `PAID_PLANS_ENABLED`.
3. Settings → Network shows **Mainnet — Current**.
4. Onboard a fresh wallet → a subscription key provisions (no "network
   mismatch") → Settings → Subscription shows a plan.
5. Wallet actions show **no Top Up button** and a **disabled Swap** (self-mint
   gating active). Their presence on mainnet is a release blocker.
6. Send a small amount between two wallets; confirm receipt.
