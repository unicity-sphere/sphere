// core/logger.ts
var LOGGER_KEY = "__sphere_sdk_logger__";
function getState() {
  const g = globalThis;
  if (!g[LOGGER_KEY]) {
    g[LOGGER_KEY] = { debug: false, tags: {}, handler: null };
  }
  return g[LOGGER_KEY];
}
function isEnabled(tag) {
  const state = getState();
  if (tag in state.tags) return state.tags[tag];
  return state.debug;
}
var logger = {
  /**
   * Configure the logger. Can be called multiple times (last write wins).
   * Typically called by createBrowserProviders(), createNodeProviders(), or Sphere.init().
   */
  configure(config) {
    const state = getState();
    if (config.debug !== void 0) state.debug = config.debug;
    if (config.handler !== void 0) state.handler = config.handler;
  },
  /**
   * Enable/disable debug logging for a specific tag.
   * Per-tag setting overrides the global debug flag.
   *
   * @example
   * ```ts
   * logger.setTagDebug('Nostr', true);  // enable only Nostr logs
   * logger.setTagDebug('Nostr', false); // disable Nostr logs even if global debug=true
   * ```
   */
  setTagDebug(tag, enabled) {
    getState().tags[tag] = enabled;
  },
  /**
   * Clear per-tag override, falling back to global debug flag.
   */
  clearTagDebug(tag) {
    delete getState().tags[tag];
  },
  /** Returns true if debug mode is enabled for the given tag (or globally). */
  isDebugEnabled(tag) {
    if (tag) return isEnabled(tag);
    return getState().debug;
  },
  /**
   * Debug-level log. Only shown when debug is enabled (globally or for this tag).
   * Use for detailed operational information.
   */
  debug(tag, message, ...args) {
    if (!isEnabled(tag)) return;
    const state = getState();
    if (state.handler) {
      state.handler("debug", tag, message, ...args);
    } else {
      console.log(`[${tag}]`, message, ...args);
    }
  },
  /**
   * Warning-level log. ALWAYS shown regardless of debug flag.
   * Use for important but non-critical issues (timeouts, retries, degraded state).
   */
  warn(tag, message, ...args) {
    const state = getState();
    if (state.handler) {
      state.handler("warn", tag, message, ...args);
    } else {
      console.warn(`[${tag}]`, message, ...args);
    }
  },
  /**
   * Error-level log. ALWAYS shown regardless of debug flag.
   * Use for critical failures that should never be silenced.
   */
  error(tag, message, ...args) {
    const state = getState();
    if (state.handler) {
      state.handler("error", tag, message, ...args);
    } else {
      console.error(`[${tag}]`, message, ...args);
    }
  },
  /** Reset all logger state (debug flag, tags, handler). Primarily for tests. */
  reset() {
    const g = globalThis;
    delete g[LOGGER_KEY];
  }
};

// core/errors.ts
var REDACTED_FIELDS = Object.freeze([
  // Cryptographic-secret fields (W40 original set).
  "signedTransferTxBytes",
  "signedCommitmentBytes",
  "rawAuthenticator",
  // Round 5 — defensive sister names (untrusted strings/payloads).
  "aggregatorError",
  "failureReasons",
  "errorMessage",
  "serverError",
  "responseBody",
  "requestBody",
  "responseText",
  "body",
  "rawError",
  "errorBody"
]);
var REDACTED_FIELDS_SET = new Set(REDACTED_FIELDS);

