/// <reference types="chrome" />

/**
 * ExtensionAdapter — ISphereAdapter for Chrome extension mode.
 *
 * All SDK operations are routed to the background service worker
 * via chrome.runtime.sendMessage({ type: 'POPUP_*' }).
 *
 * SDK events arrive via SDK_EVENT broadcasts and are dispatched
 * to the local emitter for useSphereEvents and other hooks.
 */

import type { Identity } from '@unicitylabs/sphere-sdk';
import type { ISphereAdapter } from './types';
import type { EventCallback } from './events';
import { AdapterEventEmitter } from './events';

/** Send a message to the background worker */
async function sendBg<T = unknown>(message: Record<string, unknown>): Promise<T> {
  const response = await chrome.runtime.sendMessage(message);
  if (response && typeof response === 'object' && 'error' in response && !response.success) {
    throw new Error(response.error as string);
  }
  return response as T;
}

export class ExtensionAdapter implements ISphereAdapter {
  private emitter = new AdapterEventEmitter();
  private _identity: Identity | null = null;
  private messageListener: ((message: Record<string, unknown>) => void) | null = null;

  constructor() {
    // Listen for SDK_EVENT broadcasts from background
    this.messageListener = (message: Record<string, unknown>) => {
      if (message.type !== 'SDK_EVENT') return;
      const event = message.event as string;
      const data = message.data;
      this.emitter.emit(event, data);

      // Keep cached identity up to date
      if (event === 'identity:changed' && data) {
        this._identity = data as Identity;
      }
      // Re-fetch identity when nametag changes (SDK updates identity.nametag async)
      if (event === 'nametag:registered' || event === 'nametag:recovered') {
        this.refreshIdentity();
      }
    };
    chrome.runtime.onMessage.addListener(this.messageListener);

    // Fetch initial identity
    this.refreshIdentity();
  }

  private async refreshIdentity() {
    try {
      const r = await sendBg<{ success: boolean; identity: Identity | null }>({
        type: 'POPUP_GET_IDENTITY',
      });
      if (r.success && r.identity) {
        this._identity = r.identity;
        // Notify listeners so useSphereEvents invalidates identity queries
        this.emitter.emit('identity:changed', r.identity);
      }
    } catch {
      // Identity not available yet
    }
  }

  // ---------------------------------------------------------------------------
  // Identity
  // ---------------------------------------------------------------------------

  get identity() {
    return this._identity;
  }

  async getActiveAddresses() {
    const r = await sendBg<{ success: boolean; addresses: unknown[] }>({
      type: 'POPUP_GET_ACTIVE_ADDRESSES',
    });
    return r.addresses as Awaited<ReturnType<ISphereAdapter['getActiveAddresses']>>;
  }

  async getAllTrackedAddresses() {
    const r = await sendBg<{ success: boolean; addresses: unknown[] }>({
      type: 'POPUP_GET_ALL_ADDRESSES',
    });
    return r.addresses as Awaited<ReturnType<ISphereAdapter['getAllTrackedAddresses']>>;
  }

  async getCurrentAddressIndex() {
    const r = await sendBg<{ success: boolean; index: number }>({
      type: 'POPUP_GET_CURRENT_INDEX',
    });
    return r.index;
  }

  async switchToAddress(index: number, options?: { nametag?: string }) {
    await sendBg({ type: 'POPUP_SWITCH_ADDRESS', index, nametag: options?.nametag });
  }

  async deriveAddress(index: number) {
    const r = await sendBg<{ success: boolean; address: unknown }>({
      type: 'POPUP_DERIVE_ADDRESS',
      index,
    });
    return r.address as Awaited<ReturnType<ISphereAdapter['deriveAddress']>>;
  }

  async setAddressHidden(index: number, hidden: boolean) {
    await sendBg({ type: 'POPUP_SET_ADDRESS_HIDDEN', index, hidden });
  }

  async getWalletInfo() {
    const r = await sendBg<{ success: boolean; info: unknown }>({
      type: 'POPUP_GET_WALLET_INFO',
    });
    return r.info as Awaited<ReturnType<ISphereAdapter['getWalletInfo']>>;
  }

  // ---------------------------------------------------------------------------
  // Nametag
  // ---------------------------------------------------------------------------

  async isNametagAvailable(nametag: string) {
    const r = await sendBg<{ success: boolean; available: boolean }>({
      type: 'POPUP_CHECK_NAMETAG_AVAILABLE',
      nametag,
    });
    return r.available;
  }

  async registerNametag(nametag: string) {
    await sendBg({ type: 'POPUP_REGISTER_NAMETAG', nametag });
  }

  // ---------------------------------------------------------------------------
  // Peer Resolution
  // ---------------------------------------------------------------------------

  async resolve(identifier: string) {
    const r = await sendBg<{ success: boolean; result: unknown }>({
      type: 'POPUP_RESOLVE',
      identifier,
    });
    return r.result as Awaited<ReturnType<ISphereAdapter['resolve']>>;
  }

