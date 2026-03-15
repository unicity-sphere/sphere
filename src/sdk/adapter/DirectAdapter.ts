/**
 * DirectAdapter — ISphereAdapter implementation for web mode.
 *
 * Wraps a real Sphere instance. Sync SDK methods are wrapped in
 * Promise.resolve() to satisfy the async interface contract.
 */

import type { Sphere } from '@unicitylabs/sphere-sdk';
import type { ISphereAdapter } from './types';
import type { EventCallback } from './events';
import { AdapterEventEmitter } from './events';

/** SDK events forwarded to the local emitter */
const FORWARDED_EVENTS = [
  'transfer:incoming',
  'transfer:confirmed',
  'transfer:failed',
  'history:updated',
  'identity:changed',
  'nametag:registered',
  'nametag:recovered',
  'address:activated',
  'address:hidden',
  'address:unhidden',
  'sync:started',
  'sync:completed',
  'sync:provider',
  'sync:error',
  'sync:remote-update',
  'connection:changed',
  'message:dm',
  'message:read',
  'message:typing',
  'composing:started',
  'payment_request:incoming',
  'payment_request:accepted',
  'payment_request:rejected',
  'payment_request:paid',
  'payment_request:response',
  'groupchat:message',
  'groupchat:joined',
  'groupchat:left',
  'groupchat:kicked',
  'groupchat:group_deleted',
  'groupchat:updated',
  'groupchat:connection',
  'groupchat:ready',
  'communications:ready',
] as const;

export class DirectAdapter implements ISphereAdapter {
  private sphere: Sphere;
  private emitter = new AdapterEventEmitter();
  private unsubscribers: Array<() => void> = [];

  constructor(sphere: Sphere) {
    this.sphere = sphere;

    // Forward all SDK events to local emitter
    for (const event of FORWARDED_EVENTS) {
      const unsub = sphere.on(event, (data: unknown) => this.emitter.emit(event, data));
      this.unsubscribers.push(unsub);
    }
  }

  // ---------------------------------------------------------------------------
  // Identity
  // ---------------------------------------------------------------------------

  get identity() {
    return this.sphere.identity;
  }

  async getActiveAddresses() {
    return this.sphere.getActiveAddresses();
  }

  async getAllTrackedAddresses() {
    return this.sphere.getAllTrackedAddresses();
  }

  async getCurrentAddressIndex() {
    return this.sphere.getCurrentAddressIndex();
  }

  async switchToAddress(index: number, options?: { nametag?: string }) {
    return this.sphere.switchToAddress(index, options);
  }

  async deriveAddress(index: number) {
    return this.sphere.deriveAddress(index);
  }

  async setAddressHidden(index: number, hidden: boolean) {
    return this.sphere.setAddressHidden(index, hidden);
  }

  async getWalletInfo() {
    return this.sphere.getWalletInfo();
  }

  // ---------------------------------------------------------------------------
  // Nametag
  // ---------------------------------------------------------------------------

  async isNametagAvailable(nametag: string) {
    return this.sphere.isNametagAvailable(nametag);
  }

  async registerNametag(nametag: string) {
    return this.sphere.registerNametag(nametag);
  }

  // ---------------------------------------------------------------------------
  // Peer Resolution
  // ---------------------------------------------------------------------------

  async resolve(identifier: string) {
    return this.sphere.resolve(identifier);
  }

  // ---------------------------------------------------------------------------
  // Payments (L3)
  // ---------------------------------------------------------------------------

  async getTokens(filter?: { coinId?: string; status?: import('@unicitylabs/sphere-sdk').TokenStatus }) {
    return this.sphere.payments.getTokens(filter);
  }

  async getAssets(coinId?: string) {
    return this.sphere.payments.getAssets(coinId);
  }

  async getBalance() {
    return this.sphere.payments.getBalance();
  }

  async getFiatBalance() {
    return this.sphere.payments.getFiatBalance();
  }

  async send(request: import('@unicitylabs/sphere-sdk').TransferRequest) {
    return this.sphere.payments.send(request);
  }

  async getTransactionHistory() {
    return this.sphere.payments.getHistory();
  }

