# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Unicity AgentSphere is a React-based cryptocurrency wallet application for the Unicity network. It provides Unicity state transition network operations, along with DMs, group chat, and an iframe-based agent system. All wallet operations are handled through `@unicitylabs/sphere-sdk`, with a thin React adapter layer in `src/sdk/`.

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # TypeScript compile + Vite build
npm run lint         # ESLint
npm run test         # Vitest watch mode
npm run test:run     # Vitest single run
npm run preview      # Preview production build
npx tsc --noEmit     # Type check only
```

## Architecture

### Tech Stack
- React 19 + TypeScript ~5.9 with Vite 7
- TanStack Query v5 for server state management
- Tailwind CSS 4 (via `@tailwindcss/vite` plugin)
- Framer Motion for animations
- React Router DOM v7 for routing
- Vitest 4 + jsdom for testing
- `@unicitylabs/sphere-sdk` ^0.5 for all wallet operations (L1, L3, Nostr, IPFS)
- Lucide React for icons
- KaTeX for math rendering

### Routes (App.tsx)

```
/                    — IntroPage (splash screen)
/connect             — ConnectPage (wallet connection)
/home                — HomePage
/agents/:agentId     — AgentPage (dm, group-chat, custom)
/developers          — DevelopersPage (lazy)
/developers/docs     — DocsPage (lazy)
/mine                — MineAlphaPage (lazy)
/markets             — MarketsPage (lazy)
/explore-agents      — AgentsPage (lazy)
/about               — AboutPage (lazy)
```

All routes except `/` and `/connect` are wrapped in `DashboardLayout`.

### Active Agents (src/config/activities.ts)

Only 3 agents are currently enabled:
- `dm` — Messages (private DM via Nostr), requires wallet
- `group-chat` — Group Chat (NIP-29 relay channels), requires wallet
- `custom` — Sphere Agents (load any URL as iframe)

### Provider Tree (main.tsx)

```
StrictMode
  → QueryClientProvider
    → SphereProvider (network="testnet")
      → ServicesProvider (GroupChat)
        → ConnectProvider (wallet connection intents)
          → ThemeInitializer
            → BrowserRouter
              → App
            → ToastContainer
```

### Source Structure

```
src/
├── index.html               # HTML entry point (served via Vite plugin)
├── main.tsx, App.tsx, index.css
├── sdk/                     # React adapter layer over sphere-sdk (24 files)
│   ├── SphereProvider.tsx, SphereContext.ts, types.ts, queryKeys.ts
│   ├── hooks/core/          # useSphere, useWalletStatus, useIdentity, useNametag, useSphereEvents, useIpfsSync
│   ├── hooks/payments/      # useTokens, useBalance, useAssets, useTransfer, useTransactionHistory
│   ├── hooks/l1/            # useL1Balance, useL1Utxos, useL1Send, useL1Transactions
│   ├── hooks/comms/         # useSendDM, usePaymentRequests
│   └── utils/format.ts
├── hooks/                   # 9 app-level hooks
│   ├── useMarketFeed, useTheme, useTutorial, useUIState, useDesktopState
│   └── useGlobalSyncStatus, useVisualViewport, useKeyboardScrollIntoView, useMentionNavigation
├── components/
│   ├── activity/            # IntentIcon, ActivityTicker (market feed via SDK WebSocket)
│   ├── agents/              # AgentCard, IframeAgent, WalletRequiredBlocker
│   ├── chat/                # ChatSection
│   │   ├── dm/              # DMChatSection, DMConversationList, DMMessageList
│   │   ├── group/           # GroupChatSection, GroupList, GroupMessageList
│   │   ├── mini/            # MiniChatWindow, miniChatStore
│   │   ├── hooks/           # useChat, useDmUnreadCount, useGroupChat, useGroupUnreadCount
│   │   ├── data/            # chatTypes (CHAT_KEYS, GROUP_CHAT_KEYS)
│   │   └── utils/           # avatarColors, groupChatHelpers
│   ├── wallet/
│   │   ├── L1/              # L1WalletModal, VestingDisplay, BridgeModal, modals
│   │   ├── L3/              # L3WalletView, modals, currency utils
│   │   ├── onboarding/      # CreateWalletFlow, hooks
│   │   ├── shared/          # Shared wallet components, modals, hooks
│   │   └── ui/              # BaseModal, Button, ModalHeader, AlertMessage, EmptyState, MenuButton
│   ├── layout/              # DashboardLayout, Header, IpfsSyncIndicator
│   ├── desktop/             # DesktopLayout, TabBar, Taskbar, DesktopShortcuts
│   ├── connect/             # ConnectIntentHandler, ConnectionApprovalModal, ConnectProvider
│   ├── splash/              # SplashScreen
│   ├── theme/               # ThemeInitializer, ThemeToggle
│   ├── tutorial/            # TutorialOverlay
│   └── ui/                  # ComingSoonModal, Toast, toast-utils
├── pages/                   # 10 page components (see Routes)
├── contexts/                # ServicesContext, ServicesProvider, useServices
├── services/                # marketplaceApi, userApi
├── config/
│   ├── activities.ts        # Agent definitions (AgentConfig, getAgentConfig)
│   └── storageKeys.ts       # All localStorage key constants
├── lib/queryClient.ts       # TanStack Query client
├── types/                   # index.ts (ChatMode, IAgent, ICryptoPriceData)
└── utils/                   # markdown, mentionHandler, retry
```

### SDK Event Bridging (`useSphereEvents`)

SDK events → TanStack Query invalidations + custom DOM events:
- `transfer:incoming` → invalidates payments queries + toast (deduplicated)
- `transfer:confirmed` → invalidates payments
- `history:updated` → invalidates transaction history
- `identity:changed` → invalidates identity, payments, L1, chat queries
- `nametag:registered`, `nametag:recovered` → refreshes identity cache + invalidates identity
- `sync:completed`, `sync:remote-update` → invalidates payments (debounced 300ms)
- `message:dm` → invalidates chat queries + dispatches `dm-received` CustomEvent
- `message:read` → invalidates chat queries
- `composing:started` → dispatches `dm-typing` CustomEvent
- `payment_request:incoming` → dispatches `payment-requests-updated` Event

### Query Key Structure

```
SPHERE_KEYS:
  wallet: { exists, status }
  identity: { current, nametag, addresses }
  payments: { tokens, balance, assets, transactions }
  l1: { balance, utxos, transactions, vesting, blockHeight }
  communications: { conversations }
  market: { prices, registry }