  // ---------------------------------------------------------------------------
  // Payments (L3)
  // ---------------------------------------------------------------------------

  async getTokens(filter?: { coinId?: string; status?: string }) {
    const r = await sendBg<{ success: boolean; tokens: unknown[] }>({
      type: 'POPUP_GET_TOKENS',
      ...(filter && { coinId: filter.coinId, status: filter.status }),
    });
    return r.tokens as Awaited<ReturnType<ISphereAdapter['getTokens']>>;
  }

  async getAssets(coinId?: string) {
    const r = await sendBg<{ success: boolean; assets: unknown[] }>({
      type: 'POPUP_GET_ASSETS',
      ...(coinId && { coinId }),
    });
    return r.assets as Awaited<ReturnType<ISphereAdapter['getAssets']>>;
  }

  async getBalance() {
    const r = await sendBg<{ success: boolean; balance: unknown[] }>({
      type: 'POPUP_GET_BALANCE',
    });
    return r.balance as Awaited<ReturnType<ISphereAdapter['getBalance']>>;
  }

  async getFiatBalance() {
    const r = await sendBg<{ success: boolean; fiatBalance: number | null }>({
      type: 'POPUP_GET_FIAT_BALANCE',
    });
    return r.fiatBalance;
  }

  async send(request: import('@unicitylabs/sphere-sdk').TransferRequest) {
    const r = await sendBg<{ success: boolean; result: unknown }>({
      type: 'POPUP_SEND_TOKENS',
      recipient: request.recipient,
      coinId: request.coinId,
      amount: request.amount,
      memo: request.memo,
    });
    return r.result as Awaited<ReturnType<ISphereAdapter['send']>>;
  }

  async getTransactionHistory() {
    const r = await sendBg<{ success: boolean; history: unknown[] }>({
      type: 'POPUP_GET_TRANSACTION_HISTORY',
    });
    return r.history as Awaited<ReturnType<ISphereAdapter['getTransactionHistory']>>;
  }

  async sync() {
    const r = await sendBg<{ success: boolean; added: number; removed: number }>({
      type: 'POPUP_SYNC',
    });
    return { added: r.added, removed: r.removed };
  }

  // ---------------------------------------------------------------------------
  // L1 (ALPHA blockchain)
  // ---------------------------------------------------------------------------

  async l1GetBalance() {
    const r = await sendBg<{ success: boolean; balance: unknown }>({
      type: 'POPUP_GET_L1_BALANCE',
    });
    return r.balance as Awaited<ReturnType<ISphereAdapter['l1GetBalance']>>;
  }

  async l1GetUtxos() {
    const r = await sendBg<{ success: boolean; utxos: unknown[] }>({
      type: 'POPUP_GET_L1_UTXOS',
    });
    return r.utxos as Awaited<ReturnType<ISphereAdapter['l1GetUtxos']>>;
  }

  async l1Send(request: import('@unicitylabs/sphere-sdk').L1SendRequest) {
    const r = await sendBg<{ success: boolean; result: unknown }>({
      type: 'POPUP_SEND_L1',
      to: request.to,
      amount: request.amount,
      feeRate: request.feeRate,
      useVested: request.useVested,
    });
    return r.result as Awaited<ReturnType<ISphereAdapter['l1Send']>>;
  }

  async l1EstimateFee(to: string, amount: string) {
    const r = await sendBg<{ success: boolean; estimate: { fee: string; feeRate: number } }>({
      type: 'POPUP_ESTIMATE_L1_FEE',
      to,
      amount,
    });
    return r.estimate;
  }

  async l1GetTransactions(limit?: number) {
    const r = await sendBg<{ success: boolean; transactions: unknown[] }>({
      type: 'POPUP_GET_L1_TRANSACTIONS',
      ...(limit !== undefined && { limit }),
    });
    return r.transactions as Awaited<ReturnType<ISphereAdapter['l1GetTransactions']>>;
  }

  async l1ResolveAddress(destination: string) {
    const r = await sendBg<{ success: boolean; address: string }>({
      type: 'POPUP_L1_RESOLVE_ADDRESS',
      destination,
    });
    return r.address;
  }

  // ---------------------------------------------------------------------------
  // Communications (DMs)
  // ---------------------------------------------------------------------------

  async sendDM(recipient: string, content: string) {
    const r = await sendBg<{ success: boolean; message: unknown }>({
      type: 'POPUP_SEND_DM',
      recipient,
      content,
    });
    return r.message as Awaited<ReturnType<ISphereAdapter['sendDM']>>;
  }

  async getConversations() {
    const r = await sendBg<{ success: boolean; conversations: Record<string, unknown[]> }>({
      type: 'POPUP_GET_CONVERSATIONS',
    });
    // Background serializes Map as object; convert back
    const map = new Map<string, Awaited<ReturnType<ISphereAdapter['getConversation']>>>();
    for (const [key, msgs] of Object.entries(r.conversations)) {
      map.set(key, msgs as Awaited<ReturnType<ISphereAdapter['getConversation']>>);
    }
    return map;
  }