// constants.ts
var STORAGE_KEYS_GLOBAL = {
  /** Encrypted BIP39 mnemonic */
  MNEMONIC: "mnemonic",
  /** Encrypted master private key */
  MASTER_KEY: "master_key",
  /** BIP32 chain code */
  CHAIN_CODE: "chain_code",
  /** HD derivation path (full path like m/44'/0'/0'/0/0) */
  DERIVATION_PATH: "derivation_path",
  /** Base derivation path (like m/44'/0'/0' without chain/index) */
  BASE_PATH: "base_path",
  /** Derivation mode: bip32, wif_hmac, legacy_hmac */
  DERIVATION_MODE: "derivation_mode",
  /** Wallet source: mnemonic, file, unknown */
  WALLET_SOURCE: "wallet_source",
  /** Wallet existence flag */
  WALLET_EXISTS: "wallet_exists",
  /** Current active address index */
  CURRENT_ADDRESS_INDEX: "current_address_index",
  /** Nametag cache per address (separate from tracked addresses registry) */
  ADDRESS_NAMETAGS: "address_nametags",
  /** Active addresses registry (JSON: TrackedAddressesStorage) */
  TRACKED_ADDRESSES: "tracked_addresses",
  /** Last processed Nostr wallet event timestamp (unix seconds), keyed per pubkey */
  LAST_WALLET_EVENT_TS: "last_wallet_event_ts",
  /** Last processed Nostr DM (gift-wrap) event timestamp (unix seconds), keyed per pubkey */
  LAST_DM_EVENT_TS: "last_dm_event_ts",
  /** Group chat: last used relay URL (stale data detection) — global, same relay for all addresses */
  GROUP_CHAT_RELAY_URL: "group_chat_relay_url",
  /** Cached token registry JSON (fetched from remote) */
  TOKEN_REGISTRY_CACHE: "token_registry_cache",
  /** Timestamp of last token registry cache update (ms since epoch) */
  TOKEN_REGISTRY_CACHE_TS: "token_registry_cache_ts",
  /** Cached price data JSON (from CoinGecko or other provider) */
  PRICE_CACHE: "price_cache",
  /** Timestamp of last price cache update (ms since epoch) */
  PRICE_CACHE_TS: "price_cache_ts",
  /**
   * CID whose CAR is pinned + OrbitDB ref written but whose aggregator
   * pointer publish is pending due to a transient failure. Persisted
   * so a process restart resumes the retry rather than abandoning the
   * publish (which would leave cross-device peers unable to discover
   * the bundle via the aggregator path). Per-address suffix appended
   * by the Profile provider (`<key>_<addressId>`).
   */
  PROFILE_PENDING_PUBLISH_CID: "profile_pending_publish_cid"
};
var STORAGE_KEYS_ADDRESS = {
  /** Pending transfers for this address */
  PENDING_TRANSFERS: "pending_transfers",
  /** Transfer outbox for this address */
  OUTBOX: "outbox",
  /** Conversations for this address */
  CONVERSATIONS: "conversations",
  /** Messages for this address */
  MESSAGES: "messages",
  /** Transaction history for this address */
  TRANSACTION_HISTORY: "transaction_history",
  /** Pending V5 finalization tokens (unconfirmed instant split tokens) */
  PENDING_V5_TOKENS: "pending_v5_tokens",
  /** Group chat: joined groups for this address */
  GROUP_CHAT_GROUPS: "group_chat_groups",
  /** Group chat: messages for this address */
  GROUP_CHAT_MESSAGES: "group_chat_messages",
  /** Group chat: members for this address */
  GROUP_CHAT_MEMBERS: "group_chat_members",
  /** Group chat: processed event IDs for deduplication */
  GROUP_CHAT_PROCESSED_EVENTS: "group_chat_processed_events",
  /** Processed V5 split group IDs for Nostr re-delivery dedup */
  PROCESSED_SPLIT_GROUP_IDS: "processed_split_group_ids",
  /** Processed V6 combined transfer IDs for Nostr re-delivery dedup */
  PROCESSED_COMBINED_TRANSFER_IDS: "processed_combined_transfer_ids",
  // Invoice / Accounting storage keys
  /** Set of cancelled invoice IDs (JSON string array) */
  CANCELLED_INVOICES: "cancelled_invoices",
  /** Set of closed invoice IDs (JSON string array) */
  CLOSED_INVOICES: "closed_invoices",
  /** Frozen balances for terminated invoices (JSON map: invoiceId → FrozenInvoiceBalances) */
  FROZEN_BALANCES: "frozen_balances",
  /** Auto-return settings (JSON: AutoReturnSettings) */
  AUTO_RETURN: "auto_return",
  /** Auto-return dedup ledger (JSON: AutoReturnLedger) */
  AUTO_RETURN_LEDGER: "auto_return_ledger",
  /** Invoice-transfer index metadata (JSON: Record<invoiceId, { terminated, frozenAt? }>) */
  INV_LEDGER_INDEX: "inv_ledger_index",
  /** Token scan state watermarks (JSON: Record<tokenId, txCount>) */
  TOKEN_SCAN_STATE: "token_scan_state",
  /**
   * Persisted NOSTR-FIRST proof-polling jobs. Issue #144: the in-memory
   * `proofPollingJobs` Map dies with the process; on CLI usage every
   * `sphere <cmd>` is a fresh Node.js process, so V6-direct receives
   * whose proof arrives later never finalize. We persist enough state
   * (genesisTokenId, stateHash, requestIdHex, commitmentJson,
   * sourceTokenJson) to re-fire `finalizeReceivedToken` on next load().
   */
  PROOF_POLLING_JOBS: "proof_polling_jobs",
  // Swap storage keys
  /** Per-swap key: swap:{swapId} */
  SWAP_RECORD_PREFIX: "swap:",
  /** Lightweight index array for listing */
  SWAP_INDEX: "swap_index",
  // UXF inter-wallet transfer protocol storage keys (T.0.G7-fill-gaps)
  /**
   * Audit collection for structurally-valid-but-unspendable tokens
   * (NOT_OUR_CURRENT_STATE / UNSPENDABLE_BY_US dispositions). Stored
   * with composite id `${tokenId}.${observedTokenContentHash}` per
   * PROFILE-ARCHITECTURE.md §10.10 / canonical UXF-TRANSFER-PROTOCOL §5.4.
   * The per-entry-key writer treats the id as opaque — T.1.E declares
   * the specific composite-id shape.
   */
  AUDIT: "audit",
  /**
   * Finalization queue for pending chain-mode transactions, keyed by
   * the request id. Persists across process restarts per
   * UXF-TRANSFER-PROTOCOL §5.5.
   */
  FINALIZATION_QUEUE: "finalizationQueue"
};
var STORAGE_KEYS = {
  ...STORAGE_KEYS_GLOBAL,
  ...STORAGE_KEYS_ADDRESS
};
function readIpfsGatewayEnvOverride() {
  if (typeof process === "undefined" || typeof process.env === "undefined") {
    return null;
  }
  const raw = process.env.SPHERE_IPFS_GATEWAY;
  if (!raw) return null;
  const parts = raw.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  return parts.length > 0 ? parts : null;
}
var ENV_IPFS_GATEWAYS = readIpfsGatewayEnvOverride();
var DEFAULT_BASE_PATH = "m/44'/0'/0'";
var DEFAULT_DERIVATION_PATH = `${DEFAULT_BASE_PATH}/0/0`;

