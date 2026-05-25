/**
 * Sphere Connect Protocol
 * JSON-RPC-like message types for wallet ↔ dApp communication.
 */
declare const SPHERE_CONNECT_NAMESPACE = "sphere-connect";
declare const SPHERE_CONNECT_VERSION = "1.0";

interface SphereMessageBase {
    readonly ns: typeof SPHERE_CONNECT_NAMESPACE;
    readonly v: typeof SPHERE_CONNECT_VERSION;
}
/** Query request: dApp → Wallet */
interface SphereRpcRequest extends SphereMessageBase {
    readonly type: 'request';
    readonly id: string;
    readonly method: string;
    readonly params?: Record<string, unknown>;
}
/** Query response: Wallet → dApp */
interface SphereRpcResponse extends SphereMessageBase {
    readonly type: 'response';
    readonly id: string;
    readonly result?: unknown;
    readonly error?: SphereRpcError;
}
/** Intent request: dApp → Wallet (opens wallet UI) */
interface SphereIntentRequest extends SphereMessageBase {
    readonly type: 'intent';
    readonly id: string;
    readonly action: string;
    readonly params: Record<string, unknown>;
}
/** Intent result: Wallet → dApp (after user action) */
interface SphereIntentResult extends SphereMessageBase {
    readonly type: 'intent_result';
    readonly id: string;
    readonly result?: unknown;
    readonly error?: SphereRpcError;
}
/** Event push: Wallet → dApp (unsolicited) */
interface SphereEventMessage extends SphereMessageBase {
    readonly type: 'event';
    readonly event: string;
    readonly data: unknown;
}
/** Handshake: bidirectional */
interface SphereHandshake extends SphereMessageBase {
    readonly type: 'handshake';
    readonly direction: 'request' | 'response';
    readonly permissions: string[];
    readonly dapp?: DAppMetadata;
    readonly sessionId?: string;
    readonly identity?: PublicIdentity;
    /** If true, wallet must NOT open any approval UI. Immediately reject if origin is not already approved. */
    readonly silent?: boolean;
}
interface SphereRpcError {
    readonly code: number;
    readonly message: string;
    readonly data?: unknown;
}
type SphereConnectMessage = SphereRpcRequest | SphereRpcResponse | SphereIntentRequest | SphereIntentResult | SphereEventMessage | SphereHandshake;
interface DAppMetadata {
    readonly name: string;
    readonly description?: string;
    readonly icon?: string;
    readonly url: string;
}
interface PublicIdentity {
    readonly chainPubkey: string;
    readonly l1Address: string;
    readonly directAddress?: string;
    readonly nametag?: string;
}

/**
 * Sphere Connect Permission System
 * Defines scopes, maps methods/intents to required permissions.
 */
declare const PERMISSION_SCOPES: {
    readonly IDENTITY_READ: "identity:read";
    readonly BALANCE_READ: "balance:read";
    readonly TOKENS_READ: "tokens:read";
    readonly HISTORY_READ: "history:read";
    readonly L1_READ: "l1:read";
    readonly EVENTS_SUBSCRIBE: "events:subscribe";
    readonly RESOLVE_PEER: "resolve:peer";
    readonly TRANSFER_REQUEST: "transfer:request";
    readonly L1_TRANSFER: "l1:transfer";
    readonly DM_REQUEST: "dm:request";
    readonly DM_READ: "dm:read";
    readonly DM_MANAGE: "dm:manage";
    readonly PAYMENT_REQUEST: "payment:request";
    readonly SIGN_REQUEST: "sign:request";
    readonly INVOICE_READ: "invoice:read";
    readonly INVOICE_WRITE: "invoice:write";
};
type PermissionScope = (typeof PERMISSION_SCOPES)[keyof typeof PERMISSION_SCOPES];

/**
 * Sphere Connect Types
 * Session, configuration, and callback types.
 */

interface ConnectTransport {
    /** Send a message to the other side */
    send(message: SphereConnectMessage): void;
    /** Subscribe to incoming messages. Returns unsubscribe function. */
    onMessage(handler: (message: SphereConnectMessage) => void): () => void;
    /** Clean up transport resources */
    destroy(): void;
}
interface ConnectClientConfig {
    /** Transport layer for communication */
    transport: ConnectTransport;
    /** dApp metadata sent during handshake */
    dapp: DAppMetadata;
    /** Permissions to request. Defaults to all. */
    permissions?: PermissionScope[];
    /** Timeout for query requests in ms. Default: 30000. */
    timeout?: number;
    /** Timeout for intent requests in ms (user interaction). Default: 120000. */
    intentTimeout?: number;
    /** Existing session ID to resume. If the host still has an active session
     *  with this ID, the connection is restored without re-showing the approval UI. */
    resumeSessionId?: string;
    /** If true, the connection will silently fail if the origin is not already approved by the wallet.
     *  No approval UI will be shown. Used for auto-connect on page load. */
    silent?: boolean;
}
interface ConnectResult {
    readonly sessionId: string;
    readonly permissions: PermissionScope[];
    readonly identity: PublicIdentity;
}
type ConnectEventHandler = (data: unknown) => void;