CHAT_KEYS:
  conversations(addressId), messages(addressId, peerPubkey), unreadCount(addressId)

GROUP_CHAT_KEYS:
  all: ['groupChat']
```

### Custom Events

| Event | Dispatched from | Detail type |
|-------|----------------|-------------|
| `dm-received` | useSphereEvents | `DmReceivedDetail` |
| `dm-typing` | useSphereEvents | composing indicator |
| `payment-requests-updated` | useSphereEvents | — |
| `show-toast` | toast-utils | `ShowToastDetail` |
| `wallet-updated` | modals, onboarding | — |
| `wallet-loaded` | onboarding flows | — |
| `dev-config-changed` | Header (dev settings) | — |

### localStorage Keys

All keys use `sphere_` prefix (centralized in `src/config/storageKeys.ts`):
- `sphere_theme`, `sphere_tutorial_completed`, `sphere_chat_mode`
- `sphere_chat_selected_group`, `sphere_chat_selected_dm`
- `sphere_ipfs_enabled`, `sphere_desktop_state`
- `sphere_dev_aggregator_url`, `sphere_dev_skip_trust_base`

Wallet encryption/storage is handled internally by the SDK.

## Environment Variables

```env
VITE_WELCOME_AGENT_NAMETAG  # Welcome DM agent nametag (default: kbbot)
VITE_SENTRY_DSN             # Sentry: unset = prod DSN baked into PROD builds (src/config/sentry.ts),
                            # '' at build time = disabled (Pages previews do this), dev = off unless set.
                            # Init lives in src/instrument.ts — MUST stay the first import in main.tsx.
                            # environment tag is derived at runtime (hostname), NOT via runtime-config.sh.
