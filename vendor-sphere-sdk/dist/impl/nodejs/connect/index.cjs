"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// impl/nodejs/connect/index.ts
var connect_exports = {};
__export(connect_exports, {
  WebSocketClientTransport: () => WebSocketClientTransport,
  WebSocketServerTransport: () => WebSocketServerTransport,
  WebSocketTransport: () => WebSocketTransport
});
module.exports = __toCommonJS(connect_exports);

// core/logger.ts
var LEVEL_RANK = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4
};
var ALWAYS_LEVEL_RANK = LEVEL_RANK.warn;
var LOGGER_KEY = "__sphere_sdk_logger__";
function getState() {
  const g = globalThis;
  const existing = g[LOGGER_KEY];
  if (!existing) {
    const fresh = {
      debug: false,
      tags: {},
      levels: {},
      handler: null,
      sinks: [],
      timestamps: false,
      redaction: true,
      envBootstrapped: false
    };
    g[LOGGER_KEY] = fresh;
    bootstrapFromEnv(fresh);
    return fresh;
  }
  if (existing.levels === void 0) existing.levels = {};
  if (existing.sinks === void 0) existing.sinks = [];
  if (existing.timestamps === void 0) existing.timestamps = false;
  if (existing.redaction === void 0) existing.redaction = true;
  if (existing.envBootstrapped === void 0) {
    existing.envBootstrapped = false;
    bootstrapFromEnv(existing);
  }
  return existing;
}
function readEnvSpec() {
  try {
    if (typeof process !== "undefined" && process?.env) {
      const v = process.env.SPHERE_DEBUG ?? process.env.SPHERE_LOG;
      if (typeof v === "string" && v.length > 0) return v;
    }
  } catch {
  }
  try {
    if (typeof localStorage !== "undefined") {
      const v = localStorage.getItem("SPHERE_DEBUG");
      if (typeof v === "string" && v.length > 0) return v;
    }
  } catch {
  }
  return null;
}
function bootstrapFromEnv(state) {
  if (state.envBootstrapped) return;
  state.envBootstrapped = true;
  const spec = readEnvSpec();
  if (spec) applySpec(state, spec);
}
var VALID_LEVELS = /* @__PURE__ */ new Set(["trace", "debug", "info", "warn", "error"]);
var SPEC_MAX_LENGTH = 8 * 1024;
var SPEC_MAX_ENTRIES = 256;
var SPEC_PATTERN_RE = /^[A-Za-z0-9:_*\-]{1,128}$/;
function parseSpec(spec) {
  const out = [];
  if (spec.length > SPEC_MAX_LENGTH) {
    try {
      console.warn(`[logger] SPHERE_DEBUG spec exceeds ${SPEC_MAX_LENGTH} bytes \u2014 rejecting`);
    } catch {
    }
    return out;
  }
  let processed = 0;
  for (const rawEntry of spec.split(",")) {
    if (processed >= SPEC_MAX_ENTRIES) {
      try {
        console.warn(`[logger] SPHERE_DEBUG spec exceeds ${SPEC_MAX_ENTRIES} entries \u2014 truncating`);
      } catch {
      }
      break;
    }
    processed += 1;
    const trimmed = rawEntry.trim();
    if (!trimmed) continue;
    let pattern = trimmed;
    let level = "debug";
    const negate = pattern.startsWith("-") || pattern.startsWith("!");
    if (negate) pattern = pattern.slice(1).trim();
    const eq = pattern.indexOf("=");
    if (eq >= 0) {
      const levelPart = pattern.slice(eq + 1).trim().toLowerCase();
      pattern = pattern.slice(0, eq).trim();
      if (VALID_LEVELS.has(levelPart)) {
        level = levelPart;
      } else if (levelPart.length > 0) {
        try {
          console.warn(
            `[logger] SPHERE_DEBUG entry "${rawEntry.trim()}": unknown level "${levelPart}" \u2014 falling back to "debug". Valid: trace, debug, info, warn, error.`
          );
        } catch {
        }
      }
    }
    if (!pattern) continue;
    if (!SPEC_PATTERN_RE.test(pattern)) {
      try {
        console.warn(`[logger] SPHERE_DEBUG entry has invalid pattern "${pattern}" \u2014 skipping`);
      } catch {
      }
      continue;
    }
    out.push({ pattern, level, negate });
  }
  return out;
}
function applySpec(state, spec) {
  const entries = parseSpec(spec);
  if (entries.length === 0) return;
  for (const entry of entries) {
    if (entry.pattern === "*" && !entry.negate) {
      state.debug = LEVEL_RANK[entry.level] <= LEVEL_RANK.debug;
      state.levels["*"] = entry.level;
      continue;
    }
    if (entry.negate) {
      state.levels[entry.pattern] = "warn";
    } else {
      state.levels[entry.pattern] = entry.level;
    }
  }
  state.timestamps = true;
}
function* namespaceAncestors(ns) {
  if (!ns) {
    yield "*";
    return;
  }
  let cursor = ns;
  while (true) {
    yield cursor;
    yield `${cursor}:*`;
    const idx = cursor.lastIndexOf(":");
    if (idx <= 0) break;
    cursor = cursor.slice(0, idx);
  }
  yield "*";
}
function resolveMinLevel(state, namespace) {
  for (const candidate of namespaceAncestors(namespace)) {
    const lvl = state.levels[candidate];
    if (lvl) return lvl;
  }
  if (namespace in state.tags) {
    return state.tags[namespace] ? "debug" : "warn";
  }
  return state.debug ? "debug" : "warn";
}
function isLevelEnabled(state, namespace, level) {
  if (LEVEL_RANK[level] >= ALWAYS_LEVEL_RANK) return true;
  const min = resolveMinLevel(state, namespace);
  return LEVEL_RANK[level] >= LEVEL_RANK[min];
}
var REDACT_KEYS = /* @__PURE__ */ new Set([
  // BIP-32 / BIP-39 / wallet secrets
  "privatekey",
  "private_key",
  "priv",
  "privkey",
  "priv_key",
  "masterkey",
  "master_key",
  "chaincode",
  "chain_code",
  "mnemonic",
  "seed",
  "seedphrase",
  "seed_phrase",
  "recoveryphrase",
  "recovery_phrase",
  "wif",
  "xpriv",
  "xprv",
  // Nostr / transport secrets
  "nsec",
  "nsechex",
  "nsec_hex",
  // Crypto material
  "keymaterial",
  "key_material",
  "rawkey",
  "raw_key",
  "keyhex",
  "key_hex",
  "signingkey",
  "signing_key",
  "attestkey",
  "attest_key",
  "hmackey",
  "hmac_key",
  "encryptionkey",
  "encryption_key",
  "ciphertext",
  "iv",
  "salt",
  "nonce",
  // IPFS / libp2p
  "peerid",
  "peer_id",
  "ipnskey",
  "ipns_key",
  "ipns_private_key",
  // Auth tokens
  "secret",
  "apikey",
  "api_key",
  "accesstoken",
  "access_token",
  "refreshtoken",
  "refresh_token",
  "sessiontoken",
  "session_token",
  "bearer",
  "authorization",
  "auth",
  "token",
  // Generic password
  "password",
  "passphrase"
]);
var REDACT_KEY_RE = new RegExp(
  "(?:^|[._-])(?:secret|priv|private|nsec|mnemonic|seed|password|passphrase|apikey|api_key|bearer|authorization|token|wif|xpriv|xprv|chaincode|masterkey|encryptionkey|hmackey|attestkey|peerid|ipnskey)(?:[._-]|$)|(?:^|[a-zA-Z])(?:Secret|Priv|Private|Nsec|Mnemonic|Seed|Password|Passphrase|ApiKey|Bearer|Authorization|Token|Wif|Xpriv|Xprv|ChainCode|MasterKey|EncryptionKey|HmacKey|AttestKey|PeerId|IpnsKey)|(?:^|[a-z])(?:priv|seed|nsec|mnemonic|password|secret|wallet|signing|encryption|chain|master|hmac|attest|peer|ipns|cipher|access|refresh|session|api|raw)(?:[A-Z][a-zA-Z]*)?(?:Key|Phrase|Token|Hex|Code|Text|Material)(?:[A-Z]|$|[._-])"
);
function shouldRedactKey(key) {
  const k = key.toLowerCase();
  if (REDACT_KEYS.has(k)) return true;
  return REDACT_KEY_RE.test(key);
}
var REDACTED = "[REDACTED]";
var REDACT_MAX_DEPTH = 8;
var REDACT_TRUNCATED = "[REDACTED:depth-exceeded]";
function redactFields(input) {
  const seen = /* @__PURE__ */ new WeakSet();
  return redactValue(input, 0, seen);
}
function redactValue(value, depth, seen) {
  if (value == null) return value;
  if (depth >= REDACT_MAX_DEPTH) return REDACT_TRUNCATED;
  if (Array.isArray(value)) {
    if (seen.has(value)) return REDACT_TRUNCATED;
    seen.add(value);
    return value.map((el) => redactValue(el, depth + 1, seen));
  }
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === "object") {
    const obj = value;
    if (seen.has(obj)) return REDACT_TRUNCATED;
    seen.add(obj);
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (shouldRedactKey(k)) {
        out[k] = REDACTED;
      } else {
        out[k] = redactValue(v, depth + 1, seen);
      }
    }
    return out;
  }
  return value;
}
function redactArgs(args) {
  if (args.length === 0) return args;
  const seen = /* @__PURE__ */ new WeakSet();
  return args.map((a) => redactValue(a, 0, seen));
}
function pad(level) {
  switch (level) {
    case "trace":
      return "TRACE";
    case "debug":
      return "DEBUG";
    case "info":
      return "INFO ";
    case "warn":
      return "WARN ";
    case "error":
      return "ERROR";
  }
}
function escapeControlChars(s) {
  if (typeof s !== "string") return String(s);
  if (!/[\x00-\x1f\x7f]/.test(s)) return s;
  return s.replace(/[\x00-\x1f\x7f]/g, (c) => {
    const code = c.charCodeAt(0);
    if (code === 10) return "\\n";
    if (code === 13) return "\\r";
    if (code === 9) return "\\t";
    if (code === 27) return "\\x1b";
    return `\\x${code.toString(16).padStart(2, "0")}`;
  });
}
function formatRecord(state, record) {
  const wantTs = state.timestamps === true;
  const ts = wantTs ? `[${new Date(record.ts).toISOString()}] ` : "";
  const level = wantTs ? `[${pad(record.level)}] ` : "";
  const ns = `[${escapeControlChars(record.namespace)}]`;
  const safeMessage = escapeControlChars(record.message);
  let msg = `${ts}${level}${ns} ${safeMessage}`;
  if (record.fields && Object.keys(record.fields).length > 0) {
    try {
      msg += ` ${JSON.stringify(record.fields)}`;
    } catch {
      msg += " [unserializable fields]";
    }
  }
  return msg;
}
var CONSOLE_SINK = {
  write(record, formatted) {
    const state = getState();
    const legacy = record.fields === void 0 && state.timestamps !== true;
    const target = record.level === "error" ? console.error : record.level === "warn" ? console.warn : console.log;
    if (legacy) {
      const prefix = `[${record.namespace}]`;
      if (record.args && record.args.length > 0) target(prefix, record.message, ...record.args);
      else target(prefix, record.message);
    } else {
      if (record.args && record.args.length > 0) target(formatted, ...record.args);
      else target(formatted);
    }
  }
};
function emit(state, level, namespace, message, fields, args) {
  const safeFields = fields && state.redaction ? redactFields(fields) : fields;
  const safeArgs = args.length && state.redaction ? redactArgs(args) : args;
  const record = {
    ts: Date.now(),
    level,
    namespace,
    message,
    fields: safeFields,
    args: safeArgs.length > 0 ? safeArgs : void 0
  };
  if (state.handler) {
    const downgraded = level === "warn" || level === "error" ? level : "debug";
    state.handler(downgraded, namespace, message, ...record.args ?? []);
    return;
  }
  const sinks = state.sinks.length > 0 ? state.sinks : [CONSOLE_SINK];
  const formatted = formatRecord(state, record);
  for (const sink of sinks) {
    try {
      sink.write(record, formatted);
    } catch (err) {
      try {
        console.error("[logger] sink threw", err);
      } catch {
      }
    }
  }
}
function now() {
  try {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now();
    }
  } catch {
  }
  return Date.now();
}
function makeSpan(state, namespace, spanName, initialFields) {
  const start = now();
  const marks = [];
  let ended = false;
  return {
    mark(label, fields) {
      if (ended) return;
      marks.push({ label, elapsedMs: Math.round((now() - start) * 1e3) / 1e3, fields });
    },
    elapsed() {
      return Math.round((now() - start) * 1e3) / 1e3;
    },
    end(extraFields) {
      if (ended) return 0;
      ended = true;
      const dur = Math.round((now() - start) * 1e3) / 1e3;
      if (!isLevelEnabled(state, namespace, "debug")) return dur;
      const fields = {
        ...initialFields ?? {},
        ...extraFields ?? {},
        spanName,
        durationMs: dur
      };
      if (marks.length > 0) fields.marks = marks;
      emit(state, "debug", namespace, `span.end ${spanName}`, fields, []);
      return dur;
    },
    endWithError(err, extraFields) {
      if (ended) return 0;
      ended = true;
      const dur = Math.round((now() - start) * 1e3) / 1e3;
      const fields = {
        ...initialFields ?? {},
        ...extraFields ?? {},
        spanName,
        durationMs: dur,
        err: err instanceof Error ? `${err.name}: ${err.message}` : String(err)
      };
      if (marks.length > 0) fields.marks = marks;
      emit(state, "warn", namespace, `span.error ${spanName}`, fields, []);
      return dur;
    }
  };
}
var logger = {
  configure(config) {
    const state = getState();
    if (config.debug !== void 0) {
      state.debug = config.debug;
    }
    if (config.handler !== void 0) state.handler = config.handler;
    if (config.timestamps !== void 0) state.timestamps = config.timestamps;
    if (config.redaction !== void 0) state.redaction = config.redaction;
  },
  setTagDebug(tag, enabled) {
    getState().tags[tag] = enabled;
  },
  clearTagDebug(tag) {
    delete getState().tags[tag];
  },
  isDebugEnabled(tag) {
    const state = getState();
    if (tag) return isLevelEnabled(state, tag, "debug");
    return state.debug || Object.values(state.levels).some((l) => LEVEL_RANK[l] <= LEVEL_RANK.debug);
  },
  /** Legacy single-tag debug. Keeps the `tag, message, ...args` signature. */
  debug(tag, message, ...args) {
    const state = getState();
    if (!isLevelEnabled(state, tag, "debug")) return;
    emit(state, "debug", tag, message, void 0, args);
  },
  /** Legacy single-tag info — promoted alias for `debug`. */
  info(tag, message, ...args) {
    const state = getState();
    if (!isLevelEnabled(state, tag, "info")) return;
    emit(state, "info", tag, message, void 0, args);
  },
  /** Legacy single-tag trace — gated by trace-or-lower namespace level. */
  trace(tag, message, ...args) {
    const state = getState();
    if (!isLevelEnabled(state, tag, "trace")) return;
    emit(state, "trace", tag, message, void 0, args);
  },
  warn(tag, message, ...args) {
    emit(getState(), "warn", tag, message, void 0, args);
  },
  error(tag, message, ...args) {
    emit(getState(), "error", tag, message, void 0, args);
  },
  /** Per-tag span helper — same as `getLogger(tag).time(...)`. */
  time(tag, spanName, initialFields) {
    return makeSpan(getState(), tag, spanName, initialFields);
  },
  /** Reset all logger state. Primarily for tests. */
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
  /**
   * Issue #275 — persistent dedup for Nostr wallet event IDs that have
   * been SUCCESSFULLY processed (cursor advanced). Keyed per pubkey;
   * stored as a JSON string array bounded by
   * `LIMITS.PROCESSED_EVENT_IDS_CAP` (FIFO eviction).
   *
   * Distinct from in-memory `inFlightEventIds`: this set persists across
   * process restarts so cross-process CLI invocations don't re-walk the
   * full relay backlog. At-least-once is preserved because we ONLY add
   * to this set after the event's cursor was advanced (durability ok
   * or replay budget exhausted), never after a transient failure.
   */
  PROCESSED_WALLET_EVENT_IDS: "processed_wallet_event_ids",
  /**
   * Issue #275 — persistent durability-cooldown ledger for
   * TOKEN_TRANSFER events. Tracks `attempts` and `nextRetryAt` across
   * process restarts so the bounded replay budget
   * (`DURABILITY_MAX_REPLAY_ATTEMPTS = 3`) accumulates across CLI
   * invocations rather than resetting per-process.
   */
  FAILED_EVENT_COOLDOWNS: "failed_event_cooldowns",
  /**
   * Issue #275 — persistent dedup set for the MultiAddressTransportMux
   * level. The Mux maintains its own `processedEventIds` (independent
   * of NostrTransportProvider's set) and dispatches to per-address
   * adapters. Without persistence, every fresh CLI invocation
   * re-walked the relay backlog through the Mux path as well as the
   * outer-provider path. Bounded by `LIMITS.PROCESSED_EVENT_IDS_CAP`.
   * Per-wallet storage scope: each Sphere instance has its own
   * `storage` provider, so a bare global key is sufficient (no
   * per-pubkey suffix needed because the Mux spans all per-wallet
   * addresses).
   */
  MUX_PROCESSED_EVENT_IDS: "mux_processed_event_ids",
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
  PROFILE_PENDING_PUBLISH_CID: "profile_pending_publish_cid",
  /**
   * Issue #313 — local snapshot blob for cold-boot lazy load. Holds the
   * most recent in-memory state (identity, tokens, bundles, pointer,
   * timestamps) so the next cold boot can render the wallet UI from
   * local cache BEFORE connecting to aggregator / remote IPFS. Atomically
   * replaced after every successful flush + publish and on graceful
   * shutdown. Per-address suffix appended by the Profile provider
   * (`<key>_<addressId>`).
   *
   * A companion key `<key>_<addressId>_pending` is written first; the
   * swap to the main key happens via `setMany` (or a sequential fallback
   * with explicit cleanup). Crash mid-write leaves the previous main
   * key intact.
   */
  PROFILE_SNAPSHOT_BLOB: "profile_snapshot_blob",
  /**
   * Issue #313 — last-known aggregator pointer for cold-boot priming.
   * Mirrors the `pointer` field embedded in the snapshot blob so the
   * boot path can short-circuit a pointer fetch when the cached version
   * matches what the aggregator now exposes. Per-address suffix appended
   * by the Profile provider (`<key>_<addressId>`).
   *
   * Stored as JSON: `{ version: number, cid: string, epoch?: number, ts: number }`.
   */
  PROFILE_LAST_POINTER: "profile_last_pointer"
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
  /**
   * Issue #378 (#275 P4) — persistent ledger of V6-RECOVER permanent
   * verdicts. When `finalizeStrandedReceivedToken` hits
   * `permanent recipient-address mismatch (HD-index recovery exhausted)`
   * or `permanent structural failure`, the tokenId is recorded here
   * with the verdict reason + timestamp.
   *
   * Read by `drainPendingFinalizations` (and the V6-RECOVER stranded
   * scan at `handleStrandedReceive`) so subsequent `sphere balance` /
   * `sphere payments receive` invocations skip the 60s drain timeout
   * for already-failed tokens.
   *
   * Cleared by `Sphere.clear()` (full wallet wipe) and by an explicit
   * `payments receive --finalize` (operator-forced retry — gives the
   * token one more shot at finalization in case the HD-index window
   * has since widened).
   */
  V6_RECOVER_PERMANENT: "v6_recover_permanent",
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WebSocketClientTransport,
  WebSocketServerTransport,
  WebSocketTransport
});
//# sourceMappingURL=index.cjs.map