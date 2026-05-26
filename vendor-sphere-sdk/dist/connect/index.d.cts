/** Signal sent by wallet popup to dApp when ConnectHost is ready */
declare const HOST_READY_TYPE: "sphere-connect:host-ready";
/** Default timeout (ms) for waiting for the host-ready signal */
declare const HOST_READY_TIMEOUT = 30000;

/**
 * Sphere Connect Protocol
 * JSON-RPC-like message types for wallet ↔ dApp communication.
 */
declare const SPHERE_CONNECT_NAMESPACE = "sphere-connect";
declare const SPHERE_CONNECT_VERSION = "1.0";

declare const RPC_METHODS: {
    readonly GET_IDENTITY: "sphere_getIdentity";
    readonly GET_BALANCE: "sphere_getBalance";
    readonly GET_ASSETS: "sphere_getAssets";
    readonly GET_FIAT_BALANCE: "sphere_getFiatBalance";
    readonly GET_TOKENS: "sphere_getTokens";
    readonly GET_HISTORY: "sphere_getHistory";
    readonly L1_GET_BALANCE: "sphere_l1GetBalance";
    readonly L1_GET_HISTORY: "sphere_l1GetHistory";
    readonly RESOLVE: "sphere_resolve";
    readonly SUBSCRIBE: "sphere_subscribe";
    readonly UNSUBSCRIBE: "sphere_unsubscribe";
    readonly DISCONNECT: "sphere_disconnect";
    readonly GET_CONVERSATIONS: "sphere_getConversations";
    readonly GET_MESSAGES: "sphere_getMessages";
    readonly GET_DM_UNREAD_COUNT: "sphere_getDMUnreadCount";
    readonly MARK_AS_READ: "sphere_markAsRead";
    readonly GET_INVOICES: "sphere_getInvoices";
    readonly GET_INVOICE_STATUS: "sphere_getInvoiceStatus";
};
type RpcMethod = (typeof RPC_METHODS)[keyof typeof RPC_METHODS];
declare const INTENT_ACTIONS: {
    readonly SEND: "send";
    readonly L1_SEND: "l1_send";
    readonly DM: "dm";
    readonly PAYMENT_REQUEST: "payment_request";
    readonly RECEIVE: "receive";
    readonly SIGN_MESSAGE: "sign_message";
    readonly CREATE_INVOICE: "create_invoice";
    readonly CLOSE_INVOICE: "close_invoice";
    readonly CANCEL_INVOICE: "cancel_invoice";
    readonly PAY_INVOICE: "pay_invoice";
    readonly RETURN_INVOICE_PAYMENT: "return_invoice_payment";
    readonly IMPORT_INVOICE: "import_invoice";
    readonly SEND_INVOICE_RECEIPTS: "send_invoice_receipts";
    readonly SEND_CANCELLATION_NOTICES: "send_cancellation_notices";
    readonly SET_AUTO_RETURN: "set_auto_return";
};
type IntentAction = (typeof INTENT_ACTIONS)[keyof typeof INTENT_ACTIONS];
declare const ERROR_CODES: {
    readonly PARSE_ERROR: -32700;
    readonly INVALID_REQUEST: -32600;
    readonly METHOD_NOT_FOUND: -32601;
    readonly INVALID_PARAMS: -32602;
    readonly INTERNAL_ERROR: -32603;
    readonly NOT_CONNECTED: 4001;
    readonly PERMISSION_DENIED: 4002;
    readonly USER_REJECTED: 4003;
    readonly SESSION_EXPIRED: 4004;
    readonly ORIGIN_BLOCKED: 4005;
    readonly RATE_LIMITED: 4006;
    readonly INSUFFICIENT_BALANCE: 4100;
    readonly INVALID_RECIPIENT: 4101;
    readonly TRANSFER_FAILED: 4102;
    readonly INTENT_CANCELLED: 4200;
};
type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
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
 * Events that ConnectHost pushes proactively to connected dApps.
 * dApps can listen with client.on(WALLET_EVENTS.LOCKED, handler) etc.
 * No sphere_subscribe call needed — host sends these unconditionally.
 */