// connect/protocol.ts
var SPHERE_CONNECT_NAMESPACE = "sphere-connect";
var SPHERE_CONNECT_VERSION = "1.0";
var RPC_METHODS = {
  GET_IDENTITY: "sphere_getIdentity",
  GET_BALANCE: "sphere_getBalance",
  GET_ASSETS: "sphere_getAssets",
  GET_FIAT_BALANCE: "sphere_getFiatBalance",
  GET_TOKENS: "sphere_getTokens",
  GET_HISTORY: "sphere_getHistory",
  L1_GET_BALANCE: "sphere_l1GetBalance",
  L1_GET_HISTORY: "sphere_l1GetHistory",
  RESOLVE: "sphere_resolve",
  SUBSCRIBE: "sphere_subscribe",
  UNSUBSCRIBE: "sphere_unsubscribe",
  DISCONNECT: "sphere_disconnect",
  GET_CONVERSATIONS: "sphere_getConversations",
  GET_MESSAGES: "sphere_getMessages",
  GET_DM_UNREAD_COUNT: "sphere_getDMUnreadCount",
  MARK_AS_READ: "sphere_markAsRead",
  GET_INVOICES: "sphere_getInvoices",
  GET_INVOICE_STATUS: "sphere_getInvoiceStatus"
};
var INTENT_ACTIONS = {
  SEND: "send",
  L1_SEND: "l1_send",
  DM: "dm",
  PAYMENT_REQUEST: "payment_request",
  RECEIVE: "receive",
  SIGN_MESSAGE: "sign_message",
  CREATE_INVOICE: "create_invoice",
  CLOSE_INVOICE: "close_invoice",
  CANCEL_INVOICE: "cancel_invoice",
  PAY_INVOICE: "pay_invoice",
  RETURN_INVOICE_PAYMENT: "return_invoice_payment",
  IMPORT_INVOICE: "import_invoice",
  SEND_INVOICE_RECEIPTS: "send_invoice_receipts",
  SEND_CANCELLATION_NOTICES: "send_cancellation_notices",
  SET_AUTO_RETURN: "set_auto_return"
};
function isSphereConnectMessage(msg) {
  if (!msg || typeof msg !== "object") return false;
  const m = msg;
  return m.ns === SPHERE_CONNECT_NAMESPACE && m.v === SPHERE_CONNECT_VERSION;
}

