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
- **the deposit wiring** per wallet option (`open()`): a `ChainWallet` that
  signs, a `ReceiptReader` for the node, and the chain's `BridgeSourceAdapter`
  from `@unicitylabs/bridge-core`, which turns "deposit X for this recipient"
  into opaque steps and builds the Unicity mint request;
- **presentation**: explorer links and address rules;
- **`chain`**: the source chain as the picker shows it (family name, network
  name, testnet flag); assets sharing a chain id are grouped under one entry;
- **`networks`**: which Unicity networks the asset may be bridged into (a
  testnet vault serves test networks only).

The screen walks network → asset → amount and shows every step even with a
single option, so what is supported is visible rather than implied.

`assets/tron-usdt/` is the one asset today (USDT on Tron Nile, via
`@unicitylabs/bridge-plugin-tron-usdt`). A second Tron asset is another
manifest in that file; a second chain family is another folder implementing
the same interfaces from its own plugin package. A provider whose manifest
fails its integrity pin is logged and skipped; the wallet starts without it.

### Money-safety rules the flow keeps

- The recovery record (salt, recipient commitment, token id) is written
  **before** anything is signed; if it cannot be written the flow refuses to
  sign. A lock whose salt was lost could never be minted.
- Account and network are pinned at connect and re-checked before every
  signature; a wrong network blocks before any signing.
- A reverted lock marks the record failed; a mint that fails after a confirmed
  lock keeps the record, and the screen offers **Resume**, which decodes the
  landed lock and mints without signing anything.
- The depositor's own mint runs at zero confirmations (it witnessed its lock);
  every other wallet re-verifies under the asset's `confirmations`.

### Development links

While the SDK's token-plugin seam and the bridge are developed together,
`package.json` points `@unicitylabs/sphere-sdk`, `@unicitylabs/bridge-core` and
`@unicitylabs/bridge-plugin-tron-usdt` at sibling checkouts (`file:`). They
revert to published versions before merge; `tests/unit/dependency-hygiene.test.ts`
carries the tripwire. `vite.config.ts` dedupes `@unicitylabs/state-transition-sdk`
so the linked packages and the SDK share one runtime copy.

`VITE_BRIDGE_DEV_TRON_KEY` (dev only) offers a "development key" signer in the
bridge screen so a deposit can be exercised without the TronLink extension.
