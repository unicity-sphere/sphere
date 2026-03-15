/// <reference types="chrome" />

/**
 * WalletManager — SDK lifecycle in background service worker.
 *
 * Handles:
 * - Wallet creation/import with mnemonic + password encryption
 * - Unlock/lock operations
 * - All SDK queries (tokens, assets, balance, history, identity, L1, DMs)
 * - Event forwarding to popup via chrome.runtime.sendMessage
 *
 * Ported from sphere-extension/background/wallet-manager.ts, extended for
 * sphere's full feature set (group chat, market, IPFS, address discovery).
 */

import { Sphere, logger } from '@unicitylabs/sphere-sdk';
import type { Asset, Token, TransactionHistoryEntry } from '@unicitylabs/sphere-sdk';
import { createBrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';

// Expose SDK logger on globalThis for runtime debugging in service worker console
(globalThis as unknown as Record<string, unknown>).logger = logger;

type BrowserProviders = ReturnType<typeof createBrowserProviders>;

// Storage key for the encrypted mnemonic
const ENCRYPTED_MNEMONIC_KEY = 'encryptedMnemonic';

// Storage key for IPFS enabled state (mirrors web's sphere_ipfs_enabled)
const IPFS_ENABLED_KEY = 'sphere_ipfs_enabled';

// SDK events to forward to popup
const FORWARDED_EVENTS = [
  'transfer:incoming',
  'transfer:confirmed',
  'history:updated',
  'identity:changed',
  'nametag:registered',
  'nametag:recovered',
  'sync:completed',
  'sync:remote-update',
  'message:dm',
  'message:read',
  'composing:started',
  'payment_request:incoming',
] as const;

// ============ Mnemonic Encryption (SubtleCrypto) ============

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptMnemonic(mnemonic: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(mnemonic),
  );
  const packed = new Uint8Array(salt.length + iv.length + new Uint8Array(ciphertext).length);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(new Uint8Array(ciphertext), salt.length + iv.length);
  return Array.from(packed).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function decryptMnemonic(encrypted: string, password: string): Promise<string> {
  const packed = new Uint8Array(encrypted.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const salt = packed.slice(0, 16);
  const iv = packed.slice(16, 28);
  const ciphertext = packed.slice(28);
  const key = await deriveKey(password, salt);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(plaintext);
}

/**
 * WalletManager provides SDK lifecycle management in the background worker.
 */
export class WalletManager {
  private sphere: Sphere | null = null;
  private providers: BrowserProviders | null = null;
  private password: string | null = null;
  private eventUnsubscribers: (() => void)[] = [];

  // ============ State ============

  async getState(): Promise<{ hasWallet: boolean; isUnlocked: boolean; activeIdentityId: string | null }> {
    const result = await chrome.storage.local.get([ENCRYPTED_MNEMONIC_KEY]);
    return {
      hasWallet: !!result[ENCRYPTED_MNEMONIC_KEY],
      isUnlocked: this.sphere !== null,
      activeIdentityId: this.sphere?.identity?.l1Address ?? null,
    };
  }

  isUnlocked(): boolean {
    return this.sphere !== null;
  }

  getSphereInstance(): Sphere | null {
    return this.sphere;
  }

  private getSphere(): Sphere {
    if (!this.sphere) throw new Error('Wallet is locked');
    return this.sphere;
  }

  // ============ Wallet Lifecycle ============

  async createWallet(password: string): Promise<{ mnemonic: string; identity: Record<string, unknown> }> {
    const mnemonic = Sphere.generateMnemonic();
    const encrypted = await encryptMnemonic(mnemonic, password);
    await chrome.storage.local.set({ [ENCRYPTED_MNEMONIC_KEY]: encrypted });

    this.sphere = await this.createSphereFromMnemonic(mnemonic);
    this.password = password;
    this.setupEventForwarding();

    return { mnemonic, identity: this.getFullIdentity()! };
  }

  async importWallet(mnemonic: string, password: string): Promise<Record<string, unknown>> {
    if (!Sphere.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }
    const encrypted = await encryptMnemonic(mnemonic, password);
    await chrome.storage.local.set({ [ENCRYPTED_MNEMONIC_KEY]: encrypted });

    this.sphere = await this.createSphereFromMnemonic(mnemonic);
    this.password = password;
    this.setupEventForwarding();

    return this.getFullIdentity()!;
  }

  async unlock(password: string): Promise<Record<string, unknown>> {
    const result = await chrome.storage.local.get([ENCRYPTED_MNEMONIC_KEY]);
    if (!result[ENCRYPTED_MNEMONIC_KEY]) throw new Error('No wallet found');

    const mnemonic = await decryptMnemonic(result[ENCRYPTED_MNEMONIC_KEY], password);
    this.sphere = await this.createSphereFromMnemonic(mnemonic);
    this.password = password;
    this.setupEventForwarding();

    console.log('[WalletManager] Wallet unlocked. Address:', this.sphere.identity?.l1Address);
    return this.getFullIdentity()!;
  }

  async lock(): Promise<void> {
    this.cleanupEventForwarding();
    if (this.sphere) {
      try { await this.sphere.destroy(); } catch (err) {
        console.error('[WalletManager] Error destroying sphere:', err);
      }
    }
    this.sphere = null;
    this.providers = null;
    this.password = null;
  }

  async resetWallet(): Promise<void> {
    this.cleanupEventForwarding();
    if (this.sphere) {
      try { await this.sphere.destroy(); } catch (err) {
        console.error('[WalletManager] Error destroying sphere during reset:', err);
      }
    }
    this.sphere = null;
    this.password = null;

    await chrome.storage.local.remove([ENCRYPTED_MNEMONIC_KEY, 'nametag']);

    if (this.providers) {
      try {
        await Promise.allSettled([
          this.providers.storage.disconnect(),
          this.providers.tokenStorage.disconnect(),
        ]);
        const clearDone = Sphere.clear({
          storage: this.providers.storage,
          tokenStorage: this.providers.tokenStorage,
        });
        await Promise.race([clearDone, new Promise(r => setTimeout(r, 5000))]);
      } catch (e) {
        console.warn('[WalletManager] Sphere.clear() failed:', e);
      }
      this.providers = null;
    }

    // Safety net: delete all IndexedDB databases
    try {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name) indexedDB.deleteDatabase(db.name);
      }
    } catch (e) {
      console.warn('[WalletManager] Could not clear IndexedDB:', e);
    }

    console.log('[WalletManager] Wallet reset complete');
  }

  // ============ Identity ============

  getFullIdentity(): Record<string, unknown> | null {
    const sphere = this.getSphere();
    const identity = sphere.identity;
    if (!identity) return null;
    return {
      chainPubkey: identity.chainPubkey,
      l1Address: identity.l1Address,
      directAddress: identity.directAddress,
      nametag: identity.nametag,
    };
  }

  // ============ Tokens & Balance ============

  getTokens(): Token[] {
    try {
      return this.getSphere().payments.getTokens();
    } catch { return []; }
  }

  async getAssets(coinId?: string): Promise<Asset[]> {
    try {
      return await this.getSphere().payments.getAssets(coinId);
    } catch { return []; }
  }

  getTransactionHistory(): TransactionHistoryEntry[] {
    try {
      return this.getSphere().payments.getHistory();
    } catch { return []; }
  }

  // ============ Send ============

  async sendTokens(params: {
    recipient: string;
    coinId: string;
    amount: string;
    memo?: string;
  }): Promise<{ id: string; tokens?: unknown[] }> {
    const sphere = this.getSphere();
    return sphere.payments.send(params);
  }

  // ============ L1 Payments ============

  async getL1Balance(): Promise<{ confirmed: string; unconfirmed: string; total: string; vested: string; unvested: string }> {
    const sphere = this.getSphere();
    if (!sphere.payments.l1) return { confirmed: '0', unconfirmed: '0', total: '0', vested: '0', unvested: '0' };
    try {
      return await sphere.payments.l1.getBalance();
    } catch { return { confirmed: '0', unconfirmed: '0', total: '0', vested: '0', unvested: '0' }; }
  }

  async sendL1(params: { to: string; amount: string; useVested?: boolean; feeRate?: number }): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const sphere = this.getSphere();
    if (!sphere.payments.l1) throw new Error('L1 payments not available');
    return sphere.payments.l1.send(params);
  }

  async getL1Transactions(limit?: number): Promise<unknown[]> {
    const sphere = this.getSphere();
    if (!sphere.payments.l1) return [];
    try {
      return await sphere.payments.l1.getHistory(limit ? { limit } : undefined);
    } catch { return []; }
  }

  async getL1Utxos(): Promise<unknown[]> {
    const sphere = this.getSphere();
    if (!sphere.payments.l1) return [];
    try {
      return await sphere.payments.l1.getUtxos();
    } catch { return []; }
  }

  async estimateL1Fee(params: { to: string; amount: string; feeRate?: number; useVested?: boolean }): Promise<unknown> {
    const sphere = this.getSphere();
    if (!sphere.payments.l1) throw new Error('L1 payments not available');
    return sphere.payments.l1.estimateFee(params);
  }

  // ============ Communications ============

  async sendDM(recipient: string, content: string): Promise<{ id: string; timestamp: number }> {
    const sphere = this.getSphere();
    return sphere.communications.sendDM(recipient, content);
  }

  async sendPaymentRequest(
    recipient: string,
    options: { amount: string; coinId: string; message?: string },
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    const sphere = this.getSphere();
    return sphere.payments.sendPaymentRequest(recipient, options);
  }

  // ============ Nametag ============

  async registerNametag(nametag: string): Promise<unknown> {
    const sphere = this.getSphere();
    return sphere.registerNametag(nametag);
  }

  async resolve(identifier: string): Promise<unknown> {
    const sphere = this.getSphere();
    return sphere.resolve(identifier);
  }

  async isNametagAvailable(nametag: string): Promise<boolean> {
    if (this.sphere) {
      return this.sphere.isNametagAvailable(nametag);
    }
    // Wallet locked — use standalone transport
    return this.isNametagAvailableStandalone(nametag);
  }

  private async isNametagAvailableStandalone(nametag: string): Promise<boolean> {
    let tempProviders: BrowserProviders | null = null;
    try {
      tempProviders = createBrowserProviders({ network: 'testnet' });
      const transport = tempProviders.transport;
      await transport.connect();
      await transport.setIdentity({
        privateKey: '0000000000000000000000000000000000000000000000000000000000000001',
        chainPubkey: '000000000000000000000000000000000000000000000000000000000000000000',
        l1Address: '',
      });
      const resolved = await transport.resolveNametag?.(nametag);
      return !resolved;
    } catch { return false; }
    finally {
      try { await tempProviders?.transport?.disconnect?.(); } catch { /* ignore */ }
    }
  }

  async resolveNametag(nametag: string): Promise<unknown> {
    if (this.sphere) {
      const transport = this.sphere.getTransport();
      if (transport.resolveNametag) {
        return transport.resolveNametag(nametag);
      }
    }
    // Wallet locked — use standalone transport for nametag lookup
    return this.resolveNametagStandalone(nametag);
  }

  private async resolveNametagStandalone(nametag: string): Promise<unknown> {
    let tempProviders: BrowserProviders | null = null;
    try {
      tempProviders = createBrowserProviders({ network: 'testnet' });
      const transport = tempProviders.transport;
      await transport.connect();
      await transport.setIdentity({
        privateKey: '0000000000000000000000000000000000000000000000000000000000000001',
        chainPubkey: '000000000000000000000000000000000000000000000000000000000000000000',
        l1Address: '',
      });
      const resolved = await transport.resolveNametagInfo?.(nametag);
      return resolved ?? null;
    } catch { return null; }
    finally {
      try { await tempProviders?.transport?.disconnect?.(); } catch { /* ignore */ }
    }
  }

  // ============ Export ============

  exportWallet(): string {
    const sphere = this.getSphere();
    const walletJson = sphere.exportToJSON({
      password: this.password ?? undefined,
      includeMnemonic: true,
    });
    return JSON.stringify(walletJson, null, 2);
  }

  getMnemonic(): string | null {
    return this.getSphere().getMnemonic();
  }

  // ============ Address Discovery ============

  async discoverAddresses(): Promise<unknown> {
    const sphere = this.getSphere();
    return sphere.discoverAddresses({ autoTrack: true, includeL1Scan: false });
  }

  // ============ Message Signing ============

  signMessage(message: string): string {
    const sphere = this.getSphere();
    return sphere.signMessage(message);
  }

  // ============ Finalization ============

  async finalizeTokens(): Promise<{ resolved: number; pending: number; failed: number }> {
    const sphere = this.getSphere();
    try {
      const result = await sphere.payments.receive({
        finalize: true,
        timeout: 60_000,
        pollInterval: 2_000,
      });
      const fin = result.finalization ?? { resolved: 0, stillPending: 0, failed: 0 };
      return { resolved: fin.resolved, pending: fin.stillPending, failed: fin.failed };
    } catch (error) {
      console.error('[WalletManager] Finalization error:', error);
      return { resolved: 0, pending: 0, failed: 0 };
    }
  }

  // ============ Address Management ============

  getActiveAddresses() {
    return this.getSphere().getActiveAddresses();
  }

  getAllTrackedAddresses() {
    return this.getSphere().getAllTrackedAddresses();
  }

  getCurrentAddressIndex() {
    return this.getSphere().getCurrentAddressIndex();
  }

  async switchToAddress(index: number, options?: { nametag?: string }) {
    return this.getSphere().switchToAddress(index, options);
  }

  deriveAddress(index: number) {
    return this.getSphere().deriveAddress(index);
  }

  async setAddressHidden(index: number, hidden: boolean) {
    return this.getSphere().setAddressHidden(index, hidden);
  }

  getWalletInfo() {
    return this.getSphere().getWalletInfo();
  }

  // ============ Payments (Extended) ============

  getPaymentsBalance() {
    return this.getSphere().payments.getBalance();
  }

  async getFiatBalance() {
    return this.getSphere().payments.getFiatBalance();
  }

  async syncPayments() {
    return this.getSphere().payments.sync();
  }

  // ============ L1 (Extended) ============

  async l1ResolveAddress(destination: string) {
    const l1 = this.getSphere().payments.l1;
    if (!l1) throw new Error('L1 payments not available');
    return l1.resolveL1Address(destination);
  }

  // ============ Communications (Extended) ============

  getConversations() {
    return this.getSphere().communications.getConversations();
  }

  getConversation(peerPubkey: string) {
    return this.getSphere().communications.getConversation(peerPubkey);
  }

  getConversationPage(peerPubkey: string, options?: { limit?: number; before?: number }) {
    return this.getSphere().communications.getConversationPage(peerPubkey, options);
  }

  getUnreadCount(peerPubkey?: string) {
    return this.getSphere().communications.getUnreadCount(peerPubkey);
  }

  async markAsRead(messageIds: string[]) {
    return this.getSphere().communications.markAsRead(messageIds);
  }

  async sendComposingIndicator(recipientPubkeyOrNametag: string) {
    return this.getSphere().communications.sendComposingIndicator(recipientPubkeyOrNametag);
  }

  async deleteConversation(peerPubkey: string) {
    return this.getSphere().communications.deleteConversation(peerPubkey);
  }

  async resolvePeerNametag(pubkey: string) {
    return this.getSphere().communications.resolvePeerNametag(pubkey);
  }

  async sendPaymentRequestResponse(
    senderPubkey: string,
    response: { requestId: string; responseType: string },
  ) {
    const transport = this.getSphere().getTransport();
    if (!transport.sendPaymentRequestResponse) {
      throw new Error('Payment request responses not supported');
    }
    await transport.sendPaymentRequestResponse(
      senderPubkey,
      response as { requestId: string; responseType: 'accepted' | 'rejected' | 'paid' },
    );
  }

  // ============ Group Chat ============

  private getGroupChat() {
    const sphere = this.getSphere();
    if (!sphere.groupChat) throw new Error('Group chat not available');
    return sphere.groupChat;
  }

  async gcConnect() { return this.getGroupChat().connect(); }
  async gcLoad() { return this.getGroupChat().load(); }
  gcGetConnectionStatus() { return this.getGroupChat().getConnectionStatus(); }
  gcGetGroups() { return this.getGroupChat().getGroups(); }
  gcGetGroup(groupId: string) { return this.getGroupChat().getGroup(groupId); }
  async gcFetchAvailableGroups() { return this.getGroupChat().fetchAvailableGroups(); }
  async gcJoinGroup(groupId: string, inviteCode?: string) { return this.getGroupChat().joinGroup(groupId, inviteCode); }
  async gcLeaveGroup(groupId: string) { return this.getGroupChat().leaveGroup(groupId); }
  async gcCreateGroup(options: unknown) {
    return this.getGroupChat().createGroup(
      options as Parameters<ReturnType<typeof this.getGroupChat>['createGroup']>[0],
    );
  }
  async gcDeleteGroup(groupId: string) { return this.getGroupChat().deleteGroup(groupId); }
  async gcCreateInvite(groupId: string) { return this.getGroupChat().createInvite(groupId); }
  async gcSendMessage(groupId: string, content: string, replyToId?: string) {
    return this.getGroupChat().sendMessage(groupId, content, replyToId);
  }
  gcGetMessages(groupId: string) { return this.getGroupChat().getMessages(groupId); }

  gcGetMessagesPage(groupId: string, options?: { limit?: number; until?: number }) {
    // getMessagesPage not yet in published SDK — emulate with getMessages + slice
    const all = this.getGroupChat().getMessages(groupId);
    let filtered = options?.until
      ? all.filter((m: { timestamp: number }) => m.timestamp < options.until!)
      : all;
    filtered = [...filtered].sort((a: { timestamp: number }, b: { timestamp: number }) => b.timestamp - a.timestamp);
    const limit = options?.limit ?? 20;
    const sliced = filtered.slice(0, limit);
    return { messages: sliced.reverse(), hasMore: filtered.length > limit };
  }

  async gcFetchMessages(groupId: string, since?: number, limit?: number) {
    return this.getGroupChat().fetchMessages(groupId, since, limit);
  }
  async gcDeleteMessage(groupId: string, messageId: string) {
    return this.getGroupChat().deleteMessage(groupId, messageId);
  }
  gcGetMembers(groupId: string) { return this.getGroupChat().getMembers(groupId); }
  gcGetMember(groupId: string, pubkey: string) { return this.getGroupChat().getMember(groupId, pubkey); }
  async gcKickUser(groupId: string, userPubkey: string, reason?: string) {
    return this.getGroupChat().kickUser(groupId, userPubkey, reason);
  }
  gcGetTotalUnreadCount() { return this.getGroupChat().getTotalUnreadCount(); }
  gcMarkGroupAsRead(groupId: string) { return this.getGroupChat().markGroupAsRead(groupId); }
  gcIsCurrentUserAdmin(groupId: string) { return this.getGroupChat().isCurrentUserAdmin(groupId); }
  gcIsCurrentUserModerator(groupId: string) { return this.getGroupChat().isCurrentUserModerator(groupId); }
  async gcIsCurrentUserRelayAdmin() { return this.getGroupChat().isCurrentUserRelayAdmin(); }
  gcCanWriteToGroup(groupId: string) { return this.getGroupChat().canWriteToGroup(groupId); }
  async gcCanModerateGroup(groupId: string) { return this.getGroupChat().canModerateGroup(groupId); }
  gcGetCurrentUserRole(groupId: string) { return this.getGroupChat().getCurrentUserRole(groupId); }
  gcGetMyPublicKey() { return this.getGroupChat().getMyPublicKey(); }
  gcGetRelayUrls() { return this.getGroupChat().getRelayUrls(); }

  // ============ Generic Proxy Call ============

  /**
   * Execute an arbitrary method/property access on the live Sphere instance.
   * Used by SPHERE_PROXY_CALL from the ES Proxy in the popup.
   *
   * @param path - property path, e.g. ['payments', 'getTokens'] or ['identity']
   * @param args - arguments for the final method call (empty for property reads)
   */
  async proxyCall(path: string[], args: unknown[]): Promise<unknown> {
    const sphere = this.getSphere();
    let parent: unknown = null;
    let current: unknown = sphere;

    for (let i = 0; i < path.length; i++) {
      parent = current;
      current = (current as Record<string, unknown>)[path[i]];

      if (current === null || current === undefined) {
        // Reached a null/undefined property (e.g. payments.l1 when L1 is disabled)
        if (i < path.length - 1) return undefined;
        return current;
      }

      // Intermediate function: call it to get the next value (e.g. getTransport())
      if (typeof current === 'function' && i < path.length - 1) {
        current = (current as (...a: unknown[]) => unknown).call(parent);
        if (current && typeof (current as Promise<unknown>).then === 'function') {
          current = await current;
        }
        parent = current;
      }
    }

    // Final element: call if function, return if property
    if (typeof current === 'function') {
      const result = (current as (...a: unknown[]) => unknown).call(parent, ...args);
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        return await result;
      }
      return result;
    }
    return current;
  }

  // ============ Internal ============

  private _ipfsEnabled = true;

  async loadIpfsPreference(): Promise<void> {
    const result = await chrome.storage.local.get([IPFS_ENABLED_KEY]);
    this._ipfsEnabled = result[IPFS_ENABLED_KEY] !== 'false'; // enabled by default
  }

  getIpfsEnabledState(): boolean {
    return this._ipfsEnabled;
  }

  async setIpfsEnabled(enabled: boolean): Promise<void> {
    this._ipfsEnabled = enabled;
    await chrome.storage.local.set({ [IPFS_ENABLED_KEY]: String(enabled) });
  }

  private async createSphereFromMnemonic(mnemonic: string): Promise<Sphere> {
    await this.loadIpfsPreference();

    const ipfsConfig = this._ipfsEnabled
      ? { tokenSync: { ipfs: { enabled: true } } }
      : {};

    const browserProviders = createBrowserProviders({
      network: 'testnet',
      groupChat: true,
      market: true,
      ...ipfsConfig,
    });
    this.providers = browserProviders;

    const { sphere } = await Sphere.init({
      ...browserProviders,
      mnemonic,
      l1: {},
      discoverAddresses: false,
    });

    // Add IPFS storage provider and trigger initial sync
    if (browserProviders.ipfsTokenStorage) {
      sphere.addTokenStorageProvider(browserProviders.ipfsTokenStorage)
        .then(() => sphere.sync())
        .catch(err => logger.warn('WalletManager', 'IPFS sync failed', err));
    }

    return sphere;
  }

  private setupEventForwarding(): void {
    if (!this.sphere) return;

    for (const event of FORWARDED_EVENTS) {
      const unsub = this.sphere.on(event, (data: unknown) => {
        chrome.runtime.sendMessage({ type: 'SDK_EVENT', event, data }).catch(() => {});

        // Auto-finalize on incoming transfer
        if (event === 'transfer:incoming') {
          this.finalizeTokens().catch((err) => {
            console.error('[WalletManager] Background finalization failed:', err);
          });
        }
      });
      this.eventUnsubscribers.push(unsub);
    }

    console.log('[WalletManager] Event forwarding configured');
  }

  private cleanupEventForwarding(): void {
    for (const unsub of this.eventUnsubscribers) {
      try { unsub(); } catch { /* ignore */ }
    }
    this.eventUnsubscribers = [];
  }
}

// Singleton instance
export const walletManager = new WalletManager();