/**
 * ConnectClient — dApp side of Sphere Connect.
 *
 * Lightweight client that communicates with a wallet's ConnectHost
 * through a ConnectTransport. Provides query and intent methods
 * that mirror the Sphere SDK API.
 *
 * Zero dependencies on the Sphere SDK core.
 */

declare class ConnectClient {
    private readonly transport;
    private readonly dapp;
    private readonly requestedPermissions;
    private readonly timeout;
    private readonly intentTimeout;
    private readonly resumeSessionId;
    private readonly silent;
    private sessionId;
    private grantedPermissions;
    private identity;
    private connected;
    private pendingRequests;
    private eventHandlers;
    private unsubscribeTransport;
    private handshakeResolver;
    constructor(config: ConnectClientConfig);
    /** Connect to the wallet. Returns session info and public identity. */
    connect(): Promise<ConnectResult>;
    /** Disconnect from the wallet */
    disconnect(): Promise<void>;
    /** Whether currently connected */
    get isConnected(): boolean;
    /** Granted permission scopes */
    get permissions(): readonly PermissionScope[];
    /** Current session ID */
    get session(): string | null;
    /** Public identity received during handshake */
    get walletIdentity(): PublicIdentity | null;
    /** Send a query request and return the result */
    query<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T>;
    /** Send an intent request. The wallet will open its UI for user confirmation. */
    intent<T = unknown>(action: string, params: Record<string, unknown>): Promise<T>;
    /** Subscribe to a wallet event. Returns unsubscribe function. */
    on(event: string, handler: ConnectEventHandler): () => void;
    private handleMessage;
    private handleHandshakeResponse;
    private handlePendingResponse;
    private cleanup;
}

/**
 * PostMessageTransport — Browser transport for Sphere Connect.
 *
 * Two modes:
 * - iframe: wallet (parent) ↔ dApp (iframe child)
 * - popup:  dApp (opener) ↔ wallet (popup window)
 */

interface PostMessageHostOptions {
    /** Allowed origins for incoming messages. Use ['*'] only in development. */
    allowedOrigins: string[];
}
interface PostMessageClientOptions {
    /** Target window to send messages to. Defaults to window.parent (iframe mode). */
    target?: Window;
    /** Target origin for postMessage. Default: '*'. Should be set to wallet origin. */
    targetOrigin?: string;
}
declare class PostMessageTransport implements ConnectTransport {
    private readonly targetWindow;
    private readonly targetOrigin;
    private readonly allowedOrigins;
    private handlers;
    private listener;
    private popupCheckInterval;
    private onPopupClosed;
    private constructor();
    /**
     * Create transport for the HOST side (wallet).
     *
     * iframe mode: target = iframe.contentWindow
     * popup mode:  target = window.opener
     */
    static forHost(target: HTMLIFrameElement | Window, options: PostMessageHostOptions): PostMessageTransport;
    /**
     * Create transport for the CLIENT side (dApp).
     *
     * iframe mode: target defaults to window.parent
     * popup mode:  target = popup window (from window.open())
     */
    static forClient(options?: PostMessageClientOptions): PostMessageTransport;
    send(message: SphereConnectMessage): void;
    onMessage(handler: (message: SphereConnectMessage) => void): () => void;
    destroy(): void;
    /** Register a callback for when the popup window closes */
    onClose(callback: () => void): void;
    private startPopupCloseDetection;
}

/**
 * ExtensionTransport — Chrome Extension transport for Sphere Connect.
 *
 * Two modes:
 * - forClient(): dApp page sends messages via window.postMessage with namespace
 *   'sphere-connect-ext:tohost'. Content script relays to background via
 *   chrome.runtime.sendMessage. Responses arrive via 'sphere-connect-ext:toclient'.
 *
 * - forHost(): Extension background listens via chrome.runtime.onMessage for
 *   'sphere-connect-ext:tohost' messages and sends responses back via
 *   chrome.tabs.sendMessage to the originating tab.
 */

declare const EXT_MSG_TO_HOST = "sphere-connect-ext:tohost";
declare const EXT_MSG_TO_CLIENT = "sphere-connect-ext:toclient";
/** Shape of the wrapper sent via postMessage / chrome.runtime.sendMessage */
interface ExtensionConnectEnvelope {
    type: typeof EXT_MSG_TO_HOST | typeof EXT_MSG_TO_CLIENT;
    payload: SphereConnectMessage;
}
declare function isExtensionConnectEnvelope(data: unknown): data is ExtensionConnectEnvelope;
/**
 * Chrome extension API subset used by ExtensionHostTransport.
 * Allows injecting a mock in tests without depending on chrome globals.
 */