VITE_WELCOME_DELAY_MS       # Delay before sending welcome DM (default: 4000)
SSL_CERT_PATH               # HTTPS cert path for dev server
HMR_HOST                    # Remote HMR host
BASE_PATH                   # Deployment base path (default: /)
```

### Docker image: build-once, promote-many

The Docker image (`Dockerfile`, published by `docker-build.yml`) is
**environment-agnostic** so the *same* image auto-deploys to staging and is
promoted, unchanged, to prod. Because Vite inlines `VITE_*` at build time, the
image is built with sentinel **placeholders** (the Dockerfile `ARG` defaults,
e.g. `__RUNTIME_SPHERE_API_URL__`) and `deploy/runtime-config.sh` rewrites them
into the built JS from the container's env vars at startup (run as nginx's
`/docker-entrypoint.d` hook; also invoked from `deploy/entrypoint.sh` in the SSL
image). Set these on the ECS task definition / `docker -e`:

| Runtime env var (task def) | Replaces placeholder for | Drives |
|----------------------------|--------------------------|--------|
| `SPHERE_API_URL`       | `VITE_SPHERE_API_URL`      | quest-api (marketplace / user / maintenance) |
| `WALLET_API_URL`       | `VITE_WALLET_API_URL`      | wallet-api backend (S4 asset custody) |
| `REQUIRE_WALLET_API`   | `VITE_REQUIRE_WALLET_API`  | #351 fail-closed custody flag (`''`/`false`/`0` = off) |
| `DEV_PORTAL_URL`       | `VITE_DEV_PORTAL_URL`      | developer-portal link |
| `AGGREGATOR_API_KEY`   | `VITE_AGGREGATOR_API_KEY`  | aggregator key (non-secret on testnet2; a real secret on mainnet). **Required only when `SUBSCRIPTION_ENABLED` != `true`; ignored when subscriptions are on** (per-wallet SGW keys replace it) |
| `SUBSCRIPTION_ENABLED` | `window.__SPHERE_RUNTIME_CONFIG__` (not a placeholder) | per-wallet SGW subscription keys (exactly `true` = on) |
| `PAID_PLANS_ENABLED`   | `window.__SPHERE_RUNTIME_CONFIG__` (not a placeholder) | paid-plan purchases (exactly `true`; testnet leaves off) |

Notes:
- **CDN cache:** Vite's content-hashed filenames are identical across env
  changes, so a CloudFront/CDN in front of the image **must be invalidated**
  after changing any value (same as `sphere-dev-portal`).
- **Fail-closed (#351):** if `REQUIRE_WALLET_API` is truthy but `WALLET_API_URL`
  is empty, the entrypoint exits non-zero and the container won't serve.
- **Two mechanisms, not one:** plain string values (URLs, keys) ride the sed
  placeholders. Feature FLAGS cannot — Rollup statically evaluates branch
  conditions against baked literals and prunes every `if (FLAG)` at build
  time — so the subscription flags are served via `/runtime-config.js`
  (`window.__SPHERE_RUNTIME_CONFIG__`, written at container start, loaded
  before the bundle). See the header comments in `src/config/subscription.ts`
  and `src/config/walletApi.ts` before adding a new runtime-swappable value.
- **SGW base URL needs no config:** the SGW is the aggregator gateway, derived
  from the SDK's per-network table (`NETWORKS[SPHERE_NETWORK].aggregatorUrl`,
  see `src/config/network.ts`); all SGW endpoints serve CORS for direct
  browser calls (unicitynetwork/aggregator-subscription#57).
- **`VITE_SUBSCRIPTION_MOCK`** is dev-only and deliberately NOT
  runtime-swappable (prod builds tree-shake the mock).
- **`BASE_PATH`** stays a build-time arg (`/` for both AWS envs) — it is *not*
  runtime-swappable. The GitHub Pages branch deploys are a separate non-Docker
  build (`deploy-pages-branch.yml`) and are unaffected by this mechanism.
- **Local:** `docker compose up` sets these to staging values (`docker-compose.yml`).

## Vite Configuration

- **Plugins:** @vitejs/plugin-react, @tailwindcss/vite, vite-plugin-node-polyfills, custom `html-from-src` plugin
- **Entry point:** `src/index.html` (custom plugin rewrites requests in dev and moves output in build)
- **Proxies:**
  - `/rpc` → `https://goggregator-test.unicity.network` (L3 aggregator)
  - `/dev-rpc` → `https://dev-aggregator.dyndns.org` (dev aggregator)
  - `/coingecko` → `https://api.coingecko.com/api/v3` (price data)
- **Base path:** configurable via `BASE_PATH` env var
- **Node polyfills:** Buffer, process globals for the `@unicitylabs/sphere-sdk` browser bundle (its dist imports the bare `buffer` module)
- **GitHub Pages SPA:** CI copies `index.html` → `404.html` for client-side routing

## Testing

Tests are in `tests/` and run with Vitest:
- `tests/unit/config/storageKeys.test.ts` — storage key utilities (10 tests)
- Environment: jsdom
- Path alias: `@` maps to `/src` (vitest.config.ts)
- Globals enabled: `describe`, `it`, `expect`, `vi` available without imports

## TypeScript Configuration

- Strict mode with `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `erasableSyntaxOnly`, `noUncheckedSideEffectImports`
- `tsconfig.app.json`: Target ES2022, Module ESNext, bundler resolution (covers `src/`)
- `tsconfig.node.json`: Target ES2023 (covers `vite.config.ts`)
- Type checking: `npx tsc --noEmit`

## Developer Notes

### Node Polyfills
Node polyfills (`vite-plugin-node-polyfills`) are needed for `@unicitylabs/sphere-sdk`: its browser/core dist bundles import the bare `buffer` module (`import { Buffer } from "buffer"`) and reference `process`, which the plugin resolves and shims.

### Key External Dependencies
- `@unicitylabs/sphere-sdk` — Core SDK: L1/L3 operations, Nostr messaging, IPFS sync, market feed
