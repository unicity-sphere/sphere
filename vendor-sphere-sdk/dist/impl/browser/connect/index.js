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
var MAX_REDACT_DEPTH = 32;
function redactionMarkerFor(field, value) {
  if (value instanceof Uint8Array) {
    return `[REDACTED: ${field}(${value.byteLength}-bytes)]`;
  }
  if (typeof value === "object" && value !== null && "byteLength" in value && typeof value.byteLength === "number") {
    return `[REDACTED: ${field}(${value.byteLength}-bytes)]`;
  }
  if (typeof value === "string") {
    return `[REDACTED: ${field}(${value.length}-chars)]`;
  }
  return `[REDACTED: ${field}]`;
}
function redactValue2(value, visited, depth) {
  if (depth > MAX_REDACT_DEPTH) return "[REDACTED: depth-cap]";
  if (value === null || value === void 0) return value;
  const t = typeof value;
  if (t !== "object" && t !== "function") return value;
  let isError = false;
  try {
    isError = value instanceof Error;
  } catch {
    isError = false;
  }
  if (isError) {
    const errObj = value;
    const memoExisting = visited.get(errObj);
    if (memoExisting !== void 0) return memoExisting;
    let proto;
    try {
      proto = Object.getPrototypeOf(errObj);
    } catch {
      proto = Error.prototype;
    }
    const clone = Object.create(proto);
    visited.set(errObj, clone);
    let errName;
    try {
      errName = errObj.name;
    } catch {
      errName = "[REDACTED: getter-threw]";
    }
    if (errName !== void 0) clone.name = errName;
    let errMessage;
    try {
      errMessage = errObj.message;
    } catch {
      errMessage = "[REDACTED: getter-threw]";
    }
    if (errMessage !== void 0) clone.message = errMessage;
    let errStack;
    try {
      errStack = errObj.stack;
    } catch {
      errStack = "[REDACTED: getter-threw]";
    }
    if (errStack !== void 0) clone.stack = errStack;
    let errCause;
    try {
      errCause = errObj.cause;
    } catch {
      errCause = "[REDACTED: getter-threw]";
    }
    if (errCause !== void 0) {
      clone.cause = redactValue2(errCause, visited, depth + 1);
    }
    let keys;
    try {
      keys = Object.keys(errObj);
    } catch {
      return clone;
    }
    for (const key of keys) {
      if (key === "name" || key === "message" || key === "stack" || key === "cause") {
        continue;
      }
      let v;
      try {
        v = errObj[key];
      } catch {
        clone[key] = "[REDACTED: getter-threw]";
        continue;
      }
      if (REDACTED_FIELDS_SET.has(key)) {
        clone[key] = redactionMarkerFor(key, v);
      } else {
        clone[key] = redactValue2(v, visited, depth + 1);
      }
    }
    return clone;
  }
  let isU8 = false;
  try {
    isU8 = value instanceof Uint8Array;
  } catch {
    isU8 = false;
  }
  if (isU8) return value;
  let isArray = false;
  try {
    isArray = Array.isArray(value);
  } catch {
    isArray = false;
  }
  if (typeof value === "object") {
    const obj = value;
    const memo = visited.get(obj);
    if (memo !== void 0) return memo;
    if (isArray) {
      const arr = obj;
      const out2 = [];
      visited.set(obj, out2);
      let len = 0;
      try {
        len = arr.length;
      } catch {
        len = 0;
      }
      for (let i = 0; i < len; i++) {
        let item;
        try {
          item = arr[i];
        } catch {
          item = "[REDACTED: getter-threw]";
        }
        out2.push(redactValue2(item, visited, depth + 1));
      }
      return out2;
    }
    const out = {};
    visited.set(obj, out);
    let keys;
    try {
      keys = Object.keys(obj);
    } catch {
      return "[REDACTED: keys-threw]";
    }
    for (const key of keys) {
      let v;
      try {
        v = obj[key];
      } catch {
        out[key] = "[REDACTED: getter-threw]";
        continue;
      }
      if (REDACTED_FIELDS_SET.has(key)) {
        out[key] = redactionMarkerFor(key, v);
      } else {
        out[key] = redactValue2(v, visited, depth + 1);
      }
    }
    return out;
  }
  return value;
}
function redactCause(cause) {
  if (cause === void 0) return void 0;
  return redactValue2(cause, /* @__PURE__ */ new WeakMap(), 0);
}
var SphereError = class extends Error {
  code;
  /**
   * Eagerly-redacted forensic payload, read-only. Field names listed in
   * {@link REDACTED_FIELDS} are replaced with opaque markers. The original
   * `cause` (if any) is NOT retained on the instance — by the time this
   * error exists, the original bytes are already gone.
   *
   * Aliased to the native `Error.cause` getter so Sentry / pino /
   * `util.inspect` / explicit `error.cause` reads all see the SAME redacted
   * view.
   */
  context;
  constructor(message, code, cause) {
    const redacted = redactCause(cause);
    super(message, redacted !== void 0 ? { cause: redacted } : void 0);
    this.name = "SphereError";
    this.code = code;
    this.context = redacted;
  }
};

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
var HOST_READY_TYPE = "sphere-connect:host-ready";
var HOST_READY_TIMEOUT = 3e4;

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
function createRequestId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
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