declare const WALLET_EVENTS: {
    /** Wallet locked or user logged out. dApp shows locked state and waits for unlock.
     *  Pushed automatically by ConnectHost — no sphere_subscribe needed. */
    readonly LOCKED: "wallet:locked";
    /** Active wallet address changed. dApp should update displayed identity.
     *  Pushed automatically by ConnectHost — no sphere_subscribe needed. */
    readonly IDENTITY_CHANGED: "identity:changed";
};
type WalletEvent = (typeof WALLET_EVENTS)[keyof typeof WALLET_EVENTS];
/** Check if a message belongs to the Sphere Connect protocol */
declare function isSphereConnectMessage(msg: unknown): msg is SphereConnectMessage;
/** Create a unique request ID */
declare function createRequestId(): string;

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
/** All available permission scopes */
declare const ALL_PERMISSIONS: readonly PermissionScope[];
/** Permissions always granted on connect */
declare const DEFAULT_PERMISSIONS: readonly PermissionScope[];
declare const METHOD_PERMISSIONS: Record<string, PermissionScope>;
declare const INTENT_PERMISSIONS: Record<string, PermissionScope>;
/** Check if granted permissions allow calling a method */
declare function hasMethodPermission(granted: ReadonlySet<string>, method: string): boolean;
/** Check if granted permissions allow an intent action */
declare function hasIntentPermission(granted: ReadonlySet<string>, action: string): boolean;
/** Validate that all requested permissions are known scopes */
declare function validatePermissions(permissions: string[]): permissions is PermissionScope[];

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
interface ConnectSession {
    readonly id: string;
    readonly dapp: DAppMetadata;
    readonly permissions: PermissionScope[];
    readonly createdAt: number;
    readonly expiresAt: number;
    active: boolean;
}
/**
 * Schema version of the intent payload as observed by `onIntent`.
 *
 * - `'uxf-1'`  — params are shaped per the UXF-1 packaging format
 *               (e.g. multi-asset `additionalAssets[]`, or a top-level
 *               `bundle`/`uxfBundle` field carrying a UXF envelope).
 * - `'legacy'` — params are the pre-UXF intent shape (single coin slot,
 *                no multi-asset extension). This is the default for any
 *                payload that is not detected as UXF-1, preserving full
 *                backward compatibility with existing wallet UIs.
 *
 * External integrators (sphere app, agentsphere, …) that branch on this
 * field should widen their `onIntent` callback type to include the
 * `schemaVersion` parameter; callbacks ignoring it continue to work
 * unchanged because the parameter is optional.
 */