  async getConversation(peerPubkey: string) {
    const r = await sendBg<{ success: boolean; messages: unknown[] }>({
      type: 'POPUP_GET_CONVERSATION',
      peerPubkey,
    });
    return r.messages as Awaited<ReturnType<ISphereAdapter['getConversation']>>;
  }

  async getConversationPage(
    peerPubkey: string,
    options?: import('@unicitylabs/sphere-sdk').GetConversationPageOptions,
  ) {
    const r = await sendBg<{ success: boolean; page: unknown }>({
      type: 'POPUP_GET_CONVERSATION_PAGE',
      peerPubkey,
      ...(options && { limit: options.limit }),
    });
    return r.page as Awaited<ReturnType<ISphereAdapter['getConversationPage']>>;
  }

  async getUnreadCount(peerPubkey?: string) {
    const r = await sendBg<{ success: boolean; count: number }>({
      type: 'POPUP_GET_UNREAD_COUNT',
      ...(peerPubkey && { peerPubkey }),
    });
    return r.count;
  }

  async markAsRead(messageIds: string[]) {
    await sendBg({ type: 'POPUP_MARK_AS_READ', messageIds });
  }

  async sendComposingIndicator(recipientPubkeyOrNametag: string) {
    await sendBg({ type: 'POPUP_SEND_COMPOSING', recipient: recipientPubkeyOrNametag });
  }

  async deleteConversation(peerPubkey: string) {
    await sendBg({ type: 'POPUP_DELETE_CONVERSATION', peerPubkey });
  }

  async resolvePeerNametag(pubkey: string) {
    const r = await sendBg<{ success: boolean; nametag: string | undefined }>({
      type: 'POPUP_RESOLVE_PEER_NAMETAG',
      pubkey,
    });
    return r.nametag;
  }

  // ---------------------------------------------------------------------------
  // Payment Requests
  // ---------------------------------------------------------------------------

  async sendPaymentRequest(
    recipient: string,
    params: { amount: string; coinId: string; message?: string },
  ) {
    const r = await sendBg<{ success: boolean; result: unknown }>({
      type: 'POPUP_SEND_PAYMENT_REQUEST',
      recipient,
      ...params,
    });
    return r.result as Awaited<ReturnType<ISphereAdapter['sendPaymentRequest']>>;
  }

  async onPaymentRequest(handler: (request: import('@unicitylabs/sphere-sdk').IncomingPaymentRequest) => void) {
    // In extension mode, payment requests arrive via SDK_EVENT broadcasts
    const wrappedHandler = (data?: unknown) => {
      if (data) handler(data as import('@unicitylabs/sphere-sdk').IncomingPaymentRequest);
    };
    this.emitter.on('payment_request:incoming', wrappedHandler);
    return () => this.emitter.off('payment_request:incoming', wrappedHandler);
  }

  async sendPaymentRequestResponse(
    senderPubkey: string,
    response: { requestId: string; responseType: string },
  ) {
    await sendBg({
      type: 'POPUP_SEND_PAYMENT_REQUEST_RESPONSE',
      senderPubkey,
      requestId: response.requestId,
      responseType: response.responseType,
    });
  }

  // ---------------------------------------------------------------------------
  // Signing
  // ---------------------------------------------------------------------------

  async signMessage(message: string) {
    const r = await sendBg<{ success: boolean; signature: string }>({
      type: 'POPUP_SIGN_MESSAGE',
      message,
    });
    return r.signature;
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  async exportToJSON(options?: import('@unicitylabs/sphere-sdk').WalletJSONExportOptions) {
    const r = await sendBg<{ success: boolean; walletJson: string }>({
      type: 'POPUP_EXPORT_WALLET',
      ...(options && { options }),
    });
    return JSON.parse(r.walletJson) as Awaited<ReturnType<ISphereAdapter['exportToJSON']>>;
  }

  async getMnemonic() {
    const r = await sendBg<{ success: boolean; mnemonic: string | null }>({
      type: 'POPUP_GET_MNEMONIC',
    });
    return r.mnemonic;
  }

  // ---------------------------------------------------------------------------
  // Address Discovery
  // ---------------------------------------------------------------------------

  async discoverAddresses(options?: { autoTrack?: boolean; includeL1Scan?: boolean }) {
    const r = await sendBg<{ success: boolean; result: unknown }>({
      type: 'POPUP_DISCOVER_ADDRESSES',
      ...(options && { options }),
    });
    return r.result;
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  on(event: string, callback: EventCallback) {
    this.emitter.on(event, callback);
  }

  off(event: string, callback: EventCallback) {
    this.emitter.off(event, callback);
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  destroy() {
    if (this.messageListener) {
      chrome.runtime.onMessage.removeListener(this.messageListener);
      this.messageListener = null;
    }
    this.emitter.removeAllListeners();
  }
}
