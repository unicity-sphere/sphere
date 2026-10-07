# Wallet modules

A wallet module is an optional feature the wallet discovers at build time and
that can be removed by deleting one folder. The core knows the *contract*, not
the modules: nothing outside `src/modules/<name>/` imports a module, and a
test (`tests/unit/modules/isolation.test.ts`) keeps it that way.

```
src/modules/
├── types.ts          the contract (WalletModule, WalletModuleAction, CoinPresentation)
├── registry.ts       import.meta.glob('./*/module.ts') + the three lookups the core calls
└── bridge/           one module: bridging external assets in
    ├── module.ts     default export: the WalletModule
    ├── assets/       one folder per bridgeable asset (its own plugin seam, see below)
    └── …
```

## What a module can contribute

| Hook | Where the core uses it |
|---|---|
| `tokenPlugins()` | `SphereProvider` passes them to every `Sphere.init({ plugins })`, so the SDK verifies the module's token types (a bridged token is checked against its source-chain lock). |
| `describeCoin(coinId)` | `L3WalletView` asks it for every asset and token row: a coin the token registry does not list can still get a symbol, a name, decimals and a badge. |
| `actions` | `ModuleActions` renders one button per action under the built-in Top Up / Swap / Send, and mounts the action's `Screen` (a `WalletScreen`, like the built-in modals). `isAvailable(network)` hides an action where it makes no sense. |

Adding a module: create `src/modules/<name>/module.ts` with a default export.
Removing one: delete the folder. Nothing else changes.

## The bridge module and its assets

The bridge module is itself pluggable. A bridgeable asset lives in
`src/modules/bridge/assets/<name>/index.ts` and default-exports a
`BridgeAssetProvider` whose `load()` returns `BridgeAsset`s. The screen and the
deposit flow (`bridgeIn.ts`) work on `BridgeAsset` alone and name no chain:

- **the token plugin**: the strict mint-reason verifier the wallet registers;
- **the wallet options** (`wallets()`): the ways to sign on the source chain,
  read on each render because an Ethereum wallet announces itself through
  EIP-6963 and may arrive after the asset loaded. The Ethereum asset lists every
  announced wallet by name and icon and offers the legacy `window.ethereum` as
  "Browser wallet" when no announced wallet owns it;
- **the deposit wiring** per wallet option (`open()`): a `ChainWallet` that
  signs, a `ReceiptReader` for the node, and the chain's `BridgeSourceAdapter`
  from `@unicitylabs/bridge-core`, which turns "deposit X for this recipient"
  into opaque steps and builds the Unicity mint request;
- **presentation**: explorer links and address rules;
- **`chain`**: the source chain as the picker shows it (family name, network
  name, testnet flag); assets sharing a chain id are grouped under one entry;