  async sync() {
    return this.sphere.payments.sync();
  }

  // ---------------------------------------------------------------------------
  // L1 (ALPHA blockchain)
  // ---------------------------------------------------------------------------

  async l1GetBalance() {
    return this.sphere.payments.l1!.getBalance();
  }

  async l1GetUtxos() {
    return this.sphere.payments.l1!.getUtxos();
  }

  async l1Send(request: import('@unicitylabs/sphere-sdk').L1SendRequest) {
    return this.sphere.payments.l1!.send(request);
  }

  async l1EstimateFee(to: string, amount: string) {
    return this.sphere.payments.l1!.estimateFee(to, amount);
  }

  async l1GetTransactions(limit?: number) {
    return this.sphere.payments.l1!.getHistory(limit);
  }

  async l1ResolveAddress(destination: string) {
    return this.sphere.payments.l1!.resolveL1Address(destination);
  }

  // ---------------------------------------------------------------------------
  // Communications (DMs)
  // ---------------------------------------------------------------------------

  async sendDM(recipient: string, content: string) {
    return this.sphere.communications.sendDM(recipient, content);
  }

  async getConversations() {
    return this.sphere.communications.getConversations();
  }

  async getConversation(peerPubkey: string) {
    return this.sphere.communications.getConversation(peerPubkey);
  }

  async getConversationPage(
    peerPubkey: string,
    options?: import('@unicitylabs/sphere-sdk').GetConversationPageOptions,
  ) {
    return this.sphere.communications.getConversationPage(peerPubkey, options);
  }

  async getUnreadCount(peerPubkey?: string) {
    return this.sphere.communications.getUnreadCount(peerPubkey);
  }

  async markAsRead(messageIds: string[]) {
    return this.sphere.communications.markAsRead(messageIds);
  }

  async sendComposingIndicator(recipientPubkeyOrNametag: string) {
    return this.sphere.communications.sendComposingIndicator(recipientPubkeyOrNametag);
  }

  async deleteConversation(peerPubkey: string) {
    return this.sphere.communications.deleteConversation(peerPubkey);
  }

  async resolvePeerNametag(pubkey: string) {
    return this.sphere.communications.resolvePeerNametag(pubkey);
  }

  // ---------------------------------------------------------------------------
  // Payment Requests
  // ---------------------------------------------------------------------------

  async sendPaymentRequest(
    recipient: string,
    params: { amount: string; coinId: string; message?: string },
  ) {
    return this.sphere.payments.sendPaymentRequest(recipient, params);
  }

  async onPaymentRequest(handler: (request: import('@unicitylabs/sphere-sdk').IncomingPaymentRequest) => void) {
    const transport = this.sphere.getTransport();
    if (!transport.onPaymentRequest) {
      return () => {};
    }
    // Transport handler type differs slightly from the exported SDK type;
    // cast to bridge the two compatible shapes.
    return transport.onPaymentRequest(handler as (req: unknown) => void);
  }

  async sendPaymentRequestResponse(
    senderPubkey: string,
    response: { requestId: string; responseType: import('@unicitylabs/sphere-sdk').PaymentRequestResponseType },
  ): Promise<void> {
    const transport = this.sphere.getTransport();
    if (!transport.sendPaymentRequestResponse) {
      throw new Error('Payment request responses not supported');
    }
    await transport.sendPaymentRequestResponse(senderPubkey, response);
  }

  // ---------------------------------------------------------------------------
  // Signing
  // ---------------------------------------------------------------------------

  async signMessage(message: string) {
    return this.sphere.signMessage(message);
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  async exportToJSON(options?: import('@unicitylabs/sphere-sdk').WalletJSONExportOptions) {
    return this.sphere.exportToJSON(options);
  }

  async getMnemonic() {
    return this.sphere.getMnemonic();
  }

  // ---------------------------------------------------------------------------
  // Address Discovery
  // ---------------------------------------------------------------------------

  async discoverAddresses(options?: { autoTrack?: boolean; includeL1Scan?: boolean }) {
    return this.sphere.discoverAddresses(options);
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
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.emitter.removeAllListeners();
  }
}
