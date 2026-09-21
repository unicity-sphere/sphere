import type {
  BridgePresentation,
  BridgeSourceAdapter,
  ChainWallet,
  ReceiptReader,
  WalletTokenPlugin,
} from '@unicitylabs/bridge-core';

/** The chain wiring one deposit runs on, assembled by the asset for one signer. */
export interface BridgeInDeps {
  readonly wallet: ChainWallet;
  readonly receipts: ReceiptReader;
  readonly adapter: BridgeSourceAdapter;
  /** Source-chain network id the deposit targets; pinned and re-checked before every signature. */
  readonly expectedNetwork: number;
  /** Human label for the wrong-network message, e.g. the asset's label. */
  readonly chainLabel: string;
}

/** A way to sign on the source chain, as the user picks it in the screen. */
export interface BridgeWalletOption {
  readonly id: string;
  readonly name: string;
  /** Shown when the option cannot be used here (extension missing, …). */
  readonly unavailableHint?: string;
  isAvailable(): boolean;
  /** A not-yet-connected wiring; the flow calls `wallet.connect()` first. */
  open(): BridgeInDeps;
}

/** The source chain an asset is bridged from, as the picker shows it. */
export interface BridgeChain {
  /** Stable id shared by every asset on the chain, e.g. the CAIP-2-style `tron:0xcd8690dc`. */
  readonly id: string;
  /** The chain family, e.g. "Tron". Also the badge on bridged coins. */
  readonly name: string;
  /** The concrete network on it, e.g. "Nile testnet" or "Mainnet". */
  readonly networkName: string;
  readonly testnet: boolean;
}

/** One bridgeable asset, as the screen and the flow see it. */
export interface BridgeAsset {
  /** Stable id, e.g. `tron:0xcd8690dc:usdt`. */
  readonly id: string;
  /** Full name, e.g. "USDT (bridged · Tron)". */
  readonly label: string;
  readonly symbol: string;
  readonly decimals: number;
  readonly coinIdHex: string;
  readonly tokenTypeHex: string;
  readonly chain: BridgeChain;
  /** Source-finality threshold other wallets enforce before accepting the token. */
  readonly confirmations: number;
  readonly networks: readonly string[];
  /** What the wallet registers at init: the strict mint-reason verifier. */
  readonly tokenPlugin: WalletTokenPlugin;
  readonly presentation: BridgePresentation;
  readonly wallets: readonly BridgeWalletOption[];
  /** Read-only wiring to finish a mint whose deposit already landed. Never signs. */
  resumeDeps(): Pick<BridgeInDeps, 'adapter' | 'receipts'>;
}

/** What `assets/<name>/index.ts` default-exports: a lazy loader for one family of assets. */
export interface BridgeAssetProvider {
  readonly id: string;
  /** Build the assets; may throw (an integrity pin that does not match), which disables this provider only. */
  load(): readonly BridgeAsset[];
}