- **`out`** (optional): the assets-out side. `fee` asks the return service what
  it takes from each burned token, `reasonFor` builds the canonical return
  reason for an amount and a destination with that fee written in, `identify`
  reads a burned blob back (its nullifier, destination, amount and fee, or
  `null` when the blob is not this asset's), and `returns` is the return
  service that proves the burn and releases the funds. `payout`, when the vault
  credits payouts, collects a settled return from the wallet option the user
  picks. An asset without `out` is offered for bridging in only.
- **`networks`**: which Unicity networks the asset may be bridged into (a
  testnet vault serves test networks only).

The screen walks direction → network → asset → form and shows every step even
with a single option, so what is supported is visible rather than implied.
Bridging in ends with an amount and the wallet that signs the deposit;
bridging out ends with the tokens to burn (each whole) and the destination
address. The first step lists what is in flight: deposits signed but not yet
minted, with Resume, and burns waiting for their release, with the return
service's status for each.

`assets/tron-usdt/` is the one asset today (USDT on Tron Nile, via
`@unicitylabs/bridge-plugin`). A second Tron asset is another
manifest in that file; a second chain family is another folder implementing
the same interfaces from its own plugin package. A provider whose manifest
fails its integrity pin is logged and skipped; the wallet starts without it.

### Money-safety rules the flow keeps

- The recovery record (salt, recipient commitment, token id) is written
  **before** anything is signed; if it cannot be written the flow refuses to
  sign. A lock whose salt was lost could never be minted.
- Account and network are pinned at connect and re-checked before every
  signature; a wrong network blocks before any signing.
- What the account holds of the asset on the source chain is read right after
  connect; an amount above it stops with "Not enough USDC in the wallet." before
  anything is signed or recorded, so no approval is paid for a lock that cannot
  follow.
- A reverted lock marks the record failed; a mint that fails after a confirmed
  lock keeps the record, and the screen offers **Resume**, which decodes the
  landed lock and mints without signing anything.
- A lock the wallet asked for but never saw a transaction id for is kept only
  when the extension gave no answer (the page closed at the prompt, a lost
  connection). An error answered by the extension, a refusal or missing gas,
  means nothing was broadcast, and the record is discarded. The exception is a
  node saying the transaction is already known.
- Such a record shows when it was started and from which account, with an
  explorer link, and the wallet searches the vault's `Lock` events for that
  account since the start (`findLock`, a read of the chain). A found lock is
  written into the record and resumed like any other; otherwise the row says no
  lock was found and discarding is safe, and still takes a pasted transaction id.
- The depositor's own mint runs at zero confirmations (it witnessed its lock);
  every other wallet re-verifies under the asset's `confirmations`.
- Bridging out burns first and records second, in that order on purpose: the
  burned blob is the claim on the vault and the only copy of it. `burnForReturn`
  hands the blob to the module's store and releases the wallet's retained copy
  only once the record is written; if writing fails the wallet keeps the blob and
  `recoverBurns` turns it into a record on the next wallet start. Only then is
  the blob sent to the return service, which may fail freely: the service is
  idempotent on the burn's nullifier, the record is resubmitted on the next
  sync, and a service that restarted (it holds nothing durable) is resent the
  blob when it no longer knows the return id. A refusal the service marks as
  not recoverable ends the return as failed, with the blob still in the record.
- The return service's fee comes out of the released amount and is fixed by the
  burn, so every check on it runs before the burn. The form shows the fee the
  service quotes; the burn is made only if the quote fetched at that moment is
  no higher than the one shown, no higher than the asset's cap in code, leaves
  something of the token, is paid to the pinned account when one is set, and
  parses as a 20-byte recipient, a whole amount and a future deadline. A reason
  the service would refuse or no proof could cover would leave a burned token
  nobody releases, so a service that does not answer `/fees` means no burn.
- An open return cannot be dismissed; a finished one can.

### Development links

While the SDK's token-plugin seam and the bridge are developed together,
`package.json` points `@unicitylabs/sphere-sdk`, `@unicitylabs/bridge-core` and
`@unicitylabs/bridge-plugin` at sibling checkouts (`file:`). They
revert to published versions before merge; `tests/unit/dependency-hygiene.test.ts`
carries the tripwire. `vite.config.ts` dedupes `@unicitylabs/state-transition-sdk`
so the linked packages and the SDK share one runtime copy.

Each deployment has a return service of its own, which refuses any other
deployment's burns (`config_hash_mismatch`). The wallet learns it from the
deployment's config, never from code: an asset without one is offered for
bridging in only, so no token is burned with nowhere to send it.
- Sepolia USDC reads `BRIDGE_RETURN_SERVICE_URL_SEPOLIA_USDC` from the
  container's runtime config (`deploy/runtime-config.sh`, set by sphere-infra on
  staging and prod), else `VITE_BRIDGE_RETURN_SERVICE_URL_SEPOLIA_USDC` from the
  build (the Pages preview, local builds). A container that leaves it empty offers
  bridging in only, whatever the build baked. The deployed service,
  `https://bridge-usdce.testnet.unicity.network`, checks burns against the
  testnet2 trust base; the asset is offered on test networks only, so a mainnet
  session never posts there.
- Tron Nile USDT has no deployed service; a local build can name one with
  `VITE_BRIDGE_RETURN_SERVICE_URL_NILE_USDT`.
- `BRIDGE_RETURN_FEE_RECIPIENT_SEPOLIA_USDC` names the one account a Sepolia
  USDC return fee may be paid to; it must match the service's
  `BRIDGE_RETURN_FEE_RECIPIENT`. It is read from the same places as the service
  URL: the container's runtime config, else
  `VITE_BRIDGE_RETURN_FEE_RECIPIENT_SEPOLIA_USDC` from the build. A container
  that leaves it empty names no account, whatever the build baked. Unset, the
  account the service names is paid.

`vite.config.ts` refuses the single `VITE_BRIDGE_RETURN_SERVICE_URL` these
replace, which would otherwise be ignored silently.