// connect/client/ConnectClient.ts
var DEFAULT_TIMEOUT = 3e4;
var DEFAULT_INTENT_TIMEOUT = 12e4;
var ConnectClient = class {
  transport;
  dapp;
  requestedPermissions;
  timeout;
  intentTimeout;
  resumeSessionId;
  silent;
  sessionId = null;
  grantedPermissions = [];
  identity = null;
  connected = false;
  pendingRequests = /* @__PURE__ */ new Map();
  eventHandlers = /* @__PURE__ */ new Map();
  unsubscribeTransport = null;
  // Handshake resolver (one-shot)
  handshakeResolver = null;
  constructor(config) {
    this.transport = config.transport;
    this.dapp = config.dapp;
    this.requestedPermissions = config.permissions ?? [...ALL_PERMISSIONS];
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.intentTimeout = config.intentTimeout ?? DEFAULT_INTENT_TIMEOUT;
    this.resumeSessionId = config.resumeSessionId ?? null;
    this.silent = config.silent ?? false;
  }
  // ===========================================================================
  // Connection
  // ===========================================================================
  /** Connect to the wallet. Returns session info and public identity. */
  async connect() {
    this.unsubscribeTransport = this.transport.onMessage(this.handleMessage.bind(this));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.handshakeResolver = null;
        reject(new Error("Connection timeout"));
      }, this.timeout);
      this.handshakeResolver = { resolve, reject, timer };
      this.transport.send({
        ns: SPHERE_CONNECT_NAMESPACE,
        v: SPHERE_CONNECT_VERSION,
        type: "handshake",
        direction: "request",
        permissions: this.requestedPermissions,
        dapp: this.dapp,
        ...this.resumeSessionId ? { sessionId: this.resumeSessionId } : {},
        ...this.silent ? { silent: true } : {}
      });
    });
  }
  /** Disconnect from the wallet */
  async disconnect() {
    if (this.connected) {
      try {
        await this.query(RPC_METHODS.DISCONNECT);
      } catch {
      }
    }
    this.cleanup();
  }
  /** Whether currently connected */
  get isConnected() {
    return this.connected;
  }
  /** Granted permission scopes */
  get permissions() {
    return this.grantedPermissions;
  }
  /** Current session ID */
  get session() {
    return this.sessionId;
  }
  /** Public identity received during handshake */
  get walletIdentity() {
    return this.identity;
  }
  // ===========================================================================
  // Query (read data)
  // ===========================================================================
  /** Send a query request and return the result */
  async query(method, params) {
    if (!this.connected) throw new SphereError("Not connected", "NOT_INITIALIZED");
    const id = createRequestId();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Query timeout: ${method}`));
      }, this.timeout);
      this.pendingRequests.set(id, {
        resolve,
        reject,
        timer
      });
      this.transport.send({
        ns: SPHERE_CONNECT_NAMESPACE,
        v: SPHERE_CONNECT_VERSION,
        type: "request",
        id,
        method,
        params
      });
    });
  }
  // ===========================================================================
  // Intent (trigger wallet UI)
  // ===========================================================================
  /** Send an intent request. The wallet will open its UI for user confirmation. */
  async intent(action, params) {
    if (!this.connected) throw new SphereError("Not connected", "NOT_INITIALIZED");
    const id = createRequestId();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Intent timeout: ${action}`));
      }, this.intentTimeout);
      this.pendingRequests.set(id, {
        resolve,
        reject,
        timer
      });
      this.transport.send({
        ns: SPHERE_CONNECT_NAMESPACE,
        v: SPHERE_CONNECT_VERSION,
        type: "intent",
        id,
        action,
        params
      });
    });
  }
  // ===========================================================================
  // Events
  // ===========================================================================
  /** Subscribe to a wallet event. Returns unsubscribe function. */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, /* @__PURE__ */ new Set());
      if (this.connected) {
        this.query(RPC_METHODS.SUBSCRIBE, { event }).catch((err) => logger.debug("Connect", "Event subscription failed", err));
      }
    }
    this.eventHandlers.get(event).add(handler);
    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(event);
          if (this.connected) {
            this.query(RPC_METHODS.UNSUBSCRIBE, { event }).catch((err) => logger.debug("Connect", "Event unsubscription failed", err));
          }
        }
      }
    };
  }
  // ===========================================================================
  // Message Handling
  // ===========================================================================
  handleMessage(msg) {
    if (msg.type === "handshake" && msg.direction === "response") {
      this.handleHandshakeResponse(msg);
      return;
    }
    if (msg.type === "response") {
      this.handlePendingResponse(msg.id, msg.result, msg.error);
      return;
    }
    if (msg.type === "intent_result") {
      this.handlePendingResponse(msg.id, msg.result, msg.error);
      return;
    }
    if (msg.type === "event") {
      const handlers = this.eventHandlers.get(msg.event);
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(msg.data);
          } catch (err) {
            logger.debug("Connect", "Event handler error", err);
          }
        }
      }
    }
  }
  handleHandshakeResponse(msg) {
    if (!this.handshakeResolver) return;
    clearTimeout(this.handshakeResolver.timer);
    if (msg.sessionId && msg.identity) {
      this.sessionId = msg.sessionId;
      this.grantedPermissions = msg.permissions;
      this.identity = msg.identity;
      this.connected = true;
      this.handshakeResolver.resolve({
        sessionId: msg.sessionId,
        permissions: this.grantedPermissions,
        identity: msg.identity
      });
    } else {
      this.handshakeResolver.reject(new Error("Connection rejected by wallet"));
    }
    this.handshakeResolver = null;
  }
  handlePendingResponse(id, result, error) {
    const pending = this.pendingRequests.get(id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pendingRequests.delete(id);
    if (error) {
      const err = new Error(error.message);
      err.code = error.code;
      err.data = error.data;
      pending.reject(err);
    } else {
      pending.resolve(result);
    }
  }
  // ===========================================================================
  // Cleanup
  // ===========================================================================
  cleanup() {
    if (this.unsubscribeTransport) {
      this.unsubscribeTransport();
      this.unsubscribeTransport = null;
    }
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Disconnected"));
    }
    this.pendingRequests.clear();
    this.eventHandlers.clear();
    this.connected = false;
    this.sessionId = null;
    this.grantedPermissions = [];
    this.identity = null;
  }
};

