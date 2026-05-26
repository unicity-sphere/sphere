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

/**
 * WebSocket Abstraction
 * Platform-independent WebSocket interface for cross-platform support
 */
/**
 * Minimal WebSocket interface compatible with browser and Node.js
 */
interface IWebSocket {
    readonly readyState: number;
    send(data: string): void;
    close(code?: number, reason?: string): void;
    onopen: ((event: unknown) => void) | null;
    onclose: ((event: unknown) => void) | null;
    onerror: ((event: unknown) => void) | null;
    onmessage: ((event: IMessageEvent) => void) | null;
}
interface IMessageEvent {
    data: string;
}
/**
 * Factory function to create WebSocket instances
 * Different implementations for browser (native) vs Node.js (ws package)
 */
type WebSocketFactory = (url: string) => IWebSocket;

/**
 * WebSocketTransport — Node.js transport for Sphere Connect.
 *
 * Two modes:
 * - Server: wallet runs a WS server, dApps connect to it
 * - Client: dApp connects to wallet's WS server
 *
 * Uses the existing IWebSocket/WebSocketFactory abstraction from transport/websocket.ts.
 */

interface WebSocketServerConfig {
    /** Port to listen on */
    port: number;
    /** Host to bind to. Default: '0.0.0.0' */
    host?: string;
}
interface WebSocketClientConfig {
    /** WebSocket URL to connect to (e.g., 'ws://localhost:8765') */
    url: string;
    /** Factory for creating WebSocket instances */
    createWebSocket: WebSocketFactory;
    /** Reconnect on disconnect. Default: true */
    autoReconnect?: boolean;
    /** Initial reconnect delay in ms. Default: 2000 */
    reconnectDelayMs?: number;
    /** Max reconnect delay in ms. Default: 30000 */
    maxReconnectDelayMs?: number;
    /** Max reconnect attempts. Default: 10. 0 = unlimited */
    maxReconnectAttempts?: number;
}
declare class WebSocketServerTransport implements ConnectTransport {
    private server;
    private clientSocket;
    private handlers;
    private config;
    constructor(config: WebSocketServerConfig);
    /** Start the WebSocket server. Must be called before use. */
    start(): Promise<void>;
    send(message: SphereConnectMessage): void;
    onMessage(handler: (message: SphereConnectMessage) => void): () => void;
    destroy(): void;
}
declare class WebSocketClientTransport implements ConnectTransport {
    private ws;
    private handlers;
    private config;
    private reconnectAttempts;
    private reconnectTimer;
    private destroyed;
    constructor(config: WebSocketClientConfig);
    /** Connect to the WebSocket server. Must be called before use. */
    connect(): Promise<void>;
    send(message: SphereConnectMessage): void;
    onMessage(handler: (message: SphereConnectMessage) => void): () => void;
    destroy(): void;
    private doConnect;
    private scheduleReconnect;
}
declare const WebSocketTransport: {
    /** Create a WebSocket server transport (wallet side) */
    createServer(config: WebSocketServerConfig): WebSocketServerTransport;
    /** Create a WebSocket client transport (dApp side) */
    createClient(config: WebSocketClientConfig): WebSocketClientTransport;
};

export { type WebSocketClientConfig, WebSocketClientTransport, type WebSocketServerConfig, WebSocketServerTransport, WebSocketTransport };