interface ChromeMessagingApi {
    onMessage: {
        addListener(listener: (message: unknown, sender: any, sendResponse: (r?: unknown) => void) => void): void;
        removeListener(listener: (message: unknown, sender: any, sendResponse: (r?: unknown) => void) => void): void;
    };
    tabs: {
        sendMessage(tabId: number, message: unknown): void;
    };
}
declare const ExtensionTransport: {
    /**
     * Create transport for the CLIENT side (dApp page / inject script).
     * Sends via window.postMessage; receives via window.postMessage from content script.
     */
    forClient(): ConnectTransport;
    /**
     * Create transport for the HOST side (extension background service worker).
     * Receives via chrome.runtime.onMessage; sends via chrome.tabs.sendMessage.
     *
     * @param chromeApi - Pass `chrome` from the extension background context,
     *   or a mock for unit tests.
     */
    forHost(chromeApi: ChromeMessagingApi): ConnectTransport;
};

/**
 * autoConnect — Universal dApp connection to Sphere wallet.
 *
 * Auto-detects the best available transport and connects:
 *   P1: iframe   → PostMessageTransport to parent window
 *   P2: extension → ExtensionTransport via chrome extension
 *   P3: standalone → PostMessageTransport to popup window
 *
 * Usage:
 *   import { autoConnect } from '@unicitylabs/sphere-sdk/connect/browser';
 *
 *   const client = await autoConnect({
 *     dapp: { name: 'My App', url: location.origin },
 *     walletUrl: 'https://sphere.unicity.network',
 *   });
 *
 *   // Use the client — same API regardless of transport:
 *   const balance = await client.query('sphere_getBalance');
 *   await client.intent('send', { recipient: '@bob', amount: '1000', coinId: 'UCT' });
 *   client.on('transfer:incoming', (data) => console.log(data));
 */

/** Returns true when the page is running inside an iframe. */
declare function isInIframe(): boolean;
/** Returns true when the Sphere browser extension is installed and active. */
declare function hasExtension(): boolean;
/** Detected transport type. */
type DetectedTransport = 'iframe' | 'extension' | 'popup';
/** Detect which transport to use based on the current environment. */
declare function detectTransport(): DetectedTransport;
interface AutoConnectConfig {
    /** dApp metadata sent during handshake. */
    dapp: DAppMetadata;
    /**
     * Wallet URL for popup fallback (P3).
     * The URL will be opened with `/connect?origin=<current origin>` appended.
     * Required if the extension is not installed and the page is not in an iframe.
     */
    walletUrl?: string;
    /** Permissions to request. Defaults to all. */
    permissions?: PermissionScope[];
    /**
     * If true, silently fail if the wallet has not previously approved this origin.
     * No UI will be shown. Useful for auto-connect on page load.
     * Default: false.
     */
    silent?: boolean;
    /** Existing session ID to resume (for popup mode). */
    resumeSessionId?: string;
    /** Timeout for query requests in ms. Default: 30000. */
    timeout?: number;
    /** Timeout for intent requests in ms. Default: 120000. */
    intentTimeout?: number;
    /**
     * Popup window features (width, height, etc.).
     * Default: 'width=420,height=720,scrollbars=yes,resizable=yes'
     */
    popupFeatures?: string;
    /**
     * Force a specific transport instead of auto-detecting.
     * Useful for testing or explicit control.
     */
    forceTransport?: DetectedTransport;
}
interface AutoConnectResult {
    /** Connected client — use for queries, intents, and events. */
    client: ConnectClient;
    /** Connection result with session info and identity. */
    connection: ConnectResult;
    /** Which transport was selected. */
    transport: DetectedTransport;
    /**
     * Disconnect and clean up all resources.
     * For popup mode, also closes the popup window.
     */
    disconnect: () => Promise<void>;
}
/**
 * Auto-detect the best transport and connect to the Sphere wallet.
 *
 * @throws Error if connection fails or is rejected by the wallet.
 */
declare function autoConnect(config: AutoConnectConfig): Promise<AutoConnectResult>;

export { type AutoConnectConfig, type AutoConnectResult, type ChromeMessagingApi, type DetectedTransport, EXT_MSG_TO_CLIENT, EXT_MSG_TO_HOST, type ExtensionConnectEnvelope, ExtensionTransport, type PostMessageClientOptions, type PostMessageHostOptions, PostMessageTransport, autoConnect, detectTransport, hasExtension, isExtensionConnectEnvelope, isInIframe };