// impl/browser/connect/PostMessageTransport.ts
var POPUP_CLOSE_CHECK_INTERVAL = 1e3;
var PostMessageTransport = class _PostMessageTransport {
  targetWindow;
  targetOrigin;
  allowedOrigins;
  handlers = /* @__PURE__ */ new Set();
  listener = null;
  popupCheckInterval = null;
  onPopupClosed = null;
  constructor(targetWindow, targetOrigin, allowedOrigins) {
    this.targetWindow = targetWindow;
    this.targetOrigin = targetOrigin;
    this.allowedOrigins = allowedOrigins ? new Set(allowedOrigins) : null;
    this.listener = (event) => {
      if (this.allowedOrigins && !this.allowedOrigins.has("*") && !this.allowedOrigins.has(event.origin)) {
        return;
      }
      if (!isSphereConnectMessage(event.data)) {
        return;
      }
      for (const handler of this.handlers) {
        try {
          handler(event.data);
        } catch {
        }
      }
    };
    window.addEventListener("message", this.listener);
  }
  // ===========================================================================
  // Factory Methods
  // ===========================================================================
  /**
   * Create transport for the HOST side (wallet).
   *
   * iframe mode: target = iframe.contentWindow
   * popup mode:  target = window.opener
   */
  static forHost(target, options) {
    const targetWindow = target instanceof HTMLIFrameElement ? target.contentWindow : target;
    const targetOrigin = options.allowedOrigins[0] === "*" ? "*" : options.allowedOrigins[0];
    return new _PostMessageTransport(targetWindow, targetOrigin, options.allowedOrigins);
  }
  /**
   * Create transport for the CLIENT side (dApp).
   *
   * iframe mode: target defaults to window.parent
   * popup mode:  target = popup window (from window.open())
   */
  static forClient(options) {
    const target = options?.target ?? window.parent;
    const targetOrigin = options?.targetOrigin ?? "*";
    const transport = new _PostMessageTransport(target, targetOrigin, null);
    if (options?.target && options.target !== window.parent) {
      transport.startPopupCloseDetection(options.target);
    }
    return transport;
  }
  // ===========================================================================
  // ConnectTransport Interface
  // ===========================================================================
  send(message) {
    try {
      this.targetWindow.postMessage(message, this.targetOrigin);
    } catch {
    }
  }
  onMessage(handler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
  destroy() {
    if (this.listener) {
      window.removeEventListener("message", this.listener);
      this.listener = null;
    }
    if (this.popupCheckInterval) {
      clearInterval(this.popupCheckInterval);
      this.popupCheckInterval = null;
    }
    this.handlers.clear();
  }
  // ===========================================================================
  // Popup Close Detection
  // ===========================================================================
  /** Register a callback for when the popup window closes */
  onClose(callback) {
    this.onPopupClosed = callback;
  }
  startPopupCloseDetection(popup) {
    this.popupCheckInterval = setInterval(() => {
      if (popup.closed) {
        if (this.popupCheckInterval) {
          clearInterval(this.popupCheckInterval);
          this.popupCheckInterval = null;
        }
        if (this.onPopupClosed) {
          this.onPopupClosed();
        }
      }
    }, POPUP_CLOSE_CHECK_INTERVAL);
  }
};

// impl/browser/connect/ExtensionTransport.ts
var EXT_MSG_TO_HOST = "sphere-connect-ext:tohost";
var EXT_MSG_TO_CLIENT = "sphere-connect-ext:toclient";
function isExtensionConnectEnvelope(data) {
  return typeof data === "object" && data !== null && "type" in data && (data.type === EXT_MSG_TO_HOST || data.type === EXT_MSG_TO_CLIENT) && "payload" in data && isSphereConnectMessage(data.payload);
}
var ExtensionClientTransport = class {
  handlers = /* @__PURE__ */ new Set();
  listener = null;
  constructor() {
    this.listener = (event) => {
      if (!isExtensionConnectEnvelope(event.data)) return;
      if (event.data.type !== EXT_MSG_TO_CLIENT) return;
      for (const handler of this.handlers) {
        try {
          handler(event.data.payload);
        } catch {
        }
      }
    };
    window.addEventListener("message", this.listener);
  }
  send(message) {
    const envelope = {
      type: EXT_MSG_TO_HOST,
      payload: message
    };
    window.postMessage(envelope, "*");
  }
  onMessage(handler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
  destroy() {
    if (this.listener) {
      window.removeEventListener("message", this.listener);
      this.listener = null;
    }
    this.handlers.clear();
  }
};
var ExtensionHostTransport = class {
  handlers = /* @__PURE__ */ new Set();
  // tabId of the currently connected dApp tab (used to send responses back)
  activeTabId = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chromeListener = null;
  chromeApi;
  constructor(chromeApi) {
    this.chromeApi = chromeApi;
    this.chromeListener = (message, sender) => {
      if (!isExtensionConnectEnvelope(message)) return;
      if (message.type !== EXT_MSG_TO_HOST) return;
      if (sender.tab?.id !== void 0) {
        this.activeTabId = sender.tab.id;
      }
      const payload = message.payload;
      for (const handler of this.handlers) {
        try {
          handler(payload);
        } catch {
        }
      }
    };
    this.chromeApi.onMessage.addListener(this.chromeListener);
  }
  send(message) {
    if (this.activeTabId === null) return;
    const envelope = {
      type: EXT_MSG_TO_CLIENT,
      payload: message
    };
    try {
      this.chromeApi.tabs.sendMessage(this.activeTabId, envelope);
    } catch {
    }
  }
  onMessage(handler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
  destroy() {
    if (this.chromeListener) {
      this.chromeApi.onMessage.removeListener(this.chromeListener);
      this.chromeListener = null;
    }
    this.handlers.clear();
    this.activeTabId = null;
  }
};
var ExtensionTransport = {
  /**
   * Create transport for the CLIENT side (dApp page / inject script).
   * Sends via window.postMessage; receives via window.postMessage from content script.
   */
  forClient() {
    return new ExtensionClientTransport();
  },
  /**
   * Create transport for the HOST side (extension background service worker).
   * Receives via chrome.runtime.onMessage; sends via chrome.tabs.sendMessage.
   *
   * @param chromeApi - Pass `chrome` from the extension background context,
   *   or a mock for unit tests.
   */
  forHost(chromeApi) {
    return new ExtensionHostTransport(chromeApi);
  }
};

// impl/browser/connect/autoConnect.ts
function isInIframe() {
  try {
    return window.parent !== window && window.self !== window.top;
  } catch {
    return true;
  }
}
function hasExtension() {
  try {
    const sphere = window.sphere;
    if (!sphere || typeof sphere !== "object") return false;
    const isInstalled = sphere.isInstalled;
    if (typeof isInstalled !== "function") return false;
    return isInstalled() === true;
  } catch {
    return false;
  }
}
function detectTransport() {
  if (isInIframe()) return "iframe";
  if (hasExtension()) return "extension";
  return "popup";
}
var DEFAULT_POPUP_FEATURES = "width=420,height=720,scrollbars=yes,resizable=yes";
async function autoConnect(config) {
  const transportType = config.forceTransport ?? detectTransport();
  switch (transportType) {
    case "iframe":
      return connectViaIframe(config);
    case "extension":
      return connectViaExtension(config);
    case "popup":
      return connectViaPopup(config);
  }
}
async function connectViaIframe(config) {
  const transport = PostMessageTransport.forClient();
  const { client, connection, cleanup } = await createAndConnect(transport, config);
  return {
    client,
    connection,
    transport: "iframe",
    disconnect: async () => {
      await client.disconnect();
      cleanup();
    }
  };
}
async function connectViaExtension(config) {
  const transport = ExtensionTransport.forClient();
  const { client, connection, cleanup } = await createAndConnect(transport, config);
  return {
    client,
    connection,
    transport: "extension",
    disconnect: async () => {
      await client.disconnect();
      cleanup();
    }
  };
}
async function connectViaPopup(config) {
  if (!config.walletUrl) {
    throw new Error("autoConnect: walletUrl is required when no extension or iframe is available");
  }
  const origin = encodeURIComponent(window.location.origin);
  const popupUrl = `${config.walletUrl}/connect?origin=${origin}`;
  const features = config.popupFeatures ?? DEFAULT_POPUP_FEATURES;
  const popup = window.open(popupUrl, "sphere-wallet", features);
  if (!popup) {
    throw new Error("autoConnect: Failed to open wallet popup \u2014 check popup blocker settings");
  }
  await waitForHostReady(popup, config.walletUrl);
  const transport = PostMessageTransport.forClient({
    target: popup,
    targetOrigin: config.walletUrl
  });
  const { client, connection, cleanup } = await createAndConnect(transport, config);
  const closeCheckInterval = setInterval(() => {
    if (popup.closed) {
      clearInterval(closeCheckInterval);
      cleanup();
    }
  }, 1e3);
  return {
    client,
    connection,
    transport: "popup",
    disconnect: async () => {
      clearInterval(closeCheckInterval);
      await client.disconnect();
      cleanup();
      if (!popup.closed) popup.close();
    }
  };
}
function waitForHostReady(popup, walletOrigin) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener("message", listener);
      reject(new Error("autoConnect: Wallet popup did not respond in time"));
    }, HOST_READY_TIMEOUT);
    function listener(event) {
      if (event.data?.type === HOST_READY_TYPE) {
        clearTimeout(timer);
        window.removeEventListener("message", listener);
        resolve();
      }
    }
    window.addEventListener("message", listener);
    const closeCheck = setInterval(() => {
      if (popup.closed) {
        clearInterval(closeCheck);
        clearTimeout(timer);
        window.removeEventListener("message", listener);
        reject(new Error("autoConnect: Wallet popup was closed before connecting"));
      }
    }, 500);
  });
}
async function createAndConnect(transport, config) {
  const clientConfig = {
    transport,
    dapp: config.dapp,
    permissions: config.permissions,
    timeout: config.timeout,
    intentTimeout: config.intentTimeout,
    resumeSessionId: config.resumeSessionId,
    silent: config.silent
  };
  const client = new ConnectClient(clientConfig);
  try {
    const connection = await client.connect();
    return {
      client,
      connection,
      cleanup: () => transport.destroy()
    };
  } catch (err) {
    transport.destroy();
    throw err;
  }
}
export {
  EXT_MSG_TO_CLIENT,
  EXT_MSG_TO_HOST,
  ExtensionTransport,
  PostMessageTransport,
  autoConnect,
  detectTransport,
  hasExtension,
  isExtensionConnectEnvelope,
  isInIframe
};
//# sourceMappingURL=index.js.map