// connect/permissions.ts
var PERMISSION_SCOPES = {
  IDENTITY_READ: "identity:read",
  BALANCE_READ: "balance:read",
  TOKENS_READ: "tokens:read",
  HISTORY_READ: "history:read",
  L1_READ: "l1:read",
  EVENTS_SUBSCRIBE: "events:subscribe",
  RESOLVE_PEER: "resolve:peer",
  TRANSFER_REQUEST: "transfer:request",
  L1_TRANSFER: "l1:transfer",
  DM_REQUEST: "dm:request",
  DM_READ: "dm:read",
  DM_MANAGE: "dm:manage",
  PAYMENT_REQUEST: "payment:request",
  SIGN_REQUEST: "sign:request",
  INVOICE_READ: "invoice:read",
  INVOICE_WRITE: "invoice:write"
};
var ALL_PERMISSIONS = Object.values(PERMISSION_SCOPES);
var DEFAULT_PERMISSIONS = [
  PERMISSION_SCOPES.IDENTITY_READ
];
var METHOD_PERMISSIONS = {
  [RPC_METHODS.GET_IDENTITY]: PERMISSION_SCOPES.IDENTITY_READ,
  [RPC_METHODS.GET_BALANCE]: PERMISSION_SCOPES.BALANCE_READ,
  [RPC_METHODS.GET_ASSETS]: PERMISSION_SCOPES.BALANCE_READ,
  [RPC_METHODS.GET_FIAT_BALANCE]: PERMISSION_SCOPES.BALANCE_READ,
  [RPC_METHODS.GET_TOKENS]: PERMISSION_SCOPES.TOKENS_READ,
  [RPC_METHODS.GET_HISTORY]: PERMISSION_SCOPES.HISTORY_READ,
  [RPC_METHODS.L1_GET_BALANCE]: PERMISSION_SCOPES.L1_READ,
  [RPC_METHODS.L1_GET_HISTORY]: PERMISSION_SCOPES.L1_READ,
  [RPC_METHODS.RESOLVE]: PERMISSION_SCOPES.RESOLVE_PEER,
  [RPC_METHODS.SUBSCRIBE]: PERMISSION_SCOPES.EVENTS_SUBSCRIBE,
  [RPC_METHODS.UNSUBSCRIBE]: PERMISSION_SCOPES.EVENTS_SUBSCRIBE,
  [RPC_METHODS.GET_CONVERSATIONS]: PERMISSION_SCOPES.DM_READ,
  [RPC_METHODS.GET_MESSAGES]: PERMISSION_SCOPES.DM_READ,
  [RPC_METHODS.GET_DM_UNREAD_COUNT]: PERMISSION_SCOPES.DM_READ,
  [RPC_METHODS.MARK_AS_READ]: PERMISSION_SCOPES.DM_MANAGE,
  [RPC_METHODS.GET_INVOICES]: PERMISSION_SCOPES.INVOICE_READ,
  [RPC_METHODS.GET_INVOICE_STATUS]: PERMISSION_SCOPES.INVOICE_READ
};
var INTENT_PERMISSIONS = {
  [INTENT_ACTIONS.SEND]: PERMISSION_SCOPES.TRANSFER_REQUEST,
  [INTENT_ACTIONS.L1_SEND]: PERMISSION_SCOPES.L1_TRANSFER,
  [INTENT_ACTIONS.DM]: PERMISSION_SCOPES.DM_REQUEST,
  [INTENT_ACTIONS.PAYMENT_REQUEST]: PERMISSION_SCOPES.PAYMENT_REQUEST,
  [INTENT_ACTIONS.RECEIVE]: PERMISSION_SCOPES.IDENTITY_READ,
  [INTENT_ACTIONS.SIGN_MESSAGE]: PERMISSION_SCOPES.SIGN_REQUEST,
  [INTENT_ACTIONS.CREATE_INVOICE]: PERMISSION_SCOPES.INVOICE_WRITE,
  [INTENT_ACTIONS.CLOSE_INVOICE]: PERMISSION_SCOPES.INVOICE_WRITE,
  [INTENT_ACTIONS.CANCEL_INVOICE]: PERMISSION_SCOPES.INVOICE_WRITE,
  [INTENT_ACTIONS.PAY_INVOICE]: PERMISSION_SCOPES.TRANSFER_REQUEST,
  [INTENT_ACTIONS.RETURN_INVOICE_PAYMENT]: PERMISSION_SCOPES.TRANSFER_REQUEST,
  [INTENT_ACTIONS.IMPORT_INVOICE]: PERMISSION_SCOPES.INVOICE_WRITE,
  [INTENT_ACTIONS.SEND_INVOICE_RECEIPTS]: PERMISSION_SCOPES.INVOICE_WRITE,
  [INTENT_ACTIONS.SEND_CANCELLATION_NOTICES]: PERMISSION_SCOPES.INVOICE_WRITE,
  [INTENT_ACTIONS.SET_AUTO_RETURN]: PERMISSION_SCOPES.INVOICE_WRITE
};

