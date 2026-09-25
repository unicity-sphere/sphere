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

/** Lifecycle of a return: the wallet's own two states, then the service's. */
export type ReturnStatus = 'burned' | 'queued' | 'proving' | 'proven' | 'submitted' | 'settled' | 'failed';

/** What the return service reports for one submitted burn. */
export interface ReturnServiceRecord {
  readonly returnId: string;
  readonly status: Exclude<ReturnStatus, 'burned'>;
  /** The source-chain settlement transaction, once released. */
  readonly settleTxid?: string;
  readonly message?: string;
  /** For a failed return: whether resubmitting the same blob may still succeed. */
  readonly recoverable?: boolean;
  /** Place among the burns waiting for the next proof, when queued. */
  readonly queuePosition?: number;
  /** When the current status began, service clock. */
  readonly sinceMs?: number;
}

/** The pace of proving, from the service's health. */
export interface ReturnServiceTiming {
  /** When the batch now proving started, if one is. */
  readonly provingSinceMs?: number;
  /** Mean duration of the proofs this service has completed. */
  readonly averageProofMs?: number;
}

/** A refusal from the return service. Not recoverable = the same blob will never be accepted. */
export interface ReturnRefusal {
  readonly message: string;
  readonly recoverable: boolean;
}

export interface BridgeReturnService {
  submit(burnedToken: Uint8Array, reasonBytes: Uint8Array): Promise<ReturnServiceRecord>;
  /** `null` when the service no longer knows the id (it restarted); resubmit then. */
  status(returnId: string): Promise<ReturnServiceRecord | null>;
  /** Classify a thrown error from either call. */
  refusal(error: unknown): ReturnRefusal | null;
  /** How fast the service proves; `null` when it cannot be reached. */
  timing(): Promise<ReturnServiceTiming | null>;
}

/** What a burned blob says about itself, when it is this asset's. */
export interface BurnIdentity {
  /** The burn's nullifier (hex): the record's identity and the service's idempotency key. */
  readonly nullifierHex: string;
  /** Destination and amount read back from the reason bytes, for a recovered record. */
  readonly destination: string;
  readonly amount: bigint;
}

export interface BridgePayout {
  /** What the vault owes `destination`, in the asset's smallest unit. */
  owed(destination: string): Promise<bigint>;
  /** Send the collecting transaction from a wallet holding `destination`; resolves to its id. */
  collect(destination: string): Promise<string>;
}

/** The assets-out side of an asset: burn on Unicity, release on the source chain. */
export interface BridgeOutSide {
  /** Canonical return-reason bytes for releasing `amount` to `destination`. The destination is validated first. */
  reasonFor(args: { amount: bigint; destination: string }): Uint8Array;
  /** Read a burned blob; `null` when it is not this asset's burn. */
  identify(burnedToken: Uint8Array): Promise<BurnIdentity | null>;
  /** Whether a token's mint reason names the vault this side releases from. */
  backs(justification: Uint8Array | null): boolean | Promise<boolean>;
  readonly returns: BridgeReturnService;
  /** Present when the vault credits payouts for the destination to collect. */
  readonly payout?: BridgePayout;
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
  /** Reference price per whole unit in USD for display when the price feed has none; a stablecoin's peg. */
  readonly priceUsd?: number;
  /** Source-finality threshold other wallets enforce before accepting the token. */
  readonly confirmations: number;
  readonly networks: readonly string[];
  /** What the wallet registers at init: the strict mint-reason verifier. */
  readonly tokenPlugin: WalletTokenPlugin;
  readonly presentation: BridgePresentation;
  readonly wallets: readonly BridgeWalletOption[];
  /** Read-only wiring to finish a mint whose deposit already landed. Never signs. */
  resumeDeps(): Pick<BridgeInDeps, 'adapter' | 'receipts'>;
  /** Present when the asset can be bridged out again. */
  readonly out?: BridgeOutSide;
  /** When set, the asset is listed but neither direction can start; the text says why. */
  readonly disabledReason?: string;
  settling?(justification: Uint8Array | null): Promise<{ final: boolean; secondsLeft: number } | null>;
}

/** What `assets/<name>/index.ts` default-exports: a lazy loader for one family of assets. */
export interface BridgeAssetProvider {
  readonly id: string;
  /** Build the assets; may throw (an integrity pin that does not match), which disables this provider only. */
  load(): readonly BridgeAsset[];
}