type IntentSchemaVersion = 'uxf-1' | 'legacy';
interface ConnectHostConfig {
    /** Sphere SDK instance to bridge */
    sphere: unknown;
    /** Transport layer for communication */
    transport: ConnectTransport;
    /** Called when dApp requests connection. Wallet shows approval UI.
     *  When `silent` is true, the wallet must NOT open any UI — return rejected immediately if origin is unknown. */
    onConnectionRequest: (dapp: DAppMetadata, requestedPermissions: PermissionScope[], silent?: boolean) => Promise<{
        approved: boolean;
        grantedPermissions: PermissionScope[];
    }>;
    /**
     * Called when dApp sends an intent. Wallet opens corresponding UI.
     *
     * The 4th argument, `schemaVersion`, signals whether the wallet should
     * treat `params` as UXF-1 (`'uxf-1'`) or pre-UXF (`'legacy'`). It is
     * always provided by the host; the optional marker preserves
     * source-level backward compatibility for callbacks declared with
     * three parameters. Defaults to `'legacy'` whenever the host cannot
     * detect a UXF-1 shape — never throws on detection failure.
     */
    onIntent: (action: string, params: Record<string, unknown>, session: ConnectSession, schemaVersion?: IntentSchemaVersion) => Promise<{
        result?: unknown;
        error?: {
            code: number;
            message: string;
        };
    }>;
    /** Called when dApp explicitly disconnects. Wallet can revoke persisted permissions. */
    onDisconnect?: (session: ConnectSession) => void | Promise<void>;
    /** Session time-to-live in ms. Default: 86400000 (24h). 0 = no expiry. */
    sessionTtlMs?: number;
    /** Max requests per second per session. Default: 20. */
    maxRequestsPerSecond?: number;
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
 * ConnectHost — Wallet side of Sphere Connect.
 *
 * Wraps a Sphere instance and exposes its API through a ConnectTransport.
 * Handles permission checking, rate limiting, session management,
 * and delegates intents to the wallet app via callbacks.
 */

/**
 * Detect the schema version of an intent payload (T.7.C.5).
 *
 * Returns `'uxf-1'` when the payload exhibits any signal of the UXF-1
 * packaging format:
 *   - explicit `schemaVersion: 'uxf-1'` field on params
 *   - a non-empty `additionalAssets` array (multi-asset extension)
 *   - a `bundle` / `uxfBundle` / `uxf` field carrying a UXF envelope
 *
 * Otherwise returns `'legacy'`. Pure, never throws, never mutates
 * input — safe for any unknown dApp-supplied params shape.
 */
declare function detectIntentSchemaVersion(params: Record<string, unknown> | undefined | null): IntentSchemaVersion;
declare class ConnectHost {
    private sphere;
    private readonly transport;
    private readonly config;
    private session;
    private grantedPermissions;
    private eventSubscriptions;
    private autoApprovedIntents;
    private rateLimitCounter;
    private rateLimitResetAt;
    private unsubscribeTransport;
    constructor(config: ConnectHostConfig);
    /** Get current active session */
    getSession(): ConnectSession | null;
    /**
     * Register an auto-approve handler for an intent action (session-scoped).
     *
     * The handler receives the same `schemaVersion` 4th argument that
     * {@link ConnectHostConfig.onIntent} does: `'uxf-1'` when the host
     * detects a UXF-1 shape, otherwise `'legacy'`. The argument is
     * optional, so existing 3-arg handlers continue to work unchanged.
     */
    setIntentAutoApprove(action: string, handler: (action: string, params: Record<string, unknown>, session: ConnectSession, schemaVersion?: IntentSchemaVersion) => Promise<{
        result?: unknown;
        error?: {
            code: number;
            message: string;
        };
    }>): void;
    /** Remove auto-approve for an intent action. */
    clearIntentAutoApprove(action: string): void;
    /**
     * Update the Sphere instance (e.g. user switched address — new Sphere created).
     * Re-subscribes auto-push events and notifies connected dApp of the new identity.
     */
    updateSphere(newSphere: unknown): void;
    /** Revoke the current session */
    revokeSession(): void;
    /**
     * Notify connected dApp that wallet is locked/logged out, then revoke session.
     * Call this BEFORE destroy() when the wallet locks so the dApp gets a clean signal
     * instead of receiving NOT_CONNECTED errors on the next request.
     */
    notifyWalletLocked(): void;
    /** Destroy the host, clean up all resources */
    destroy(): void;
    private handleMessage;
    private handleHandshake;
    private sendHandshakeResponse;
    private handleRpcRequest;
    private handleIntentRequest;
    private executeMethod;
    private autoSubscribeIdentityChanged;
    private handleSubscribe;
    private handleUnsubscribe;
    private cleanupEventSubscriptions;
    /** Push an event to the dApp without requiring a sphere_subscribe call. */
    private pushClientEvent;
    private getPublicIdentity;
    private stripTokenSdkData;
    private sendResult;
    private sendError;
    private sendIntentResult;
    private sendIntentError;
    private checkRateLimit;
}

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

export { ALL_PERMISSIONS, ConnectClient, type ConnectClientConfig, type ConnectEventHandler, ConnectHost, type ConnectHostConfig, type ConnectResult, type ConnectSession, type ConnectTransport, type DAppMetadata, DEFAULT_PERMISSIONS, ERROR_CODES, type ErrorCode, HOST_READY_TIMEOUT, HOST_READY_TYPE, INTENT_ACTIONS, INTENT_PERMISSIONS, type IntentAction, type IntentSchemaVersion, METHOD_PERMISSIONS, PERMISSION_SCOPES, type PermissionScope, type PublicIdentity, RPC_METHODS, type RpcMethod, SPHERE_CONNECT_NAMESPACE, SPHERE_CONNECT_VERSION, type SphereConnectMessage, type SphereEventMessage, type SphereHandshake, type SphereIntentRequest, type SphereIntentResult, type SphereRpcError, type SphereRpcRequest, type SphereRpcResponse, WALLET_EVENTS, type WalletEvent, createRequestId, detectIntentSchemaVersion, hasIntentPermission, hasMethodPermission, isSphereConnectMessage, validatePermissions };