// transport/websocket.ts
var WebSocketReadyState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

// impl/nodejs/connect/WebSocketTransport.ts
var WebSocketServerTransport = class {
  server = null;
  // WebSocketServer from 'ws' package
  clientSocket = null;
  handlers = /* @__PURE__ */ new Set();
  config;
  constructor(config) {
    this.config = config;
  }
  /** Start the WebSocket server. Must be called before use. */
  async start() {
    const { WebSocketServer } = await import("ws");
    const wss = new WebSocketServer({
      port: this.config.port,
      host: this.config.host ?? "0.0.0.0"
    });
    this.server = wss;
    wss.on("connection", (ws) => {
      if (this.clientSocket) {
        ws.close(4e3, "Another client is already connected");
        return;
      }
      this.clientSocket = ws;
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(typeof event.data === "string" ? event.data : String(event.data));
          if (isSphereConnectMessage(msg)) {
            for (const handler of this.handlers) {
              try {
                handler(msg);
              } catch (err) {
                logger.debug("WebSocket", "Message handler error", err);
              }
            }
          }
        } catch (err) {
          logger.debug("WebSocket", "Malformed message received", err);
        }
      };
      ws.onclose = () => {
        if (this.clientSocket === ws) {
          this.clientSocket = null;
        }
      };
    });
    await new Promise((resolve, reject) => {
      wss.on("listening", resolve);
      wss.on("error", reject);
    });
  }
  send(message) {
    if (this.clientSocket && this.clientSocket.readyState === WebSocketReadyState.OPEN) {
      this.clientSocket.send(JSON.stringify(message));
    }
  }
  onMessage(handler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
  destroy() {
    if (this.clientSocket) {
      this.clientSocket.close();
      this.clientSocket = null;
    }
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.handlers.clear();
  }
};
var WebSocketClientTransport = class {
  ws = null;
  handlers = /* @__PURE__ */ new Set();
  config;
  reconnectAttempts = 0;
  reconnectTimer = null;
  destroyed = false;
  constructor(config) {
    this.config = {
      autoReconnect: true,
      reconnectDelayMs: 2e3,
      maxReconnectDelayMs: 3e4,
      maxReconnectAttempts: 10,
      ...config
    };
  }
  /** Connect to the WebSocket server. Must be called before use. */
  async connect() {
    return this.doConnect();
  }
  send(message) {
    if (this.ws && this.ws.readyState === WebSocketReadyState.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
  onMessage(handler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
  destroy() {
    this.destroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.handlers.clear();
  }
  // ===========================================================================
  // Private
  // ===========================================================================
  doConnect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = this.config.createWebSocket(this.config.url);
      } catch (err) {
        reject(err);
        return;
      }
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        resolve();
      };
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (isSphereConnectMessage(msg)) {
            for (const handler of this.handlers) {
              try {
                handler(msg);
              } catch (err) {
                logger.debug("WebSocket", "Message handler error", err);
              }
            }
          }
        } catch (err) {
          logger.debug("WebSocket", "Malformed message received", err);
        }
      };
      this.ws.onerror = (err) => {
        reject(err);
      };
      this.ws.onclose = () => {
        this.ws = null;
        if (!this.destroyed && this.config.autoReconnect) {
          this.scheduleReconnect();
        }
      };
    });
  }
  scheduleReconnect() {
    const maxAttempts = this.config.maxReconnectAttempts;
    if (maxAttempts > 0 && this.reconnectAttempts >= maxAttempts) {
      return;
    }
    this.reconnectAttempts++;
    const baseDelay = this.config.reconnectDelayMs;
    const maxDelay = this.config.maxReconnectDelayMs;
    const delay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts - 1), maxDelay);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.doConnect().catch((err) => logger.debug("WebSocket", "Reconnect attempt failed", err));
    }, delay);
  }
};
var WebSocketTransport = {
  /** Create a WebSocket server transport (wallet side) */
  createServer(config) {
    return new WebSocketServerTransport(config);
  },
  /** Create a WebSocket client transport (dApp side) */
  createClient(config) {
    return new WebSocketClientTransport(config);
  }
};
export {
  WebSocketClientTransport,
  WebSocketServerTransport,
  WebSocketTransport
};
//# sourceMappingURL=index.js.map