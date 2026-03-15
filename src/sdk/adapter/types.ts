/**
 * ISphereAdapter — platform-independent interface for all Sphere SDK operations.
 *
 * Implementations:
 * - DirectAdapter (web) — wraps real Sphere instance
 * - ExtensionAdapter (extension) — sends POPUP_* chrome messages to background
 *
 * All methods are async so both implementations share the same contract.
 * Hooks consume only this interface — zero platform checks needed.
 */

import type {
  Identity,
  Token,
  TokenStatus,
  Asset,
  TransferRequest,
  TransferResult,
  TransactionHistoryEntry,
  TrackedAddress,
  AddressInfo,
  PeerInfo,
  DirectMessage,
  WalletInfo,
  WalletJSON,
  WalletJSONExportOptions,
  L1Balance,
  L1Utxo,
  L1Transaction,
  L1SendRequest,
  L1SendResult,
  IncomingPaymentRequest,
  PaymentRequestResult,
  PaymentRequestResponseType,
  ConversationPage,
  GetConversationPageOptions,
} from '@unicitylabs/sphere-sdk';
import type { EventCallback } from './events';

export interface ISphereAdapter {
  // ---------------------------------------------------------------------------
  // Identity
  // ---------------------------------------------------------------------------

  /** Cached identity — synchronous read, updated via events */
  readonly identity: Identity | null;

  /** Non-hidden tracked addresses */
  getActiveAddresses(): Promise<TrackedAddress[]>;

  /** All tracked addresses including hidden */
  getAllTrackedAddresses(): Promise<TrackedAddress[]>;

  /** Current HD address index */
  getCurrentAddressIndex(): Promise<number>;

  /** Switch to a different HD address */
  switchToAddress(index: number, options?: { nametag?: string }): Promise<void>;

  /** Derive address at index */
  deriveAddress(index: number): Promise<AddressInfo>;

  /** Hide/unhide an address */
  setAddressHidden(index: number, hidden: boolean): Promise<void>;

  /** Wallet info (derivation mode, source, etc.) */
  getWalletInfo(): Promise<WalletInfo>;

  // ---------------------------------------------------------------------------
  // Nametag
  // ---------------------------------------------------------------------------

  isNametagAvailable(nametag: string): Promise<boolean>;
  registerNametag(nametag: string): Promise<void>;

  // ---------------------------------------------------------------------------
  // Peer Resolution
  // ---------------------------------------------------------------------------

  /** Resolve @nametag, DIRECT://, alpha1..., or pubkey to PeerInfo */
  resolve(identifier: string): Promise<PeerInfo | null>;

  // ---------------------------------------------------------------------------
  // Payments (L3)
  // ---------------------------------------------------------------------------

  getTokens(filter?: { coinId?: string; status?: TokenStatus }): Promise<Token[]>;
  getAssets(coinId?: string): Promise<Asset[]>;
  getBalance(): Promise<Asset[]>;
  getFiatBalance(): Promise<number | null>;
  send(request: TransferRequest): Promise<TransferResult>;
  getTransactionHistory(): Promise<TransactionHistoryEntry[]>;

  /** Sync tokens with remote storage (IPFS) */
  sync(): Promise<{ added: number; removed: number }>;

  // ---------------------------------------------------------------------------
  // L1 (ALPHA blockchain)
  // ---------------------------------------------------------------------------

  l1GetBalance(): Promise<L1Balance>;
  l1GetUtxos(): Promise<L1Utxo[]>;
  l1Send(request: L1SendRequest): Promise<L1SendResult>;
  l1EstimateFee(to: string, amount: string): Promise<{ fee: string; feeRate: number }>;
  l1GetTransactions(limit?: number): Promise<L1Transaction[]>;
  l1ResolveAddress(destination: string): Promise<string>;

  // ---------------------------------------------------------------------------
  // Communications (DMs)
  // ---------------------------------------------------------------------------

  sendDM(recipient: string, content: string): Promise<DirectMessage>;
  getConversations(): Promise<Map<string, DirectMessage[]>>;
  getConversation(peerPubkey: string): Promise<DirectMessage[]>;
  getConversationPage(peerPubkey: string, options?: GetConversationPageOptions): Promise<ConversationPage>;
  getUnreadCount(peerPubkey?: string): Promise<number>;
  markAsRead(messageIds: string[]): Promise<void>;
  sendComposingIndicator(recipientPubkeyOrNametag: string): Promise<void>;
  deleteConversation(peerPubkey: string): Promise<void>;

  /** Resolve nametag for a peer pubkey via transport */
  resolvePeerNametag(pubkey: string): Promise<string | undefined>;

  // ---------------------------------------------------------------------------
  // Payment Requests
  // ---------------------------------------------------------------------------

  /** Send a payment request to a peer */
  sendPaymentRequest(
    recipient: string,
    params: { amount: string; coinId: string; message?: string },
  ): Promise<PaymentRequestResult>;

  /** Register handler for incoming payment requests; returns cleanup function */
  onPaymentRequest(handler: (request: IncomingPaymentRequest) => void): Promise<() => void>;

  /** Send response to a payment request */
  sendPaymentRequestResponse(
    senderPubkey: string,
    response: { requestId: string; responseType: PaymentRequestResponseType },
  ): Promise<void>;

  // ---------------------------------------------------------------------------
  // Signing
  // ---------------------------------------------------------------------------

  signMessage(message: string): Promise<string>;

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  exportToJSON(options?: WalletJSONExportOptions): Promise<WalletJSON>;
  getMnemonic(): Promise<string | null>;

  // ---------------------------------------------------------------------------
  // Address Discovery
  // ---------------------------------------------------------------------------

  discoverAddresses(options?: {
    autoTrack?: boolean;
    includeL1Scan?: boolean;
  }): Promise<unknown>;

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  on(event: string, callback: EventCallback): void;
  off(event: string, callback: EventCallback): void;

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  destroy(): void;
}
