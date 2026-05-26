var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// core/logger.ts
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
var LOGGER_KEY, logger;
var init_logger = __esm({
  "core/logger.ts"() {
    "use strict";
    LOGGER_KEY = "__sphere_sdk_logger__";
    logger = {
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
  }
});

// core/hex.ts
function hexToBytes(hex) {
  if (typeof hex !== "string") {
    throw new TypeError(`hexToBytes: expected string, got ${typeof hex}`);
  }
  if (hex.length === 0) {
    throw new RangeError("hexToBytes: empty hex string");
  }
  if (hex.length % 2 !== 0) {
    throw new RangeError(`hexToBytes: odd-length hex string (${hex.length} chars)`);
  }
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new RangeError("hexToBytes: contains non-hex characters");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
function hexToBytesAllowEmpty(hex) {
  if (typeof hex !== "string") {
    throw new TypeError(`hexToBytesAllowEmpty: expected string, got ${typeof hex}`);
  }
  if (hex.length === 0) return new Uint8Array(0);
  if (hex.length % 2 !== 0) {
    throw new RangeError(`hexToBytesAllowEmpty: odd-length hex string (${hex.length} chars)`);
  }
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new RangeError("hexToBytesAllowEmpty: contains non-hex characters");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
var init_hex = __esm({
  "core/hex.ts"() {
    "use strict";
  }
});

// profile/errors.ts
var ProfileError;
var init_errors = __esm({
  "profile/errors.ts"() {
    "use strict";
    ProfileError = class extends Error {
      code;
      // Note: `cause` is inherited from `Error` when the options bag is used in
      // super(); we don't redeclare it as a class field (that would shadow the
      // native getter).
      constructor(code2, message, cause) {
        super(`[PROFILE:${code2}] ${message}`, cause !== void 0 ? { cause } : void 0);
        this.name = "ProfileError";
        this.code = code2;
      }
    };
  }
});

// profile/aggregator-pointer/errors.ts
var AggregatorPointerErrorCode, AggregatorPointerError;
var init_errors2 = __esm({
  "profile/aggregator-pointer/errors.ts"() {
    "use strict";
    AggregatorPointerErrorCode = {
      CONFLICT: "AGGREGATOR_POINTER_CONFLICT",
      STALE: "AGGREGATOR_POINTER_STALE",
      CORRUPT: "AGGREGATOR_POINTER_CORRUPT",
      NOT_FOUND: "AGGREGATOR_POINTER_NOT_FOUND",
      PARTIAL: "AGGREGATOR_POINTER_PARTIAL",
      REJECTED: "AGGREGATOR_POINTER_REJECTED",
      RETRY_EXHAUSTED: "AGGREGATOR_POINTER_RETRY_EXHAUSTED",
      CID_TOO_LARGE: "AGGREGATOR_POINTER_CID_TOO_LARGE",
      VERSION_OUT_OF_RANGE: "AGGREGATOR_POINTER_VERSION_OUT_OF_RANGE",
      DISCOVERY_OVERFLOW: "AGGREGATOR_POINTER_DISCOVERY_OVERFLOW",
      NETWORK_ERROR: "AGGREGATOR_POINTER_NETWORK_ERROR",
      UNTRUSTED_PROOF: "AGGREGATOR_POINTER_UNTRUSTED_PROOF",
      UNREACHABLE_RECOVERY_BLOCKED: "AGGREGATOR_POINTER_UNREACHABLE_RECOVERY_BLOCKED",
      MARKER_CORRUPT: "AGGREGATOR_POINTER_MARKER_CORRUPT",
      CAR_TOO_LARGE: "AGGREGATOR_POINTER_CAR_TOO_LARGE",
      CAR_FETCH_TIMEOUT: "AGGREGATOR_POINTER_CAR_FETCH_TIMEOUT",
      CAR_UNAVAILABLE: "AGGREGATOR_POINTER_CAR_UNAVAILABLE",
      CORRUPT_STREAK: "AGGREGATOR_POINTER_CORRUPT_STREAK",
      SECURITY_ORIGIN_MISMATCH: "SECURITY_ORIGIN_MISMATCH",
      UNSUPPORTED_RUNTIME: "AGGREGATOR_POINTER_UNSUPPORTED_RUNTIME",
      PUBLISH_BUSY: "AGGREGATOR_POINTER_PUBLISH_BUSY",
      TRUST_BASE_STALE: "AGGREGATOR_POINTER_TRUST_BASE_STALE",
      CAR_UNEXPECTED_ENCODING: "AGGREGATOR_POINTER_CAR_UNEXPECTED_ENCODING",
      AGGREGATOR_REJECTED: "AGGREGATOR_POINTER_AGGREGATOR_REJECTED",
      PROTOCOL_ERROR: "AGGREGATOR_POINTER_PROTOCOL_ERROR",
      WALKBACK_FLOOR: "AGGREGATOR_POINTER_WALKBACK_FLOOR",
      CAPABILITY_DENIED: "AGGREGATOR_POINTER_CAPABILITY_DENIED"
    };
    AggregatorPointerError = class extends Error {
      code;
      details;
      constructor(code2, message, details, options) {
        super(message ?? code2, options);
        this.name = "AggregatorPointerError";
        this.code = code2;
        this.details = details;
      }
    };
  }
});

// profile/aggregator-pointer/originated-tag.ts
function deriveOriginForType(entryType) {
  return SYSTEM_ACTION_SET.has(entryType) ? "system" : "user";
}
function assertOriginTagLocal(entryType, originated) {
  if (typeof originated !== "string") {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.SECURITY_ORIGIN_MISMATCH,
      `OpLog entry type "${entryType}" is missing the originated tag (fail-closed; SPEC \xA710.2.3).`,
      { entryType, originated }
    );
  }
  if (USER_ACTION_SET.has(entryType)) {
    if (originated !== "user") {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.SECURITY_ORIGIN_MISMATCH,
        `Local user-action entry type "${entryType}" must carry originated='user', got '${originated}'.`,
        { entryType, originated }
      );
    }
    return;
  }
  if (SYSTEM_ACTION_SET.has(entryType)) {
    if (originated !== "system") {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.SECURITY_ORIGIN_MISMATCH,
        `Local system entry type "${entryType}" must carry originated='system', got '${originated}'.`,
        { entryType, originated }
      );
    }
    return;
  }
  throw new AggregatorPointerError(
    AggregatorPointerErrorCode.SECURITY_ORIGIN_MISMATCH,
    `Unknown OpLog entry type "${entryType}" \u2014 cannot validate originated tag.`,
    { entryType, originated }
  );
}
function assertOriginTagReplicated(entryType, originated) {
  if (typeof originated !== "string") {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.SECURITY_ORIGIN_MISMATCH,
      `Replicated OpLog entry type "${entryType}" is missing the originated tag (fail-closed; SPEC \xA710.2.3).`,
      { entryType, originated }
    );
  }
  if (!USER_ACTION_SET.has(entryType) && !SYSTEM_ACTION_SET.has(entryType)) {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.SECURITY_ORIGIN_MISMATCH,
      `Unknown OpLog entry type "${entryType}" \u2014 cannot validate originated tag.`,
      { entryType, originated }
    );
  }
  if (originated !== "replicated") {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.SECURITY_ORIGIN_MISMATCH,
      `Replicated entry type "${entryType}" must carry originated='replicated', got '${originated}' \u2014 possible tag-forgery attempt.`,
      { entryType, originated }
    );
  }
}
function downgradeForReplication(entry) {
  if (entry.originated == null) {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.SECURITY_ORIGIN_MISMATCH,
      `downgradeForReplication: entry has no originated tag \u2014 protocol violation at replication edge (SPEC \xA710.2.3).`,
      { entry }
    );
  }
  return { ...entry, originated: "replicated" };
}
var USER_ACTION_TYPES, SYSTEM_ACTION_TYPES, ALL_ENTRY_TYPES, USER_ACTION_SET, SYSTEM_ACTION_SET;
var init_originated_tag = __esm({
  "profile/aggregator-pointer/originated-tag.ts"() {
    "use strict";
    init_errors2();
    USER_ACTION_TYPES = [
      "token_send",
      "token_receive",
      "nametag_register",
      "dm_send",
      "dm_receive",
      "invoice_mint",
      "invoice_pay",
      "invoice_close",
      "invoice_cancel",
      "swap_propose",
      "swap_accept",
      "swap_deposit"
    ];
    SYSTEM_ACTION_TYPES = [
      "session_receipt",
      "cache_index",
      "last_opened_ts"
    ];
    ALL_ENTRY_TYPES = Object.freeze([
      ...USER_ACTION_TYPES,
      ...SYSTEM_ACTION_TYPES
    ]);
    USER_ACTION_SET = new Set(USER_ACTION_TYPES);
    SYSTEM_ACTION_SET = new Set(SYSTEM_ACTION_TYPES);
    for (const t of USER_ACTION_TYPES) {
      if (SYSTEM_ACTION_SET.has(t)) {
        throw new Error(
          `originated-tag: BUG \u2014 "${t}" appears in both USER_ACTION_TYPES and SYSTEM_ACTION_TYPES`
        );
      }
    }
  }
});

// profile/oplog-entry.ts
import { decode as cborDecode, encode as cborEncode } from "@ipld/dag-cbor";
function encodeEntry(entry) {
  validateEnvelopeShape(entry);
  if (entry.v !== OPLOG_ENTRY_SCHEMA_VERSION) {
    throw new OpLogEntryCorrupt(
      `encodeEntry: refusing to encode synthetic legacy envelope (v=${entry.v}).`,
      { v: entry.v }
    );
  }
  const plain = {
    v: entry.v,
    type: entry.type,
    originated: entry.originated,
    ts: entry.ts,
    payload: new Uint8Array(entry.payload)
  };
  const bytes = cborEncode(plain);
  if (bytes.byteLength > MAX_ENVELOPE_BYTES) {
    throw new OpLogEntryCorrupt(
      `encodeEntry: encoded envelope ${bytes.byteLength} bytes exceeds MAX_ENVELOPE_BYTES=${MAX_ENVELOPE_BYTES}`,
      { envelopeBytes: bytes.byteLength }
    );
  }
  return bytes;
}
function decodeEntry(bytes) {
  if (bytes.byteLength > MAX_ENVELOPE_BYTES) {
    throw new OpLogEntryCorrupt(
      `OpLog entry input ${bytes.byteLength} bytes exceeds MAX_ENVELOPE_BYTES=${MAX_ENVELOPE_BYTES}.`,
      { inputBytes: bytes.byteLength }
    );
  }
  let decoded;
  try {
    decoded = cborDecode(bytes);
  } catch (err) {
    throw new OpLogEntryCorrupt(
      `OpLog entry CBOR decode failed: ${err instanceof Error ? err.message : String(err)}`,
      { cborError: true }
    );
  }
  if (decoded instanceof Uint8Array) {
    return wrapLegacyEntry(decoded);
  }
  if (decoded === null || typeof decoded !== "object" || Array.isArray(decoded)) {
    throw new OpLogEntryCorrupt(
      `OpLog entry decoded to unexpected shape ${Array.isArray(decoded) ? "array" : typeof decoded}.`,
      { decodedKind: Array.isArray(decoded) ? "array" : typeof decoded }
    );
  }
  const candidate = decoded;
  for (const key of Object.keys(candidate)) {
    if (!KNOWN_ENVELOPE_FIELDS.has(key)) {
      throw new OpLogEntryCorrupt(
        `OpLog entry has unexpected field "${key}"; envelope must carry only ${Array.from(KNOWN_ENVELOPE_FIELDS).join(", ")}.`,
        { unexpectedField: key }
      );
    }
  }
  if (candidate.v !== OPLOG_ENTRY_SCHEMA_VERSION) {
    throw new OpLogEntryCorrupt(
      `OpLog entry has unknown schema version ${String(candidate.v)} (expected ${OPLOG_ENTRY_SCHEMA_VERSION}).`,
      { v: candidate.v }
    );
  }
  return validateDecodedEnvelope(candidate);
}
function wrapLegacyEntry(bytes) {
  return {
    v: OPLOG_ENTRY_LEGACY_VERSION,
    type: "cache_index",
    // nominal classification; `v === 0` is the actual legacy marker
    originated: "system",
    ts: 0,
    // Defensive copy so callers cannot mutate the OrbitDB-decoded buffer.
    payload: new Uint8Array(bytes)
  };
}
function validateEnvelopeShape(entry) {
  if (entry.v !== OPLOG_ENTRY_SCHEMA_VERSION) {
    throw new OpLogEntryCorrupt(
      `encodeEntry: envelope must have v=${OPLOG_ENTRY_SCHEMA_VERSION}; got ${String(entry.v)}`,
      { v: entry.v }
    );
  }
  if (typeof entry.type !== "string" || !ALL_ENTRY_TYPES.includes(entry.type)) {
    throw new OpLogEntryCorrupt(`encodeEntry: invalid type "${String(entry.type)}"`, { type: entry.type });
  }
  if (entry.originated !== "user" && entry.originated !== "system" && entry.originated !== "replicated") {
    throw new OpLogEntryCorrupt(
      `encodeEntry: invalid originated "${String(entry.originated)}"`,
      { originated: entry.originated }
    );
  }
  if (typeof entry.ts !== "number" || !Number.isFinite(entry.ts) || !Number.isInteger(entry.ts) || entry.ts < MIN_PLAUSIBLE_TS) {
    throw new OpLogEntryCorrupt(
      `encodeEntry: ts must be integer >= ${MIN_PLAUSIBLE_TS} (2020-01-01); got ${String(entry.ts)}`,
      { ts: entry.ts, minPlausible: MIN_PLAUSIBLE_TS }
    );
  }
  if (!(entry.payload instanceof Uint8Array)) {
    throw new OpLogEntryCorrupt(`encodeEntry: payload must be Uint8Array`, {
      payloadType: typeof entry.payload
    });
  }
  if (entry.payload.byteLength > MAX_PAYLOAD_BYTES) {
    throw new OpLogEntryCorrupt(
      `encodeEntry: payload ${entry.payload.byteLength} bytes exceeds MAX_PAYLOAD_BYTES=${MAX_PAYLOAD_BYTES}`,
      { payloadBytes: entry.payload.byteLength }
    );
  }
}
function validateDecodedEnvelope(rec) {
  const t = rec.type;
  if (typeof t !== "string" || !ALL_ENTRY_TYPES.includes(t)) {
    throw new OpLogEntryCorrupt(`decodeEntry: invalid type "${String(t)}"`, { type: t });
  }
  const o = rec.originated;
  if (o !== "user" && o !== "system" && o !== "replicated") {
    throw new OpLogEntryCorrupt(`decodeEntry: invalid originated "${String(o)}"`, { originated: o });
  }
  const ts = rec.ts;
  if (typeof ts !== "number" || !Number.isFinite(ts) || !Number.isInteger(ts) || ts < MIN_PLAUSIBLE_TS) {
    throw new OpLogEntryCorrupt(`decodeEntry: invalid ts ${String(ts)} (must be integer >= ${MIN_PLAUSIBLE_TS})`, { ts });
  }
  const payload = rec.payload;
  if (!(payload instanceof Uint8Array)) {
    throw new OpLogEntryCorrupt(`decodeEntry: payload must be Uint8Array`, {
      payloadType: typeof payload
    });
  }
  if (payload.byteLength > MAX_PAYLOAD_BYTES) {
    throw new OpLogEntryCorrupt(
      `decodeEntry: payload ${payload.byteLength} bytes exceeds MAX_PAYLOAD_BYTES=${MAX_PAYLOAD_BYTES}`,
      { payloadBytes: payload.byteLength }
    );
  }
  return {
    v: OPLOG_ENTRY_SCHEMA_VERSION,
    type: t,
    originated: o,
    ts,
    // Defensive copy: `@ipld/dag-cbor` may return a Uint8Array that
    // aliases the input buffer. Caller-side mutation (e.g., zeroization
    // after decryption) would otherwise corrupt OrbitDB's internal state.
    payload: new Uint8Array(payload)
  };
}
function buildLocalEntry(params) {
  assertOriginTagLocal(params.type, params.originated);
  return {
    v: OPLOG_ENTRY_SCHEMA_VERSION,
    type: params.type,
    originated: params.originated,
    ts: params.ts ?? Date.now(),
    payload: params.payload
  };
}
function decodeAndDowngradeReplicated(bytes) {
  const candidate = decodeEntry(bytes);
  if (candidate.v === OPLOG_ENTRY_LEGACY_VERSION) {
    throw new OpLogEntryCorrupt(
      `Replication ingress rejected legacy-shaped envelope (v=0); peers cannot deliver pre-schema bytes.`,
      { v: candidate.v }
    );
  }
  const downgraded = downgradeForReplication(candidate);
  assertOriginTagReplicated(String(downgraded.type), downgraded.originated);
  return {
    v: OPLOG_ENTRY_SCHEMA_VERSION,
    type: downgraded.type ?? candidate.type,
    originated: "replicated",
    ts: typeof downgraded.ts === "number" ? downgraded.ts : candidate.ts,
    payload: downgraded.payload instanceof Uint8Array ? downgraded.payload : candidate.payload
  };
}
var OPLOG_ENTRY_SCHEMA_VERSION, OPLOG_ENTRY_LEGACY_VERSION, MAX_ENVELOPE_BYTES, MAX_PAYLOAD_BYTES, KNOWN_ENVELOPE_FIELDS, MIN_PLAUSIBLE_TS, OpLogEntryCorrupt;
var init_oplog_entry = __esm({
  "profile/oplog-entry.ts"() {
    "use strict";
    init_originated_tag();
    OPLOG_ENTRY_SCHEMA_VERSION = 1;
    OPLOG_ENTRY_LEGACY_VERSION = 0;
    MAX_ENVELOPE_BYTES = 256 * 1024;
    MAX_PAYLOAD_BYTES = 128 * 1024;
    KNOWN_ENVELOPE_FIELDS = /* @__PURE__ */ new Set(["v", "type", "originated", "ts", "payload"]);
    MIN_PLAUSIBLE_TS = 15778368e5;
    OpLogEntryCorrupt = class extends Error {
      name = "OpLogEntryCorrupt";
      details;
      constructor(message, details) {
        super(message);
        this.details = details;
      }
    };
  }
});

// profile/http-block-broker.ts
var http_block_broker_exports = {};
__export(http_block_broker_exports, {
  createHttpBlockBroker: () => createHttpBlockBroker
});
function normalizeGateway(url) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
function createHttpBlockBroker(config) {
  const fetchTimeoutMs = config.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const gateways = config.gateways.map(normalizeGateway);
  return () => ({
    name: "sphere-http-kubo-broker",
    async retrieve(cid, options) {
      if (gateways.length === 0) {
        throw new Error("sphere-http-kubo-broker: no gateways configured");
      }
      const cidString = cid.toString();
      const attempts = gateways.map(async (gateway) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), fetchTimeoutMs);
        const onCallerAbort = () => controller.abort();
        if (options?.signal) {
          if (options.signal.aborted) controller.abort();
          else options.signal.addEventListener("abort", onCallerAbort);
        }
        try {
          const url = `${gateway}/api/v0/block/get?arg=${encodeURIComponent(cidString)}`;
          const response = await fetch(url, { method: "POST", signal: controller.signal });
          if (!response.ok) {
            throw new Error(
              `HTTP ${response.status} ${response.statusText} from ${gateway} for CID ${cidString}`
            );
          }
          const arrayBuf = await response.arrayBuffer();
          return new Uint8Array(arrayBuf);
        } finally {
          clearTimeout(timer);
          if (options?.signal) options.signal.removeEventListener("abort", onCallerAbort);
        }
      });
      return await Promise.any(attempts);
    }
    // `announce` is a no-op — pin durability is handled separately
    // by the flush-scheduler in profile/ipfs-client.ts.
  });
}
var DEFAULT_FETCH_TIMEOUT_MS;
var init_http_block_broker = __esm({
  "profile/http-block-broker.ts"() {
    "use strict";
    DEFAULT_FETCH_TIMEOUT_MS = 1e4;
  }
});

// node_modules/@noble/hashes/utils.js
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function anumber(n, title = "") {
  if (!Number.isSafeInteger(n) || n < 0) {
    const prefix = title && `"${title}" `;
    throw new Error(`${prefix}expected integer >= 0, got ${n}`);
  }
}
function abytes(value, length, title = "") {
  const bytes = isBytes(value);
  const len = value?.length;
  const needsLen = length !== void 0;
  if (!bytes || needsLen && len !== length) {
    const prefix = title && `"${title}" `;
    const ofLen = needsLen ? ` of length ${length}` : "";
    const got = bytes ? `length=${len}` : `type=${typeof value}`;
    throw new Error(prefix + "expected Uint8Array" + ofLen + ", got " + got);
  }
  return value;
}
function ahash(h) {
  if (typeof h !== "function" || typeof h.create !== "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  anumber(h.outputLen);
  anumber(h.blockLen);
}
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function aoutput(out, instance) {
  abytes(out, void 0, "digestInto() output");
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error('"digestInto() output" expected to be of length >=' + min);
  }
}
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
function createView(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
function rotr(word, shift) {
  return word << 32 - shift | word >>> shift;
}
function bytesToHex(bytes) {
  abytes(bytes);
  if (hasHexBuiltin)
    return bytes.toHex();
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += hexes[bytes[i]];
  }
  return hex;
}
function asciiToBase16(ch) {
  if (ch >= asciis._0 && ch <= asciis._9)
    return ch - asciis._0;
  if (ch >= asciis.A && ch <= asciis.F)
    return ch - (asciis.A - 10);
  if (ch >= asciis.a && ch <= asciis.f)
    return ch - (asciis.a - 10);
  return;
}
function hexToBytes2(hex) {
  if (typeof hex !== "string")
    throw new Error("hex string expected, got " + typeof hex);
  if (hasHexBuiltin)
    return Uint8Array.fromHex(hex);
  const hl = hex.length;
  const al = hl / 2;
  if (hl % 2)
    throw new Error("hex string expected, got unpadded hex of length " + hl);
  const array = new Uint8Array(al);
  for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
    const n1 = asciiToBase16(hex.charCodeAt(hi));
    const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
    if (n1 === void 0 || n2 === void 0) {
      const char = hex[hi] + hex[hi + 1];
      throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
    }
    array[ai] = n1 * 16 + n2;
  }
  return array;
}
function utf8ToBytes(str) {
  if (typeof str !== "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(str));
}
function concatBytes(...arrays) {
  let sum = 0;
  for (let i = 0; i < arrays.length; i++) {
    const a = arrays[i];
    abytes(a);
    sum += a.length;
  }
  const res = new Uint8Array(sum);
  for (let i = 0, pad = 0; i < arrays.length; i++) {
    const a = arrays[i];
    res.set(a, pad);
    pad += a.length;
  }
  return res;
}
function createHasher(hashCons, info = {}) {
  const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
  const tmp = hashCons(void 0);
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = (opts) => hashCons(opts);
  Object.assign(hashC, info);
  return Object.freeze(hashC);
}
function randomBytes(bytesLength = 32) {
  const cr = typeof globalThis === "object" ? globalThis.crypto : null;
  if (typeof cr?.getRandomValues !== "function")
    throw new Error("crypto.getRandomValues must be defined");
  return cr.getRandomValues(new Uint8Array(bytesLength));
}
var hasHexBuiltin, hexes, asciis, oidNist;
var init_utils = __esm({
  "node_modules/@noble/hashes/utils.js"() {
    "use strict";
    hasHexBuiltin = /* @__PURE__ */ (() => (
      // @ts-ignore
      typeof Uint8Array.from([]).toHex === "function" && typeof Uint8Array.fromHex === "function"
    ))();
    hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
    asciis = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
    oidNist = (suffix) => ({
      oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, suffix])
    });
  }
});

// node_modules/@noble/hashes/_md.js
function Chi(a, b, c) {
  return a & b ^ ~a & c;
}
function Maj(a, b, c) {
  return a & b ^ a & c ^ b & c;
}
var HashMD, SHA256_IV, SHA224_IV, SHA384_IV, SHA512_IV;
var init_md = __esm({
  "node_modules/@noble/hashes/_md.js"() {
    "use strict";
    init_utils();
    HashMD = class {
      blockLen;
      outputLen;
      padOffset;
      isLE;
      // For partial updates less than block size
      buffer;
      view;
      finished = false;
      length = 0;
      pos = 0;
      destroyed = false;
      constructor(blockLen, outputLen, padOffset, isLE) {
        this.blockLen = blockLen;
        this.outputLen = outputLen;
        this.padOffset = padOffset;
        this.isLE = isLE;
        this.buffer = new Uint8Array(blockLen);
        this.view = createView(this.buffer);
      }
      update(data) {
        aexists(this);
        abytes(data);
        const { view, buffer, blockLen } = this;
        const len = data.length;
        for (let pos = 0; pos < len; ) {
          const take = Math.min(blockLen - this.pos, len - pos);
          if (take === blockLen) {
            const dataView = createView(data);
            for (; blockLen <= len - pos; pos += blockLen)
              this.process(dataView, pos);
            continue;
          }
          buffer.set(data.subarray(pos, pos + take), this.pos);
          this.pos += take;
          pos += take;
          if (this.pos === blockLen) {
            this.process(view, 0);
            this.pos = 0;
          }
        }
        this.length += data.length;
        this.roundClean();
        return this;
      }
      digestInto(out) {
        aexists(this);
        aoutput(out, this);
        this.finished = true;
        const { buffer, view, blockLen, isLE } = this;
        let { pos } = this;
        buffer[pos++] = 128;
        clean(this.buffer.subarray(pos));
        if (this.padOffset > blockLen - pos) {
          this.process(view, 0);
          pos = 0;
        }
        for (let i = pos; i < blockLen; i++)
          buffer[i] = 0;
        view.setBigUint64(blockLen - 8, BigInt(this.length * 8), isLE);
        this.process(view, 0);
        const oview = createView(out);
        const len = this.outputLen;
        if (len % 4)
          throw new Error("_sha2: outputLen must be aligned to 32bit");
        const outLen = len / 4;
        const state = this.get();
        if (outLen > state.length)
          throw new Error("_sha2: outputLen bigger than state");
        for (let i = 0; i < outLen; i++)
          oview.setUint32(4 * i, state[i], isLE);
      }
      digest() {
        const { buffer, outputLen } = this;
        this.digestInto(buffer);
        const res = buffer.slice(0, outputLen);
        this.destroy();
        return res;
      }
      _cloneInto(to) {
        to ||= new this.constructor();
        to.set(...this.get());
        const { blockLen, buffer, length, finished, destroyed, pos } = this;
        to.destroyed = destroyed;
        to.finished = finished;
        to.length = length;
        to.pos = pos;
        if (length % blockLen)
          to.buffer.set(buffer);
        return to;
      }
      clone() {
        return this._cloneInto();
      }
    };
    SHA256_IV = /* @__PURE__ */ Uint32Array.from([
      1779033703,
      3144134277,
      1013904242,
      2773480762,
      1359893119,
      2600822924,
      528734635,
      1541459225
    ]);
    SHA224_IV = /* @__PURE__ */ Uint32Array.from([
      3238371032,
      914150663,
      812702999,
      4144912697,
      4290775857,
      1750603025,
      1694076839,
      3204075428
    ]);
    SHA384_IV = /* @__PURE__ */ Uint32Array.from([
      3418070365,
      3238371032,
      1654270250,
      914150663,
      2438529370,
      812702999,
      355462360,
      4144912697,
      1731405415,
      4290775857,
      2394180231,
      1750603025,
      3675008525,
      1694076839,
      1203062813,
      3204075428
    ]);
    SHA512_IV = /* @__PURE__ */ Uint32Array.from([
      1779033703,
      4089235720,
      3144134277,
      2227873595,
      1013904242,
      4271175723,
      2773480762,
      1595750129,
      1359893119,
      2917565137,
      2600822924,
      725511199,
      528734635,
      4215389547,
      1541459225,
      327033209
    ]);
  }
});

// node_modules/@noble/hashes/_u64.js
function fromBig(n, le = false) {
  if (le)
    return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
  return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split(lst, le = false) {
  const len = lst.length;
  let Ah = new Uint32Array(len);
  let Al = new Uint32Array(len);
  for (let i = 0; i < len; i++) {
    const { h, l } = fromBig(lst[i], le);
    [Ah[i], Al[i]] = [h, l];
  }
  return [Ah, Al];
}
function add(Ah, Al, Bh, Bl) {
  const l = (Al >>> 0) + (Bl >>> 0);
  return { h: Ah + Bh + (l / 2 ** 32 | 0) | 0, l: l | 0 };
}
var U32_MASK64, _32n, shrSH, shrSL, rotrSH, rotrSL, rotrBH, rotrBL, add3L, add3H, add4L, add4H, add5L, add5H;
var init_u64 = __esm({
  "node_modules/@noble/hashes/_u64.js"() {
    "use strict";
    U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
    _32n = /* @__PURE__ */ BigInt(32);
    shrSH = (h, _l, s) => h >>> s;
    shrSL = (h, l, s) => h << 32 - s | l >>> s;
    rotrSH = (h, l, s) => h >>> s | l << 32 - s;
    rotrSL = (h, l, s) => h << 32 - s | l >>> s;
    rotrBH = (h, l, s) => h << 64 - s | l >>> s - 32;
    rotrBL = (h, l, s) => h >>> s - 32 | l << 64 - s;
    add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
    add3H = (low, Ah, Bh, Ch) => Ah + Bh + Ch + (low / 2 ** 32 | 0) | 0;
    add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
    add4H = (low, Ah, Bh, Ch, Dh) => Ah + Bh + Ch + Dh + (low / 2 ** 32 | 0) | 0;
    add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
    add5H = (low, Ah, Bh, Ch, Dh, Eh) => Ah + Bh + Ch + Dh + Eh + (low / 2 ** 32 | 0) | 0;
  }
});

// node_modules/@noble/hashes/sha2.js
var sha2_exports = {};
__export(sha2_exports, {
  _SHA224: () => _SHA224,
  _SHA256: () => _SHA256,
  _SHA384: () => _SHA384,
  _SHA512: () => _SHA512,
  _SHA512_224: () => _SHA512_224,
  _SHA512_256: () => _SHA512_256,
  sha224: () => sha224,
  sha256: () => sha256,
  sha384: () => sha384,
  sha512: () => sha512,
  sha512_224: () => sha512_224,
  sha512_256: () => sha512_256
});
var SHA256_K, SHA256_W, SHA2_32B, _SHA256, _SHA224, K512, SHA512_Kh, SHA512_Kl, SHA512_W_H, SHA512_W_L, SHA2_64B, _SHA512, _SHA384, T224_IV, T256_IV, _SHA512_224, _SHA512_256, sha256, sha224, sha512, sha384, sha512_256, sha512_224;
var init_sha2 = __esm({
  "node_modules/@noble/hashes/sha2.js"() {
    "use strict";
    init_md();
    init_u64();
    init_utils();
    SHA256_K = /* @__PURE__ */ Uint32Array.from([
      1116352408,
      1899447441,
      3049323471,
      3921009573,
      961987163,
      1508970993,
      2453635748,
      2870763221,
      3624381080,
      310598401,
      607225278,
      1426881987,
      1925078388,
      2162078206,
      2614888103,
      3248222580,
      3835390401,
      4022224774,
      264347078,
      604807628,
      770255983,
      1249150122,
      1555081692,
      1996064986,
      2554220882,
      2821834349,
      2952996808,
      3210313671,
      3336571891,
      3584528711,
      113926993,
      338241895,
      666307205,
      773529912,
      1294757372,
      1396182291,
      1695183700,
      1986661051,
      2177026350,
      2456956037,
      2730485921,
      2820302411,
      3259730800,
      3345764771,
      3516065817,
      3600352804,
      4094571909,
      275423344,
      430227734,
      506948616,
      659060556,
      883997877,
      958139571,
      1322822218,
      1537002063,
      1747873779,
      1955562222,
      2024104815,
      2227730452,
      2361852424,
      2428436474,
      2756734187,
      3204031479,
      3329325298
    ]);
    SHA256_W = /* @__PURE__ */ new Uint32Array(64);
    SHA2_32B = class extends HashMD {
      constructor(outputLen) {
        super(64, outputLen, 8, false);
      }
      get() {
        const { A, B, C, D, E, F, G, H } = this;
        return [A, B, C, D, E, F, G, H];
      }
      // prettier-ignore
      set(A, B, C, D, E, F, G, H) {
        this.A = A | 0;
        this.B = B | 0;
        this.C = C | 0;
        this.D = D | 0;
        this.E = E | 0;
        this.F = F | 0;
        this.G = G | 0;
        this.H = H | 0;
      }
      process(view, offset) {
        for (let i = 0; i < 16; i++, offset += 4)
          SHA256_W[i] = view.getUint32(offset, false);
        for (let i = 16; i < 64; i++) {
          const W15 = SHA256_W[i - 15];
          const W2 = SHA256_W[i - 2];
          const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
          const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
          SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
        }
        let { A, B, C, D, E, F, G, H } = this;
        for (let i = 0; i < 64; i++) {
          const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
          const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
          const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
          const T2 = sigma0 + Maj(A, B, C) | 0;
          H = G;
          G = F;
          F = E;
          E = D + T1 | 0;
          D = C;
          C = B;
          B = A;
          A = T1 + T2 | 0;
        }
        A = A + this.A | 0;
        B = B + this.B | 0;
        C = C + this.C | 0;
        D = D + this.D | 0;
        E = E + this.E | 0;
        F = F + this.F | 0;
        G = G + this.G | 0;
        H = H + this.H | 0;
        this.set(A, B, C, D, E, F, G, H);
      }
      roundClean() {
        clean(SHA256_W);
      }
      destroy() {
        this.set(0, 0, 0, 0, 0, 0, 0, 0);
        clean(this.buffer);
      }
    };
    _SHA256 = class extends SHA2_32B {
      // We cannot use array here since array allows indexing by variable
      // which means optimizer/compiler cannot use registers.
      A = SHA256_IV[0] | 0;
      B = SHA256_IV[1] | 0;
      C = SHA256_IV[2] | 0;
      D = SHA256_IV[3] | 0;
      E = SHA256_IV[4] | 0;
      F = SHA256_IV[5] | 0;
      G = SHA256_IV[6] | 0;
      H = SHA256_IV[7] | 0;
      constructor() {
        super(32);
      }
    };
    _SHA224 = class extends SHA2_32B {
      A = SHA224_IV[0] | 0;
      B = SHA224_IV[1] | 0;
      C = SHA224_IV[2] | 0;
      D = SHA224_IV[3] | 0;
      E = SHA224_IV[4] | 0;
      F = SHA224_IV[5] | 0;
      G = SHA224_IV[6] | 0;
      H = SHA224_IV[7] | 0;
      constructor() {
        super(28);
      }
    };
    K512 = /* @__PURE__ */ (() => split([
      "0x428a2f98d728ae22",
      "0x7137449123ef65cd",
      "0xb5c0fbcfec4d3b2f",
      "0xe9b5dba58189dbbc",
      "0x3956c25bf348b538",
      "0x59f111f1b605d019",
      "0x923f82a4af194f9b",
      "0xab1c5ed5da6d8118",
      "0xd807aa98a3030242",
      "0x12835b0145706fbe",
      "0x243185be4ee4b28c",
      "0x550c7dc3d5ffb4e2",
      "0x72be5d74f27b896f",
      "0x80deb1fe3b1696b1",
      "0x9bdc06a725c71235",
      "0xc19bf174cf692694",
      "0xe49b69c19ef14ad2",
      "0xefbe4786384f25e3",
      "0x0fc19dc68b8cd5b5",
      "0x240ca1cc77ac9c65",
      "0x2de92c6f592b0275",
      "0x4a7484aa6ea6e483",
      "0x5cb0a9dcbd41fbd4",
      "0x76f988da831153b5",
      "0x983e5152ee66dfab",
      "0xa831c66d2db43210",
      "0xb00327c898fb213f",
      "0xbf597fc7beef0ee4",
      "0xc6e00bf33da88fc2",
      "0xd5a79147930aa725",
      "0x06ca6351e003826f",
      "0x142929670a0e6e70",
      "0x27b70a8546d22ffc",
      "0x2e1b21385c26c926",
      "0x4d2c6dfc5ac42aed",
      "0x53380d139d95b3df",
      "0x650a73548baf63de",
      "0x766a0abb3c77b2a8",
      "0x81c2c92e47edaee6",
      "0x92722c851482353b",
      "0xa2bfe8a14cf10364",
      "0xa81a664bbc423001",
      "0xc24b8b70d0f89791",
      "0xc76c51a30654be30",
      "0xd192e819d6ef5218",
      "0xd69906245565a910",
      "0xf40e35855771202a",
      "0x106aa07032bbd1b8",
      "0x19a4c116b8d2d0c8",
      "0x1e376c085141ab53",
      "0x2748774cdf8eeb99",
      "0x34b0bcb5e19b48a8",
      "0x391c0cb3c5c95a63",
      "0x4ed8aa4ae3418acb",
      "0x5b9cca4f7763e373",
      "0x682e6ff3d6b2b8a3",
      "0x748f82ee5defb2fc",
      "0x78a5636f43172f60",
      "0x84c87814a1f0ab72",
      "0x8cc702081a6439ec",
      "0x90befffa23631e28",
      "0xa4506cebde82bde9",
      "0xbef9a3f7b2c67915",
      "0xc67178f2e372532b",
      "0xca273eceea26619c",
      "0xd186b8c721c0c207",
      "0xeada7dd6cde0eb1e",
      "0xf57d4f7fee6ed178",
      "0x06f067aa72176fba",
      "0x0a637dc5a2c898a6",
      "0x113f9804bef90dae",
      "0x1b710b35131c471b",
      "0x28db77f523047d84",
      "0x32caab7b40c72493",
      "0x3c9ebe0a15c9bebc",
      "0x431d67c49c100d4c",
      "0x4cc5d4becb3e42b6",
      "0x597f299cfc657e2a",
      "0x5fcb6fab3ad6faec",
      "0x6c44198c4a475817"
    ].map((n) => BigInt(n))))();
    SHA512_Kh = /* @__PURE__ */ (() => K512[0])();
    SHA512_Kl = /* @__PURE__ */ (() => K512[1])();
    SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
    SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
    SHA2_64B = class extends HashMD {
      constructor(outputLen) {
        super(128, outputLen, 16, false);
      }
      // prettier-ignore
      get() {
        const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
        return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
      }
      // prettier-ignore
      set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
        this.Ah = Ah | 0;
        this.Al = Al | 0;
        this.Bh = Bh | 0;
        this.Bl = Bl | 0;
        this.Ch = Ch | 0;
        this.Cl = Cl | 0;
        this.Dh = Dh | 0;
        this.Dl = Dl | 0;
        this.Eh = Eh | 0;
        this.El = El | 0;
        this.Fh = Fh | 0;
        this.Fl = Fl | 0;
        this.Gh = Gh | 0;
        this.Gl = Gl | 0;
        this.Hh = Hh | 0;
        this.Hl = Hl | 0;
      }
      process(view, offset) {
        for (let i = 0; i < 16; i++, offset += 4) {
          SHA512_W_H[i] = view.getUint32(offset);
          SHA512_W_L[i] = view.getUint32(offset += 4);
        }
        for (let i = 16; i < 80; i++) {
          const W15h = SHA512_W_H[i - 15] | 0;
          const W15l = SHA512_W_L[i - 15] | 0;
          const s0h = rotrSH(W15h, W15l, 1) ^ rotrSH(W15h, W15l, 8) ^ shrSH(W15h, W15l, 7);
          const s0l = rotrSL(W15h, W15l, 1) ^ rotrSL(W15h, W15l, 8) ^ shrSL(W15h, W15l, 7);
          const W2h = SHA512_W_H[i - 2] | 0;
          const W2l = SHA512_W_L[i - 2] | 0;
          const s1h = rotrSH(W2h, W2l, 19) ^ rotrBH(W2h, W2l, 61) ^ shrSH(W2h, W2l, 6);
          const s1l = rotrSL(W2h, W2l, 19) ^ rotrBL(W2h, W2l, 61) ^ shrSL(W2h, W2l, 6);
          const SUMl = add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
          const SUMh = add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
          SHA512_W_H[i] = SUMh | 0;
          SHA512_W_L[i] = SUMl | 0;
        }
        let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
        for (let i = 0; i < 80; i++) {
          const sigma1h = rotrSH(Eh, El, 14) ^ rotrSH(Eh, El, 18) ^ rotrBH(Eh, El, 41);
          const sigma1l = rotrSL(Eh, El, 14) ^ rotrSL(Eh, El, 18) ^ rotrBL(Eh, El, 41);
          const CHIh = Eh & Fh ^ ~Eh & Gh;
          const CHIl = El & Fl ^ ~El & Gl;
          const T1ll = add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
          const T1h = add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
          const T1l = T1ll | 0;
          const sigma0h = rotrSH(Ah, Al, 28) ^ rotrBH(Ah, Al, 34) ^ rotrBH(Ah, Al, 39);
          const sigma0l = rotrSL(Ah, Al, 28) ^ rotrBL(Ah, Al, 34) ^ rotrBL(Ah, Al, 39);
          const MAJh = Ah & Bh ^ Ah & Ch ^ Bh & Ch;
          const MAJl = Al & Bl ^ Al & Cl ^ Bl & Cl;
          Hh = Gh | 0;
          Hl = Gl | 0;
          Gh = Fh | 0;
          Gl = Fl | 0;
          Fh = Eh | 0;
          Fl = El | 0;
          ({ h: Eh, l: El } = add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
          Dh = Ch | 0;
          Dl = Cl | 0;
          Ch = Bh | 0;
          Cl = Bl | 0;
          Bh = Ah | 0;
          Bl = Al | 0;
          const All = add3L(T1l, sigma0l, MAJl);
          Ah = add3H(All, T1h, sigma0h, MAJh);
          Al = All | 0;
        }
        ({ h: Ah, l: Al } = add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
        ({ h: Bh, l: Bl } = add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
        ({ h: Ch, l: Cl } = add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
        ({ h: Dh, l: Dl } = add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
        ({ h: Eh, l: El } = add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
        ({ h: Fh, l: Fl } = add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
        ({ h: Gh, l: Gl } = add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
        ({ h: Hh, l: Hl } = add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
        this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
      }
      roundClean() {
        clean(SHA512_W_H, SHA512_W_L);
      }
      destroy() {
        clean(this.buffer);
        this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      }
    };
    _SHA512 = class extends SHA2_64B {
      Ah = SHA512_IV[0] | 0;
      Al = SHA512_IV[1] | 0;
      Bh = SHA512_IV[2] | 0;
      Bl = SHA512_IV[3] | 0;
      Ch = SHA512_IV[4] | 0;
      Cl = SHA512_IV[5] | 0;
      Dh = SHA512_IV[6] | 0;
      Dl = SHA512_IV[7] | 0;
      Eh = SHA512_IV[8] | 0;
      El = SHA512_IV[9] | 0;
      Fh = SHA512_IV[10] | 0;
      Fl = SHA512_IV[11] | 0;
      Gh = SHA512_IV[12] | 0;
      Gl = SHA512_IV[13] | 0;
      Hh = SHA512_IV[14] | 0;
      Hl = SHA512_IV[15] | 0;
      constructor() {
        super(64);
      }
    };
    _SHA384 = class extends SHA2_64B {
      Ah = SHA384_IV[0] | 0;
      Al = SHA384_IV[1] | 0;
      Bh = SHA384_IV[2] | 0;
      Bl = SHA384_IV[3] | 0;
      Ch = SHA384_IV[4] | 0;
      Cl = SHA384_IV[5] | 0;
      Dh = SHA384_IV[6] | 0;
      Dl = SHA384_IV[7] | 0;
      Eh = SHA384_IV[8] | 0;
      El = SHA384_IV[9] | 0;
      Fh = SHA384_IV[10] | 0;
      Fl = SHA384_IV[11] | 0;
      Gh = SHA384_IV[12] | 0;
      Gl = SHA384_IV[13] | 0;
      Hh = SHA384_IV[14] | 0;
      Hl = SHA384_IV[15] | 0;
      constructor() {
        super(48);
      }
    };
    T224_IV = /* @__PURE__ */ Uint32Array.from([
      2352822216,
      424955298,
      1944164710,
      2312950998,
      502970286,
      855612546,
      1738396948,
      1479516111,
      258812777,
      2077511080,
      2011393907,
      79989058,
      1067287976,
      1780299464,
      286451373,
      2446758561
    ]);
    T256_IV = /* @__PURE__ */ Uint32Array.from([
      573645204,
      4230739756,
      2673172387,
      3360449730,
      596883563,
      1867755857,
      2520282905,
      1497426621,
      2519219938,
      2827943907,
      3193839141,
      1401305490,
      721525244,
      746961066,
      246885852,
      2177182882
    ]);
    _SHA512_224 = class extends SHA2_64B {
      Ah = T224_IV[0] | 0;
      Al = T224_IV[1] | 0;
      Bh = T224_IV[2] | 0;
      Bl = T224_IV[3] | 0;
      Ch = T224_IV[4] | 0;
      Cl = T224_IV[5] | 0;
      Dh = T224_IV[6] | 0;
      Dl = T224_IV[7] | 0;
      Eh = T224_IV[8] | 0;
      El = T224_IV[9] | 0;
      Fh = T224_IV[10] | 0;
      Fl = T224_IV[11] | 0;
      Gh = T224_IV[12] | 0;
      Gl = T224_IV[13] | 0;
      Hh = T224_IV[14] | 0;
      Hl = T224_IV[15] | 0;
      constructor() {
        super(28);
      }
    };
    _SHA512_256 = class extends SHA2_64B {
      Ah = T256_IV[0] | 0;
      Al = T256_IV[1] | 0;
      Bh = T256_IV[2] | 0;
      Bl = T256_IV[3] | 0;
      Ch = T256_IV[4] | 0;
      Cl = T256_IV[5] | 0;
      Dh = T256_IV[6] | 0;
      Dl = T256_IV[7] | 0;
      Eh = T256_IV[8] | 0;
      El = T256_IV[9] | 0;
      Fh = T256_IV[10] | 0;
      Fl = T256_IV[11] | 0;
      Gh = T256_IV[12] | 0;
      Gl = T256_IV[13] | 0;
      Hh = T256_IV[14] | 0;
      Hl = T256_IV[15] | 0;
      constructor() {
        super(32);
      }
    };
    sha256 = /* @__PURE__ */ createHasher(
      () => new _SHA256(),
      /* @__PURE__ */ oidNist(1)
    );
    sha224 = /* @__PURE__ */ createHasher(
      () => new _SHA224(),
      /* @__PURE__ */ oidNist(4)
    );
    sha512 = /* @__PURE__ */ createHasher(
      () => new _SHA512(),
      /* @__PURE__ */ oidNist(3)
    );
    sha384 = /* @__PURE__ */ createHasher(
      () => new _SHA384(),
      /* @__PURE__ */ oidNist(2)
    );
    sha512_256 = /* @__PURE__ */ createHasher(
      () => new _SHA512_256(),
      /* @__PURE__ */ oidNist(6)
    );
    sha512_224 = /* @__PURE__ */ createHasher(
      () => new _SHA512_224(),
      /* @__PURE__ */ oidNist(5)
    );
  }
});

// node_modules/@noble/curves/utils.js
function abool(value, title = "") {
  if (typeof value !== "boolean") {
    const prefix = title && `"${title}" `;
    throw new Error(prefix + "expected boolean, got type=" + typeof value);
  }
  return value;
}
function abignumber(n) {
  if (typeof n === "bigint") {
    if (!isPosBig(n))
      throw new Error("positive bigint expected, got " + n);
  } else
    anumber(n);
  return n;
}
function asafenumber(value, title = "") {
  if (!Number.isSafeInteger(value)) {
    const prefix = title && `"${title}" `;
    throw new Error(prefix + "expected safe integer, got type=" + typeof value);
  }
}
function numberToHexUnpadded(num2) {
  const hex = abignumber(num2).toString(16);
  return hex.length & 1 ? "0" + hex : hex;
}
function hexToNumber(hex) {
  if (typeof hex !== "string")
    throw new Error("hex string expected, got " + typeof hex);
  return hex === "" ? _0n : BigInt("0x" + hex);
}
function bytesToNumberBE(bytes) {
  return hexToNumber(bytesToHex(bytes));
}
function bytesToNumberLE(bytes) {
  return hexToNumber(bytesToHex(copyBytes(abytes(bytes)).reverse()));
}
function numberToBytesBE(n, len) {
  anumber(len);
  n = abignumber(n);
  const res = hexToBytes2(n.toString(16).padStart(len * 2, "0"));
  if (res.length !== len)
    throw new Error("number too large");
  return res;
}
function numberToBytesLE(n, len) {
  return numberToBytesBE(n, len).reverse();
}
function copyBytes(bytes) {
  return Uint8Array.from(bytes);
}
function asciiToBytes(ascii) {
  return Uint8Array.from(ascii, (c, i) => {
    const charCode = c.charCodeAt(0);
    if (c.length !== 1 || charCode > 127) {
      throw new Error(`string contains non-ASCII character "${ascii[i]}" with code ${charCode} at position ${i}`);
    }
    return charCode;
  });
}
function inRange(n, min, max) {
  return isPosBig(n) && isPosBig(min) && isPosBig(max) && min <= n && n < max;
}
function aInRange(title, n, min, max) {
  if (!inRange(n, min, max))
    throw new Error("expected valid " + title + ": " + min + " <= n < " + max + ", got " + n);
}
function bitLen(n) {
  let len;
  for (len = 0; n > _0n; n >>= _1n, len += 1)
    ;
  return len;
}
function createHmacDrbg(hashLen, qByteLen, hmacFn) {
  anumber(hashLen, "hashLen");
  anumber(qByteLen, "qByteLen");
  if (typeof hmacFn !== "function")
    throw new Error("hmacFn must be a function");
  const u8n = (len) => new Uint8Array(len);
  const NULL = Uint8Array.of();
  const byte0 = Uint8Array.of(0);
  const byte1 = Uint8Array.of(1);
  const _maxDrbgIters = 1e3;
  let v = u8n(hashLen);
  let k = u8n(hashLen);
  let i = 0;
  const reset = () => {
    v.fill(1);
    k.fill(0);
    i = 0;
  };
  const h = (...msgs) => hmacFn(k, concatBytes(v, ...msgs));
  const reseed = (seed = NULL) => {
    k = h(byte0, seed);
    v = h();
    if (seed.length === 0)
      return;
    k = h(byte1, seed);
    v = h();
  };
  const gen = () => {
    if (i++ >= _maxDrbgIters)
      throw new Error("drbg: tried max amount of iterations");
    let len = 0;
    const out = [];
    while (len < qByteLen) {
      v = h();
      const sl = v.slice();
      out.push(sl);
      len += v.length;
    }
    return concatBytes(...out);
  };
  const genUntil = (seed, pred) => {
    reset();
    reseed(seed);
    let res = void 0;
    while (!(res = pred(gen())))
      reseed();
    reset();
    return res;
  };
  return genUntil;
}
function validateObject(object, fields = {}, optFields = {}) {
  if (!object || typeof object !== "object")
    throw new Error("expected valid options object");
  function checkField(fieldName, expectedType, isOpt) {
    const val = object[fieldName];
    if (isOpt && val === void 0)
      return;
    const current = typeof val;
    if (current !== expectedType || val === null)
      throw new Error(`param "${fieldName}" is invalid: expected ${expectedType}, got ${current}`);
  }
  const iter = (f, isOpt) => Object.entries(f).forEach(([k, v]) => checkField(k, v, isOpt));
  iter(fields, false);
  iter(optFields, true);
}
function memoized(fn) {
  const map = /* @__PURE__ */ new WeakMap();
  return (arg, ...args) => {
    const val = map.get(arg);
    if (val !== void 0)
      return val;
    const computed = fn(arg, ...args);
    map.set(arg, computed);
    return computed;
  };
}
var _0n, _1n, isPosBig, bitMask;
var init_utils2 = __esm({
  "node_modules/@noble/curves/utils.js"() {
    "use strict";
    init_utils();
    init_utils();
    _0n = /* @__PURE__ */ BigInt(0);
    _1n = /* @__PURE__ */ BigInt(1);
    isPosBig = (n) => typeof n === "bigint" && _0n <= n;
    bitMask = (n) => (_1n << BigInt(n)) - _1n;
  }
});

// node_modules/@noble/curves/abstract/modular.js
function mod(a, b) {
  const result = a % b;
  return result >= _0n2 ? result : b + result;
}
function pow2(x, power, modulo) {
  let res = x;
  while (power-- > _0n2) {
    res *= res;
    res %= modulo;
  }
  return res;
}
function invert(number, modulo) {
  if (number === _0n2)
    throw new Error("invert: expected non-zero number");
  if (modulo <= _0n2)
    throw new Error("invert: expected positive modulus, got " + modulo);
  let a = mod(number, modulo);
  let b = modulo;
  let x = _0n2, y = _1n2, u = _1n2, v = _0n2;
  while (a !== _0n2) {
    const q = b / a;
    const r = b % a;
    const m = x - u * q;
    const n = y - v * q;
    b = a, a = r, x = u, y = v, u = m, v = n;
  }
  const gcd = b;
  if (gcd !== _1n2)
    throw new Error("invert: does not exist");
  return mod(x, modulo);
}
function assertIsSquare(Fp, root, n) {
  if (!Fp.eql(Fp.sqr(root), n))
    throw new Error("Cannot find square root");
}
function sqrt3mod4(Fp, n) {
  const p1div4 = (Fp.ORDER + _1n2) / _4n;
  const root = Fp.pow(n, p1div4);
  assertIsSquare(Fp, root, n);
  return root;
}
function sqrt5mod8(Fp, n) {
  const p5div8 = (Fp.ORDER - _5n) / _8n;
  const n2 = Fp.mul(n, _2n);
  const v = Fp.pow(n2, p5div8);
  const nv = Fp.mul(n, v);
  const i = Fp.mul(Fp.mul(nv, _2n), v);
  const root = Fp.mul(nv, Fp.sub(i, Fp.ONE));
  assertIsSquare(Fp, root, n);
  return root;
}
function sqrt9mod16(P) {
  const Fp_ = Field(P);
  const tn = tonelliShanks(P);
  const c1 = tn(Fp_, Fp_.neg(Fp_.ONE));
  const c2 = tn(Fp_, c1);
  const c3 = tn(Fp_, Fp_.neg(c1));
  const c4 = (P + _7n) / _16n;
  return (Fp, n) => {
    let tv1 = Fp.pow(n, c4);
    let tv2 = Fp.mul(tv1, c1);
    const tv3 = Fp.mul(tv1, c2);
    const tv4 = Fp.mul(tv1, c3);
    const e1 = Fp.eql(Fp.sqr(tv2), n);
    const e2 = Fp.eql(Fp.sqr(tv3), n);
    tv1 = Fp.cmov(tv1, tv2, e1);
    tv2 = Fp.cmov(tv4, tv3, e2);
    const e3 = Fp.eql(Fp.sqr(tv2), n);
    const root = Fp.cmov(tv1, tv2, e3);
    assertIsSquare(Fp, root, n);
    return root;
  };
}
function tonelliShanks(P) {
  if (P < _3n)
    throw new Error("sqrt is not defined for small field");
  let Q = P - _1n2;
  let S = 0;
  while (Q % _2n === _0n2) {
    Q /= _2n;
    S++;
  }
  let Z = _2n;
  const _Fp = Field(P);
  while (FpLegendre(_Fp, Z) === 1) {
    if (Z++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  }
  if (S === 1)
    return sqrt3mod4;
  let cc = _Fp.pow(Z, Q);
  const Q1div2 = (Q + _1n2) / _2n;
  return function tonelliSlow(Fp, n) {
    if (Fp.is0(n))
      return n;
    if (FpLegendre(Fp, n) !== 1)
      throw new Error("Cannot find square root");
    let M = S;
    let c = Fp.mul(Fp.ONE, cc);
    let t = Fp.pow(n, Q);
    let R = Fp.pow(n, Q1div2);
    while (!Fp.eql(t, Fp.ONE)) {
      if (Fp.is0(t))
        return Fp.ZERO;
      let i = 1;
      let t_tmp = Fp.sqr(t);
      while (!Fp.eql(t_tmp, Fp.ONE)) {
        i++;
        t_tmp = Fp.sqr(t_tmp);
        if (i === M)
          throw new Error("Cannot find square root");
      }
      const exponent = _1n2 << BigInt(M - i - 1);
      const b = Fp.pow(c, exponent);
      M = i;
      c = Fp.sqr(b);
      t = Fp.mul(t, c);
      R = Fp.mul(R, b);
    }
    return R;
  };
}
function FpSqrt(P) {
  if (P % _4n === _3n)
    return sqrt3mod4;
  if (P % _8n === _5n)
    return sqrt5mod8;
  if (P % _16n === _9n)
    return sqrt9mod16(P);
  return tonelliShanks(P);
}
function validateField(field) {
  const initial = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  };
  const opts = FIELD_FIELDS.reduce((map, val) => {
    map[val] = "function";
    return map;
  }, initial);
  validateObject(field, opts);
  return field;
}
function FpPow(Fp, num2, power) {
  if (power < _0n2)
    throw new Error("invalid exponent, negatives unsupported");
  if (power === _0n2)
    return Fp.ONE;
  if (power === _1n2)
    return num2;
  let p = Fp.ONE;
  let d = num2;
  while (power > _0n2) {
    if (power & _1n2)
      p = Fp.mul(p, d);
    d = Fp.sqr(d);
    power >>= _1n2;
  }
  return p;
}
function FpInvertBatch(Fp, nums, passZero = false) {
  const inverted = new Array(nums.length).fill(passZero ? Fp.ZERO : void 0);
  const multipliedAcc = nums.reduce((acc, num2, i) => {
    if (Fp.is0(num2))
      return acc;
    inverted[i] = acc;
    return Fp.mul(acc, num2);
  }, Fp.ONE);
  const invertedAcc = Fp.inv(multipliedAcc);
  nums.reduceRight((acc, num2, i) => {
    if (Fp.is0(num2))
      return acc;
    inverted[i] = Fp.mul(acc, inverted[i]);
    return Fp.mul(acc, num2);
  }, invertedAcc);
  return inverted;
}
function FpLegendre(Fp, n) {
  const p1mod2 = (Fp.ORDER - _1n2) / _2n;
  const powered = Fp.pow(n, p1mod2);
  const yes = Fp.eql(powered, Fp.ONE);
  const zero = Fp.eql(powered, Fp.ZERO);
  const no = Fp.eql(powered, Fp.neg(Fp.ONE));
  if (!yes && !zero && !no)
    throw new Error("invalid Legendre symbol result");
  return yes ? 1 : zero ? 0 : -1;
}
function nLength(n, nBitLength) {
  if (nBitLength !== void 0)
    anumber(nBitLength);
  const _nBitLength = nBitLength !== void 0 ? nBitLength : n.toString(2).length;
  const nByteLength = Math.ceil(_nBitLength / 8);
  return { nBitLength: _nBitLength, nByteLength };
}
function Field(ORDER, opts = {}) {
  return new _Field(ORDER, opts);
}
function getFieldBytesLength(fieldOrder) {
  if (typeof fieldOrder !== "bigint")
    throw new Error("field order must be bigint");
  const bitLength = fieldOrder.toString(2).length;
  return Math.ceil(bitLength / 8);
}
function getMinHashLength(fieldOrder) {
  const length = getFieldBytesLength(fieldOrder);
  return length + Math.ceil(length / 2);
}
function mapHashToField(key, fieldOrder, isLE = false) {
  abytes(key);
  const len = key.length;
  const fieldLen = getFieldBytesLength(fieldOrder);
  const minLen = getMinHashLength(fieldOrder);
  if (len < 16 || len < minLen || len > 1024)
    throw new Error("expected " + minLen + "-1024 bytes of input, got " + len);
  const num2 = isLE ? bytesToNumberLE(key) : bytesToNumberBE(key);
  const reduced = mod(num2, fieldOrder - _1n2) + _1n2;
  return isLE ? numberToBytesLE(reduced, fieldLen) : numberToBytesBE(reduced, fieldLen);
}
var _0n2, _1n2, _2n, _3n, _4n, _5n, _7n, _8n, _9n, _16n, FIELD_FIELDS, _Field;
var init_modular = __esm({
  "node_modules/@noble/curves/abstract/modular.js"() {
    "use strict";
    init_utils2();
    _0n2 = /* @__PURE__ */ BigInt(0);
    _1n2 = /* @__PURE__ */ BigInt(1);
    _2n = /* @__PURE__ */ BigInt(2);
    _3n = /* @__PURE__ */ BigInt(3);
    _4n = /* @__PURE__ */ BigInt(4);
    _5n = /* @__PURE__ */ BigInt(5);
    _7n = /* @__PURE__ */ BigInt(7);
    _8n = /* @__PURE__ */ BigInt(8);
    _9n = /* @__PURE__ */ BigInt(9);
    _16n = /* @__PURE__ */ BigInt(16);
    FIELD_FIELDS = [
      "create",
      "isValid",
      "is0",
      "neg",
      "inv",
      "sqrt",
      "sqr",
      "eql",
      "add",
      "sub",
      "mul",
      "pow",
      "div",
      "addN",
      "subN",
      "mulN",
      "sqrN"
    ];
    _Field = class {
      ORDER;
      BITS;
      BYTES;
      isLE;
      ZERO = _0n2;
      ONE = _1n2;
      _lengths;
      _sqrt;
      // cached sqrt
      _mod;
      constructor(ORDER, opts = {}) {
        if (ORDER <= _0n2)
          throw new Error("invalid field: expected ORDER > 0, got " + ORDER);
        let _nbitLength = void 0;
        this.isLE = false;
        if (opts != null && typeof opts === "object") {
          if (typeof opts.BITS === "number")
            _nbitLength = opts.BITS;
          if (typeof opts.sqrt === "function")
            this.sqrt = opts.sqrt;
          if (typeof opts.isLE === "boolean")
            this.isLE = opts.isLE;
          if (opts.allowedLengths)
            this._lengths = opts.allowedLengths?.slice();
          if (typeof opts.modFromBytes === "boolean")
            this._mod = opts.modFromBytes;
        }
        const { nBitLength, nByteLength } = nLength(ORDER, _nbitLength);
        if (nByteLength > 2048)
          throw new Error("invalid field: expected ORDER of <= 2048 bytes");
        this.ORDER = ORDER;
        this.BITS = nBitLength;
        this.BYTES = nByteLength;
        this._sqrt = void 0;
        Object.preventExtensions(this);
      }
      create(num2) {
        return mod(num2, this.ORDER);
      }
      isValid(num2) {
        if (typeof num2 !== "bigint")
          throw new Error("invalid field element: expected bigint, got " + typeof num2);
        return _0n2 <= num2 && num2 < this.ORDER;
      }
      is0(num2) {
        return num2 === _0n2;
      }
      // is valid and invertible
      isValidNot0(num2) {
        return !this.is0(num2) && this.isValid(num2);
      }
      isOdd(num2) {
        return (num2 & _1n2) === _1n2;
      }
      neg(num2) {
        return mod(-num2, this.ORDER);
      }
      eql(lhs, rhs) {
        return lhs === rhs;
      }
      sqr(num2) {
        return mod(num2 * num2, this.ORDER);
      }
      add(lhs, rhs) {
        return mod(lhs + rhs, this.ORDER);
      }
      sub(lhs, rhs) {
        return mod(lhs - rhs, this.ORDER);
      }
      mul(lhs, rhs) {
        return mod(lhs * rhs, this.ORDER);
      }
      pow(num2, power) {
        return FpPow(this, num2, power);
      }
      div(lhs, rhs) {
        return mod(lhs * invert(rhs, this.ORDER), this.ORDER);
      }
      // Same as above, but doesn't normalize
      sqrN(num2) {
        return num2 * num2;
      }
      addN(lhs, rhs) {
        return lhs + rhs;
      }
      subN(lhs, rhs) {
        return lhs - rhs;
      }
      mulN(lhs, rhs) {
        return lhs * rhs;
      }
      inv(num2) {
        return invert(num2, this.ORDER);
      }
      sqrt(num2) {
        if (!this._sqrt)
          this._sqrt = FpSqrt(this.ORDER);
        return this._sqrt(this, num2);
      }
      toBytes(num2) {
        return this.isLE ? numberToBytesLE(num2, this.BYTES) : numberToBytesBE(num2, this.BYTES);
      }
      fromBytes(bytes, skipValidation = false) {
        abytes(bytes);
        const { _lengths: allowedLengths, BYTES, isLE, ORDER, _mod: modFromBytes } = this;
        if (allowedLengths) {
          if (!allowedLengths.includes(bytes.length) || bytes.length > BYTES) {
            throw new Error("Field.fromBytes: expected " + allowedLengths + " bytes, got " + bytes.length);
          }
          const padded = new Uint8Array(BYTES);
          padded.set(bytes, isLE ? 0 : padded.length - bytes.length);
          bytes = padded;
        }
        if (bytes.length !== BYTES)
          throw new Error("Field.fromBytes: expected " + BYTES + " bytes, got " + bytes.length);
        let scalar = isLE ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
        if (modFromBytes)
          scalar = mod(scalar, ORDER);
        if (!skipValidation) {
          if (!this.isValid(scalar))
            throw new Error("invalid field element: outside of range 0..ORDER");
        }
        return scalar;
      }
      // TODO: we don't need it here, move out to separate fn
      invertBatch(lst) {
        return FpInvertBatch(this, lst);
      }
      // We can't move this out because Fp6, Fp12 implement it
      // and it's unclear what to return in there.
      cmov(a, b, condition) {
        return condition ? b : a;
      }
    };
  }
});

// node_modules/@noble/curves/abstract/curve.js
function negateCt(condition, item) {
  const neg = item.negate();
  return condition ? neg : item;
}
function normalizeZ(c, points) {
  const invertedZs = FpInvertBatch(c.Fp, points.map((p) => p.Z));
  return points.map((p, i) => c.fromAffine(p.toAffine(invertedZs[i])));
}
function validateW(W, bits) {
  if (!Number.isSafeInteger(W) || W <= 0 || W > bits)
    throw new Error("invalid window size, expected [1.." + bits + "], got W=" + W);
}
function calcWOpts(W, scalarBits) {
  validateW(W, scalarBits);
  const windows = Math.ceil(scalarBits / W) + 1;
  const windowSize = 2 ** (W - 1);
  const maxNumber = 2 ** W;
  const mask = bitMask(W);
  const shiftBy = BigInt(W);
  return { windows, windowSize, mask, maxNumber, shiftBy };
}
function calcOffsets(n, window, wOpts) {
  const { windowSize, mask, maxNumber, shiftBy } = wOpts;
  let wbits = Number(n & mask);
  let nextN = n >> shiftBy;
  if (wbits > windowSize) {
    wbits -= maxNumber;
    nextN += _1n3;
  }
  const offsetStart = window * windowSize;
  const offset = offsetStart + Math.abs(wbits) - 1;
  const isZero = wbits === 0;
  const isNeg = wbits < 0;
  const isNegF = window % 2 !== 0;
  const offsetF = offsetStart;
  return { nextN, offset, isZero, isNeg, isNegF, offsetF };
}
function getW(P) {
  return pointWindowSizes.get(P) || 1;
}
function assert0(n) {
  if (n !== _0n3)
    throw new Error("invalid wNAF");
}
function mulEndoUnsafe(Point, point, k1, k2) {
  let acc = point;
  let p1 = Point.ZERO;
  let p2 = Point.ZERO;
  while (k1 > _0n3 || k2 > _0n3) {
    if (k1 & _1n3)
      p1 = p1.add(acc);
    if (k2 & _1n3)
      p2 = p2.add(acc);
    acc = acc.double();
    k1 >>= _1n3;
    k2 >>= _1n3;
  }
  return { p1, p2 };
}
function createField(order, field, isLE) {
  if (field) {
    if (field.ORDER !== order)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    validateField(field);
    return field;
  } else {
    return Field(order, { isLE });
  }
}
function createCurveFields(type, CURVE, curveOpts = {}, FpFnLE) {
  if (FpFnLE === void 0)
    FpFnLE = type === "edwards";
  if (!CURVE || typeof CURVE !== "object")
    throw new Error(`expected valid ${type} CURVE object`);
  for (const p of ["p", "n", "h"]) {
    const val = CURVE[p];
    if (!(typeof val === "bigint" && val > _0n3))
      throw new Error(`CURVE.${p} must be positive bigint`);
  }
  const Fp = createField(CURVE.p, curveOpts.Fp, FpFnLE);
  const Fn = createField(CURVE.n, curveOpts.Fn, FpFnLE);
  const _b = type === "weierstrass" ? "b" : "d";
  const params = ["Gx", "Gy", "a", _b];
  for (const p of params) {
    if (!Fp.isValid(CURVE[p]))
      throw new Error(`CURVE.${p} must be valid field element of CURVE.Fp`);
  }
  CURVE = Object.freeze(Object.assign({}, CURVE));
  return { CURVE, Fp, Fn };
}
function createKeygen(randomSecretKey, getPublicKey) {
  return function keygen(seed) {
    const secretKey = randomSecretKey(seed);
    return { secretKey, publicKey: getPublicKey(secretKey) };
  };
}
var _0n3, _1n3, pointPrecomputes, pointWindowSizes, wNAF;
var init_curve = __esm({
  "node_modules/@noble/curves/abstract/curve.js"() {
    "use strict";
    init_utils2();
    init_modular();
    _0n3 = /* @__PURE__ */ BigInt(0);
    _1n3 = /* @__PURE__ */ BigInt(1);
    pointPrecomputes = /* @__PURE__ */ new WeakMap();
    pointWindowSizes = /* @__PURE__ */ new WeakMap();
    wNAF = class {
      BASE;
      ZERO;
      Fn;
      bits;
      // Parametrized with a given Point class (not individual point)
      constructor(Point, bits) {
        this.BASE = Point.BASE;
        this.ZERO = Point.ZERO;
        this.Fn = Point.Fn;
        this.bits = bits;
      }
      // non-const time multiplication ladder
      _unsafeLadder(elm, n, p = this.ZERO) {
        let d = elm;
        while (n > _0n3) {
          if (n & _1n3)
            p = p.add(d);
          d = d.double();
          n >>= _1n3;
        }
        return p;
      }
      /**
       * Creates a wNAF precomputation window. Used for caching.
       * Default window size is set by `utils.precompute()` and is equal to 8.
       * Number of precomputed points depends on the curve size:
       * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
       * - 𝑊 is the window size
       * - 𝑛 is the bitlength of the curve order.
       * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
       * @param point Point instance
       * @param W window size
       * @returns precomputed point tables flattened to a single array
       */
      precomputeWindow(point, W) {
        const { windows, windowSize } = calcWOpts(W, this.bits);
        const points = [];
        let p = point;
        let base = p;
        for (let window = 0; window < windows; window++) {
          base = p;
          points.push(base);
          for (let i = 1; i < windowSize; i++) {
            base = base.add(p);
            points.push(base);
          }
          p = base.double();
        }
        return points;
      }
      /**
       * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
       * More compact implementation:
       * https://github.com/paulmillr/noble-secp256k1/blob/47cb1669b6e506ad66b35fe7d76132ae97465da2/index.ts#L502-L541
       * @returns real and fake (for const-time) points
       */
      wNAF(W, precomputes, n) {
        if (!this.Fn.isValid(n))
          throw new Error("invalid scalar");
        let p = this.ZERO;
        let f = this.BASE;
        const wo = calcWOpts(W, this.bits);
        for (let window = 0; window < wo.windows; window++) {
          const { nextN, offset, isZero, isNeg, isNegF, offsetF } = calcOffsets(n, window, wo);
          n = nextN;
          if (isZero) {
            f = f.add(negateCt(isNegF, precomputes[offsetF]));
          } else {
            p = p.add(negateCt(isNeg, precomputes[offset]));
          }
        }
        assert0(n);
        return { p, f };
      }
      /**
       * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
       * @param acc accumulator point to add result of multiplication
       * @returns point
       */
      wNAFUnsafe(W, precomputes, n, acc = this.ZERO) {
        const wo = calcWOpts(W, this.bits);
        for (let window = 0; window < wo.windows; window++) {
          if (n === _0n3)
            break;
          const { nextN, offset, isZero, isNeg } = calcOffsets(n, window, wo);
          n = nextN;
          if (isZero) {
            continue;
          } else {
            const item = precomputes[offset];
            acc = acc.add(isNeg ? item.negate() : item);
          }
        }
        assert0(n);
        return acc;
      }
      getPrecomputes(W, point, transform) {
        let comp = pointPrecomputes.get(point);
        if (!comp) {
          comp = this.precomputeWindow(point, W);
          if (W !== 1) {
            if (typeof transform === "function")
              comp = transform(comp);
            pointPrecomputes.set(point, comp);
          }
        }
        return comp;
      }
      cached(point, scalar, transform) {
        const W = getW(point);
        return this.wNAF(W, this.getPrecomputes(W, point, transform), scalar);
      }
      unsafe(point, scalar, transform, prev) {
        const W = getW(point);
        if (W === 1)
          return this._unsafeLadder(point, scalar, prev);
        return this.wNAFUnsafe(W, this.getPrecomputes(W, point, transform), scalar, prev);
      }
      // We calculate precomputes for elliptic curve point multiplication
      // using windowed method. This specifies window size and
      // stores precomputed values. Usually only base point would be precomputed.
      createCache(P, W) {
        validateW(W, this.bits);
        pointWindowSizes.set(P, W);
        pointPrecomputes.delete(P);
      }
      hasCache(elm) {
        return getW(elm) !== 1;
      }
    };
  }
});

// node_modules/@noble/curves/abstract/hash-to-curve.js
function i2osp(value, length) {
  asafenumber(value);
  asafenumber(length);
  if (value < 0 || value >= 1 << 8 * length)
    throw new Error("invalid I2OSP input: " + value);
  const res = Array.from({ length }).fill(0);
  for (let i = length - 1; i >= 0; i--) {
    res[i] = value & 255;
    value >>>= 8;
  }
  return new Uint8Array(res);
}
function strxor(a, b) {
  const arr = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) {
    arr[i] = a[i] ^ b[i];
  }
  return arr;
}
function normDST(DST) {
  if (!isBytes(DST) && typeof DST !== "string")
    throw new Error("DST must be Uint8Array or ascii string");
  return typeof DST === "string" ? asciiToBytes(DST) : DST;
}
function expand_message_xmd(msg, DST, lenInBytes, H) {
  abytes(msg);
  asafenumber(lenInBytes);
  DST = normDST(DST);
  if (DST.length > 255)
    DST = H(concatBytes(asciiToBytes("H2C-OVERSIZE-DST-"), DST));
  const { outputLen: b_in_bytes, blockLen: r_in_bytes } = H;
  const ell = Math.ceil(lenInBytes / b_in_bytes);
  if (lenInBytes > 65535 || ell > 255)
    throw new Error("expand_message_xmd: invalid lenInBytes");
  const DST_prime = concatBytes(DST, i2osp(DST.length, 1));
  const Z_pad = i2osp(0, r_in_bytes);
  const l_i_b_str = i2osp(lenInBytes, 2);
  const b = new Array(ell);
  const b_0 = H(concatBytes(Z_pad, msg, l_i_b_str, i2osp(0, 1), DST_prime));
  b[0] = H(concatBytes(b_0, i2osp(1, 1), DST_prime));
  for (let i = 1; i <= ell; i++) {
    const args = [strxor(b_0, b[i - 1]), i2osp(i + 1, 1), DST_prime];
    b[i] = H(concatBytes(...args));
  }
  const pseudo_random_bytes = concatBytes(...b);
  return pseudo_random_bytes.slice(0, lenInBytes);
}
function expand_message_xof(msg, DST, lenInBytes, k, H) {
  abytes(msg);
  asafenumber(lenInBytes);
  DST = normDST(DST);
  if (DST.length > 255) {
    const dkLen = Math.ceil(2 * k / 8);
    DST = H.create({ dkLen }).update(asciiToBytes("H2C-OVERSIZE-DST-")).update(DST).digest();
  }
  if (lenInBytes > 65535 || DST.length > 255)
    throw new Error("expand_message_xof: invalid lenInBytes");
  return H.create({ dkLen: lenInBytes }).update(msg).update(i2osp(lenInBytes, 2)).update(DST).update(i2osp(DST.length, 1)).digest();
}
function hash_to_field(msg, count, options) {
  validateObject(options, {
    p: "bigint",
    m: "number",
    k: "number",
    hash: "function"
  });
  const { p, k, m, hash, expand: expand2, DST } = options;
  asafenumber(hash.outputLen, "valid hash");
  abytes(msg);
  asafenumber(count);
  const log2p = p.toString(2).length;
  const L = Math.ceil((log2p + k) / 8);
  const len_in_bytes = count * m * L;
  let prb;
  if (expand2 === "xmd") {
    prb = expand_message_xmd(msg, DST, len_in_bytes, hash);
  } else if (expand2 === "xof") {
    prb = expand_message_xof(msg, DST, len_in_bytes, k, hash);
  } else if (expand2 === "_internal_pass") {
    prb = msg;
  } else {
    throw new Error('expand must be "xmd" or "xof"');
  }
  const u = new Array(count);
  for (let i = 0; i < count; i++) {
    const e = new Array(m);
    for (let j = 0; j < m; j++) {
      const elm_offset = L * (j + i * m);
      const tv = prb.subarray(elm_offset, elm_offset + L);
      e[j] = mod(os2ip(tv), p);
    }
    u[i] = e;
  }
  return u;
}
function isogenyMap(field, map) {
  const coeff = map.map((i) => Array.from(i).reverse());
  return (x, y) => {
    const [xn, xd, yn, yd] = coeff.map((val) => val.reduce((acc, i) => field.add(field.mul(acc, x), i)));
    const [xd_inv, yd_inv] = FpInvertBatch(field, [xd, yd], true);
    x = field.mul(xn, xd_inv);
    y = field.mul(y, field.mul(yn, yd_inv));
    return { x, y };
  };
}
function createHasher2(Point, mapToCurve, defaults) {
  if (typeof mapToCurve !== "function")
    throw new Error("mapToCurve() must be defined");
  function map(num2) {
    return Point.fromAffine(mapToCurve(num2));
  }
  function clear(initial) {
    const P = initial.clearCofactor();
    if (P.equals(Point.ZERO))
      return Point.ZERO;
    P.assertValidity();
    return P;
  }
  return {
    defaults: Object.freeze(defaults),
    Point,
    hashToCurve(msg, options) {
      const opts = Object.assign({}, defaults, options);
      const u = hash_to_field(msg, 2, opts);
      const u0 = map(u[0]);
      const u1 = map(u[1]);
      return clear(u0.add(u1));
    },
    encodeToCurve(msg, options) {
      const optsDst = defaults.encodeDST ? { DST: defaults.encodeDST } : {};
      const opts = Object.assign({}, defaults, optsDst, options);
      const u = hash_to_field(msg, 1, opts);
      const u0 = map(u[0]);
      return clear(u0);
    },
    /** See {@link H2CHasher} */
    mapToCurve(scalars) {
      if (defaults.m === 1) {
        if (typeof scalars !== "bigint")
          throw new Error("expected bigint (m=1)");
        return clear(map([scalars]));
      }
      if (!Array.isArray(scalars))
        throw new Error("expected array of bigints");
      for (const i of scalars)
        if (typeof i !== "bigint")
          throw new Error("expected array of bigints");
      return clear(map(scalars));
    },
    // hash_to_scalar can produce 0: https://www.rfc-editor.org/errata/eid8393
    // RFC 9380, draft-irtf-cfrg-bbs-signatures-08
    hashToScalar(msg, options) {
      const N = Point.Fn.ORDER;
      const opts = Object.assign({}, defaults, { p: N, m: 1, DST: _DST_scalar }, options);
      return hash_to_field(msg, 1, opts)[0][0];
    }
  };
}
var os2ip, _DST_scalar;
var init_hash_to_curve = __esm({
  "node_modules/@noble/curves/abstract/hash-to-curve.js"() {
    "use strict";
    init_utils2();
    init_modular();
    os2ip = bytesToNumberBE;
    _DST_scalar = asciiToBytes("HashToScalar-");
  }
});

// node_modules/@noble/hashes/hmac.js
var _HMAC, hmac;
var init_hmac = __esm({
  "node_modules/@noble/hashes/hmac.js"() {
    "use strict";
    init_utils();
    _HMAC = class {
      oHash;
      iHash;
      blockLen;
      outputLen;
      finished = false;
      destroyed = false;
      constructor(hash, key) {
        ahash(hash);
        abytes(key, void 0, "key");
        this.iHash = hash.create();
        if (typeof this.iHash.update !== "function")
          throw new Error("Expected instance of class which extends utils.Hash");
        this.blockLen = this.iHash.blockLen;
        this.outputLen = this.iHash.outputLen;
        const blockLen = this.blockLen;
        const pad = new Uint8Array(blockLen);
        pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
        for (let i = 0; i < pad.length; i++)
          pad[i] ^= 54;
        this.iHash.update(pad);
        this.oHash = hash.create();
        for (let i = 0; i < pad.length; i++)
          pad[i] ^= 54 ^ 92;
        this.oHash.update(pad);
        clean(pad);
      }
      update(buf) {
        aexists(this);
        this.iHash.update(buf);
        return this;
      }
      digestInto(out) {
        aexists(this);
        abytes(out, this.outputLen, "output");
        this.finished = true;
        this.iHash.digestInto(out);
        this.oHash.update(out);
        this.oHash.digestInto(out);
        this.destroy();
      }
      digest() {
        const out = new Uint8Array(this.oHash.outputLen);
        this.digestInto(out);
        return out;
      }
      _cloneInto(to) {
        to ||= Object.create(Object.getPrototypeOf(this), {});
        const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
        to = to;
        to.finished = finished;
        to.destroyed = destroyed;
        to.blockLen = blockLen;
        to.outputLen = outputLen;
        to.oHash = oHash._cloneInto(to.oHash);
        to.iHash = iHash._cloneInto(to.iHash);
        return to;
      }
      clone() {
        return this._cloneInto();
      }
      destroy() {
        this.destroyed = true;
        this.oHash.destroy();
        this.iHash.destroy();
      }
    };
    hmac = (hash, key, message) => new _HMAC(hash, key).update(message).digest();
    hmac.create = (hash, key) => new _HMAC(hash, key);
  }
});

// node_modules/@noble/curves/abstract/weierstrass.js
function _splitEndoScalar(k, basis, n) {
  const [[a1, b1], [a2, b2]] = basis;
  const c1 = divNearest(b2 * k, n);
  const c2 = divNearest(-b1 * k, n);
  let k1 = k - c1 * a1 - c2 * a2;
  let k2 = -c1 * b1 - c2 * b2;
  const k1neg = k1 < _0n4;
  const k2neg = k2 < _0n4;
  if (k1neg)
    k1 = -k1;
  if (k2neg)
    k2 = -k2;
  const MAX_NUM = bitMask(Math.ceil(bitLen(n) / 2)) + _1n4;
  if (k1 < _0n4 || k1 >= MAX_NUM || k2 < _0n4 || k2 >= MAX_NUM) {
    throw new Error("splitScalar (endomorphism): failed, k=" + k);
  }
  return { k1neg, k1, k2neg, k2 };
}
function validateSigFormat(format) {
  if (!["compact", "recovered", "der"].includes(format))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return format;
}
function validateSigOpts(opts, def) {
  const optsn = {};
  for (let optName of Object.keys(def)) {
    optsn[optName] = opts[optName] === void 0 ? def[optName] : opts[optName];
  }
  abool(optsn.lowS, "lowS");
  abool(optsn.prehash, "prehash");
  if (optsn.format !== void 0)
    validateSigFormat(optsn.format);
  return optsn;
}
function weierstrass(params, extraOpts = {}) {
  const validated = createCurveFields("weierstrass", params, extraOpts);
  const { Fp, Fn } = validated;
  let CURVE = validated.CURVE;
  const { h: cofactor, n: CURVE_ORDER2 } = CURVE;
  validateObject(extraOpts, {}, {
    allowInfinityPoint: "boolean",
    clearCofactor: "function",
    isTorsionFree: "function",
    fromBytes: "function",
    toBytes: "function",
    endo: "object"
  });
  const { endo } = extraOpts;
  if (endo) {
    if (!Fp.is0(CURVE.a) || typeof endo.beta !== "bigint" || !Array.isArray(endo.basises)) {
      throw new Error('invalid endo: expected "beta": bigint and "basises": array');
    }
  }
  const lengths = getWLengths(Fp, Fn);
  function assertCompressionIsSupported() {
    if (!Fp.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function pointToBytes2(_c, point, isCompressed) {
    const { x, y } = point.toAffine();
    const bx = Fp.toBytes(x);
    abool(isCompressed, "isCompressed");
    if (isCompressed) {
      assertCompressionIsSupported();
      const hasEvenY = !Fp.isOdd(y);
      return concatBytes(pprefix(hasEvenY), bx);
    } else {
      return concatBytes(Uint8Array.of(4), bx, Fp.toBytes(y));
    }
  }
  function pointFromBytes(bytes) {
    abytes(bytes, void 0, "Point");
    const { publicKey: comp, publicKeyUncompressed: uncomp } = lengths;
    const length = bytes.length;
    const head = bytes[0];
    const tail = bytes.subarray(1);
    if (length === comp && (head === 2 || head === 3)) {
      const x = Fp.fromBytes(tail);
      if (!Fp.isValid(x))
        throw new Error("bad point: is not on curve, wrong x");
      const y2 = weierstrassEquation(x);
      let y;
      try {
        y = Fp.sqrt(y2);
      } catch (sqrtError) {
        const err = sqrtError instanceof Error ? ": " + sqrtError.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + err);
      }
      assertCompressionIsSupported();
      const evenY = Fp.isOdd(y);
      const evenH = (head & 1) === 1;
      if (evenH !== evenY)
        y = Fp.neg(y);
      return { x, y };
    } else if (length === uncomp && head === 4) {
      const L = Fp.BYTES;
      const x = Fp.fromBytes(tail.subarray(0, L));
      const y = Fp.fromBytes(tail.subarray(L, L * 2));
      if (!isValidXY(x, y))
        throw new Error("bad point: is not on curve");
      return { x, y };
    } else {
      throw new Error(`bad point: got length ${length}, expected compressed=${comp} or uncompressed=${uncomp}`);
    }
  }
  const encodePoint = extraOpts.toBytes || pointToBytes2;
  const decodePoint = extraOpts.fromBytes || pointFromBytes;
  function weierstrassEquation(x) {
    const x2 = Fp.sqr(x);
    const x3 = Fp.mul(x2, x);
    return Fp.add(Fp.add(x3, Fp.mul(x, CURVE.a)), CURVE.b);
  }
  function isValidXY(x, y) {
    const left = Fp.sqr(y);
    const right = weierstrassEquation(x);
    return Fp.eql(left, right);
  }
  if (!isValidXY(CURVE.Gx, CURVE.Gy))
    throw new Error("bad curve params: generator point");
  const _4a3 = Fp.mul(Fp.pow(CURVE.a, _3n2), _4n2);
  const _27b2 = Fp.mul(Fp.sqr(CURVE.b), BigInt(27));
  if (Fp.is0(Fp.add(_4a3, _27b2)))
    throw new Error("bad curve params: a or b");
  function acoord(title, n, banZero = false) {
    if (!Fp.isValid(n) || banZero && Fp.is0(n))
      throw new Error(`bad point coordinate ${title}`);
    return n;
  }
  function aprjpoint(other) {
    if (!(other instanceof Point))
      throw new Error("Weierstrass Point expected");
  }
  function splitEndoScalarN(k) {
    if (!endo || !endo.basises)
      throw new Error("no endo");
    return _splitEndoScalar(k, endo.basises, Fn.ORDER);
  }
  const toAffineMemo = memoized((p, iz) => {
    const { X, Y, Z } = p;
    if (Fp.eql(Z, Fp.ONE))
      return { x: X, y: Y };
    const is0 = p.is0();
    if (iz == null)
      iz = is0 ? Fp.ONE : Fp.inv(Z);
    const x = Fp.mul(X, iz);
    const y = Fp.mul(Y, iz);
    const zz = Fp.mul(Z, iz);
    if (is0)
      return { x: Fp.ZERO, y: Fp.ZERO };
    if (!Fp.eql(zz, Fp.ONE))
      throw new Error("invZ was invalid");
    return { x, y };
  });
  const assertValidMemo = memoized((p) => {
    if (p.is0()) {
      if (extraOpts.allowInfinityPoint && !Fp.is0(p.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x, y } = p.toAffine();
    if (!Fp.isValid(x) || !Fp.isValid(y))
      throw new Error("bad point: x or y not field elements");
    if (!isValidXY(x, y))
      throw new Error("bad point: equation left != right");
    if (!p.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return true;
  });
  function finishEndo(endoBeta, k1p, k2p, k1neg, k2neg) {
    k2p = new Point(Fp.mul(k2p.X, endoBeta), k2p.Y, k2p.Z);
    k1p = negateCt(k1neg, k1p);
    k2p = negateCt(k2neg, k2p);
    return k1p.add(k2p);
  }
  class Point {
    // base / generator point
    static BASE = new Point(CURVE.Gx, CURVE.Gy, Fp.ONE);
    // zero / infinity / identity point
    static ZERO = new Point(Fp.ZERO, Fp.ONE, Fp.ZERO);
    // 0, 1, 0
    // math field
    static Fp = Fp;
    // scalar field
    static Fn = Fn;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(X, Y, Z) {
      this.X = acoord("x", X);
      this.Y = acoord("y", Y, true);
      this.Z = acoord("z", Z);
      Object.freeze(this);
    }
    static CURVE() {
      return CURVE;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(p) {
      const { x, y } = p || {};
      if (!p || !Fp.isValid(x) || !Fp.isValid(y))
        throw new Error("invalid affine point");
      if (p instanceof Point)
        throw new Error("projective point not allowed");
      if (Fp.is0(x) && Fp.is0(y))
        return Point.ZERO;
      return new Point(x, y, Fp.ONE);
    }
    static fromBytes(bytes) {
      const P = Point.fromAffine(decodePoint(abytes(bytes, void 0, "point")));
      P.assertValidity();
      return P;
    }
    static fromHex(hex) {
      return Point.fromBytes(hexToBytes2(hex));
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    /**
     *
     * @param windowSize
     * @param isLazy true will defer table computation until the first multiplication
     * @returns
     */
    precompute(windowSize = 8, isLazy = true) {
      wnaf.createCache(this, windowSize);
      if (!isLazy)
        this.multiply(_3n2);
      return this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      assertValidMemo(this);
    }
    hasEvenY() {
      const { y } = this.toAffine();
      if (!Fp.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !Fp.isOdd(y);
    }
    /** Compare one point to another. */
    equals(other) {
      aprjpoint(other);
      const { X: X1, Y: Y1, Z: Z1 } = this;
      const { X: X2, Y: Y2, Z: Z2 } = other;
      const U1 = Fp.eql(Fp.mul(X1, Z2), Fp.mul(X2, Z1));
      const U2 = Fp.eql(Fp.mul(Y1, Z2), Fp.mul(Y2, Z1));
      return U1 && U2;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new Point(this.X, Fp.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a, b } = CURVE;
      const b3 = Fp.mul(b, _3n2);
      const { X: X1, Y: Y1, Z: Z1 } = this;
      let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO;
      let t0 = Fp.mul(X1, X1);
      let t1 = Fp.mul(Y1, Y1);
      let t2 = Fp.mul(Z1, Z1);
      let t3 = Fp.mul(X1, Y1);
      t3 = Fp.add(t3, t3);
      Z3 = Fp.mul(X1, Z1);
      Z3 = Fp.add(Z3, Z3);
      X3 = Fp.mul(a, Z3);
      Y3 = Fp.mul(b3, t2);
      Y3 = Fp.add(X3, Y3);
      X3 = Fp.sub(t1, Y3);
      Y3 = Fp.add(t1, Y3);
      Y3 = Fp.mul(X3, Y3);
      X3 = Fp.mul(t3, X3);
      Z3 = Fp.mul(b3, Z3);
      t2 = Fp.mul(a, t2);
      t3 = Fp.sub(t0, t2);
      t3 = Fp.mul(a, t3);
      t3 = Fp.add(t3, Z3);
      Z3 = Fp.add(t0, t0);
      t0 = Fp.add(Z3, t0);
      t0 = Fp.add(t0, t2);
      t0 = Fp.mul(t0, t3);
      Y3 = Fp.add(Y3, t0);
      t2 = Fp.mul(Y1, Z1);
      t2 = Fp.add(t2, t2);
      t0 = Fp.mul(t2, t3);
      X3 = Fp.sub(X3, t0);
      Z3 = Fp.mul(t2, t1);
      Z3 = Fp.add(Z3, Z3);
      Z3 = Fp.add(Z3, Z3);
      return new Point(X3, Y3, Z3);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(other) {
      aprjpoint(other);
      const { X: X1, Y: Y1, Z: Z1 } = this;
      const { X: X2, Y: Y2, Z: Z2 } = other;
      let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO;
      const a = CURVE.a;
      const b3 = Fp.mul(CURVE.b, _3n2);
      let t0 = Fp.mul(X1, X2);
      let t1 = Fp.mul(Y1, Y2);
      let t2 = Fp.mul(Z1, Z2);
      let t3 = Fp.add(X1, Y1);
      let t4 = Fp.add(X2, Y2);
      t3 = Fp.mul(t3, t4);
      t4 = Fp.add(t0, t1);
      t3 = Fp.sub(t3, t4);
      t4 = Fp.add(X1, Z1);
      let t5 = Fp.add(X2, Z2);
      t4 = Fp.mul(t4, t5);
      t5 = Fp.add(t0, t2);
      t4 = Fp.sub(t4, t5);
      t5 = Fp.add(Y1, Z1);
      X3 = Fp.add(Y2, Z2);
      t5 = Fp.mul(t5, X3);
      X3 = Fp.add(t1, t2);
      t5 = Fp.sub(t5, X3);
      Z3 = Fp.mul(a, t4);
      X3 = Fp.mul(b3, t2);
      Z3 = Fp.add(X3, Z3);
      X3 = Fp.sub(t1, Z3);
      Z3 = Fp.add(t1, Z3);
      Y3 = Fp.mul(X3, Z3);
      t1 = Fp.add(t0, t0);
      t1 = Fp.add(t1, t0);
      t2 = Fp.mul(a, t2);
      t4 = Fp.mul(b3, t4);
      t1 = Fp.add(t1, t2);
      t2 = Fp.sub(t0, t2);
      t2 = Fp.mul(a, t2);
      t4 = Fp.add(t4, t2);
      t0 = Fp.mul(t1, t4);
      Y3 = Fp.add(Y3, t0);
      t0 = Fp.mul(t5, t4);
      X3 = Fp.mul(t3, X3);
      X3 = Fp.sub(X3, t0);
      t0 = Fp.mul(t3, t1);
      Z3 = Fp.mul(t5, Z3);
      Z3 = Fp.add(Z3, t0);
      return new Point(X3, Y3, Z3);
    }
    subtract(other) {
      return this.add(other.negate());
    }
    is0() {
      return this.equals(Point.ZERO);
    }
    /**
     * Constant time multiplication.
     * Uses wNAF method. Windowed method may be 10% faster,
     * but takes 2x longer to generate and consumes 2x memory.
     * Uses precomputes when available.
     * Uses endomorphism for Koblitz curves.
     * @param scalar by which the point would be multiplied
     * @returns New point
     */
    multiply(scalar) {
      const { endo: endo2 } = extraOpts;
      if (!Fn.isValidNot0(scalar))
        throw new Error("invalid scalar: out of range");
      let point, fake;
      const mul = (n) => wnaf.cached(this, n, (p) => normalizeZ(Point, p));
      if (endo2) {
        const { k1neg, k1, k2neg, k2 } = splitEndoScalarN(scalar);
        const { p: k1p, f: k1f } = mul(k1);
        const { p: k2p, f: k2f } = mul(k2);
        fake = k1f.add(k2f);
        point = finishEndo(endo2.beta, k1p, k2p, k1neg, k2neg);
      } else {
        const { p, f } = mul(scalar);
        point = p;
        fake = f;
      }
      return normalizeZ(Point, [point, fake])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(sc) {
      const { endo: endo2 } = extraOpts;
      const p = this;
      if (!Fn.isValid(sc))
        throw new Error("invalid scalar: out of range");
      if (sc === _0n4 || p.is0())
        return Point.ZERO;
      if (sc === _1n4)
        return p;
      if (wnaf.hasCache(this))
        return this.multiply(sc);
      if (endo2) {
        const { k1neg, k1, k2neg, k2 } = splitEndoScalarN(sc);
        const { p1, p2 } = mulEndoUnsafe(Point, p, k1, k2);
        return finishEndo(endo2.beta, p1, p2, k1neg, k2neg);
      } else {
        return wnaf.unsafe(p, sc);
      }
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(invertedZ) {
      return toAffineMemo(this, invertedZ);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree } = extraOpts;
      if (cofactor === _1n4)
        return true;
      if (isTorsionFree)
        return isTorsionFree(Point, this);
      return wnaf.unsafe(this, CURVE_ORDER2).is0();
    }
    clearCofactor() {
      const { clearCofactor } = extraOpts;
      if (cofactor === _1n4)
        return this;
      if (clearCofactor)
        return clearCofactor(Point, this);
      return this.multiplyUnsafe(cofactor);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(cofactor).is0();
    }
    toBytes(isCompressed = true) {
      abool(isCompressed, "isCompressed");
      this.assertValidity();
      return encodePoint(Point, this, isCompressed);
    }
    toHex(isCompressed = true) {
      return bytesToHex(this.toBytes(isCompressed));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const bits = Fn.BITS;
  const wnaf = new wNAF(Point, extraOpts.endo ? Math.ceil(bits / 2) : bits);
  Point.BASE.precompute(8);
  return Point;
}
function pprefix(hasEvenY) {
  return Uint8Array.of(hasEvenY ? 2 : 3);
}
function SWUFpSqrtRatio(Fp, Z) {
  const q = Fp.ORDER;
  let l = _0n4;
  for (let o = q - _1n4; o % _2n2 === _0n4; o /= _2n2)
    l += _1n4;
  const c1 = l;
  const _2n_pow_c1_1 = _2n2 << c1 - _1n4 - _1n4;
  const _2n_pow_c1 = _2n_pow_c1_1 * _2n2;
  const c2 = (q - _1n4) / _2n_pow_c1;
  const c3 = (c2 - _1n4) / _2n2;
  const c4 = _2n_pow_c1 - _1n4;
  const c5 = _2n_pow_c1_1;
  const c6 = Fp.pow(Z, c2);
  const c7 = Fp.pow(Z, (c2 + _1n4) / _2n2);
  let sqrtRatio = (u, v) => {
    let tv1 = c6;
    let tv2 = Fp.pow(v, c4);
    let tv3 = Fp.sqr(tv2);
    tv3 = Fp.mul(tv3, v);
    let tv5 = Fp.mul(u, tv3);
    tv5 = Fp.pow(tv5, c3);
    tv5 = Fp.mul(tv5, tv2);
    tv2 = Fp.mul(tv5, v);
    tv3 = Fp.mul(tv5, u);
    let tv4 = Fp.mul(tv3, tv2);
    tv5 = Fp.pow(tv4, c5);
    let isQR = Fp.eql(tv5, Fp.ONE);
    tv2 = Fp.mul(tv3, c7);
    tv5 = Fp.mul(tv4, tv1);
    tv3 = Fp.cmov(tv2, tv3, isQR);
    tv4 = Fp.cmov(tv5, tv4, isQR);
    for (let i = c1; i > _1n4; i--) {
      let tv52 = i - _2n2;
      tv52 = _2n2 << tv52 - _1n4;
      let tvv5 = Fp.pow(tv4, tv52);
      const e1 = Fp.eql(tvv5, Fp.ONE);
      tv2 = Fp.mul(tv3, tv1);
      tv1 = Fp.mul(tv1, tv1);
      tvv5 = Fp.mul(tv4, tv1);
      tv3 = Fp.cmov(tv2, tv3, e1);
      tv4 = Fp.cmov(tvv5, tv4, e1);
    }
    return { isValid: isQR, value: tv3 };
  };
  if (Fp.ORDER % _4n2 === _3n2) {
    const c12 = (Fp.ORDER - _3n2) / _4n2;
    const c22 = Fp.sqrt(Fp.neg(Z));
    sqrtRatio = (u, v) => {
      let tv1 = Fp.sqr(v);
      const tv2 = Fp.mul(u, v);
      tv1 = Fp.mul(tv1, tv2);
      let y1 = Fp.pow(tv1, c12);
      y1 = Fp.mul(y1, tv2);
      const y2 = Fp.mul(y1, c22);
      const tv3 = Fp.mul(Fp.sqr(y1), v);
      const isQR = Fp.eql(tv3, u);
      let y = Fp.cmov(y2, y1, isQR);
      return { isValid: isQR, value: y };
    };
  }
  return sqrtRatio;
}
function mapToCurveSimpleSWU(Fp, opts) {
  validateField(Fp);
  const { A, B, Z } = opts;
  if (!Fp.isValid(A) || !Fp.isValid(B) || !Fp.isValid(Z))
    throw new Error("mapToCurveSimpleSWU: invalid opts");
  const sqrtRatio = SWUFpSqrtRatio(Fp, Z);
  if (!Fp.isOdd)
    throw new Error("Field does not have .isOdd()");
  return (u) => {
    let tv1, tv2, tv3, tv4, tv5, tv6, x, y;
    tv1 = Fp.sqr(u);
    tv1 = Fp.mul(tv1, Z);
    tv2 = Fp.sqr(tv1);
    tv2 = Fp.add(tv2, tv1);
    tv3 = Fp.add(tv2, Fp.ONE);
    tv3 = Fp.mul(tv3, B);
    tv4 = Fp.cmov(Z, Fp.neg(tv2), !Fp.eql(tv2, Fp.ZERO));
    tv4 = Fp.mul(tv4, A);
    tv2 = Fp.sqr(tv3);
    tv6 = Fp.sqr(tv4);
    tv5 = Fp.mul(tv6, A);
    tv2 = Fp.add(tv2, tv5);
    tv2 = Fp.mul(tv2, tv3);
    tv6 = Fp.mul(tv6, tv4);
    tv5 = Fp.mul(tv6, B);
    tv2 = Fp.add(tv2, tv5);
    x = Fp.mul(tv1, tv3);
    const { isValid, value } = sqrtRatio(tv2, tv6);
    y = Fp.mul(tv1, u);
    y = Fp.mul(y, value);
    x = Fp.cmov(x, tv3, isValid);
    y = Fp.cmov(y, value, isValid);
    const e1 = Fp.isOdd(u) === Fp.isOdd(y);
    y = Fp.cmov(Fp.neg(y), y, e1);
    const tv4_inv = FpInvertBatch(Fp, [tv4], true)[0];
    x = Fp.mul(x, tv4_inv);
    return { x, y };
  };
}
function getWLengths(Fp, Fn) {
  return {
    secretKey: Fn.BYTES,
    publicKey: 1 + Fp.BYTES,
    publicKeyUncompressed: 1 + 2 * Fp.BYTES,
    publicKeyHasPrefix: true,
    signature: 2 * Fn.BYTES
  };
}
function ecdh(Point, ecdhOpts = {}) {
  const { Fn } = Point;
  const randomBytes_ = ecdhOpts.randomBytes || randomBytes;
  const lengths = Object.assign(getWLengths(Point.Fp, Fn), { seed: getMinHashLength(Fn.ORDER) });
  function isValidSecretKey(secretKey) {
    try {
      const num2 = Fn.fromBytes(secretKey);
      return Fn.isValidNot0(num2);
    } catch (error) {
      return false;
    }
  }
  function isValidPublicKey(publicKey, isCompressed) {
    const { publicKey: comp, publicKeyUncompressed } = lengths;
    try {
      const l = publicKey.length;
      if (isCompressed === true && l !== comp)
        return false;
      if (isCompressed === false && l !== publicKeyUncompressed)
        return false;
      return !!Point.fromBytes(publicKey);
    } catch (error) {
      return false;
    }
  }
  function randomSecretKey(seed = randomBytes_(lengths.seed)) {
    return mapHashToField(abytes(seed, lengths.seed, "seed"), Fn.ORDER);
  }
  function getPublicKey(secretKey, isCompressed = true) {
    return Point.BASE.multiply(Fn.fromBytes(secretKey)).toBytes(isCompressed);
  }
  function isProbPub(item) {
    const { secretKey, publicKey, publicKeyUncompressed } = lengths;
    if (!isBytes(item))
      return void 0;
    if ("_lengths" in Fn && Fn._lengths || secretKey === publicKey)
      return void 0;
    const l = abytes(item, void 0, "key").length;
    return l === publicKey || l === publicKeyUncompressed;
  }
  function getSharedSecret(secretKeyA, publicKeyB, isCompressed = true) {
    if (isProbPub(secretKeyA) === true)
      throw new Error("first arg must be private key");
    if (isProbPub(publicKeyB) === false)
      throw new Error("second arg must be public key");
    const s = Fn.fromBytes(secretKeyA);
    const b = Point.fromBytes(publicKeyB);
    return b.multiply(s).toBytes(isCompressed);
  }
  const utils = {
    isValidSecretKey,
    isValidPublicKey,
    randomSecretKey
  };
  const keygen = createKeygen(randomSecretKey, getPublicKey);
  return Object.freeze({ getPublicKey, getSharedSecret, keygen, Point, utils, lengths });
}
function ecdsa(Point, hash, ecdsaOpts = {}) {
  ahash(hash);
  validateObject(ecdsaOpts, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  });
  ecdsaOpts = Object.assign({}, ecdsaOpts);
  const randomBytes2 = ecdsaOpts.randomBytes || randomBytes;
  const hmac2 = ecdsaOpts.hmac || ((key, msg) => hmac(hash, key, msg));
  const { Fp, Fn } = Point;
  const { ORDER: CURVE_ORDER2, BITS: fnBits } = Fn;
  const { keygen, getPublicKey, getSharedSecret, utils, lengths } = ecdh(Point, ecdsaOpts);
  const defaultSigOpts = {
    prehash: true,
    lowS: typeof ecdsaOpts.lowS === "boolean" ? ecdsaOpts.lowS : true,
    format: "compact",
    extraEntropy: false
  };
  const hasLargeCofactor = CURVE_ORDER2 * _2n2 < Fp.ORDER;
  function isBiggerThanHalfOrder(number) {
    const HALF = CURVE_ORDER2 >> _1n4;
    return number > HALF;
  }
  function validateRS(title, num2) {
    if (!Fn.isValidNot0(num2))
      throw new Error(`invalid signature ${title}: out of range 1..Point.Fn.ORDER`);
    return num2;
  }
  function assertSmallCofactor() {
    if (hasLargeCofactor)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function validateSigLength(bytes, format) {
    validateSigFormat(format);
    const size = lengths.signature;
    const sizer = format === "compact" ? size : format === "recovered" ? size + 1 : void 0;
    return abytes(bytes, sizer);
  }
  class Signature2 {
    r;
    s;
    recovery;
    constructor(r, s, recovery) {
      this.r = validateRS("r", r);
      this.s = validateRS("s", s);
      if (recovery != null) {
        assertSmallCofactor();
        if (![0, 1, 2, 3].includes(recovery))
          throw new Error("invalid recovery id");
        this.recovery = recovery;
      }
      Object.freeze(this);
    }
    static fromBytes(bytes, format = defaultSigOpts.format) {
      validateSigLength(bytes, format);
      let recid;
      if (format === "der") {
        const { r: r2, s: s2 } = DER.toSig(abytes(bytes));
        return new Signature2(r2, s2);
      }
      if (format === "recovered") {
        recid = bytes[0];
        format = "compact";
        bytes = bytes.subarray(1);
      }
      const L = lengths.signature / 2;
      const r = bytes.subarray(0, L);
      const s = bytes.subarray(L, L * 2);
      return new Signature2(Fn.fromBytes(r), Fn.fromBytes(s), recid);
    }
    static fromHex(hex, format) {
      return this.fromBytes(hexToBytes2(hex), format);
    }
    assertRecovery() {
      const { recovery } = this;
      if (recovery == null)
        throw new Error("invalid recovery id: must be present");
      return recovery;
    }
    addRecoveryBit(recovery) {
      return new Signature2(this.r, this.s, recovery);
    }
    recoverPublicKey(messageHash) {
      const { r, s } = this;
      const recovery = this.assertRecovery();
      const radj = recovery === 2 || recovery === 3 ? r + CURVE_ORDER2 : r;
      if (!Fp.isValid(radj))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const x = Fp.toBytes(radj);
      const R = Point.fromBytes(concatBytes(pprefix((recovery & 1) === 0), x));
      const ir = Fn.inv(radj);
      const h = bits2int_modN(abytes(messageHash, void 0, "msgHash"));
      const u1 = Fn.create(-h * ir);
      const u2 = Fn.create(s * ir);
      const Q = Point.BASE.multiplyUnsafe(u1).add(R.multiplyUnsafe(u2));
      if (Q.is0())
        throw new Error("invalid recovery: point at infinify");
      Q.assertValidity();
      return Q;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return isBiggerThanHalfOrder(this.s);
    }
    toBytes(format = defaultSigOpts.format) {
      validateSigFormat(format);
      if (format === "der")
        return hexToBytes2(DER.hexFromSig(this));
      const { r, s } = this;
      const rb = Fn.toBytes(r);
      const sb = Fn.toBytes(s);
      if (format === "recovered") {
        assertSmallCofactor();
        return concatBytes(Uint8Array.of(this.assertRecovery()), rb, sb);
      }
      return concatBytes(rb, sb);
    }
    toHex(format) {
      return bytesToHex(this.toBytes(format));
    }
  }
  const bits2int = ecdsaOpts.bits2int || function bits2int_def(bytes) {
    if (bytes.length > 8192)
      throw new Error("input is too large");
    const num2 = bytesToNumberBE(bytes);
    const delta = bytes.length * 8 - fnBits;
    return delta > 0 ? num2 >> BigInt(delta) : num2;
  };
  const bits2int_modN = ecdsaOpts.bits2int_modN || function bits2int_modN_def(bytes) {
    return Fn.create(bits2int(bytes));
  };
  const ORDER_MASK = bitMask(fnBits);
  function int2octets(num2) {
    aInRange("num < 2^" + fnBits, num2, _0n4, ORDER_MASK);
    return Fn.toBytes(num2);
  }
  function validateMsgAndHash(message, prehash) {
    abytes(message, void 0, "message");
    return prehash ? abytes(hash(message), void 0, "prehashed message") : message;
  }
  function prepSig(message, secretKey, opts) {
    const { lowS, prehash, extraEntropy } = validateSigOpts(opts, defaultSigOpts);
    message = validateMsgAndHash(message, prehash);
    const h1int = bits2int_modN(message);
    const d = Fn.fromBytes(secretKey);
    if (!Fn.isValidNot0(d))
      throw new Error("invalid private key");
    const seedArgs = [int2octets(d), int2octets(h1int)];
    if (extraEntropy != null && extraEntropy !== false) {
      const e = extraEntropy === true ? randomBytes2(lengths.secretKey) : extraEntropy;
      seedArgs.push(abytes(e, void 0, "extraEntropy"));
    }
    const seed = concatBytes(...seedArgs);
    const m = h1int;
    function k2sig(kBytes) {
      const k = bits2int(kBytes);
      if (!Fn.isValidNot0(k))
        return;
      const ik = Fn.inv(k);
      const q = Point.BASE.multiply(k).toAffine();
      const r = Fn.create(q.x);
      if (r === _0n4)
        return;
      const s = Fn.create(ik * Fn.create(m + r * d));
      if (s === _0n4)
        return;
      let recovery = (q.x === r ? 0 : 2) | Number(q.y & _1n4);
      let normS = s;
      if (lowS && isBiggerThanHalfOrder(s)) {
        normS = Fn.neg(s);
        recovery ^= 1;
      }
      return new Signature2(r, normS, hasLargeCofactor ? void 0 : recovery);
    }
    return { seed, k2sig };
  }
  function sign(message, secretKey, opts = {}) {
    const { seed, k2sig } = prepSig(message, secretKey, opts);
    const drbg = createHmacDrbg(hash.outputLen, Fn.BYTES, hmac2);
    const sig = drbg(seed, k2sig);
    return sig.toBytes(opts.format);
  }
  function verify2(signature, message, publicKey, opts = {}) {
    const { lowS, prehash, format } = validateSigOpts(opts, defaultSigOpts);
    publicKey = abytes(publicKey, void 0, "publicKey");
    message = validateMsgAndHash(message, prehash);
    if (!isBytes(signature)) {
      const end = signature instanceof Signature2 ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + end);
    }
    validateSigLength(signature, format);
    try {
      const sig = Signature2.fromBytes(signature, format);
      const P = Point.fromBytes(publicKey);
      if (lowS && sig.hasHighS())
        return false;
      const { r, s } = sig;
      const h = bits2int_modN(message);
      const is = Fn.inv(s);
      const u1 = Fn.create(h * is);
      const u2 = Fn.create(r * is);
      const R = Point.BASE.multiplyUnsafe(u1).add(P.multiplyUnsafe(u2));
      if (R.is0())
        return false;
      const v = Fn.create(R.x);
      return v === r;
    } catch (e) {
      return false;
    }
  }
  function recoverPublicKey(signature, message, opts = {}) {
    const { prehash } = validateSigOpts(opts, defaultSigOpts);
    message = validateMsgAndHash(message, prehash);
    return Signature2.fromBytes(signature, "recovered").recoverPublicKey(message).toBytes();
  }
  return Object.freeze({
    keygen,
    getPublicKey,
    getSharedSecret,
    utils,
    lengths,
    Point,
    sign,
    verify: verify2,
    recoverPublicKey,
    Signature: Signature2,
    hash
  });
}
var divNearest, DERErr, DER, _0n4, _1n4, _2n2, _3n2, _4n2;
var init_weierstrass = __esm({
  "node_modules/@noble/curves/abstract/weierstrass.js"() {
    "use strict";
    init_hmac();
    init_utils();
    init_utils2();
    init_curve();
    init_modular();
    divNearest = (num2, den) => (num2 + (num2 >= 0 ? den : -den) / _2n2) / den;
    DERErr = class extends Error {
      constructor(m = "") {
        super(m);
      }
    };
    DER = {
      // asn.1 DER encoding utils
      Err: DERErr,
      // Basic building block is TLV (Tag-Length-Value)
      _tlv: {
        encode: (tag, data) => {
          const { Err: E } = DER;
          if (tag < 0 || tag > 256)
            throw new E("tlv.encode: wrong tag");
          if (data.length & 1)
            throw new E("tlv.encode: unpadded data");
          const dataLen = data.length / 2;
          const len = numberToHexUnpadded(dataLen);
          if (len.length / 2 & 128)
            throw new E("tlv.encode: long form length too big");
          const lenLen = dataLen > 127 ? numberToHexUnpadded(len.length / 2 | 128) : "";
          const t = numberToHexUnpadded(tag);
          return t + lenLen + len + data;
        },
        // v - value, l - left bytes (unparsed)
        decode(tag, data) {
          const { Err: E } = DER;
          let pos = 0;
          if (tag < 0 || tag > 256)
            throw new E("tlv.encode: wrong tag");
          if (data.length < 2 || data[pos++] !== tag)
            throw new E("tlv.decode: wrong tlv");
          const first = data[pos++];
          const isLong = !!(first & 128);
          let length = 0;
          if (!isLong)
            length = first;
          else {
            const lenLen = first & 127;
            if (!lenLen)
              throw new E("tlv.decode(long): indefinite length not supported");
            if (lenLen > 4)
              throw new E("tlv.decode(long): byte length is too big");
            const lengthBytes = data.subarray(pos, pos + lenLen);
            if (lengthBytes.length !== lenLen)
              throw new E("tlv.decode: length bytes not complete");
            if (lengthBytes[0] === 0)
              throw new E("tlv.decode(long): zero leftmost byte");
            for (const b of lengthBytes)
              length = length << 8 | b;
            pos += lenLen;
            if (length < 128)
              throw new E("tlv.decode(long): not minimal encoding");
          }
          const v = data.subarray(pos, pos + length);
          if (v.length !== length)
            throw new E("tlv.decode: wrong value length");
          return { v, l: data.subarray(pos + length) };
        }
      },
      // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
      // since we always use positive integers here. It must always be empty:
      // - add zero byte if exists
      // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
      _int: {
        encode(num2) {
          const { Err: E } = DER;
          if (num2 < _0n4)
            throw new E("integer: negative integers are not allowed");
          let hex = numberToHexUnpadded(num2);
          if (Number.parseInt(hex[0], 16) & 8)
            hex = "00" + hex;
          if (hex.length & 1)
            throw new E("unexpected DER parsing assertion: unpadded hex");
          return hex;
        },
        decode(data) {
          const { Err: E } = DER;
          if (data[0] & 128)
            throw new E("invalid signature integer: negative");
          if (data[0] === 0 && !(data[1] & 128))
            throw new E("invalid signature integer: unnecessary leading zero");
          return bytesToNumberBE(data);
        }
      },
      toSig(bytes) {
        const { Err: E, _int: int, _tlv: tlv } = DER;
        const data = abytes(bytes, void 0, "signature");
        const { v: seqBytes, l: seqLeftBytes } = tlv.decode(48, data);
        if (seqLeftBytes.length)
          throw new E("invalid signature: left bytes after parsing");
        const { v: rBytes, l: rLeftBytes } = tlv.decode(2, seqBytes);
        const { v: sBytes, l: sLeftBytes } = tlv.decode(2, rLeftBytes);
        if (sLeftBytes.length)
          throw new E("invalid signature: left bytes after parsing");
        return { r: int.decode(rBytes), s: int.decode(sBytes) };
      },
      hexFromSig(sig) {
        const { _tlv: tlv, _int: int } = DER;
        const rs = tlv.encode(2, int.encode(sig.r));
        const ss = tlv.encode(2, int.encode(sig.s));
        const seq = rs + ss;
        return tlv.encode(48, seq);
      }
    };
    _0n4 = BigInt(0);
    _1n4 = BigInt(1);
    _2n2 = BigInt(2);
    _3n2 = BigInt(3);
    _4n2 = BigInt(4);
  }
});

// node_modules/@noble/curves/secp256k1.js
var secp256k1_exports = {};
__export(secp256k1_exports, {
  schnorr: () => schnorr,
  secp256k1: () => secp256k1,
  secp256k1_hasher: () => secp256k1_hasher
});
function sqrtMod(y) {
  const P = secp256k1_CURVE.p;
  const _3n3 = BigInt(3), _6n = BigInt(6), _11n = BigInt(11), _22n = BigInt(22);
  const _23n = BigInt(23), _44n = BigInt(44), _88n = BigInt(88);
  const b2 = y * y * y % P;
  const b3 = b2 * b2 * y % P;
  const b6 = pow2(b3, _3n3, P) * b3 % P;
  const b9 = pow2(b6, _3n3, P) * b3 % P;
  const b11 = pow2(b9, _2n3, P) * b2 % P;
  const b22 = pow2(b11, _11n, P) * b11 % P;
  const b44 = pow2(b22, _22n, P) * b22 % P;
  const b88 = pow2(b44, _44n, P) * b44 % P;
  const b176 = pow2(b88, _88n, P) * b88 % P;
  const b220 = pow2(b176, _44n, P) * b44 % P;
  const b223 = pow2(b220, _3n3, P) * b3 % P;
  const t1 = pow2(b223, _23n, P) * b22 % P;
  const t2 = pow2(t1, _6n, P) * b2 % P;
  const root = pow2(t2, _2n3, P);
  if (!Fpk1.eql(Fpk1.sqr(root), y))
    throw new Error("Cannot find square root");
  return root;
}
function taggedHash(tag, ...messages) {
  let tagP = TAGGED_HASH_PREFIXES[tag];
  if (tagP === void 0) {
    const tagH = sha256(asciiToBytes(tag));
    tagP = concatBytes(tagH, tagH);
    TAGGED_HASH_PREFIXES[tag] = tagP;
  }
  return sha256(concatBytes(tagP, ...messages));
}
function schnorrGetExtPubKey(priv) {
  const { Fn, BASE } = Pointk1;
  const d_ = Fn.fromBytes(priv);
  const p = BASE.multiply(d_);
  const scalar = hasEven(p.y) ? d_ : Fn.neg(d_);
  return { scalar, bytes: pointToBytes(p) };
}
function lift_x(x) {
  const Fp = Fpk1;
  if (!Fp.isValidNot0(x))
    throw new Error("invalid x: Fail if x \u2265 p");
  const xx = Fp.create(x * x);
  const c = Fp.create(xx * x + BigInt(7));
  let y = Fp.sqrt(c);
  if (!hasEven(y))
    y = Fp.neg(y);
  const p = Pointk1.fromAffine({ x, y });
  p.assertValidity();
  return p;
}
function challenge(...args) {
  return Pointk1.Fn.create(num(taggedHash("BIP0340/challenge", ...args)));
}
function schnorrGetPublicKey(secretKey) {
  return schnorrGetExtPubKey(secretKey).bytes;
}
function schnorrSign(message, secretKey, auxRand = randomBytes(32)) {
  const { Fn } = Pointk1;
  const m = abytes(message, void 0, "message");
  const { bytes: px, scalar: d } = schnorrGetExtPubKey(secretKey);
  const a = abytes(auxRand, 32, "auxRand");
  const t = Fn.toBytes(d ^ num(taggedHash("BIP0340/aux", a)));
  const rand = taggedHash("BIP0340/nonce", t, px, m);
  const { bytes: rx, scalar: k } = schnorrGetExtPubKey(rand);
  const e = challenge(rx, px, m);
  const sig = new Uint8Array(64);
  sig.set(rx, 0);
  sig.set(Fn.toBytes(Fn.create(k + e * d)), 32);
  if (!schnorrVerify(sig, m, px))
    throw new Error("sign: Invalid signature produced");
  return sig;
}
function schnorrVerify(signature, message, publicKey) {
  const { Fp, Fn, BASE } = Pointk1;
  const sig = abytes(signature, 64, "signature");
  const m = abytes(message, void 0, "message");
  const pub = abytes(publicKey, 32, "publicKey");
  try {
    const P = lift_x(num(pub));
    const r = num(sig.subarray(0, 32));
    if (!Fp.isValidNot0(r))
      return false;
    const s = num(sig.subarray(32, 64));
    if (!Fn.isValidNot0(s))
      return false;
    const e = challenge(Fn.toBytes(r), pointToBytes(P), m);
    const R = BASE.multiplyUnsafe(s).add(P.multiplyUnsafe(Fn.neg(e)));
    const { x, y } = R.toAffine();
    if (R.is0() || !hasEven(y) || x !== r)
      return false;
    return true;
  } catch (error) {
    return false;
  }
}
var secp256k1_CURVE, secp256k1_ENDO, _0n5, _2n3, Fpk1, Pointk1, secp256k1, TAGGED_HASH_PREFIXES, pointToBytes, hasEven, num, schnorr, isoMap, mapSWU, secp256k1_hasher;
var init_secp256k1 = __esm({
  "node_modules/@noble/curves/secp256k1.js"() {
    "use strict";
    init_sha2();
    init_utils();
    init_curve();
    init_hash_to_curve();
    init_modular();
    init_weierstrass();
    init_utils2();
    secp256k1_CURVE = {
      p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
      n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
      h: BigInt(1),
      a: BigInt(0),
      b: BigInt(7),
      Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
      Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
    };
    secp256k1_ENDO = {
      beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
      basises: [
        [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
        [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
      ]
    };
    _0n5 = /* @__PURE__ */ BigInt(0);
    _2n3 = /* @__PURE__ */ BigInt(2);
    Fpk1 = Field(secp256k1_CURVE.p, { sqrt: sqrtMod });
    Pointk1 = /* @__PURE__ */ weierstrass(secp256k1_CURVE, {
      Fp: Fpk1,
      endo: secp256k1_ENDO
    });
    secp256k1 = /* @__PURE__ */ ecdsa(Pointk1, sha256);
    TAGGED_HASH_PREFIXES = {};
    pointToBytes = (point) => point.toBytes(true).slice(1);
    hasEven = (y) => y % _2n3 === _0n5;
    num = bytesToNumberBE;
    schnorr = /* @__PURE__ */ (() => {
      const size = 32;
      const seedLength = 48;
      const randomSecretKey = (seed = randomBytes(seedLength)) => {
        return mapHashToField(seed, secp256k1_CURVE.n);
      };
      return {
        keygen: createKeygen(randomSecretKey, schnorrGetPublicKey),
        getPublicKey: schnorrGetPublicKey,
        sign: schnorrSign,
        verify: schnorrVerify,
        Point: Pointk1,
        utils: {
          randomSecretKey,
          taggedHash,
          lift_x,
          pointToBytes
        },
        lengths: {
          secretKey: size,
          publicKey: size,
          publicKeyHasPrefix: false,
          signature: size * 2,
          seed: seedLength
        }
      };
    })();
    isoMap = /* @__PURE__ */ (() => isogenyMap(Fpk1, [
      // xNum
      [
        "0x8e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38daaaaa8c7",
        "0x7d3d4c80bc321d5b9f315cea7fd44c5d595d2fc0bf63b92dfff1044f17c6581",
        "0x534c328d23f234e6e2a413deca25caece4506144037c40314ecbd0b53d9dd262",
        "0x8e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38daaaaa88c"
      ],
      // xDen
      [
        "0xd35771193d94918a9ca34ccbb7b640dd86cd409542f8487d9fe6b745781eb49b",
        "0xedadc6f64383dc1df7c4b2d51b54225406d36b641f5e41bbc52a56612a8c6d14",
        "0x0000000000000000000000000000000000000000000000000000000000000001"
        // LAST 1
      ],
      // yNum
      [
        "0x4bda12f684bda12f684bda12f684bda12f684bda12f684bda12f684b8e38e23c",
        "0xc75e0c32d5cb7c0fa9d0a54b12a0a6d5647ab046d686da6fdffc90fc201d71a3",
        "0x29a6194691f91a73715209ef6512e576722830a201be2018a765e85a9ecee931",
        "0x2f684bda12f684bda12f684bda12f684bda12f684bda12f684bda12f38e38d84"
      ],
      // yDen
      [
        "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffff93b",
        "0x7a06534bb8bdb49fd5e9e6632722c2989467c1bfc8e8d978dfb425d2685c2573",
        "0x6484aa716545ca2cf3a70c3fa8fe337e0a3d21162f0d6299a7bf8192bfd2a76f",
        "0x0000000000000000000000000000000000000000000000000000000000000001"
        // LAST 1
      ]
    ].map((i) => i.map((j) => BigInt(j)))))();
    mapSWU = /* @__PURE__ */ (() => mapToCurveSimpleSWU(Fpk1, {
      A: BigInt("0x3f8731abdd661adca08a5558f0f5d272e953d363cb6f0e5d405447c01a444533"),
      B: BigInt("1771"),
      Z: Fpk1.create(BigInt("-11"))
    }))();
    secp256k1_hasher = /* @__PURE__ */ (() => createHasher2(Pointk1, (scalars) => {
      const { x, y } = mapSWU(Fpk1.create(scalars[0]));
      return isoMap(x, y);
    }, {
      DST: "secp256k1_XMD:SHA-256_SSWU_RO_",
      encodeDST: "secp256k1_XMD:SHA-256_SSWU_NU_",
      p: Fpk1.ORDER,
      m: 1,
      k: 128,
      expand: "xmd",
      hash: sha256
    }))();
  }
});

// node_modules/@noble/hashes/hkdf.js
function extract(hash, ikm, salt) {
  ahash(hash);
  if (salt === void 0)
    salt = new Uint8Array(hash.outputLen);
  return hmac(hash, salt, ikm);
}
function expand(hash, prk, info, length = 32) {
  ahash(hash);
  anumber(length, "length");
  const olen = hash.outputLen;
  if (length > 255 * olen)
    throw new Error("Length must be <= 255*HashLen");
  const blocks = Math.ceil(length / olen);
  if (info === void 0)
    info = EMPTY_BUFFER;
  else
    abytes(info, void 0, "info");
  const okm = new Uint8Array(blocks * olen);
  const HMAC = hmac.create(hash, prk);
  const HMACTmp = HMAC._cloneInto();
  const T = new Uint8Array(HMAC.outputLen);
  for (let counter = 0; counter < blocks; counter++) {
    HKDF_COUNTER[0] = counter + 1;
    HMACTmp.update(counter === 0 ? EMPTY_BUFFER : T).update(info).update(HKDF_COUNTER).digestInto(T);
    okm.set(T, olen * counter);
    HMAC._cloneInto(HMACTmp);
  }
  HMAC.destroy();
  HMACTmp.destroy();
  clean(T, HKDF_COUNTER);
  return okm.slice(0, length);
}
var HKDF_COUNTER, EMPTY_BUFFER, hkdf;
var init_hkdf = __esm({
  "node_modules/@noble/hashes/hkdf.js"() {
    "use strict";
    init_hmac();
    init_utils();
    HKDF_COUNTER = /* @__PURE__ */ Uint8Array.of(0);
    EMPTY_BUFFER = /* @__PURE__ */ Uint8Array.of();
    hkdf = (hash, ikm, salt, info, length) => expand(hash, extract(hash, ikm, salt), info, length);
  }
});

// profile/encryption.ts
function deriveProfileEncryptionKey(masterKey) {
  const info = new TextEncoder().encode(PROFILE_HKDF_INFO);
  return hkdf(sha256, masterKey, PROFILE_HKDF_SALT, info, KEY_LENGTH);
}
async function importKey(key) {
  return globalThis.crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}
async function encryptProfileValue(key, plaintext, aad) {
  if (aad !== void 0 && aad.length === 0) {
    throw new ProfileError(
      "ENCRYPTION_FAILED",
      "empty AAD is rejected \u2014 pass undefined to skip AAD or pass non-empty bytes"
    );
  }
  try {
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const cryptoKey = await importKey(key);
    const params = { name: "AES-GCM", iv };
    if (aad !== void 0) params.additionalData = aad;
    const ciphertextWithTag = await globalThis.crypto.subtle.encrypt(
      params,
      cryptoKey,
      plaintext
    );
    const result = new Uint8Array(IV_LENGTH + ciphertextWithTag.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(ciphertextWithTag), IV_LENGTH);
    return result;
  } catch (err) {
    if (err instanceof ProfileError) throw err;
    throw new ProfileError(
      "ENCRYPTION_FAILED",
      "AES-256-GCM encryption failed",
      err
    );
  }
}
async function decryptProfileValue(key, encrypted, aad) {
  if (aad !== void 0 && aad.length === 0) {
    throw new ProfileError(
      "DECRYPTION_FAILED",
      "empty AAD is rejected \u2014 pass undefined to skip AAD or pass non-empty bytes"
    );
  }
  if (encrypted.length < IV_LENGTH + 1) {
    throw new ProfileError(
      "DECRYPTION_FAILED",
      `Encrypted data too short: expected at least ${IV_LENGTH + 1} bytes, got ${encrypted.length}`
    );
  }
  try {
    const iv = encrypted.slice(0, IV_LENGTH);
    const ciphertextWithTag = encrypted.slice(IV_LENGTH);
    const cryptoKey = await importKey(key);
    const params = { name: "AES-GCM", iv };
    if (aad !== void 0) params.additionalData = aad;
    const plaintext = await globalThis.crypto.subtle.decrypt(
      params,
      cryptoKey,
      ciphertextWithTag
    );
    return new Uint8Array(plaintext);
  } catch (err) {
    if (err instanceof ProfileError) throw err;
    throw new ProfileError(
      "DECRYPTION_FAILED",
      "AES-256-GCM decryption failed: invalid key or tampered data",
      err
    );
  }
}
async function encryptString(key, value, aad) {
  const encoded = new TextEncoder().encode(value);
  return encryptProfileValue(key, encoded, aad);
}
async function decryptString(key, encrypted, aad) {
  const plaintext = await decryptProfileValue(key, encrypted, aad);
  return new TextDecoder().decode(plaintext);
}
var PROFILE_HKDF_INFO, IV_LENGTH, KEY_LENGTH, PROFILE_HKDF_SALT;
var init_encryption = __esm({
  "profile/encryption.ts"() {
    "use strict";
    init_hkdf();
    init_sha2();
    init_errors();
    PROFILE_HKDF_INFO = "uxf-profile-encryption";
    IV_LENGTH = 12;
    KEY_LENGTH = 32;
    PROFILE_HKDF_SALT = new TextEncoder().encode("sphere-profile-v1");
  }
});

// profile/oplog-envelope-io.ts
async function putEnvelopePayload(db, key, encryptedPayload) {
  if (typeof db.putEntry === "function") {
    const envelope = buildLocalEntry({
      type: "cache_index",
      originated: "system",
      payload: encryptedPayload
    });
    await db.putEntry(key, envelope);
    return;
  }
  await db.put(key, encryptedPayload);
  const markHook = db.markLocallyAuthored;
  if (typeof markHook === "function") {
    markHook.call(db, key);
  }
}
function unwrapEnvelopeBytes(bytes) {
  try {
    const envelope = decodeEntry(bytes);
    return envelope.payload;
  } catch {
    return bytes;
  }
}
async function getEnvelopePayload(db, key) {
  if (typeof db.getEntry === "function") {
    try {
      const envelope = await db.getEntry(key, {
        trustLocalClaim: true
      });
      if (envelope !== null) {
        return envelope.payload;
      }
      return null;
    } catch (err) {
      void err;
    }
  }
  return db.get(key);
}
var init_oplog_envelope_io = __esm({
  "profile/oplog-envelope-io.ts"() {
    "use strict";
    init_oplog_entry();
  }
});

// core/errors.ts
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
function redactValue(value, visited, depth) {
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
      clone.cause = redactValue(errCause, visited, depth + 1);
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
        clone[key] = redactValue(v, visited, depth + 1);
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
        out2.push(redactValue(item, visited, depth + 1));
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
        out[key] = redactValue(v, visited, depth + 1);
      }
    }
    return out;
  }
  return value;
}
function redactCause(cause) {
  if (cause === void 0) return void 0;
  return redactValue(cause, /* @__PURE__ */ new WeakMap(), 0);
}
var REDACTED_FIELDS, REDACTED_FIELDS_SET, MAX_REDACT_DEPTH, SphereError;
var init_errors3 = __esm({
  "core/errors.ts"() {
    "use strict";
    REDACTED_FIELDS = Object.freeze([
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
    REDACTED_FIELDS_SET = new Set(REDACTED_FIELDS);
    MAX_REDACT_DEPTH = 32;
    SphereError = class extends Error {
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
      constructor(message, code2, cause) {
        const redacted = redactCause(cause);
        super(message, redacted !== void 0 ? { cause: redacted } : void 0);
        this.name = "SphereError";
        this.code = code2;
        this.context = redacted;
      }
    };
  }
});

// profile/ipfs-client.ts
import { CID } from "multiformats/cid";
import * as raw from "multiformats/codecs/raw";
import { create as createMultihash } from "multiformats/hashes/digest";
function asHelia(value) {
  if (value === null || value === void 0) return null;
  if (typeof value !== "object") return null;
  const obj = value;
  if (!obj.blockstore || typeof obj.blockstore !== "object") return null;
  const bs = obj.blockstore;
  if (typeof bs.get !== "function" || typeof bs.put !== "function") return null;
  return value;
}
async function putBlockToLocalHelia(helia, cidString, blockBytes) {
  let parsed;
  try {
    parsed = CID.parse(cidString);
  } catch (err) {
    logger.warn(
      "ipfs-client",
      `local-helia put: cannot parse CID ${cidString}: ${err instanceof Error ? err.message : String(err)}`
    );
    return false;
  }
  try {
    await helia.blockstore.put(parsed, blockBytes);
    return true;
  } catch (err) {
    logger.warn(
      "ipfs-client",
      `local-helia put failed for ${cidString} (continuing with HTTP pin): ${err instanceof Error ? err.message : String(err)}`
    );
    return false;
  }
}
async function tryGetBlockFromLocalHelia(helia, cidString) {
  let parsed;
  try {
    parsed = CID.parse(cidString);
  } catch {
    return null;
  }
  let bytes;
  try {
    const got = await helia.blockstore.get(parsed, { offline: true });
    if (!(got instanceof Uint8Array) || got.byteLength === 0) {
      return null;
    }
    bytes = got;
  } catch {
    return null;
  }
  try {
    verifyCidMatchesBytes(cidString, bytes);
  } catch (err) {
    logger.warn(
      "ipfs-client",
      `local-helia get returned bytes whose sha256 does NOT match ${cidString} (likely on-disk corruption); falling through to HTTP gateways: ${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  }
  return bytes;
}
function submitToSidecarBestEffort(gateway, cid, bytes) {
  if (typeof gateway !== "string" || gateway.length === 0) return;
  if (typeof cid !== "string" || cid.length === 0) return;
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) return;
  if (bytes.length > SIDECAR_SUBMIT_MAX_BYTES) return;
  const url = `${gateway.replace(/\/$/, "")}/sidecar/submit?cid=${encodeURIComponent(cid)}`;
  void fetch(url, {
    method: "POST",
    body: bytes,
    headers: { "Content-Type": "application/octet-stream" },
    signal: AbortSignal.timeout(SIDECAR_SUBMIT_TIMEOUT_MS)
  }).then((response) => {
    if (!response.ok) {
      logger.debug(
        "IPFS-Sidecar",
        `submit ${cid.slice(0, 16)} \u2192 HTTP ${response.status} (${response.statusText}) on ${gateway}`
      );
    } else {
      logger.debug(
        "IPFS-Sidecar",
        `submit ${cid.slice(0, 16)} \u2192 200 on ${gateway}`
      );
    }
    response.body?.cancel?.().catch(() => {
    });
  }).catch(() => {
  });
}
async function tryReadFromSidecar(gateway, cid) {
  if (typeof gateway !== "string" || gateway.length === 0) return null;
  if (typeof cid !== "string" || cid.length === 0) return null;
  try {
    const url = `${gateway.replace(/\/$/, "")}/sidecar/blob?cid=${encodeURIComponent(cid)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/octet-stream" },
      signal: AbortSignal.timeout(SIDECAR_READ_TIMEOUT_MS)
    });
    if (!response.ok) {
      response.body?.cancel?.().catch(() => {
      });
      return null;
    }
    const ct = (response.headers.get("Content-Type") ?? "").toLowerCase();
    if (ct && !ct.startsWith("application/octet-stream") && !ct.startsWith("application/vnd.ipld")) {
      response.body?.cancel?.().catch(() => {
      });
      return null;
    }
    const buf = await response.arrayBuffer();
    if (buf.byteLength === 0) return null;
    logger.debug(
      "IPFS-Sidecar",
      `read hit ${cid.slice(0, 16)} (${buf.byteLength} bytes) on ${gateway}`
    );
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}
async function pinSingleBlock(gateways, blockBytes, expectedCid, timeoutMs) {
  const effectiveGateways = gateways.length > 0 ? gateways : [DEFAULT_IPFS_API_URL];
  validateGatewayUrls(effectiveGateways);
  let codecName = "raw";
  try {
    const parsed = CID.parse(expectedCid);
    codecName = CODEC_NAMES[parsed.code] ?? "raw";
  } catch {
  }
  let lastError = null;
  for (const gateway of effectiveGateways) {
    try {
      const url = `${gateway.replace(/\/$/, "")}/api/v0/dag/put?input-codec=${codecName}&store-codec=${codecName}&pin=true&hash=sha2-256`;
      const form = new FormData();
      form.append("data", new Blob([blockBytes]), "block");
      const response = await fetch(url, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} ${response.statusText} from ${gateway}`);
        continue;
      }
      try {
        await response.json();
      } catch {
      }
      submitToSidecarBestEffort(gateway, expectedCid, blockBytes);
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw new ProfileError(
    "ORBITDB_WRITE_FAILED",
    `IPFS dag/put failed on all gateways for ${expectedCid}: ${lastError?.message ?? "unknown error"}`,
    lastError
  );
}
async function pinCarBlocksToIpfs(gateways, carBytes, expectedRootCid, timeoutMs = DEFAULT_PIN_TIMEOUT_MS, helia) {
  const localHelia = asHelia(helia);
  const { CarReader: CarReader5 } = await import("@ipld/car");
  let reader;
  try {
    reader = await CarReader5.fromBytes(carBytes);
  } catch (err) {
    throw new ProfileError(
      "ORBITDB_WRITE_FAILED",
      `Failed to parse CAR for block-by-block pinning: ${err instanceof Error ? err.message : String(err)}`,
      err
    );
  }
  const blocks = [];
  for await (const block of reader.blocks()) {
    blocks.push({ cid: block.cid.toString(), bytes: block.bytes });
  }
  if (blocks.length === 0) {
    throw new ProfileError(
      "ORBITDB_WRITE_FAILED",
      "CAR contained zero blocks \u2014 refusing to publish a phantom rootCid."
    );
  }
  if (!blocks.some((b) => b.cid === expectedRootCid)) {
    throw new ProfileError(
      "ORBITDB_WRITE_FAILED",
      `expectedRootCid ${expectedRootCid} is not present among CAR blocks (count=${blocks.length}) \u2014 builder/publisher mismatch.`
    );
  }
  for (const block of blocks) {
    if (localHelia !== null) {
      let cidBindingOk = true;
      try {
        verifyCidMatchesBytes(block.cid, block.bytes);
      } catch (err) {
        cidBindingOk = false;
        logger.warn(
          "ipfs-client",
          `pinCarBlocksToIpfs: producer-side CID/bytes mismatch for ${block.cid} \u2014 skipping local-helia put to avoid poisoning the on-disk store. Continuing with HTTP pin (Kubo will redirect to the truthful CID). ${err instanceof Error ? err.message : String(err)}`
        );
      }
      if (cidBindingOk) {
        await putBlockToLocalHelia(localHelia, block.cid, block.bytes);
      }
    }
    await pinSingleBlock(gateways, block.bytes, block.cid, timeoutMs);
  }
  return expectedRootCid;
}
async function fetchFromIpfs(gateways, cid, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS2, maxSizeBytes = DEFAULT_MAX_SIZE_BYTES, helia) {
  const localHelia = asHelia(helia);
  if (localHelia !== null) {
    const local = await tryGetBlockFromLocalHelia(localHelia, cid);
    if (local !== null) {
      if (local.byteLength > maxSizeBytes) {
      } else {
        return local;
      }
    }
  }
  const effectiveGateways = gateways.length > 0 ? gateways : [DEFAULT_IPFS_API_URL];
  validateGatewayUrls(effectiveGateways);
  let lastError = null;
  const tryFetchBlock = async (gateway, method) => {
    const url = `${gateway.replace(/\/$/, "")}/api/v0/block/get?arg=${encodeURIComponent(cid)}`;
    const response = await fetch(url, {
      method,
      headers: { Accept: "application/octet-stream" },
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!response.ok) {
      const retryAsGet = method === "POST" && (response.status === 405 || response.status === 501);
      return {
        bytes: null,
        reason: `HTTP ${response.status} from ${gateway} (${method})`,
        retryAsGet
      };
    }
    const contentType = (response.headers.get("Content-Type") ?? "").toLowerCase();
    const isHtmlOrJson = contentType.startsWith("text/html") || contentType.startsWith("application/json");
    if (isHtmlOrJson) {
      return {
        bytes: null,
        reason: `gateway ${gateway} returned ${contentType} for /api/v0/block/get (likely API disabled or wrong endpoint)`,
        retryAsGet: false
      };
    }
    const contentLength = response.headers.get("Content-Length");
    if (contentLength != null) {
      const size = parseInt(contentLength, 10);
      if (!isNaN(size) && size > maxSizeBytes) {
        return {
          bytes: null,
          reason: `Response size ${size} bytes exceeds limit of ${maxSizeBytes} bytes from ${gateway}`,
          retryAsGet: false
        };
      }
    }
    let bytes;
    if (response.body != null) {
      bytes = await readStreamWithLimit(response.body, maxSizeBytes, gateway);
    } else {
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > maxSizeBytes) {
        throw new ProfileError(
          "BUNDLE_NOT_FOUND",
          `Response ${buffer.byteLength} bytes exceeds limit ${maxSizeBytes} from ${gateway}`
        );
      }
      bytes = new Uint8Array(buffer);
    }
    return { bytes, reason: null, retryAsGet: false };
  };
  if (effectiveGateways.length > 0) {
    const sidecarBytes = await tryReadFromSidecar(effectiveGateways[0], cid);
    if (sidecarBytes !== null && sidecarBytes.byteLength <= maxSizeBytes) {
      try {
        verifyCidMatchesBytes(cid, sidecarBytes);
        if (localHelia !== null) {
          await putBlockToLocalHelia(localHelia, cid, sidecarBytes);
        }
        return sidecarBytes;
      } catch (verifyErr) {
        logger.warn(
          "IPFS-Sidecar",
          `read CID mismatch on ${cid.slice(0, 16)} from ${effectiveGateways[0]} (${sidecarBytes.byteLength} bytes); falling through to /api/v0/block/get. Reason: ${verifyErr instanceof Error ? verifyErr.message : String(verifyErr)}`
        );
      }
    }
  }
  for (const gateway of effectiveGateways) {
    try {
      let bytesOrNull = null;
      const attempt = await tryFetchBlock(gateway, "POST");
      if (attempt.bytes !== null) {
        bytesOrNull = attempt.bytes;
      } else if (attempt.retryAsGet) {
        const second = await tryFetchBlock(gateway, "GET");
        if (second.bytes !== null) {
          bytesOrNull = second.bytes;
        } else {
          lastError = new Error(`${attempt.reason}; GET retry: ${second.reason}`);
          continue;
        }
      } else {
        lastError = new Error(attempt.reason ?? "unknown gateway error");
        continue;
      }
      try {
        verifyCidMatchesBytes(cid, bytesOrNull);
      } catch (verifyErr) {
        lastError = verifyErr instanceof Error ? verifyErr : new Error(String(verifyErr));
        continue;
      }
      if (localHelia !== null) {
        await putBlockToLocalHelia(localHelia, cid, bytesOrNull);
      }
      return bytesOrNull;
    } catch (err) {
      if (err instanceof ProfileError) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw new ProfileError(
    "BUNDLE_NOT_FOUND",
    `Failed to fetch CAR ${cid} from all gateways: ${lastError?.message ?? "unknown error"}`,
    lastError
  );
}
async function fetchCarFromIpfs(gateways, rootCid, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS2, maxSizeBytesPerBlock = DEFAULT_MAX_SIZE_BYTES, helia) {
  let parsedRoot;
  try {
    parsedRoot = CID.parse(rootCid);
  } catch (err) {
    throw new ProfileError(
      "BUNDLE_NOT_FOUND",
      `fetchCarFromIpfs: cannot parse root CID ${rootCid}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  if (parsedRoot.code === CODEC_RAW) {
    return fetchFromIpfs(gateways, rootCid, timeoutMs, maxSizeBytesPerBlock, helia);
  }
  if (parsedRoot.code !== CODEC_DAG_CBOR) {
    throw new ProfileError(
      "BUNDLE_NOT_FOUND",
      `fetchCarFromIpfs: unsupported root codec 0x${parsedRoot.code.toString(16)} for ${rootCid} (expected dag-cbor 0x71 or raw 0x55)`
    );
  }
  const { decode: dagCborDecode3 } = await import("@ipld/dag-cbor");
  const { CarWriter: CarWriter3 } = await import("@ipld/car/writer");
  const visited = /* @__PURE__ */ new Set();
  const blocks = [];
  const queue = [rootCid];
  while (queue.length > 0) {
    if (blocks.length >= FETCH_CAR_MAX_BLOCKS) {
      throw new ProfileError(
        "BUNDLE_NOT_FOUND",
        `fetchCarFromIpfs: block count exceeded ${FETCH_CAR_MAX_BLOCKS} walking from ${rootCid} (possible cyclic or maliciously-fanned-out DAG)`
      );
    }
    const cidStr = queue.shift();
    if (visited.has(cidStr)) continue;
    visited.add(cidStr);
    let blockCid;
    try {
      blockCid = CID.parse(cidStr);
    } catch (err) {
      throw new ProfileError(
        "BUNDLE_NOT_FOUND",
        `fetchCarFromIpfs: child CID ${cidStr} (reachable from ${rootCid}) failed to parse: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    const blockBytes = await fetchFromIpfs(
      gateways,
      cidStr,
      timeoutMs,
      maxSizeBytesPerBlock,
      helia
    );
    blocks.push({ cid: blockCid, bytes: blockBytes });
    if (blockCid.code === CODEC_DAG_CBOR) {
      let decoded;
      try {
        decoded = dagCborDecode3(blockBytes);
      } catch (err) {
        throw new ProfileError(
          "BUNDLE_NOT_FOUND",
          `fetchCarFromIpfs: dag-cbor decode failed for ${cidStr} (reachable from ${rootCid}): ${err instanceof Error ? err.message : String(err)}`,
          err
        );
      }
      const visit = (childCid) => {
        const childStr = childCid.toString();
        if (!visited.has(childStr)) queue.push(childStr);
      };
      if (isUxfElement(decoded)) {
        walkUxfElement(decoded, visit);
      } else {
        collectCidLinks(decoded, visit);
      }
    }
  }
  const { writer, out } = CarWriter3.create([parsedRoot]);
  const chunks = [];
  const collectPromise = (async () => {
    for await (const chunk of out) {
      chunks.push(chunk);
    }
  })();
  try {
    for (const block of blocks) {
      await writer.put(block);
    }
  } finally {
    await writer.close();
  }
  await collectPromise;
  let totalLength = 0;
  for (const c of chunks) totalLength += c.length;
  const carBytes = new Uint8Array(totalLength);
  let offset = 0;
  for (const c of chunks) {
    carBytes.set(c, offset);
    offset += c.length;
  }
  return carBytes;
}
function collectCidLinks(value, visit) {
  if (value === null || value === void 0) return;
  if (typeof value !== "object") return;
  if (value instanceof Uint8Array) return;
  const asCid = CID.asCID(value);
  if (asCid !== null) {
    visit(asCid);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectCidLinks(item, visit);
    return;
  }
  for (const v of Object.values(value)) {
    collectCidLinks(v, visit);
  }
}
function isUxfElement(value) {
  if (value === null || typeof value !== "object") return false;
  if (value instanceof Uint8Array) return false;
  if (Array.isArray(value)) return false;
  const obj = value;
  if (!Array.isArray(obj.header)) return false;
  if (obj.header.length < 4) return false;
  if (typeof obj.type !== "number") return false;
  if (typeof obj.content !== "object" || obj.content === null) return false;
  if (Array.isArray(obj.content)) return false;
  if (typeof obj.children !== "object" || obj.children === null) return false;
  if (Array.isArray(obj.children)) return false;
  return true;
}
function contentHashBytesToCid(bytes) {
  return CID.createV1(CODEC_DAG_CBOR, createMultihash(MULTIHASH_SHA256, bytes));
}
function walkUxfElement(node, visit) {
  const predecessor = node.header[3];
  if (predecessor instanceof Uint8Array && predecessor.byteLength === SHA256_DIGEST_BYTES) {
    visit(contentHashBytesToCid(predecessor));
  } else {
    const asCid = predecessor != null ? CID.asCID(predecessor) : null;
    if (asCid !== null) visit(asCid);
  }
  for (const value of Object.values(node.children)) {
    walkUxfChildValue(value, visit);
  }
}
function walkUxfChildValue(value, visit) {
  if (value === null || value === void 0) return;
  if (value instanceof Uint8Array) {
    if (value.byteLength === SHA256_DIGEST_BYTES) {
      visit(contentHashBytesToCid(value));
    }
    return;
  }
  const asCid = CID.asCID(value);
  if (asCid !== null) {
    visit(asCid);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) walkUxfChildValue(item, visit);
  }
}
function verifyCidMatchesBytes(cidString, bytes) {
  let parsed;
  try {
    parsed = CID.parse(cidString);
  } catch (err) {
    throw new ProfileError(
      "BUNDLE_NOT_FOUND",
      `Cannot parse CID ${cidString}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  if (parsed.multihash.code !== 18) {
    throw new ProfileError(
      "BUNDLE_NOT_FOUND",
      `Unsupported multihash code 0x${parsed.multihash.code.toString(16)} for CID ${cidString}; only sha2-256 is verified`
    );
  }
  const expected = parsed.multihash.digest;
  const actual = sha256(bytes);
  if (!bytesEqual(expected, actual)) {
    throw new ProfileError(
      "BUNDLE_NOT_FOUND",
      `CID verification failed for ${cidString}: gateway returned bytes whose sha256 does not match the CID`
    );
  }
}
function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
async function verifyCidAccessible(gateways, cid, timeoutMs = DEFAULT_VERIFY_TIMEOUT_MS) {
  const effectiveGateways = gateways.length > 0 ? gateways : [DEFAULT_IPFS_API_URL];
  validateGatewayUrls(effectiveGateways);
  for (const gateway of effectiveGateways) {
    try {
      const url = `${gateway.replace(/\/$/, "")}/ipfs/${cid}`;
      const response = await fetch(url, {
        method: "HEAD",
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (response.ok) return true;
    } catch {
    }
  }
  return false;
}
async function verifyCidAccessibleWithRetry(gateways, cid, options) {
  const startedAt = Date.now();
  const deadline = startedAt + Math.max(0, options.deadlineMs);
  const perAttemptTimeoutMs = options.perAttemptTimeoutMs ?? DEFAULT_VERIFY_TIMEOUT_MS;
  let attempts = 0;
  let delay = VERIFY_RETRY_INITIAL_DELAY_MS;
  for (; ; ) {
    if (options.signal?.aborted) {
      return {
        ok: false,
        attempts,
        elapsedMs: Date.now() - startedAt,
        failureKind: "aborted"
      };
    }
    attempts += 1;
    const ok = await verifyCidAccessible(gateways, cid, perAttemptTimeoutMs);
    if (ok) {
      return { ok: true, attempts, elapsedMs: Date.now() - startedAt };
    }
    const now = Date.now();
    if (now >= deadline) {
      return {
        ok: false,
        attempts,
        elapsedMs: now - startedAt,
        failureKind: "deadline-exceeded"
      };
    }
    const remaining = deadline - now;
    const sleepMs = Math.min(delay, remaining);
    if (sleepMs > 0) {
      await sleepInterruptible(sleepMs, options.signal);
    }
    delay = Math.min(delay * 2, VERIFY_RETRY_MAX_DELAY_MS);
  }
}
function sleepInterruptible(ms, signal) {
  if (!signal) {
    return new Promise((r) => setTimeout(r, ms));
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      resolve();
    };
    if (signal.aborted) {
      clearTimeout(timer);
      resolve();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
function validateGatewayUrls(gateways) {
  for (const gateway of gateways) {
    let u;
    try {
      u = new URL(gateway);
    } catch (err) {
      throw new Error(
        `Invalid IPFS gateway URL "${gateway}": ${err instanceof Error ? err.message : String(err)}`
      );
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new Error(
        `IPFS gateway URL must use http:// or https://, got "${gateway}" (protocol="${u.protocol}")`
      );
    }
    if (u.username !== "" || u.password !== "") {
      throw new Error(`IPFS gateway URL must not contain userinfo: "${gateway}"`);
    }
  }
}
async function readStreamWithLimit(body, maxBytes, gatewayLabel) {
  const reader = body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        reader.cancel();
        throw new ProfileError(
          "BUNDLE_NOT_FOUND",
          `Response from ${gatewayLabel} exceeded size limit of ${maxBytes} bytes (read ${totalBytes} so far)`
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
var MULTIHASH_SHA256, SHA256_DIGEST_BYTES, CODEC_RAW, CODEC_DAG_CBOR, FETCH_CAR_MAX_BLOCKS, DEFAULT_IPFS_API_URL, DEFAULT_PIN_TIMEOUT_MS, DEFAULT_FETCH_TIMEOUT_MS2, DEFAULT_VERIFY_TIMEOUT_MS, DEFAULT_MAX_SIZE_BYTES, SIDECAR_SUBMIT_MAX_BYTES, SIDECAR_SUBMIT_TIMEOUT_MS, SIDECAR_READ_TIMEOUT_MS, CODEC_NAMES, VERIFY_RETRY_INITIAL_DELAY_MS, VERIFY_RETRY_MAX_DELAY_MS;
var init_ipfs_client = __esm({
  "profile/ipfs-client.ts"() {
    "use strict";
    init_sha2();
    init_logger();
    init_errors();
    MULTIHASH_SHA256 = 18;
    SHA256_DIGEST_BYTES = 32;
    CODEC_RAW = 85;
    CODEC_DAG_CBOR = 113;
    FETCH_CAR_MAX_BLOCKS = 1e4;
    DEFAULT_IPFS_API_URL = "https://ipfs.unicity.network";
    DEFAULT_PIN_TIMEOUT_MS = 6e4;
    DEFAULT_FETCH_TIMEOUT_MS2 = 3e4;
    DEFAULT_VERIFY_TIMEOUT_MS = 1e4;
    DEFAULT_MAX_SIZE_BYTES = 50 * 1024 * 1024;
    SIDECAR_SUBMIT_MAX_BYTES = 32 * 1024 * 1024;
    SIDECAR_SUBMIT_TIMEOUT_MS = 5e3;
    SIDECAR_READ_TIMEOUT_MS = 500;
    CODEC_NAMES = {
      85: "raw",
      // raw
      113: "dag-cbor",
      // dag-cbor
      112: "dag-pb"
      // dag-pb (legacy IPFS UnixFS — not produced by Profile, listed for completeness)
    };
    VERIFY_RETRY_INITIAL_DELAY_MS = 500;
    VERIFY_RETRY_MAX_DELAY_MS = 5e3;
  }
});

// types/uxf-transfer.ts
var init_uxf_transfer = __esm({
  "types/uxf-transfer.ts"() {
    "use strict";
  }
});

// uxf/limits.ts
var CAR_IMPORT_MAX_BLOCK_COUNT, CAR_IMPORT_MAX_BLOCK_BYTES, VERIFY_MAX_ELEMENT_BYTES, EXTRACT_CAR_ROOT_HEADER_PROBE_BYTES, CAR_IMPORT_MAX_TOTAL_BYTES, MANIFEST_MAX_SIZE, ELEMENTS_MAX_SIZE, MAX_CREATOR_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_SMT_PATH_DECIMAL_LENGTH;
var init_limits = __esm({
  "uxf/limits.ts"() {
    "use strict";
    CAR_IMPORT_MAX_BLOCK_COUNT = 1e4;
    CAR_IMPORT_MAX_BLOCK_BYTES = 64 * 1024;
    VERIFY_MAX_ELEMENT_BYTES = 64 * 1024;
    EXTRACT_CAR_ROOT_HEADER_PROBE_BYTES = 4 * 1024;
    CAR_IMPORT_MAX_TOTAL_BYTES = 64 * 1024 * 1024;
    MANIFEST_MAX_SIZE = 1e5;
    ELEMENTS_MAX_SIZE = 1e5;
    MAX_CREATOR_LENGTH = 256;
    MAX_DESCRIPTION_LENGTH = 1024;
    MAX_SMT_PATH_DECIMAL_LENGTH = 78;
  }
});

// uxf/transfer-payload.ts
import { CarReader as CarReader2 } from "@ipld/car";
import { bytesReader, readHeader } from "@ipld/car/decoder";
import { Buffer as Buffer2 } from "buffer";
async function extractCarRootCid2(carBytes) {
  let roots;
  let fastPathError;
  if (carBytes.byteLength > EXTRACT_CAR_ROOT_HEADER_PROBE_BYTES) {
    const probe = carBytes.subarray(0, EXTRACT_CAR_ROOT_HEADER_PROBE_BYTES);
    try {
      const reader = bytesReader(probe);
      const header = await readHeader(reader);
      const headerRoots = header.roots;
      if (Array.isArray(headerRoots)) {
        roots = headerRoots;
      }
    } catch (err) {
      fastPathError = err;
    }
  }
  if (roots === void 0) {
    let reader;
    try {
      reader = await CarReader2.fromBytes(carBytes);
    } catch (cause) {
      throw new SphereError(
        "extractCarRootCid: CAR bytes did not parse",
        "BUNDLE_REJECTED_INVALID_CAR",
        // Prefer the fast-path failure if we have one — it's the more
        // precise diagnostic on a header-level error.
        fastPathError ?? cause
      );
    }
    roots = await reader.getRoots();
  }
  if (roots.length !== 1) {
    throw new SphereError(
      `extractCarRootCid: expected single-root CAR, found ${roots.length}`,
      "BUNDLE_REJECTED_MULTI_ROOT"
    );
  }
  const root = roots[0];
  if (root.version !== 1) {
    throw new SphereError(
      `extractCarRootCid: CAR root must be CIDv1; got CIDv${root.version}`,
      "BUNDLE_REJECTED_INVALID_CAR"
    );
  }
  const cidStr = root.toString();
  if (!cidStr.startsWith("b")) {
    throw new SphereError(
      `extractCarRootCid: expected base32 multibase prefix 'b'; got '${cidStr.slice(0, 1)}'`,
      "BUNDLE_REJECTED_INVALID_CAR"
    );
  }
  return cidStr;
}
var MAX_DECODE_CONTENT_BYTES;
var init_transfer_payload = __esm({
  "uxf/transfer-payload.ts"() {
    "use strict";
    init_errors3();
    init_uxf_transfer();
    init_limits();
    MAX_DECODE_CONTENT_BYTES = 8 * 1024 * 1024;
  }
});

// uxf/errors.ts
var UxfError;
var init_errors4 = __esm({
  "uxf/errors.ts"() {
    "use strict";
    UxfError = class extends Error {
      constructor(code2, message, cause) {
        super(`[UXF:${code2}] ${message}`);
        this.code = code2;
        this.cause = cause;
        this.name = "UxfError";
      }
    };
  }
});

// uxf/types.ts
function contentHash(hex) {
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    throw new UxfError("INVALID_HASH", `Invalid content hash: ${hex}`);
  }
  return hex;
}
var ELEMENT_TYPE_TOKEN_ROOT, ELEMENT_TYPE_TRANSACTION, ELEMENT_TYPE_INCLUSION_PROOF, ELEMENT_TYPE_IDS, STRATEGY_LATEST;
var init_types = __esm({
  "uxf/types.ts"() {
    "use strict";
    init_errors4();
    ELEMENT_TYPE_TOKEN_ROOT = "token-root";
    ELEMENT_TYPE_TRANSACTION = "transaction";
    ELEMENT_TYPE_INCLUSION_PROOF = "inclusion-proof";
    ELEMENT_TYPE_IDS = {
      "token-root": 1,
      "genesis": 2,
      "transaction": 3,
      "genesis-data": 4,
      "transaction-data": 5,
      "token-state": 6,
      "predicate": 7,
      "inclusion-proof": 8,
      "authenticator": 9,
      "unicity-certificate": 10,
      "token-coin-data": 12,
      "smt-path": 13,
      "pending-authenticator": 14
    };
    STRATEGY_LATEST = { type: "latest" };
  }
});

// core/bech32.ts
var init_bech32 = __esm({
  "core/bech32.ts"() {
    "use strict";
    init_errors3();
    init_hex();
  }
});

// core/crypto.ts
import * as bip39 from "bip39";
import CryptoJS from "crypto-js";
import elliptic from "elliptic";
function hexToBytes5(hex) {
  if (hex.length === 0) return new Uint8Array(0);
  if ((hex.length & 1) !== 0) {
    throw new RangeError(`hexToBytes: odd-length hex string (length=${hex.length})`);
  }
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new RangeError("hexToBytes: non-hex character in input");
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return out;
}
function bytesToHex5(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
var ec, CURVE_ORDER;
var init_crypto = __esm({
  "core/crypto.ts"() {
    "use strict";
    init_bech32();
    init_errors3();
    ec = new elliptic.ec("secp256k1");
    CURVE_ORDER = BigInt(
      "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141"
    );
  }
});

// uxf/hash.ts
import { encode } from "@ipld/dag-cbor";
function hexToBytes6(hex) {
  if (hex.length % 2 !== 0) {
    throw new UxfError("INVALID_HASH", `Hex string has odd length: ${hex.length}`);
  }
  if (!/^[0-9a-fA-F]*$/.test(hex)) {
    throw new UxfError("INVALID_HASH", "Hex string contains invalid characters");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
function prepareContentForHashing(type, content) {
  const byteFields = BYTE_FIELDS[type];
  const result = {};
  for (const [key, value] of Object.entries(content)) {
    if (value === void 0) {
      continue;
    }
    if (type === "smt-path" && key === "segments") {
      result[key] = prepareSmtSegments(
        value
      );
      continue;
    }
    if (type === "transaction-data" && key === "nametagRefs") {
      const refs = value;
      result[key] = refs.map((h) => {
        if (h === "") {
          throw new UxfError("INVALID_HASH", "nametagRefs entry must be non-empty ContentHash hex");
        }
        return hexToBytes6(h);
      });
      continue;
    }
    if (value === null) {
      result[key] = null;
      continue;
    }
    if (byteFields.has(key)) {
      if (typeof value === "string") {
        if (value.length === 0) {
          result[key] = null;
          continue;
        }
        const decoded = hexToBytes6(value);
        result[key] = decoded.length === 0 ? null : decoded;
        continue;
      }
    }
    if (value instanceof Uint8Array) {
      if (byteFields.has(key) && value.length === 0) {
        result[key] = null;
        continue;
      }
      result[key] = value;
      continue;
    }
    result[key] = value;
  }
  return result;
}
function bigIntTo32Bytes(b) {
  if (b < 0n) {
    throw new UxfError("INVALID_HASH", `SMT path must be non-negative: ${b}`);
  }
  const buf = new Uint8Array(32);
  let v = b;
  for (let i = 31; i >= 0; i--) {
    buf[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  if (v !== 0n) {
    throw new UxfError("INVALID_HASH", `SMT path exceeds 256 bits: ${b}`);
  }
  return buf;
}
function prepareSmtSegments(segments) {
  return segments.map((seg) => ({
    data: seg.data === null || seg.data === void 0 ? null : hexToBytes6(seg.data),
    // Steelman remediation (FIX 11): BigInt() is permissive — it accepts
    // " 100 ", "00100", "+100", "0xff", and many other lexical shapes
    // that are NOT canonical decimal integers. Validate against a
    // strict decimal regex BEFORE handing the string to BigInt() so a
    // hostile peer cannot smuggle a path under a non-canonical
    // representation that round-trips to a different bigint.
    path: bigIntTo32Bytes(parseSmtPathDecimal(seg.path))
  }));
}
function parseSmtPathDecimal(s) {
  if (typeof s !== "string" || !/^(0|[1-9][0-9]*)$/.test(s)) {
    throw new UxfError("INVALID_INPUT", `Invalid SMT path string: ${s}`);
  }
  if (s.length > MAX_SMT_PATH_DECIMAL_LENGTH) {
    throw new UxfError(
      "LIMIT_EXCEEDED",
      `SMT path decimal exceeds MAX_SMT_PATH_DECIMAL_LENGTH=${MAX_SMT_PATH_DECIMAL_LENGTH}: ${s.length}`
    );
  }
  return BigInt(s);
}
function prepareChildrenForHashing(children) {
  const result = {};
  for (const [key, value] of Object.entries(children)) {
    if (value === null) {
      result[key] = null;
    } else if (Array.isArray(value)) {
      result[key] = value.map((h) => hexToBytes6(h));
    } else {
      result[key] = hexToBytes6(value);
    }
  }
  return result;
}
function computeElementHash(element) {
  const header = [
    element.header.representation,
    element.header.semantics,
    element.header.kind,
    element.header.predecessor !== null ? hexToBytes6(element.header.predecessor) : null
  ];
  const typeId = ELEMENT_TYPE_IDS[element.type];
  if (typeId === void 0) {
    throw new UxfError(
      "INVALID_HASH",
      `Unknown element type: ${String(element.type)}`
    );
  }
  const preparedContent = prepareContentForHashing(
    element.type,
    element.content
  );
  const preparedChildren = prepareChildrenForHashing(
    element.children
  );
  const canonical = {
    header,
    type: typeId,
    content: preparedContent,
    children: preparedChildren
  };
  const cborBytes = encode(canonical);
  const hashBytes = sha256(cborBytes);
  return contentHash(bytesToHex5(hashBytes));
}
var BYTE_FIELDS;
var init_hash = __esm({
  "uxf/hash.ts"() {
    "use strict";
    init_sha2();
    init_crypto();
    init_types();
    init_errors4();
    init_limits();
    BYTE_FIELDS = {
      "token-root": /* @__PURE__ */ new Set(["tokenId"]),
      "genesis": /* @__PURE__ */ new Set(),
      "genesis-data": /* @__PURE__ */ new Set([
        "tokenId",
        "tokenType",
        "salt",
        "tokenData",
        "recipientDataHash"
      ]),
      "transaction": /* @__PURE__ */ new Set(),
      "transaction-data": /* @__PURE__ */ new Set([
        "salt",
        "recipientDataHash"
      ]),
      "inclusion-proof": /* @__PURE__ */ new Set(["transactionHash"]),
      "authenticator": /* @__PURE__ */ new Set([
        "publicKey",
        "signature",
        "stateHash"
      ]),
      "unicity-certificate": /* @__PURE__ */ new Set(["raw"]),
      "predicate": /* @__PURE__ */ new Set(["raw"]),
      "token-state": /* @__PURE__ */ new Set(["data", "predicate"]),
      "token-coin-data": /* @__PURE__ */ new Set(),
      "smt-path": /* @__PURE__ */ new Set(["root"]),
      // #202 — Same byte-fields as `authenticator`. The element type tag is
      // different (pending vs. proven) but the wire content is identical.
      "pending-authenticator": /* @__PURE__ */ new Set([
        "publicKey",
        "signature",
        "stateHash"
      ])
    };
  }
});

// uxf/element-pool.ts
function walkReachable(pool, hash, instanceChains, reachable) {
  if (reachable.has(hash)) {
    return;
  }
  reachable.add(hash);
  const chainEntry = instanceChains.get(hash);
  if (chainEntry) {
    for (const link of chainEntry.chain) {
      if (!reachable.has(link.hash)) {
        reachable.add(link.hash);
        walkElementChildren(pool, link.hash, instanceChains, reachable);
      }
    }
  }
  walkElementChildren(pool, hash, instanceChains, reachable);
}
function walkElementChildren(pool, hash, instanceChains, reachable) {
  const element = pool instanceof ElementPool ? pool.get(hash) : pool.get(hash);
  if (!element) {
    return;
  }
  for (const childRef of Object.values(element.children)) {
    if (childRef === null) {
      continue;
    }
    if (Array.isArray(childRef)) {
      for (const childHash of childRef) {
        walkReachable(pool, childHash, instanceChains, reachable);
      }
    } else {
      walkReachable(pool, childRef, instanceChains, reachable);
    }
  }
}
function collectGarbage(pkg) {
  const reachable = /* @__PURE__ */ new Set();
  for (const rootHash of pkg.manifest.tokens.values()) {
    walkReachable(pkg.pool, rootHash, pkg.instanceChains, reachable);
  }
  const removed = /* @__PURE__ */ new Set();
  const mutablePool = pkg.pool;
  for (const hash of pkg.pool.keys()) {
    if (!reachable.has(hash)) {
      removed.add(hash);
    }
  }
  for (const hash of removed) {
    mutablePool.delete(hash);
  }
  if (removed.size > 0) {
    const mutableChains = pkg.instanceChains;
    for (const hash of removed) {
      mutableChains.delete(hash);
    }
  }
  return removed;
}
var ElementPool;
var init_element_pool = __esm({
  "uxf/element-pool.ts"() {
    "use strict";
    init_hash();
    init_errors4();
    ElementPool = class _ElementPool {
      /** hash -> element. The canonical store. */
      elements = /* @__PURE__ */ new Map();
      /** Number of elements in the pool. */
      get size() {
        return this.elements.size;
      }
      /** Check if an element with the given hash exists. */
      has(hash) {
        return this.elements.has(hash);
      }
      /** Get element by hash, or undefined if not present. */
      get(hash) {
        return this.elements.get(hash);
      }
      /**
       * Insert an element into the pool.
       * Computes the content hash via {@link computeElementHash} and deduplicates:
       * if an element with the same hash already exists, this is a no-op.
       *
       * @returns The content hash of the element.
       */
      put(element) {
        const hash = computeElementHash(element);
        if (!this.elements.has(hash)) {
          this.elements.set(hash, element);
        }
        return hash;
      }
      /**
       * Remove an element by hash.
       *
       * @returns true if the element was present and removed, false otherwise.
       */
      delete(hash) {
        return this.elements.delete(hash);
      }
      /** Iterate all [hash, element] pairs. */
      entries() {
        return this.elements.entries();
      }
      /** Iterate all content hashes in the pool. */
      hashes() {
        return this.elements.keys();
      }
      /** Iterate all elements in the pool. */
      values() {
        return this.elements.values();
      }
      /**
       * Export the pool's contents as a ReadonlyMap.
       * Returns the internal Map directly (no copy) for efficient read access.
       */
      toMap() {
        return this.elements;
      }
      /**
       * Create an ElementPool pre-populated from a Map.
       *
       * Steelman²⁸ warning: previously copied by reference (no re-hashing),
       * silently trusting caller-supplied keys. A caller passing a corrupt
       * map (key=0xdead but element hashes to 0xbeef) would propagate that
       * trust violation into every downstream operation. To preserve
       * backward compat for the hot path, fromMap still does NOT re-hash
       * by default — but callers crossing trust boundaries should call
       * fromMapVerified() instead, which re-hashes every entry.
       */
      static fromMap(map) {
        const pool = new _ElementPool();
        for (const [hash, element] of map) {
          pool.elements.set(hash, element);
        }
        return pool;
      }
      /**
       * Steelman²⁸ warning: hash-verifying variant of fromMap. Use this when
       * accepting an external pool (post-deserialize, peer-replicated,
       * test fixture, etc.). Throws VERIFICATION_FAILED on any key/element
       * mismatch.
       */
      static fromMapVerified(map) {
        const pool = new _ElementPool();
        for (const [hash, element] of map) {
          const recomputed = computeElementHash(element);
          if (recomputed !== hash) {
            throw new UxfError(
              "VERIFICATION_FAILED",
              `ElementPool.fromMapVerified: key ${hash} does not match computed hash ${recomputed}`
            );
          }
          pool.elements.set(hash, element);
        }
        return pool;
      }
    };
  }
});

// uxf/header-validation.ts
function assertHeaderVersionField(value, fieldLabel, errorCode = "SERIALIZATION_ERROR") {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) {
    throw new UxfError(
      errorCode,
      `${fieldLabel} must be a non-negative safe integer, got ${String(value)}`
    );
  }
}
function assertHeaderKindField(value, fieldLabel, errorCode = "SERIALIZATION_ERROR") {
  if (typeof value !== "string" || value.length === 0) {
    throw new UxfError(
      errorCode,
      `${fieldLabel} must be a non-empty string, got ${String(value)}`
    );
  }
  if (value.length > MAX_KIND_LENGTH) {
    throw new UxfError(
      errorCode,
      `${fieldLabel} length ${value.length} (UTF-16 code units) exceeds MAX_KIND_LENGTH=${MAX_KIND_LENGTH}`
    );
  }
  if (!KIND_ALLOWED_RE.test(value)) {
    throw new UxfError(
      errorCode,
      `${fieldLabel} contains characters outside the [A-Za-z0-9._-] allowlist or starts with a separator`
    );
  }
}
var MAX_KIND_LENGTH, KIND_ALLOWED_RE;
var init_header_validation = __esm({
  "uxf/header-validation.ts"() {
    "use strict";
    init_errors4();
    MAX_KIND_LENGTH = 64;
    KIND_ALLOWED_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
  }
});

// uxf/instance-chain.ts
function isSafeNonNegativeInteger(v) {
  return typeof v === "number" && Number.isFinite(v) && Number.isInteger(v) && v >= 0 && v <= Number.MAX_SAFE_INTEGER;
}
function assertVersionField(fieldName, newValue, predecessorValue) {
  if (!isSafeNonNegativeInteger(newValue)) {
    throw new UxfError(
      "INVALID_INSTANCE_CHAIN",
      `New instance has invalid ${fieldName}=${String(newValue)} (must be a non-negative safe integer)`
    );
  }
  if (!isSafeNonNegativeInteger(predecessorValue)) {
    throw new UxfError(
      "INVALID_INSTANCE_CHAIN",
      `Predecessor has invalid ${fieldName}=${String(predecessorValue)} (must be a non-negative safe integer) \u2014 chain head is corrupt`
    );
  }
  if (newValue < predecessorValue) {
    throw new UxfError(
      "INVALID_INSTANCE_CHAIN",
      `${fieldName === "representation" ? "Representation" : "Semantics"} version regression: new instance has ${newValue} but predecessor has ${predecessorValue}`
    );
  }
}
function addInstance(pool, index, originalHash, newInstance) {
  const originalElement = pool.get(originalHash);
  if (!originalElement) {
    throw new UxfError(
      "MISSING_ELEMENT",
      `Original element ${originalHash} not found in pool`
    );
  }
  const existingEntry = index.get(originalHash);
  const currentHeadHash = existingEntry ? existingEntry.head : originalHash;
  const currentHeadElement = pool.get(currentHeadHash);
  if (!currentHeadElement) {
    throw new UxfError(
      "MISSING_ELEMENT",
      `Current chain head ${currentHeadHash} not found in pool`
    );
  }
  if (newInstance.type !== originalElement.type) {
    throw new UxfError(
      "INVALID_INSTANCE_CHAIN",
      `Type mismatch: new instance is '${newInstance.type}' but chain element is '${originalElement.type}'`
    );
  }
  const HEADER_ERR_CODE = "INVALID_INSTANCE_CHAIN";
  assertHeaderKindField(newInstance.header.kind, "addInstance newInstance.header.kind", HEADER_ERR_CODE);
  assertHeaderVersionField(newInstance.header.semantics, "addInstance newInstance.header.semantics", HEADER_ERR_CODE);
  assertHeaderVersionField(newInstance.header.representation, "addInstance newInstance.header.representation", HEADER_ERR_CODE);
  if (newInstance.header.predecessor !== currentHeadHash) {
    throw new UxfError(
      "INVALID_INSTANCE_CHAIN",
      `Predecessor mismatch: new instance predecessor is '${newInstance.header.predecessor}' but current head is '${currentHeadHash}'`
    );
  }
  assertVersionField("semantics", newInstance.header.semantics, currentHeadElement.header.semantics);
  assertVersionField("representation", newInstance.header.representation, currentHeadElement.header.representation);
  const newHash = pool.put(newInstance);
  let updatedEntry;
  if (existingEntry) {
    updatedEntry = {
      head: newHash,
      chain: [
        { hash: newHash, kind: newInstance.header.kind },
        ...existingEntry.chain
      ]
    };
  } else {
    updatedEntry = {
      head: newHash,
      chain: [
        { hash: newHash, kind: newInstance.header.kind },
        { hash: originalHash, kind: originalElement.header.kind }
      ]
    };
  }
  for (const link of updatedEntry.chain) {
    index.set(link.hash, updatedEntry);
  }
  return newHash;
}
function selectInstance(chainEntry, strategy, pool) {
  switch (strategy.type) {
    case "latest":
      return chainEntry.head;
    case "original":
      return chainEntry.chain[chainEntry.chain.length - 1].hash;
    case "by-kind": {
      for (const link of chainEntry.chain) {
        if (link.kind === strategy.kind) {
          return link.hash;
        }
      }
      if (strategy.fallback) {
        return selectInstance(chainEntry, strategy.fallback, pool);
      }
      return chainEntry.head;
    }
    case "by-representation": {
      for (const link of chainEntry.chain) {
        const element = pool.get(link.hash);
        if (element && element.header.representation === strategy.version) {
          return link.hash;
        }
      }
      return chainEntry.head;
    }
    case "custom": {
      for (const link of chainEntry.chain) {
        const element = pool.get(link.hash);
        if (element && strategy.predicate(element)) {
          return link.hash;
        }
      }
      if (strategy.fallback) {
        return selectInstance(chainEntry, strategy.fallback, pool);
      }
      return chainEntry.head;
    }
  }
}
function resolveElement(pool, hash, instanceChains, strategy) {
  const chainEntry = instanceChains.get(hash);
  if (chainEntry) {
    const selectedHash = selectInstance(chainEntry, strategy, pool);
    const element2 = pool.get(selectedHash);
    if (!element2) {
      throw new UxfError(
        "MISSING_ELEMENT",
        `Element ${selectedHash} not in pool`
      );
    }
    return element2;
  }
  const element = pool.get(hash);
  if (!element) {
    throw new UxfError("MISSING_ELEMENT", `Element ${hash} not in pool`);
  }
  return element;
}
function mergeInstanceChains(target, source, targetPool) {
  const processedChains = /* @__PURE__ */ new Set();
  for (const [_hash, sourceEntry] of source) {
    if (processedChains.has(sourceEntry)) {
      continue;
    }
    processedChains.add(sourceEntry);
    const sourceTailHash = sourceEntry.chain[sourceEntry.chain.length - 1].hash;
    let targetEntry;
    for (const link of sourceEntry.chain) {
      targetEntry = target.get(link.hash);
      if (targetEntry) break;
    }
    if (!targetEntry) {
      for (const link of sourceEntry.chain) {
        target.set(link.hash, sourceEntry);
      }
      continue;
    }
    const targetHashes = new Set(targetEntry.chain.map((l) => l.hash));
    const sourceHashes = new Set(sourceEntry.chain.map((l) => l.hash));
    const sourceIsPrefix = sourceEntry.chain.every((l) => targetHashes.has(l.hash));
    if (sourceIsPrefix) {
      continue;
    }
    const targetIsPrefix = targetEntry.chain.every((l) => sourceHashes.has(l.hash));
    if (targetIsPrefix) {
      for (const link of targetEntry.chain) {
        target.delete(link.hash);
      }
      for (const link of sourceEntry.chain) {
        target.set(link.hash, sourceEntry);
      }
      continue;
    }
    for (const link of sourceEntry.chain) {
      if (!target.has(link.hash)) {
        target.set(link.hash, sourceEntry);
      }
    }
  }
}
var init_instance_chain = __esm({
  "uxf/instance-chain.ts"() {
    "use strict";
    init_errors4();
    init_header_validation();
  }
});

// uxf/deconstruct.ts
import { encode as encode2 } from "@ipld/dag-cbor";
function makeHeader() {
  return {
    representation: 1,
    semantics: 1,
    kind: "default",
    predecessor: null
  };
}
function putElement(pool, type, content, children) {
  const element = {
    header: makeHeader(),
    type,
    content,
    children
  };
  return pool.put(element);
}
function lowerHex(value) {
  if (value == null || value === "") return "";
  return value.toLowerCase();
}
function lowerHexNullable(value) {
  if (value == null) return null;
  if (value === "") return "";
  return value.toLowerCase();
}
function validateToken(token) {
  if (!token || typeof token !== "object") {
    throw new UxfError("INVALID_PACKAGE", "Token input must be a non-null object");
  }
  const obj = token;
  if (obj._placeholder === true) {
    throw new UxfError(
      "INVALID_PACKAGE",
      "Cannot ingest placeholder tokens (no genesis field)"
    );
  }
  if (!obj.genesis || typeof obj.genesis !== "object") {
    throw new UxfError("INVALID_PACKAGE", "Token must have a genesis field");
  }
  if (!obj.state || typeof obj.state !== "object") {
    throw new UxfError("INVALID_PACKAGE", "Token must have a state field");
  }
  const genesis = obj.genesis;
  const data = genesis.data;
  if (!data || typeof data !== "object") {
    throw new UxfError("INVALID_PACKAGE", "Token genesis must have a data field");
  }
  const tokenId = data.tokenId;
  if (typeof tokenId !== "string" || !/^[0-9a-fA-F]{64,68}$/.test(tokenId)) {
    throw new UxfError(
      "INVALID_PACKAGE",
      `Token genesis.data.tokenId must be 64- or 68-char hex, got ${typeof tokenId === "string" ? `"${tokenId}"` : String(tokenId)}`
    );
  }
}
function deconstructState(pool, state) {
  return putElement(
    pool,
    "token-state",
    {
      predicate: lowerHex(state.predicate),
      data: lowerHexNullable(state.data)
    },
    {}
  );
}
function deconstructAuthenticator(pool, auth) {
  return putElement(
    pool,
    "authenticator",
    {
      algorithm: auth.algorithm,
      publicKey: lowerHex(auth.publicKey),
      signature: lowerHex(auth.signature),
      stateHash: lowerHex(auth.stateHash)
    },
    {}
  );
}
function deconstructSmtPath(pool, merkleTreePath) {
  const segments = merkleTreePath.steps.map((step) => ({
    data: step.data == null ? null : lowerHex(step.data),
    path: step.path
    // decimal bigint string, keep as-is
  }));
  return putElement(
    pool,
    "smt-path",
    {
      root: lowerHex(merkleTreePath.root),
      segments
    },
    {}
  );
}
function deconstructUnicityCertificate(pool, certHex) {
  return putElement(
    pool,
    "unicity-certificate",
    { raw: lowerHex(certHex) },
    {}
  );
}
function deconstructInclusionProof(pool, proof) {
  const authenticatorHash = proof.authenticator != null ? deconstructAuthenticator(pool, proof.authenticator) : null;
  const merkleTreePathHash = deconstructSmtPath(pool, proof.merkleTreePath);
  const unicityCertificateHash = deconstructUnicityCertificate(
    pool,
    proof.unicityCertificate
  );
  return putElement(
    pool,
    "inclusion-proof",
    {
      transactionHash: lowerHexNullable(proof.transactionHash)
    },
    {
      authenticator: authenticatorHash,
      merkleTreePath: merkleTreePathHash,
      unicityCertificate: unicityCertificateHash
    }
  );
}
function encodeReason(reason) {
  if (reason == null) {
    return null;
  }
  if (typeof reason === "string") {
    return new TextEncoder().encode(reason);
  }
  return encode2(reason);
}
function deconstructGenesisData(pool, data) {
  const coinData = data.coinData ?? [];
  return putElement(
    pool,
    "genesis-data",
    {
      tokenId: lowerHex(data.tokenId),
      tokenType: lowerHex(data.tokenType),
      coinData: coinData.map(([coinId, amount]) => [coinId, amount]),
      tokenData: lowerHex(data.tokenData),
      salt: lowerHex(data.salt),
      recipient: data.recipient,
      recipientDataHash: lowerHexNullable(data.recipientDataHash),
      reason: encodeReason(data.reason)
    },
    {}
  );
}
function deriveAllStates(token) {
  const txs = token.transactions;
  let genesisDestState;
  if (txs.length > 0) {
    genesisDestState = txs[0].data?.sourceState ?? token.state;
  } else {
    genesisDestState = token.state;
  }
  const txSourceStates = [];
  const txDestStates = [];
  for (let i = 0; i < txs.length; i++) {
    if (i === 0) {
      txSourceStates.push(genesisDestState);
    } else {
      const src = txs[i].data?.sourceState ?? txDestStates[i - 1];
      txSourceStates.push(src);
    }
    if (i < txs.length - 1) {
      const dest = txs[i + 1].data?.sourceState ?? token.state;
      txDestStates.push(dest);
    } else {
      txDestStates.push(token.state);
    }
  }
  return { genesisDestState, txSourceStates, txDestStates };
}
function deconstructGenesis(pool, genesis, destinationState) {
  const dataHash = deconstructGenesisData(pool, genesis.data);
  let inclusionProofHash = null;
  if (genesis.inclusionProof != null) {
    inclusionProofHash = deconstructInclusionProof(pool, genesis.inclusionProof);
  }
  const destinationStateHash = deconstructState(pool, destinationState);
  return putElement(pool, "genesis", {}, {
    data: dataHash,
    inclusionProof: inclusionProofHash,
    destinationState: destinationStateHash
  });
}
function deconstructPendingAuthenticator(pool, auth) {
  return putElement(
    pool,
    "pending-authenticator",
    {
      algorithm: auth.algorithm,
      publicKey: lowerHex(auth.publicKey),
      signature: lowerHex(auth.signature),
      stateHash: lowerHex(auth.stateHash)
    },
    {}
  );
}
function deconstructTransferData(pool, txData, maxDepth) {
  const nametagRefs = [];
  if (Array.isArray(txData.nametags)) {
    for (const nt of txData.nametags) {
      if (isTokenObject(nt)) {
        nametagRefs.push(deconstructTokenInternal(pool, nt, maxDepth - 1));
      }
    }
  }
  return putElement(
    pool,
    "transaction-data",
    {
      recipient: txData.recipient,
      salt: lowerHex(txData.salt),
      recipientDataHash: lowerHexNullable(txData.recipientDataHash),
      message: txData.message ?? null,
      nametagRefs
    },
    {}
  );
}
function deconstructTransaction(pool, tx, sourceState, destinationState, maxDepth = 100) {
  const sourceStateHash = deconstructState(pool, sourceState);
  const destinationStateHash = deconstructState(pool, destinationState);
  let dataHash = null;
  if (tx.data != null) {
    dataHash = deconstructTransferData(pool, tx.data, maxDepth);
  }
  let inclusionProofHash = null;
  if (tx.inclusionProof != null) {
    inclusionProofHash = deconstructInclusionProof(pool, tx.inclusionProof);
  }
  let pendingAuthenticatorHash = null;
  const txWallet = tx._wallet;
  if (txWallet && txWallet.authenticator != null) {
    pendingAuthenticatorHash = deconstructPendingAuthenticator(
      pool,
      txWallet.authenticator
    );
  }
  const children = {
    sourceState: sourceStateHash,
    data: dataHash,
    inclusionProof: inclusionProofHash,
    destinationState: destinationStateHash
  };
  if (pendingAuthenticatorHash !== null) {
    children.pendingAuthenticator = pendingAuthenticatorHash;
  }
  return putElement(pool, "transaction", {}, children);
}
function isTokenObject(value) {
  return value != null && typeof value === "object" && "genesis" in value;
}
function deconstructTokenInternal(pool, token, maxDepth = 100) {
  if (maxDepth <= 0) {
    throw new UxfError("INVALID_PACKAGE", "Maximum nametag nesting depth exceeded");
  }
  const { genesisDestState, txSourceStates, txDestStates } = deriveAllStates(token);
  const genesisHash = deconstructGenesis(
    pool,
    token.genesis,
    genesisDestState
  );
  const transactionHashes = [];
  for (let i = 0; i < token.transactions.length; i++) {
    const txHash = deconstructTransaction(
      pool,
      token.transactions[i],
      txSourceStates[i],
      txDestStates[i],
      maxDepth
    );
    transactionHashes.push(txHash);
  }
  const stateHash = deconstructState(pool, token.state);
  const nametagHashes = [];
  if (Array.isArray(token.nametags)) {
    for (const nt of token.nametags) {
      if (isTokenObject(nt)) {
        nametagHashes.push(deconstructTokenInternal(pool, nt, maxDepth - 1));
      }
    }
  }
  const tokenId = lowerHex(
    token.genesis.data.tokenId
  );
  return putElement(
    pool,
    "token-root",
    {
      tokenId,
      version: token.version ?? "2.0"
    },
    {
      genesis: genesisHash,
      transactions: transactionHashes,
      state: stateHash,
      nametags: nametagHashes
    }
  );
}
function deconstructToken(pool, token) {
  validateToken(token);
  return deconstructTokenInternal(pool, token);
}
var init_deconstruct = __esm({
  "uxf/deconstruct.ts"() {
    "use strict";
    init_errors4();
  }
});

// uxf/assemble.ts
var assemble_exports = {};
__export(assemble_exports, {
  assembleInclusionProofForVerification: () => assembleInclusionProofForVerification,
  assembleToken: () => assembleToken,
  assembleTokenAtState: () => assembleTokenAtState,
  assembleTokenFromRoot: () => assembleTokenFromRoot
});
import { decode } from "@ipld/dag-cbor";
function resolveAndVerify(pool, hash, ctx, expectedType) {
  if (ctx.explored.has(hash)) {
    const cached = resolveElement(pool, hash, ctx.instanceChains, ctx.strategy);
    if (expectedType && cached.type !== expectedType) {
      throw new UxfError(
        "TYPE_MISMATCH",
        `Expected element type '${expectedType}' but got '${cached.type}' at ${hash} (revisit)`
      );
    }
    return cached;
  }
  ctx.explored.add(hash);
  const element = resolveElement(pool, hash, ctx.instanceChains, ctx.strategy);
  const actualHash = computeElementHash(element);
  const chainEntry = ctx.instanceChains.get(hash);
  if (chainEntry) {
    const selectedHash = selectInstance(chainEntry, ctx.strategy, pool);
    if (actualHash !== selectedHash) {
      throw new UxfError(
        "VERIFICATION_FAILED",
        `Hash mismatch for element ${selectedHash}: computed ${actualHash}`
      );
    }
    ctx.explored.add(selectedHash);
  } else {
    if (actualHash !== hash) {
      throw new UxfError(
        "VERIFICATION_FAILED",
        `Hash mismatch for element ${hash}: computed ${actualHash}`
      );
    }
  }
  if (expectedType && element.type !== expectedType) {
    throw new UxfError(
      "TYPE_MISMATCH",
      `Expected element type '${expectedType}' but got '${element.type}' at ${hash}`
    );
  }
  return element;
}
function assembleState(pool, stateHash, ctx) {
  const el = resolveAndVerify(pool, stateHash, ctx, "token-state");
  const c = el.content;
  return {
    predicate: c.predicate,
    data: c.data
  };
}
function assembleAuthenticator(pool, authHash, ctx) {
  const el = resolveAndVerify(pool, authHash, ctx, "authenticator");
  const c = el.content;
  return {
    algorithm: c.algorithm,
    publicKey: c.publicKey,
    signature: c.signature,
    stateHash: c.stateHash
  };
}
function assemblePendingAuthenticator(pool, authHash, ctx) {
  const el = resolveAndVerify(pool, authHash, ctx, "pending-authenticator");
  const c = el.content;
  return {
    algorithm: c.algorithm,
    publicKey: c.publicKey,
    signature: c.signature,
    stateHash: c.stateHash
  };
}
function assembleSmtPath(pool, pathHash, ctx) {
  const el = resolveAndVerify(pool, pathHash, ctx, "smt-path");
  const c = el.content;
  const steps = c.segments.map((seg) => ({
    data: seg.data,
    path: seg.path
  }));
  return { root: c.root, steps };
}
function assembleUnicityCertificate(pool, certHash, ctx) {
  const el = resolveAndVerify(pool, certHash, ctx, "unicity-certificate");
  const c = el.content;
  return c.raw;
}
function assembleInclusionProofForVerification(pool, proofHash) {
  const elementPool = ElementPool.fromMap(pool);
  const ctx = {
    explored: /* @__PURE__ */ new Set(),
    instanceChains: /* @__PURE__ */ new Map(),
    strategy: STRATEGY_LATEST,
    maxDepth: 64
  };
  return assembleInclusionProof(elementPool, proofHash, ctx);
}
function assembleInclusionProof(pool, proofHash, ctx) {
  const el = resolveAndVerify(pool, proofHash, ctx, "inclusion-proof");
  const c = el.content;
  const ch = el.children;
  const authenticator = ch.authenticator !== null ? assembleAuthenticator(pool, ch.authenticator, ctx) : null;
  const merkleTreePath = assembleSmtPath(pool, ch.merkleTreePath, ctx);
  const unicityCertificate = assembleUnicityCertificate(pool, ch.unicityCertificate, ctx);
  return {
    authenticator,
    merkleTreePath,
    transactionHash: c.transactionHash ?? null,
    unicityCertificate
  };
}
function decodeReason(reason) {
  if (reason === null || reason === void 0) {
    return null;
  }
  try {
    return decode(reason);
  } catch {
    return new TextDecoder().decode(reason);
  }
}
function assembleGenesisData(pool, dataHash, ctx) {
  const el = resolveAndVerify(pool, dataHash, ctx, "genesis-data");
  const c = el.content;
  return {
    tokenId: c.tokenId,
    tokenType: c.tokenType,
    coinData: c.coinData.map(([coinId, amount]) => [coinId, amount]),
    tokenData: c.tokenData,
    salt: c.salt,
    recipient: c.recipient,
    recipientDataHash: c.recipientDataHash ?? null,
    reason: decodeReason(c.reason)
  };
}
function assembleGenesis(pool, genesisHash, ctx) {
  const el = resolveAndVerify(pool, genesisHash, ctx, "genesis");
  const ch = el.children;
  const data = assembleGenesisData(pool, ch.data, ctx);
  const inclusionProof = ch.inclusionProof !== null ? assembleInclusionProof(pool, ch.inclusionProof, ctx) : null;
  return { data, inclusionProof };
}
function assembleTransactionData(pool, dataHash, ctx) {
  const el = resolveAndVerify(pool, dataHash, ctx, "transaction-data");
  const c = el.content;
  const nametags = [];
  if (c.nametagRefs && c.nametagRefs.length > 0) {
    const nestedCtx = { ...ctx, maxDepth: ctx.maxDepth - 1 };
    for (const ntHash of c.nametagRefs) {
      nametags.push(assembleTokenFromRootInternal(pool, ntHash, nestedCtx));
    }
  }
  return {
    sourceState: { predicate: "", data: "" },
    recipient: c.recipient,
    salt: c.salt,
    recipientDataHash: c.recipientDataHash ?? null,
    message: c.message ?? null,
    nametags
  };
}
function assembleTransaction(pool, txHash, ctx) {
  const el = resolveAndVerify(pool, txHash, ctx, "transaction");
  const ch = el.children;
  const sourceState = assembleState(pool, ch.sourceState, ctx);
  let txData = null;
  if (ch.data !== null) {
    txData = assembleTransactionData(pool, ch.data, ctx);
    txData.sourceState = sourceState;
  }
  let inclusionProof = null;
  if (ch.inclusionProof !== null) {
    inclusionProof = assembleInclusionProof(pool, ch.inclusionProof, ctx);
  }
  const data = txData ?? {
    sourceState,
    recipient: "",
    salt: "",
    recipientDataHash: null,
    message: null,
    nametags: []
  };
  const pendingAuthHash = ch.pendingAuthenticator;
  const result = { data, inclusionProof };
  if (pendingAuthHash != null) {
    const authenticator = assemblePendingAuthenticator(pool, pendingAuthHash, ctx);
    result._wallet = { authenticator };
  }
  return result;
}
function assembleTokenFromRootInternal(pool, rootHash, ctx) {
  if (ctx.maxDepth <= 0) {
    throw new UxfError("INVALID_PACKAGE", "Maximum nametag nesting depth exceeded");
  }
  const root = resolveAndVerify(pool, rootHash, ctx, "token-root");
  const rc = root.content;
  const rch = root.children;
  const genesis = assembleGenesis(pool, rch.genesis, ctx);
  const transactions = [];
  for (const txHash of rch.transactions) {
    transactions.push(assembleTransaction(pool, txHash, ctx));
  }
  const state = assembleState(pool, rch.state, ctx);
  const nametags = [];
  if (rch.nametags && rch.nametags.length > 0) {
    const nestedCtx = { ...ctx, maxDepth: ctx.maxDepth - 1 };
    for (const ntHash of rch.nametags) {
      nametags.push(assembleTokenFromRootInternal(pool, ntHash, nestedCtx));
    }
  }
  return {
    version: rc.version || "2.0",
    genesis,
    transactions,
    state,
    nametags: nametags.length > 0 ? nametags : []
  };
}
function assembleToken(pool, manifest, tokenId, instanceChains, strategy = STRATEGY_LATEST) {
  const rootHash = manifest.tokens.get(tokenId);
  if (!rootHash) {
    throw new UxfError("TOKEN_NOT_FOUND", `Token ${tokenId} not in manifest`);
  }
  return assembleTokenFromRoot(pool, rootHash, instanceChains, strategy);
}
function assembleTokenFromRoot(pool, rootHash, instanceChains, strategy = STRATEGY_LATEST) {
  const ctx = {
    explored: /* @__PURE__ */ new Set(),
    instanceChains,
    strategy,
    maxDepth: 100
  };
  return assembleTokenFromRootInternal(pool, rootHash, ctx);
}
function assembleTokenAtState(pool, manifest, tokenId, stateIndex, instanceChains, strategy = STRATEGY_LATEST) {
  if (!Number.isFinite(stateIndex) || !Number.isInteger(stateIndex) || stateIndex < 0) {
    throw new UxfError(
      "INVALID_INPUT",
      `assembleTokenAtState: stateIndex must be a non-negative integer (got ${stateIndex})`
    );
  }
  if (stateIndex > 4294967295) {
    throw new UxfError(
      "INVALID_INPUT",
      `assembleTokenAtState: stateIndex out of range (got ${stateIndex}, max=4294967295)`
    );
  }
  const rootHash = manifest.tokens.get(tokenId);
  if (!rootHash) {
    throw new UxfError("TOKEN_NOT_FOUND", `Token ${tokenId} not in manifest`);
  }
  const ctx = {
    explored: /* @__PURE__ */ new Set(),
    instanceChains,
    strategy,
    maxDepth: 100
  };
  const root = resolveAndVerify(pool, rootHash, ctx, "token-root");
  const rc = root.content;
  const rch = root.children;
  const totalTx = rch.transactions.length;
  if (stateIndex < 0 || stateIndex > totalTx) {
    throw new UxfError(
      "STATE_INDEX_OUT_OF_RANGE",
      `Token ${tokenId} has ${totalTx} transactions, requested state index ${stateIndex}`
    );
  }
  const genesis = assembleGenesis(pool, rch.genesis, ctx);
  const truncatedHashes = rch.transactions.slice(0, stateIndex);
  const transactions = [];
  for (const txHash of truncatedHashes) {
    transactions.push(assembleTransaction(pool, txHash, ctx));
  }
  let state;
  if (stateIndex === 0) {
    const genesisEl = resolveElement(pool, rch.genesis, ctx.instanceChains, ctx.strategy);
    const genCh = genesisEl.children;
    state = assembleState(pool, genCh.destinationState, ctx);
  } else {
    const lastTxHash = truncatedHashes[truncatedHashes.length - 1];
    const lastTxEl = resolveElement(pool, lastTxHash, ctx.instanceChains, ctx.strategy);
    const lastTxCh = lastTxEl.children;
    state = assembleState(pool, lastTxCh.destinationState, ctx);
  }
  const nametags = [];
  if (rch.nametags && rch.nametags.length > 0) {
    const nestedCtx = { ...ctx, maxDepth: ctx.maxDepth - 1 };
    for (const ntHash of rch.nametags) {
      nametags.push(assembleTokenFromRootInternal(pool, ntHash, nestedCtx));
    }
  }
  return {
    version: rc.version || "2.0",
    genesis,
    transactions,
    state,
    nametags: nametags.length > 0 ? nametags : []
  };
}
var init_assemble = __esm({
  "uxf/assemble.ts"() {
    "use strict";
    init_types();
    init_element_pool();
    init_instance_chain();
    init_hash();
    init_errors4();
  }
});

// uxf/verify.ts
import { encode as dagCborEncode2 } from "@ipld/dag-cbor";
function verify(pkg) {
  const errors = [];
  const warnings = [];
  const elementsChecked = /* @__PURE__ */ new Set();
  let instanceChainsChecked = 0;
  const VERIFY_MAX_POOL_SIZE = 1e6;
  if (pkg.pool.size > VERIFY_MAX_POOL_SIZE) {
    errors.push({
      code: "INVALID_PACKAGE",
      message: `Pool size ${pkg.pool.size} exceeds VERIFY_MAX_POOL_SIZE=${VERIFY_MAX_POOL_SIZE} \u2014 refusing to verify (bloat-DoS protection).`
    });
    return {
      valid: false,
      errors,
      warnings,
      stats: {
        tokensChecked: 0,
        elementsChecked: 0,
        orphanedElements: 0,
        instanceChainsChecked: 0
      }
    };
  }
  for (const [hash, element] of pkg.pool) {
    let elementSizeBytes;
    try {
      const probe = dagCborEncode2({
        content: element.content,
        children: element.children
      });
      elementSizeBytes = probe.byteLength;
    } catch {
      elementSizeBytes = 0;
    }
    if (elementSizeBytes > VERIFY_MAX_ELEMENT_BYTES) {
      errors.push({
        code: "INVALID_PACKAGE",
        message: `Element ${hash} content+children size ${elementSizeBytes} bytes exceeds VERIFY_MAX_ELEMENT_BYTES=${VERIFY_MAX_ELEMENT_BYTES} (per-element bloat-DoS protection).`,
        elementHash: hash
      });
      continue;
    }
    const recomputed = computeElementHash(element);
    if (recomputed !== hash) {
      errors.push({
        code: "VERIFICATION_FAILED",
        message: `Content hash mismatch: pool key ${hash} but recomputed ${recomputed}`,
        elementHash: hash
      });
    }
  }
  const allReachable = /* @__PURE__ */ new Set();
  for (const [tokenId, rootHash] of pkg.manifest.tokens) {
    if (!pkg.pool.has(rootHash)) {
      errors.push({
        code: "MISSING_ELEMENT",
        message: `Manifest root hash ${rootHash} for token ${tokenId} not found in pool`,
        tokenId,
        elementHash: rootHash
      });
      continue;
    }
    const visited = /* @__PURE__ */ new Set();
    const pathStack = /* @__PURE__ */ new Set();
    const VERIFY_MAX_DEPTH = 4096;
    const dfsWalk = (hash, parentType, childRole, isArrayChild, depth = 0) => {
      if (depth > VERIFY_MAX_DEPTH) {
        errors.push({
          code: "CYCLE_DETECTED",
          message: `Verify exceeded VERIFY_MAX_DEPTH=${VERIFY_MAX_DEPTH} in token ${tokenId} subgraph at ${hash}; possible deeply-nested DAG or undetected cycle.`,
          tokenId,
          elementHash: hash
        });
        return;
      }
      if (pathStack.has(hash)) {
        errors.push({
          code: "CYCLE_DETECTED",
          message: `Cycle detected: element ${hash} visited twice in token ${tokenId} subgraph`,
          tokenId,
          elementHash: hash
        });
        return;
      }
      if (visited.has(hash)) {
        allReachable.add(hash);
        return;
      }
      allReachable.add(hash);
      elementsChecked.add(hash);
      const element = pkg.pool.get(hash);
      if (!element) {
        errors.push({
          code: "MISSING_ELEMENT",
          message: `Child reference ${hash} not found in pool (referenced from ${parentType ?? "manifest"} role "${childRole ?? "root"}")`,
          tokenId,
          elementHash: hash
        });
        return;
      }
      if (parentType && childRole) {
        let expectedType;
        if (isArrayChild) {
          expectedType = EXPECTED_ARRAY_CHILD_TYPES[parentType]?.[childRole];
        } else {
          expectedType = EXPECTED_CHILD_TYPES[parentType]?.[childRole];
        }
        if (expectedType && element.type !== expectedType) {
          errors.push({
            code: "TYPE_MISMATCH",
            message: `Element ${hash} has type '${element.type}' but expected '${expectedType}' as '${childRole}' child of '${parentType}'`,
            tokenId,
            elementHash: hash
          });
        }
      }
      pathStack.add(hash);
      const chainEntry = pkg.instanceChains.get(hash);
      if (chainEntry) {
        for (const link of chainEntry.chain) {
          if (!visited.has(link.hash)) {
            allReachable.add(link.hash);
            const chainElement = pkg.pool.get(link.hash);
            if (chainElement) {
              elementsChecked.add(link.hash);
              walkChildren(hash, chainElement, depth);
            }
          }
        }
      }
      walkChildren(hash, element, depth);
      pathStack.delete(hash);
      visited.add(hash);
    };
    const walkChildren = (_parentHash, element, currentDepth) => {
      for (const [role, ref] of Object.entries(element.children)) {
        if (ref === null) {
          continue;
        }
        if (Array.isArray(ref)) {
          for (const childHash of ref) {
            dfsWalk(childHash, element.type, role, true, currentDepth + 1);
          }
        } else {
          dfsWalk(ref, element.type, role, false, currentDepth + 1);
        }
      }
    };
    dfsWalk(rootHash);
  }
  const processedChains = /* @__PURE__ */ new Set();
  for (const [_hash, chainEntry] of pkg.instanceChains) {
    if (processedChains.has(chainEntry)) {
      continue;
    }
    processedChains.add(chainEntry);
    instanceChainsChecked++;
    if (chainEntry.chain.length === 0) {
      errors.push({
        code: "INVALID_INSTANCE_CHAIN",
        message: "Instance chain has zero entries"
      });
      continue;
    }
    let chainType;
    const chainHashes = /* @__PURE__ */ new Set();
    for (let i = 0; i < chainEntry.chain.length; i++) {
      const link = chainEntry.chain[i];
      if (chainHashes.has(link.hash)) {
        errors.push({
          code: "INVALID_INSTANCE_CHAIN",
          message: `Cycle in instance chain: hash ${link.hash} appears multiple times`,
          elementHash: link.hash
        });
        break;
      }
      chainHashes.add(link.hash);
      const element = pkg.pool.get(link.hash);
      if (!element) {
        errors.push({
          code: "MISSING_ELEMENT",
          message: `Instance chain element ${link.hash} not found in pool`,
          elementHash: link.hash
        });
        continue;
      }
      if (chainType === void 0) {
        chainType = element.type;
      } else if (element.type !== chainType) {
        errors.push({
          code: "INVALID_INSTANCE_CHAIN",
          message: `Instance chain type mismatch: expected '${chainType}' but element ${link.hash} has type '${element.type}'`,
          elementHash: link.hash
        });
      }
      if (i === chainEntry.chain.length - 1) {
        if (element.header.predecessor !== null) {
          errors.push({
            code: "INVALID_INSTANCE_CHAIN",
            message: `Instance chain tail ${link.hash} has non-null predecessor: ${element.header.predecessor}`,
            elementHash: link.hash
          });
        }
      }
      if (i < chainEntry.chain.length - 1) {
        const expectedPredecessor = chainEntry.chain[i + 1].hash;
        if (element.header.predecessor !== expectedPredecessor) {
          errors.push({
            code: "INVALID_INSTANCE_CHAIN",
            message: `Instance chain predecessor mismatch at position ${i}: element ${link.hash} has predecessor '${element.header.predecessor}' but expected '${expectedPredecessor}'`,
            elementHash: link.hash
          });
        }
      }
    }
    if (chainEntry.head !== chainEntry.chain[0].hash) {
      errors.push({
        code: "INVALID_INSTANCE_CHAIN",
        message: `Instance chain head mismatch: entry head is ${chainEntry.head} but first chain element is ${chainEntry.chain[0].hash}`,
        elementHash: chainEntry.head
      });
    }
  }
  let orphanedElements = 0;
  for (const hash of pkg.pool.keys()) {
    if (!allReachable.has(hash)) {
      orphanedElements++;
    }
  }
  if (orphanedElements > 0) {
    warnings.push({
      code: "VERIFICATION_FAILED",
      message: `${orphanedElements} orphaned element(s) found in pool (not reachable from any manifest root)`
    });
  }
  const tailToHeads = /* @__PURE__ */ new Map();
  const processedForDivergence = /* @__PURE__ */ new Set();
  for (const [_hash, chainEntry] of pkg.instanceChains) {
    if (processedForDivergence.has(chainEntry)) {
      continue;
    }
    processedForDivergence.add(chainEntry);
    if (chainEntry.chain.length > 0) {
      const tailHash = chainEntry.chain[chainEntry.chain.length - 1].hash;
      let heads = tailToHeads.get(tailHash);
      if (!heads) {
        heads = /* @__PURE__ */ new Set();
        tailToHeads.set(tailHash, heads);
      }
      heads.add(chainEntry.head);
    }
  }
  for (const [tailHash, heads] of tailToHeads) {
    if (heads.size > 1) {
      warnings.push({
        code: "INVALID_INSTANCE_CHAIN",
        message: `Divergent instance chain: element ${tailHash} has ${heads.size} heads: ${[...heads].join(", ")}`,
        elementHash: tailHash
      });
    }
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      tokensChecked: pkg.manifest.tokens.size,
      elementsChecked: elementsChecked.size,
      orphanedElements,
      instanceChainsChecked
    }
  };
}
var EXPECTED_CHILD_TYPES, EXPECTED_ARRAY_CHILD_TYPES;
var init_verify = __esm({
  "uxf/verify.ts"() {
    "use strict";
    init_hash();
    init_limits();
    EXPECTED_CHILD_TYPES = {
      "token-root": {
        genesis: "genesis",
        state: "token-state"
        // transactions -> 'transaction', nametags -> 'token-root' (handled in array)
      },
      genesis: {
        data: "genesis-data",
        inclusionProof: "inclusion-proof",
        destinationState: "token-state"
      },
      transaction: {
        sourceState: "token-state",
        data: "transaction-data",
        inclusionProof: "inclusion-proof",
        destinationState: "token-state"
      },
      "inclusion-proof": {
        authenticator: "authenticator",
        merkleTreePath: "smt-path",
        unicityCertificate: "unicity-certificate"
      }
    };
    EXPECTED_ARRAY_CHILD_TYPES = {
      "token-root": {
        transactions: "transaction",
        nametags: "token-root"
      }
    };
  }
});

// uxf/diff.ts
function diff(source, target) {
  const addedElements = /* @__PURE__ */ new Map();
  for (const [hash, element] of target.pool) {
    if (!source.pool.has(hash)) {
      addedElements.set(hash, element);
    }
  }
  const removedElements = /* @__PURE__ */ new Set();
  for (const hash of source.pool.keys()) {
    if (!target.pool.has(hash)) {
      removedElements.add(hash);
    }
  }
  const addedTokens = /* @__PURE__ */ new Map();
  for (const [tokenId, rootHash] of target.manifest.tokens) {
    const sourceRoot = source.manifest.tokens.get(tokenId);
    if (sourceRoot === void 0 || sourceRoot !== rootHash) {
      addedTokens.set(tokenId, rootHash);
    }
  }
  const removedTokens = /* @__PURE__ */ new Set();
  for (const tokenId of source.manifest.tokens.keys()) {
    if (!target.manifest.tokens.has(tokenId)) {
      removedTokens.add(tokenId);
    }
  }
  const addedChainEntries = /* @__PURE__ */ new Map();
  const processedEntries = /* @__PURE__ */ new Set();
  const chainsEqual = (a, b) => {
    if (a.head !== b.head) return false;
    if (a.chain.length !== b.chain.length) return false;
    for (let i = 0; i < a.chain.length; i++) {
      if (a.chain[i].hash !== b.chain[i].hash) return false;
      if (a.chain[i].kind !== b.chain[i].kind) return false;
    }
    return true;
  };
  for (const [hash, targetEntry] of target.instanceChains) {
    if (processedEntries.has(targetEntry)) {
      continue;
    }
    processedEntries.add(targetEntry);
    const sourceEntry = source.instanceChains.get(hash);
    if (!sourceEntry || !chainsEqual(sourceEntry, targetEntry)) {
      addedChainEntries.set(targetEntry.head, targetEntry);
    }
  }
  return {
    addedElements,
    removedElements,
    addedTokens,
    removedTokens,
    addedChainEntries
  };
}
function applyDelta(pkg, delta) {
  const mutablePool = pkg.pool;
  const mutableManifestTokens = pkg.manifest.tokens;
  const mutableChains = pkg.instanceChains;
  for (const [hash, element] of delta.addedElements) {
    if (!mutablePool.has(hash)) {
      const recomputed = computeElementHash(element);
      if (recomputed !== hash) {
        throw new UxfError(
          "VERIFICATION_FAILED",
          `Delta element hash mismatch: key ${hash}, computed ${recomputed}`
        );
      }
      mutablePool.set(hash, element);
    }
  }
  if (delta.removedElements.size > 0) {
    const removedSet = delta.removedElements instanceof Set ? delta.removedElements : new Set(delta.removedElements);
    for (const hash of removedSet) {
      mutablePool.delete(hash);
    }
    const affectedChainEntries = /* @__PURE__ */ new Set();
    for (const hash of removedSet) {
      const entry = mutableChains.get(hash);
      if (entry) affectedChainEntries.add(entry);
      mutableChains.delete(hash);
    }
    for (const oldEntry of affectedChainEntries) {
      if (removedSet.has(oldEntry.head)) {
        for (const link of oldEntry.chain) mutableChains.delete(link.hash);
        continue;
      }
      const remainingLinks = oldEntry.chain.filter(
        (link) => !removedSet.has(link.hash)
      );
      if (remainingLinks.length <= 1) {
        for (const link of remainingLinks) mutableChains.delete(link.hash);
        continue;
      }
      const newEntry = {
        head: remainingLinks[0].hash,
        chain: remainingLinks
      };
      for (const link of remainingLinks) mutableChains.set(link.hash, newEntry);
    }
  }
  for (const [tokenId, rootHash] of delta.addedTokens) {
    mutableManifestTokens.set(tokenId, rootHash);
  }
  for (const tokenId of delta.removedTokens) {
    mutableManifestTokens.delete(tokenId);
  }
  for (const [_hash, entry] of delta.addedChainEntries) {
    for (const link of entry.chain) {
      mutableChains.set(link.hash, entry);
    }
  }
}
var init_diff = __esm({
  "uxf/diff.ts"() {
    "use strict";
    init_hash();
    init_errors4();
  }
});

// uxf/token-join.ts
function getTokenRootTxns(rootHash, pool) {
  const element = pool.get(rootHash);
  if (!element || element.type !== ELEMENT_TYPE_TOKEN_ROOT) return null;
  const txns = element.children.transactions;
  if (!Array.isArray(txns)) return null;
  for (const h of txns) {
    if (typeof h !== "string") return null;
  }
  return txns;
}
function countCommittedTxns(txnHashes, pool) {
  let n = 0;
  for (const h of txnHashes) {
    const tx = pool.get(h);
    if (!tx || tx.type !== ELEMENT_TYPE_TRANSACTION) continue;
    const proof = tx.children.inclusionProof;
    if (typeof proof !== "string") continue;
    const proofEl = pool.get(proof);
    if (!proofEl || proofEl.type !== ELEMENT_TYPE_INCLUSION_PROOF) continue;
    n++;
  }
  return n;
}
function resolveTokenRoot(input) {
  const { candidates, pool } = input;
  if (candidates.length === 0) {
    throw new Error("resolveTokenRoot: empty candidates list");
  }
  const unique = Array.from(new Set(candidates));
  if (unique.length === 1) {
    return { kind: "single", rootHash: unique[0] };
  }
  const infos = [];
  for (const rh of unique) {
    const txns = getTokenRootTxns(rh, pool);
    if (txns === null) {
      continue;
    }
    infos.push({
      rootHash: rh,
      txns,
      committedCount: countCommittedTxns(txns, pool)
    });
  }
  if (infos.length === 0) {
    const sortedUnique = [...unique].sort();
    return {
      kind: "divergent",
      rootHash: sortedUnique[0],
      losers: sortedUnique.slice(1)
    };
  }
  if (infos.length === 1) {
    return { kind: "single", rootHash: infos[0].rootHash };
  }
  const verifiedSetForCompat = input.verifiedProofs ?? EMPTY_VERIFIED_PROOFS;
  let foundDivergent = false;
  for (let i = 0; i < infos.length; i++) {
    for (let j = i + 1; j < infos.length; j++) {
      const a = infos[i];
      const b = infos[j];
      const commonLen = Math.min(a.txns.length, b.txns.length);
      for (let k = 0; k < commonLen; k++) {
        if (a.txns[k] === b.txns[k]) continue;
        const aHash = a.txns[k];
        const bHash = b.txns[k];
        if (verifiedSetForCompat.size > 0 && sameCoreDifferentProof(aHash, bHash, pool) && isProofVerifiedOnEitherSide(aHash, bHash, pool, verifiedSetForCompat)) {
          continue;
        }
        foundDivergent = true;
        break;
      }
      if (foundDivergent) break;
    }
    if (foundDivergent) break;
  }
  infos.sort((a, b) => {
    if (foundDivergent) {
      if (a.committedCount !== b.committedCount) return b.committedCount - a.committedCount;
      if (a.txns.length !== b.txns.length) return b.txns.length - a.txns.length;
    } else {
      if (a.txns.length !== b.txns.length) return b.txns.length - a.txns.length;
      if (a.committedCount !== b.committedCount) return b.committedCount - a.committedCount;
    }
    return a.rootHash < b.rootHash ? -1 : a.rootHash > b.rootHash ? 1 : 0;
  });
  const winner = infos[0];
  const losers = infos.slice(1).map((c) => c.rootHash);
  if (foundDivergent) {
    return { kind: "divergent", rootHash: winner.rootHash, losers };
  }
  const verifiedProofs = input.verifiedProofs ?? EMPTY_VERIFIED_PROOFS;
  if (verifiedProofs.size > 0) {
    const enrichResult = tryEnrichLongestWithProofs(winner, infos, pool, verifiedProofs);
    if (enrichResult) {
      return {
        kind: "enriched",
        rootHash: enrichResult.rootHash,
        losers: [winner.rootHash, ...losers],
        syntheticRoot: enrichResult.syntheticRoot
      };
    }
  }
  return { kind: "longest-valid", rootHash: winner.rootHash, losers };
}
function txHasProof(txHash, pool) {
  const tx = pool.get(txHash);
  if (!tx || tx.type !== ELEMENT_TYPE_TRANSACTION) return false;
  const proof = tx.children.inclusionProof;
  return typeof proof === "string" && proof.length > 0;
}
function sameCoreDifferentProof(hashA, hashB, pool) {
  if (hashA === hashB) return false;
  const a = pool.get(hashA);
  const b = pool.get(hashB);
  if (!a || !b) return false;
  if (a.type !== ELEMENT_TYPE_TRANSACTION || b.type !== ELEMENT_TYPE_TRANSACTION) return false;
  const ca = a.children;
  const cb = b.children;
  const keysA = Object.keys(ca);
  const keysB = Object.keys(cb);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (!(k in cb)) return false;
  }
  if (ca.inclusionProof === cb.inclusionProof) return false;
  for (const k of keysA) {
    if (k === "inclusionProof") continue;
    const va = ca[k];
    const vb = cb[k];
    if (Array.isArray(va) && Array.isArray(vb)) {
      if (va.length !== vb.length) return false;
      for (let i = 0; i < va.length; i++) {
        if (va[i] !== vb[i]) return false;
      }
    } else if (va !== vb) {
      return false;
    }
  }
  return true;
}
function sameHeaderShape(a, b) {
  return a.header.representation === b.header.representation && a.header.semantics === b.header.semantics && a.header.kind === b.header.kind && a.header.predecessor === b.header.predecessor;
}
function isProofVerifiedOnEitherSide(aHash, bHash, pool, verifiedProofs) {
  for (const txHash of [aHash, bHash]) {
    const tx = pool.get(txHash);
    if (!tx || tx.type !== ELEMENT_TYPE_TRANSACTION) continue;
    const proofHash = tx.children.inclusionProof;
    if (typeof proofHash !== "string") continue;
    if (verifiedProofs.has(proofHash)) return true;
  }
  return false;
}
function altProofIsStructurallyValid(altElement, pool) {
  const children = altElement.children;
  const proofHash = children.inclusionProof;
  if (typeof proofHash !== "string") return false;
  const proofEl = pool.get(proofHash);
  if (!proofEl) return true;
  if (proofEl.type !== ELEMENT_TYPE_INCLUSION_PROOF) return false;
  const pc = proofEl.children;
  if (typeof pc.authenticator !== "string") return false;
  if (typeof pc.merkleTreePath !== "string") return false;
  return true;
}
function tryEnrichLongestWithProofs(winner, infos, pool, verifiedProofs) {
  const winnerRoot = pool.get(winner.rootHash);
  if (!winnerRoot || winnerRoot.type !== ELEMENT_TYPE_TOKEN_ROOT) return null;
  const enrichedTxns = [...winner.txns];
  let enriched = false;
  for (let pos = 0; pos < enrichedTxns.length; pos++) {
    const curHash = enrichedTxns[pos];
    if (txHasProof(curHash, pool)) continue;
    for (const other of infos) {
      if (other.rootHash === winner.rootHash) continue;
      if (pos >= other.txns.length) continue;
      const altHash = other.txns[pos];
      if (altHash === curHash) continue;
      if (!txHasProof(altHash, pool)) continue;
      if (!sameCoreDifferentProof(curHash, altHash, pool)) continue;
      const curEl = pool.get(curHash);
      const altEl = pool.get(altHash);
      if (!curEl || !altEl) continue;
      if (!sameHeaderShape(curEl, altEl)) continue;
      if (!altProofIsStructurallyValid(altEl, pool)) continue;
      const altProofHash = altEl.children.inclusionProof;
      if (typeof altProofHash !== "string") continue;
      if (!verifiedProofs.has(altProofHash)) continue;
      enrichedTxns[pos] = altHash;
      enriched = true;
      break;
    }
  }
  if (!enriched) return null;
  const clonedChildren = {};
  for (const [key, value] of Object.entries(winnerRoot.children)) {
    if (Array.isArray(value)) {
      clonedChildren[key] = [...value];
    } else {
      clonedChildren[key] = value;
    }
  }
  clonedChildren.transactions = enrichedTxns;
  const syntheticRoot = {
    header: {
      representation: winnerRoot.header.representation,
      semantics: winnerRoot.header.semantics,
      kind: ENRICHED_SYNTHETIC_KIND,
      predecessor: null
    },
    type: ELEMENT_TYPE_TOKEN_ROOT,
    content: { ...winnerRoot.content },
    children: clonedChildren
  };
  const rootHash = computeElementHash(syntheticRoot);
  return { rootHash, syntheticRoot };
}
var EMPTY_VERIFIED_PROOFS, ENRICHED_SYNTHETIC_KIND;
var init_token_join = __esm({
  "uxf/token-join.ts"() {
    "use strict";
    init_types();
    init_hash();
    EMPTY_VERIFIED_PROOFS = Object.freeze(
      /* @__PURE__ */ new Set()
    );
    ENRICHED_SYNTHETIC_KIND = "enriched-synthetic";
  }
});

// uxf/json.ts
function serializeContent(content) {
  const result = {};
  for (const [key, value] of Object.entries(content)) {
    if (value instanceof Uint8Array) {
      result[key] = uint8ArrayToHex(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map(
        (item) => item instanceof Uint8Array ? uint8ArrayToHex(item) : item
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}
function uint8ArrayToHex(bytes) {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}
function packageToJson(pkg) {
  for (const [tokenId, rootHash] of pkg.manifest.tokens) {
    const rootEl = pkg.pool.get(rootHash);
    if (!rootEl) {
      throw new UxfError(
        "MISSING_ELEMENT",
        `Refusing to serialize package: manifest entry for token ${tokenId} references rootHash ${rootHash} but no such element exists in pool.`
      );
    }
    if (rootEl.header.kind === ENRICHED_SYNTHETIC_KIND) {
      throw new UxfError(
        "VERIFICATION_FAILED",
        `Refusing to serialize package with synthetic (Rule 4 enriched) manifest head for token ${tokenId} (rootHash=${rootHash}). Finalize the merge first: resolve the synthetic to a signed root or remove the token from the manifest.`
      );
    }
  }
  const envelope = pkg.envelope;
  const metadata = {
    version: envelope.version,
    createdAt: envelope.createdAt,
    updatedAt: envelope.updatedAt,
    elementCount: pkg.pool.size,
    tokenCount: pkg.manifest.tokens.size
  };
  if (envelope.creator !== void 0) {
    metadata.creator = envelope.creator;
  }
  if (envelope.description !== void 0) {
    metadata.description = envelope.description;
  }
  const manifest = {};
  for (const [tokenId, rootHash] of pkg.manifest.tokens) {
    manifest[tokenId] = rootHash;
  }
  const instanceChainIndex = {};
  const seenChains = /* @__PURE__ */ new Set();
  for (const [hash, entry] of pkg.instanceChains) {
    const headKey = entry.head;
    if (seenChains.has(headKey)) {
      continue;
    }
    seenChains.add(headKey);
    instanceChainIndex[hash] = {
      head: entry.head,
      chain: entry.chain.map((link) => ({
        hash: link.hash,
        kind: link.kind
      }))
    };
  }
  const indexes = {
    byTokenType: mapOfSetsToObject(pkg.indexes.byTokenType),
    byCoinId: mapOfSetsToObject(pkg.indexes.byCoinId),
    byStateHash: mapToObject(pkg.indexes.byStateHash)
  };
  const elements = {};
  for (const [hash, element] of pkg.pool) {
    elements[hash] = serializeElement(element);
  }
  const jsonPkg = {
    uxf: "1.0.0",
    metadata,
    manifest,
    instanceChainIndex,
    indexes,
    elements
  };
  return JSON.stringify(jsonPkg);
}
function serializeElement(element) {
  const typeId = ELEMENT_TYPE_IDS[element.type];
  return {
    header: {
      representation: element.header.representation,
      semantics: element.header.semantics,
      kind: element.header.kind,
      predecessor: element.header.predecessor
    },
    type: typeId,
    content: serializeContent(element.content),
    children: serializeChildren(element.children)
  };
}
function serializeChildren(children) {
  const result = {};
  for (const [key, value] of Object.entries(children)) {
    if (value === null) {
      result[key] = null;
    } else if (Array.isArray(value)) {
      result[key] = value.map((h) => h);
    } else {
      result[key] = value;
    }
  }
  return result;
}
function mapOfSetsToObject(map) {
  const obj = {};
  for (const [key, set] of map) {
    obj[key] = [...set];
  }
  return obj;
}
function mapToObject(map) {
  const obj = {};
  for (const [key, value] of map) {
    obj[key] = value;
  }
  return obj;
}
function packageFromJson(json) {
  let raw2;
  try {
    raw2 = JSON.parse(json);
  } catch (e) {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      `Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`
    );
  }
  if (typeof raw2 !== "object" || raw2 === null) {
    throw new UxfError("SERIALIZATION_ERROR", "JSON root must be an object");
  }
  if (raw2.uxf !== "1.0.0") {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      `Unsupported uxf version: ${typeof raw2.uxf === "string" ? `"${raw2.uxf}"` : String(raw2.uxf)}`
    );
  }
  const meta = raw2.metadata;
  if (typeof meta !== "object" || meta === null) {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      'Missing or invalid "metadata" field'
    );
  }
  const creator = requireOptionalString(meta, "creator", "metadata");
  if (creator !== void 0 && creator.length > MAX_CREATOR_LENGTH) {
    throw new UxfError(
      "LIMIT_EXCEEDED",
      `metadata.creator exceeds MAX_CREATOR_LENGTH=${MAX_CREATOR_LENGTH}: ${creator.length}`
    );
  }
  const description = requireOptionalString(meta, "description", "metadata");
  if (description !== void 0 && description.length > MAX_DESCRIPTION_LENGTH) {
    throw new UxfError(
      "LIMIT_EXCEEDED",
      `metadata.description exceeds MAX_DESCRIPTION_LENGTH=${MAX_DESCRIPTION_LENGTH}: ${description.length}`
    );
  }
  const envelope = {
    version: requireString(meta, "version", "metadata"),
    // Steelman remediation (FIX 7): timestamps are non-negative
    // integers (unix-seconds). Reject NaN/Infinity/-0/fractional/
    // negative values explicitly.
    createdAt: requireTimestamp(meta, "createdAt", "metadata"),
    updatedAt: requireTimestamp(meta, "updatedAt", "metadata"),
    ...creator !== void 0 ? { creator } : {},
    ...description !== void 0 ? { description } : {}
  };
  if (typeof raw2.manifest !== "object" || raw2.manifest === null) {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      'Missing or invalid "manifest" field'
    );
  }
  const manifestEntries = Object.entries(raw2.manifest);
  if (manifestEntries.length > MANIFEST_MAX_SIZE) {
    throw new UxfError(
      "LIMIT_EXCEEDED",
      `Manifest entry count exceeds MANIFEST_MAX_SIZE=${MANIFEST_MAX_SIZE}: ${manifestEntries.length}`
    );
  }
  const tokens = /* @__PURE__ */ new Map();
  for (const [tokenId, rootHash] of manifestEntries) {
    if (!/^[0-9a-f]{64,68}$/.test(tokenId)) {
      throw new UxfError(
        "SERIALIZATION_ERROR",
        `Invalid manifest tokenId: ${tokenId.slice(0, 32)}\u2026`
      );
    }
    tokens.set(tokenId, contentHash(rootHash));
  }
  const manifest = { tokens };
  if (typeof raw2.elements !== "object" || raw2.elements === null) {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      'Missing or invalid "elements" field'
    );
  }
  const pool = /* @__PURE__ */ new Map();
  const elementEntries = Object.entries(raw2.elements);
  if (elementEntries.length > ELEMENTS_MAX_SIZE) {
    throw new UxfError(
      "LIMIT_EXCEEDED",
      `Elements pool size exceeds ELEMENTS_MAX_SIZE=${ELEMENTS_MAX_SIZE}: ${elementEntries.length}`
    );
  }
  for (const [hashStr, jsonElem] of elementEntries) {
    const hash = contentHash(hashStr);
    const element = deserializeElement(jsonElem);
    const recomputed = computeElementHash(element);
    if (recomputed !== hash) {
      throw new UxfError(
        "SERIALIZATION_ERROR",
        `Element hash mismatch: key ${hash}, computed ${recomputed}`
      );
    }
    pool.set(hash, element);
  }
  const instanceChains = /* @__PURE__ */ new Map();
  if (raw2.instanceChainIndex && typeof raw2.instanceChainIndex === "object") {
    for (const [, entryJson] of Object.entries(raw2.instanceChainIndex)) {
      const entry = {
        head: contentHash(entryJson.head),
        chain: entryJson.chain.map(
          (link) => ({
            hash: contentHash(link.hash),
            kind: link.kind
          })
        )
      };
      for (const link of entry.chain) {
        instanceChains.set(link.hash, entry);
      }
    }
  }
  let indexes;
  if (raw2.indexes && typeof raw2.indexes === "object") {
    indexes = deserializeIndexes(raw2.indexes);
  } else {
    indexes = {
      byTokenType: /* @__PURE__ */ new Map(),
      byCoinId: /* @__PURE__ */ new Map(),
      byStateHash: /* @__PURE__ */ new Map()
    };
  }
  for (const [tokenId, rootHash] of manifest.tokens) {
    const rootEl = pool.get(rootHash);
    if (rootEl && rootEl.header.kind === ENRICHED_SYNTHETIC_KIND) {
      throw new UxfError(
        "VERIFICATION_FAILED",
        `Refusing to import package with synthetic (Rule 4 enriched) manifest head for token ${tokenId} (rootHash=${rootHash}). Synthetic roots are ephemeral merge artifacts that must NOT cross peer boundaries.`
      );
    }
  }
  return {
    envelope,
    manifest,
    pool,
    instanceChains,
    indexes
  };
}
function deserializeElement(json) {
  if (typeof json !== "object" || json === null) {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      "Element must be an object"
    );
  }
  const hdr = json.header;
  if (typeof hdr !== "object" || hdr === null) {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      "Element header must be an object"
    );
  }
  assertHeaderVersionField(hdr.representation, "Element header.representation");
  assertHeaderVersionField(hdr.semantics, "Element header.semantics");
  assertHeaderKindField(hdr.kind, "Element header.kind");
  const typeId = json.type;
  if (typeof typeId !== "number") {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      `Element type must be an integer, got ${typeof typeId}`
    );
  }
  const typeTag = TYPE_ID_TO_TAG.get(typeId);
  if (typeTag === void 0) {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      `Unknown element type ID: ${typeId}`
    );
  }
  const children = {};
  if (json.children && typeof json.children === "object") {
    for (const [key, value] of Object.entries(json.children)) {
      if (value === null) {
        children[key] = null;
      } else if (Array.isArray(value)) {
        children[key] = value.map((h) => contentHash(h));
      } else {
        children[key] = contentHash(value);
      }
    }
  }
  const rawContent = json.content ?? {};
  const content = deserializeContent(typeTag, rawContent);
  return {
    header: {
      representation: hdr.representation,
      semantics: hdr.semantics,
      kind: hdr.kind,
      predecessor: hdr.predecessor !== null ? contentHash(hdr.predecessor) : null
    },
    type: typeTag,
    content,
    children
  };
}
function deserializeContent(type, content) {
  const result = {};
  for (const [key, value] of Object.entries(content)) {
    if (type === "genesis-data" && key === "reason") {
      if (typeof value === "string") {
        result[key] = hexStringToUint8Array(value);
      } else {
        result[key] = value;
      }
      continue;
    }
    if (typeof value === "string" && HEX_PATTERN.test(value)) {
      result[key] = value.toLowerCase();
    } else if (Array.isArray(value)) {
      result[key] = value.map(
        (item) => typeof item === "string" && HEX_PATTERN.test(item) ? item.toLowerCase() : item
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}
function deserializeIndexes(json) {
  const byTokenType = /* @__PURE__ */ new Map();
  if (json.byTokenType && typeof json.byTokenType === "object") {
    for (const [key, arr] of Object.entries(json.byTokenType)) {
      byTokenType.set(key, new Set(arr));
    }
  }
  const byCoinId = /* @__PURE__ */ new Map();
  if (json.byCoinId && typeof json.byCoinId === "object") {
    for (const [key, arr] of Object.entries(json.byCoinId)) {
      byCoinId.set(key, new Set(arr));
    }
  }
  const byStateHash = /* @__PURE__ */ new Map();
  if (json.byStateHash && typeof json.byStateHash === "object") {
    for (const [key, value] of Object.entries(json.byStateHash)) {
      byStateHash.set(key, value);
    }
  }
  return { byTokenType, byCoinId, byStateHash };
}
function requireString(obj, field, context) {
  const value = obj[field];
  if (typeof value !== "string") {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      `Missing or invalid "${field}" in ${context}: expected string`
    );
  }
  return value;
}
function requireOptionalString(obj, field, context) {
  const value = obj[field];
  if (value === void 0) {
    return void 0;
  }
  if (typeof value !== "string") {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      `Invalid "${field}" in ${context}: expected string or undefined, got ${typeof value}`
    );
  }
  return value;
}
function requireTimestamp(obj, field, context) {
  const value = obj[field];
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      `Missing or invalid "${field}" in ${context}: expected non-negative integer (got ${typeof value === "number" ? value : typeof value})`
    );
  }
  return value;
}
var TYPE_ID_TO_TAG, HEX_PATTERN, hexStringToUint8Array;
var init_json = __esm({
  "uxf/json.ts"() {
    "use strict";
    init_types();
    init_token_join();
    init_errors4();
    init_hash();
    init_hex();
    init_header_validation();
    init_limits();
    TYPE_ID_TO_TAG = new Map(
      Object.entries(ELEMENT_TYPE_IDS).map(
        ([tag, id]) => [id, tag]
      )
    );
    HEX_PATTERN = /^[0-9a-fA-F]{64,}$/;
    hexStringToUint8Array = hexToBytesAllowEmpty;
  }
});

// uxf/ipld.ts
import { encode as dagCborEncode3, decode as dagCborDecode2 } from "@ipld/dag-cbor";
import { CID as CID4 } from "multiformats";
import { CarWriter as CarWriter2 } from "@ipld/car/writer";
import { CarReader as CarReader3 } from "@ipld/car";
function contentHashToCid(hash) {
  const digestBytes = hexToBytes6(hash);
  const digest = createSha256Digest(digestBytes);
  return CID4.createV1(DAG_CBOR_CODE2, digest);
}
function cidToContentHash(cid) {
  if (cid.multihash.code !== 18) {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      `Expected sha2-256 (0x12) multihash, got 0x${cid.multihash.code.toString(16)}`
    );
  }
  return contentHash(bytesToHex6(cid.multihash.digest));
}
function elementToIpldBlock(element) {
  const canonical = buildCanonicalForm(element);
  const bytes = dagCborEncode3(canonical);
  const hashBytes = sha256Sync(bytes);
  const digest = createSha256Digest(hashBytes);
  const cid = CID4.createV1(DAG_CBOR_CODE2, digest);
  return { cid, bytes };
}
async function exportToCar(pkg) {
  for (const [tokenId, rootHash] of pkg.manifest.tokens) {
    const rootEl = pkg.pool.get(rootHash);
    if (!rootEl) {
      throw new UxfError(
        "MISSING_ELEMENT",
        `Refusing to export package: manifest entry for token ${tokenId} references rootHash ${rootHash} but no such element exists in pool.`
      );
    }
    if (rootEl.header.kind === ENRICHED_SYNTHETIC_KIND) {
      throw new UxfError(
        "VERIFICATION_FAILED",
        `Refusing to export package with synthetic (Rule 4 enriched) manifest head for token ${tokenId} (rootHash=${rootHash}). Finalize the merge first: resolve the synthetic to a signed root or remove the token from the manifest.`
      );
    }
  }
  const manifestTokens = {};
  for (const [tokenId, rootHash] of pkg.manifest.tokens) {
    manifestTokens[tokenId] = contentHashToCid(rootHash);
  }
  const manifestNode = { tokens: manifestTokens };
  const manifestBytes = dagCborEncode3(manifestNode);
  const manifestHashBytes = sha256Sync(manifestBytes);
  const manifestDigest = createSha256Digest(manifestHashBytes);
  const manifestCid = CID4.createV1(DAG_CBOR_CODE2, manifestDigest);
  const envelopeNode = {
    version: pkg.envelope.version,
    createdAt: pkg.envelope.createdAt,
    updatedAt: pkg.envelope.updatedAt,
    manifest: manifestCid
  };
  if (pkg.envelope.creator !== void 0) {
    envelopeNode.creator = pkg.envelope.creator;
  }
  if (pkg.envelope.description !== void 0) {
    envelopeNode.description = pkg.envelope.description;
  }
  const envelopeBytes = dagCborEncode3(envelopeNode);
  const envelopeHashBytes = sha256Sync(envelopeBytes);
  const envelopeDigest = createSha256Digest(envelopeHashBytes);
  const envelopeCid = CID4.createV1(DAG_CBOR_CODE2, envelopeDigest);
  const { writer, out } = CarWriter2.create([envelopeCid]);
  const chunks = [];
  const collectPromise = (async () => {
    for await (const chunk of out) {
      chunks.push(chunk);
    }
  })();
  await writer.put({ cid: envelopeCid, bytes: envelopeBytes });
  await writer.put({ cid: manifestCid, bytes: manifestBytes });
  const written = /* @__PURE__ */ new Set();
  written.add(envelopeCid.toString());
  written.add(manifestCid.toString());
  for (const rootHash of pkg.manifest.tokens.values()) {
    await writeBfs(pkg, rootHash, writer, written);
  }
  await writer.close();
  await collectPromise;
  return concatUint8Arrays(chunks);
}
async function writeBfs(pkg, startHash, writer, written) {
  const queue = [startHash];
  while (queue.length > 0) {
    const hash = queue.shift();
    const cid = contentHashToCid(hash);
    const cidStr = cid.toString();
    if (written.has(cidStr)) {
      continue;
    }
    written.add(cidStr);
    const element = pkg.pool.get(hash);
    if (!element) {
      continue;
    }
    const block = elementToIpldBlock(element);
    await writer.put({ cid: block.cid, bytes: block.bytes });
    for (const childRef of Object.values(element.children)) {
      if (childRef === null) {
        continue;
      }
      if (Array.isArray(childRef)) {
        for (const childHash of childRef) {
          queue.push(childHash);
        }
      } else {
        queue.push(childRef);
      }
    }
    if (element.header.predecessor !== null) {
      queue.push(element.header.predecessor);
    }
  }
}
async function importFromCar(car) {
  if (car.byteLength > CAR_IMPORT_MAX_TOTAL_BYTES) {
    throw new UxfError(
      "LIMIT_EXCEEDED",
      `CAR exceeds max bytes: ${car.byteLength} > ${CAR_IMPORT_MAX_TOTAL_BYTES}`
    );
  }
  const reader = await CarReader3.fromBytes(car);
  const roots = await reader.getRoots();
  if (roots.length === 0) {
    throw new UxfError("INVALID_PACKAGE", "CAR file has no root CID");
  }
  if (roots.length !== 1) {
    throw new UxfError(
      "INVALID_PACKAGE",
      `Multi-root CAR rejected (received ${roots.length} roots)`
    );
  }
  const envelopeCid = roots[0];
  const envelopeBlock = await reader.get(envelopeCid);
  if (!envelopeBlock) {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      "Envelope block not found in CAR"
    );
  }
  assertBlockHashMatchesCid(envelopeBlock.bytes, envelopeCid, "Envelope");
  const envelopeNode = dagCborDecode2(envelopeBlock.bytes);
  const manifestCid = envelopeNode.manifest;
  if (!(manifestCid instanceof CID4)) {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      "Envelope does not contain a valid manifest CID link"
    );
  }
  const envVersion = envelopeNode.version;
  if (typeof envVersion !== "string") {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      `Envelope.version must be a string, got ${typeof envVersion}`
    );
  }
  if (envVersion !== "1.0.0") {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      `Unsupported uxf version: "${envVersion}"`
    );
  }
  const envCreatedAt = envelopeNode.createdAt;
  if (typeof envCreatedAt !== "number" || !Number.isFinite(envCreatedAt)) {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      `Envelope.createdAt must be a finite number, got ${typeof envCreatedAt}`
    );
  }
  const envUpdatedAt = envelopeNode.updatedAt;
  if (typeof envUpdatedAt !== "number" || !Number.isFinite(envUpdatedAt)) {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      `Envelope.updatedAt must be a finite number, got ${typeof envUpdatedAt}`
    );
  }
  if (envelopeNode.creator !== void 0 && typeof envelopeNode.creator !== "string") {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      `Envelope.creator must be a string or undefined, got ${typeof envelopeNode.creator}`
    );
  }
  if (typeof envelopeNode.creator === "string" && envelopeNode.creator.length > MAX_CREATOR_LENGTH) {
    throw new UxfError(
      "LIMIT_EXCEEDED",
      `Envelope.creator exceeds MAX_CREATOR_LENGTH=${MAX_CREATOR_LENGTH}: ${envelopeNode.creator.length}`
    );
  }
  if (envelopeNode.description !== void 0 && typeof envelopeNode.description !== "string") {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      `Envelope.description must be a string or undefined, got ${typeof envelopeNode.description}`
    );
  }
  if (typeof envelopeNode.description === "string" && envelopeNode.description.length > MAX_DESCRIPTION_LENGTH) {
    throw new UxfError(
      "LIMIT_EXCEEDED",
      `Envelope.description exceeds MAX_DESCRIPTION_LENGTH=${MAX_DESCRIPTION_LENGTH}: ${envelopeNode.description.length}`
    );
  }
  const envelope = {
    version: envVersion,
    createdAt: envCreatedAt,
    updatedAt: envUpdatedAt,
    ...envelopeNode.creator !== void 0 ? { creator: envelopeNode.creator } : {},
    ...envelopeNode.description !== void 0 ? { description: envelopeNode.description } : {}
  };
  const manifestBlock = await reader.get(manifestCid);
  if (!manifestBlock) {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      "Manifest block not found in CAR"
    );
  }
  assertBlockHashMatchesCid(manifestBlock.bytes, manifestCid, "Manifest");
  const manifestNode = dagCborDecode2(manifestBlock.bytes);
  const manifestEntries = Object.entries(manifestNode.tokens);
  if (manifestEntries.length > MANIFEST_MAX_SIZE) {
    throw new UxfError(
      "LIMIT_EXCEEDED",
      `Manifest entry count exceeds MANIFEST_MAX_SIZE=${MANIFEST_MAX_SIZE}: ${manifestEntries.length}`
    );
  }
  const tokens = /* @__PURE__ */ new Map();
  for (const [tokenId, cid] of manifestEntries) {
    if (!/^[0-9a-f]{64,68}$/.test(tokenId)) {
      throw new UxfError(
        "SERIALIZATION_ERROR",
        `Invalid manifest tokenId: ${tokenId.slice(0, 32)}\u2026`
      );
    }
    if (!(cid instanceof CID4)) {
      throw new UxfError(
        "SERIALIZATION_ERROR",
        `Manifest value for tokenId ${tokenId} is not a CID`
      );
    }
    tokens.set(tokenId, cidToContentHash(cid));
  }
  const manifest = { tokens };
  const nonElementCids = /* @__PURE__ */ new Set();
  nonElementCids.add(envelopeCid.toString());
  nonElementCids.add(manifestCid.toString());
  const pool = /* @__PURE__ */ new Map();
  let blockCount = 0;
  for await (const block of reader.blocks()) {
    blockCount += 1;
    if (blockCount > CAR_IMPORT_MAX_BLOCK_COUNT) {
      pool.clear();
      throw new UxfError(
        "INVALID_PACKAGE",
        `CAR block count exceeds CAR_IMPORT_MAX_BLOCK_COUNT=${CAR_IMPORT_MAX_BLOCK_COUNT} (bloat-DoS protection: hostile CARs may flood with tiny blocks under the per-element-count pool cap).`
      );
    }
    if (block.bytes.byteLength > CAR_IMPORT_MAX_BLOCK_BYTES) {
      pool.clear();
      throw new UxfError(
        "INVALID_PACKAGE",
        `CAR block ${block.cid.toString()} size ${block.bytes.byteLength} bytes exceeds CAR_IMPORT_MAX_BLOCK_BYTES=${CAR_IMPORT_MAX_BLOCK_BYTES} (per-block bloat-DoS protection).`
      );
    }
    const cidStr = block.cid.toString();
    if (nonElementCids.has(cidStr)) {
      continue;
    }
    const hash = cidToContentHash(block.cid);
    const node = dagCborDecode2(block.bytes);
    const element = decodeIpldElement(node);
    const recomputed = computeElementHash(element);
    if (recomputed !== hash) {
      throw new UxfError(
        "VERIFICATION_FAILED",
        `CAR element hash mismatch: CID implies ${hash}, computed ${recomputed}`
      );
    }
    pool.set(hash, element);
  }
  for (const [tokenId, rootHash] of manifest.tokens) {
    const rootEl = pool.get(rootHash);
    if (rootEl && rootEl.header.kind === ENRICHED_SYNTHETIC_KIND) {
      throw new UxfError(
        "VERIFICATION_FAILED",
        `Refusing to import CAR with synthetic (Rule 4 enriched) manifest head for token ${tokenId} (rootHash=${rootHash}). Synthetic roots are ephemeral merge artifacts that must NOT cross peer boundaries.`
      );
    }
  }
  const instanceChains = rebuildInstanceChains(pool);
  const indexes = {
    byTokenType: /* @__PURE__ */ new Map(),
    byCoinId: /* @__PURE__ */ new Map(),
    byStateHash: /* @__PURE__ */ new Map()
  };
  return {
    envelope,
    manifest,
    pool,
    instanceChains,
    indexes
  };
}
function buildCanonicalForm(element) {
  const header = buildCanonicalHeader(element);
  const typeId = ELEMENT_TYPE_IDS[element.type];
  const preparedContent = prepareContentForHashing(
    element.type,
    element.content
  );
  const preparedChildren = prepareChildrenForHashing(
    element.children
  );
  return {
    header,
    type: typeId,
    content: preparedContent,
    children: preparedChildren
  };
}
function buildCanonicalHeader(element) {
  return [
    element.header.representation,
    element.header.semantics,
    element.header.kind,
    element.header.predecessor !== null ? hexToBytes6(element.header.predecessor) : null
  ];
}
function decodeIpldElement(node) {
  const hdrArray = node.header;
  if (!Array.isArray(hdrArray) || hdrArray.length < 4) {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      "Invalid IPLD element header format"
    );
  }
  assertHeaderVersionField(hdrArray[0], "IPLD element header[0] (representation)");
  assertHeaderVersionField(hdrArray[1], "IPLD element header[1] (semantics)");
  assertHeaderKindField(hdrArray[2], "IPLD element header[2] (kind)");
  const predecessor = hdrArray[3];
  let predecessorHash = null;
  if (predecessor instanceof Uint8Array) {
    if (predecessor.byteLength !== 32) {
      throw new UxfError(
        "SERIALIZATION_ERROR",
        `IPLD element header[3] (predecessor) must be exactly 32 bytes (sha2-256 digest), got ${predecessor.byteLength}`
      );
    }
    predecessorHash = contentHash(bytesToHex6(predecessor));
  } else if (predecessor !== null && predecessor !== void 0) {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      `IPLD element header[3] (predecessor) must be Uint8Array or null, got ${typeof predecessor}`
    );
  }
  const typeTag = TYPE_ID_TO_TAG2.get(node.type);
  if (typeTag === void 0) {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      `Unknown element type ID in IPLD block: ${node.type}`
    );
  }
  const content = decodeIpldContent(typeTag, node.content);
  const children = decodeIpldChildren(node.children);
  return {
    header: {
      representation: hdrArray[0],
      semantics: hdrArray[1],
      kind: hdrArray[2],
      predecessor: predecessorHash
    },
    type: typeTag,
    content,
    children
  };
}
function decodeIpldContent(type, content) {
  const result = {};
  for (const [key, value] of Object.entries(content)) {
    if (value instanceof Uint8Array) {
      if (type === "genesis-data" && key === "reason") {
        result[key] = value;
      } else {
        result[key] = bytesToHex6(value);
      }
    } else if (Array.isArray(value)) {
      result[key] = decodeIpldContentArray(type, key, value);
    } else if (typeof value === "bigint") {
      result[key] = value.toString();
    } else if (value === null) {
      result[key] = null;
    } else {
      result[key] = value;
    }
  }
  return result;
}
function decodeIpldContentArray(type, key, value) {
  if (type === "smt-path" && key === "segments") {
    return value.map((seg) => {
      const s = seg;
      let pathStr;
      if (s.path instanceof Uint8Array) {
        let v = 0n;
        for (const byte of s.path) {
          v = v << 8n | BigInt(byte);
        }
        pathStr = v.toString();
      } else if (typeof s.path === "bigint") {
        pathStr = s.path.toString();
      } else {
        pathStr = String(s.path);
      }
      return {
        data: s.data instanceof Uint8Array ? bytesToHex6(s.data) : s.data,
        path: pathStr
      };
    });
  }
  if (type === "transaction-data" && key === "nametagRefs") {
    return value.map(
      (item) => item instanceof Uint8Array ? bytesToHex6(item) : item
    );
  }
  return value.map((item) => {
    if (item instanceof Uint8Array) {
      return bytesToHex6(item);
    }
    if (Array.isArray(item)) {
      return item.map(
        (sub) => sub instanceof Uint8Array ? bytesToHex6(sub) : sub
      );
    }
    return item;
  });
}
function decodeIpldChildren(children) {
  const result = {};
  for (const [key, value] of Object.entries(children)) {
    if (value === null) {
      result[key] = null;
    } else if (value instanceof Uint8Array) {
      result[key] = decodeChildBytes(value, key);
    } else if (value instanceof CID4) {
      result[key] = cidToContentHash(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item, index) => {
        if (item instanceof Uint8Array) {
          return decodeChildBytes(item, `${key}[${index}]`);
        }
        if (item instanceof CID4) {
          return cidToContentHash(item);
        }
        throw new UxfError(
          "SERIALIZATION_ERROR",
          `Unexpected child element type at ${key}[${index}]`
        );
      });
    } else {
      throw new UxfError(
        "SERIALIZATION_ERROR",
        `Unexpected child value type for key "${key}"`
      );
    }
  }
  return result;
}
function decodeChildBytes(bytes, label) {
  if (bytes.byteLength !== 32) {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      `Child reference at "${label}" must be exactly 32 bytes (sha2-256 digest), got ${bytes.byteLength}`
    );
  }
  return contentHash(bytesToHex6(bytes));
}
function rebuildInstanceChains(pool) {
  const chains = /* @__PURE__ */ new Map();
  const successorsOf = /* @__PURE__ */ new Map();
  const hasPredecessor = /* @__PURE__ */ new Set();
  for (const [hash, element] of pool) {
    if (element.header.predecessor !== null) {
      const existing = successorsOf.get(element.header.predecessor);
      if (existing) {
        existing.push(hash);
      } else {
        successorsOf.set(element.header.predecessor, [hash]);
      }
      hasPredecessor.add(hash);
    }
  }
  const heads = /* @__PURE__ */ new Set();
  for (const [hash, element] of pool) {
    if (!successorsOf.has(hash) && element.header.predecessor !== null) {
      heads.add(hash);
    }
  }
  for (const succs of successorsOf.values()) {
    for (const successorHash of succs) {
      if (!successorsOf.has(successorHash)) {
        const element = pool.get(successorHash);
        if (element && element.header.predecessor !== null) {
          heads.add(successorHash);
        }
      }
    }
  }
  for (const head of heads) {
    const chain = [];
    const seen = /* @__PURE__ */ new Set();
    let current = head;
    while (current !== null) {
      if (seen.has(current)) {
        throw new UxfError(
          "INVALID_INSTANCE_CHAIN",
          `predecessor cycle detected at element ${current}`
        );
      }
      seen.add(current);
      const element = pool.get(current);
      if (!element) break;
      chain.push({ hash: current, kind: element.header.kind });
      current = element.header.predecessor;
    }
    if (chain.length > 1) {
      const entry = { head, chain };
      for (const link of chain) {
        chains.set(link.hash, entry);
      }
    }
  }
  return chains;
}
function createSha256Digest(hash) {
  const code2 = 18;
  const size = hash.length;
  const bytes = new Uint8Array(2 + size);
  bytes[0] = code2;
  bytes[1] = size;
  bytes.set(hash, 2);
  return { code: code2, size, digest: hash, bytes };
}
function sha256Sync(data) {
  return sha256(data);
}
function assertBlockHashMatchesCid(bytes, cid, label) {
  if (cid.multihash.code !== 18) {
    throw new UxfError(
      "VERIFICATION_FAILED",
      `${label} CID must use sha2-256 (0x12); got 0x${cid.multihash.code.toString(16)}`
    );
  }
  const computed = sha256Sync(bytes);
  const claimed = cid.multihash.digest;
  if (computed.length !== claimed.length) {
    throw new UxfError(
      "VERIFICATION_FAILED",
      `${label} block hash does not match its CID (length mismatch: ${computed.length} vs ${claimed.length})`
    );
  }
  for (let i = 0; i < computed.length; i++) {
    if (computed[i] !== claimed[i]) {
      throw new UxfError(
        "VERIFICATION_FAILED",
        `${label} block hash does not match its CID`
      );
    }
  }
}
function bytesToHex6(bytes) {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}
function concatUint8Arrays(arrays) {
  let totalLength = 0;
  for (const arr of arrays) {
    totalLength += arr.length;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
var DAG_CBOR_CODE2, TYPE_ID_TO_TAG2;
var init_ipld = __esm({
  "uxf/ipld.ts"() {
    "use strict";
    init_sha2();
    init_types();
    init_token_join();
    init_errors4();
    init_header_validation();
    init_hash();
    init_limits();
    DAG_CBOR_CODE2 = 113;
    TYPE_ID_TO_TAG2 = new Map(
      Object.entries(ELEMENT_TYPE_IDS).map(
        ([tag, id]) => [id, tag]
      )
    );
  }
});

// uxf/UxfPackage.ts
var UxfPackage_exports = {};
__export(UxfPackage_exports, {
  UxfPackage: () => UxfPackage,
  addInstance: () => addInstance2,
  applyDelta: () => applyDelta,
  assemble: () => assemble,
  assembleAtState: () => assembleAtState,
  collectGarbage: () => collectGarbageFn,
  collectGarbageFn: () => collectGarbageFn,
  consolidateProofs: () => consolidateProofs,
  diff: () => diff,
  ingest: () => ingest,
  ingestAll: () => ingestAll,
  merge: () => mergePkg,
  packageFromJson: () => packageFromJson,
  packageToJson: () => packageToJson,
  removeToken: () => removeToken,
  verify: () => verify
});
function wrapPool(pkg) {
  if (pkg.pool.size > WRAP_POOL_MAX_SIZE) {
    throw new UxfError(
      "INVALID_PACKAGE",
      `wrapPool: pool size ${pkg.pool.size} exceeds WRAP_POOL_MAX_SIZE=${WRAP_POOL_MAX_SIZE} (bloat-DoS protection)`
    );
  }
  return ElementPool.fromMapVerified(pkg.pool);
}
function syncPool(pkg, pool) {
  const newMap = pool.toMap();
  const mutablePool = pkg.pool;
  mutablePool.clear();
  for (const [hash, element] of newMap) {
    mutablePool.set(hash, element);
  }
}
function ingest(pkg, token) {
  const pool = wrapPool(pkg);
  const rootHash = deconstructToken(pool, token);
  syncPool(pkg, pool);
  const rootElement = pool.get(rootHash);
  const rootContent = rootElement.content;
  const tokenId = rootContent.tokenId;
  const mutableManifest = pkg.manifest.tokens;
  mutableManifest.set(tokenId, rootHash);
  pkg.envelope.updatedAt = Math.floor(Date.now() / 1e3);
  updateIndexesForToken(pkg, tokenId, rootHash);
}
function ingestAll(pkg, tokens) {
  if (tokens.length === 0) return;
  const pool = wrapPool(pkg);
  const newTokens = [];
  for (const token of tokens) {
    const rootHash = deconstructToken(pool, token);
    const rootElement = pool.get(rootHash);
    const rootContent = rootElement.content;
    newTokens.push({ tokenId: rootContent.tokenId, rootHash });
    if (pool.size > WRAP_POOL_MAX_SIZE) {
      throw new UxfError(
        "INVALID_PACKAGE",
        `ingestAll: pool size ${pool.size} exceeds WRAP_POOL_MAX_SIZE=${WRAP_POOL_MAX_SIZE} mid-batch (after ${newTokens.length} of ${tokens.length} tokens). Bloat-DoS protection.`
      );
    }
  }
  const prePoolSnapshot = new Map(pkg.pool);
  syncPool(pkg, pool);
  const mutableManifest = pkg.manifest.tokens;
  const previousManifest = /* @__PURE__ */ new Map();
  for (const { tokenId } of newTokens) {
    previousManifest.set(tokenId, mutableManifest.get(tokenId));
  }
  const committedTokenIds = [];
  let inFlightTokenId;
  try {
    for (const { tokenId, rootHash } of newTokens) {
      inFlightTokenId = tokenId;
      mutableManifest.set(tokenId, rootHash);
      updateIndexesForToken(pkg, tokenId, rootHash);
      committedTokenIds.push(tokenId);
      inFlightTokenId = void 0;
    }
  } catch (err) {
    if (inFlightTokenId !== void 0) {
      try {
        removeFromIndexes(pkg.indexes, inFlightTokenId);
      } catch {
      }
    }
    for (const tokenId of committedTokenIds) {
      try {
        removeFromIndexes(pkg.indexes, tokenId);
      } catch {
      }
    }
    for (const [tokenId, prev] of previousManifest) {
      if (prev === void 0) mutableManifest.delete(tokenId);
      else mutableManifest.set(tokenId, prev);
    }
    try {
      const mutablePool = pkg.pool;
      mutablePool.clear();
      for (const [k, v] of prePoolSnapshot) mutablePool.set(k, v);
    } catch {
    }
    throw err;
  }
  pkg.envelope.updatedAt = Math.floor(Date.now() / 1e3);
}
function assemble(pkg, tokenId, strategy = STRATEGY_LATEST) {
  const pool = wrapPool(pkg);
  return assembleToken(pool, pkg.manifest, tokenId, pkg.instanceChains, strategy);
}
function assembleAtState(pkg, tokenId, stateIndex, strategy = STRATEGY_LATEST) {
  const pool = wrapPool(pkg);
  return assembleTokenAtState(
    pool,
    pkg.manifest,
    tokenId,
    stateIndex,
    pkg.instanceChains,
    strategy
  );
}
function removeToken(pkg, tokenId) {
  const mutableManifest = pkg.manifest.tokens;
  mutableManifest.delete(tokenId);
  removeFromIndexes(pkg.indexes, tokenId);
  pkg.envelope.updatedAt = Math.floor(Date.now() / 1e3);
}
function mergePkg(target, source, verifiedProofs) {
  const mutablePool = target.pool;
  const mutableManifest = target.manifest.tokens;
  const stagedPoolInserts = /* @__PURE__ */ new Map();
  for (const [hash, element] of source.pool) {
    const recomputed = computeElementHash(element);
    if (recomputed !== hash) {
      throw new UxfError(
        "VERIFICATION_FAILED",
        `Hash mismatch for incoming element ${hash}: computed ${recomputed}`
      );
    }
    if (!mutablePool.has(hash)) {
      stagedPoolInserts.set(hash, element);
    }
  }
  const virtualPool = new Map([
    ...mutablePool,
    ...stagedPoolInserts
  ]);
  const stagedManifestWrites = /* @__PURE__ */ new Map();
  const stagedSyntheticInserts = /* @__PURE__ */ new Map();
  for (const [tokenId, incomingRoot] of source.manifest.tokens) {
    try {
      const existingRoot = mutableManifest.get(tokenId);
      if (existingRoot === void 0) {
        stagedManifestWrites.set(tokenId, incomingRoot);
        continue;
      }
      if (existingRoot === incomingRoot) {
        continue;
      }
      const outcome = resolveTokenRoot({
        tokenId,
        candidates: [existingRoot, incomingRoot],
        pool: virtualPool,
        verifiedProofs
      });
      if (outcome.kind === "enriched") {
        stagedSyntheticInserts.set(outcome.rootHash, outcome.syntheticRoot);
      }
      stagedManifestWrites.set(tokenId, outcome.rootHash);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(
        "UxfPackage",
        `mergePkg: skipping tokenId ${tokenId} \u2014 resolver threw: ${message}`
      );
    }
  }
  for (const [hash, element] of stagedPoolInserts) {
    mutablePool.set(hash, element);
  }
  for (const [hash, syntheticRoot] of stagedSyntheticInserts) {
    mutablePool.set(hash, syntheticRoot);
  }
  for (const [tokenId, rootHash] of stagedManifestWrites) {
    mutableManifest.set(tokenId, rootHash);
  }
  const targetPool = wrapPool(target);
  mergeInstanceChains(
    target.instanceChains,
    source.instanceChains,
    targetPool
  );
  rebuildIndexes(target);
  target.envelope.updatedAt = Math.floor(Date.now() / 1e3);
}
function addInstance2(pkg, originalHash, newInstance) {
  const pool = wrapPool(pkg);
  addInstance(
    pool,
    pkg.instanceChains,
    originalHash,
    newInstance
  );
  syncPool(pkg, pool);
}
function consolidateProofs(_pkg, _tokenId, _txRange) {
  throw new UxfError(
    "NOT_IMPLEMENTED",
    "consolidateProofs is not implemented in Phase 1 (Decision 9)"
  );
}
function collectGarbageFn(pkg) {
  const removed = collectGarbage(pkg);
  return removed.size;
}
function updateIndexesForToken(pkg, tokenId, rootHash) {
  const rootElement = pkg.pool.get(rootHash);
  if (!rootElement) return;
  const rootChildren = rootElement.children;
  const genesisHash = rootChildren.genesis;
  const genesisElement = pkg.pool.get(genesisHash);
  if (genesisElement) {
    const genesisChildren = genesisElement.children;
    const genesisDataElement = pkg.pool.get(genesisChildren.data);
    if (genesisDataElement) {
      const genesisData = genesisDataElement.content;
      if (genesisData.tokenType) {
        const mutableByTokenType = pkg.indexes.byTokenType;
        let typeSet = mutableByTokenType.get(genesisData.tokenType);
        if (!typeSet) {
          typeSet = /* @__PURE__ */ new Set();
          mutableByTokenType.set(genesisData.tokenType, typeSet);
        }
        typeSet.add(tokenId);
      }
      if (genesisData.coinData && genesisData.coinData.length > 0) {
        const coinId = genesisData.coinData[0][0];
        if (coinId) {
          const mutableByCoinId = pkg.indexes.byCoinId;
          let coinSet = mutableByCoinId.get(coinId);
          if (!coinSet) {
            coinSet = /* @__PURE__ */ new Set();
            mutableByCoinId.set(coinId, coinSet);
          }
          coinSet.add(tokenId);
        }
      }
    }
  }
  const stateHash = rootChildren.state;
  const stateElement = pkg.pool.get(stateHash);
  if (stateElement) {
    const stateContent = stateElement.content;
    if (stateContent.data) {
      const mutableByStateHash = pkg.indexes.byStateHash;
      mutableByStateHash.set(stateContent.data, tokenId);
    }
  }
}
function removeFromIndexes(indexes, tokenId) {
  const mutableByTokenType = indexes.byTokenType;
  for (const [key, set] of mutableByTokenType) {
    set.delete(tokenId);
    if (set.size === 0) {
      mutableByTokenType.delete(key);
    }
  }
  const mutableByCoinId = indexes.byCoinId;
  for (const [key, set] of mutableByCoinId) {
    set.delete(tokenId);
    if (set.size === 0) {
      mutableByCoinId.delete(key);
    }
  }
  const mutableByStateHash = indexes.byStateHash;
  for (const [key, value] of mutableByStateHash) {
    if (value === tokenId) {
      mutableByStateHash.delete(key);
    }
  }
}
function rebuildIndexes(pkg) {
  const mutableByTokenType = pkg.indexes.byTokenType;
  const mutableByCoinId = pkg.indexes.byCoinId;
  const mutableByStateHash = pkg.indexes.byStateHash;
  mutableByTokenType.clear();
  mutableByCoinId.clear();
  mutableByStateHash.clear();
  for (const [tokenId, rootHash] of pkg.manifest.tokens) {
    updateIndexesForToken(pkg, tokenId, rootHash);
  }
}
var UxfPackage, WRAP_POOL_MAX_SIZE;
var init_UxfPackage = __esm({
  "uxf/UxfPackage.ts"() {
    "use strict";
    init_types();
    init_errors4();
    init_hash();
    init_element_pool();
    init_instance_chain();
    init_deconstruct();
    init_assemble();
    init_verify();
    init_diff();
    init_json();
    init_ipld();
    init_token_join();
    init_logger();
    init_json();
    UxfPackage = class _UxfPackage {
      data;
      constructor(data) {
        this.data = data;
      }
      // ---------- Static Factories ----------
      /**
       * Create a new empty package.
       */
      static create(options) {
        const now = Math.floor(Date.now() / 1e3);
        const envelope = {
          version: "1.0.0",
          createdAt: now,
          updatedAt: now,
          ...options?.description !== void 0 ? { description: options.description } : {},
          ...options?.creator !== void 0 ? { creator: options.creator } : {}
        };
        const data = {
          envelope,
          manifest: { tokens: /* @__PURE__ */ new Map() },
          pool: /* @__PURE__ */ new Map(),
          instanceChains: /* @__PURE__ */ new Map(),
          indexes: {
            byTokenType: /* @__PURE__ */ new Map(),
            byCoinId: /* @__PURE__ */ new Map(),
            byStateHash: /* @__PURE__ */ new Map()
          }
        };
        return new _UxfPackage(data);
      }
      /**
       * Load from storage adapter.
       */
      static async open(storage) {
        const data = await storage.load();
        if (!data) {
          throw new UxfError("INVALID_PACKAGE", "No package found in storage");
        }
        return new _UxfPackage(data);
      }
      /**
       * Deserialize from JSON.
       */
      static fromJson(json) {
        return new _UxfPackage(packageFromJson(json));
      }
      /**
       * Deserialize from CAR bytes.
       */
      static async fromCar(car) {
        const data = await importFromCar(car);
        rebuildIndexes(data);
        return new _UxfPackage(data);
      }
      // ---------- Ingestion ----------
      /**
       * Deconstruct a token and add to the package.
       * If the token already exists, its manifest entry is updated to the new root.
       */
      ingest(token) {
        ingest(this.data, token);
        return this;
      }
      /**
       * Batch ingest multiple tokens.
       */
      ingestAll(tokens) {
        ingestAll(this.data, tokens);
        return this;
      }
      // ---------- Reassembly ----------
      /**
       * Reassemble a token at its latest state.
       * @returns Self-contained object matching the ITokenJson shape.
       */
      assemble(tokenId, strategy) {
        return assemble(this.data, tokenId, strategy);
      }
      /**
       * Reassemble at a specific historical state.
       * stateIndex=0 -> genesis only. stateIndex=N -> genesis + first N transactions.
       */
      assembleAtState(tokenId, stateIndex, strategy) {
        return assembleAtState(this.data, tokenId, stateIndex, strategy);
      }
      /**
       * Assemble all tokens in the manifest.
       */
      assembleAll(strategy) {
        const result = /* @__PURE__ */ new Map();
        for (const tokenId of this.data.manifest.tokens.keys()) {
          result.set(tokenId, assemble(this.data, tokenId, strategy));
        }
        return result;
      }
      // ---------- Token Management ----------
      /**
       * Remove a token from the manifest.
       * Elements are NOT garbage-collected automatically -- call gc() explicitly.
       */
      removeToken(tokenId) {
        removeToken(this.data, tokenId);
        return this;
      }
      /**
       * List all token IDs in the manifest.
       */
      tokenIds() {
        return [...this.data.manifest.tokens.keys()];
      }
      /**
       * Check if a token exists in the manifest.
       */
      hasToken(tokenId) {
        return this.data.manifest.tokens.has(tokenId);
      }
      /**
       * Get the number of transactions for a token.
       * Resolves the token root element and returns its transactions array length.
       */
      transactionCount(tokenId) {
        const rootHash = this.data.manifest.tokens.get(tokenId);
        if (!rootHash) {
          throw new UxfError("TOKEN_NOT_FOUND", `Token ${tokenId} not in manifest`);
        }
        const rootElement = this.data.pool.get(rootHash);
        if (!rootElement) {
          throw new UxfError("MISSING_ELEMENT", `Root element ${rootHash} not in pool`);
        }
        const children = rootElement.children;
        return children.transactions.length;
      }
      // ---------- Instance Chains ----------
      /**
       * Append a new instance to an element's instance chain.
       */
      addInstance(originalHash, newInstance) {
        addInstance2(this.data, originalHash, newInstance);
        return this;
      }
      /**
       * Phase 2 -- throws NOT_IMPLEMENTED in Phase 1.
       */
      consolidateProofs(tokenId, txRange) {
        consolidateProofs(this.data, tokenId, txRange);
      }
      // ---------- Package Operations ----------
      /**
       * Merge another package into this one.
       * Elements are deduplicated by content hash.
       * Manifest entries from the other package are added (or overwritten if tokenId collides).
       *
       * Wave G.3: optionally accepts `verifiedProofs` — a set of inclusion-
       * proof element ContentHashes that the caller has cryptographically
       * verified (typically via `OracleProvider.verifyInclusionProof`).
       * When supplied, Rule 4 enrichment activates: same-core-different-
       * proof tx pairs are lifted into a synthetic token-root only when
       * at least one side's proof appears in the verified set. When
       * omitted, falls back to the conservative pre-G.3 `divergent`
       * resolution for any pairwise hash mismatch.
       */
      merge(other, opts) {
        mergePkg(this.data, other.data, opts?.verifiedProofs);
        return this;
      }
      /**
       * Wave I.5: build the `verifiedProofs` set for a Rule 4-enabled
       * merge by walking the inclusion-proof elements in this package
       * AND in `other` (the merge candidate), assembling each into the
       * SDK JSON shape, and asking the supplied `verifier` to validate.
       *
       * Returns the set of ContentHashes whose proofs verified
       * cryptographically. Suitable for passing to `merge(other, {
       * verifiedProofs })` to activate Rule 4 enrichment.
       *
       * The verifier callback is the `OracleProvider.verifyInclusionProof`
       * signature; supplied as a callback rather than the full provider
       * so this module stays decoupled from the oracle types.
       *
       * Failures (verifier throws, proof element malformed, etc.) are
       * treated as "not verified" — the resulting set is conservative.
       */
      async computeVerifiedProofs(other, verifier) {
        const verified = /* @__PURE__ */ new Set();
        const ELEMENT_TYPE_INCLUSION_PROOF2 = "inclusion-proof";
        const combinedPool = /* @__PURE__ */ new Map();
        for (const [k, v] of this.data.pool) combinedPool.set(k, v);
        for (const [k, v] of other.data.pool) combinedPool.set(k, v);
        const { assembleInclusionProofForVerification: assembleInclusionProofForVerification2 } = await Promise.resolve().then(() => (init_assemble(), assemble_exports));
        for (const [hash, el] of combinedPool) {
          if (el.type !== ELEMENT_TYPE_INCLUSION_PROOF2) continue;
          const txHashImprintHex = el.content.transactionHash;
          if (typeof txHashImprintHex !== "string") continue;
          let proofJson;
          try {
            proofJson = assembleInclusionProofForVerification2(combinedPool, hash);
          } catch {
            continue;
          }
          try {
            const ok = await verifier({
              proofJson,
              transactionHash: txHashImprintHex,
              proofHash: hash
            });
            if (ok) verified.add(hash);
          } catch {
          }
        }
        return verified;
      }
      /**
       * Compute the minimal delta between this package and another.
       */
      diff(other) {
        return diff(this.data, other.data);
      }
      /**
       * Apply a delta to this package.
       */
      applyDelta(delta) {
        applyDelta(this.data, delta);
        return this;
      }
      /**
       * Garbage-collect unreachable elements.
       * Returns the number of elements removed.
       */
      gc() {
        return collectGarbageFn(this.data);
      }
      // ---------- Verification ----------
      /**
       * Verify structural integrity of the package.
       */
      verify() {
        return verify(this.data);
      }
      // ---------- Queries ----------
      /**
       * Filter tokens by predicate.
       */
      filterTokens(predicate) {
        const result = [];
        for (const [tokenId, rootHash] of this.data.manifest.tokens) {
          const rootElement = this.data.pool.get(rootHash);
          if (rootElement && predicate(tokenId, rootElement)) {
            result.push(tokenId);
          }
        }
        return result;
      }
      /**
       * Get tokens by coin ID (uses index).
       */
      tokensByCoinId(coinId) {
        const set = this.data.indexes.byCoinId.get(coinId);
        return set ? [...set] : [];
      }
      /**
       * Get tokens by token type (uses index).
       */
      tokensByTokenType(tokenType) {
        const set = this.data.indexes.byTokenType.get(tokenType);
        return set ? [...set] : [];
      }
      // ---------- Serialization ----------
      /**
       * Serialize to JSON string.
       */
      toJson() {
        return packageToJson(this.data);
      }
      /**
       * Export as CARv1 bytes.
       */
      async toCar() {
        return exportToCar(this.data);
      }
      /**
       * Save to storage adapter.
       */
      async save(storage) {
        await storage.save(this.data);
      }
      // ---------- Statistics ----------
      /** Number of tokens in manifest. */
      get tokenCount() {
        return this.data.manifest.tokens.size;
      }
      /** Number of elements in pool. */
      get elementCount() {
        return this.data.pool.size;
      }
      /**
       * Estimated byte size (rough estimate based on element count).
       * Each element is roughly 500 bytes on average when CBOR-encoded.
       */
      get estimatedSize() {
        return this.data.pool.size * 500;
      }
      /** Get the underlying data (read-only). */
      get packageData() {
        return this.data;
      }
    };
    WRAP_POOL_MAX_SIZE = 1e6;
  }
});

// profile/consolidation.ts
var consolidation_exports = {};
__export(consolidation_exports, {
  ConsolidationEngine: () => ConsolidationEngine
});
var BUNDLE_KEY_PREFIX2, CONSOLIDATION_PENDING_KEY, PENDING_MAX_AGE_MS, DEFAULT_RETENTION_MS, CONSOLIDATION_THRESHOLD, ConsolidationEngine;
var init_consolidation = __esm({
  "profile/consolidation.ts"() {
    "use strict";
    init_logger();
    init_errors();
    init_oplog_entry();
    init_oplog_envelope_io();
    init_encryption();
    init_ipfs_client();
    init_transfer_payload();
    BUNDLE_KEY_PREFIX2 = "tokens.bundle.";
    CONSOLIDATION_PENDING_KEY = "consolidation.pending";
    PENDING_MAX_AGE_MS = 5 * 60 * 1e3;
    DEFAULT_RETENTION_MS = 7 * 24 * 60 * 60 * 1e3;
    CONSOLIDATION_THRESHOLD = 3;
    ConsolidationEngine = class {
      constructor(db, encryptionKey, ipfsGateways, retentionMs = DEFAULT_RETENTION_MS) {
        this.db = db;
        this.encryptionKey = encryptionKey;
        this.ipfsGateways = ipfsGateways;
        this.retentionMs = retentionMs;
      }
      // ---------------------------------------------------------------------------
      // Public API
      // ---------------------------------------------------------------------------
      /**
       * Check if consolidation is needed (active bundles > 3).
       */
      async shouldConsolidate() {
        const active = await this.listActiveBundles();
        return active.size > CONSOLIDATION_THRESHOLD;
      }
      /**
       * Check if another device is currently consolidating.
       * Returns true if a pending key exists and is less than 5 minutes old.
       */
      async isConsolidationInProgress() {
        const pending = await this.readPendingState();
        if (!pending) return false;
        const ageMs = Date.now() - pending.startedAt * 1e3;
        return ageMs < PENDING_MAX_AGE_MS;
      }
      /**
       * Run consolidation: merge all active bundles into one.
       *
       * Flow:
       *  1. Check for concurrent consolidation (pending key < 5 min old) -- skip if so
       *  2. List active bundles -- skip if count <= 3
       *  3. Write `consolidation.pending` to OrbitDB
       *  4. Fetch each active bundle CAR from IPFS (unencrypted)
       *  5. Merge all into a single UxfPackage
       *  6. Export to CAR, pin to IPFS (unencrypted)
       *  7. Add consolidated bundle ref to OrbitDB
       *  8. Mark all source bundles as superseded
       *  9. Delete `consolidation.pending` key
       * 10. Return result
       */
      async consolidate(opts) {
        const pending = await this.readPendingState();
        if (pending) {
          const ageMs = Date.now() - pending.startedAt * 1e3;
          if (ageMs < PENDING_MAX_AGE_MS) {
            this.log(
              `Consolidation in progress on device "${pending.device}" (started ${Math.round(ageMs / 1e3)}s ago) -- skipping`
            );
            return {
              consolidated: false,
              sourceBundleCount: 0,
              tokenCount: 0,
              skippedReason: `Another device ("${pending.device}") is consolidating`
            };
          }
          this.log(
            `Stale consolidation.pending from device "${pending.device}" (${Math.round(ageMs / 1e3)}s ago) -- overriding`
          );
        }
        const activeBundles = await this.listActiveBundles();
        if (activeBundles.size <= CONSOLIDATION_THRESHOLD) {
          return {
            consolidated: false,
            sourceBundleCount: activeBundles.size,
            tokenCount: 0,
            skippedReason: `Active bundle count (${activeBundles.size}) does not exceed threshold (${CONSOLIDATION_THRESHOLD})`
          };
        }
        const sourceCids = [...activeBundles.keys()];
        const deviceId = this.generateDeviceId();
        const pendingState = {
          sourceCids,
          startedAt: Math.floor(Date.now() / 1e3),
          device: deviceId
        };
        await this.writePendingState(pendingState);
        try {
          await new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
              if (opts?.abortSignal) opts.abortSignal.removeEventListener("abort", onAbort);
              resolve();
            }, 3e4);
            const onAbort = () => {
              clearTimeout(timer);
              reject(
                Object.assign(
                  new Error("Consolidation aborted by caller (TOCTOU sleep pre-empted)"),
                  { code: "CONSOLIDATION_ABORTED" }
                )
              );
            };
            if (opts?.abortSignal) {
              if (opts.abortSignal.aborted) {
                clearTimeout(timer);
                reject(
                  Object.assign(
                    new Error("Consolidation aborted by caller (signal already aborted)"),
                    { code: "CONSOLIDATION_ABORTED" }
                  )
                );
                return;
              }
              opts.abortSignal.addEventListener("abort", onAbort, { once: true });
            }
            if (typeof timer === "object" && timer !== null && "unref" in timer) {
              timer.unref();
            }
          });
        } catch (abortErr) {
          try {
            const current = await this.readPendingState();
            if (current && current.device === deviceId) {
              await this.db.del(CONSOLIDATION_PENDING_KEY);
            }
          } catch {
          }
          throw abortErr;
        }
        const readBack = await this.readPendingState();
        if (readBack && readBack.device !== deviceId) {
          this.log(
            `Concurrent consolidation detected from device ${readBack.device} \u2014 aborting our attempt`
          );
          return { consolidated: false, consolidatedCid: void 0, sourceBundleCount: 0, tokenCount: 0 };
        }
        try {
          const { UxfPackage: UxfPackage2 } = await Promise.resolve().then(() => (init_UxfPackage(), UxfPackage_exports));
          const mergedPkg = UxfPackage2.create({ description: "consolidated" });
          const successfullyMergedCids = [];
          for (const cid of sourceCids) {
            try {
              const carBytes = await fetchCarFromIpfs(this.ipfsGateways, cid);
              const pkg = await UxfPackage2.fromCar(carBytes);
              mergedPkg.merge(pkg);
              successfullyMergedCids.push(cid);
            } catch (err) {
              this.log(
                `Failed to load bundle ${cid} during consolidation \u2014 keeping it active (will retry next consolidation): ${err instanceof Error ? err.message : String(err)}`
              );
            }
          }
          if (successfullyMergedCids.length === 0) {
            await this.db.del(CONSOLIDATION_PENDING_KEY);
            return { consolidated: false, consolidatedCid: void 0, sourceBundleCount: 0, tokenCount: 0 };
          }
          const consolidatedCar = await mergedPkg.toCar();
          const consolidatedExpectedRootCid = await extractCarRootCid2(consolidatedCar);
          const consolidatedCid = await pinCarBlocksToIpfs(
            this.ipfsGateways,
            consolidatedCar,
            consolidatedExpectedRootCid
          );
          const tokenCount = mergedPkg.assembleAll().size;
          await this.finalizeConsolidation(
            consolidatedCid,
            tokenCount,
            successfullyMergedCids,
            // NOT sourceCids — prevents data loss on partial merge
            activeBundles
          );
          const skippedCount = sourceCids.length - successfullyMergedCids.length;
          this.log(
            `Consolidation complete: ${successfullyMergedCids.length} of ${sourceCids.length} bundles merged into ${consolidatedCid} (${tokenCount} tokens)` + (skippedCount > 0 ? `, ${skippedCount} bundles kept active for retry` : "")
          );
          return {
            consolidated: true,
            consolidatedCid,
            sourceBundleCount: successfullyMergedCids.length,
            tokenCount
          };
        } catch (err) {
          try {
            await this.db.del(CONSOLIDATION_PENDING_KEY);
          } catch {
          }
          throw new ProfileError(
            "CONSOLIDATION_IN_PROGRESS",
            `Consolidation failed: ${err instanceof Error ? err.message : String(err)}`,
            err
          );
        }
      }
      /**
       * Recover from a crash that interrupted a previous consolidation.
       *
       * Called on startup. If `consolidation.pending` exists:
       * - Check if the consolidated bundle was already pinned and registered.
       *   (The consolidated CID would appear as an active bundle whose
       *   source CIDs are all listed in the pending state.)
       * - If yes: complete steps 7-9 (mark sources superseded, delete pending).
       * - If no: delete the pending key so consolidation retries on next trigger.
       */
      async recoverFromCrash() {
        const pending = await this.readPendingState();
        if (!pending) return;
        this.log(
          `Found consolidation.pending from device "${pending.device}" (started at ${new Date(pending.startedAt * 1e3).toISOString()}) -- recovering`
        );
        const sourceCids = new Set(pending.sourceCids);
        const allBundles = await this.listAllBundles();
        let consolidatedCid = null;
        let consolidatedRef = null;
        for (const [cid, ref] of allBundles) {
          if (ref.status === "active" && !sourceCids.has(cid)) {
            if (ref.createdAt >= pending.startedAt) {
              consolidatedCid = cid;
              consolidatedRef = ref;
              break;
            }
          }
        }
        if (consolidatedCid && consolidatedRef) {
          this.log(
            `Consolidated bundle ${consolidatedCid} found -- completing recovery`
          );
          const activeSources = /* @__PURE__ */ new Map();
          for (const cid of pending.sourceCids) {
            const ref = allBundles.get(cid);
            if (ref && ref.status === "active") {
              activeSources.set(cid, ref);
            }
          }
          await this.markSourcesSuperseded(
            consolidatedCid,
            pending.sourceCids,
            activeSources
          );
          await this.db.del(CONSOLIDATION_PENDING_KEY);
          this.log("Crash recovery complete -- sources marked superseded");
        } else {
          this.log(
            "Consolidated bundle not found -- deleting stale pending key (will retry on next trigger)"
          );
          await this.db.del(CONSOLIDATION_PENDING_KEY);
        }
      }
      /**
       * Clean up expired superseded bundles.
       * Removes the `tokens.bundle.{CID}` key from OrbitDB when
       * `removeFromProfileAfter` has passed. Does NOT unpin from IPFS.
       *
       * @returns CIDs of removed bundle keys.
       */
      async cleanupExpired() {
        const allBundles = await this.listAllBundles();
        const nowSec = Math.floor(Date.now() / 1e3);
        const removed = [];
        for (const [cid, ref] of allBundles) {
          if (ref.status === "superseded" && ref.removeFromProfileAfter != null && ref.removeFromProfileAfter <= nowSec) {
            try {
              await this.db.del(BUNDLE_KEY_PREFIX2 + cid);
              removed.push(cid);
              this.log(`Cleaned up expired bundle key: ${cid}`);
            } catch (err) {
              this.log(
                `Failed to clean up expired bundle ${cid}: ${err instanceof Error ? err.message : String(err)}`
              );
            }
          }
        }
        if (removed.length > 0) {
          this.log(`Cleaned up ${removed.length} expired superseded bundle(s)`);
        }
        return removed;
      }
      // ---------------------------------------------------------------------------
      // Private: finalization helpers
      // ---------------------------------------------------------------------------
      /**
       * Complete steps 7-9 of consolidation:
       *  7. Add consolidated bundle to OrbitDB
       *  8. Mark all source bundles as superseded
       *  9. Delete consolidation.pending key
       */
      async finalizeConsolidation(consolidatedCid, tokenCount, sourceCids, activeBundles) {
        const consolidatedRef = {
          cid: consolidatedCid,
          status: "active",
          createdAt: Math.floor(Date.now() / 1e3),
          tokenCount
        };
        await this.addBundle(consolidatedCid, consolidatedRef);
        await this.markSourcesSuperseded(consolidatedCid, sourceCids, activeBundles);
        await this.db.del(CONSOLIDATION_PENDING_KEY);
      }
      /**
       * Mark all source bundles as superseded with a removal deadline.
       */
      async markSourcesSuperseded(consolidatedCid, sourceCids, activeBundles) {
        const removeAfter = Math.floor((Date.now() + this.retentionMs) / 1e3);
        for (const cid of sourceCids) {
          const existing = activeBundles.get(cid);
          if (!existing) continue;
          const supersededRef = {
            ...existing,
            status: "superseded",
            supersededBy: consolidatedCid,
            removeFromProfileAfter: removeAfter
          };
          await this.addBundle(cid, supersededRef);
        }
      }
      // ---------------------------------------------------------------------------
      // Private: bundle CRUD (mirrors ProfileTokenStorageProvider patterns)
      // ---------------------------------------------------------------------------
      /**
       * List all bundle refs from OrbitDB (all statuses).
       *
       * Post-T-D11, `ProfileTokenStorageProvider.addBundle` writes bundle
       * refs as envelope-stamped entries when the adapter supports
       * `putEntry` (originated='system', type='cache_index'). This
       * reader mirrors `ProfileTokenStorageProvider.listBundles`: try
       * envelope decode first, fall through to raw-bytes on throw. A
       * wallet with a mixed population (legacy raw-bytes from pre-T-D11
       * flushes alongside new stamped envelopes) round-trips in both
       * directions.
       */
      async listAllBundles() {
        const rawEntries = await this.db.all(BUNDLE_KEY_PREFIX2);
        const result = /* @__PURE__ */ new Map();
        for (const [key, value] of rawEntries) {
          const cid = key.slice(BUNDLE_KEY_PREFIX2.length);
          try {
            let encryptedPayload = value;
            try {
              const envelope = decodeEntry(value);
              if (envelope.v === 1) {
                encryptedPayload = envelope.payload;
              }
            } catch {
            }
            const decrypted = await decryptProfileValue(this.encryptionKey, encryptedPayload);
            const ref = JSON.parse(new TextDecoder().decode(decrypted));
            result.set(cid, ref);
          } catch (err) {
            this.log(
              `Failed to deserialize bundle ref for ${cid}: ${err instanceof Error ? err.message : String(err)}`
            );
          }
        }
        return result;
      }
      /**
       * List active bundle refs from OrbitDB.
       */
      async listActiveBundles() {
        const all = await this.listAllBundles();
        const active = /* @__PURE__ */ new Map();
        for (const [cid, ref] of all) {
          if (ref.status === "active") {
            active.set(cid, ref);
          }
        }
        return active;
      }
      /**
       * Write a bundle ref to OrbitDB (encrypted, system-stamped).
       *
       * Mirrors ProfileTokenStorageProvider.addBundle's T-D11 W11
       * stamping: envelope with originated='system' when putEntry is
       * available, raw-bytes fallback otherwise (readers auto-wrap as
       * v=0 legacy with synthesized originated='system' at read time).
       */
      async addBundle(cid, ref) {
        const serialized = new TextEncoder().encode(JSON.stringify(ref));
        const encryptedPayload = await encryptProfileValue(this.encryptionKey, serialized);
        const key = BUNDLE_KEY_PREFIX2 + cid;
        await putEnvelopePayload(this.db, key, encryptedPayload);
      }
      // ---------------------------------------------------------------------------
      // Private: consolidation.pending state
      // ---------------------------------------------------------------------------
      /**
       * Read the consolidation pending state from OrbitDB.
       * Returns null if no pending key exists or if it cannot be deserialized.
       */
      async readPendingState() {
        const raw2 = await getEnvelopePayload(this.db, CONSOLIDATION_PENDING_KEY);
        if (!raw2) return null;
        try {
          const decrypted = await decryptProfileValue(this.encryptionKey, raw2);
          return JSON.parse(new TextDecoder().decode(decrypted));
        } catch (err) {
          this.log(
            `Failed to read consolidation.pending: ${err instanceof Error ? err.message : String(err)}`
          );
          return null;
        }
      }
      /**
       * Write the consolidation pending state to OrbitDB.
       */
      async writePendingState(state) {
        const serialized = new TextEncoder().encode(JSON.stringify(state));
        const encrypted = await encryptProfileValue(this.encryptionKey, serialized);
        await putEnvelopePayload(this.db, CONSOLIDATION_PENDING_KEY, encrypted);
      }
      // ---------------------------------------------------------------------------
      // Private: utilities
      // ---------------------------------------------------------------------------
      /**
       * Generate a short device identifier for the pending state.
       * Uses a random 8-character hex string.
       */
      generateDeviceId() {
        const bytes = new Uint8Array(4);
        globalThis.crypto.getRandomValues(bytes);
        return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
      log(message) {
        logger.debug("Profile-Consolidation", message);
      }
    };
  }
});

// impl/shared/ipfs/ipfs-cache.ts
var DEFAULT_IPNS_TTL_MS, DEFAULT_FAILURE_COOLDOWN_MS, DEFAULT_FAILURE_THRESHOLD, DEFAULT_KNOWN_FRESH_WINDOW_MS, IpfsCache;
var init_ipfs_cache = __esm({
  "impl/shared/ipfs/ipfs-cache.ts"() {
    "use strict";
    DEFAULT_IPNS_TTL_MS = 6e4;
    DEFAULT_FAILURE_COOLDOWN_MS = 6e4;
    DEFAULT_FAILURE_THRESHOLD = 3;
    DEFAULT_KNOWN_FRESH_WINDOW_MS = 3e4;
    IpfsCache = class {
      ipnsRecords = /* @__PURE__ */ new Map();
      content = /* @__PURE__ */ new Map();
      gatewayFailures = /* @__PURE__ */ new Map();
      knownFreshTimestamps = /* @__PURE__ */ new Map();
      ipnsTtlMs;
      failureCooldownMs;
      failureThreshold;
      knownFreshWindowMs;
      constructor(config) {
        this.ipnsTtlMs = config?.ipnsTtlMs ?? DEFAULT_IPNS_TTL_MS;
        this.failureCooldownMs = config?.failureCooldownMs ?? DEFAULT_FAILURE_COOLDOWN_MS;
        this.failureThreshold = config?.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
        this.knownFreshWindowMs = config?.knownFreshWindowMs ?? DEFAULT_KNOWN_FRESH_WINDOW_MS;
      }
      // ---------------------------------------------------------------------------
      // IPNS Record Cache (60s TTL)
      // ---------------------------------------------------------------------------
      getIpnsRecord(ipnsName) {
        const entry = this.ipnsRecords.get(ipnsName);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > this.ipnsTtlMs) {
          this.ipnsRecords.delete(ipnsName);
          return null;
        }
        return entry.data;
      }
      /**
       * Get cached IPNS record ignoring TTL (for known-fresh optimization).
       */
      getIpnsRecordIgnoreTtl(ipnsName) {
        const entry = this.ipnsRecords.get(ipnsName);
        return entry?.data ?? null;
      }
      setIpnsRecord(ipnsName, result) {
        this.ipnsRecords.set(ipnsName, {
          data: result,
          timestamp: Date.now()
        });
      }
      invalidateIpns(ipnsName) {
        this.ipnsRecords.delete(ipnsName);
      }
      // ---------------------------------------------------------------------------
      // Content Cache (infinite TTL - content is immutable by CID)
      // ---------------------------------------------------------------------------
      getContent(cid) {
        const entry = this.content.get(cid);
        return entry?.data ?? null;
      }
      setContent(cid, data) {
        this.content.set(cid, {
          data,
          timestamp: Date.now()
        });
      }
      // ---------------------------------------------------------------------------
      // Gateway Failure Tracking (Circuit Breaker)
      // ---------------------------------------------------------------------------
      /**
       * Record a gateway failure. After threshold consecutive failures,
       * the gateway enters cooldown and is considered unhealthy.
       */
      recordGatewayFailure(gateway) {
        const existing = this.gatewayFailures.get(gateway);
        this.gatewayFailures.set(gateway, {
          count: (existing?.count ?? 0) + 1,
          lastFailure: Date.now()
        });
      }
      /** Reset failure count for a gateway (on successful request) */
      recordGatewaySuccess(gateway) {
        this.gatewayFailures.delete(gateway);
      }
      /**
       * Check if a gateway is currently in circuit breaker cooldown.
       * A gateway is considered unhealthy if it has had >= threshold
       * consecutive failures and the cooldown period hasn't elapsed.
       */
      isGatewayInCooldown(gateway) {
        const failure = this.gatewayFailures.get(gateway);
        if (!failure) return false;
        if (failure.count < this.failureThreshold) return false;
        const elapsed = Date.now() - failure.lastFailure;
        if (elapsed >= this.failureCooldownMs) {
          this.gatewayFailures.delete(gateway);
          return false;
        }
        return true;
      }
      // ---------------------------------------------------------------------------
      // Known-Fresh Flag (FAST mode optimization)
      // ---------------------------------------------------------------------------
      /**
       * Mark IPNS cache as "known-fresh" (after local publish or push notification).
       * Within the fresh window, we can skip network resolution.
       */
      markIpnsFresh(ipnsName) {
        this.knownFreshTimestamps.set(ipnsName, Date.now());
      }
      /**
       * Check if the cache is known-fresh (within the fresh window).
       */
      isIpnsKnownFresh(ipnsName) {
        const timestamp = this.knownFreshTimestamps.get(ipnsName);
        if (!timestamp) return false;
        if (Date.now() - timestamp > this.knownFreshWindowMs) {
          this.knownFreshTimestamps.delete(ipnsName);
          return false;
        }
        return true;
      }
      // ---------------------------------------------------------------------------
      // Cache Management
      // ---------------------------------------------------------------------------
      clear() {
        this.ipnsRecords.clear();
        this.content.clear();
        this.gatewayFailures.clear();
        this.knownFreshTimestamps.clear();
      }
    };
  }
});

// impl/shared/ipfs/ipfs-error-types.ts
function classifyFetchError(error) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "TIMEOUT";
  }
  if (error instanceof TypeError) {
    return "NETWORK_ERROR";
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return "TIMEOUT";
  }
  return "NETWORK_ERROR";
}
function classifyHttpStatus(status, responseBody) {
  if (status === 404) {
    return "NOT_FOUND";
  }
  if (status === 500 && responseBody) {
    if (/routing:\s*not\s*found/i.test(responseBody)) {
      return "NOT_FOUND";
    }
  }
  if (status >= 500) {
    return "GATEWAY_ERROR";
  }
  if (status >= 400) {
    return "GATEWAY_ERROR";
  }
  return "GATEWAY_ERROR";
}
var IpfsError;
var init_ipfs_error_types = __esm({
  "impl/shared/ipfs/ipfs-error-types.ts"() {
    "use strict";
    IpfsError = class extends Error {
      category;
      gateway;
      cause;
      constructor(message, category, gateway, cause) {
        super(message);
        this.name = "IpfsError";
        this.category = category;
        this.gateway = gateway;
        this.cause = cause;
      }
      /** Whether this error should trigger the circuit breaker */
      get shouldTriggerCircuitBreaker() {
        return this.category !== "NOT_FOUND" && this.category !== "SEQUENCE_DOWNGRADE";
      }
    };
  }
});

// impl/shared/ipfs/ipns-record-manager.ts
async function loadIpnsModule() {
  if (!ipnsModule) {
    const mod2 = await import("ipns");
    ipnsModule = {
      createIPNSRecord: mod2.createIPNSRecord,
      marshalIPNSRecord: mod2.marshalIPNSRecord,
      unmarshalIPNSRecord: mod2.unmarshalIPNSRecord
    };
  }
  return ipnsModule;
}
async function loadIpnsValidator() {
  if (!ipnsValidatorModule) {
    const mod2 = await import("ipns/validator");
    ipnsValidatorModule = { validate: mod2.validate };
  }
  return ipnsValidatorModule;
}
async function loadPeerIdModule() {
  if (!peerIdModule) {
    const mod2 = await import("@libp2p/peer-id");
    peerIdModule = { peerIdFromString: mod2.peerIdFromString };
  }
  return peerIdModule;
}
async function parseRoutingApiResponse(responseText, ipnsName = null) {
  const { unmarshalIPNSRecord } = await loadIpnsModule();
  let publicKey = null;
  if (ipnsName !== null) {
    try {
      const { peerIdFromString } = await loadPeerIdModule();
      const peerId = peerIdFromString(ipnsName);
      const maybePubkey = peerId.publicKey;
      if (!maybePubkey) {
        return null;
      }
      publicKey = maybePubkey;
    } catch {
      return null;
    }
  }
  const { validate: validate2 } = publicKey !== null ? await loadIpnsValidator() : { validate: null };
  const lines = responseText.trim().split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.Extra) {
        const recordData = base64ToUint8Array(obj.Extra);
        if (publicKey !== null && validate2 !== null) {
          try {
            await validate2(publicKey, recordData);
          } catch {
            continue;
          }
        }
        const record = unmarshalIPNSRecord(recordData);
        const valueBytes = typeof record.value === "string" ? new TextEncoder().encode(record.value) : record.value;
        const valueStr = new TextDecoder().decode(valueBytes);
        const cidMatch = valueStr.match(/\/ipfs\/([a-zA-Z0-9]+)/);
        if (cidMatch) {
          return {
            cid: cidMatch[1],
            sequence: record.sequence,
            recordData
          };
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}
function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
var DEFAULT_LIFETIME_MS, ipnsModule, ipnsValidatorModule, peerIdModule;
var init_ipns_record_manager = __esm({
  "impl/shared/ipfs/ipns-record-manager.ts"() {
    "use strict";
    DEFAULT_LIFETIME_MS = 99 * 365 * 24 * 60 * 60 * 1e3;
    ipnsModule = null;
    ipnsValidatorModule = null;
    peerIdModule = null;
  }
});

// impl/shared/ipfs/ipfs-http-client.ts
var DEFAULT_CONNECTIVITY_TIMEOUT_MS, DEFAULT_FETCH_TIMEOUT_MS3, DEFAULT_RESOLVE_TIMEOUT_MS, DEFAULT_PUBLISH_TIMEOUT_MS, DEFAULT_GATEWAY_PATH_TIMEOUT_MS, DEFAULT_ROUTING_API_TIMEOUT_MS, IpfsHttpClient;
var init_ipfs_http_client = __esm({
  "impl/shared/ipfs/ipfs-http-client.ts"() {
    "use strict";
    init_logger();
    init_ipfs_error_types();
    init_ipns_record_manager();
    DEFAULT_CONNECTIVITY_TIMEOUT_MS = 5e3;
    DEFAULT_FETCH_TIMEOUT_MS3 = 15e3;
    DEFAULT_RESOLVE_TIMEOUT_MS = 1e4;
    DEFAULT_PUBLISH_TIMEOUT_MS = 3e4;
    DEFAULT_GATEWAY_PATH_TIMEOUT_MS = 3e3;
    DEFAULT_ROUTING_API_TIMEOUT_MS = 2e3;
    IpfsHttpClient = class {
      gateways;
      fetchTimeoutMs;
      resolveTimeoutMs;
      publishTimeoutMs;
      connectivityTimeoutMs;
      debug;
      cache;
      constructor(config, cache) {
        this.gateways = config.gateways;
        this.fetchTimeoutMs = config.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS3;
        this.resolveTimeoutMs = config.resolveTimeoutMs ?? DEFAULT_RESOLVE_TIMEOUT_MS;
        this.publishTimeoutMs = config.publishTimeoutMs ?? DEFAULT_PUBLISH_TIMEOUT_MS;
        this.connectivityTimeoutMs = config.connectivityTimeoutMs ?? DEFAULT_CONNECTIVITY_TIMEOUT_MS;
        this.debug = config.debug ?? false;
        this.cache = cache;
      }
      // ---------------------------------------------------------------------------
      // Public Accessors
      // ---------------------------------------------------------------------------
      /**
       * Get configured gateway URLs.
       */
      getGateways() {
        return [...this.gateways];
      }
      // ---------------------------------------------------------------------------
      // Gateway Health
      // ---------------------------------------------------------------------------
      /**
       * Test connectivity to a single gateway.
       */
      async testConnectivity(gateway) {
        const start = Date.now();
        try {
          const response = await this.fetchWithTimeout(
            `${gateway}/api/v0/version`,
            this.connectivityTimeoutMs,
            { method: "POST" }
          );
          if (!response.ok) {
            return { gateway, healthy: false, error: `HTTP ${response.status}` };
          }
          return {
            gateway,
            healthy: true,
            responseTimeMs: Date.now() - start
          };
        } catch (error) {
          return {
            gateway,
            healthy: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }
      /**
       * Find healthy gateways from the configured list.
       */
      async findHealthyGateways() {
        const results = await Promise.allSettled(
          this.gateways.map((gw) => this.testConnectivity(gw))
        );
        return results.filter((r) => r.status === "fulfilled" && r.value.healthy).map((r) => r.value.gateway);
      }
      /**
       * Get gateways that are not in circuit breaker cooldown.
       */
      getAvailableGateways() {
        return this.gateways.filter((gw) => !this.cache.isGatewayInCooldown(gw));
      }
      // ---------------------------------------------------------------------------
      // Content Upload
      // ---------------------------------------------------------------------------
      /**
       * Upload JSON content to IPFS.
       * Tries all gateways in parallel, returns first success.
       */
      async upload(data, gateways) {
        const targets = gateways ?? this.getAvailableGateways();
        if (targets.length === 0) {
          throw new IpfsError("No gateways available for upload", "NETWORK_ERROR");
        }
        const jsonBytes = new TextEncoder().encode(JSON.stringify(data));
        const promises = targets.map(async (gateway) => {
          try {
            const formData = new FormData();
            formData.append("file", new Blob([jsonBytes], { type: "application/json" }), "data.json");
            const response = await this.fetchWithTimeout(
              `${gateway}/api/v0/add?pin=true&cid-version=1`,
              this.publishTimeoutMs,
              { method: "POST", body: formData }
            );
            if (!response.ok) {
              throw new IpfsError(
                `Upload failed: HTTP ${response.status}`,
                classifyHttpStatus(response.status),
                gateway
              );
            }
            const result = await response.json();
            this.cache.recordGatewaySuccess(gateway);
            this.log(`Uploaded to ${gateway}: CID=${result.Hash}`);
            return { cid: result.Hash, gateway };
          } catch (error) {
            if (error instanceof IpfsError && error.shouldTriggerCircuitBreaker) {
              this.cache.recordGatewayFailure(gateway);
            }
            throw error;
          }
        });
        try {
          const result = await Promise.any(promises);
          return { cid: result.cid };
        } catch (error) {
          if (error instanceof AggregateError) {
            throw new IpfsError(
              `Upload failed on all gateways: ${error.errors.map((e) => e.message).join("; ")}`,
              "NETWORK_ERROR"
            );
          }
          throw error;
        }
      }
      // ---------------------------------------------------------------------------
      // Content Fetch
      // ---------------------------------------------------------------------------
      /**
       * Fetch content by CID from IPFS gateways.
       * Checks content cache first. Races all gateways for fastest response.
       */
      async fetchContent(cid, gateways) {
        const cached = this.cache.getContent(cid);
        if (cached) {
          this.log(`Content cache hit for CID=${cid}`);
          return cached;
        }
        const targets = gateways ?? this.getAvailableGateways();
        if (targets.length === 0) {
          throw new IpfsError("No gateways available for fetch", "NETWORK_ERROR");
        }
        const promises = targets.map(async (gateway) => {
          try {
            const response = await this.fetchWithTimeout(
              `${gateway}/ipfs/${cid}`,
              this.fetchTimeoutMs,
              { headers: { Accept: "application/octet-stream" } }
            );
            if (!response.ok) {
              const body = await response.text().catch((err) => {
                logger.debug("IPFS-HTTP", "Failed to read error response body", err);
                return "";
              });
              throw new IpfsError(
                `Fetch failed: HTTP ${response.status}`,
                classifyHttpStatus(response.status, body),
                gateway
              );
            }
            const data = await response.json();
            this.cache.recordGatewaySuccess(gateway);
            this.cache.setContent(cid, data);
            this.log(`Fetched from ${gateway}: CID=${cid}`);
            return data;
          } catch (error) {
            if (error instanceof IpfsError && error.shouldTriggerCircuitBreaker) {
              this.cache.recordGatewayFailure(gateway);
            }
            throw error;
          }
        });
        try {
          return await Promise.any(promises);
        } catch (error) {
          if (error instanceof AggregateError) {
            throw new IpfsError(
              `Fetch failed on all gateways for CID=${cid}`,
              "NETWORK_ERROR"
            );
          }
          throw error;
        }
      }
      // ---------------------------------------------------------------------------
      // IPNS Resolution
      // ---------------------------------------------------------------------------
      /**
       * Resolve IPNS via Routing API (returns record with sequence number).
       * POST /api/v0/routing/get?arg=/ipns/{name}
       */
      async resolveIpnsViaRoutingApi(gateway, ipnsName, timeoutMs = DEFAULT_ROUTING_API_TIMEOUT_MS) {
        try {
          const response = await this.fetchWithTimeout(
            `${gateway}/api/v0/routing/get?arg=/ipns/${ipnsName}`,
            timeoutMs,
            { method: "POST" }
          );
          if (!response.ok) {
            const body = await response.text().catch((err) => {
              logger.debug("IPFS-HTTP", "Failed to read error response body", err);
              return "";
            });
            const category = classifyHttpStatus(response.status, body);
            if (category === "NOT_FOUND") return null;
            throw new IpfsError(`Routing API: HTTP ${response.status}`, category, gateway);
          }
          const text = await response.text();
          const parsed = await parseRoutingApiResponse(text, ipnsName);
          if (!parsed) return null;
          this.cache.recordGatewaySuccess(gateway);
          return {
            cid: parsed.cid,
            sequence: parsed.sequence,
            gateway,
            recordData: parsed.recordData
          };
        } catch (error) {
          if (error instanceof IpfsError) throw error;
          const category = classifyFetchError(error);
          if (category !== "NOT_FOUND") {
            this.cache.recordGatewayFailure(gateway);
          }
          return null;
        }
      }
      /**
       * Resolve IPNS via gateway path (simpler, no sequence number).
       * GET /ipns/{name}?format=dag-json
       */
      async resolveIpnsViaGatewayPath(gateway, ipnsName, timeoutMs = DEFAULT_GATEWAY_PATH_TIMEOUT_MS) {
        try {
          const response = await this.fetchWithTimeout(
            `${gateway}/ipns/${ipnsName}`,
            timeoutMs,
            { headers: { Accept: "application/json" } }
          );
          if (!response.ok) return null;
          const content = await response.json();
          const cidHeader = response.headers.get("X-Ipfs-Path");
          if (cidHeader) {
            const match = cidHeader.match(/\/ipfs\/([a-zA-Z0-9]+)/);
            if (match) {
              this.cache.recordGatewaySuccess(gateway);
              return { cid: match[1], content };
            }
          }
          return { cid: "", content };
        } catch (err) {
          logger.debug("IPFS-HTTP", "IPNS gateway resolution failed", err);
          return null;
        }
      }
      /**
       * Progressive IPNS resolution across all gateways.
       * Queries all gateways in parallel, returns highest sequence number.
       */
      async resolveIpns(ipnsName, gateways) {
        const targets = gateways ?? this.getAvailableGateways();
        if (targets.length === 0) {
          return { best: null, allResults: [], respondedCount: 0, totalGateways: 0 };
        }
        const results = [];
        let respondedCount = 0;
        const promises = targets.map(async (gateway) => {
          const result = await this.resolveIpnsViaRoutingApi(
            gateway,
            ipnsName,
            this.resolveTimeoutMs
          );
          if (result) results.push(result);
          respondedCount++;
          return result;
        });
        let racerTimer;
        try {
          await Promise.race([
            Promise.allSettled(promises),
            new Promise((resolve) => {
              racerTimer = setTimeout(resolve, this.resolveTimeoutMs + 1e3);
              if (typeof racerTimer === "object" && racerTimer !== null && "unref" in racerTimer) {
                racerTimer.unref();
              }
            })
          ]);
        } finally {
          if (racerTimer !== void 0) clearTimeout(racerTimer);
        }
        let best = null;
        for (const result of results) {
          if (!best || result.sequence > best.sequence) {
            best = result;
          }
        }
        if (best) {
          this.cache.setIpnsRecord(ipnsName, best);
        }
        return {
          best,
          allResults: results,
          respondedCount,
          totalGateways: targets.length
        };
      }
      // ---------------------------------------------------------------------------
      // IPNS Publishing
      // ---------------------------------------------------------------------------
      /**
       * Publish IPNS record to a single gateway via routing API.
       */
      async publishIpnsViaRoutingApi(gateway, ipnsName, marshalledRecord, timeoutMs = DEFAULT_PUBLISH_TIMEOUT_MS) {
        try {
          const formData = new FormData();
          formData.append(
            "file",
            new Blob([new Uint8Array(marshalledRecord)]),
            "record"
          );
          const response = await this.fetchWithTimeout(
            `${gateway}/api/v0/routing/put?arg=/ipns/${ipnsName}&allow-offline=true`,
            timeoutMs,
            { method: "POST", body: formData }
          );
          if (!response.ok) {
            const errorText = await response.text().catch((err) => {
              logger.debug("IPFS-HTTP", "Failed to read error response body", err);
              return "";
            });
            throw new IpfsError(
              `IPNS publish: HTTP ${response.status}: ${errorText.slice(0, 100)}`,
              classifyHttpStatus(response.status, errorText),
              gateway
            );
          }
          this.cache.recordGatewaySuccess(gateway);
          this.log(`IPNS published to ${gateway}: ${ipnsName}`);
          return true;
        } catch (error) {
          if (error instanceof IpfsError && error.shouldTriggerCircuitBreaker) {
            this.cache.recordGatewayFailure(gateway);
          }
          this.log(`IPNS publish to ${gateway} failed: ${error}`);
          return false;
        }
      }
      /**
       * Publish IPNS record to all gateways in parallel.
       */
      async publishIpns(ipnsName, marshalledRecord, gateways) {
        const targets = gateways ?? this.getAvailableGateways();
        if (targets.length === 0) {
          return { success: false, error: "No gateways available" };
        }
        const results = await Promise.allSettled(
          targets.map((gw) => this.publishIpnsViaRoutingApi(gw, ipnsName, marshalledRecord, this.publishTimeoutMs))
        );
        const successfulGateways = [];
        results.forEach((result, index) => {
          if (result.status === "fulfilled" && result.value) {
            successfulGateways.push(targets[index]);
          }
        });
        return {
          success: successfulGateways.length > 0,
          ipnsName,
          successfulGateways,
          error: successfulGateways.length === 0 ? "All gateways failed" : void 0
        };
      }
      // ---------------------------------------------------------------------------
      // IPNS Verification
      // ---------------------------------------------------------------------------
      /**
       * Verify IPNS record persistence after publishing.
       * Retries resolution to confirm the record was accepted.
       */
      async verifyIpnsRecord(ipnsName, expectedSeq, expectedCid, retries = 3, delayMs = 1e3) {
        for (let i = 0; i < retries; i++) {
          if (i > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
          const { best } = await this.resolveIpns(ipnsName);
          if (best && best.sequence >= expectedSeq && best.cid === expectedCid) {
            return true;
          }
        }
        return false;
      }
      // ---------------------------------------------------------------------------
      // Helpers
      // ---------------------------------------------------------------------------
      async fetchWithTimeout(url, timeoutMs, options) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          return await fetch(url, {
            ...options,
            signal: controller.signal
          });
        } finally {
          clearTimeout(timer);
        }
      }
      log(message) {
        logger.debug("IPFS-HTTP", message);
      }
    };
  }
});

// node_modules/@ipld/dag-pb/src/pb-decode.js
function decodeVarint(bytes, offset) {
  let v = 0;
  for (let shift = 0; ; shift += 7) {
    if (shift >= 64) {
      throw new Error("protobuf: varint overflow");
    }
    if (offset >= bytes.length) {
      throw new Error("protobuf: unexpected end of data");
    }
    const b = bytes[offset++];
    v += shift < 28 ? (b & 127) << shift : (b & 127) * 2 ** shift;
    if (b < 128) {
      break;
    }
  }
  return [v, offset];
}
function decodeBytes(bytes, offset) {
  let byteLen;
  [byteLen, offset] = decodeVarint(bytes, offset);
  const postOffset = offset + byteLen;
  if (byteLen < 0 || postOffset < 0) {
    throw new Error("protobuf: invalid length");
  }
  if (postOffset > bytes.length) {
    throw new Error("protobuf: unexpected end of data");
  }
  return [bytes.subarray(offset, postOffset), postOffset];
}
function decodeKey(bytes, index) {
  let wire;
  [wire, index] = decodeVarint(bytes, index);
  return [wire & 7, wire >> 3, index];
}
function decodeLink(bytes) {
  const link = {};
  const l = bytes.length;
  let index = 0;
  while (index < l) {
    let wireType, fieldNum;
    [wireType, fieldNum, index] = decodeKey(bytes, index);
    if (fieldNum === 1) {
      if (link.Hash) {
        throw new Error("protobuf: (PBLink) duplicate Hash section");
      }
      if (wireType !== 2) {
        throw new Error(`protobuf: (PBLink) wrong wireType (${wireType}) for Hash`);
      }
      if (link.Name !== void 0) {
        throw new Error("protobuf: (PBLink) invalid order, found Name before Hash");
      }
      if (link.Tsize !== void 0) {
        throw new Error("protobuf: (PBLink) invalid order, found Tsize before Hash");
      }
      [link.Hash, index] = decodeBytes(bytes, index);
    } else if (fieldNum === 2) {
      if (link.Name !== void 0) {
        throw new Error("protobuf: (PBLink) duplicate Name section");
      }
      if (wireType !== 2) {
        throw new Error(`protobuf: (PBLink) wrong wireType (${wireType}) for Name`);
      }
      if (link.Tsize !== void 0) {
        throw new Error("protobuf: (PBLink) invalid order, found Tsize before Name");
      }
      let byts;
      [byts, index] = decodeBytes(bytes, index);
      link.Name = textDecoder.decode(byts);
    } else if (fieldNum === 3) {
      if (link.Tsize !== void 0) {
        throw new Error("protobuf: (PBLink) duplicate Tsize section");
      }
      if (wireType !== 0) {
        throw new Error(`protobuf: (PBLink) wrong wireType (${wireType}) for Tsize`);
      }
      [link.Tsize, index] = decodeVarint(bytes, index);
    } else {
      throw new Error(`protobuf: (PBLink) invalid fieldNumber, expected 1, 2 or 3, got ${fieldNum}`);
    }
  }
  if (index > l) {
    throw new Error("protobuf: (PBLink) unexpected end of data");
  }
  return link;
}
function decodeNode(bytes) {
  const l = bytes.length;
  let index = 0;
  let links = void 0;
  let linksBeforeData = false;
  let data = void 0;
  while (index < l) {
    let wireType, fieldNum;
    [wireType, fieldNum, index] = decodeKey(bytes, index);
    if (wireType !== 2) {
      throw new Error(`protobuf: (PBNode) invalid wireType, expected 2, got ${wireType}`);
    }
    if (fieldNum === 1) {
      if (data) {
        throw new Error("protobuf: (PBNode) duplicate Data section");
      }
      [data, index] = decodeBytes(bytes, index);
      if (links) {
        linksBeforeData = true;
      }
    } else if (fieldNum === 2) {
      if (linksBeforeData) {
        throw new Error("protobuf: (PBNode) duplicate Links section");
      } else if (!links) {
        links = [];
      }
      let byts;
      [byts, index] = decodeBytes(bytes, index);
      links.push(decodeLink(byts));
    } else {
      throw new Error(`protobuf: (PBNode) invalid fieldNumber, expected 1 or 2, got ${fieldNum}`);
    }
  }
  if (index > l) {
    throw new Error("protobuf: (PBNode) unexpected end of data");
  }
  const node = {};
  if (data) {
    node.Data = data;
  }
  node.Links = links || [];
  return node;
}
var textDecoder;
var init_pb_decode = __esm({
  "node_modules/@ipld/dag-pb/src/pb-decode.js"() {
    "use strict";
    textDecoder = new TextDecoder();
  }
});

// node_modules/@ipld/dag-pb/src/pb-encode.js
var textEncoder, maxInt32, maxUInt32;
var init_pb_encode = __esm({
  "node_modules/@ipld/dag-pb/src/pb-encode.js"() {
    "use strict";
    textEncoder = new TextEncoder();
    maxInt32 = 2 ** 32;
    maxUInt32 = 2 ** 31;
  }
});

// node_modules/@ipld/dag-pb/src/util.js
import { CID as CID5 } from "multiformats/cid";
function toByteView(buf) {
  if (buf instanceof ArrayBuffer) {
    return new Uint8Array(buf, 0, buf.byteLength);
  }
  return buf;
}
var textEncoder2;
var init_util = __esm({
  "node_modules/@ipld/dag-pb/src/util.js"() {
    "use strict";
    textEncoder2 = new TextEncoder();
  }
});

// node_modules/@ipld/dag-pb/src/index.js
import { CID as CID6 } from "multiformats/cid";
function decode2(bytes) {
  const buf = toByteView(bytes);
  const pbn = decodeNode(buf);
  const node = {};
  if (pbn.Data) {
    node.Data = pbn.Data;
  }
  if (pbn.Links) {
    node.Links = pbn.Links.map((l) => {
      const link = {};
      try {
        link.Hash = CID6.decode(l.Hash);
      } catch {
      }
      if (!link.Hash) {
        throw new Error("Invalid Hash field found in link, expected CID");
      }
      if (l.Name !== void 0) {
        link.Name = l.Name;
      }
      if (l.Tsize !== void 0) {
        link.Tsize = l.Tsize;
      }
      return link;
    });
  }
  return node;
}
var init_src = __esm({
  "node_modules/@ipld/dag-pb/src/index.js"() {
    "use strict";
    init_pb_decode();
    init_pb_encode();
    init_util();
  }
});

// profile/migration/unixfs-verify.ts
import { CarReader as CarReader4 } from "@ipld/car";
function readVarint(buf, offset) {
  let result = 0n;
  let shift = 0n;
  let i = offset;
  while (i < buf.length) {
    if (i - offset >= 10) {
      throw new Error("UnixFS varint overflow (>10 bytes)");
    }
    const b = buf[i] ?? 0;
    result |= BigInt(b & 127) << shift;
    i += 1;
    if ((b & 128) === 0) {
      return [result, i];
    }
    shift += 7n;
  }
  throw new Error("UnixFS varint truncated");
}
function decodeUnixFsData(buf) {
  let type;
  let data;
  let filesize;
  const blocksizes = [];
  let i = 0;
  while (i < buf.length) {
    const [tagBig, after] = readVarint(buf, i);
    i = after;
    const tag = Number(tagBig);
    if (!Number.isSafeInteger(tag) || tag < 0) {
      throw new Error("UnixFS: unsafe protobuf tag value");
    }
    const fieldNum = tag >>> 3;
    const wireType = tag & 7;
    if (fieldNum === 1 && wireType === 0) {
      const [v, next] = readVarint(buf, i);
      i = next;
      if (v > 0xffffn) {
        throw new Error(`UnixFS: Type field value ${v} out of range`);
      }
      type = Number(v);
    } else if (fieldNum === 2 && wireType === 2) {
      const [lenBig, next] = readVarint(buf, i);
      const len = Number(lenBig);
      if (!Number.isSafeInteger(len) || len < 0 || next + len > buf.length) {
        throw new Error("UnixFS: malformed Data field length");
      }
      data = buf.slice(next, next + len);
      i = next + len;
    } else if (fieldNum === 3 && wireType === 0) {
      const [v, next] = readVarint(buf, i);
      i = next;
      filesize = v;
    } else if (fieldNum === 4 && wireType === 0) {
      const [v, next] = readVarint(buf, i);
      i = next;
      blocksizes.push(v);
    } else if (wireType === 0) {
      const [, next] = readVarint(buf, i);
      i = next;
    } else if (wireType === 2) {
      const [lenBig, next] = readVarint(buf, i);
      const len = Number(lenBig);
      if (!Number.isSafeInteger(len) || len < 0 || next + len > buf.length) {
        throw new Error("UnixFS: malformed unknown-field length");
      }
      i = next + len;
    } else if (wireType === 1) {
      i += 8;
      if (i > buf.length) throw new Error("UnixFS: truncated fixed64");
    } else if (wireType === 5) {
      i += 4;
      if (i > buf.length) throw new Error("UnixFS: truncated fixed32");
    } else {
      throw new Error(`UnixFS: unsupported wire type ${wireType}`);
    }
  }
  if (type === void 0) {
    throw new Error("UnixFS: missing required Type field");
  }
  return { type, data, filesize, blocksizes };
}
function bytesEqual2(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
function verifyBlock(cid, bytes) {
  const mh = cid.multihash;
  if (mh.code !== MULTIHASH_SHA2562) {
    throw new Error(
      `unixfs-verify: unsupported multihash ${mh.code} on block ${cid.toString()}; only SHA-256 supported`
    );
  }
  const computed = sha256(bytes);
  if (!bytesEqual2(computed, mh.digest)) {
    throw new Error(
      `unixfs-verify: block ${cid.toString()} bytes do not hash to declared digest`
    );
  }
}
function canonicalCidKey(cid) {
  return cid.toV1().toString();
}
function walkFile(rootCid, blocks, depth, outBuf, outBytesSoFar, pathVisited, visitCounter) {
  visitCounter.count += 1;
  if (visitCounter.count > MAX_TOTAL_NODE_VISITS) {
    throw new Error(
      `unixfs-verify: total visits exceeded ${MAX_TOTAL_NODE_VISITS}; refusing CPU-amplification DAG`
    );
  }
  if (depth > MAX_RECURSION_DEPTH) {
    throw new Error(`unixfs-verify: recursion depth exceeded ${MAX_RECURSION_DEPTH}`);
  }
  const cidKey = canonicalCidKey(rootCid);
  const blockBytes = blocks.get(cidKey);
  if (!blockBytes) {
    throw new Error(`unixfs-verify: block ${rootCid.toString()} missing from CAR`);
  }
  if (pathVisited.has(cidKey)) {
    throw new Error(
      `unixfs-verify: cycle detected at block ${rootCid.toString()}`
    );
  }
  pathVisited.add(cidKey);
  try {
    walkFileInner(rootCid, blocks, depth, outBuf, outBytesSoFar, pathVisited, blockBytes, visitCounter);
  } finally {
    pathVisited.delete(cidKey);
  }
}
function walkFileInner(rootCid, blocks, depth, outBuf, outBytesSoFar, pathVisited, blockBytes, visitCounter) {
  if (rootCid.code === CODEC_RAW2) {
    outBytesSoFar.total += blockBytes.length;
    if (outBytesSoFar.total > MAX_TOTAL_OUTPUT_BYTES) {
      throw new Error(
        `unixfs-verify: reconstructed file exceeds ${MAX_TOTAL_OUTPUT_BYTES} bytes`
      );
    }
    outBuf.push(blockBytes);
    return;
  }
  if (rootCid.code !== CODEC_DAGPB) {
    throw new Error(
      `unixfs-verify: unsupported codec ${rootCid.code} at CID ${rootCid.toString()}`
    );
  }
  const node = decode2(blockBytes);
  if (!node.Data) {
    throw new Error(`unixfs-verify: dag-pb block ${rootCid.toString()} missing Data field`);
  }
  const fs2 = decodeUnixFsData(node.Data);
  if (fs2.type !== UNIXFS_TYPE_FILE && fs2.type !== UNIXFS_TYPE_RAW) {
    throw new Error(
      `unixfs-verify: only File / Raw types supported (got Type=${fs2.type})`
    );
  }
  if (node.Links.length === 0) {
    const leaf = fs2.data ?? new Uint8Array(0);
    outBytesSoFar.total += leaf.length;
    if (outBytesSoFar.total > MAX_TOTAL_OUTPUT_BYTES) {
      throw new Error(
        `unixfs-verify: reconstructed file exceeds ${MAX_TOTAL_OUTPUT_BYTES} bytes`
      );
    }
    outBuf.push(leaf);
    return;
  }
  if (fs2.blocksizes.length !== node.Links.length) {
    throw new Error(
      `unixfs-verify: blocksizes length (${fs2.blocksizes.length}) disagrees with PBNode.Links length (${node.Links.length}) at ${rootCid.toString()}`
    );
  }
  if (node.Links.length > MAX_LINKS_PER_NODE) {
    throw new Error(
      `unixfs-verify: block ${rootCid.toString()} has ${node.Links.length} links (cap ${MAX_LINKS_PER_NODE}); refusing to walk fanout-bomb`
    );
  }
  for (const link of node.Links) {
    if (!link.Hash) {
      throw new Error(
        `unixfs-verify: link without Hash in block ${rootCid.toString()}`
      );
    }
    walkFile(link.Hash, blocks, depth + 1, outBuf, outBytesSoFar, pathVisited, visitCounter);
  }
}
async function verifyCarAndExtractFile(carBytes, expectedCid) {
  const reader = await CarReader4.fromBytes(carBytes);
  const roots = await reader.getRoots();
  const root0 = roots[0];
  if (!root0) {
    throw new Error("unixfs-verify: CAR has no roots");
  }
  const expectedRoot = root0;
  if (!expectedRoot.equals(expectedCid)) {
    throw new Error(
      `unixfs-verify: CAR root ${String(expectedRoot)} != expected ${String(expectedCid)}`
    );
  }
  const blocks = /* @__PURE__ */ new Map();
  let totalBlockBytes = 0;
  const MAX_CAR_BYTES2 = 128 * 1024 * 1024;
  for await (const block of reader.blocks()) {
    verifyBlock(block.cid, block.bytes);
    totalBlockBytes += block.bytes.length;
    if (totalBlockBytes > MAX_CAR_BYTES2) {
      throw new Error(
        `unixfs-verify: CAR total blocks exceed ${MAX_CAR_BYTES2} bytes`
      );
    }
    blocks.set(canonicalCidKey(block.cid), block.bytes);
  }
  const out = [];
  const tracker = { total: 0 };
  const visitCounter = { count: 0 };
  walkFile(expectedCid, blocks, 0, out, tracker, /* @__PURE__ */ new Set(), visitCounter);
  const result = new Uint8Array(tracker.total);
  let offset = 0;
  for (const chunk of out) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
var UNIXFS_TYPE_RAW, UNIXFS_TYPE_FILE, CODEC_RAW2, CODEC_DAGPB, MULTIHASH_SHA2562, MAX_RECURSION_DEPTH, MAX_TOTAL_OUTPUT_BYTES, MAX_LINKS_PER_NODE, MAX_TOTAL_NODE_VISITS;
var init_unixfs_verify = __esm({
  "profile/migration/unixfs-verify.ts"() {
    "use strict";
    init_src();
    init_sha2();
    UNIXFS_TYPE_RAW = 0;
    UNIXFS_TYPE_FILE = 2;
    CODEC_RAW2 = 85;
    CODEC_DAGPB = 112;
    MULTIHASH_SHA2562 = 18;
    MAX_RECURSION_DEPTH = 16;
    MAX_TOTAL_OUTPUT_BYTES = 64 * 1024 * 1024;
    MAX_LINKS_PER_NODE = 4096;
    MAX_TOTAL_NODE_VISITS = 1e5;
  }
});

// profile/migration/ipns-reader.ts
var ipns_reader_exports = {};
__export(ipns_reader_exports, {
  LEGACY_IPNS_SEQUENCE_KEY: () => LEGACY_IPNS_SEQUENCE_KEY,
  MIGRATION_DONE_KEY: () => MIGRATION_DONE_KEY,
  PROFILE_IPNS_HKDF_INFO: () => PROFILE_IPNS_HKDF_INFO,
  deriveProfileIpnsIdentity: () => deriveProfileIpnsIdentity,
  needsMigration: () => needsMigration,
  resolveProfileSnapshot: () => resolveProfileSnapshot,
  runIpnsToPointerMigration: () => runIpnsToPointerMigration
});
import { CID as CID7 } from "multiformats/cid";
async function loadLibp2pModules() {
  if (!libp2pModules) {
    const [crypto, peerIdMod] = await Promise.all([
      import("@libp2p/crypto/keys"),
      import("@libp2p/peer-id")
    ]);
    libp2pModules = {
      generateKeyPairFromSeed: crypto.generateKeyPairFromSeed,
      peerIdFromPrivateKey: peerIdMod.peerIdFromPrivateKey
    };
  }
  return libp2pModules;
}
async function deriveProfileIpnsIdentity(privateKeyHex) {
  const { generateKeyPairFromSeed, peerIdFromPrivateKey } = await loadLibp2pModules();
  const walletSecret = hexToBytes5(privateKeyHex);
  const derivedSeed = hkdf(
    sha256,
    walletSecret,
    void 0,
    new TextEncoder().encode(PROFILE_IPNS_HKDF_INFO),
    32
  );
  const keyPair = await generateKeyPairFromSeed("Ed25519", derivedSeed);
  const peerId = peerIdFromPrivateKey(keyPair);
  return { keyPair, ipnsName: peerId.toString() };
}
function deserializeSnapshot(bytes) {
  const text = new TextDecoder().decode(bytes);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new ProfileError(
      "BUNDLE_NOT_FOUND",
      `Failed to parse legacy Profile IPNS snapshot: ${err instanceof Error ? err.message : String(err)}`,
      err
    );
  }
  if (!parsed || typeof parsed !== "object" || parsed.version !== SNAPSHOT_VERSION || !Array.isArray(parsed.bundles)) {
    throw new ProfileError(
      "BUNDLE_NOT_FOUND",
      `Legacy Profile IPNS snapshot has unexpected shape`
    );
  }
  return parsed;
}
async function fetchFileFromIpfs(gateways, cid, timeoutMs, maxSizeBytes = 1 * 1024 * 1024) {
  let lastError = null;
  let parsedCid;
  try {
    parsedCid = CID7.parse(cid);
  } catch (err) {
    throw new ProfileError(
      "BUNDLE_NOT_FOUND",
      `Legacy snapshot CID is not parseable: ${cid}`,
      err
    );
  }
  const isRawCodec = parsedCid.code === 85;
  for (const gateway of gateways) {
    try {
      const carBytes = await tryFetchCarFromGateway(
        gateway,
        cid,
        timeoutMs,
        maxSizeBytes
      );
      if (carBytes) {
        try {
          const reconstructed = await verifyCarAndExtractFile(carBytes, parsedCid);
          if (reconstructed.length > maxSizeBytes) {
            lastError = new Error(
              `Reconstructed file ${reconstructed.length} bytes exceeds cap ${maxSizeBytes} from ${gateway}`
            );
            continue;
          }
          return reconstructed;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          continue;
        }
      }
      if (!isRawCodec) {
        lastError = new Error(
          `Gateway ${gateway} did not return a CAR for dag-pb CID ${cid}; refusing legacy unverified fallback (Wave I.2 \u2014 would defeat content-address verification)`
        );
        continue;
      }
      const url = `${gateway.replace(/\/$/, "")}/ipfs/${cid}`;
      const response = await fetch(url, {
        headers: { Accept: "application/octet-stream" },
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} from ${gateway}`);
        continue;
      }
      const declaredLen = Number(response.headers.get("content-length") ?? "");
      if (Number.isFinite(declaredLen) && declaredLen > maxSizeBytes) {
        lastError = new Error(
          `Content-Length ${declaredLen} exceeds cap ${maxSizeBytes} from ${gateway}`
        );
        continue;
      }
      const bytes = await readStreamWithLimitLocal(response, maxSizeBytes, gateway);
      if (bytes === null) {
        lastError = new Error(
          `Stream exceeded ${maxSizeBytes}-byte cap (or body unavailable) from ${gateway}`
        );
        continue;
      }
      const computed = sha256(bytes);
      const expected = parsedCid.multihash.digest;
      if (computed.length !== expected.length) {
        lastError = new Error(`CID digest length mismatch from ${gateway}`);
        continue;
      }
      let match = true;
      for (let i = 0; i < computed.length; i++) {
        if (computed[i] !== expected[i]) {
          match = false;
          break;
        }
      }
      if (!match) {
        lastError = new Error(
          `Content-address verify FAILED from ${gateway}: sha256(bytes) does not match CID digest`
        );
        continue;
      }
      return bytes;
    } catch (err) {
      if (err instanceof ProfileError) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw new ProfileError(
    "BUNDLE_NOT_FOUND",
    `Legacy snapshot fetch failed on all gateways: ${lastError?.message ?? "unknown"}`,
    lastError
  );
}
async function readStreamWithLimitLocal(response, maxBytes, gateway) {
  const reader = response.body?.getReader();
  if (!reader) {
    void gateway;
    return null;
  }
  const chunks = [];
  let total = 0;
  try {
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        try {
          await reader.cancel();
        } catch {
        }
        return null;
      }
      chunks.push(value);
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}
async function tryFetchCarFromGateway(gateway, cid, timeoutMs, maxSizeBytes) {
  try {
    const url = `${gateway.replace(/\/$/, "")}/ipfs/${cid}?format=car`;
    const response = await fetch(url, {
      headers: { Accept: "application/vnd.ipld.car" },
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!response.ok) return null;
    const ct = response.headers.get("content-type") ?? "";
    if (ct && (ct.startsWith("text/") || ct.startsWith("application/json"))) {
      return null;
    }
    const carCapBytes = maxSizeBytes * 2;
    const declaredLen = Number(response.headers.get("content-length") ?? "");
    if (Number.isFinite(declaredLen) && declaredLen > carCapBytes) return null;
    const carBytes = await readStreamWithLimitLocal(response, carCapBytes, gateway);
    return carBytes;
  } catch {
    return null;
  }
}
async function resolveProfileSnapshot(params) {
  const { ipnsName } = await deriveProfileIpnsIdentity(params.privateKeyHex);
  const cache = new IpfsCache();
  const http = new IpfsHttpClient(
    {
      gateways: params.gateways,
      resolveTimeoutMs: params.resolveTimeoutMs ?? 2e4,
      fetchTimeoutMs: params.fetchTimeoutMs ?? 3e4
    },
    cache
  );
  const { best } = await http.resolveIpns(ipnsName);
  if (!best) return null;
  const bytes = await fetchFileFromIpfs(
    params.gateways,
    best.cid,
    params.fetchTimeoutMs ?? 3e4
  );
  const snapshot = deserializeSnapshot(bytes);
  return { snapshot, cid: best.cid, sequence: best.sequence };
}
async function needsMigration(localCache) {
  const sequence = await localCache.get(LEGACY_IPNS_SEQUENCE_KEY);
  if (sequence === null) return false;
  const migrationDone = await localCache.get(MIGRATION_DONE_KEY);
  return migrationDone === null;
}
async function runIpnsToPointerMigration(params) {
  const log = params.log ?? ((msg) => logger.debug("IpnsMigration", msg));
  if (!await needsMigration(params.localCache)) {
    const migrationDone = await params.localCache.get(MIGRATION_DONE_KEY);
    return {
      migrated: false,
      bundlesImported: 0,
      skipped: migrationDone !== null ? "already-done" : "not-legacy"
    };
  }
  const resolver = params.resolver ?? resolveProfileSnapshot;
  let resolved;
  try {
    resolved = await resolver({
      gateways: params.gateways,
      privateKeyHex: params.privateKeyHex
    });
  } catch (err) {
    log(
      `legacy IPNS resolve failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return { migrated: false, bundlesImported: 0 };
  }
  if (!resolved) {
    log("legacy IPNS resolve returned null \u2014 retrying on next load");
    return { migrated: false, bundlesImported: 0, skipped: "no-record" };
  }
  log(
    `legacy snapshot resolved: cid=${resolved.cid} seq=${resolved.sequence} bundles=${resolved.snapshot.bundles.length}`
  );
  let imported = 0;
  let skippedMalformed = 0;
  for (const b of resolved.snapshot.bundles) {
    if (b.status !== "active") continue;
    if (typeof b.cid !== "string" || b.cid.length === 0) {
      skippedMalformed++;
      log(`migration: dropping bundle with empty/non-string cid`);
      continue;
    }
    try {
      CID7.parse(b.cid);
    } catch {
      skippedMalformed++;
      log(`migration: dropping bundle with malformed cid=${b.cid.slice(0, 40)}\u2026`);
      continue;
    }
    try {
      await params.onBundle(b.cid, {
        cid: b.cid,
        status: "active",
        createdAt: b.createdAt
        // tokenCount unknown — refreshed on next flush.
      });
      imported++;
    } catch (err) {
      log(
        `migration: addBundle(${b.cid}) failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  await params.localCache.set(MIGRATION_DONE_KEY, String(Date.now()));
  log(
    `migration complete: ${imported}/${resolved.snapshot.bundles.length} bundles imported` + (skippedMalformed > 0 ? ` (${skippedMalformed} malformed dropped)` : "")
  );
  return { migrated: true, bundlesImported: imported };
}
var PROFILE_IPNS_HKDF_INFO, LEGACY_IPNS_SEQUENCE_KEY, MIGRATION_DONE_KEY, SNAPSHOT_VERSION, libp2pModules;
var init_ipns_reader = __esm({
  "profile/migration/ipns-reader.ts"() {
    "use strict";
    init_hkdf();
    init_sha2();
    init_ipfs_cache();
    init_ipfs_http_client();
    init_crypto();
    init_errors();
    init_logger();
    init_unixfs_verify();
    PROFILE_IPNS_HKDF_INFO = "uxf-profile-ed25519-v1";
    LEGACY_IPNS_SEQUENCE_KEY = "profile.ipns.sequence";
    MIGRATION_DONE_KEY = "profile.pointer.migration.done";
    SNAPSHOT_VERSION = 1;
    libp2pModules = null;
  }
});

// profile/orbitdb-adapter.ts
init_logger();
init_hex();
init_errors();
init_oplog_entry();
var OrbitDbAdapter = class {
  // ---- private fields (typed as `any` because @orbitdb/core may not be installed) ----
  /** The Helia IPFS node. */
  helia = null;
  /** The OrbitDB instance. */
  orbitdb = null;
  /** The opened `keyvalue` database handle. */
  db = null;
  /** Tracks connection state. */
  connected = false;
  /** Registered replication listeners for cleanup. */
  replicationListeners = /* @__PURE__ */ new Set();
  /**
   * Keys written by LOCAL `putEntry` calls during this session. Used by
   * `getEntry` to decide whether to trust the stored `originated` tag
   * (local write → trust) or force-downgrade to 'replicated' (peer write).
   *
   * Security invariant: `getEntry(key)` without `trustLocalClaim:true`
   * returns `originated:'replicated'` UNLESS the key is in this set AND
   * no replication event has fired for the key since we wrote it. This
   * closes the "peer forges 'user' tag in envelope, plain getEntry
   * returns it verbatim" attack surface.
   *
   * Set is session-scoped — cleared on `close()` / re-connect. That's
   * correct: a key we wrote in session N cannot be trusted across
   * sessions because a remote peer may have overwritten it (LWW) while
   * we were offline. Local writes are always re-stamped on next write.
   */
  localAuthoredKeys = /* @__PURE__ */ new Set();
  /**
   * Steelman⁴⁸ WARNING: dedup concurrent connect() calls.
   * Two callers racing on init both saw connected=false, both
   * proceeded to create Helia + OrbitDB + open db. The second
   * overwrote helia/orbitdb/db, leaking the first instance's
   * resources (no future close() could find them). Now both callers
   * await the same connect promise.
   */
  connectInFlight = null;
  closeInFlight = null;
  /**
   * Steelman remediation for issue #236 — set TRUE at the entry of
   * `closeInner()` (BEFORE the bounded teardown begins), cleared after
   * the close completes (or at the start of the next successful
   * `connect()`). Read by `getHelia()` to deny new fast-path callers
   * during the teardown window; pre-#236 the read was guarded only by
   * `this.connected`, which is cleared at the END of close — wide open
   * to a concurrent flush capturing a half-stopped Helia between the
   * `helia.stop()` race and the `onSettle` null-out.
   */
  shuttingDown = false;
  // ---------- ProfileDatabase implementation ----------
  async connect(config) {
    if (this.closeInFlight) {
      try {
        await this.closeInFlight;
      } catch {
      }
    }
    if (this.connected) {
      return;
    }
    if (this.connectInFlight) {
      return this.connectInFlight;
    }
    this.connectInFlight = this.connectWithRetry(config).finally(() => {
      this.connectInFlight = null;
    });
    return this.connectInFlight;
  }
  /**
   * Issue #245 #2 — bounded retry wrapper around `connectInner`.
   *
   * **Why:** the manual-test-full-recovery.sh §C.4 step reliably
   * surfaced
   *   `Failed to attach OrbitDB: ORBITDB_CONNECTION_FAILED: ...
   *    Failed to connect to OrbitDB: Database is not open`
   * on the FIRST CLI invocation following a daemon-driven sync
   * (where the daemon's prior `closeInner()` had hit the
   * `helia.stop exceeded 10000ms — dropping reference and continuing`
   * budget timeout, leaving on-disk state in a transient
   * lock/teardown limbo). The next process couldn't open the same
   * directory cleanly until ~seconds had passed.
   *
   * `cleanupOnError()` (run inside `connectInner` on throw) wipes
   * adapter-local helia/orbitdb/db handles before re-throwing — so
   * a retry creates a fresh helia + orbitdb pair from scratch. That
   * makes the retry both safe (no stale state carry-over) and
   * meaningful (we get a fresh attempt at acquiring the on-disk
   * locks / pubsub init / DB open).
   *
   * **Retry budget:** 2 attempts × 1.5s linear backoff = ~3-4.5s
   * worst-case extra latency. Acceptable given the failure mode
   * (test-script reliability + UX after a daemon restart). We do
   * NOT retry `ORBITDB_NOT_INSTALLED` — that's a sticky dep error.
   *
   * **Multi-process diagnosis:** if all retries exhaust and the
   * final message matches a lock-contention pattern, we augment the
   * error with an actionable hint pointing at the most likely cause
   * (a sphere daemon holding the lock). The base ProfileErrorCode
   * is preserved so callers' code-based routing keeps working.
   */
  async connectWithRetry(config) {
    const RETRY_ATTEMPTS = 2;
    const RETRY_BACKOFF_MS = 1500;
    let lastErr;
    for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        await this.connectInner(config);
        return;
      } catch (err) {
        lastErr = err;
        if (err instanceof ProfileError && err.code === "ORBITDB_NOT_INSTALLED") {
          throw err;
        }
        if (attempt >= RETRY_ATTEMPTS) break;
        await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS));
      }
    }
    if (lastErr instanceof ProfileError && lastErr.code === "ORBITDB_CONNECTION_FAILED" && /Database is not open|LOCK|Resource temporarily unavailable|lockfile|EBUSY/i.test(
      lastErr.message
    )) {
      throw new ProfileError(
        "ORBITDB_CONNECTION_FAILED",
        `${lastErr.message} (after ${RETRY_ATTEMPTS + 1} attempts). This is typically caused by another process (e.g. a \`sphere daemon\`) still holding the OrbitDB / Helia directory lock. Stop the daemon (\`sphere daemon stop\`) or wait for its teardown to complete, then retry.`,
        lastErr
      );
    }
    throw lastErr;
  }
  async connectInner(config) {
    this.shuttingDown = false;
    let orbitdbModule;
    try {
      orbitdbModule = await import("@orbitdb/core");
    } catch {
      throw new ProfileError(
        "ORBITDB_NOT_INSTALLED",
        "@orbitdb/core is not installed. Install it with: npm install @orbitdb/core"
      );
    }
    let heliaModule;
    try {
      heliaModule = await import("helia");
    } catch {
      throw new ProfileError(
        "ORBITDB_NOT_INSTALLED",
        "helia is not installed. Install it with: npm install helia"
      );
    }
    try {
      const createHelia = heliaModule.createHelia ?? heliaModule.default?.createHelia;
      const libp2pDefaults = heliaModule.libp2pDefaults ?? heliaModule.default?.libp2pDefaults;
      if (typeof createHelia !== "function") {
        throw new Error("Could not resolve createHelia from helia module");
      }
      let gossipsubFactory = null;
      try {
        const gossipsubModule = await import("@chainsafe/libp2p-gossipsub");
        gossipsubFactory = gossipsubModule.gossipsub ?? gossipsubModule.default?.gossipsub ?? gossipsubModule.default;
      } catch {
      }
      const httpOnlyIpfs = config.httpOnlyIpfs === true;
      const heliaOptions = {};
      if (config.directory) {
        heliaOptions.directory = config.directory;
        try {
          const blockstoreFsModule = await import("blockstore-fs");
          const FsBlockstoreCtor = blockstoreFsModule.FsBlockstore ?? blockstoreFsModule.default?.FsBlockstore;
          if (typeof FsBlockstoreCtor === "function") {
            heliaOptions.blockstore = new FsBlockstoreCtor(`${config.directory}/blocks`);
          }
        } catch {
        }
      }
      if (gossipsubFactory && typeof libp2pDefaults === "function") {
        const libp2pConfig = libp2pDefaults();
        if (!isBrowserEnvironment() && Array.isArray(libp2pConfig.transports)) {
          libp2pConfig.transports = libp2pConfig.transports.filter((factory) => {
            try {
              const src = typeof factory === "function" ? factory.toString() : "";
              return !src.includes("WebRTC");
            } catch {
              return true;
            }
          });
        }
        if (!isBrowserEnvironment() && libp2pConfig.addresses?.listen) {
          libp2pConfig.addresses.listen = libp2pConfig.addresses.listen.filter(
            (addr) => !addr.includes("webrtc")
          );
        }
        const isIsolated = httpOnlyIpfs || Array.isArray(config.bootstrapPeers) && config.bootstrapPeers.length === 0;
        if (isIsolated) {
          libp2pConfig.peerDiscovery = [];
          if (libp2pConfig.services) {
            const isolatedServices = {};
            const allowed = /* @__PURE__ */ new Set(["identify", "identifyPush", "keychain", "ping"]);
            for (const [k, v] of Object.entries(libp2pConfig.services)) {
              if (allowed.has(k)) isolatedServices[k] = v;
            }
            libp2pConfig.services = isolatedServices;
          }
          libp2pConfig.addresses = { listen: [] };
        } else if (config.bootstrapPeers && config.bootstrapPeers.length > 0) {
          try {
            const bootstrapModule = await import("@libp2p/bootstrap");
            const bootstrapFactory = bootstrapModule.bootstrap ?? bootstrapModule.default?.bootstrap ?? bootstrapModule.default;
            if (typeof bootstrapFactory === "function") {
              libp2pConfig.peerDiscovery = [bootstrapFactory({ list: [...config.bootstrapPeers] })];
            }
          } catch {
          }
        }
        libp2pConfig.services = {
          ...libp2pConfig.services,
          pubsub: gossipsubFactory({ allowPublishToZeroTopicPeers: true })
        };
        heliaOptions.libp2p = libp2pConfig;
        if (isIsolated) {
          const gateways = Array.isArray(config.ipfsGateways) ? config.ipfsGateways.filter((g) => typeof g === "string" && g.length > 0) : [];
          if (gateways.length > 0) {
            const { createHttpBlockBroker: createHttpBlockBroker2 } = await Promise.resolve().then(() => (init_http_block_broker(), http_block_broker_exports));
            heliaOptions.blockBrokers = [createHttpBlockBroker2({ gateways })];
          } else {
            heliaOptions.blockBrokers = [];
          }
        }
      } else if (gossipsubFactory) {
        heliaOptions.libp2p = {
          services: {
            pubsub: gossipsubFactory({ allowPublishToZeroTopicPeers: true })
          }
        };
      }
      this.helia = await createHelia(heliaOptions);
      const heliaInstance = this.helia;
      if (heliaInstance?.blockstore && typeof heliaInstance.blockstore.get === "function") {
        const blockstore = heliaInstance.blockstore;
        const originalGet = blockstore.get.bind(blockstore);
        blockstore.get = async (cid, options) => {
          const chunks = [];
          let total = 0;
          try {
            for await (const chunk of originalGet(cid, options)) {
              chunks.push(chunk);
              total += chunk.length;
            }
          } catch (err) {
            const errName = err?.name;
            const errCode = err?.code;
            if (errName === "NotFoundError" || errCode === "ERR_NOT_FOUND" || // Issue #266 — Helia throws InvalidConfigurationError when
            // `blockBrokers: []` and the block isn't in the local
            // blockstore. We treat this as "missing" so OrbitDB
            // gracefully sees an unresolved head instead of erroring
            // out the whole read. The HTTP recovery path
            // (snapshot prefetch via profile/ipfs-client.ts) handles
            // re-warming the blockstore from operator Kubo gateways.
            errName === "InvalidConfigurationError" || errCode === "ERR_NO_BLOCK_BROKERS") {
              return void 0;
            }
            throw err;
          }
          if (chunks.length === 0) return void 0;
          if (chunks.length === 1) return chunks[0];
          const combined = new Uint8Array(total);
          let offset = 0;
          for (const c of chunks) {
            combined.set(c, offset);
            offset += c.length;
          }
          return combined;
        };
      }
      const createOrbitDB = orbitdbModule.createOrbitDB ?? orbitdbModule.default?.createOrbitDB;
      if (typeof createOrbitDB !== "function") {
        throw new Error("Could not resolve createOrbitDB from @orbitdb/core");
      }
      let dbName;
      let identityIdSource;
      if (config.dbNameOverride) {
        dbName = config.dbNameOverride;
        identityIdSource = config.dbNameOverride;
      } else if (config.privateKey && config.privateKey.length > 0) {
        const publicKeyShort = await derivePublicKeyShort(config.privateKey);
        dbName = `sphere-profile-${publicKeyShort}`;
        identityIdSource = publicKeyShort;
      } else {
        throw new ProfileError(
          "ORBITDB_CONNECTION_FAILED",
          "OrbitDbConfig requires either dbNameOverride (preferred) or privateKey (deprecated)."
        );
      }
      const derivedId = `sphere-orbit-${identityIdSource}`;
      const orbitDbOptions = {
        ipfs: this.helia,
        id: derivedId
      };
      if (config.directory) {
        orbitDbOptions.directory = config.directory;
      }
      this.orbitdb = await createOrbitDB(orbitDbOptions);
      const OrbitDBAccessController = orbitdbModule.OrbitDBAccessController ?? orbitdbModule.default?.OrbitDBAccessController;
      const openOptions = {
        type: "keyvalue"
      };
      if (OrbitDBAccessController) {
        openOptions.AccessController = OrbitDBAccessController({
          write: [this.orbitdb.identity.id]
        });
      }
      this.db = await this.orbitdb.open(dbName, openOptions);
      this.connected = true;
    } catch (err) {
      await this.cleanupOnError();
      if (err instanceof ProfileError) {
        throw err;
      }
      throw new ProfileError(
        "ORBITDB_CONNECTION_FAILED",
        `Failed to connect to OrbitDB: ${err instanceof Error ? err.message : String(err)}`,
        err
      );
    }
  }
  async put(key, value) {
    this.ensureConnected();
    try {
      await this.db.put(key, value);
    } catch (err) {
      throw new ProfileError(
        "ORBITDB_WRITE_FAILED",
        `Failed to write key "${key}": ${err instanceof Error ? err.message : String(err)}`,
        err
      );
    }
  }
  async get(key) {
    this.ensureConnected();
    try {
      const value = await this.db.get(key);
      if (value === void 0 || value === null) {
        return null;
      }
      return coerceToUint8Array(value);
    } catch (err) {
      if (err instanceof ProfileError) throw err;
      throw new ProfileError(
        "ORBITDB_READ_FAILED",
        `Failed to read key "${key}": ${err instanceof Error ? err.message : String(err)}`,
        err
      );
    }
  }
  async del(key) {
    this.ensureConnected();
    try {
      await this.db.del(key);
    } catch (err) {
      throw new ProfileError(
        "ORBITDB_WRITE_FAILED",
        `Failed to delete key "${key}": ${err instanceof Error ? err.message : String(err)}`,
        err
      );
    }
  }
  // ---------- Structured-entry API (PROFILE-OPLOG-SCHEMA.md §5) ----------
  /**
   * Write a structured OpLog entry envelope at `key`.
   *
   * Encodes via deterministic CBOR (@ipld/dag-cbor) and stores the bytes
   * in the underlying OrbitDB keyvalue database. OrbitDB signs the
   * (key, cborBytes) pair, binding the envelope's originated tag to the
   * author's identity.
   *
   * Callers SHOULD construct envelopes via `buildLocalEntry()` or the
   * replication-downgrade helpers from `profile/oplog-entry.ts` rather
   * than hand-rolling — those helpers enforce the (type, originated)
   * coherence check.
   */
  async putEntry(key, entry) {
    this.ensureConnected();
    try {
      const cborBytes = encodeEntry(entry);
      await this.db.put(key, cborBytes);
      this.localAuthoredKeys.add(key);
    } catch (err) {
      throw new ProfileError(
        "ORBITDB_WRITE_FAILED",
        `Failed to write structured entry at "${key}": ${err instanceof Error ? err.message : String(err)}`,
        err
      );
    }
  }
  /**
   * Also track local authorship when code takes the legacy `put()` path.
   * This is called by ProfileStorageProvider.writeEnvelope's fallback branch
   * (for adapters without structured-entry support). We track it here so
   * getEntry's trust decision is uniform regardless of which API wrote.
   */
  markLocallyAuthored(key) {
    this.localAuthoredKeys.add(key);
  }
  /**
   * Read a structured OpLog entry envelope at `key`, or `null` if absent.
   *
   * SECURITY DEFAULT (post-steelman): the returned envelope's
   * `originated` field is forced to `'replicated'` UNLESS the key was
   * written by a local `putEntry` in THIS session AND no replication
   * event has fired for this key since. Callers that specifically need
   * the stored tag (e.g., debug tools) must pass `trustLocalClaim: true`.
   *
   * Legacy opaque-bytes entries (from pre-schema wallets) are wrapped
   * in a synthetic envelope per §7.1 — callers can detect them via
   * `isLegacyEntry(envelope)` from `profile/oplog-entry.ts`.
   *
   * @param opts.downgradeAsReplicated  — LEGACY: when true, forces
   *   downgrade via `decodeAndDowngradeReplicated`. Kept for backward
   *   compat but largely redundant since downgrade is now the DEFAULT.
   * @param opts.trustLocalClaim  — EXPLICIT: when true, returns the
   *   envelope's stored `originated` tag verbatim. Callers use this
   *   when they've already authenticated the source (e.g., immediately
   *   after putEntry). Legacy entries (v=0) always downgrade regardless.
   */
  async getEntry(key, opts = {}) {
    this.ensureConnected();
    try {
      const raw2 = await this.db.get(key);
      if (raw2 === void 0 || raw2 === null) return null;
      const bytes = coerceToUint8Array(raw2);
      if (opts.downgradeAsReplicated === true) {
        return decodeAndDowngradeReplicated(bytes);
      }
      const envelope = decodeEntry(bytes);
      if (envelope.v === 0) {
        return envelope;
      }
      const trusted = opts.trustLocalClaim === true && this.localAuthoredKeys.has(key);
      if (trusted) {
        return envelope;
      }
      return decodeAndDowngradeReplicated(bytes);
    } catch (err) {
      if (err instanceof ProfileError) throw err;
      throw new ProfileError(
        "ORBITDB_READ_FAILED",
        `Failed to read structured entry at "${key}": ${err instanceof Error ? err.message : String(err)}`,
        err
      );
    }
  }
  async all(prefix, opts) {
    this.ensureConnected();
    try {
      const result = /* @__PURE__ */ new Map();
      const allEntries = await this.db.all();
      const maxResults = opts?.maxResults !== void 0 && Number.isFinite(opts.maxResults) && opts.maxResults >= 0 ? Math.floor(opts.maxResults) : void 0;
      const isCapped = maxResults !== void 0;
      const ALL_AGGREGATE_BYTES_CAP = 256 * 1024 * 1024;
      const AGGREGATE_CAP_SENTINEL = /* @__PURE__ */ Symbol("orbitdb-aggregate-cap-exceeded");
      let aggregateBytes = 0;
      let skippedCount = 0;
      const tryCoerce = (key, value) => {
        try {
          const coerced = coerceToUint8Array(value);
          aggregateBytes += coerced.byteLength;
          if (aggregateBytes > ALL_AGGREGATE_BYTES_CAP) {
            const err = new ProfileError(
              "ORBITDB_READ_FAILED",
              `all(): aggregate value bytes exceeded ${ALL_AGGREGATE_BYTES_CAP} (at key="${key}"). Refusing to load further entries \u2014 possible OOM attack from a malicious peer.`
            );
            err[AGGREGATE_CAP_SENTINEL] = true;
            throw err;
          }
          result.set(key, coerced);
          return true;
        } catch (err) {
          if (err && typeof err === "object" && err[AGGREGATE_CAP_SENTINEL]) {
            throw err;
          }
          skippedCount += 1;
          if (skippedCount <= 3) {
            logger.warn(
              "OrbitDbAdapter",
              `all(): skipping malformed entry at key="${key}": ${err instanceof Error ? err.message : String(err)}`
            );
          }
          return false;
        }
      };
      const reachedCap = () => isCapped && result.size >= maxResults;
      if (Array.isArray(allEntries)) {
        for (const entry of allEntries) {
          if (reachedCap()) break;
          const entryKey = entry.key ?? entry[0];
          const entryValue = entry.value ?? entry[1];
          if (prefix && !entryKey.startsWith(prefix)) {
            continue;
          }
          tryCoerce(entryKey, entryValue);
        }
      } else if (allEntries && typeof allEntries[Symbol.asyncIterator] === "function") {
        for await (const entry of allEntries) {
          if (reachedCap()) break;
          const entryKey = entry.key ?? entry[0];
          const entryValue = entry.value ?? entry[1];
          if (prefix && !entryKey.startsWith(prefix)) {
            continue;
          }
          tryCoerce(entryKey, entryValue);
        }
      } else if (allEntries instanceof Map) {
        for (const [entryKey, entryValue] of allEntries) {
          if (reachedCap()) break;
          if (prefix && !entryKey.startsWith(prefix)) {
            continue;
          }
          tryCoerce(entryKey, entryValue);
        }
      } else if (typeof allEntries === "object" && allEntries !== null) {
        for (const [entryKey, entryValue] of Object.entries(allEntries)) {
          if (reachedCap()) break;
          if (prefix && !entryKey.startsWith(prefix)) {
            continue;
          }
          tryCoerce(entryKey, entryValue);
        }
      }
      if (skippedCount > 3) {
        logger.warn(
          "OrbitDbAdapter",
          `all(): skipped ${skippedCount} malformed entries total (further details suppressed).`
        );
      }
      return result;
    } catch (err) {
      if (err instanceof ProfileError) throw err;
      throw new ProfileError(
        "ORBITDB_READ_FAILED",
        `Failed to read all entries${prefix ? ` with prefix "${prefix}"` : ""}: ${err instanceof Error ? err.message : String(err)}`,
        err
      );
    }
  }
  async close() {
    if (this.closeInFlight) return this.closeInFlight;
    this.closeInFlight = this.closeInner().finally(() => {
      this.closeInFlight = null;
    });
    return this.closeInFlight;
  }
  async closeInner() {
    if (this.connectInFlight) {
      try {
        await this.connectInFlight;
      } catch {
      }
    }
    if (!this.connected) {
      return;
    }
    this.shuttingDown = true;
    if (this.db?.events?.off) {
      for (const handler of this.replicationListeners) {
        try {
          this.db.events.off("update", handler);
        } catch {
        }
      }
    }
    this.replicationListeners.clear();
    this.localAuthoredKeys.clear();
    await closeWithBudget("db.close", () => this.db?.close(), () => {
      this.db = null;
    });
    await closeWithBudget("orbitdb.stop", () => this.orbitdb?.stop(), () => {
      this.orbitdb = null;
    });
    await closeWithBudget("helia.stop", () => this.helia?.stop(), () => {
      this.helia = null;
    });
    this.connected = false;
    this.shuttingDown = false;
  }
  onReplication(callback) {
    this.ensureConnected();
    const handler = () => {
      this.localAuthoredKeys.clear();
      callback();
    };
    this.db.events.on("update", handler);
    this.replicationListeners.add(handler);
    return () => {
      this.db?.events?.off?.("update", handler);
      this.replicationListeners.delete(handler);
    };
  }
  isConnected() {
    return this.connected;
  }
  /**
   * Issue #236 — Expose the underlying Helia node so the Profile token-
   * storage pin/fetch paths can use the local on-disk blockstore as the
   * primary CAR store. Returns `null` when disconnected, pre-`connect()`,
   * or DURING `close()` teardown (steelman remediation).
   *
   * Why this is safe to expose:
   *   - The accessor is READ-ONLY (no `setHelia`) — callers cannot swap
   *     out our IPFS substrate.
   *   - The returned handle is the SAME instance the adapter uses for
   *     OrbitDB's own blockstore, so writes via `blockstore.put` share
   *     the on-disk persistence directory configured at `connect()` time.
   *   - Typed as `unknown` to keep helia types out of the public Profile
   *     interface (the rest of the SDK still tree-shakes cleanly when
   *     helia is absent — the adapter is the single point of contact).
   *
   * **Shutdown gating (steelman remediation).** A concurrent flush
   * firing during `closeInner()` could otherwise capture the helia
   * handle and call `blockstore.put` on a draining Helia — the
   * underlying libp2p / blockstore is already mid-teardown and the put
   * may hang indefinitely (or write to a half-stopped store). We
   * surface `null` from the moment `closeInner()` begins its teardown
   * budget so in-flight callers immediately fall back to the HTTP-only
   * pin path. The destroy-ordering invariant from PR #235 already
   * ensures the token-storage layer is drained before the adapter
   * closes; this gate is a defense-in-depth backstop against a future
   * caller that bypasses the scheduler.
   */
  getHelia() {
    if (this.shuttingDown) return null;
    return this.helia ?? null;
  }
  // ---------- Private helpers ----------
  /**
   * Throws `ProfileError` if the adapter is not connected.
   */
  ensureConnected() {
    if (!this.connected || !this.db) {
      throw new ProfileError(
        "PROFILE_NOT_INITIALIZED",
        "OrbitDB adapter is not connected. Call connect() first."
      );
    }
  }
  /**
   * Clean up partially initialized state after a failed `connect()`.
   */
  async cleanupOnError() {
    try {
      if (this.db) {
        await this.db.close();
      }
    } catch {
    }
    try {
      if (this.orbitdb) {
        await this.orbitdb.stop();
      }
    } catch {
    }
    try {
      if (this.helia) {
        await this.helia.stop();
      }
    } catch {
    }
    this.db = null;
    this.orbitdb = null;
    this.helia = null;
    this.connected = false;
  }
};
async function derivePublicKeyShort(privateKeyHex) {
  try {
    const secp256k1Module = await Promise.resolve().then(() => (init_secp256k1(), secp256k1_exports));
    const pubKeyBytes = secp256k1Module.secp256k1.getPublicKey(privateKeyHex, true);
    return bytesToHex2(pubKeyBytes).slice(0, 16);
  } catch {
  }
  try {
    const hashModule = await Promise.resolve().then(() => (init_sha2(), sha2_exports));
    const hash = hashModule.sha256(hexToBytes(privateKeyHex));
    return bytesToHex2(hash).slice(0, 16);
  } catch {
  }
  throw new ProfileError(
    "ORBITDB_CONNECTION_FAILED",
    "Cannot derive public key: @noble/curves and @noble/hashes are required"
  );
}
var TEARDOWN_STEP_TIMEOUT_MS = 1e4;
async function closeWithBudget(label, invoke, onSettle) {
  let timer;
  try {
    const op = invoke();
    if (!op) return;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve("timeout"), TEARDOWN_STEP_TIMEOUT_MS);
    });
    const outcome = await Promise.race([op.then(() => "ok"), timeout]);
    if (outcome === "timeout") {
      logger.warn(
        "OrbitDB",
        `${label} exceeded ${TEARDOWN_STEP_TIMEOUT_MS}ms \u2014 dropping reference and continuing`
      );
    }
  } catch {
  } finally {
    if (timer !== void 0) clearTimeout(timer);
    onSettle();
  }
}
function bytesToHex2(bytes) {
  const hex = [];
  for (let i = 0; i < bytes.length; i++) {
    hex.push(bytes[i].toString(16).padStart(2, "0"));
  }
  return hex.join("");
}
var COERCE_OBJECT_VALUE_CAP = 1 << 20;
var CANONICAL_INDEX_KEY = /^(?:0|[1-9]\d*)$/;
function coerceToUint8Array(value) {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (typeof value !== "object" || value === null) {
    return new Uint8Array(0);
  }
  const obj = value;
  let maxIdx = -1;
  let keyCount = 0;
  for (const k in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    keyCount += 1;
    if (keyCount > COERCE_OBJECT_VALUE_CAP) {
      throw new ProfileError(
        "ORBITDB_READ_FAILED",
        `Refusing to coerce object with > ${COERCE_OBJECT_VALUE_CAP} entries to Uint8Array (key-count cap exceeded)`
      );
    }
    if (!CANONICAL_INDEX_KEY.test(k)) {
      throw new ProfileError(
        "ORBITDB_READ_FAILED",
        `Refusing to coerce object: non-canonical key "${k}" \u2014 expected a dense numeric-keyed byte map (Issue #251)`
      );
    }
    const descriptor = Object.getOwnPropertyDescriptor(obj, k);
    if (descriptor === void 0 || descriptor.get !== void 0 || descriptor.set !== void 0) {
      throw new ProfileError(
        "ORBITDB_READ_FAILED",
        `Refusing to coerce object: key "${k}" has an accessor descriptor \u2014 expected a plain data property (Issue #251)`
      );
    }
    const idx = Number(k);
    if (idx > maxIdx) maxIdx = idx;
  }
  if (keyCount > 0 && keyCount !== maxIdx + 1) {
    throw new ProfileError(
      "ORBITDB_READ_FAILED",
      `Refusing to coerce sparse object: ${keyCount} keys but maxIdx=${maxIdx} (expected dense 0..${keyCount - 1}, Issue #251)`
    );
  }
  const bytes = new Uint8Array(keyCount);
  for (let i = 0; i < keyCount; i++) {
    const v = obj[String(i)];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 255) {
      throw new ProfileError(
        "ORBITDB_READ_FAILED",
        `Invalid byte value at index ${i}: ${typeof v} (expected integer 0-255)`
      );
    }
    bytes[i] = v;
  }
  return bytes;
}
function isBrowserEnvironment() {
  return typeof globalThis.window !== "undefined";
}

// constants.ts
var STORAGE_PREFIX = "sphere_";
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
function getAddressId(directAddress) {
  let hash = directAddress;
  if (hash.startsWith("DIRECT://")) {
    hash = hash.slice(9);
  } else if (hash.startsWith("DIRECT:")) {
    hash = hash.slice(7);
  }
  const first = hash.slice(0, 6).toLowerCase();
  const last = hash.slice(-6).toLowerCase();
  return `DIRECT_${first}_${last}`;
}
var DEFAULT_NOSTR_RELAYS = [
  "wss://relay.unicity.network",
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band"
];
var DEFAULT_AGGREGATOR_URL = "https://aggregator.unicity.network/rpc";
var DEV_AGGREGATOR_URL = "https://dev-aggregator.dyndns.org/rpc";
var TEST_AGGREGATOR_URL = "https://goggregator-test.unicity.network";
var BUILTIN_IPFS_GATEWAYS = [
  "https://unicity-ipfs1.dyndns.org"
];
function readIpfsGatewayEnvOverride() {
  if (typeof process === "undefined" || typeof process.env === "undefined") {
    return null;
  }
  const raw2 = process.env.SPHERE_IPFS_GATEWAY;
  if (!raw2) return null;
  const parts = raw2.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  return parts.length > 0 ? parts : null;
}
var ENV_IPFS_GATEWAYS = readIpfsGatewayEnvOverride();
var DEFAULT_IPFS_GATEWAYS = ENV_IPFS_GATEWAYS ?? BUILTIN_IPFS_GATEWAYS;
var DEFAULT_BASE_PATH = "m/44'/0'/0'";
var DEFAULT_DERIVATION_PATH = `${DEFAULT_BASE_PATH}/0/0`;
var DEFAULT_ELECTRUM_URL = "wss://fulcrum.unicity.network:50004";
var TEST_ELECTRUM_URL = "wss://fulcrum.unicity.network:50004";
var TOKEN_REGISTRY_URL = "https://raw.githubusercontent.com/unicitynetwork/unicity-ids/refs/heads/main/unicity-ids.testnet.json";
var TEST_NOSTR_RELAYS = [
  "wss://nostr-relay.testnet.unicity.network"
];
var DEFAULT_GROUP_RELAYS = [
  "wss://sphere-relay.unicity.network"
];
var NETWORKS = {
  mainnet: {
    name: "Mainnet",
    aggregatorUrl: DEFAULT_AGGREGATOR_URL,
    nostrRelays: DEFAULT_NOSTR_RELAYS,
    ipfsGateways: DEFAULT_IPFS_GATEWAYS,
    electrumUrl: DEFAULT_ELECTRUM_URL,
    groupRelays: DEFAULT_GROUP_RELAYS,
    tokenRegistryUrl: TOKEN_REGISTRY_URL
  },
  testnet: {
    name: "Testnet",
    aggregatorUrl: TEST_AGGREGATOR_URL,
    nostrRelays: TEST_NOSTR_RELAYS,
    ipfsGateways: DEFAULT_IPFS_GATEWAYS,
    electrumUrl: TEST_ELECTRUM_URL,
    groupRelays: DEFAULT_GROUP_RELAYS,
    tokenRegistryUrl: TOKEN_REGISTRY_URL
  },
  dev: {
    name: "Development",
    aggregatorUrl: DEV_AGGREGATOR_URL,
    nostrRelays: TEST_NOSTR_RELAYS,
    ipfsGateways: DEFAULT_IPFS_GATEWAYS,
    electrumUrl: TEST_ELECTRUM_URL,
    groupRelays: DEFAULT_GROUP_RELAYS,
    tokenRegistryUrl: TOKEN_REGISTRY_URL
  }
};

// profile/types.ts
var PROFILE_KEY_MAPPING = {
  // --- Global identity keys ---
  "mnemonic": { profileKey: "identity.mnemonic", dynamic: false },
  "master_key": { profileKey: "identity.masterKey", dynamic: false },
  "chain_code": { profileKey: "identity.chainCode", dynamic: false },
  "derivation_path": { profileKey: "identity.derivationPath", dynamic: false },
  "base_path": { profileKey: "identity.basePath", dynamic: false },
  "derivation_mode": { profileKey: "identity.derivationMode", dynamic: false },
  "wallet_source": { profileKey: "identity.walletSource", dynamic: false },
  "wallet_exists": { profileKey: "wallet_exists", dynamic: false },
  // local-only fast-path flag
  "current_address_index": { profileKey: "identity.currentAddressIndex", dynamic: false },
  // --- Global address keys ---
  "address_nametags": { profileKey: "addresses.nametags", dynamic: false },
  "tracked_addresses": { profileKey: "addresses.tracked", dynamic: false },
  // --- Global transport keys ---
  // Note: last_wallet_event_ts_{pubkey} and last_dm_event_ts_{pubkey} are dynamic
  // and handled by IPFS_STATE_KEYS_PATTERN + dynamic mapping logic, not here.
  "group_chat_relay_url": { profileKey: "groupchat.relayUrl", dynamic: false },
  // --- Cache-only keys (stored in CACHE_ONLY_KEYS, NOT in OrbitDB) ---
  "token_registry_cache": { profileKey: "tokens.registryCache", dynamic: false },
  "token_registry_cache_ts": { profileKey: "tokens.registryCacheTs", dynamic: false },
  "price_cache": { profileKey: "prices.cache", dynamic: false },
  "price_cache_ts": { profileKey: "prices.cacheTs", dynamic: false },
  // --- Per-address keys (dynamic: address ID prefix) ---
  "pending_transfers": { profileKey: "{addr}.pendingTransfers", dynamic: true },
  "outbox": { profileKey: "{addr}.outbox", dynamic: true },
  "conversations": { profileKey: "{addr}.conversations", dynamic: true },
  "messages": { profileKey: "{addr}.messages", dynamic: true },
  "transaction_history": { profileKey: "{addr}.transactionHistory", dynamic: true },
  "pending_v5_tokens": { profileKey: "{addr}.pendingV5Tokens", dynamic: true },
  "group_chat_groups": { profileKey: "{addr}.groupchat.groups", dynamic: true },
  "group_chat_messages": { profileKey: "{addr}.groupchat.messages", dynamic: true },
  "group_chat_members": { profileKey: "{addr}.groupchat.members", dynamic: true },
  "group_chat_processed_events": { profileKey: "{addr}.groupchat.processedEvents", dynamic: true },
  "processed_split_group_ids": { profileKey: "{addr}.processedSplitGroupIds", dynamic: true },
  "processed_combined_transfer_ids": { profileKey: "{addr}.processedCombinedTransferIds", dynamic: true },
  // --- Per-address accounting keys ---
  "cancelled_invoices": { profileKey: "{addr}.accounting.cancelledInvoices", dynamic: true },
  "closed_invoices": { profileKey: "{addr}.accounting.closedInvoices", dynamic: true },
  "frozen_balances": { profileKey: "{addr}.accounting.frozenBalances", dynamic: true },
  "auto_return": { profileKey: "{addr}.accounting.autoReturn", dynamic: true },
  "auto_return_ledger": { profileKey: "{addr}.accounting.autoReturnLedger", dynamic: true },
  "inv_ledger_index": { profileKey: "{addr}.accounting.invLedgerIndex", dynamic: true },
  "token_scan_state": { profileKey: "{addr}.accounting.tokenScanState", dynamic: true },
  // --- Per-address swap keys ---
  "swap_index": { profileKey: "{addr}.swap.index", dynamic: true },
  // Note: {addr}_swap:{swapId} is handled by dynamic pattern matching, not a static entry.
  // --- Per-address operational keys (stored in OrbitDB due to criticality) ---
  "mintOutbox": { profileKey: "{addr}.mintOutbox", dynamic: true },
  /**
   * @deprecated Legacy single-blob form retained for one-way migration
   * (see profile/migration.ts::migrateInvalidTokensToPerEntryKey). New
   * writes go to the per-entry-key prefix below (`invalid`). This entry
   * SHOULD be removed in T.8.D once the migration window closes.
   */
  "invalidTokens": { profileKey: "{addr}.invalidTokens", dynamic: true },
  "invalidatedNametags": { profileKey: "{addr}.invalidatedNametags", dynamic: true },
  "tombstones": { profileKey: "{addr}.tombstones", dynamic: true },
  // --- UXF inter-wallet transfer protocol per-entry-key collections
  //     (T.0.G7-fill-gaps + T.1.E). Each entry expands at runtime into
  //     `${addr}.<collection>.<id>` records via the per-entry-key
  //     writer in profile-token-storage-provider.ts. The `id` form is
  //     treated as opaque by the writer — T.1.E declares the specific
  //     composite-id shapes:
  //       - `audit`:   `${tokenId}.${observedTokenContentHash}`
  //       - `invalid`: `${tokenId}.${observedTokenContentHash}`
  //                    (legacy `invalidTokens` migrates to
  //                    `${tokenId}.legacy-${tokenId}`)
  //       - `finalizationQueue`: `${requestId}` (single-rep)
  //
  // These static keys NEVER appear at runtime on their own — the writer
  // expands them into per-entry-key composites. The mapping is here so
  // (a) reverse-lookups and (b) tooling that scans the schema know the
  // collection exists. `Sphere.clear()` reaches every per-entry-key
  // record via parent-storage prefix wipe (W46) — see the contract
  // block at the top of this constant.
  "audit": { profileKey: "{addr}.audit", dynamic: true },
  "invalid": { profileKey: "{addr}.invalid", dynamic: true },
  "finalizationQueue": { profileKey: "{addr}.finalizationQueue", dynamic: true },
  // Issue #97 — SENT ledger. Per-entry-key records of successfully
  // delivered bundles, keyed `${addr}.sent.${id}` (one entry per
  // delivery; id matches the outbox transferId). Used by the crash-
  // recovery sweeper to distinguish "already delivered" from "needs
  // re-queue to OUTBOX". See profile/sent-ledger-writer.ts.
  "sent": { profileKey: "{addr}.sent", dynamic: true }
};
var CACHE_ONLY_KEYS = /* @__PURE__ */ new Set([
  "token_registry_cache",
  "token_registry_cache_ts",
  "price_cache",
  "price_cache_ts"
]);
var IPFS_STATE_KEYS_PATTERN = /^ipfs_(seq|cid|ver)_/;
function computeAddressId(directAddress) {
  let clean2;
  if (directAddress.startsWith("DIRECT://")) {
    clean2 = directAddress.slice(9);
  } else if (directAddress.startsWith("DIRECT:")) {
    clean2 = directAddress.slice(7);
  } else {
    clean2 = directAddress;
  }
  const first6 = clean2.slice(0, 6).toLowerCase();
  const last6 = clean2.slice(-6).toLowerCase();
  return `DIRECT_${first6}_${last6}`;
}

// profile/profile-storage-provider.ts
init_errors();
init_encryption();

// profile/disposition-storage-adapters.ts
init_logger();
init_encryption();
init_oplog_envelope_io();

// profile/prefix-sync-writer.ts
init_encryption();
init_oplog_envelope_io();

// profile/profile-snapshot-merge.ts
var MAX_SAFE_LAMPORT = 2 ** 48;
function mergeSlots(local, remote) {
  if (remote.kind === "absent") {
    return { kind: "noop", reason: "remote-absent" };
  }
  if (local.kind === "absent") {
    return { kind: "write-remote", remoteKind: remote.kind };
  }
  if (local.kind === "live" && remote.kind === "live") {
    if (remote.lamport > local.lamport) {
      return { kind: "write-remote", remoteKind: "live" };
    }
    return { kind: "noop", reason: "local-wins-lamport" };
  }
  if (local.kind === "live" && remote.kind === "tombstone") {
    if (remote.lamport >= local.lamport) {
      return { kind: "write-remote", remoteKind: "tombstone" };
    }
    return { kind: "noop", reason: "local-wins-lamport" };
  }
  if (local.kind === "tombstone" && remote.kind === "live") {
    if (remote.lamport > local.lamport) {
      return { kind: "write-remote", remoteKind: "live" };
    }
    return { kind: "noop", reason: "local-wins-lamport" };
  }
  if (local.kind === "tombstone" && remote.kind === "tombstone") {
    if (remote.lamport > local.lamport) {
      return { kind: "write-remote", remoteKind: "tombstone" };
    }
    return { kind: "noop", reason: "local-wins-lamport" };
  }
  return { kind: "noop", reason: "local-wins-lamport" };
}
async function runJoinSnapshot(remote, deps) {
  let entriesEvaluated = 0;
  let liveLanded = 0;
  let tombstonesLanded = 0;
  let localWon = 0;
  let remoteRejectedMalformed = 0;
  for (const entry of remote) {
    entriesEvaluated += 1;
    let remoteSlot;
    try {
      remoteSlot = await deps.classifyRemote(entry);
    } catch {
      remoteRejectedMalformed += 1;
      continue;
    }
    if (remoteSlot === null || remoteSlot.kind === "absent") {
      remoteRejectedMalformed += 1;
      continue;
    }
    let localSlot;
    try {
      localSlot = await deps.classifyLocal(entry.key);
    } catch {
      localSlot = { kind: "absent" };
    }
    const action = mergeSlots(localSlot, remoteSlot);
    if (action.kind === "noop") {
      localWon += 1;
      continue;
    }
    try {
      await deps.writeRemote(entry.key, entry.encryptedValue);
      if (action.remoteKind === "live") {
        liveLanded += 1;
      } else {
        tombstonesLanded += 1;
      }
    } catch {
      remoteRejectedMalformed += 1;
    }
  }
  return {
    entriesEvaluated,
    liveLanded,
    tombstonesLanded,
    localWon,
    remoteRejectedMalformed
  };
}
function validateLamport(raw2) {
  if (typeof raw2 !== "number") return null;
  if (!Number.isFinite(raw2)) return null;
  if (!Number.isInteger(raw2)) return null;
  if (raw2 < 0) return null;
  if (raw2 > MAX_SAFE_LAMPORT) return null;
  return raw2;
}

// types/uxf-bounds.ts
var MAX_TOKEN_IDS_PER_ENTRY = 4096;
var MAX_TOKEN_ID_LENGTH = 256;
var MAX_RECIPIENT_LENGTH = 1024;
var MAX_NAMETAG_LENGTH = 256;
var MAX_BUNDLE_CID_LENGTH = 256;
var MAX_MEMO_LENGTH = 8192;
var MAX_NOSTR_EVENT_ID_LENGTH = 128;
var MAX_TRANSPORT_PUBKEY_LENGTH = 128;
var MAX_ERROR_LENGTH = 4096;
var MAX_ENTRY_BYTES_RAW = 1024 * 1024;
function isWithinOptionalStringLength(v, max) {
  if (v === void 0) return true;
  if (typeof v !== "string") return false;
  return v.length <= max;
}

// profile/prefix-sync-writer.ts
var PrefixSyncWriter = class {
  db;
  encryptionKey;
  keyPrefix;
  validateValue;
  notifyProfileDirty;
  constructor(opts) {
    if (typeof opts.keyPrefix !== "string" || opts.keyPrefix.length === 0) {
      throw new TypeError(
        "PrefixSyncWriter: keyPrefix must be a non-empty string"
      );
    }
    this.db = opts.db;
    this.encryptionKey = opts.encryptionKey;
    this.keyPrefix = opts.keyPrefix;
    this.validateValue = opts.validateValue ?? defaultValidator;
    this.notifyProfileDirty = opts.notifyProfileDirty ?? null;
  }
  async snapshot() {
    let entries;
    try {
      entries = await this.db.all(this.keyPrefix);
    } catch {
      return [];
    }
    const out = [];
    const sortedKeys = [...entries.keys()].sort();
    for (const key of sortedKeys) {
      if (!key.startsWith(this.keyPrefix)) continue;
      const encryptedValue = entries.get(key);
      if (encryptedValue === void 0) continue;
      out.push({ key, encryptedValue });
    }
    return out;
  }
  async joinSnapshot(remote) {
    const result = await runJoinSnapshot(remote, {
      classifyLocal: async (key) => {
        if (!key.startsWith(this.keyPrefix)) return { kind: "absent" };
        const raw2 = await this.safeGet(key);
        if (raw2 === null) return { kind: "absent" };
        const slot = await this.classifyBytes(
          raw2,
          /* remote = */
          false
        );
        return slot ?? { kind: "absent" };
      },
      classifyRemote: async (entry) => {
        if (!entry.key.startsWith(this.keyPrefix)) return null;
        return this.classifyBytes(
          entry.encryptedValue,
          /* remote = */
          true
        );
      },
      writeRemote: async (key, bytes) => {
        await this.db.put(key, bytes);
      }
    });
    if ((result.liveLanded > 0 || result.tombstonesLanded > 0) && this.notifyProfileDirty !== null) {
      try {
        this.notifyProfileDirty();
      } catch {
      }
    }
    return result;
  }
  /**
   * Defensive `db.get` wrapper — converts thrown errors to `null` so
   * the JOIN loop treats them as absent (let remote land) rather than
   * aborting.
   */
  async safeGet(key) {
    try {
      return await this.db.get(key);
    } catch {
      return null;
    }
  }
  /**
   * Decrypt + parse + classify a raw byte buffer.
   *
   * @param raw    The on-disk / on-wire bytes.
   * @param remote `true` for remote bytes (stricter — schema-invalid
   *               payloads reject); `false` for local (schema-invalid
   *               maps to `absent` so remote can land).
   */
  async classifyBytes(raw2, remote) {
    if (!raw2 || raw2.byteLength === 0) {
      return remote ? null : { kind: "absent" };
    }
    if (raw2.byteLength > MAX_ENTRY_BYTES_RAW) {
      return remote ? null : { kind: "absent" };
    }
    const ciphertext = unwrapEnvelopeBytes(raw2);
    let plaintextBytes;
    try {
      plaintextBytes = this.encryptionKey ? await decryptProfileValue(this.encryptionKey, ciphertext) : ciphertext;
    } catch {
      return remote ? null : { kind: "absent" };
    }
    let parsed;
    try {
      parsed = JSON.parse(new TextDecoder().decode(plaintextBytes));
    } catch {
      return remote ? null : { kind: "absent" };
    }
    if (isTombstoneMarker(parsed)) {
      return { kind: "tombstone", lamport: 0 };
    }
    if (!this.validateValue(parsed)) {
      return remote ? null : { kind: "absent" };
    }
    return { kind: "live", lamport: 0 };
  }
};
function isTombstoneMarker(value) {
  if (value === null || typeof value !== "object") return false;
  return value.tombstoned === true;
}
function defaultValidator(parsed) {
  if (parsed === null || typeof parsed !== "object") return false;
  if (Array.isArray(parsed)) return false;
  if (isTombstoneMarker(parsed)) return false;
  return true;
}

// profile/disposition-storage-adapters.ts
var DEFAULT_LIST_KEYS_MAX_RESULTS = 1024;
function isTombstone(value) {
  return typeof value === "object" && value !== null && value.tombstoned === true;
}
var OrbitDbDispositionStorageAdapter = class {
  db;
  encryptionKey;
  defaultMaxResults;
  notifyProfileDirty;
  constructor(opts) {
    this.db = opts.db;
    this.encryptionKey = opts.encryptionKey;
    this.defaultMaxResults = opts.defaultMaxResults ?? DEFAULT_LIST_KEYS_MAX_RESULTS;
    this.notifyProfileDirty = opts.notifyProfileDirty ?? null;
  }
  async readRecord(key) {
    const raw2 = await getEnvelopePayload(this.db, key);
    if (raw2 === null) return void 0;
    const decoded = await this.tryDecode(raw2, key);
    if (decoded === void 0) return void 0;
    if (isTombstone(decoded)) return void 0;
    return decoded;
  }
  async writeRecord(key, value) {
    const encoded = await this.encodeValue(value);
    await putEnvelopePayload(this.db, key, encoded);
  }
  /**
   * Tombstone a key. Subsequent reads return undefined; subsequent
   * prefix scans exclude the key. Idempotent.
   */
  async tombstone(key) {
    const marker = { tombstoned: true, deletedAt: Date.now() };
    await this.writeRecord(key, marker);
  }
  async listKeysWithPrefix(keyPrefix, opts) {
    const cap = opts?.maxResults ?? this.defaultMaxResults;
    if (!Number.isFinite(cap) || cap < 0) {
      throw new TypeError(
        `OrbitDbDispositionStorageAdapter.listKeysWithPrefix: maxResults must be a non-negative finite number (got ${String(cap)})`
      );
    }
    let entries;
    try {
      entries = await this.db.all(keyPrefix, { maxResults: cap });
    } catch (err) {
      logger.warn(
        "OrbitDbDispositionStorageAdapter",
        `listKeysWithPrefix("${keyPrefix}"): db.all() failed: ${err instanceof Error ? err.message : String(err)}`
      );
      return [];
    }
    const out = [];
    for (const [k, ciphertext] of entries) {
      if (out.length >= cap) break;
      if (!k.startsWith(keyPrefix)) continue;
      const decoded = await this.tryDecode(ciphertext, k);
      if (decoded === void 0) continue;
      if (isTombstone(decoded)) continue;
      out.push(k);
    }
    out.sort();
    return out;
  }
  // ---------------------------------------------------------------------------
  // Private — encode / decode helpers
  // ---------------------------------------------------------------------------
  async encodeValue(value) {
    const json = JSON.stringify(value);
    return encryptString(this.encryptionKey, json);
  }
  async tryDecode(raw2, key) {
    const ciphertext = unwrapEnvelopeBytes(raw2);
    try {
      const json = await decryptString(this.encryptionKey, ciphertext);
      return JSON.parse(json);
    } catch (err) {
      logger.warn(
        "OrbitDbDispositionStorageAdapter",
        `decode failed at key="${key}": ${err instanceof Error ? err.message : String(err)}`
      );
      return void 0;
    }
  }
  /**
   * Item #15 Phase B.4 — Return four prefix-scoped
   * {@link ProfileSyncWriter}s covering the address's disposition
   * surfaces:
   *
   *   - `${addressId}.invalid.`         — `_invalid` records keyed by
   *                                       (tokenId, observedContentHash).
   *                                       Content-immutable on the key
   *                                       disambiguator; constant-Lamport
   *                                       JOIN via {@link PrefixSyncWriter}
   *                                       is the correct semantics.
   *   - `${addressId}.invalid-orphan.`  — `_invalid` records for entries
   *                                       whose `tokenId` was the empty
   *                                       sentinel (structural-defect
   *                                       hydration throws). See
   *                                       `invalidKeyFor` in
   *                                       `profile/disposition-writer.ts`
   *                                       for the orphan-routing
   *                                       rationale.
   *   - `${addressId}.audit.`           — `_audit` records keyed by
   *                                       (tokenId, observedContentHash).
   *                                       Mostly content-immutable; the
   *                                       rare `auditStatus:
   *                                       'audit-promoted'` mutation
   *                                       causes operator-visible
   *                                       interim divergence that
   *                                       converges eventually.
   *                                       Constant-Lamport semantics
   *                                       are acceptable per the B.4
   *                                       scope analysis (see
   *                                       docs/uxf/OUTBOX-SEND-FOLLOWUPS.md).
   *   - `${addressId}.audit-orphan.`    — `_audit` orphan records (same
   *                                       sentinel routing as
   *                                       `_invalid-orphan`).
   *
   * **NOT covered by this method**: the `${addressId}.manifest.` surface.
   * Manifest entries are Lamport-tracked AND CAS-guarded with per-field
   * merge rules in `mergeManifestEntry`. A byte-verbatim JOIN would lose
   * the per-field merge. The production manifest storage is currently
   * in-memory only (an `MinimalManifestStorage` Map inside `PaymentsModule`),
   * so there is no OrbitDB persistence to JOIN against today. Treat as
   * a deferred follow-up; see `docs/uxf/OUTBOX-SEND-FOLLOWUPS.md` item
   * #15 "Deferred — B.4 manifest" for the path forward.
   *
   * Lifecycle and null semantics mirror
   * {@link OrbitDbRecipientContextStorageAdapter.syncWritersFor}.
   *
   * @param addressId  Wallet-address scope (`DIRECT_xxxxxx_yyyyyy`).
   * @throws TypeError when `addressId` is empty.
   */
  syncWritersFor(addressId) {
    if (typeof addressId !== "string" || addressId.length === 0) {
      throw new TypeError(
        "OrbitDbDispositionStorageAdapter.syncWritersFor: addressId must be a non-empty string"
      );
    }
    const common = {
      db: this.db,
      encryptionKey: this.encryptionKey,
      notifyProfileDirty: this.notifyProfileDirty ?? void 0
    };
    return {
      invalid: new PrefixSyncWriter({
        ...common,
        keyPrefix: dispositionInvalidPrefix(addressId),
        label: "OrbitDbDispositionStorageAdapter.invalid"
      }),
      invalidOrphan: new PrefixSyncWriter({
        ...common,
        keyPrefix: dispositionInvalidOrphanPrefix(addressId),
        label: "OrbitDbDispositionStorageAdapter.invalidOrphan"
      }),
      audit: new PrefixSyncWriter({
        ...common,
        keyPrefix: dispositionAuditPrefix(addressId),
        label: "OrbitDbDispositionStorageAdapter.audit"
      }),
      auditOrphan: new PrefixSyncWriter({
        ...common,
        keyPrefix: dispositionAuditOrphanPrefix(addressId),
        label: "OrbitDbDispositionStorageAdapter.auditOrphan"
      })
    };
  }
};
function dispositionInvalidPrefix(addressId) {
  return `${addressId}.invalid.`;
}
function dispositionInvalidOrphanPrefix(addressId) {
  return `${addressId}.invalid-orphan.`;
}
function dispositionAuditPrefix(addressId) {
  return `${addressId}.audit.`;
}
function dispositionAuditOrphanPrefix(addressId) {
  return `${addressId}.audit-orphan.`;
}

// profile/finalization-queue-storage-adapter.ts
init_logger();
init_encryption();
init_oplog_envelope_io();
var SCHEMA_VERSION = "uxf-1";
function isTombstone2(value) {
  return typeof value === "object" && value !== null && value.tombstoned === true;
}
var OrbitDbFinalizationQueueStorageAdapter = class {
  db;
  encryptionKey;
  notifyProfileDirty;
  constructor(opts) {
    this.db = opts.db;
    this.encryptionKey = opts.encryptionKey;
    this.notifyProfileDirty = opts.notifyProfileDirty ?? null;
  }
  /**
   * Item #15 Phase C — guarded invocation of the host's dirty signal.
   * Errors are swallowed silently so a misbehaving notifier cannot
   * propagate into the writer's error path.
   */
  emitProfileDirty() {
    if (this.notifyProfileDirty === null) return;
    try {
      this.notifyProfileDirty();
    } catch {
    }
  }
  async readKey(key) {
    const raw2 = await getEnvelopePayload(this.db, key);
    if (raw2 === null) return null;
    try {
      return await decryptString(this.encryptionKey, raw2);
    } catch (err) {
      logger.warn(
        "OrbitDbFinalizationQueueStorageAdapter",
        `decode failed at key="${key}": ${err instanceof Error ? err.message : String(err)}`
      );
      return null;
    }
  }
  async writeKey(key, value) {
    let stamped;
    try {
      const parsed = JSON.parse(value);
      if (parsed !== null && typeof parsed === "object" && !isTombstone2(parsed)) {
        const withDiscriminator = {
          _schemaVersion: SCHEMA_VERSION,
          ...parsed
        };
        stamped = JSON.stringify(withDiscriminator);
      } else {
        stamped = value;
      }
    } catch {
      stamped = value;
    }
    const ciphertext = await encryptString(this.encryptionKey, stamped);
    await putEnvelopePayload(this.db, key, ciphertext);
    this.emitProfileDirty();
  }
  async listByPrefix(prefix) {
    const out = /* @__PURE__ */ new Map();
    let entries;
    try {
      entries = await this.db.all(prefix);
    } catch (err) {
      logger.warn(
        "OrbitDbFinalizationQueueStorageAdapter",
        `listByPrefix("${prefix}") failed: ${err instanceof Error ? err.message : String(err)}`
      );
      return out;
    }
    for (const key of entries.keys()) {
      if (!key.startsWith(prefix)) continue;
      const entryId = key.slice(prefix.length);
      if (entryId.length === 0) continue;
      out.set(key, entryId);
    }
    return out;
  }
  async deleteKey(key) {
    await this.db.del(key);
    this.emitProfileDirty();
  }
  // ===========================================================================
  // Item #15 Phase B.5 — full-profile-snapshot sync API
  // ===========================================================================
  /**
   * Return a {@link ProfileSyncWriter} scoped to
   * `${addressId}.finalizationQueue.*`. Each finalization-queue entry
   * is content-immutable per key (the `entryId` disambiguator ensures
   * two replicas writing the same entry produce equivalent content);
   * the merge therefore uses constant-Lamport semantics via
   * {@link PrefixSyncWriter}.
   *
   * Sticky-tombstone semantics: once a queue entry is removed on
   * either replica, the JOIN preserves the tombstone across both
   * sides. Mirrors {@link FinalizationQueue.remove}'s intent.
   */
  syncWriterFor(addressId) {
    return new PrefixSyncWriter({
      db: this.db,
      encryptionKey: this.encryptionKey,
      keyPrefix: `${addressId}.finalizationQueue.`,
      validateValue: validateUxf1Schema,
      label: "OrbitDbFinalizationQueueStorageAdapter.sync",
      // Item #15 Phase C — propagate the adapter's notifier so JOIN-
      // applied remote changes mark the profile dirty alongside
      // local writeKey/deleteKey mutations.
      notifyProfileDirty: this.notifyProfileDirty ?? void 0
    });
  }
};
function requestContextKey(addr, requestId) {
  return `${addr}.recipientContext.request.${requestId}`;
}
function finalizationContextKey(addr, tokenId) {
  return `${addr}.recipientContext.finalization.${tokenId}`;
}
function finalizationContextPrefix(addr) {
  return `${addr}.recipientContext.finalization.`;
}
function requestContextPrefix(addr) {
  return `${addr}.recipientContext.request.`;
}
var OrbitDbRecipientContextStorageAdapter = class {
  db;
  encryptionKey;
  notifyProfileDirty;
  constructor(opts) {
    this.db = opts.db;
    this.encryptionKey = opts.encryptionKey;
    this.notifyProfileDirty = opts.notifyProfileDirty ?? null;
  }
  /**
   * Item #15 Phase C — guarded invocation of the host's dirty signal.
   */
  emitProfileDirty() {
    if (this.notifyProfileDirty === null) return;
    try {
      this.notifyProfileDirty();
    } catch {
    }
  }
  async writeRequestContext(addr, requestId, record) {
    const key = requestContextKey(addr, requestId);
    const stamped = { _schemaVersion: SCHEMA_VERSION, ...record };
    const json = JSON.stringify(stamped);
    const ciphertext = await encryptString(this.encryptionKey, json);
    await putEnvelopePayload(this.db, key, ciphertext);
    this.emitProfileDirty();
  }
  async readRequestContext(addr, requestId) {
    const key = requestContextKey(addr, requestId);
    const raw2 = await getEnvelopePayload(this.db, key);
    if (raw2 === null) return void 0;
    return this.tryDecode(raw2, key);
  }
  async deleteRequestContext(addr, requestId) {
    await this.db.del(requestContextKey(addr, requestId));
    this.emitProfileDirty();
  }
  async writeFinalizationContext(addr, tokenId, record) {
    const key = finalizationContextKey(addr, tokenId);
    const stamped = { _schemaVersion: SCHEMA_VERSION, ...record };
    const json = JSON.stringify(stamped);
    const ciphertext = await encryptString(this.encryptionKey, json);
    await putEnvelopePayload(this.db, key, ciphertext);
    this.emitProfileDirty();
  }
  async readFinalizationContext(addr, tokenId) {
    const key = finalizationContextKey(addr, tokenId);
    const raw2 = await getEnvelopePayload(this.db, key);
    if (raw2 === null) return void 0;
    return this.tryDecode(raw2, key);
  }
  async deleteFinalizationContext(addr, tokenId) {
    await this.db.del(finalizationContextKey(addr, tokenId));
    this.emitProfileDirty();
  }
  /**
   * Enumerate every `RecipientFinalizationContext` record under `addr`.
   * Used by `PaymentsModule.initialize()` to re-hydrate the in-memory
   * `_recipientFinalizationContext` Map on restart.
   */
  async listAllFinalizationContexts(addr) {
    const out = /* @__PURE__ */ new Map();
    const prefix = finalizationContextPrefix(addr);
    let entries;
    try {
      entries = await this.db.all(prefix);
    } catch (err) {
      logger.warn(
        "OrbitDbRecipientContextStorageAdapter",
        `listAllFinalizationContexts("${addr}") failed: ${err instanceof Error ? err.message : String(err)}`
      );
      return out;
    }
    for (const [key, ciphertext] of entries) {
      if (!key.startsWith(prefix)) continue;
      const tokenId = key.slice(prefix.length);
      if (tokenId.length === 0) continue;
      const decoded = await this.tryDecode(
        ciphertext,
        key
      );
      if (decoded === void 0) continue;
      out.set(tokenId, decoded);
    }
    return out;
  }
  /**
   * Enumerate every `RequestContext` record under `addr`. Used by
   * `PaymentsModule.initialize()` to re-hydrate the in-memory
   * `_recipientRequestContextMap` on restart.
   */
  async listAllRequestContexts(addr) {
    const out = /* @__PURE__ */ new Map();
    const prefix = requestContextPrefix(addr);
    let entries;
    try {
      entries = await this.db.all(prefix);
    } catch (err) {
      logger.warn(
        "OrbitDbRecipientContextStorageAdapter",
        `listAllRequestContexts("${addr}") failed: ${err instanceof Error ? err.message : String(err)}`
      );
      return out;
    }
    for (const [key, ciphertext] of entries) {
      if (!key.startsWith(prefix)) continue;
      const reqId = key.slice(prefix.length);
      if (reqId.length === 0) continue;
      const decoded = await this.tryDecode(
        ciphertext,
        key
      );
      if (decoded === void 0) continue;
      out.set(reqId, decoded);
    }
    return out;
  }
  // ---------------------------------------------------------------------------
  // Private — encode / decode
  // ---------------------------------------------------------------------------
  async tryDecode(raw2, key) {
    const ciphertext = unwrapEnvelopeBytes(raw2);
    try {
      const json = await decryptString(this.encryptionKey, ciphertext);
      const parsed = JSON.parse(json);
      if (isTombstone2(parsed)) return void 0;
      return parsed;
    } catch (err) {
      logger.warn(
        "OrbitDbRecipientContextStorageAdapter",
        `decode failed at key="${key}": ${err instanceof Error ? err.message : String(err)}`
      );
      return void 0;
    }
  }
  // ===========================================================================
  // Item #15 Phase B.5 — full-profile-snapshot sync API
  // ===========================================================================
  /**
   * Return the two {@link ProfileSyncWriter}s scoped to this address's
   * recipient-context state: one for `recipientContext.request.*` (keyed
   * by requestId) and one for `recipientContext.finalization.*` (keyed
   * by tokenId).
   *
   * Both surfaces are content-immutable per key (PaymentsModule writes
   * each requestId / tokenId exactly once during the in-flight transfer
   * lifecycle); the merge uses constant-Lamport semantics via
   * {@link PrefixSyncWriter}.
   *
   * The two sync writers are returned together because they cover the
   * same logical "recipient-context" namespace under different
   * sub-prefixes — the Phase D dispatcher invokes both per JOIN cycle.
   */
  syncWritersFor(addressId) {
    const notifier = this.notifyProfileDirty ?? void 0;
    return {
      requestContext: new PrefixSyncWriter({
        db: this.db,
        encryptionKey: this.encryptionKey,
        keyPrefix: requestContextPrefix(addressId),
        validateValue: validateUxf1Schema,
        label: "OrbitDbRecipientContextStorageAdapter.sync.request",
        notifyProfileDirty: notifier
      }),
      finalizationContext: new PrefixSyncWriter({
        db: this.db,
        encryptionKey: this.encryptionKey,
        keyPrefix: finalizationContextPrefix(addressId),
        validateValue: validateUxf1Schema,
        label: "OrbitDbRecipientContextStorageAdapter.sync.finalization",
        notifyProfileDirty: notifier
      })
    };
  }
};
function validateUxf1Schema(parsed) {
  if (parsed === null || typeof parsed !== "object") return false;
  if (Array.isArray(parsed)) return false;
  return parsed._schemaVersion === SCHEMA_VERSION;
}

// profile/outbox-writer.ts
init_errors3();

// types/uxf-outbox.ts
var UXF_OUTBOX_STATUSES = [
  "packaging",
  "pinned",
  "sending",
  "delivered",
  "delivered-instant",
  "finalizing",
  "finalized",
  "failed-transient",
  "failed-permanent",
  "failed-conflict",
  "expired"
];
function isUxfOutboxStatus(value) {
  return typeof value === "string" && UXF_OUTBOX_STATUSES.includes(value);
}
function isUxfTransferOutboxEntry(value) {
  if (value === null || typeof value !== "object") return false;
  const obj = value;
  if (obj._schemaVersion !== "uxf-1") return false;
  if (typeof obj.id !== "string" || obj.id.length === 0) return false;
  if (typeof obj.bundleCid !== "string") return false;
  if (!Array.isArray(obj.tokenIds)) return false;
  if (typeof obj.deliveryMethod !== "string") return false;
  if (typeof obj.recipient !== "string") return false;
  if (typeof obj.recipientTransportPubkey !== "string") return false;
  if (typeof obj.mode !== "string") return false;
  if (!isUxfOutboxStatus(obj.status)) return false;
  if (!Number.isInteger(obj.lamport) || obj.lamport < 0) return false;
  if (typeof obj.submitRetryCount !== "number") return false;
  if (typeof obj.proofErrorCount !== "number") return false;
  if (!Number.isInteger(obj.createdAt) || obj.createdAt < 0) return false;
  if (!Number.isInteger(obj.updatedAt) || obj.updatedAt < 0) return false;
  if (obj.nostrEventId !== void 0) {
    if (typeof obj.nostrEventId !== "string" || obj.nostrEventId.length === 0) {
      return false;
    }
  }
  if (obj.tokenIds.length > MAX_TOKEN_IDS_PER_ENTRY) return false;
  for (const t of obj.tokenIds) {
    if (typeof t !== "string") return false;
    if (t.length === 0 || t.length > MAX_TOKEN_ID_LENGTH) return false;
  }
  if (obj.bundleCid.length > MAX_BUNDLE_CID_LENGTH) return false;
  if (obj.recipient.length > MAX_RECIPIENT_LENGTH) return false;
  if (obj.recipientTransportPubkey.length > MAX_TRANSPORT_PUBKEY_LENGTH) return false;
  if (!isWithinOptionalStringLength(obj.recipientNametag, MAX_NAMETAG_LENGTH)) return false;
  if (!isWithinOptionalStringLength(obj.memo, MAX_MEMO_LENGTH)) return false;
  if (!isWithinOptionalStringLength(obj.error, MAX_ERROR_LENGTH)) return false;
  if (obj.nostrEventId !== void 0 && typeof obj.nostrEventId === "string" && obj.nostrEventId.length > MAX_NOSTR_EVENT_ID_LENGTH) {
    return false;
  }
  if (obj.outstandingRequestIds !== void 0) {
    if (!Array.isArray(obj.outstandingRequestIds)) return false;
    if (obj.outstandingRequestIds.length > MAX_TOKEN_IDS_PER_ENTRY) return false;
    for (const r of obj.outstandingRequestIds) {
      if (typeof r !== "string") return false;
      if (r.length === 0 || r.length > MAX_TOKEN_ID_LENGTH) return false;
    }
  }
  if (obj.completedRequestIds !== void 0) {
    if (!Array.isArray(obj.completedRequestIds)) return false;
    if (obj.completedRequestIds.length > MAX_TOKEN_IDS_PER_ENTRY) return false;
    for (const r of obj.completedRequestIds) {
      if (typeof r !== "string") return false;
      if (r.length === 0 || r.length > MAX_TOKEN_ID_LENGTH) return false;
    }
  }
  return true;
}
function isLegacyOutboxEntry(value) {
  if (value === null || typeof value !== "object") return false;
  const obj = value;
  if ("_schemaVersion" in obj) return false;
  if (typeof obj.id !== "string" || obj.id.length === 0) return false;
  if (typeof obj.sourceTokenId !== "string") return false;
  if (typeof obj.recipientPubkey !== "string") return false;
  const legacyStatuses = ["pending", "submitted", "confirmed", "delivered", "failed"];
  if (typeof obj.status !== "string" || !legacyStatuses.includes(obj.status)) {
    return false;
  }
  return true;
}
function classifyOutboxEntryShape(value) {
  if (isUxfTransferOutboxEntry(value)) return "uxf-1";
  if (isLegacyOutboxEntry(value)) return "legacy";
  return "unknown";
}

// profile/outbox-writer.ts
init_encryption();
init_oplog_envelope_io();

// profile/outbox-state-machine.ts
init_errors3();
var ALLOWED_TRANSITIONS = [
  // packaging → ...
  { from: "packaging", to: "pinned", condition: { kind: "unconditional" } },
  { from: "packaging", to: "sending", condition: { kind: "unconditional" } },
  // pinned → ...
  { from: "pinned", to: "sending", condition: { kind: "unconditional" } },
  { from: "pinned", to: "failed-transient", condition: { kind: "unconditional" } },
  // T.4.A — permanent pin failure short-circuit. The orchestrator transitions
  // `packaging → pinned` eagerly (when about to call IPFS pin) so that on a
  // hard pin failure the entry can be moved straight to `failed-permanent`
  // without spuriously claiming success. Spec §3.3.2 paragraph (pin
  // permanently fails → `failed-permanent`); reflected in the impl plan
  // T.4.A acceptance ("pinned → failed-permanent"). Nostr publish MUST NOT
  // happen if pin fails — the orchestrator skips the publish on this arc.
  { from: "pinned", to: "failed-permanent", condition: { kind: "unconditional" } },
  // sending → ...
  { from: "sending", to: "delivered", condition: { kind: "unconditional" } },
  { from: "sending", to: "delivered-instant", condition: { kind: "unconditional" } },
  { from: "sending", to: "failed-transient", condition: { kind: "unconditional" } },
  // delivered → expired (retention window)
  { from: "delivered", to: "expired", condition: { kind: "unconditional" } },
  // delivered → sending (OUTBOX-SEND-FOLLOWUPS item #2 — retention re-publish)
  //
  // The NostrPersistenceVerifier observes that a previously-delivered
  // bundle is no longer retained on the relay. To re-arm the
  // SendingRecoveryWorker for a re-publish without inventing a new
  // status, the verifier transitions the live OUTBOX entry back to
  // `'sending'`. The original SENT-ledger entry remains the durable
  // record of the historical delivery; the recipient's replay-LRU
  // dedupes any extra publish by `bundleCid`.
  { from: "delivered", to: "sending", condition: { kind: "unconditional" } },
  // delivered-instant → finalizing (worker starts)
  { from: "delivered-instant", to: "finalizing", condition: { kind: "unconditional" } },
  // delivered-instant → sending (OUTBOX-SEND-FOLLOWUPS item #2 — retention re-publish)
  //
  // Symmetric to `delivered → sending`, applied when the verifier
  // observes a retention drop on an instant-mode entry that has not
  // yet finalized. The recovery worker republishes; on success the
  // entry returns to `'delivered-instant'` and the finalization flow
  // resumes from there.
  { from: "delivered-instant", to: "sending", condition: { kind: "unconditional" } },
  // finalizing → ...
  { from: "finalizing", to: "finalized", condition: { kind: "unconditional" } },
  { from: "finalizing", to: "failed-permanent", condition: { kind: "unconditional" } },
  { from: "finalizing", to: "failed-transient", condition: { kind: "unconditional" } },
  // failed-transient → ... (retry / cap)
  { from: "failed-transient", to: "sending", condition: { kind: "unconditional" } },
  { from: "failed-transient", to: "failed-permanent", condition: { kind: "unconditional" } },
  // failed-permanent → finalizing (operator escape-hatch override only)
  { from: "failed-permanent", to: "finalizing", condition: { kind: "override" } },
  // OUTBOX-SEND-FOLLOWUPS Item #14 Phase 1 — failed-conflict (NEW)
  //
  // The aggregator rejected our `submitTransferCommitment` because the
  // source `stateHash` is already spent on-chain. The dispatcher
  // confirms this via `oracle.isSpent(sourceStateHash)` and routes
  // the OUTBOX entry to the new `failed-conflict` terminal.
  //
  // Reachable from any active state where commit-submission is
  // possible. In practice for greenfield sends the OUTBOX entry does
  // NOT yet exist at the submit throw site (it is created AFTER the
  // commit step in conservative/instant senders); these arcs cover
  // future recovery paths that detect the spent state on an entry
  // already past `packaging`/`pinned`/`sending`. The orchestrator
  // also runs the recovery worker after a retention re-publish drops
  // the entry back to `'sending'`; if that re-submitted commit hits
  // the spent state, the entry transitions `sending → failed-conflict`.
  //
  // `delivered → failed-conflict` / `delivered-instant → failed-conflict`:
  // covers the case where the worker re-armed the entry back to
  // `sending` via retention re-publish and a subsequent classification
  // detects the spent state mid-arc. Conservative — preserves the
  // operator-visible signal even when the worker drops the entry
  // back to `'delivered'` before re-arming.
  //
  // failed-conflict is TERMINAL except via the operator-override
  // escape hatch (mirrors `failed-permanent`).
  { from: "packaging", to: "failed-conflict", condition: { kind: "unconditional" } },
  { from: "pinned", to: "failed-conflict", condition: { kind: "unconditional" } },
  { from: "sending", to: "failed-conflict", condition: { kind: "unconditional" } },
  { from: "delivered", to: "failed-conflict", condition: { kind: "unconditional" } },
  { from: "delivered-instant", to: "failed-conflict", condition: { kind: "unconditional" } },
  { from: "failed-conflict", to: "finalizing", condition: { kind: "override" } },
  // finalized → expired (retention window)
  { from: "finalized", to: "expired", condition: { kind: "unconditional" } }
  // expired — TERMINAL (no outgoing arcs)
  // failed-permanent — TERMINAL except via the override row above
  // failed-conflict — TERMINAL except via the override row above
];
function validateTransition(ctx) {
  if (!isUxfOutboxStatus(ctx.from)) {
    return {
      ok: false,
      code: "no-such-arc",
      reason: `INVALID_OUTBOX_TRANSITION: from-status "${String(ctx.from)}" is not a canonical UxfOutboxStatus`
    };
  }
  if (!isUxfOutboxStatus(ctx.to)) {
    return {
      ok: false,
      code: "no-such-arc",
      reason: `INVALID_OUTBOX_TRANSITION: to-status "${String(ctx.to)}" is not a canonical UxfOutboxStatus`
    };
  }
  if (ctx.from === ctx.to) {
    return {
      ok: false,
      code: "no-such-arc",
      reason: `INVALID_OUTBOX_TRANSITION: ${ctx.from} \u2192 ${ctx.to} (self-loop is not a legal status transition)`
    };
  }
  const row = ALLOWED_TRANSITIONS.find(
    (r) => r.from === ctx.from && r.to === ctx.to
  );
  if (!row) {
    return {
      ok: false,
      code: "no-such-arc",
      reason: `INVALID_OUTBOX_TRANSITION: ${ctx.from} \u2192 ${ctx.to} (no such arc in \xA77.0 table)`
    };
  }
  switch (row.condition.kind) {
    case "unconditional":
      return { ok: true };
    case "override":
      if (ctx.overrideApplied === true) return { ok: true };
      return {
        ok: false,
        code: "override-required",
        reason: `INVALID_OUTBOX_TRANSITION: ${ctx.from} \u2192 ${ctx.to} requires overrideApplied=true (operator escape-hatch per \xA77.0)`
      };
    case "dual-write":
      if (ctx.dualWriteEnabled === true) return { ok: true };
      return {
        ok: false,
        code: "dual-write-disabled",
        reason: `INVALID_OUTBOX_TRANSITION: ${ctx.from} \u2192 ${ctx.to} requires dualWriteEnabled=true (\xA77.B migration window only)`
      };
  }
}
function assertTransition(ctx) {
  const result = validateTransition(ctx);
  if (result.ok) return;
  throw new SphereError(result.reason, "INVALID_OUTBOX_TRANSITION", {
    from: ctx.from,
    to: ctx.to,
    code: result.code
  });
}

// profile/outbox-writer.ts
var OutboxWriter = class {
  db;
  encryptionKey;
  addressId;
  lamport;
  keyPrefix;
  notifyProfileDirty;
  constructor(options) {
    if (!options.addressId || options.addressId.length === 0) {
      throw new SphereError(
        "OutboxWriter: addressId must be a non-empty string",
        "VALIDATION_ERROR"
      );
    }
    if (!/^DIRECT_[0-9a-f]{6}_[0-9a-f]{6}$/.test(options.addressId)) {
      throw new SphereError(
        `OutboxWriter: addressId must match DIRECT_[0-9a-f]{6}_[0-9a-f]{6} (got: ${options.addressId})`,
        "VALIDATION_ERROR"
      );
    }
    this.db = options.db;
    this.encryptionKey = options.encryptionKey;
    this.addressId = options.addressId;
    this.lamport = options.lamport;
    this.keyPrefix = `${this.addressId}.outbox.`;
    this.notifyProfileDirty = options.notifyProfileDirty ?? null;
  }
  /**
   * Item #15 Phase C — invoke the host's `notifyProfileDirty` callback
   * (if wired). Guarded so a misbehaving notifier cannot break a mutation
   * path; errors are swallowed silently (the dirty signal is best-effort
   * — the next flush will pick up the state regardless).
   */
  emitProfileDirty() {
    if (this.notifyProfileDirty === null) return;
    try {
      this.notifyProfileDirty();
    } catch {
    }
  }
  /**
   * Compose the on-disk key for an entry id.
   * Exposed for callers that need to read raw values directly (tests).
   */
  keyFor(id) {
    return `${this.keyPrefix}${id}`;
  }
  /**
   * Write a new entry — or replace an existing one — at
   * `${addr}.outbox.${entry.id}`. Stamps `_schemaVersion: 'uxf-1'`,
   * `updatedAt`, and a Lamport bumped per §7.1 invariants.
   *
   * The Lamport bump observes:
   *   - the current local clock value
   *   - every concurrently-stored entry's `lamport` field (read via
   *     prefix-scan)
   * and writes `next = max(local, observedRemotes) + 1`.
   *
   * Idempotent on the input shape: writing the same `entry` twice
   * produces two distinct Lamport stamps but the same `id` slot is
   * overwritten — second write wins.
   */
  async write(input, options) {
    if (typeof input.id !== "string" || input.id.length === 0) {
      throw new SphereError(
        "OutboxWriter.write: input.id must be a non-empty string",
        "VALIDATION_ERROR"
      );
    }
    if (options?.allowResurrection !== true) {
      const existing = await this.readTombstoneAt(input.id);
      if (existing !== null) {
        throw new SphereError(
          `OutboxWriter.write: refusing to resurrect tombstoned slot "${input.id}" (tombstone lamport=${existing.lamport}, deletedAt=${existing.deletedAt}). If this is intentional (operator escape-hatch / test fixture), pass { allowResurrection: true }.`,
          "OUTBOX_ENTRY_TOMBSTONED"
        );
      }
    }
    const observedLamports = await this.collectObservedLamports();
    this.lamport.rehydrate(observedLamports);
    const next = this.lamport.bumpFor([]);
    const updatedAt = input.updatedAt ?? Date.now();
    const everFinalizing = input.everFinalizing === true || input.status === "finalizing" ? true : void 0;
    const stamped = {
      ...input,
      _schemaVersion: "uxf-1",
      lamport: next,
      updatedAt,
      ...everFinalizing === true ? { everFinalizing: true } : {}
    };
    await this.writeRaw(stamped.id, JSON.stringify(stamped));
    this.emitProfileDirty();
    return stamped;
  }
  /**
   * Apply `mutator` to an existing entry, then write the result with a
   * bumped Lamport. Throws `OUTBOX_ENTRY_NOT_FOUND` if no live entry
   * exists at the key (the prior value was a tombstone or missing).
   *
   * The mutator runs on the immutable input; it MAY return a new object
   * or a structural copy. The writer does NOT enforce immutability of
   * unrelated fields — callers are responsible for honoring the spec's
   * monotonic invariants (e.g., G-counter shape on `submitRetryCount`).
   */
  async update(id, mutator) {
    if (typeof id !== "string" || id.length === 0) {
      throw new SphereError(
        "OutboxWriter.update: id must be a non-empty string",
        "VALIDATION_ERROR"
      );
    }
    const existing = await this.readOne(id);
    if (existing === null || existing.shape !== "uxf-1") {
      throw new SphereError(
        `OutboxWriter.update: no live UXF outbox entry at id "${id}"`,
        "OUTBOX_ENTRY_NOT_FOUND"
      );
    }
    const next = mutator(existing.entry);
    if (next.id !== id) {
      throw new SphereError(
        `OutboxWriter.update: mutator must not change entry.id (got "${next.id}", expected "${id}")`,
        "VALIDATION_ERROR"
      );
    }
    if (next.status !== existing.entry.status) {
      assertTransition({
        from: existing.entry.status,
        to: next.status,
        // The override flag is sticky (set-OR per §7.1) — a true on the
        // NEW entry permits the `failed-permanent → finalizing` arc. The
        // PREV entry's flag is irrelevant: the override is "applied" by
        // the same write that performs the transition.
        overrideApplied: next.overrideApplied === true,
        // Per-status dual-write arcs are not currently in the table; the
        // W43 schema-mode arcs are validated separately by
        // `assertDualWriteArc()`. Pass `false` so any future spec
        // revision adding a status-level dual-write row defaults safely.
        dualWriteEnabled: false
      });
    }
    const writeInput = stripWriterStampedFields(next);
    return this.write(writeInput);
  }
  /**
   * Tombstone the entry at `${addr}.outbox.${id}`. Subsequent
   * {@link readAll}/{@link readOne} calls return null for this id.
   *
   * Idempotent: tombstoning an already-tombstoned key (or a missing key)
   * is a no-op apart from refreshing `deletedAt`.
   *
   * Per-entry-key isolation: deleting `b` does NOT modify entries `a`
   * or `c`. The on-disk tombstone remains until the provider's flush
   * path GCs it after the retention window (§ Wave G.7 retention rule).
   */
  async delete(id) {
    if (typeof id !== "string" || id.length === 0) {
      throw new SphereError(
        "OutboxWriter.delete: id must be a non-empty string",
        "VALIDATION_ERROR"
      );
    }
    const observedLamports = await this.collectObservedLamports();
    this.lamport.rehydrate(observedLamports);
    const lamport = this.lamport.bumpFor([]);
    const tombstone = JSON.stringify({
      tombstoned: true,
      deletedAt: Date.now(),
      lamport
    });
    await this.writeRaw(id, tombstone);
    this.emitProfileDirty();
  }
  /**
   * OUTBOX-SEND-FOLLOWUPS item #4 — reclaim storage occupied by
   * tombstones older than `opts.retentionMs`.
   *
   * Tombstone semantics. `delete(id)` writes a tombstone marker
   * (`{ tombstoned: true, deletedAt, lamport }`) at the entry's key
   * rather than calling `db.del()`. This is load-bearing for the
   * Issue #166 P1 #2 refuse-write guard — without the durable
   * tombstone marker, a concurrent replica's pre-sync state could
   * resurrect a completed delivery. But tombstones never go away,
   * so the OrbitDB log grows monotonically.
   *
   * After enough time has passed that no replica can still hold a
   * pre-sync state for the slot, the marker can be safely replaced
   * with an actual `db.del()` to reclaim space. 30 days is the
   * conservative default the doc prescribes; callers tune via
   * `retentionMs`.
   *
   * **What this method does:**
   *  1. Prefix-scans all keys under the writer's address.
   *  2. For each key, classifies the slot shape (`value` /
   *     `tombstone`).
   *  3. For tombstones where `(now - deletedAt) > retentionMs`,
   *     calls `db.del(key)`.
   *  4. Returns counts for diagnostics.
   *
   * **Idempotent.** Re-running after a successful sweep is a no-op
   * (the tombstones are gone). The Lamport monotonicity invariant
   * is preserved — once the actual key is `del()`'d, future writes
   * to the same id rehydrate the clock from observed live entries
   * only, and a fresh slot is born with a Lamport ≥ max(observed) + 1.
   *
   * **Safety contract.** Sweeping a tombstone that is still within
   * any concurrent replica's pre-sync horizon can resurrect the
   * slot. Callers MUST ensure `retentionMs` exceeds the longest
   * realistic replica re-sync window. The 30-day default is large
   * enough that even fortnight-long offline replicas converge before
   * sweep.
   */
  async gcExpiredTombstones(opts) {
    if (typeof opts.retentionMs !== "number" || !Number.isFinite(opts.retentionMs) || opts.retentionMs < 0) {
      throw new SphereError(
        `OutboxWriter.gcExpiredTombstones: retentionMs must be a non-negative finite number (got ${String(opts.retentionMs)})`,
        "VALIDATION_ERROR"
      );
    }
    const nowMs = typeof opts.now === "number" && Number.isFinite(opts.now) ? opts.now : Date.now();
    let entries;
    try {
      entries = await this.db.all(this.keyPrefix);
    } catch {
      return { scanned: 0, purged: 0, kept: 0, skipped: true };
    }
    let scanned = 0;
    let purged = 0;
    let kept = 0;
    for (const key of entries.keys()) {
      if (!key.startsWith(this.keyPrefix)) continue;
      const shape = await this.readSlotShape(key);
      if (shape === null) continue;
      if (shape.kind !== "tombstone") continue;
      scanned += 1;
      if (shape.deletedAt === 0) {
        kept += 1;
        continue;
      }
      if (nowMs - shape.deletedAt <= opts.retentionMs) {
        kept += 1;
        continue;
      }
      try {
        await this.db.del(key);
        purged += 1;
      } catch {
        kept += 1;
      }
    }
    if (purged > 0) this.emitProfileDirty();
    return { scanned, purged, kept, skipped: false };
  }
  // ===========================================================================
  // Item #15 Phase B — full-profile-snapshot sync API
  // ===========================================================================
  /**
   * Return every entry under `${addr}.outbox.*` as raw encrypted bytes
   * for the lean-snapshot builder (Item #15 Phase B). Includes BOTH
   * live entries AND tombstones — receivers need the tombstone bytes
   * to converge on deletes.
   *
   * The bytes are returned exactly as `db.get(key)` produced them (AES-
   * 256-GCM ciphertext when constructed with an encryptionKey, or
   * plaintext JSON when not). The receiving peer's `joinSnapshot()`
   * decrypts with the same wallet key and applies the merge table.
   *
   * Stable order: ascending lexicographic key.
   */
  async snapshot() {
    let entries;
    try {
      entries = await this.db.all(this.keyPrefix);
    } catch {
      return [];
    }
    const out = [];
    const sortedKeys = [...entries.keys()].sort();
    for (const key of sortedKeys) {
      if (!key.startsWith(this.keyPrefix)) continue;
      const encryptedValue = entries.get(key);
      if (encryptedValue === void 0) continue;
      out.push({ key, encryptedValue });
    }
    return out;
  }
  /**
   * Apply a remote peer's outbox snapshot against this writer's local
   * OrbitDB state (Item #15 Phase B). For each remote entry, the merge
   * table decides whether to keep local or persist the remote's bytes
   * verbatim.
   *
   * **Tombstone resurrection invariant** carries over: a tombstone on
   * either side at lamport ≥ the live counterpart wins, mirroring the
   * Issue #166 P1 #2 refuse-write guard at JOIN time.
   *
   * **Lamport bumping is intentionally bypassed.** Remote bytes already
   * carry a Lamport stamp from the remote's bump. Re-bumping at JOIN
   * would inflate this peer's clock past the remote's intent and break
   * convergence (the next snapshot would forever look "newer" than the
   * remote's). The local clock observes the freshly-landed Lamports on
   * the next live write via `collectObservedLamports` + `rehydrate`,
   * which IS the correct entry point for absorbing remote state into
   * the clock.
   *
   * **Legacy entries** (pre-§7.0, no `_schemaVersion`):
   *   - Remote legacy → rejected as malformed. Legacy entries do not
   *     propagate via the lean-snapshot path; the §7.2 migration window
   *     handles their forward conversion.
   *   - Local legacy → treated as `live` with `lamport=0`. Any uxf-1
   *     remote (which always has `lamport ≥ 1`) therefore overwrites
   *     it, completing the migration as a side effect of sync.
   *
   * **Out-of-bounds Lamports** in remote entries are rejected per
   * `MAX_SAFE_LAMPORT` — the JOIN-time counterpart of the W39 bounds
   * defence on Lamport.bumpFor.
   */
  async joinSnapshot(remote) {
    const result = await runJoinSnapshot(remote, {
      classifyLocal: async (key) => {
        if (!key.startsWith(this.keyPrefix)) return { kind: "absent" };
        const shape = await this.readSlotShape(key);
        const slot = this.classifyToMergeSlot(
          shape,
          /* remote = */
          false
        );
        return slot ?? { kind: "absent" };
      },
      classifyRemote: async (entry) => {
        if (!entry.key.startsWith(this.keyPrefix)) return null;
        const shape = await this.classifyRawBytes(entry.encryptedValue);
        return this.classifyToMergeSlot(
          shape,
          /* remote = */
          true
        );
      },
      writeRemote: async (key, bytes) => {
        await this.db.put(key, bytes);
      }
    });
    if (result.liveLanded > 0 || result.tombstonesLanded > 0) {
      this.emitProfileDirty();
    }
    return result;
  }
  /**
   * Map our private `readSlotShape` discriminated union into the
   * `ClassifiedSlot` shape consumed by the shared merge primitive.
   *
   * @param shape  The output of `readSlotShape` / `classifyRawBytes`.
   * @param remote `true` for remote bytes (stricter — legacy entries
   *               are rejected so they cannot propagate); `false` for
   *               local bytes (legacy is mapped to `live lamport=0`
   *               so any uxf-1 remote can overwrite it on sync).
   */
  classifyToMergeSlot(shape, remote) {
    if (shape === null) {
      return remote ? null : { kind: "absent" };
    }
    if (shape.kind === "tombstone") {
      const lamport = validateLamport(shape.lamport);
      if (lamport === null) {
        return remote ? null : { kind: "absent" };
      }
      return { kind: "tombstone", lamport };
    }
    if (isUxfTransferOutboxEntry(shape.value)) {
      const lamport = validateLamport(shape.value.lamport);
      if (lamport === null) return remote ? null : { kind: "absent" };
      return { kind: "live", lamport };
    }
    if (isLegacyOutboxEntry(shape.value)) {
      if (remote) return null;
      return { kind: "live", lamport: 0 };
    }
    return remote ? null : { kind: "absent" };
  }
  /**
   * Decrypt + parse a raw byte buffer using the writer's standard
   * pipeline (size cap → decrypt → JSON parse → tombstone sniff).
   * Used by `joinSnapshot` to classify remote bytes without going
   * through `db.get`. Returns the same discriminated union as
   * `readSlotShape`.
   */
  async classifyRawBytes(raw2) {
    if (!raw2 || raw2.byteLength === 0) return null;
    if (raw2.byteLength > MAX_ENTRY_BYTES_RAW) return null;
    const ciphertext = unwrapEnvelopeBytes(raw2);
    let plaintextBytes;
    try {
      plaintextBytes = this.encryptionKey ? await decryptProfileValue(this.encryptionKey, ciphertext) : ciphertext;
    } catch {
      return null;
    }
    let parsed;
    try {
      parsed = JSON.parse(new TextDecoder().decode(plaintextBytes));
    } catch {
      return null;
    }
    if (parsed !== null && typeof parsed === "object" && "tombstoned" in parsed && parsed.tombstoned === true) {
      const p = parsed;
      const lamport = typeof p.lamport === "number" && Number.isInteger(p.lamport) && p.lamport >= 0 ? p.lamport : 0;
      const deletedAt = typeof p.deletedAt === "number" ? p.deletedAt : 0;
      return { kind: "tombstone", lamport, deletedAt };
    }
    return { kind: "value", value: parsed };
  }
  /**
   * Read a single entry at `${addr}.outbox.${id}`. Returns `null` if
   * the key is absent OR carries a tombstone marker. Returns a
   * classified union otherwise so callers can route by shape.
   */
  async readOne(id) {
    if (typeof id !== "string" || id.length === 0) {
      throw new SphereError(
        "OutboxWriter.readOne: id must be a non-empty string",
        "VALIDATION_ERROR"
      );
    }
    const decoded = await this.readDecoded(this.keyFor(id));
    if (decoded === null) return null;
    return this.classify(decoded);
  }
  /**
   * Prefix-scan all entries under `${addr}.outbox.*`. Skips tombstoned
   * keys and entries that fail to classify (corrupt JSON, partial
   * shapes). Stable order: ascending lexicographic key.
   */
  async readAll() {
    let entries;
    try {
      entries = await this.db.all(this.keyPrefix);
    } catch {
      return [];
    }
    const out = [];
    const sortedKeys = [...entries.keys()].sort();
    for (const key of sortedKeys) {
      if (!key.startsWith(this.keyPrefix)) continue;
      const decoded = await this.readDecoded(key);
      if (decoded === null) continue;
      const classified = this.classify(decoded);
      if (classified === null) continue;
      out.push(classified);
    }
    return out;
  }
  /**
   * Convenience: only the new-shape entries from {@link readAll}.
   */
  async readAllNew() {
    const all = await this.readAll();
    const out = [];
    for (const c of all) if (c.shape === "uxf-1") out.push(c.entry);
    return out;
  }
  /**
   * Convenience: only the legacy-shape entries from {@link readAll}.
   * Useful for the §7.2 migration window — callers can fold these into
   * synthetic UXF entries.
   */
  async readAllLegacy() {
    const all = await this.readAll();
    const out = [];
    for (const c of all) if (c.shape === "legacy") out.push(c.entry);
    return out;
  }
  // ===========================================================================
  // Private helpers
  // ===========================================================================
  /**
   * Collect every observed Lamport across all currently-stored UXF
   * outbox entries for the address. Used by the §7.1 bump rule.
   *
   * Legacy entries (no `lamport` field) contribute nothing — they are
   * outside the new CRDT regime and are migrated forward on first write
   * by T.6.B.
   */
  async collectObservedLamports() {
    let entries;
    try {
      entries = await this.db.all(this.keyPrefix);
    } catch {
      return [];
    }
    const out = [];
    for (const key of entries.keys()) {
      if (!key.startsWith(this.keyPrefix)) continue;
      const shape = await this.readSlotShape(key);
      if (shape === null) continue;
      if (shape.kind === "value") {
        if (isUxfTransferOutboxEntry(shape.value)) out.push(shape.value.lamport);
      } else if (shape.kind === "tombstone") {
        out.push(shape.lamport);
      }
    }
    return out;
  }
  /**
   * Issue #166 P1 #2 — check whether the slot at `id` is currently a
   * tombstone, and if so return its Lamport + deletedAt for the
   * refuse-write guard. Returns `null` for absent slots, live values,
   * and any decode/decrypt failures.
   *
   * Legacy tombstones (pre-#166, no `lamport` field) report
   * `lamport: 0` so the refusal still fires. The lamport field is
   * forensic for the error message; the refusal itself is unconditional
   * on the presence of the tombstone marker.
   */
  async readTombstoneAt(id) {
    const shape = await this.readSlotShape(this.keyFor(id));
    if (shape === null) return null;
    if (shape.kind !== "tombstone") return null;
    return { lamport: shape.lamport, deletedAt: shape.deletedAt };
  }
  /**
   * Issue #166 P1 #2 — read raw bytes at `key`, decrypt + parse, and
   * classify the slot. Returns a discriminated union so callers can
   * distinguish absent / tombstone / live value without re-decoding.
   *
   * `readDecoded()` remains the backward-compat surface (returns
   * `null` for absent + tombstone, the parsed value otherwise) — most
   * consumers want that semantics.
   */
  async readSlotShape(key) {
    let raw2;
    try {
      raw2 = await getEnvelopePayload(this.db, key);
    } catch {
      return null;
    }
    if (!raw2) return null;
    if (raw2.byteLength > MAX_ENTRY_BYTES_RAW) return null;
    let plaintextBytes;
    try {
      plaintextBytes = this.encryptionKey ? await decryptProfileValue(this.encryptionKey, raw2) : raw2;
    } catch {
      return null;
    }
    let parsed;
    try {
      parsed = JSON.parse(new TextDecoder().decode(plaintextBytes));
    } catch {
      return null;
    }
    if (parsed !== null && typeof parsed === "object" && "tombstoned" in parsed && parsed.tombstoned === true) {
      const p = parsed;
      const lamport = typeof p.lamport === "number" && Number.isInteger(p.lamport) && p.lamport >= 0 ? p.lamport : 0;
      const deletedAt = typeof p.deletedAt === "number" ? p.deletedAt : 0;
      return { kind: "tombstone", lamport, deletedAt };
    }
    return { kind: "value", value: parsed };
  }
  /**
   * Encrypt and write a JSON-encoded value at `${prefix}${id}`.
   */
  async writeRaw(id, value) {
    const encoded = new TextEncoder().encode(value);
    const toWrite = this.encryptionKey ? await encryptProfileValue(this.encryptionKey, encoded) : encoded;
    await putEnvelopePayload(this.db, this.keyFor(id), toWrite);
  }
  /**
   * Read raw bytes at `key`, decrypt if a key is configured, decode JSON.
   * Returns `null` for missing key, decryption failure, parse failure,
   * or tombstone marker.
   */
  async readDecoded(key) {
    let raw2;
    try {
      raw2 = await getEnvelopePayload(this.db, key);
    } catch {
      return null;
    }
    if (!raw2) return null;
    if (raw2.byteLength > MAX_ENTRY_BYTES_RAW) return null;
    let plaintextBytes;
    try {
      plaintextBytes = this.encryptionKey ? await decryptProfileValue(this.encryptionKey, raw2) : raw2;
    } catch {
      return null;
    }
    let parsed;
    try {
      parsed = JSON.parse(new TextDecoder().decode(plaintextBytes));
    } catch {
      return null;
    }
    if (parsed !== null && typeof parsed === "object" && "tombstoned" in parsed && parsed.tombstoned === true) {
      return null;
    }
    return parsed;
  }
  /**
   * Classify a parsed value as one of the three on-disk shapes (`uxf-1`,
   * `legacy`, `unknown`). Returns `null` for `unknown` so callers can
   * skip silently.
   */
  classify(value) {
    const shape = classifyOutboxEntryShape(value);
    if (shape === "uxf-1") {
      return { shape: "uxf-1", entry: value };
    }
    if (shape === "legacy") {
      return { shape: "legacy", entry: value };
    }
    return null;
  }
};
function stripWriterStampedFields(entry) {
  const { _schemaVersion, lamport, ...rest } = entry;
  return rest;
}

// profile/sent-ledger-writer.ts
init_errors3();

// types/uxf-sent.ts
function isUxfSentLedgerEntry(value) {
  if (value === null || typeof value !== "object") return false;
  const v = value;
  if (v._schemaVersion !== "uxf-1") return false;
  if (typeof v.id !== "string" || v.id.length === 0) return false;
  if (!Array.isArray(v.tokenIds)) return false;
  for (const t of v.tokenIds) {
    if (typeof t !== "string") return false;
  }
  if (typeof v.bundleCid !== "string") return false;
  if (typeof v.recipientTransportPubkey !== "string") return false;
  if (v.deliveryMethod !== "car-over-nostr" && v.deliveryMethod !== "cid-over-nostr" && v.deliveryMethod !== "txf-legacy") {
    return false;
  }
  if (v.mode !== "conservative" && v.mode !== "instant" && v.mode !== "txf") {
    return false;
  }
  if (!Number.isInteger(v.sentAt) || v.sentAt < 0) return false;
  if (!Number.isInteger(v.lamport) || v.lamport < 0) return false;
  if (v.nostrEventId !== void 0) {
    if (typeof v.nostrEventId !== "string" || v.nostrEventId.length === 0) {
      return false;
    }
  }
  if (v.tokenIds.length > MAX_TOKEN_IDS_PER_ENTRY) return false;
  for (const t of v.tokenIds) {
    if (t.length === 0 || t.length > MAX_TOKEN_ID_LENGTH) return false;
  }
  if (v.bundleCid.length > MAX_BUNDLE_CID_LENGTH) return false;
  if (v.recipientTransportPubkey.length > MAX_TRANSPORT_PUBKEY_LENGTH) return false;
  if (!isWithinOptionalStringLength(v.recipient, MAX_RECIPIENT_LENGTH)) return false;
  if (!isWithinOptionalStringLength(v.recipientNametag, MAX_NAMETAG_LENGTH)) return false;
  if (v.nostrEventId !== void 0 && typeof v.nostrEventId === "string" && v.nostrEventId.length > MAX_NOSTR_EVENT_ID_LENGTH) {
    return false;
  }
  return true;
}

// profile/sent-ledger-writer.ts
init_encryption();
init_oplog_envelope_io();
var SentLedgerWriter = class {
  db;
  encryptionKey;
  addressId;
  lamport;
  keyPrefix;
  notifyProfileDirty;
  /**
   * OUTBOX-SEND-FOLLOWUPS item #3 — lazy in-memory `tokenId → entryId`
   * index. Populated on the first {@link contains} or
   * {@link findByTokenId} call via {@link ensureIndex}; maintained
   * incrementally by {@link write} and {@link delete}. NOT persisted —
   * each `SentLedgerWriter` instance re-derives the index from
   * {@link readAll} on first lookup after construction.
   *
   * `null` means "not yet built". The companion {@link entryTokenIds}
   * map is initialised in lockstep so an entry's prior tokenIds can be
   * looked up at maintenance time without re-reading the entry.
   */
  tokenIndex = null;
  entryTokenIds = null;
  constructor(options) {
    if (!options.addressId || options.addressId.length === 0) {
      throw new SphereError(
        "SentLedgerWriter: addressId must be a non-empty string",
        "VALIDATION_ERROR"
      );
    }
    if (!/^DIRECT_[0-9a-f]{6}_[0-9a-f]{6}$/.test(options.addressId)) {
      throw new SphereError(
        `SentLedgerWriter: addressId must match DIRECT_[0-9a-f]{6}_[0-9a-f]{6} (got: ${options.addressId})`,
        "VALIDATION_ERROR"
      );
    }
    this.db = options.db;
    this.encryptionKey = options.encryptionKey;
    this.addressId = options.addressId;
    this.lamport = options.lamport;
    this.keyPrefix = `${this.addressId}.sent.`;
    this.notifyProfileDirty = options.notifyProfileDirty ?? null;
  }
  /**
   * Item #15 Phase C — invoke the host's `notifyProfileDirty` callback
   * (if wired). Guarded so a misbehaving notifier cannot break a mutation
   * path; errors are swallowed silently (the dirty signal is best-effort
   * — the next flush will pick up the state regardless).
   */
  emitProfileDirty() {
    if (this.notifyProfileDirty === null) return;
    try {
      this.notifyProfileDirty();
    } catch {
    }
  }
  /**
   * Compose the on-disk key for an entry id. Exposed for callers that
   * need to read raw values directly (tests).
   */
  keyFor(id) {
    return `${this.keyPrefix}${id}`;
  }
  /**
   * Write a new SENT entry at `${addr}.sent.${entry.id}`. Stamps
   * `_schemaVersion: 'uxf-1'` and a Lamport bumped per §7.1.
   *
   * Idempotent on input: writing the same `entry` twice produces two
   * distinct Lamport stamps but the same `id` slot is overwritten —
   * second write wins. Callers typically only write each SENT entry
   * once (on `delivered` / `delivered-instant` transition), but the
   * second-write-wins behaviour gives the recovery sweeper room to
   * safely re-stamp without checking existence first.
   */
  async write(input, options) {
    if (typeof input.id !== "string" || input.id.length === 0) {
      throw new SphereError(
        "SentLedgerWriter.write: input.id must be a non-empty string",
        "VALIDATION_ERROR"
      );
    }
    if (options?.allowResurrection !== true) {
      const existing = await this.readTombstoneAt(input.id);
      if (existing !== null) {
        throw new SphereError(
          `SentLedgerWriter.write: refusing to resurrect tombstoned slot "${input.id}" (tombstone lamport=${existing.lamport}, deletedAt=${existing.deletedAt}). If this is intentional (operator escape-hatch / test fixture), pass { allowResurrection: true }.`,
          "OUTBOX_ENTRY_TOMBSTONED"
        );
      }
    }
    const observedLamports = await this.collectObservedLamports();
    this.lamport.rehydrate(observedLamports);
    const next = this.lamport.bumpFor([]);
    const stamped = {
      ...input,
      _schemaVersion: "uxf-1",
      lamport: next
    };
    await this.writeRaw(stamped.id, JSON.stringify(stamped));
    this.updateIndexAfterWrite(stamped.id, stamped.tokenIds);
    this.emitProfileDirty();
    return stamped;
  }
  /**
   * Tombstone the SENT entry at `${addr}.sent.${id}`. Subsequent
   * {@link readAll}/{@link readOne}/{@link contains} calls treat the
   * id as absent.
   *
   * In normal operation, SENT entries are NEVER deleted — the ledger
   * is a permanent record. This API exists for operator escape-hatch
   * scenarios (e.g. recovery from a poisoned ledger) and tests.
   */
  async delete(id) {
    if (typeof id !== "string" || id.length === 0) {
      throw new SphereError(
        "SentLedgerWriter.delete: id must be a non-empty string",
        "VALIDATION_ERROR"
      );
    }
    const observedLamports = await this.collectObservedLamports();
    this.lamport.rehydrate(observedLamports);
    const lamport = this.lamport.bumpFor([]);
    const tombstone = JSON.stringify({
      tombstoned: true,
      deletedAt: Date.now(),
      lamport
    });
    await this.writeRaw(id, tombstone);
    this.removeFromIndexAfterDelete(id);
    this.emitProfileDirty();
  }
  /**
   * OUTBOX-SEND-FOLLOWUPS item #4 — reclaim storage occupied by SENT-
   * ledger tombstones older than `opts.retentionMs`.
   *
   * SENT-ledger tombstones are rare (the ledger is permanent in
   * normal operation; tombstones only appear on operator escape-
   * hatch or test fixture paths), so this sweep is largely a
   * defensive surface — but the same monotonic-growth concern that
   * motivates the OUTBOX sweep applies here. See
   * {@link OutboxWriter.gcExpiredTombstones} for the full safety
   * contract; the implementation is structurally identical.
   */
  async gcExpiredTombstones(opts) {
    if (typeof opts.retentionMs !== "number" || !Number.isFinite(opts.retentionMs) || opts.retentionMs < 0) {
      throw new SphereError(
        `SentLedgerWriter.gcExpiredTombstones: retentionMs must be a non-negative finite number (got ${String(opts.retentionMs)})`,
        "VALIDATION_ERROR"
      );
    }
    const nowMs = typeof opts.now === "number" && Number.isFinite(opts.now) ? opts.now : Date.now();
    let entries;
    try {
      entries = await this.db.all(this.keyPrefix);
    } catch {
      return { scanned: 0, purged: 0, kept: 0, skipped: true };
    }
    let scanned = 0;
    let purged = 0;
    let kept = 0;
    for (const key of entries.keys()) {
      if (!key.startsWith(this.keyPrefix)) continue;
      const shape = await this.readSlotShape(key);
      if (shape === null) continue;
      if (shape.kind !== "tombstone") continue;
      scanned += 1;
      if (shape.deletedAt === 0) {
        kept += 1;
        continue;
      }
      if (nowMs - shape.deletedAt <= opts.retentionMs) {
        kept += 1;
        continue;
      }
      try {
        await this.db.del(key);
        purged += 1;
      } catch {
        kept += 1;
      }
    }
    if (purged > 0) this.emitProfileDirty();
    return { scanned, purged, kept, skipped: false };
  }
  // ===========================================================================
  // Item #15 Phase B — full-profile-snapshot sync API
  // ===========================================================================
  /**
   * Return every entry under `${addr}.sent.*` as raw encrypted bytes
   * for the lean-snapshot builder (Item #15 Phase B). Includes BOTH
   * live entries AND tombstones — the latter are rare (the SENT ledger
   * is permanent in normal operation) but propagate via the same
   * channel for completeness.
   *
   * Stable order: ascending lexicographic key. Mirrors
   * {@link OutboxWriter.snapshot}.
   */
  async snapshot() {
    let entries;
    try {
      entries = await this.db.all(this.keyPrefix);
    } catch {
      return [];
    }
    const out = [];
    const sortedKeys = [...entries.keys()].sort();
    for (const key of sortedKeys) {
      if (!key.startsWith(this.keyPrefix)) continue;
      const encryptedValue = entries.get(key);
      if (encryptedValue === void 0) continue;
      out.push({ key, encryptedValue });
    }
    return out;
  }
  /**
   * Apply a remote peer's SENT-ledger snapshot against this writer's
   * local OrbitDB state. For each remote entry, the merge table decides
   * whether to keep local or persist remote's bytes verbatim.
   *
   * **In-memory tokenId index invalidation.** This writer maintains a
   * lazy `tokenId → entryId` index (OUTBOX-SEND-FOLLOWUPS item #3) that
   * is kept in sync by `write()` and `delete()`. The JOIN path bypasses
   * those hooks (it goes directly to `db.put`), so any landed remote
   * change can render the index stale. We invalidate at the end of the
   * JOIN if any write occurred — the next `contains()` / `findByTokenId`
   * call rebuilds from the current durable state.
   *
   * Same Lamport / legacy-entry / out-of-bounds semantics as
   * {@link OutboxWriter.joinSnapshot}; see that method for the rationale.
   */
  async joinSnapshot(remote) {
    const result = await runJoinSnapshot(remote, {
      classifyLocal: async (key) => {
        if (!key.startsWith(this.keyPrefix)) return { kind: "absent" };
        const shape = await this.readSlotShape(key);
        const slot = this.classifyToMergeSlot(
          shape,
          /* remote = */
          false
        );
        return slot ?? { kind: "absent" };
      },
      classifyRemote: async (entry) => {
        if (!entry.key.startsWith(this.keyPrefix)) return null;
        const shape = await this.classifyRawBytes(entry.encryptedValue);
        return this.classifyToMergeSlot(
          shape,
          /* remote = */
          true
        );
      },
      writeRemote: async (key, bytes) => {
        await this.db.put(key, bytes);
      }
    });
    if (result.liveLanded > 0 || result.tombstonesLanded > 0) {
      this.tokenIndex = null;
      this.entryTokenIds = null;
      this.emitProfileDirty();
    }
    return result;
  }
  /**
   * Map our private `readSlotShape` discriminated union into the
   * `ClassifiedSlot` shape consumed by the shared merge primitive.
   *
   * SENT entries have no legacy variant (the ledger is post-Issue #97);
   * any non-uxf-1 live value at our prefix is treated as malformed.
   *
   * @param shape  The output of `readSlotShape` / `classifyRawBytes`.
   * @param remote `true` for remote bytes (stricter — malformed
   *               rejected outright); `false` for local (malformed
   *               mapped to absent so well-formed remote can land).
   */
  classifyToMergeSlot(shape, remote) {
    if (shape === null) {
      return remote ? null : { kind: "absent" };
    }
    if (shape.kind === "tombstone") {
      const lamport = validateLamport(shape.lamport);
      if (lamport === null) {
        return remote ? null : { kind: "absent" };
      }
      return { kind: "tombstone", lamport };
    }
    if (isUxfSentLedgerEntry(shape.value)) {
      const lamport = validateLamport(shape.value.lamport);
      if (lamport === null) return remote ? null : { kind: "absent" };
      return { kind: "live", lamport };
    }
    return remote ? null : { kind: "absent" };
  }
  /**
   * Decrypt + parse a raw byte buffer using the writer's standard
   * pipeline (size cap → decrypt → JSON parse → tombstone sniff).
   * Used by `joinSnapshot` to classify remote bytes without going
   * through `db.get`.
   */
  async classifyRawBytes(raw2) {
    if (!raw2 || raw2.byteLength === 0) return null;
    if (raw2.byteLength > MAX_ENTRY_BYTES_RAW) return null;
    const ciphertext = unwrapEnvelopeBytes(raw2);
    let plaintextBytes;
    try {
      plaintextBytes = this.encryptionKey ? await decryptProfileValue(this.encryptionKey, ciphertext) : ciphertext;
    } catch {
      return null;
    }
    let parsed;
    try {
      parsed = JSON.parse(new TextDecoder().decode(plaintextBytes));
    } catch {
      return null;
    }
    if (parsed !== null && typeof parsed === "object" && "tombstoned" in parsed && parsed.tombstoned === true) {
      const p = parsed;
      const lamport = typeof p.lamport === "number" && Number.isInteger(p.lamport) && p.lamport >= 0 ? p.lamport : 0;
      const deletedAt = typeof p.deletedAt === "number" ? p.deletedAt : 0;
      return { kind: "tombstone", lamport, deletedAt };
    }
    return { kind: "value", value: parsed };
  }
  /**
   * Read a single entry at `${addr}.sent.${id}`. Returns `null` if the
   * key is absent OR carries a tombstone marker OR fails to classify.
   */
  async readOne(id) {
    if (typeof id !== "string" || id.length === 0) {
      throw new SphereError(
        "SentLedgerWriter.readOne: id must be a non-empty string",
        "VALIDATION_ERROR"
      );
    }
    const decoded = await this.readDecoded(this.keyFor(id));
    if (decoded === null) return null;
    if (!isUxfSentLedgerEntry(decoded)) return null;
    return decoded;
  }
  /**
   * Prefix-scan all SENT entries under `${addr}.sent.*`. Skips
   * tombstones and entries that fail the schema guard. Stable order:
   * ascending lexicographic key.
   */
  async readAll() {
    let entries;
    try {
      entries = await this.db.all(this.keyPrefix);
    } catch {
      return [];
    }
    const out = [];
    const sortedKeys = [...entries.keys()].sort();
    for (const key of sortedKeys) {
      if (!key.startsWith(this.keyPrefix)) continue;
      const decoded = await this.readDecoded(key);
      if (decoded === null) continue;
      if (!isUxfSentLedgerEntry(decoded)) continue;
      out.push(decoded);
    }
    return out;
  }
  /**
   * Check whether `tokenId` appears in ANY live SENT entry. Used by
   * the crash-recovery sweeper (Issue #97 step 6) and the duplicate-
   * bundle guard (Issue #97 step 7).
   *
   * **Cost contract.** Backed by a lazy in-memory index (OUTBOX-SEND-
   * FOLLOWUPS item #3). The first call after construction is O(n × m)
   * — it iterates `readAll()` to build the index. Subsequent calls:
   *
   *  - **Miss path** (tokenId not in any bucket): O(1) — single
   *    `Map.has` returns false, no storage I/O. This is the common
   *    case for the duplicate-bundle guard (most candidate tokens are
   *    fresh).
   *  - **Hit path**: O(b) where `b` is the bucket size (typically 1).
   *    Each hit reads one entry from storage to verify the index is
   *    not stale against cross-replica tombstones — see
   *    "Cross-replica staleness" below.
   *
   * **Index maintenance.** `write()` and `delete()` keep the index
   * consistent with the on-disk state in O(m) per call (the entry's
   * tokenIds count). The index is purely in-memory; each `SentLedgerWriter`
   * instance re-derives it on first lookup, so a process restart
   * naturally rebuilds.
   *
   * **Cross-replica staleness.** If a remote peer tombstones an entry
   * via a synchronised `ProfileDatabase`, the local in-memory index
   * does not see the eviction (the local `delete()` was never called).
   * The verify-on-hit step catches this: when the bucket is non-empty
   * but every referenced entry returns `null` from `readOne()`, the
   * stale ids are evicted from the index and the call returns `false`.
   * Subsequent calls for the same tokenId are O(1) misses.
   *
   * **Storage scale.** Typical wallets carry <1k SENT entries; m ~ 1-4.
   * The duplicate-bundle guard (which calls `contains()` per-token
   * per-send) is the load-bearing consumer.
   */
  async contains(tokenId) {
    if (typeof tokenId !== "string" || tokenId.length === 0) return false;
    await this.ensureIndex();
    if (this.tokenIndex === null) return false;
    const bucket = this.tokenIndex.get(tokenId);
    if (bucket === void 0 || bucket.size === 0) return false;
    let liveFound = false;
    const staleIds = [];
    for (const entryId of bucket) {
      const entry = await this.readOne(entryId);
      if (entry !== null) {
        liveFound = true;
        continue;
      }
      staleIds.push(entryId);
    }
    if (staleIds.length > 0) this.evictStaleEntries(staleIds);
    return liveFound;
  }
  /**
   * Convenience: return all SENT entries that include `tokenId` in
   * their `tokenIds`. Used by tooling and tests that need the full
   * delivery history of a single token (a token MAY appear in multiple
   * SENT entries when it was re-sent intentionally).
   *
   * **Cost contract.** Same lazy-index backing as {@link contains}. The
   * first call is O(n × m); subsequent calls are O(k) where k is the
   * number of entries containing `tokenId` (typically 1).
   */
  async findByTokenId(tokenId) {
    if (typeof tokenId !== "string" || tokenId.length === 0) return [];
    await this.ensureIndex();
    if (this.tokenIndex === null) return [];
    const ids = this.tokenIndex.get(tokenId);
    if (ids === void 0 || ids.size === 0) return [];
    const out = [];
    for (const id of ids) {
      const entry = await this.readOne(id);
      if (entry !== null) out.push(entry);
    }
    return out;
  }
  /**
   * OUTBOX-SEND-FOLLOWUPS item #3 — lazy-build the in-memory
   * `tokenId → entryId` index from the durable SENT-ledger state.
   *
   * Cheap re-entry: if the index is already built (`tokenIndex !== null`),
   * this is a no-op. If a prior maintenance step invalidated the index
   * by setting it back to `null` (defensive on unexpected throws), the
   * next lookup rebuilds.
   *
   * Cost: O(n) decrypts (mirrors `readAll()`), once per index lifetime.
   */
  async ensureIndex() {
    if (this.tokenIndex !== null && this.entryTokenIds !== null) return;
    const tokenIndex = /* @__PURE__ */ new Map();
    const entryTokenIds = /* @__PURE__ */ new Map();
    const all = await this.readAll();
    for (const entry of all) {
      entryTokenIds.set(entry.id, entry.tokenIds);
      for (const t of entry.tokenIds) {
        let bucket = tokenIndex.get(t);
        if (bucket === void 0) {
          bucket = /* @__PURE__ */ new Set();
          tokenIndex.set(t, bucket);
        }
        bucket.add(entry.id);
      }
    }
    this.tokenIndex = tokenIndex;
    this.entryTokenIds = entryTokenIds;
  }
  /**
   * OUTBOX-SEND-FOLLOWUPS item #3 — incremental index maintenance after
   * a successful {@link write}. No-op when the index hasn't been built
   * yet ({@link ensureIndex} will catch up on first lookup).
   *
   * Handles the second-write-wins case: if a prior entry existed at the
   * same id with a different tokenIds set, the old tokenIds are
   * removed from the index before the new ones are added.
   */
  updateIndexAfterWrite(id, newTokenIds) {
    if (this.tokenIndex === null || this.entryTokenIds === null) return;
    const priorTokenIds = this.entryTokenIds.get(id);
    if (priorTokenIds !== void 0) {
      for (const t of priorTokenIds) {
        const bucket = this.tokenIndex.get(t);
        if (bucket === void 0) continue;
        bucket.delete(id);
        if (bucket.size === 0) this.tokenIndex.delete(t);
      }
    }
    this.entryTokenIds.set(id, newTokenIds);
    for (const t of newTokenIds) {
      let bucket = this.tokenIndex.get(t);
      if (bucket === void 0) {
        bucket = /* @__PURE__ */ new Set();
        this.tokenIndex.set(t, bucket);
      }
      bucket.add(id);
    }
  }
  /**
   * OUTBOX-SEND-FOLLOWUPS item #3 — incremental index maintenance after
   * a successful {@link delete}. Removes the entry's contribution from
   * every tokenId bucket and drops it from the reverse map. No-op when
   * the index hasn't been built yet OR when the id is unknown to the
   * index (idempotent delete-of-absent).
   */
  removeFromIndexAfterDelete(id) {
    if (this.tokenIndex === null || this.entryTokenIds === null) return;
    const priorTokenIds = this.entryTokenIds.get(id);
    if (priorTokenIds === void 0) return;
    for (const t of priorTokenIds) {
      const bucket = this.tokenIndex.get(t);
      if (bucket === void 0) continue;
      bucket.delete(id);
      if (bucket.size === 0) this.tokenIndex.delete(t);
    }
    this.entryTokenIds.delete(id);
  }
  /**
   * Drop entries from the index that {@link contains} discovered to
   * be stale (tombstoned remotely or otherwise unreadable). Mirrors
   * {@link removeFromIndexAfterDelete} but acts on multiple ids in
   * one pass. Safe to call even when the index hasn't been built
   * (no-op).
   */
  evictStaleEntries(staleIds) {
    if (this.tokenIndex === null || this.entryTokenIds === null) return;
    for (const id of staleIds) {
      const priorTokenIds = this.entryTokenIds.get(id);
      if (priorTokenIds === void 0) continue;
      for (const t of priorTokenIds) {
        const bucket = this.tokenIndex.get(t);
        if (bucket === void 0) continue;
        bucket.delete(id);
        if (bucket.size === 0) this.tokenIndex.delete(t);
      }
      this.entryTokenIds.delete(id);
    }
  }
  // ===========================================================================
  // Private helpers — mirror OutboxWriter's implementation tightly so
  // future maintainers can side-by-side diff the two writers.
  // ===========================================================================
  async collectObservedLamports() {
    let entries;
    try {
      entries = await this.db.all(this.keyPrefix);
    } catch {
      return [];
    }
    const out = [];
    for (const key of entries.keys()) {
      if (!key.startsWith(this.keyPrefix)) continue;
      const shape = await this.readSlotShape(key);
      if (shape === null) continue;
      if (shape.kind === "value") {
        if (isUxfSentLedgerEntry(shape.value)) out.push(shape.value.lamport);
      } else if (shape.kind === "tombstone") {
        out.push(shape.lamport);
      }
    }
    return out;
  }
  /**
   * Issue #166 P1 #2 — check whether the slot at `id` is currently a
   * tombstone. Returns the tombstone metadata (lamport, deletedAt) or
   * null. Mirrors OutboxWriter.readTombstoneAt.
   */
  async readTombstoneAt(id) {
    const shape = await this.readSlotShape(this.keyFor(id));
    if (shape === null) return null;
    if (shape.kind !== "tombstone") return null;
    return { lamport: shape.lamport, deletedAt: shape.deletedAt };
  }
  /**
   * Issue #166 P1 #2 — discriminated-union slot reader. Mirrors
   * OutboxWriter.readSlotShape.
   */
  async readSlotShape(key) {
    let raw2;
    try {
      raw2 = await getEnvelopePayload(this.db, key);
    } catch {
      return null;
    }
    if (!raw2) return null;
    if (raw2.byteLength > MAX_ENTRY_BYTES_RAW) return null;
    let plaintextBytes;
    try {
      plaintextBytes = this.encryptionKey ? await decryptProfileValue(this.encryptionKey, raw2) : raw2;
    } catch {
      return null;
    }
    let parsed;
    try {
      parsed = JSON.parse(new TextDecoder().decode(plaintextBytes));
    } catch {
      return null;
    }
    if (parsed !== null && typeof parsed === "object" && "tombstoned" in parsed && parsed.tombstoned === true) {
      const p = parsed;
      const lamport = typeof p.lamport === "number" && Number.isInteger(p.lamport) && p.lamport >= 0 ? p.lamport : 0;
      const deletedAt = typeof p.deletedAt === "number" ? p.deletedAt : 0;
      return { kind: "tombstone", lamport, deletedAt };
    }
    return { kind: "value", value: parsed };
  }
  async writeRaw(id, value) {
    const encoded = new TextEncoder().encode(value);
    const toWrite = this.encryptionKey ? await encryptProfileValue(this.encryptionKey, encoded) : encoded;
    await putEnvelopePayload(this.db, this.keyFor(id), toWrite);
  }
  async readDecoded(key) {
    let raw2;
    try {
      raw2 = await getEnvelopePayload(this.db, key);
    } catch {
      return null;
    }
    if (!raw2) return null;
    if (raw2.byteLength > MAX_ENTRY_BYTES_RAW) return null;
    let plaintextBytes;
    try {
      plaintextBytes = this.encryptionKey ? await decryptProfileValue(this.encryptionKey, raw2) : raw2;
    } catch {
      return null;
    }
    let parsed;
    try {
      parsed = JSON.parse(new TextDecoder().decode(plaintextBytes));
    } catch {
      return null;
    }
    if (parsed !== null && typeof parsed === "object" && "tombstoned" in parsed && parsed.tombstoned === true) {
      return null;
    }
    return parsed;
  }
};

// profile/lamport.ts
init_errors3();
var Lamport = class {
  /** The most-recently written Lamport value for the entry this clock
   *  tracks. Mutated by `bumpFor`; readable via `getCurrent`. */
  current;
  /**
   * @param initial Starting Lamport value. Default `0`. Pass the value
   *   read from storage when re-hydrating a clock for an existing entry.
   */
  constructor(initial = 0) {
    if (!Number.isFinite(initial) || initial < 0 || !Number.isInteger(initial)) {
      throw new SphereError(
        `Lamport initial must be a non-negative finite integer; got ${String(initial)}`,
        "VALIDATION_ERROR"
      );
    }
    this.current = initial;
  }
  /**
   * CRDT merge rule: `max(a, b)`. Pure / static.
   */
  static merge(a, b) {
    return Math.max(a, b);
  }
  /**
   * Compute the Lamport value for the next local write, given the set of
   * remote Lamport values currently observed for the same entry. Updates
   * this clock's internal `current` state and returns the new value.
   *
   * Behaviour:
   * - `result = max(this.current, max(observedRemotes, 0)) + 1`
   * - Empty `observedRemotes` is allowed (`getCurrent() + 1`).
   * - Throws `LAMPORT_BOUND_VIOLATION` if any observed value is
   *   `> 2 × max(this.current, 1)` — the W39 bounds defense.
   */
  bumpFor(observedRemotes) {
    for (const v of observedRemotes) {
      if (!Number.isFinite(v) || !Number.isInteger(v) || v < 0) {
        throw new SphereError(
          `Lamport.bumpFor: observedRemotes must be non-negative finite integers; got ${String(v)}`,
          "VALIDATION_ERROR"
        );
      }
    }
    let maxObserved = 0;
    for (const v of observedRemotes) {
      if (v > maxObserved) maxObserved = v;
    }
    const bound = 2 * Math.max(this.current, 1);
    if (maxObserved > bound) {
      throw new SphereError(
        `Lamport.bumpFor: observed remote Lamport ${maxObserved} exceeds 2 \xD7 max(local=${this.current}, 1) = ${bound} (W39 bounds defense)`,
        "LAMPORT_BOUND_VIOLATION"
      );
    }
    const next = Math.max(this.current, maxObserved) + 1;
    this.current = next;
    return next;
  }
  /**
   * Returns the current Lamport value without mutating it. Useful for
   * passing to merge / serialization paths.
   */
  getCurrent() {
    return this.current;
  }
  /**
   * Rehydrate the clock from a set of TRUSTED local-store observations
   * (e.g. values read from our own previously-persisted entries on cold
   * restart). Sets `this.current = max(this.current, ...observed)`.
   *
   * **Distinction from {@link bumpFor}:** `bumpFor` treats inputs as
   * concurrent remote replicas subject to the W39 bounds defense
   * (`> 2 × max(this.current, 1)` rejects). That defense applies when
   * an OrbitDB replication channel could deliver values from untrusted
   * peers. It does NOT apply when a writer reads its OWN prior local
   * writes from durable storage on restart — those values are trusted
   * (they had to pass `bumpFor` when written) and may legitimately
   * exceed `2 × current=0`.
   *
   * **Why this method exists:** writers (e.g. {@link OutboxWriter},
   * {@link SentLedgerWriter}) prefix-scan their keyspace at write
   * time and feed every observed entry's `lamport` to `bumpFor`. On
   * cold restart with N≥3 prior writes the clock's `current` resets
   * to 0; the bounds defense then rejects every observation `> 2`.
   * Call `rehydrate(observed)` BEFORE the first `bumpFor` of each
   * write so the clock absorbs the prior state without bounds-checking
   * it.
   *
   * **Trust requirement:** caller MUST be passing values from a
   * locally-controlled store (the same OrbitDB the writer owns, AFTER
   * tombstone filtering / discriminator filtering). Do NOT call this
   * with values from a foreign-replica gossip channel — that's
   * `bumpFor`'s job.
   *
   * No-op when `observed` is empty.
   */
  rehydrate(observed) {
    for (const v of observed) {
      if (!Number.isFinite(v) || !Number.isInteger(v) || v < 0) {
        throw new SphereError(
          `Lamport.rehydrate: observed must be non-negative finite integers; got ${String(v)}`,
          "VALIDATION_ERROR"
        );
      }
      if (v > this.current) this.current = v;
    }
  }
};

// profile/profile-storage-provider.ts
init_oplog_entry();

// profile/pointer-wiring.ts
init_logger();
init_hex();
import { CID as CID3 } from "multiformats/cid";

// profile/aggregator-pointer/constants.ts
init_utils();
var PROFILE_POINTER_HKDF_INFO = utf8ToBytes("uxf-profile-aggregator-pointer-v1");
var SIGNING_SEED_INFO = utf8ToBytes("uxf-profile-pointer-sig-v1");
var XOR_SEED_INFO = utf8ToBytes("uxf-profile-pointer-xor-v1");
var PAD_SEED_INFO = utf8ToBytes("uxf-profile-pointer-pad-v1");
var CID_MAX_BYTES = 63;
var VERSION_MIN = 1;
var VERSION_MAX = 2 ** 31 - 1;
var DISCOVERY_INITIAL_VERSION = 1024;
var DISCOVERY_HARD_CEILING = 2 ** 22;
var DISCOVERY_CORRUPT_WALKBACK = 64;
var PUBLISH_RETRY_BUDGET = 5;
var PUBLISH_BACKOFF_BASE_MS = 250;
var PUBLISH_BACKOFF_MAX_MS = 4e3;
var PUBLISH_BACKOFF_JITTER_LO = 0.5;
var PUBLISH_BACKOFF_JITTER_HI = 1.5;
var AGGREGATOR_ALG_TAG_SHA256 = new Uint8Array([0, 0]);
var MARKER_MAX_JUMP = 1024;
var MAX_CT_RESIDENT_MS = 500;
var MAX_CAR_BYTES = 100 * 1024 * 1024;
var MAX_CAR_FETCH_INITIAL_RESPONSE_MS = 1e4;
var MAX_CAR_FETCH_STALL_MS = 3e4;
var MAX_CAR_FETCH_TOTAL_MS = 3e5;
var CAR_FETCH_PERSISTENT_RETRY_ATTEMPTS = 12;
var CAR_FETCH_PERSISTENT_TOTAL_DURATION_MS = 864e5;
var PUBLISH_REQUEST_TIMEOUT_MS = 3e4;
var PROBE_REQUEST_TIMEOUT_MS = 1e4;
var NODE_ENV_KEY = "NODE_ENV";
var SPHERE_ALLOW_OVERRIDES_KEY = "SPHERE_ALLOW_OVERRIDES";
var SPHERE_ALLOW_OVERRIDES_VALUE = "1";
var MAX_PLAUSIBLE_EPOCH_GAP = 1024n;
var MAX_CUMULATIVE_RETRY_AFTER_MS = 18e4;
var ATTEMPT_MAX_RETRIES_HARD_CAP = 10;
var FILE_LOCK_STALE_MARGIN_MS = 6e4;
var FILE_LOCK_STALE_MS = MAX_CUMULATIVE_RETRY_AFTER_MS + ATTEMPT_MAX_RETRIES_HARD_CAP * (PUBLISH_BACKOFF_MAX_MS * 2 + PUBLISH_REQUEST_TIMEOUT_MS * 2) + FILE_LOCK_STALE_MARGIN_MS;
var FILE_LOCK_STALE_MS_EXPECTED = 92e4;
if (FILE_LOCK_STALE_MS !== FILE_LOCK_STALE_MS_EXPECTED) {
  throw new Error(
    `pointer-layer constants invariant violated: FILE_LOCK_STALE_MS=${FILE_LOCK_STALE_MS} does NOT match FILE_LOCK_STALE_MS_EXPECTED=${FILE_LOCK_STALE_MS_EXPECTED}. If you changed a component constant or the formula, re-derive the safety property (MAX_CUMULATIVE_RETRY_AFTER_MS + ATTEMPT_MAX_RETRIES_HARD_CAP \xD7 (PUBLISH_BACKOFF_MAX_MS \xD7 2 + PUBLISH_REQUEST_TIMEOUT_MS \xD7 2) + FILE_LOCK_STALE_MARGIN_MS) and update FILE_LOCK_STALE_MS_EXPECTED in constants.ts to match.`
  );
}

// profile/aggregator-pointer/index.ts
init_errors2();

// profile/aggregator-pointer/types.ts
var SIDE_A_NUM = 0;
var SIDE_B_NUM = 1;

// profile/aggregator-pointer/master-key.ts
init_errors2();
var TYPED_ARRAY_FILL = Uint8Array.prototype.fill;
var OBJECT_TO_STRING = Object.prototype.toString;
var ARRAY_BUFFER_SLICE = ArrayBuffer.prototype.slice;
var NUMBER_IS_INTEGER = Number.isInteger;
var NUMBER_MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
var UINT8_ARRAY_CTOR = Uint8Array;
function safeWipe(buf) {
  if (!buf) return;
  try {
    TYPED_ARRAY_FILL.call(buf, 0);
  } catch {
  }
}
function isSharedArrayBufferLike(buffer) {
  if (buffer === void 0 || buffer === null) return false;
  if (typeof SharedArrayBuffer !== "undefined" && buffer instanceof SharedArrayBuffer) {
    return true;
  }
  return OBJECT_TO_STRING.call(buffer) === "[object SharedArrayBuffer]";
}
function copyArrayBufferRange(buffer, start, end) {
  try {
    return ARRAY_BUFFER_SLICE.call(buffer, start, end);
  } catch (err) {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.PROTOCOL_ERROR,
      "MasterPrivateKey input.buffer is not a real ArrayBuffer (no [[ArrayBufferData]] internal slot). Hostile TypedArray subclass with a forged .buffer is the most likely cause.",
      void 0,
      { cause: err }
    );
  }
}
var registry = /* @__PURE__ */ new WeakSet();
var KAT_CANONICAL_VECTOR = new Uint8Array(32).fill(1);
var WEAK_KEY_DENYLIST_BYTES = Object.freeze([
  // All-zero — structurally invalid secp256k1 scalar.
  new Uint8Array(32),
  // All-FF.
  new Uint8Array(32).fill(255),
  // secp256k1 curve order N.
  new Uint8Array([
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    254,
    186,
    174,
    220,
    230,
    175,
    72,
    160,
    59,
    191,
    210,
    94,
    140,
    208,
    54,
    65,
    65
  ]),
  // N-1.
  new Uint8Array([
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    254,
    186,
    174,
    220,
    230,
    175,
    72,
    160,
    59,
    191,
    210,
    94,
    140,
    208,
    54,
    65,
    64
  ]),
  // N+1.
  new Uint8Array([
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    254,
    186,
    174,
    220,
    230,
    175,
    72,
    160,
    59,
    191,
    210,
    94,
    140,
    208,
    54,
    65,
    66
  ])
]);
var denylistFingerprintHex = (b) => {
  let s = "";
  for (let i = 0; i < b.length; i++) {
    const v = b[i] ?? 0;
    s += (v < 16 ? "0" : "") + v.toString(16);
  }
  return s;
};
var WEAK_KEY_DENYLIST_FINGERPRINT = Object.freeze(
  WEAK_KEY_DENYLIST_BYTES.map((b) => denylistFingerprintHex(b))
);
var assertDenylistIntact = () => {
  for (let i = 0; i < WEAK_KEY_DENYLIST_BYTES.length; i++) {
    const live = WEAK_KEY_DENYLIST_BYTES[i];
    if (!live || live.length !== 32) {
      throw new Error("master-key: WEAK_KEY_DENYLIST integrity violation (length)");
    }
    if (denylistFingerprintHex(live) !== WEAK_KEY_DENYLIST_FINGERPRINT[i]) {
      throw new Error("master-key: WEAK_KEY_DENYLIST integrity violation (mutated bytes)");
    }
  }
};
function bytesEqual32(a, b) {
  if (a.length !== 32 || b.length !== 32) return false;
  let diff2 = 0;
  for (let i = 0; i < 32; i++) {
    diff2 |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff2 === 0;
}
function isStructurallyInvalid(bytes) {
  if (bytes.length !== 32) return false;
  assertDenylistIntact();
  for (const candidate of WEAK_KEY_DENYLIST_BYTES) {
    if (bytesEqual32(bytes, candidate)) return true;
  }
  return false;
}
function isCanonicalKatVector(bytes) {
  return bytesEqual32(bytes, KAT_CANONICAL_VECTOR);
}
function isDenylistedMasterKey(bytes, network) {
  if (isStructurallyInvalid(bytes)) return true;
  if (isCanonicalKatVector(bytes) && network !== "test-vectors") return true;
  return false;
}
function createMasterPrivateKey(bytes, network) {
  const sourceBuffer = bytes.buffer;
  const sourceOffset = bytes.byteOffset;
  const sourceLen = bytes.length;
  if (!NUMBER_IS_INTEGER(sourceOffset) || sourceOffset < 0 || sourceOffset > NUMBER_MAX_SAFE_INTEGER) {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.PROTOCOL_ERROR,
      `MasterPrivateKey input has invalid byteOffset=${String(sourceOffset)} (must be a non-negative safe integer).`
    );
  }
  if (!NUMBER_IS_INTEGER(sourceLen) || sourceLen !== 32) {
    throw new RangeError(
      `MasterPrivateKey must be exactly 32 bytes, got ${String(sourceLen)}`
    );
  }
  if (typeof sourceBuffer !== "object" || sourceBuffer === null || typeof sourceBuffer.byteLength !== "number" || sourceOffset + sourceLen > sourceBuffer.byteLength) {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.PROTOCOL_ERROR,
      `MasterPrivateKey input range [${sourceOffset}, ${sourceOffset + sourceLen}) exceeds underlying buffer byteLength.`
    );
  }
  if (isSharedArrayBufferLike(sourceBuffer)) {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.PROTOCOL_ERROR,
      "MasterPrivateKey input must not be backed by SharedArrayBuffer \u2014 concurrent mutation between denylist check and internal copy is a TOCTOU risk."
    );
  }
  const internalBytes = new UINT8_ARRAY_CTOR(
    copyArrayBufferRange(sourceBuffer, sourceOffset, sourceOffset + sourceLen)
  );
  if (internalBytes.length !== 32) {
    safeWipe(internalBytes);
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.PROTOCOL_ERROR,
      `MasterPrivateKey internal copy length mismatch: expected 32, got ${internalBytes.length}. Hostile TypedArray subclass with shifting offset/length getters is the most likely cause.`
    );
  }
  const denied = isDenylistedMasterKey(internalBytes, network);
  const isKat = isCanonicalKatVector(internalBytes);
  if (denied) {
    safeWipe(internalBytes);
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.PROTOCOL_ERROR,
      isKat ? 'MasterPrivateKey denylist hit (SPEC \xA714.1): canonical 0x01\xD732 KAT vector is reserved for test fixtures. Pass network="test-vectors" to accept it.' : "MasterPrivateKey denylist hit (SPEC \xA714.1): refusing all-zero / all-FF / curve-order-N scalar. These derive deterministic, cross-wallet-colliding pointer-layer keys."
    );
  }
  const instance = /* @__PURE__ */ Object.create(null);
  Object.defineProperty(instance, "bytes", {
    get() {
      return new UINT8_ARRAY_CTOR(internalBytes);
    },
    enumerable: true,
    configurable: false
  });
  Object.defineProperty(instance, "zeroize", {
    value: function zeroize() {
      safeWipe(internalBytes);
      registry.delete(instance);
    },
    enumerable: true,
    configurable: false,
    writable: false
  });
  Object.freeze(instance);
  registry.add(instance);
  return instance;
}
function assertAuthorizedMasterKey(candidate) {
  if (!registry.has(candidate)) {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.PROTOCOL_ERROR,
      "MasterPrivateKey was not produced by createMasterPrivateKey() or has been zeroized; raw, cast, or post-lifetime instances are rejected to prevent child-key substitution or secret-material reuse."
    );
  }
}

// profile/aggregator-pointer/secret-key.ts
var REDACTED = "[REDACTED SecretKey]";
var UINT8_ARRAY_CTOR2 = Uint8Array;
var SecretKey = class {
  #bytes;
  #label;
  #zeroized = false;
  constructor(bytes, label) {
    if (bytes.length === 0) {
      throw new RangeError("SecretKey cannot wrap empty bytes");
    }
    this.#bytes = new UINT8_ARRAY_CTOR2(bytes);
    this.#label = label;
  }
  /**
   * Return a COPY of the bytes. Audit every call site.
   * Throws after zeroize() to prevent silent-zero correctness bombs.
   */
  reveal() {
    if (this.#zeroized) {
      throw new Error("SecretKey already zeroized; reveal() would return zeros");
    }
    return new UINT8_ARRAY_CTOR2(this.#bytes);
  }
  get length() {
    return this.#bytes.length;
  }
  get label() {
    return this.#label;
  }
  toString() {
    return `${REDACTED} <${this.#label}>`;
  }
  toJSON() {
    return `${REDACTED} <${this.#label}>`;
  }
  // Node.js util.inspect customization — same redaction.
  // The symbol lookup is string-based to avoid a hard 'util' import in browser.
  [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
    return `${REDACTED} <${this.#label}>`;
  }
  // Browser devtools / template-literal coercion fallback.
  [Symbol.toPrimitive](_hint) {
    return `${REDACTED} <${this.#label}>`;
  }
  /**
   * Best-effort zeroization: overwrites the underlying buffer with zeros
   * and flags the wrapper so subsequent reveal() throws. Prior copies
   * handed out via reveal() are untouched — callers must zeroize their own.
   */
  zeroize() {
    this.#bytes.fill(0);
    this.#zeroized = true;
  }
  isZeroized() {
    return this.#zeroized;
  }
};

// profile/aggregator-pointer/key-derivation.ts
init_hkdf();
init_sha2();
init_errors2();
var TYPED_ARRAY_FILL2 = Uint8Array.prototype.fill;
var _wipeFailures = 0;
var _wipeWarnedOnce = false;
function safeWipe2(buf) {
  if (!buf) return;
  try {
    TYPED_ARRAY_FILL2.call(buf, 0);
  } catch {
    _wipeFailures += 1;
    if (!_wipeWarnedOnce) {
      _wipeWarnedOnce = true;
      try {
        console.warn(
          "[uxf/aggregator-pointer] safeWipe() failed \u2014 possible prototype pollution or hostile Uint8Array. Defense-in-depth check."
        );
      } catch {
      }
    }
  }
}
function derivePointerKeyMaterial(masterKey) {
  assertAuthorizedMasterKey(masterKey);
  const walletPrivateKey = masterKey.bytes;
  let pointerSecretBytes = null;
  let signingSeedBytes = null;
  let xorSeedBytes = null;
  let padSeedBytes = null;
  const builtKeys = [];
  let success = false;
  try {
    pointerSecretBytes = hkdf(sha256, walletPrivateKey, new Uint8Array(0), PROFILE_POINTER_HKDF_INFO, 32);
    signingSeedBytes = expand(sha256, pointerSecretBytes, SIGNING_SEED_INFO, 32);
    xorSeedBytes = expand(sha256, pointerSecretBytes, XOR_SEED_INFO, 32);
    padSeedBytes = expand(sha256, pointerSecretBytes, PAD_SEED_INFO, 32);
    const pointerSecret = new SecretKey(pointerSecretBytes, "pointerSecret");
    builtKeys.push(pointerSecret);
    const signingSeed = new SecretKey(signingSeedBytes, "signingSeed");
    builtKeys.push(signingSeed);
    const xorSeed = new SecretKey(xorSeedBytes, "xorSeed");
    builtKeys.push(xorSeed);
    const padSeed = new SecretKey(padSeedBytes, "padSeed");
    builtKeys.push(padSeed);
    success = true;
    return { pointerSecret, signingSeed, xorSeed, padSeed };
  } finally {
    safeWipe2(pointerSecretBytes);
    safeWipe2(signingSeedBytes);
    safeWipe2(xorSeedBytes);
    safeWipe2(padSeedBytes);
    if (!success) {
      for (let i = 0; i < builtKeys.length; i++) {
        try {
          builtKeys[i].zeroize();
        } catch {
        }
      }
    }
    safeWipe2(walletPrivateKey);
  }
}
function be32(n) {
  if (!Number.isInteger(n) || n < 0 || n > 4294967295) {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.VERSION_OUT_OF_RANGE,
      `be32 input out of range: ${n}`
    );
  }
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, n >>> 0, false);
  return out;
}
function utf8(s) {
  return new TextEncoder().encode(s);
}
function concat(...parts) {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
function deriveStateHashDigest(xorSeed, side, v) {
  const seed = xorSeed.reveal();
  try {
    return sha256(concat(seed, new Uint8Array([side]), be32(v), utf8("state")));
  } finally {
    safeWipe2(seed);
  }
}
function deriveXorKey(xorSeed, side, v) {
  const seed = xorSeed.reveal();
  try {
    return sha256(concat(seed, new Uint8Array([side]), be32(v), utf8("xor")));
  } finally {
    safeWipe2(seed);
  }
}
function derivePaddingBytes(padSeed, v, cidLen) {
  if (cidLen < 0 || cidLen > CID_MAX_BYTES) {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.CID_TOO_LARGE,
      `cidLen out of range: ${cidLen} (max ${CID_MAX_BYTES})`
    );
  }
  const padLength = CID_MAX_BYTES - cidLen;
  if (padLength === 0) {
    return new Uint8Array(0);
  }
  const seed = padSeed.reveal();
  try {
    return expand(sha256, seed, concat(be32(v), utf8("pad")), padLength);
  } finally {
    safeWipe2(seed);
  }
}

// profile/aggregator-pointer/signing.ts
import { SigningService } from "@unicitylabs/state-transition-sdk/lib/sign/SigningService.js";
async function buildPointerSigner(signingSeed) {
  const seed = signingSeed.reveal();
  try {
    const service = await SigningService.createFromSecret(seed);
    const signingPubKey = service.publicKey;
    const signingPubKeyHex = bytesToHex3(signingPubKey);
    return { service, signingPubKey, signingPubKeyHex };
  } finally {
    seed.fill(0);
  }
}
function bytesToHex3(bytes) {
  let hex = "";
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, "0");
  }
  return hex;
}

// profile/aggregator-pointer/health-check.ts
init_sha2();
var HEALTH_CHECK_INFO = new TextEncoder().encode("profile-pointer-health-check");
function deriveHealthCheckRequestId(signingPubKey) {
  if (signingPubKey.length !== 33) {
    throw new RangeError(
      `signingPubKey must be 33-byte compressed secp256k1, got ${signingPubKey.length}`
    );
  }
  const preimage = new Uint8Array(HEALTH_CHECK_INFO.length + signingPubKey.length);
  preimage.set(HEALTH_CHECK_INFO, 0);
  preimage.set(signingPubKey, HEALTH_CHECK_INFO.length);
  return sha256(preimage);
}

// profile/aggregator-pointer/flag-store.ts
init_errors2();
var DURABLE_STORAGE = /* @__PURE__ */ Symbol("aggregator-pointer:durable-storage");
function isDurableProvider(sp) {
  return sp[DURABLE_STORAGE] === true;
}
var FlagStore = class _FlagStore {
  #storage;
  #prefix;
  // "profile.pointer." (no trailing dot; keys add their own separator)
  constructor(storage, signingPubKeyHex) {
    this.#storage = storage;
    this.#prefix = `profile.pointer.${signingPubKeyHex}.`;
  }
  /**
   * Create a FlagStore for the given signing pubkey.
   *
   * Throws AGGREGATOR_POINTER_UNSUPPORTED_RUNTIME if the storage backend
   * cannot guarantee durable writes per §7.1.3.
   */
  static create(storage, signingPubKeyHex) {
    if (!isDurableProvider(storage)) {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.UNSUPPORTED_RUNTIME,
        `Storage backend does not guarantee durable writes (SPEC \xA77.1.3). Mark it with [DURABLE_STORAGE] = true only after verifying fsync/oncomplete semantics.`
      );
    }
    if (!/^[0-9a-f]{66}$/.test(signingPubKeyHex)) {
      throw new RangeError(
        `signingPubKeyHex must be 66 lowercase hex chars (33-byte compressed secp256k1); got "${signingPubKeyHex}"`
      );
    }
    return new _FlagStore(storage, signingPubKeyHex);
  }
  /** Scoped key = prefix + localKey.  localKey must match /^[a-z][a-z0-9_]*$/. */
  scopedKey(localKey) {
    if (!/^[a-z][a-z0-9_]*$/.test(localKey)) {
      throw new RangeError(
        `FlagStore: localKey "${localKey}" is invalid \u2014 must match /^[a-z][a-z0-9_]*$/`
      );
    }
    return this.#prefix + localKey;
  }
  async get(localKey) {
    return this.#storage.get(this.scopedKey(localKey));
  }
  async set(localKey, value) {
    return this.#storage.set(this.scopedKey(localKey), value);
  }
  async remove(localKey) {
    return this.#storage.remove(this.scopedKey(localKey));
  }
  async has(localKey) {
    return this.#storage.has(this.scopedKey(localKey));
  }
};

// profile/aggregator-pointer/marker.ts
init_sha2();
init_utils();
init_errors2();
function assertVersionInRange(v, context) {
  if (!Number.isInteger(v) || v < VERSION_MIN || v > VERSION_MAX) {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.VERSION_OUT_OF_RANGE,
      `${context}: version ${v} is outside valid range [${VERSION_MIN}, ${VERSION_MAX}].`,
      { v }
    );
  }
}
var MARKER_KEY = "pending_version";
function bytesToHex4(b) {
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}
function computeCidHash(cidBytes) {
  return sha256(cidBytes);
}
async function readMarker(store) {
  const raw2 = await store.get(MARKER_KEY);
  if (raw2 === null) return null;
  let rec;
  try {
    rec = JSON.parse(raw2);
  } catch {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.MARKER_CORRUPT,
      `pending_version marker contains invalid JSON (SPEC \xA77.1.5).`,
      { raw: raw2 }
    );
  }
  const r = rec;
  if (typeof r.v !== "number" || !Number.isInteger(r.v) || r.v < VERSION_MIN || r.v > VERSION_MAX || typeof r.cidHash !== "string" || !/^[0-9a-f]{64}$/.test(r.cidHash)) {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.MARKER_CORRUPT,
      `pending_version marker failed integrity check: cidHash must be 64 hex chars, v must be in [${VERSION_MIN}, ${VERSION_MAX}] (SPEC \xA77.1.5).`,
      { record: rec }
    );
  }
  return {
    v: r.v,
    cidHash: hexToBytes2(r.cidHash)
  };
}
async function writeMarker(store, v, cidBytes) {
  assertVersionInRange(v, "writeMarker");
  if (cidBytes.length < 1 || cidBytes.length > CID_MAX_BYTES) {
    throw new RangeError(
      `writeMarker: cidBytes length must be in [1, ${CID_MAX_BYTES}]; got ${cidBytes.length}`
    );
  }
  const rec = {
    v,
    cidHash: bytesToHex4(computeCidHash(cidBytes))
  };
  await store.set(MARKER_KEY, JSON.stringify(rec));
}
async function clearMarker(store) {
  await store.remove(MARKER_KEY);
}
async function resolvePublishVersion(store, currentLocalVersion, newCidBytes, candidateV) {
  const target = candidateV ?? currentLocalVersion + 1;
  const marker = await readMarker(store);
  if (marker === null) {
    assertVersionInRange(target, "resolvePublishVersion(no-marker)");
    return { v: target, isIdempotentRetry: false, wasCompacted: false };
  }
  if (marker.v <= currentLocalVersion) {
    await clearMarker(store);
    assertVersionInRange(target, "resolvePublishVersion(stale-compact)");
    return { v: target, isIdempotentRetry: false, wasCompacted: true };
  }
  const jump = marker.v - currentLocalVersion;
  if (jump > MARKER_MAX_JUMP) {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.MARKER_CORRUPT,
      `pending_version marker version jump ${jump} exceeds MARKER_MAX_JUMP=${MARKER_MAX_JUMP} (SPEC \xA77.1.4 C1 clamp).`,
      { markerV: marker.v, currentLocalVersion, jump }
    );
  }
  const newCidHash = computeCidHash(newCidBytes);
  const cidHashMatch = marker.cidHash.length === newCidHash.length && marker.cidHash.every((b, i) => b === newCidHash[i]);
  if (marker.v === target && cidHashMatch) {
    return { v: marker.v, isIdempotentRetry: true, wasCompacted: false };
  }
  const safeV = marker.v === target ? marker.v + 1 : Math.max(target, marker.v) + 1;
  assertVersionInRange(safeV, "resolvePublishVersion(otp-bump)");
  return { v: safeV, isIdempotentRetry: false, wasCompacted: false };
}

// profile/aggregator-pointer/blocked-state.ts
init_errors2();
var BLOCKED_KEY = "blocked";
function classifyBlockedReason(err) {
  if (err instanceof AggregatorPointerError) {
    switch (err.code) {
      case AggregatorPointerErrorCode.RETRY_EXHAUSTED:
        return "retry_exhausted";
      case AggregatorPointerErrorCode.AGGREGATOR_REJECTED:
        return "aggregator_rejected";
      case AggregatorPointerErrorCode.PROTOCOL_ERROR:
        return "protocol_error";
      case AggregatorPointerErrorCode.MARKER_CORRUPT:
        return "marker_corrupt";
      case AggregatorPointerErrorCode.REJECTED:
        return "rejected";
      case AggregatorPointerErrorCode.NETWORK_ERROR: {
        const cat = err.details?.category;
        if (cat === "network_timeout" || cat === "dns_failure" || cat === "tls_failure") {
          return cat;
        }
        const msg = err.message.toLowerCase();
        if (msg.includes("timeout") || msg.includes("timed out")) return "network_timeout";
        if (msg.includes("dns") || msg.includes("enotfound") || msg.includes("getaddrinfo"))
          return "dns_failure";
        if (msg.includes("tls") || msg.includes("ssl") || msg.includes("cert"))
          return "tls_failure";
        return null;
      }
      default:
        return null;
    }
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    const code2 = err.code?.toLowerCase() ?? "";
    if (code2 === "econnreset" || code2 === "econnrefused") return null;
    if (msg.includes("timeout") || code2 === "etimedout") return "network_timeout";
    if (msg.includes("getaddrinfo") || msg.includes("enotfound") || code2 === "enotfound")
      return "dns_failure";
    if (msg.includes("tls") || msg.includes("ssl") || msg.includes("cert"))
      return "tls_failure";
  }
  return null;
}
var KNOWN_BLOCKED_REASONS = /* @__PURE__ */ new Set([
  "retry_exhausted",
  "network_timeout",
  "dns_failure",
  "tls_failure",
  "aggregator_rejected",
  "protocol_error",
  "marker_corrupt",
  "rejected"
]);
async function isBlocked(store) {
  const raw2 = await store.get(BLOCKED_KEY);
  if (raw2 === null) return { blocked: false };
  let rec;
  try {
    rec = JSON.parse(raw2);
  } catch {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.CORRUPT,
      "BLOCKED flag storage contains invalid JSON \u2014 possible corruption or tampering (SPEC \xA710.2).",
      { raw: raw2.slice(0, 200) }
    );
  }
  const r = rec;
  if (r.blocked !== true || typeof r.reason !== "string" || typeof r.setAt !== "number") {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.CORRUPT,
      "BLOCKED flag storage record failed shape check \u2014 possible corruption (SPEC \xA710.2).",
      { record: rec }
    );
  }
  if (!KNOWN_BLOCKED_REASONS.has(r.reason)) {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.CORRUPT,
      `BLOCKED flag storage contains unrecognized reason "${r.reason}" \u2014 possible storage tampering or a newer spec version. Remove the BLOCKED flag manually or upgrade the SDK.`,
      { record: rec }
    );
  }
  return { blocked: true, reason: r.reason, setAt: r.setAt };
}
async function setBlocked(store, reason) {
  if (!KNOWN_BLOCKED_REASONS.has(reason)) {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.PROTOCOL_ERROR,
      `BlockedReason "${String(reason)}" is not a recognized persistable reason. Allowed: ${[...KNOWN_BLOCKED_REASONS].join(", ")}. (The synthetic 'corrupt' reason is read-side only and must not be persisted.)`
    );
  }
  let existing;
  try {
    existing = await isBlocked(store);
  } catch (err) {
    if (err instanceof AggregatorPointerError && err.code === AggregatorPointerErrorCode.CORRUPT) {
      existing = { blocked: false };
    } else {
      throw err;
    }
  }
  if (existing.blocked) return;
  const rec = { blocked: true, reason, setAt: Date.now() };
  await store.set(BLOCKED_KEY, JSON.stringify(rec));
}
async function clearBlocked(store) {
  await store.remove(BLOCKED_KEY);
}
async function hasUnrecognizedBlockedReason(store) {
  let raw2;
  try {
    raw2 = await store.get(BLOCKED_KEY);
  } catch {
    return false;
  }
  if (raw2 === null) return false;
  let rec;
  try {
    rec = JSON.parse(raw2);
  } catch {
    return false;
  }
  const r = rec;
  if (r.blocked !== true || typeof r.reason !== "string" || typeof r.setAt !== "number") {
    return false;
  }
  if (r.reason.length === 0 || r.reason.trim() !== r.reason) return false;
  if (!/^[a-z][a-z0-9_]*$/.test(r.reason)) return false;
  return !KNOWN_BLOCKED_REASONS.has(r.reason);
}
async function maybeSetBlocked(store, err) {
  const reason = classifyBlockedReason(err);
  if (reason === null) return null;
  await setBlocked(store, reason);
  return reason;
}

// profile/aggregator-pointer/mutex-lock.ts
init_errors2();
function validateTimeoutMs(timeoutMs, mutexName) {
  const TIMEOUT_HARD_CEILING_MS = 36e5;
  if (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.PROTOCOL_ERROR,
      `Mutex "${mutexName}" acquire: timeoutMs must be a positive finite number, got ${String(timeoutMs)}.`
    );
  }
  if (timeoutMs > TIMEOUT_HARD_CEILING_MS) {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.PROTOCOL_ERROR,
      `Mutex "${mutexName}" acquire: timeoutMs ${timeoutMs}ms exceeds upper bound ${TIMEOUT_HARD_CEILING_MS}ms (1 hour).`
    );
  }
  return timeoutMs;
}
function isBrowser() {
  return typeof globalThis.navigator !== "undefined" && typeof globalThis.window !== "undefined" && // Exclude Electron renderer (needs file-based cross-process locking).
  !(typeof process !== "undefined" && process.versions?.electron);
}
function isNode() {
  return typeof process !== "undefined" && process.versions?.node != null;
}
var BrowserMutex = class {
  #lockName;
  constructor(lockName) {
    if (typeof navigator?.locks?.request !== "function") {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.UNSUPPORTED_RUNTIME,
        "Web Locks API unavailable \u2014 cross-tab mutual exclusion for pointer publish is not supported in this browser."
      );
    }
    this.#lockName = lockName;
  }
  async acquire(opts) {
    const timeoutMs = validateTimeoutMs(opts?.timeoutMs ?? 3e4, this.#lockName);
    return new Promise((resolve, reject) => {
      let timedOut = false;
      let released = false;
      let releaseCallback = null;
      const releasePromise = new Promise((res) => {
        releaseCallback = res;
      });
      const timer = setTimeout(() => {
        timedOut = true;
        reject(
          new AggregatorPointerError(
            AggregatorPointerErrorCode.PUBLISH_BUSY,
            `Web Locks mutex "${this.#lockName}" not acquired within ${timeoutMs}ms.`
          )
        );
      }, timeoutMs);
      navigator.locks.request(this.#lockName, { mode: "exclusive" }, async (_lock) => {
        clearTimeout(timer);
        if (timedOut) {
          releaseCallback();
          return;
        }
        let alreadyReleased = false;
        let lockStillValid = true;
        const invalidate = () => {
          lockStillValid = false;
        };
        const win = typeof globalThis.window !== "undefined" ? globalThis.window : void 0;
        const hasListeners = typeof win?.addEventListener === "function" && typeof win?.removeEventListener === "function";
        if (hasListeners) {
          win.addEventListener("freeze", invalidate);
          win.addEventListener("pagehide", invalidate);
        }
        const lockName = this.#lockName;
        resolve({
          release: async () => {
            if (alreadyReleased) return;
            alreadyReleased = true;
            released = true;
            if (hasListeners) {
              win.removeEventListener("freeze", invalidate);
              win.removeEventListener("pagehide", invalidate);
            }
            releaseCallback();
          },
          assertHeld: () => {
            if (!lockStillValid || alreadyReleased) {
              throw new AggregatorPointerError(
                AggregatorPointerErrorCode.PUBLISH_BUSY,
                `Web Locks mutex "${lockName}" was lost (BFCache/freeze/discard). Aborting to avoid submitting at a stale version after lock loss.`
              );
            }
          }
        });
        await releasePromise;
        void released;
      }).catch((err) => {
        clearTimeout(timer);
        if (!timedOut) {
          reject(
            new AggregatorPointerError(
              AggregatorPointerErrorCode.UNSUPPORTED_RUNTIME,
              `Web Locks request failed: ${String(err)}`,
              void 0,
              { cause: err }
            )
          );
        }
      });
    });
  }
};
async function defaultNodeLockPrimitives(lockFilePath) {
  const { Mutex } = await import("async-mutex");
  const mutex = new Mutex();
  return {
    acquireInProcess: () => mutex.acquire(),
    acquireFileLock: async (p, staleMs) => {
      const lockfile = await import("proper-lockfile");
      const { writeFile } = await import("fs/promises");
      await writeFile(p, "", { flag: "a" });
      return lockfile.lock(p, { stale: staleMs, realpath: false, retries: { retries: 0 } });
    }
  };
}
var NodeMutex = class {
  #lockFilePath;
  #primitives = null;
  #primitivesInitialized = false;
  constructor(lockFilePath) {
    this.#lockFilePath = lockFilePath;
  }
  async #getPrimitives() {
    if (!this.#primitives) {
      this.#primitives = await defaultNodeLockPrimitives(this.#lockFilePath);
      this.#primitivesInitialized = true;
    }
    return this.#primitives;
  }
  /**
   * For testing only: inject spy-instrumented primitives.
   * MUST be called before the first acquire(); throws if called after.
   */
  _injectPrimitives(primitives) {
    if (this.#primitivesInitialized) {
      throw new Error(
        "_injectPrimitives may not be called after the first acquire() \u2014 replacing primitives mid-flight would break mutual exclusion."
      );
    }
    this.#primitives = primitives;
    this.#primitivesInitialized = true;
  }
  async acquire(opts) {
    const timeoutMs = validateTimeoutMs(opts?.timeoutMs ?? 3e4, this.#lockFilePath);
    const prim = await this.#getPrimitives();
    const deadline = Date.now() + timeoutMs;
    let timedOut = false;
    let inProcessRelease = null;
    const inProcessAcquirePromise = prim.acquireInProcess();
    void inProcessAcquirePromise.then(
      (release) => {
        if (timedOut) {
          try {
            release();
          } catch {
          }
        }
      },
      () => {
      }
    );
    let inProcessTimeoutHandle;
    const inProcessTimeout = new Promise((_, reject) => {
      inProcessTimeoutHandle = setTimeout(() => {
        timedOut = true;
        reject(
          new AggregatorPointerError(
            AggregatorPointerErrorCode.PUBLISH_BUSY,
            `In-process mutex for "${this.#lockFilePath}" not acquired within ${timeoutMs}ms.`
          )
        );
      }, timeoutMs);
    });
    void inProcessTimeout.catch(() => {
    });
    try {
      inProcessRelease = await Promise.race([inProcessAcquirePromise, inProcessTimeout]);
    } catch (err) {
      clearTimeout(inProcessTimeoutHandle);
      throw err;
    }
    clearTimeout(inProcessTimeoutHandle);
    const retryMs = 250;
    let fileLockRelease = null;
    while (true) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        inProcessRelease();
        throw new AggregatorPointerError(
          AggregatorPointerErrorCode.PUBLISH_BUSY,
          `File lock "${this.#lockFilePath}" held by another process; timed out after ${timeoutMs}ms.`
        );
      }
      try {
        fileLockRelease = await prim.acquireFileLock(this.#lockFilePath, FILE_LOCK_STALE_MS);
        break;
      } catch (err) {
        const code2 = err?.code;
        if (code2 === "ELOCKED") {
          await new Promise((res) => setTimeout(res, Math.max(0, Math.min(retryMs, deadline - Date.now()))));
          continue;
        }
        inProcessRelease();
        throw new AggregatorPointerError(
          AggregatorPointerErrorCode.UNSUPPORTED_RUNTIME,
          `Failed to acquire file lock "${this.#lockFilePath}": ${String(err)}`,
          void 0,
          { cause: err }
        );
      }
    }
    let alreadyReleased = false;
    return {
      release: async () => {
        if (alreadyReleased) return;
        alreadyReleased = true;
        try {
          await fileLockRelease();
        } finally {
          if (typeof inProcessRelease === "function") {
            try {
              inProcessRelease();
            } catch {
            }
          }
        }
      },
      assertHeld: () => {
        if (alreadyReleased) {
          throw new AggregatorPointerError(
            AggregatorPointerErrorCode.PUBLISH_BUSY,
            "Node mutex handle already released; cannot proceed with submit."
          );
        }
      }
    };
  }
};
function createPointerMutex(lockName, opts) {
  if (isBrowser()) {
    return new BrowserMutex(lockName);
  }
  if (isNode()) {
    const lockFilePath = opts?.lockFilePath;
    if (!lockFilePath) {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.UNSUPPORTED_RUNTIME,
        "Node.js pointer mutex requires lockFilePath (e.g. <dataDir>/profile/<pubkey>/publish.lock)."
      );
    }
    return new NodeMutex(lockFilePath);
  }
  throw new AggregatorPointerError(
    AggregatorPointerErrorCode.UNSUPPORTED_RUNTIME,
    "Unknown runtime \u2014 cannot create pointer publish mutex."
  );
}

// profile/aggregator-pointer/index.ts
init_originated_tag();

// profile/aggregator-pointer/aggregator-submit.ts
import { Authenticator } from "@unicitylabs/state-transition-sdk/lib/api/Authenticator.js";
import { RequestId } from "@unicitylabs/state-transition-sdk/lib/api/RequestId.js";
import {
  SubmitCommitmentStatus
} from "@unicitylabs/state-transition-sdk/lib/api/SubmitCommitmentResponse.js";
import { DataHash } from "@unicitylabs/state-transition-sdk/lib/hash/DataHash.js";
import { HashAlgorithm } from "@unicitylabs/state-transition-sdk/lib/hash/HashAlgorithm.js";
init_errors2();
function xor32(a, b) {
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = (a[i] ?? 0) ^ (b[i] ?? 0);
  return out;
}
function scheduleZeroization(buf) {
  const handle = setTimeout(() => {
    try {
      buf.fill(0);
    } catch {
    }
  }, MAX_CT_RESIDENT_MS);
  if (typeof handle === "object" && handle !== null && "unref" in handle) {
    handle.unref();
  }
}
async function submitOneSide(client, requestId, transactionHash, authenticator, timeoutMs, abortSignal) {
  if (abortSignal?.aborted) {
    const err = new Error("submitCommitment aborted by caller");
    err.name = "AbortError";
    throw err;
  }
  let timeoutHandle;
  let abortListener;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      const err = new Error(`submitCommitment timed out after ${timeoutMs}ms`);
      err.name = "PointerSubmitTimeout";
      reject(err);
    }, timeoutMs);
  });
  const abortPromise = abortSignal ? new Promise((_, reject) => {
    abortListener = () => {
      const err = new Error("submitCommitment aborted by caller");
      err.name = "AbortError";
      reject(err);
    };
    abortSignal.addEventListener("abort", abortListener, { once: true });
  }) : null;
  try {
    const racers = [
      client.submitCommitment(requestId, transactionHash, authenticator),
      timeoutPromise
    ];
    if (abortPromise) racers.push(abortPromise);
    return await Promise.race(racers);
  } finally {
    if (timeoutHandle !== void 0) clearTimeout(timeoutHandle);
    if (abortListener && abortSignal) {
      abortSignal.removeEventListener("abort", abortListener);
    }
  }
}
function classifySideResult(result) {
  if (result.status === "fulfilled") {
    const response = result.value;
    switch (response.status) {
      case SubmitCommitmentStatus.SUCCESS:
        return { type: "success" };
      case SubmitCommitmentStatus.REQUEST_ID_EXISTS:
        return { type: "exists" };
      case SubmitCommitmentStatus.AUTHENTICATOR_VERIFICATION_FAILED:
        return { type: "rejected", reason: "AUTHENTICATOR_VERIFICATION_FAILED" };
      case SubmitCommitmentStatus.REQUEST_ID_MISMATCH:
        return { type: "rejected", reason: "REQUEST_ID_MISMATCH" };
      default:
        return {
          type: "protocol_error",
          reason: `Unknown SubmitCommitmentStatus: ${String(response.status)}`
        };
    }
  }
  const err = result.reason;
  if (err !== null && typeof err === "object" && err.name === "JsonRpcNetworkError" && typeof err.status === "number") {
    const status = err.status;
    const msg = err.message ?? "";
    if (status === 429) {
      return { type: "retry_after", retryAfterMs: 1e3 };
    }
    if (status >= 500 && status < 600) {
      return { type: "backoff", statusCode: status };
    }
    if (status >= 400 && status < 500) {
      return {
        type: "aggregator_rejected",
        reason: `HTTP ${status}${msg ? `: ${msg}` : ""}`,
        statusCode: status
      };
    }
    return { type: "protocol_error", reason: `Unexpected HTTP status ${status}${msg ? `: ${msg}` : ""}` };
  }
  if (err !== null && typeof err === "object" && err.name === "JsonRpcError" && typeof err.code === "number") {
    const code2 = err.code;
    const msg = err.message ?? "";
    if (code2 === -32006) {
      return { type: "retry_after", retryAfterMs: 1e3 };
    }
    return { type: "protocol_error", reason: `JSON-RPC error ${code2}${msg ? `: ${msg}` : ""}` };
  }
  if (err instanceof Error) {
    if (err.name === "SyntaxError") {
      return { type: "protocol_error", reason: err.message };
    }
    if (err.message.startsWith("Invalid response format")) {
      return { type: "protocol_error", reason: err.message };
    }
    return { type: "network_error" };
  }
  return { type: "network_error" };
}
function combineOutcomes(outA, outB, v, cidBytes, marker, isIdempotentRetryHint = false) {
  if (outA.type === "protocol_error") return { kind: "protocol_error", reason: `side=A: ${outA.reason}` };
  if (outB.type === "protocol_error") return { kind: "protocol_error", reason: `side=B: ${outB.reason}` };
  if (outA.type === "rejected") return { kind: "rejected", v, failedSide: SIDE_A_NUM, reason: outA.reason };
  if (outB.type === "rejected") return { kind: "rejected", v, failedSide: SIDE_B_NUM, reason: outB.reason };
  if (outA.type === "aggregator_rejected") return { kind: "aggregator_rejected", reason: `side=A: ${outA.reason}` };
  if (outB.type === "aggregator_rejected") return { kind: "aggregator_rejected", reason: `side=B: ${outB.reason}` };
  if (outA.type === "retry_after" || outB.type === "retry_after") {
    const retryMsA = outA.type === "retry_after" ? outA.retryAfterMs : 0;
    const retryMsB = outB.type === "retry_after" ? outB.retryAfterMs : 0;
    const retryAfterMs = Math.min(6e5, Math.max(retryMsA, retryMsB));
    return { kind: "retry_after", retryAfterMs, burnedBudget: false };
  }
  if (outA.type === "backoff" || outB.type === "backoff") {
    return { kind: "retry_backoff", burnedBudget: true };
  }
  const netA = outA.type === "network_error";
  const netB = outB.type === "network_error";
  if (netA && netB) return { kind: "retry_both" };
  if (netA) {
    const committedSideKind = outB.type === "success" ? "success" : "exists";
    return { kind: "retry_side", side: SIDE_A_NUM, committedSideKind };
  }
  if (netB) {
    const committedSideKind = outA.type === "success" ? "success" : "exists";
    return { kind: "retry_side", side: SIDE_B_NUM, committedSideKind };
  }
  const sA = outA.type;
  const sB = outB.type;
  if (sA === "success" && sB === "success") return { kind: "success", v };
  if (sA === "success" && sB === "exists") return { kind: "idempotent_replay", v };
  if (sA === "exists" && sB === "success") return { kind: "idempotent_replay", v };
  if (sA === "exists" && sB === "exists") {
    if (isIdempotentRetryHint) {
      return { kind: "idempotent_replay", v };
    }
    void marker;
    void cidBytes;
    return { kind: "conflict", v };
  }
  return {
    kind: "protocol_error",
    reason: `Unhandled outcome combination: sideA=${sA}, sideB=${sB}`
  };
}
async function submitPointer(input) {
  const { v, cidBytes, keyMaterial, signer, aggregatorClient, marker } = input;
  const timeoutMs = input.timeoutMs ?? PUBLISH_REQUEST_TIMEOUT_MS;
  const isIdempotentRetryHint = input.isIdempotentRetryHint ?? false;
  if (!Number.isInteger(v) || v < VERSION_MIN || v > VERSION_MAX) {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.VERSION_OUT_OF_RANGE,
      `submitPointer: v must be in [${VERSION_MIN}, ${VERSION_MAX}]; got ${v}.`,
      { v }
    );
  }
  if (cidBytes.length < 1 || cidBytes.length > CID_MAX_BYTES) {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.CID_TOO_LARGE,
      `submitPointer: cidBytes length must be in [1, ${CID_MAX_BYTES}]; got ${cidBytes.length}.`,
      { cidLen: cidBytes.length }
    );
  }
  const paddingBytes = derivePaddingBytes(keyMaterial.padSeed, v, cidBytes.length);
  const stateHashDigestA = deriveStateHashDigest(keyMaterial.xorSeed, SIDE_A_NUM, v);
  const stateHashDigestB = deriveStateHashDigest(keyMaterial.xorSeed, SIDE_B_NUM, v);
  const xorKeyA = deriveXorKey(keyMaterial.xorSeed, SIDE_A_NUM, v);
  const xorKeyB = deriveXorKey(keyMaterial.xorSeed, SIDE_B_NUM, v);
  const full = new Uint8Array(64);
  full[0] = cidBytes.length;
  full.set(cidBytes, 1);
  full.set(paddingBytes, 1 + cidBytes.length);
  const partA = full.subarray(0, 32);
  const partB = full.subarray(32, 64);
  const ctA = xor32(partA, xorKeyA);
  const ctB = xor32(partB, xorKeyB);
  scheduleZeroization(ctA);
  scheduleZeroization(ctB);
  try {
    const transactionHashA = new DataHash(HashAlgorithm.SHA256, ctA);
    const transactionHashB = new DataHash(HashAlgorithm.SHA256, ctB);
    const stateHashA = new DataHash(HashAlgorithm.SHA256, stateHashDigestA);
    const stateHashB = new DataHash(HashAlgorithm.SHA256, stateHashDigestB);
    const [authenticatorA, authenticatorB] = await Promise.all([
      Authenticator.create(signer.service, transactionHashA, stateHashA),
      Authenticator.create(signer.service, transactionHashB, stateHashB)
    ]);
    const [requestIdA, requestIdB] = await Promise.all([
      RequestId.createFromImprint(signer.signingPubKey, stateHashA.imprint),
      RequestId.createFromImprint(signer.signingPubKey, stateHashB.imprint)
    ]);
    const [resultA, resultB] = await Promise.allSettled([
      submitOneSide(aggregatorClient, requestIdA, transactionHashA, authenticatorA, timeoutMs, input.abortSignal),
      submitOneSide(aggregatorClient, requestIdB, transactionHashB, authenticatorB, timeoutMs, input.abortSignal)
    ]);
    const outcomeA = classifySideResult(resultA);
    const outcomeB = classifySideResult(resultB);
    return combineOutcomes(outcomeA, outcomeB, v, cidBytes, marker, isIdempotentRetryHint);
  } finally {
    ctA.fill(0);
    ctB.fill(0);
    full.fill(0);
    paddingBytes.fill(0);
    stateHashDigestA.fill(0);
    stateHashDigestB.fill(0);
    xorKeyA.fill(0);
    xorKeyB.fill(0);
  }
}

// profile/aggregator-pointer/aggregator-probe.ts
import { RequestId as RequestId2 } from "@unicitylabs/state-transition-sdk/lib/api/RequestId.js";
import { DataHash as DataHash2 } from "@unicitylabs/state-transition-sdk/lib/hash/DataHash.js";
import { HashAlgorithm as HashAlgorithm2 } from "@unicitylabs/state-transition-sdk/lib/hash/HashAlgorithm.js";
import { InclusionProofVerificationStatus } from "@unicitylabs/state-transition-sdk/lib/transaction/InclusionProof.js";
init_errors2();

// profile/aggregator-pointer/trust-base-rotation.ts
init_errors2();
function classifyTrustBaseRotation(trustBase, proof) {
  const localEpoch = trustBase.epoch;
  const certEpoch = proof.unicityCertificate.unicitySeal.epoch;
  return {
    isRotation: certEpoch > localEpoch,
    localEpoch,
    certEpoch
  };
}
function raiseForTrustBaseMismatch(trustBase, proof, context) {
  const { isRotation, localEpoch, certEpoch } = classifyTrustBaseRotation(trustBase, proof);
  if (isRotation) {
    const gap = certEpoch - localEpoch;
    if (gap > MAX_PLAUSIBLE_EPOCH_GAP) {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.UNTRUSTED_PROOF,
        `${context}: certificate claims epoch ${certEpoch.toString()} \u2014 gap of ${gap.toString()} from bundled epoch ${localEpoch.toString()} exceeds MAX_PLAUSIBLE_EPOCH_GAP=${MAX_PLAUSIBLE_EPOCH_GAP.toString()}; rejecting as forgery (SPEC \xA78.4.1 H5 + T-C4 DoS guard).`,
        {
          localEpoch: localEpoch.toString(),
          certEpoch: certEpoch.toString(),
          gap: gap.toString(),
          maxPlausibleGap: MAX_PLAUSIBLE_EPOCH_GAP.toString()
        }
      );
    }
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.TRUST_BASE_STALE,
      `${context}: aggregator returned a proof signed under epoch ${certEpoch.toString()}, but the bundled RootTrustBase is pinned at epoch ${localEpoch.toString()}. The BFT validator set has rotated faster than the SDK release cadence; update the SDK to a build whose bundled trust base carries the new epoch (SPEC \xA78.4.1, H5).`,
      { localEpoch: localEpoch.toString(), certEpoch: certEpoch.toString() }
    );
  }
  throw new AggregatorPointerError(
    AggregatorPointerErrorCode.UNTRUSTED_PROOF,
    `${context}: proof failed trustless verification and is NOT a legitimate rotation (cert epoch ${certEpoch.toString()} <= bundled epoch ${localEpoch.toString()}); rejecting as possible replay or forgery (SPEC \xA78.4.1).`,
    { localEpoch: localEpoch.toString(), certEpoch: certEpoch.toString() }
  );
}

// profile/aggregator-pointer/aggregator-probe.ts
async function buildRequestIds(keyMaterial, signer, v) {
  const stateHashDigestA = deriveStateHashDigest(keyMaterial.xorSeed, SIDE_A_NUM, v);
  const stateHashDigestB = deriveStateHashDigest(keyMaterial.xorSeed, SIDE_B_NUM, v);
  try {
    const stateHashA = new DataHash2(HashAlgorithm2.SHA256, stateHashDigestA);
    const stateHashB = new DataHash2(HashAlgorithm2.SHA256, stateHashDigestB);
    const [reqA, reqB] = await Promise.all([
      RequestId2.createFromImprint(signer.signingPubKey, stateHashA.imprint),
      RequestId2.createFromImprint(signer.signingPubKey, stateHashB.imprint)
    ]);
    return { reqA, reqB, stateHashA, stateHashB };
  } finally {
    stateHashDigestA.fill(0);
    stateHashDigestB.fill(0);
  }
}
async function fetchProofWithTimeout(client, requestId, timeoutMs, abortSignal) {
  if (abortSignal?.aborted) {
    const err = new Error("getInclusionProof aborted by caller");
    err.name = "PointerProbeAborted";
    throw err;
  }
  let timeoutHandle;
  let abortListener;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      const err = new Error(`getInclusionProof timed out after ${timeoutMs}ms`);
      err.name = "PointerProbeTimeout";
      reject(err);
    }, timeoutMs);
  });
  const abortPromise = abortSignal ? new Promise((_, reject) => {
    abortListener = () => {
      const err = new Error("getInclusionProof aborted by caller");
      err.name = "PointerProbeAborted";
      reject(err);
    };
    abortSignal.addEventListener("abort", abortListener, { once: true });
  }) : null;
  try {
    const racers = [client.getInclusionProof(requestId), timeoutPromise];
    if (abortPromise) racers.push(abortPromise);
    const response = await Promise.race(racers);
    if (response === null || typeof response !== "object" || !("inclusionProof" in response) || response.inclusionProof === null || response.inclusionProof === void 0) {
      const err = new Error(
        `getInclusionProof response missing inclusionProof (SDK shape mismatch)`
      );
      err.name = "PointerProtocolError";
      throw err;
    }
    return response.inclusionProof;
  } finally {
    if (timeoutHandle !== void 0) clearTimeout(timeoutHandle);
    if (abortListener && abortSignal) {
      abortSignal.removeEventListener("abort", abortListener);
    }
  }
}
async function probeVersion(input) {
  const { v, keyMaterial, signer, aggregatorClient, trustBase } = input;
  const timeoutMs = input.timeoutMs ?? PROBE_REQUEST_TIMEOUT_MS;
  const { reqA, reqB } = await buildRequestIds(keyMaterial, signer, v);
  const [proofA, proofB] = await Promise.all([
    fetchProofWithTimeout(aggregatorClient, reqA, timeoutMs, input.abortSignal),
    fetchProofWithTimeout(aggregatorClient, reqB, timeoutMs, input.abortSignal)
  ]);
  const [statusA, statusB] = await Promise.all([
    proofA.verify(trustBase, reqA),
    proofB.verify(trustBase, reqB)
  ]);
  if (statusA === InclusionProofVerificationStatus.NOT_AUTHENTICATED || statusA === InclusionProofVerificationStatus.PATH_INVALID) {
    raiseForTrustBaseMismatch(trustBase, proofA, `probeVersion(v=${v}, side=A)`);
  }
  if (statusB === InclusionProofVerificationStatus.NOT_AUTHENTICATED || statusB === InclusionProofVerificationStatus.PATH_INVALID) {
    raiseForTrustBaseMismatch(trustBase, proofB, `probeVersion(v=${v}, side=B)`);
  }
  const aIncluded = statusA === InclusionProofVerificationStatus.OK;
  const bIncluded = statusB === InclusionProofVerificationStatus.OK;
  return aIncluded || bIncluded;
}
async function runDecodePhases(v, keyMaterial, signer, aggregatorClient, trustBase, decodeCid, timeoutMs, abortSignal) {
  const { reqA, reqB } = await buildRequestIds(keyMaterial, signer, v);
  let proofA;
  let proofB;
  try {
    [proofA, proofB] = await Promise.all([
      fetchProofWithTimeout(aggregatorClient, reqA, timeoutMs, abortSignal),
      fetchProofWithTimeout(aggregatorClient, reqB, timeoutMs, abortSignal)
    ]);
  } catch (err) {
    if (err instanceof Error && err.name === "PointerProtocolError") {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.PROTOCOL_ERROR,
        err.message,
        void 0,
        { cause: err }
      );
    }
    return { ok: "transient" };
  }
  const [statusA, statusB] = await Promise.all([
    proofA.verify(trustBase, reqA),
    proofB.verify(trustBase, reqB)
  ]);
  if (statusA === InclusionProofVerificationStatus.NOT_AUTHENTICATED || statusA === InclusionProofVerificationStatus.PATH_INVALID) {
    raiseForTrustBaseMismatch(trustBase, proofA, `classifyVersion(v=${v}, side=A)`);
  }
  if (statusB === InclusionProofVerificationStatus.NOT_AUTHENTICATED || statusB === InclusionProofVerificationStatus.PATH_INVALID) {
    raiseForTrustBaseMismatch(trustBase, proofB, `classifyVersion(v=${v}, side=B)`);
  }
  if (statusA !== InclusionProofVerificationStatus.OK || statusB !== InclusionProofVerificationStatus.OK) {
    return { ok: "semantic" };
  }
  const txHashA = proofA.transactionHash;
  const txHashB = proofB.transactionHash;
  if (txHashA === null || txHashB === null) {
    return { ok: "semantic" };
  }
  const ctA = txHashA.data;
  const ctB = txHashB.data;
  if (ctA.length !== 32 || ctB.length !== 32) {
    return { ok: "semantic" };
  }
  const xorKeyA = deriveXorKey(keyMaterial.xorSeed, SIDE_A_NUM, v);
  const xorKeyB = deriveXorKey(keyMaterial.xorSeed, SIDE_B_NUM, v);
  const full = new Uint8Array(64);
  try {
    for (let i = 0; i < 32; i++) full[i] = (ctA[i] ?? 0) ^ (xorKeyA[i] ?? 0);
    for (let i = 0; i < 32; i++) full[32 + i] = (ctB[i] ?? 0) ^ (xorKeyB[i] ?? 0);
    const decoded = decodeCid(full);
    if (!decoded.ok) {
      return { ok: "semantic" };
    }
    return { ok: "cid", cidBytes: new Uint8Array(decoded.cidBytes) };
  } finally {
    full.fill(0);
    xorKeyA.fill(0);
    xorKeyB.fill(0);
  }
}
async function classifyVersion(input) {
  const { v, keyMaterial, signer, aggregatorClient, trustBase, decodeCid, fetchCar } = input;
  const timeoutMs = input.timeoutMs ?? PROBE_REQUEST_TIMEOUT_MS;
  const phase12 = await runDecodePhases(
    v,
    keyMaterial,
    signer,
    aggregatorClient,
    trustBase,
    decodeCid,
    timeoutMs,
    input.abortSignal
  );
  if (phase12.ok === "transient") return "TRANSIENT_UNAVAILABLE";
  if (phase12.ok === "semantic") return "SEMANTICALLY_INVALID";
  const carResult = await fetchCar(phase12.cidBytes);
  if (carResult.ok) {
    return "VALID";
  }
  switch (carResult.kind) {
    case "transient_unavailable":
      return "TRANSIENT_UNAVAILABLE";
    case "content_mismatch":
    case "car_parse_failed":
    default:
      return "SEMANTICALLY_INVALID";
  }
}
async function decodeVersionCid(input) {
  const timeoutMs = input.timeoutMs ?? PROBE_REQUEST_TIMEOUT_MS;
  const outcome = await runDecodePhases(
    input.v,
    input.keyMaterial,
    input.signer,
    input.aggregatorClient,
    input.trustBase,
    input.decodeCid,
    timeoutMs
  );
  if (outcome.ok === "cid") {
    return { ok: true, cidBytes: outcome.cidBytes };
  }
  return { ok: false, reason: outcome.ok === "transient" ? "transient" : "semantic" };
}
async function isReachable(input) {
  const { signingPubKey, aggregatorClient } = input;
  const timeoutMs = input.timeoutMs ?? PROBE_REQUEST_TIMEOUT_MS;
  try {
    const digest = deriveHealthCheckRequestId(signingPubKey);
    const imprint = new Uint8Array(34);
    imprint[0] = 0;
    imprint[1] = 0;
    imprint.set(digest, 2);
    let hex = "";
    for (const b of imprint) hex += b.toString(16).padStart(2, "0");
    const healthCheckRequestId = RequestId2.fromJSON(hex);
    await fetchProofWithTimeout(aggregatorClient, healthCheckRequestId, timeoutMs);
    return true;
  } catch (err) {
    if (err !== null && typeof err === "object" && err.name === "JsonRpcNetworkError") {
      return true;
    }
    if (err !== null && typeof err === "object" && err.name === "JsonRpcError") {
      return true;
    }
    return false;
  }
}

// profile/aggregator-pointer/ipfs-car-fetch.ts
init_errors2();
function concat2(parts, totalLen) {
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}
async function fetchAttempt(url, rangeStart, maxBytes, initialResponseMs, stallMs, remainingTotalMs) {
  const controller = new AbortController();
  const abortState = { reason: "ok" };
  const initialTimer = setTimeout(() => {
    abortState.reason = "initial";
    controller.abort();
  }, initialResponseMs);
  const totalTimer = setTimeout(() => {
    abortState.reason = "total";
    controller.abort();
  }, remainingTotalMs);
  let stallTimer;
  const armStallTimer = () => {
    if (stallTimer !== void 0) clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      abortState.reason = "stall";
      controller.abort();
    }, stallMs);
  };
  const headers = {};
  if (rangeStart > 0) {
    headers["Range"] = `bytes=${rangeStart}-`;
  }
  let response;
  try {
    response = await fetch(url, { method: "GET", headers, signal: controller.signal });
  } catch (err) {
    clearTimeout(initialTimer);
    clearTimeout(totalTimer);
    if (abortState.reason === "initial") {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.CAR_FETCH_TIMEOUT,
        `CAR fetch initial-response timeout after ${initialResponseMs}ms (${url})`
      );
    }
    if (abortState.reason === "total") {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.CAR_FETCH_TIMEOUT,
        `CAR fetch total timeout after ${remainingTotalMs}ms (${url})`
      );
    }
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.NETWORK_ERROR,
      `CAR fetch transport failure: ${String(err)}`,
      void 0,
      { cause: err }
    );
  }
  clearTimeout(initialTimer);
  const contentEncoding = response.headers.get("content-encoding");
  if (contentEncoding !== null && contentEncoding.trim() !== "" && contentEncoding.toLowerCase() !== "identity") {
    clearTimeout(totalTimer);
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.CAR_UNEXPECTED_ENCODING,
      `CAR fetch from ${url} returned Content-Encoding="${contentEncoding}"; require raw/identity bytes.`
    );
  }
  const contentLengthHeader = response.headers.get("content-length");
  let contentLength = null;
  if (contentLengthHeader !== null) {
    const trimmed = contentLengthHeader.trim();
    if (/^\d+$/.test(trimmed)) {
      const parsed = Number.parseInt(trimmed, 10);
      if (Number.isFinite(parsed) && parsed >= 0) {
        contentLength = parsed;
      }
    }
  }
  if (contentLength !== null && rangeStart + contentLength > maxBytes) {
    clearTimeout(totalTimer);
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.CAR_TOO_LARGE,
      `CAR fetch from ${url} advertises ${contentLength} bytes; combined with offset ${rangeStart} exceeds cap ${maxBytes}.`
    );
  }
  const rangeIgnored = rangeStart > 0 && response.status === 200;
  const acceptRanges = (response.headers.get("accept-ranges") ?? "").toLowerCase().includes("bytes");
  if (!response.ok) {
    clearTimeout(totalTimer);
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.CAR_UNAVAILABLE,
      `CAR fetch from ${url} returned HTTP ${response.status}: ${response.statusText}`,
      { status: response.status }
    );
  }
  if (response.body === null) {
    clearTimeout(totalTimer);
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.NETWORK_ERROR,
      `CAR fetch from ${url} returned no body.`
    );
  }
  const reader = response.body.getReader();
  const chunks = [];
  let bytesRead = 0;
  let stalled = false;
  let complete = false;
  armStallTimer();
  try {
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) {
        complete = true;
        break;
      }
      if (value !== void 0) {
        bytesRead += value.byteLength;
        if (rangeStart + bytesRead > maxBytes) {
          throw new AggregatorPointerError(
            AggregatorPointerErrorCode.CAR_TOO_LARGE,
            `CAR fetch from ${url} body exceeded cap ${maxBytes} at ${rangeStart + bytesRead} bytes.`
          );
        }
        chunks.push(value);
        armStallTimer();
      }
    }
  } catch (err) {
    if (abortState.reason === "stall") {
      stalled = true;
    } else if (abortState.reason === "total") {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.CAR_FETCH_TIMEOUT,
        `CAR fetch total timeout after ${remainingTotalMs}ms (${url}, read ${bytesRead} bytes)`
      );
    } else if (err instanceof AggregatorPointerError) {
      throw err;
    } else {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.NETWORK_ERROR,
        `CAR fetch stream error: ${String(err)}`,
        void 0,
        { cause: err }
      );
    }
  } finally {
    if (stallTimer !== void 0) clearTimeout(stallTimer);
    clearTimeout(totalTimer);
    if (stalled) {
      try {
        await reader.cancel("CAR_FETCH_STALL");
      } catch {
      }
    }
    try {
      reader.releaseLock();
    } catch {
    }
  }
  return {
    status: response.status,
    bytes: concat2(chunks, bytesRead),
    acceptRanges,
    contentLength,
    complete,
    stalled,
    rangeIgnored
  };
}
async function fetchCarFromGateway(url, opts = {}) {
  const initialResponseMs = opts.initialResponseMs ?? MAX_CAR_FETCH_INITIAL_RESPONSE_MS;
  const stallMs = opts.stallMs ?? MAX_CAR_FETCH_STALL_MS;
  const totalMs = opts.totalMs ?? MAX_CAR_FETCH_TOTAL_MS;
  const maxBytes = opts.maxBytes ?? MAX_CAR_BYTES;
  const allowRangeResume = opts.allowRangeResume ?? true;
  const startTime = Date.now();
  const remaining = () => Math.max(0, totalMs - (Date.now() - startTime));
  const accumulated = [];
  let rangeOffset = 0;
  let attemptedResume = false;
  for (; ; ) {
    let attempt;
    try {
      attempt = await fetchAttempt(url, rangeOffset, maxBytes, initialResponseMs, stallMs, remaining());
    } catch (err) {
      if (err instanceof AggregatorPointerError) {
        switch (err.code) {
          case AggregatorPointerErrorCode.CAR_FETCH_TIMEOUT:
            return { ok: false, kind: "total_timeout", detail: err.message };
          case AggregatorPointerErrorCode.CAR_UNEXPECTED_ENCODING:
            return { ok: false, kind: "content_encoding_rejected", detail: err.message };
          case AggregatorPointerErrorCode.CAR_TOO_LARGE:
            return { ok: false, kind: "byte_cap_exceeded", detail: err.message };
          case AggregatorPointerErrorCode.CAR_UNAVAILABLE:
            return { ok: false, kind: "http_error", detail: err.message };
          case AggregatorPointerErrorCode.NETWORK_ERROR:
            return { ok: false, kind: "network_error", detail: err.message };
          default:
            return { ok: false, kind: "network_error", detail: err.message };
        }
      }
      return { ok: false, kind: "network_error", detail: String(err) };
    }
    if (attempt.complete) {
      if (attempt.rangeIgnored) {
        return { ok: true, bytes: attempt.bytes };
      }
      if (accumulated.length === 0) {
        return { ok: true, bytes: attempt.bytes };
      }
      accumulated.push(attempt.bytes);
      const total = accumulated.reduce((s, c) => s + c.byteLength, 0);
      return { ok: true, bytes: concat2(accumulated, total) };
    }
    if (attempt.stalled && allowRangeResume && attempt.acceptRanges && !attemptedResume) {
      accumulated.push(attempt.bytes);
      rangeOffset += attempt.bytes.byteLength;
      attemptedResume = true;
      if (remaining() <= 0) {
        return { ok: false, kind: "total_timeout", detail: `CAR fetch exhausted total budget ${totalMs}ms` };
      }
      continue;
    }
    return { ok: false, kind: "stall_timeout", detail: `CAR fetch stalled after ${stallMs}ms; url=${url}` };
  }
}

// profile/aggregator-pointer/car-loss-tracker.ts
init_errors2();
var MAX_ATTEMPTS_RETAINED = CAR_FETCH_PERSISTENT_RETRY_ATTEMPTS * 4;
function attemptsKey(v) {
  return `car_loss_attempts_${v}`;
}
var ledgerMutexes = /* @__PURE__ */ new Map();
async function withLedgerLock(v, fn) {
  const key = attemptsKey(v);
  const previous = ledgerMutexes.get(key) ?? Promise.resolve();
  let release;
  const next = new Promise((resolve) => {
    release = resolve;
  });
  ledgerMutexes.set(key, previous.then(() => next));
  try {
    await previous;
    return await fn();
  } finally {
    release();
    if (ledgerMutexes.get(key) === previous.then(() => next)) {
    }
  }
}
async function readLedger(store, v) {
  const raw2 = await store.get(attemptsKey(v));
  if (raw2 === null) return { firstAttemptTs: 0, attempts: [] };
  let parsed;
  try {
    parsed = JSON.parse(raw2);
  } catch {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.CORRUPT,
      `car-loss ledger for v=${v} contains invalid JSON \u2014 refusing to evaluate acceptCarLoss gate (SPEC \xA710.7.1 H7).`
    );
  }
  if (parsed === null || typeof parsed !== "object" || !Array.isArray(parsed.attempts)) {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.CORRUPT,
      `car-loss ledger for v=${v} has malformed shape \u2014 refusing to evaluate gate.`
    );
  }
  const rec = parsed;
  const attempts = [];
  for (const entry of rec.attempts) {
    if (entry !== null && typeof entry === "object" && typeof entry.ts === "number" && typeof entry.gateway === "string") {
      attempts.push({
        ts: entry.ts,
        gateway: entry.gateway
      });
    }
  }
  const firstAttemptTs = typeof rec.firstAttemptTs === "number" ? rec.firstAttemptTs : attempts.length > 0 ? Math.min(...attempts.map((a) => a.ts)) : 0;
  return { firstAttemptTs, attempts };
}
async function writeLedger(store, v, record) {
  await store.set(attemptsKey(v), JSON.stringify(record));
}
async function recordAttempt(store, v, gateway, now = Date.now()) {
  await withLedgerLock(v, async () => {
    let ledger;
    try {
      ledger = await readLedger(store, v);
    } catch (err) {
      if (err instanceof AggregatorPointerError && err.code === AggregatorPointerErrorCode.CORRUPT) {
        ledger = { firstAttemptTs: now, attempts: [] };
      } else {
        throw err;
      }
    }
    const firstAttemptTs = ledger.attempts.length === 0 ? now : Math.min(ledger.firstAttemptTs, now);
    const attempts = [...ledger.attempts, { ts: now, gateway }];
    while (attempts.length > MAX_ATTEMPTS_RETAINED) {
      attempts.shift();
    }
    await writeLedger(store, v, { firstAttemptTs, attempts });
  });
}
async function clearAttempts(store, v) {
  await store.remove(attemptsKey(v));
}
async function canInvokeAcceptCarLoss(store, v, now = Date.now()) {
  const ledger = await readLedger(store, v);
  const attempts = ledger.attempts;
  const attemptCount = attempts.length;
  let elapsedMs = 0;
  if (attemptCount > 0) {
    elapsedMs = Math.max(0, now - ledger.firstAttemptTs);
  }
  const attemptsRemaining = Math.max(0, CAR_FETCH_PERSISTENT_RETRY_ATTEMPTS - attemptCount);
  const msRemaining = Math.max(0, CAR_FETCH_PERSISTENT_TOTAL_DURATION_MS - elapsedMs);
  const eligible = attemptsRemaining === 0 && msRemaining === 0;
  return { eligible, attemptCount, elapsedMs, attemptsRemaining, msRemaining };
}
async function assertAcceptCarLossEligible(store, v, now = Date.now()) {
  const gate = await canInvokeAcceptCarLoss(store, v, now);
  if (!gate.eligible) {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.UNREACHABLE_RECOVERY_BLOCKED,
      `acceptCarLoss(v=${v}) gate not yet satisfied: ${gate.attemptsRemaining} more attempt(s) needed and ${gate.msRemaining}ms more wall-clock required (SPEC \xA710.7.1 H7).`,
      {
        v,
        attemptCount: gate.attemptCount,
        elapsedMs: gate.elapsedMs,
        attemptsRemaining: gate.attemptsRemaining,
        msRemaining: gate.msRemaining
      }
    );
  }
}

// profile/aggregator-pointer/publish-algorithm.ts
init_errors2();
function computeBackoffMs(n) {
  const expo = Math.min(PUBLISH_BACKOFF_MAX_MS, PUBLISH_BACKOFF_BASE_MS * 2 ** n);
  const jitter = PUBLISH_BACKOFF_JITTER_LO + Math.random() * (PUBLISH_BACKOFF_JITTER_HI - PUBLISH_BACKOFF_JITTER_LO);
  return Math.round(expo * jitter);
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function publishOnce(input, v, attemptOpts, isIdempotentRetryHintInitial, mutexHandle) {
  const { cidBytes, keyMaterial, signer, aggregatorClient, flagStore } = input;
  let retriesConsumed = 0;
  let cumulativeRetryAfterMs = 0;
  const safeMaxRetries = !Number.isInteger(attemptOpts.maxRetries) || attemptOpts.maxRetries < 0 ? PUBLISH_RETRY_BUDGET : Math.min(attemptOpts.maxRetries, ATTEMPT_MAX_RETRIES_HARD_CAP);
  const loopDeadline = Date.now() + MAX_CUMULATIVE_RETRY_AFTER_MS + safeMaxRetries * (PUBLISH_BACKOFF_MAX_MS * 2 + PUBLISH_REQUEST_TIMEOUT_MS * 2);
  const marker = await readMarker(flagStore);
  let isIdempotentRetryHint = isIdempotentRetryHintInitial;
  for (; ; ) {
    if (Date.now() > loopDeadline) {
      const budgetMs = MAX_CUMULATIVE_RETRY_AFTER_MS + safeMaxRetries * (PUBLISH_BACKOFF_MAX_MS * 2 + PUBLISH_REQUEST_TIMEOUT_MS * 2);
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.RETRY_EXHAUSTED,
        `publishOnce exceeded wall-clock deadline after ${Date.now() - (loopDeadline - budgetMs)}ms (budget ${budgetMs}ms).`,
        { v, retriesConsumed, cumulativeRetryAfterMs }
      );
    }
    mutexHandle.assertHeld();
    let deadlineTimer;
    let deadlineFired = false;
    const submitAbort = new AbortController();
    let externalAbortListener;
    if (input.abortSignal) {
      if (input.abortSignal.aborted) {
        try {
          submitAbort.abort();
        } catch {
        }
      } else {
        externalAbortListener = () => {
          try {
            submitAbort.abort();
          } catch {
          }
        };
        input.abortSignal.addEventListener("abort", externalAbortListener, { once: true });
      }
    }
    const deadlineRace = new Promise((_, reject) => {
      const remaining = Math.max(0, loopDeadline - Date.now());
      deadlineTimer = setTimeout(() => {
        deadlineFired = true;
        try {
          submitAbort.abort();
        } catch {
        }
        reject(
          new AggregatorPointerError(
            AggregatorPointerErrorCode.RETRY_EXHAUSTED,
            `publishOnce wall-clock deadline tripped during submit at v=${v}.`,
            { v, retriesConsumed, cumulativeRetryAfterMs }
          )
        );
      }, remaining);
    });
    const submitPromise = submitPointer({
      v,
      cidBytes,
      keyMaterial,
      signer,
      aggregatorClient,
      marker,
      isIdempotentRetryHint,
      abortSignal: submitAbort.signal
    });
    let outcome;
    try {
      outcome = await Promise.race([submitPromise, deadlineRace]);
    } catch (raceErr) {
      if (deadlineFired) {
        const DRAIN_HARD_CAP_MS = 5e3;
        let drainedOutcome = null;
        let drainTimer;
        const drainTimeout = new Promise((resolve) => {
          drainTimer = setTimeout(() => resolve(null), DRAIN_HARD_CAP_MS);
          if (typeof drainTimer === "object" && drainTimer !== null && "unref" in drainTimer) {
            drainTimer.unref();
          }
        });
        try {
          drainedOutcome = await Promise.race([
            submitPromise.then((o) => o).catch(() => null),
            drainTimeout
          ]);
        } finally {
          if (drainTimer !== void 0) clearTimeout(drainTimer);
        }
        if (drainedOutcome) {
          const k = drainedOutcome.kind;
          if (k === "success" || k === "idempotent_replay" || k === "conflict" || k === "rejected" || k === "aggregator_rejected" || k === "protocol_error") {
            outcome = drainedOutcome;
          } else {
            throw raceErr;
          }
        } else {
          throw raceErr;
        }
      } else {
        throw raceErr;
      }
    } finally {
      if (deadlineTimer !== void 0) clearTimeout(deadlineTimer);
      if (externalAbortListener && input.abortSignal) {
        try {
          input.abortSignal.removeEventListener("abort", externalAbortListener);
        } catch {
        }
      }
      if (!submitAbort.signal.aborted) {
        try {
          submitAbort.abort();
        } catch {
        }
      }
      submitPromise.catch(() => void 0);
    }
    switch (outcome.kind) {
      case "success":
      case "idempotent_replay":
        return { kind: "success", v, idempotent: outcome.kind === "idempotent_replay" };
      case "conflict":
        return { kind: "conflict", v };
      case "rejected": {
        const err = new AggregatorPointerError(
          AggregatorPointerErrorCode.REJECTED,
          `publish at v=${v}: aggregator rejected side=${outcome.failedSide} (${outcome.reason}). H8 v-burning \u2014 version ${v} permanently consumed.`,
          { v, failedSide: outcome.failedSide, reason: outcome.reason }
        );
        throw err;
      }
      case "aggregator_rejected": {
        throw new AggregatorPointerError(
          AggregatorPointerErrorCode.AGGREGATOR_REJECTED,
          `publish at v=${v}: aggregator returned permanent 4xx \u2014 ${outcome.reason}`,
          { v, reason: outcome.reason }
        );
      }
      case "protocol_error": {
        throw new AggregatorPointerError(
          AggregatorPointerErrorCode.PROTOCOL_ERROR,
          `publish at v=${v}: protocol error \u2014 ${outcome.reason}`,
          { v, reason: outcome.reason }
        );
      }
      case "retry_after": {
        cumulativeRetryAfterMs += outcome.retryAfterMs;
        if (cumulativeRetryAfterMs > MAX_CUMULATIVE_RETRY_AFTER_MS) {
          throw new AggregatorPointerError(
            AggregatorPointerErrorCode.RETRY_EXHAUSTED,
            `publish at v=${v}: cumulative retry_after ${cumulativeRetryAfterMs}ms exceeds cap ${MAX_CUMULATIVE_RETRY_AFTER_MS}ms. Aggregator is returning persistent Retry-After; giving up.`,
            { v, cumulativeRetryAfterMs }
          );
        }
        await sleep(outcome.retryAfterMs);
        continue;
      }
      case "retry_backoff": {
        if (retriesConsumed >= safeMaxRetries) {
          throw new AggregatorPointerError(
            AggregatorPointerErrorCode.RETRY_EXHAUSTED,
            `publish at v=${v}: exhausted retry budget (${safeMaxRetries}) on HTTP 5xx backoff.`,
            { v }
          );
        }
        await sleep(computeBackoffMs(retriesConsumed));
        retriesConsumed += 1;
        continue;
      }
      case "retry_side":
      case "retry_both": {
        if (retriesConsumed >= safeMaxRetries) {
          throw new AggregatorPointerError(
            AggregatorPointerErrorCode.NETWORK_ERROR,
            `publish at v=${v}: exhausted retry budget (${safeMaxRetries}) on network-error retry.`,
            { v }
          );
        }
        if (outcome.kind === "retry_side" && outcome.committedSideKind === "success") {
          isIdempotentRetryHint = true;
        }
        await sleep(computeBackoffMs(retriesConsumed));
        retriesConsumed += 1;
        continue;
      }
    }
  }
}
async function publishOnceAtVersion(input, attemptOpts = { maxRetries: PUBLISH_RETRY_BUDGET }) {
  const { cidBytes, candidateV, currentLocalVersion, flagStore, mutex } = input;
  const mutexTimeoutMs = input.mutexTimeoutMs ?? 3e4;
  const handle = await mutex.acquire({ timeoutMs: mutexTimeoutMs });
  try {
    let blocked;
    try {
      blocked = await isBlocked(flagStore);
    } catch (corruptErr) {
      if (corruptErr instanceof AggregatorPointerError && corruptErr.code === AggregatorPointerErrorCode.CORRUPT) {
        throw new AggregatorPointerError(
          AggregatorPointerErrorCode.UNREACHABLE_RECOVERY_BLOCKED,
          "publish refused: BLOCKED-state record is corrupt \u2014 wallet must be unblocked via operator override before publish can resume.",
          void 0,
          { cause: corruptErr }
        );
      }
      throw corruptErr;
    }
    if (blocked.blocked) {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.UNREACHABLE_RECOVERY_BLOCKED,
        `publish refused: wallet is in BLOCKED state (reason=${blocked.reason ?? "unknown"}). Clear via recoverLatest() or acceptCarLoss() per SPEC \xA710.2.4.`,
        { reason: blocked.reason }
      );
    }
    let resolution;
    try {
      resolution = await resolvePublishVersion(flagStore, currentLocalVersion, cidBytes, candidateV);
    } catch (err) {
      try {
        await maybeSetBlocked(flagStore, err);
      } catch {
      }
      throw err;
    }
    const resolvedV = resolution.v;
    if (!resolution.isIdempotentRetry) {
      await writeMarker(flagStore, resolvedV, cidBytes);
    }
    let outcome;
    try {
      outcome = await publishOnce(input, resolvedV, attemptOpts, resolution.isIdempotentRetry, handle);
    } catch (submitErr) {
      if (submitErr instanceof AggregatorPointerError && submitErr.code === AggregatorPointerErrorCode.REJECTED) {
        const bookkeeping = {
          blockedSet: false,
          markerCleared: false,
          localVersionPersisted: false,
          failures: []
        };
        try {
          const reason = await maybeSetBlocked(flagStore, submitErr);
          bookkeeping.blockedSet = reason !== null;
          if (reason === null) {
            bookkeeping.failures.push("maybeSetBlocked returned null (classifier gap \u2014 REJECTED must map to a known reason)");
          }
        } catch (e) {
          bookkeeping.failures.push(`maybeSetBlocked threw: ${String(e)}`);
        }
        try {
          await input.persistLocalVersion(resolvedV);
          bookkeeping.localVersionPersisted = true;
        } catch (e) {
          bookkeeping.failures.push(`persistLocalVersion threw: ${String(e)}`);
        }
        if (bookkeeping.localVersionPersisted) {
          try {
            await clearMarker(flagStore);
            bookkeeping.markerCleared = true;
          } catch (e) {
            bookkeeping.failures.push(`clearMarker threw: ${String(e)}`);
          }
        } else {
          bookkeeping.failures.push(
            "clearMarker SKIPPED \u2014 persistLocalVersion failed; marker preserved so next publish can detect the burned version via Case 4 OTP-safe bump."
          );
        }
        submitErr.h8Bookkeeping = bookkeeping;
      } else {
        try {
          await maybeSetBlocked(flagStore, submitErr);
        } catch {
        }
      }
      throw submitErr;
    }
    if (outcome.kind === "success") {
      await input.persistLocalVersion(outcome.v);
      await clearMarker(flagStore);
    }
    return outcome;
  } finally {
    try {
      await handle.release();
    } catch {
    }
  }
}

// profile/aggregator-pointer/discover-algorithm.ts
init_errors2();
async function findLatestValidVersion(input) {
  let cleanupExternalListener;
  try {
    return await findLatestValidVersionInner(input, (fn) => {
      cleanupExternalListener = fn;
    });
  } finally {
    if (cleanupExternalListener) cleanupExternalListener();
  }
}
async function findLatestValidVersionInner(input, registerCleanup) {
  const {
    currentLocalVersion,
    keyMaterial,
    signer,
    aggregatorClient,
    trustBase,
    decodeCid,
    fetchCar
  } = input;
  const timeoutMs = input.timeoutMs ?? PROBE_REQUEST_TIMEOUT_MS;
  const WALKBACK_HARD_CEILING = 4096;
  const requestedWalkback = input.walkbackLimit ?? DISCOVERY_CORRUPT_WALKBACK;
  if (!Number.isInteger(requestedWalkback) || requestedWalkback < 0 || requestedWalkback > WALKBACK_HARD_CEILING) {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.PROTOCOL_ERROR,
      `Discovery: walkbackLimit must be an integer in [0, ${WALKBACK_HARD_CEILING}], got ${String(requestedWalkback)}.`,
      { walkbackLimit: requestedWalkback }
    );
  }
  const walkbackLimit = requestedWalkback;
  const defaultDeadline = Date.now() + (34 + walkbackLimit) * timeoutMs * 2;
  const discoveryDeadlineMs = input.discoveryDeadlineMs ?? defaultDeadline;
  const discoveryStartMs = Date.now();
  const checkDeadline = () => {
    if (Date.now() > discoveryDeadlineMs) {
      armDeadlineAbort();
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.RETRY_EXHAUSTED,
        `Discovery exceeded wall-clock deadline after ${Date.now() - discoveryStartMs}ms.`,
        { currentLocalVersion }
      );
    }
  };
  if (!Number.isInteger(currentLocalVersion) || currentLocalVersion < 0 || currentLocalVersion >= DISCOVERY_HARD_CEILING) {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.PROTOCOL_ERROR,
      `Discovery: currentLocalVersion=${currentLocalVersion} is outside [0, ${DISCOVERY_HARD_CEILING}). Local cache likely corrupted. Run \`pointer recover\` after investigating storage integrity.`,
      { currentLocalVersion, hardCeiling: DISCOVERY_HARD_CEILING }
    );
  }
  const discoveryAbort = new AbortController();
  let externalDiscoveryAbortListener;
  if (input.abortSignal) {
    if (input.abortSignal.aborted) {
      try {
        discoveryAbort.abort();
      } catch {
      }
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.RETRY_EXHAUSTED,
        "Discovery aborted by caller",
        { currentLocalVersion }
      );
    }
    externalDiscoveryAbortListener = () => {
      try {
        discoveryAbort.abort();
      } catch {
      }
    };
    input.abortSignal.addEventListener("abort", externalDiscoveryAbortListener, { once: true });
    const sigCaptured = input.abortSignal;
    const listenerCaptured = externalDiscoveryAbortListener;
    registerCleanup(() => {
      try {
        sigCaptured.removeEventListener("abort", listenerCaptured);
      } catch {
      }
    });
  }
  const armDeadlineAbort = () => {
    if (Date.now() > discoveryDeadlineMs && !discoveryAbort.signal.aborted) {
      try {
        discoveryAbort.abort();
      } catch {
      }
    }
  };
  const probeVersions = [];
  const probeAndRecord = async (v) => {
    checkDeadline();
    probeVersions.push(v);
    return probeVersion({
      v,
      keyMaterial,
      signer,
      aggregatorClient,
      trustBase,
      timeoutMs,
      abortSignal: discoveryAbort.signal
    });
  };
  let lo = Math.max(0, currentLocalVersion);
  let hi = Math.max(DISCOVERY_INITIAL_VERSION, lo + 1);
  while (await probeAndRecord(hi)) {
    lo = hi;
    const doubled = hi * 2;
    if (doubled > DISCOVERY_HARD_CEILING) {
      if (await probeAndRecord(DISCOVERY_HARD_CEILING)) {
        throw new AggregatorPointerError(
          AggregatorPointerErrorCode.DISCOVERY_OVERFLOW,
          `Phase 1: discovery probe returned true at DISCOVERY_HARD_CEILING=${DISCOVERY_HARD_CEILING}. Latest pointer version exceeds the exponential-expansion ceiling.`,
          { currentLocalVersion, lo, hi: DISCOVERY_HARD_CEILING }
        );
      }
      hi = DISCOVERY_HARD_CEILING;
      break;
    }
    hi = doubled;
  }
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (await probeAndRecord(mid)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const includedV = lo;
  let candidate = includedV;
  let walked = 0;
  const walkbackFloor = Math.max(0, currentLocalVersion);
  while (candidate > 0 && walked < walkbackLimit) {
    if (candidate < walkbackFloor) {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.WALKBACK_FLOOR,
        `Phase 3 walkback reached candidate=${candidate} which is below localVersion=${currentLocalVersion}. Refusing to walk past versions this wallet has already confirmed as its own (SPEC W7).`,
        { candidate, currentLocalVersion }
      );
    }
    checkDeadline();
    probeVersions.push(candidate);
    const status = await classifyVersion({
      v: candidate,
      keyMaterial,
      signer,
      aggregatorClient,
      trustBase,
      decodeCid,
      fetchCar,
      timeoutMs,
      abortSignal: discoveryAbort.signal
    });
    if (status === "VALID") {
      return { validV: candidate, includedV, probeVersions };
    }
    if (status === "SEMANTICALLY_INVALID") {
      candidate = candidate - 1;
      walked += 1;
      continue;
    }
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.CAR_UNAVAILABLE,
      `Phase 3 walkback: version=${candidate} is TRANSIENT_UNAVAILABLE. Tokens may still exist; refusing to skip past.`,
      { version: candidate, includedV }
    );
  }
  if (candidate === 0) {
    return { validV: 0, includedV, probeVersions };
  }
  throw new AggregatorPointerError(
    AggregatorPointerErrorCode.CORRUPT_STREAK,
    `Phase 3 walkback exhausted walkbackLimit=${walkbackLimit} without finding a VALID version (includedV=${includedV}, candidate=${candidate}). Operator may invoke acceptCorruptStreak(walkbackLimit) to override.`,
    { includedV, walkbackLimit, walkedSoFar: walked }
  );
}
async function computeProbeFingerprint(probeVersions) {
  if (probeVersions.length === 0) return "";
  const sorted = [...probeVersions].sort((a, b) => a - b);
  const buf = new Uint8Array(sorted.length * 4);
  const view = new DataView(buf.buffer);
  for (let i = 0; i < sorted.length; i++) {
    const v = sorted[i];
    if (!Number.isInteger(v) || v < 0 || v > VERSION_MAX) {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.VERSION_OUT_OF_RANGE,
        `computeProbeFingerprint: probe version ${v} out of range`,
        { v }
      );
    }
    view.setUint32(i * 4, v >>> 0, false);
  }
  const { sha256: sha2563 } = await Promise.resolve().then(() => (init_sha2(), sha2_exports));
  const digest = sha2563(buf);
  let hex = "";
  for (let i = 0; i < 8; i++) {
    hex += digest[i].toString(16).padStart(2, "0");
  }
  return hex;
}

// profile/aggregator-pointer/reconcile-algorithm.ts
init_errors2();
function computeBackoffMs2(n) {
  const expo = Math.min(PUBLISH_BACKOFF_MAX_MS, PUBLISH_BACKOFF_BASE_MS * 2 ** n);
  const jitter = PUBLISH_BACKOFF_JITTER_LO + Math.random() * (PUBLISH_BACKOFF_JITTER_HI - PUBLISH_BACKOFF_JITTER_LO);
  return Math.round(expo * jitter);
}
function sleep2(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
var WALKBACK_FLOOR_RETRY_BUDGET = 7;
async function findLatestValidVersionWithWalkbackFloorRetry(callInput, abortSignal) {
  let lastError = null;
  for (let attempt = 0; attempt < WALKBACK_FLOOR_RETRY_BUDGET; attempt++) {
    if (abortSignal?.aborted) {
      const err = new Error("findLatestValidVersion aborted by caller");
      err.name = "AbortError";
      throw err;
    }
    try {
      return await findLatestValidVersion(callInput);
    } catch (err) {
      lastError = err;
      const code2 = err instanceof AggregatorPointerError ? err.code : void 0;
      if (code2 !== AggregatorPointerErrorCode.WALKBACK_FLOOR) {
        throw err;
      }
      if (attempt === WALKBACK_FLOOR_RETRY_BUDGET - 1) break;
      await sleep2(computeBackoffMs2(attempt));
    }
  }
  throw lastError;
}
async function reconcileAndPublish(input) {
  const maxAttempts = input.maxAttempts ?? PUBLISH_RETRY_BUDGET;
  const probeHistory = [];
  let currentLocalVersion = input.currentLocalVersion;
  const RECONCILE_WALL_CLOCK_BUDGET_MS = 5 * 60 * 1e3;
  const reconcileDeadlineMs = Date.now() + RECONCILE_WALL_CLOCK_BUDGET_MS;
  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    if (input.abortSignal?.aborted) {
      const err = new Error("reconcileAndPublish aborted by caller");
      err.name = "AbortError";
      throw err;
    }
    const cidBytes = await input.cidProducer();
    const discovery = await findLatestValidVersionWithWalkbackFloorRetry(
      {
        currentLocalVersion,
        keyMaterial: input.keyMaterial,
        signer: input.signer,
        aggregatorClient: input.aggregatorClient,
        trustBase: input.trustBase,
        decodeCid: input.decodeCid,
        fetchCar: input.fetchCar,
        discoveryDeadlineMs: reconcileDeadlineMs,
        abortSignal: input.abortSignal
      },
      input.abortSignal
    );
    probeHistory.push(...discovery.probeVersions);
    const nextV = Math.max(discovery.validV, discovery.includedV) + 1;
    const outcome = await publishOnceAtVersion(
      {
        cidBytes,
        candidateV: nextV,
        currentLocalVersion,
        keyMaterial: input.keyMaterial,
        signer: input.signer,
        aggregatorClient: input.aggregatorClient,
        flagStore: input.flagStore,
        mutex: input.mutex,
        persistLocalVersion: input.persistLocalVersion,
        abortSignal: input.abortSignal
      },
      { maxRetries: PUBLISH_RETRY_BUDGET }
    );
    if (outcome.kind === "success") {
      return {
        kind: "success",
        v: outcome.v,
        attemptsUsed: attempts + 1,
        probeHistory
      };
    }
    const rediscovery = await findLatestValidVersionWithWalkbackFloorRetry(
      {
        currentLocalVersion,
        keyMaterial: input.keyMaterial,
        signer: input.signer,
        aggregatorClient: input.aggregatorClient,
        trustBase: input.trustBase,
        decodeCid: input.decodeCid,
        fetchCar: input.fetchCar,
        discoveryDeadlineMs: reconcileDeadlineMs,
        abortSignal: input.abortSignal
      },
      input.abortSignal
    );
    probeHistory.push(...rediscovery.probeVersions);
    if (rediscovery.validV > 0) {
      try {
        const remoteCid = await input.resolveRemoteCid(rediscovery.validV);
        await input.fetchAndJoin(remoteCid, rediscovery.validV);
        currentLocalVersion = rediscovery.validV;
      } catch (err) {
        await sleep2(computeBackoffMs2(attempts));
        throw err;
      }
    } else if (rediscovery.includedV > currentLocalVersion) {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.CORRUPT_STREAK,
        `Reconcile: aggregator signaled conflict at v>${currentLocalVersion} but no valid version found (includedV=${rediscovery.includedV}, validV=0). Remote state is corrupt-only residue; operator may invoke acceptCorruptStreak(walkbackLimit) for extended walkback.`,
        { currentLocalVersion, includedV: rediscovery.includedV }
      );
    }
    await sleep2(computeBackoffMs2(attempts));
  }
  throw new AggregatorPointerError(
    AggregatorPointerErrorCode.RETRY_EXHAUSTED,
    `Reconcile exhausted ${maxAttempts} conflict-retry attempts without landing a publish. Persistent multi-device contention at high frequency.`,
    { maxAttempts }
  );
}

// profile/aggregator-pointer/config.ts
init_errors2();
function assertConfigCapabilities(config) {
  if (config.allowUnverifiedOverride === true) {
    const nodeEnv = typeof process !== "undefined" && typeof process.env === "object" && process.env !== null ? process.env[NODE_ENV_KEY] : void 0;
    if (nodeEnv !== "development") {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.CAPABILITY_DENIED,
        `PointerLayerConfig.allowUnverifiedOverride is dev-only; current NODE_ENV=${String(nodeEnv)}.`,
        { allowUnverifiedOverride: true, nodeEnv: String(nodeEnv) }
      );
    }
  }
  if (config.allowOperatorOverrides === true) {
    const nodeEnvRaw = typeof process !== "undefined" && typeof process.env === "object" && process.env !== null ? process.env[NODE_ENV_KEY] : void 0;
    const nodeEnv = typeof nodeEnvRaw === "string" ? nodeEnvRaw.toLowerCase() : nodeEnvRaw;
    if (nodeEnv === "production") {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.CAPABILITY_DENIED,
        `PointerLayerConfig.allowOperatorOverrides is forbidden in production builds (NODE_ENV=${String(nodeEnvRaw)}). Remove the flag or rebuild with a non-production NODE_ENV. SPEC \xA713 / T-E26 production-build guard.`,
        { allowOperatorOverrides: true, nodeEnv: String(nodeEnvRaw) }
      );
    }
    const envValue = typeof process !== "undefined" && typeof process.env === "object" && process.env !== null ? process.env[SPHERE_ALLOW_OVERRIDES_KEY] : void 0;
    if (envValue !== SPHERE_ALLOW_OVERRIDES_VALUE) {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.CAPABILITY_DENIED,
        `PointerLayerConfig.allowOperatorOverrides requires env ${SPHERE_ALLOW_OVERRIDES_KEY}=${SPHERE_ALLOW_OVERRIDES_VALUE} for defense-in-depth; got ${String(envValue)}.`,
        { allowOperatorOverrides: true, envValue: String(envValue) }
      );
    }
  }
}
function assertOperatorOverridesAllowed(config, apiName) {
  if (config.allowOperatorOverrides !== true) {
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.CAPABILITY_DENIED,
      `${apiName}() requires Sphere.init({ allowOperatorOverrides: true }). This flag is a user-consent signal for data-loss-adjacent operations (SPEC \xA710.2.4, \xA710.7.1).`,
      { apiName }
    );
  }
}

// profile/aggregator-pointer/ProfilePointerLayer.ts
init_errors2();
var ProfilePointerLayer = class {
  #init;
  #config;
  #lastProbeVersions = [];
  /**
   * Tracks all in-flight publish/recover/probe operations so `shutdown()`
   * can drain them. The set holds Promises (resolution status irrelevant);
   * `Promise.allSettled` waits for every entry. Each operation removes
   * itself from the set in a `finally` block.
   */
  #inFlight = /* @__PURE__ */ new Set();
  // Steelman¹⁸: set by shutdown() to prevent new operations from being
  // enqueued during drain.  Public methods check this flag and reject
  // immediately after shutdown starts.
  #shuttingDown = false;
  constructor(init) {
    this.#init = init;
    const suppliedConfig = init.config ?? {};
    assertConfigCapabilities(suppliedConfig);
    this.#config = Object.freeze({
      allowOperatorOverrides: suppliedConfig.allowOperatorOverrides === true
    });
  }
  /**
   * RFC-251 Approach D (issue #255 Problem B) — expose the pointer layer's
   * signing pubkey + signer to the integration wiring layer (Sphere /
   * ProfileTokenStorageProvider). The win-broadcast publisher needs
   * the pubkey hex to build the per-wallet broadcast tag, and the
   * signer to sign the broadcast payload. The signer itself is exposed
   * read-only — callers can only sign payloads, not mutate the signer's
   * state.
   *
   * Returns a tuple rather than two getters so consumers can destructure
   * once and cache for the wallet's lifetime; the underlying signer
   * never rotates within a `ProfilePointerLayer` instance.
   */
  getSignerForWinBroadcast() {
    return {
      signer: this.#init.signer,
      signingPubKeyHex: this.#init.signer.signingPubKeyHex
    };
  }
  /**
   * Wrap an async operation so it's tracked in `#inFlight` and removes
   * itself on settle. Used by the public publish/recover/probe entry
   * points so `shutdown()` can drain them.
   *
   * Implementation note: we use `op.then(cleanup, cleanup)` with both
   * handlers wired explicitly — NOT `op.finally(cleanup)` — to avoid
   * a dangling-rejection chain. `op.finally(...)` returns a NEW promise
   * that propagates the original rejection; if nothing awaits that
   * resulting promise (we don't — we return `op` directly), the
   * rejection surfaces as an unhandledRejection. The two-handler
   * `.then` form swallows the rejection on the CLEANUP chain only;
   * the caller's `await op` still observes the original rejection.
   */
  #tracked(op) {
    this.#inFlight.add(op);
    void op.then(
      () => {
        this.#inFlight.delete(op);
      },
      () => {
        this.#inFlight.delete(op);
      }
    );
    return op;
  }
  /** Throw if shutdown is in progress — used by all public entry points. */
  #assertNotShuttingDown(opName) {
    if (this.#shuttingDown) {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.PUBLISH_BUSY,
        `ProfilePointerLayer.${opName}() called after shutdown() started \u2014 operation rejected.`
      );
    }
  }
  /**
   * Wave F.2 architecture-advisory remediation: drain in-flight
   * publish/recover/probe operations before the surrounding
   * ProfileStorageProvider tears down OrbitDB. Previously the
   * disconnect path duck-typed `pointerLayer.shutdown?.()` and silently
   * no-op'd because the method did not exist — leaving an in-flight
   * Node publish able to leak its proper-lockfile mutex for up to
   * 8 seconds (until proper-lockfile's stale detector reclaimed it).
   *
   * `shutdown()` waits for all tracked operations to settle, with a
   * hard internal deadline (default 30 s) so a single hung tracked
   * promise (e.g. an aggregator-probe stuck on an unresponsive socket
   * with no per-call timeout) cannot block the entire teardown
   * indefinitely. Steelman⁴⁶ HIGH: previously, shutdown() relied on
   * callers wrapping in their own Promise.race against a timeout —
   * but no caller did, so process tear-down could hang forever.
   *
   * After the deadline expires, shutdown() returns; any still-tracked
   * operations are abandoned (they may run to completion, but the
   * surrounding storage provider can proceed with disconnect — pin/db
   * close paths are idempotent with respect to ghost continuations).
   * The caller can pass `{ timeoutMs: ... }` to override; pass `null`
   * to disable the deadline (legacy behavior).
   *
   * Steelman¹⁸: sets #shuttingDown to block new operations from being
   * enqueued during the drain. Concurrent calls both participate in
   * draining (via Promise.allSettled) rather than racing on a snapshot.
   * Safe to call multiple times — subsequent calls drain any operations
   * enqueued after the previous shutdown() completed.
   */
  async shutdown(opts) {
    this.#shuttingDown = true;
    const DEFAULT_DRAIN_TIMEOUT_MS = 3e4;
    const timeoutMs = opts?.timeoutMs === null ? null : Math.max(0, opts?.timeoutMs ?? DEFAULT_DRAIN_TIMEOUT_MS);
    const drainStart = Date.now();
    while (this.#inFlight.size > 0) {
      if (timeoutMs !== null) {
        const elapsed = Date.now() - drainStart;
        const remaining = timeoutMs - elapsed;
        if (remaining <= 0) {
          break;
        }
        let drainTimer;
        const timeoutPromise = new Promise((resolve) => {
          drainTimer = setTimeout(() => resolve(), remaining);
          if (typeof drainTimer === "object" && drainTimer !== null && "unref" in drainTimer) {
            drainTimer.unref();
          }
        });
        try {
          await Promise.race([Promise.allSettled([...this.#inFlight]), timeoutPromise]);
        } finally {
          if (drainTimer !== void 0) clearTimeout(drainTimer);
        }
      } else {
        await Promise.allSettled([...this.#inFlight]);
      }
    }
    this.#lastProbeVersions = [];
  }
  // ── publish ──────────────────────────────────────────────────────────────
  /**
   * Publish a CID as the new latest pointer. Runs the full reconcile loop:
   *   - discover V_true
   *   - target nextV = max(validV, includedV) + 1 (H4)
   *   - submit + §7.3 state machine + §7.4 backoff
   *   - on conflict: fetchAndJoin remote, advance localVersion, retry
   *
   * @param cidProducer  Callback that (re)produces the CID bytes. Called
   *   fresh on each reconcile iteration so the bundle may include state
   *   merged from fetchAndJoin on prior conflicts.
   * @param opts.abortSignal  Wave G.4: caller-supplied cancellation
   *   signal. Aborting unwinds the reconcile loop at the next safe
   *   checkpoint (between iterations, or via the deadline race inside
   *   submitPointer / probeVersion). The signal is propagated all the
   *   way down through `submitOneSide` and `fetchProofWithTimeout`,
   *   so an in-flight HTTP RPC is cancelled promptly rather than
   *   running to its per-side timeout.
   */
  async publish(cidProducer, opts) {
    this.#assertNotShuttingDown("publish");
    return this.#tracked(this.#publishInner(cidProducer, opts?.abortSignal));
  }
  async #publishInner(cidProducer, abortSignal) {
    if (abortSignal?.aborted) {
      const err = new Error("publish aborted by caller");
      err.name = "AbortError";
      throw err;
    }
    const currentLocalVersion = await this.#init.readLocalVersion();
    const result = await reconcileAndPublish({
      cidProducer,
      currentLocalVersion,
      keyMaterial: this.#init.keyMaterial,
      signer: this.#init.signer,
      aggregatorClient: this.#init.aggregatorClient,
      trustBase: this.#init.trustBase,
      flagStore: this.#init.flagStore,
      mutex: this.#init.mutex,
      decodeCid: this.#init.decodeCid,
      fetchCar: this.#init.fetchCar,
      fetchAndJoin: this.#init.fetchAndJoin,
      persistLocalVersion: this.#init.persistLocalVersion,
      resolveRemoteCid: this.#init.resolveRemoteCid,
      abortSignal
    });
    this.#lastProbeVersions = result.probeHistory;
    return { version: result.v, attemptsUsed: result.attemptsUsed };
  }
  // ── recoverLatest ────────────────────────────────────────────────────────
  /**
   * Discover + recover the latest VALID pointer.
   * Returns null when no pointer has ever been published (validV == 0).
   *
   * SPEC §13 recoverLatest semantics: returns `{ cid, version }` for the
   * latest valid version (Phase 3 winner), having classified + fetched the
   * CAR successfully.
   */
  async recoverLatest(opts) {
    this.#assertNotShuttingDown("recoverLatest");
    return this.#tracked(this.#recoverLatestInner(opts?.abortSignal));
  }
  async #recoverLatestInner(abortSignal) {
    if (abortSignal?.aborted) {
      const err = new Error("recoverLatest aborted by caller");
      err.name = "AbortError";
      throw err;
    }
    const discovery = await this.#discoverLatestVersionInner(void 0, abortSignal);
    if (discovery.validV === 0) return null;
    const cid = await this.#init.resolveRemoteCid(discovery.validV);
    return { cid, version: discovery.validV };
  }
  // ── reconcileLocalVersionDownward ────────────────────────────────────────
  /**
   * Issue #247 — adopt a strictly-lower aggregator-visible version as
   * the wallet's local baseline. Solves the same-identity cross-device
   * race where two devices each push localVersion ahead of the
   * aggregator's currently-visible value and both subsequently hit
   * W7 WALKBACK_FLOOR for the SPEC-correct reason (cannot walk past
   * a version this wallet has already confirmed as its own).
   *
   * **Authoring trust note (SAFETY-CRITICAL).** The `candidate` MUST
   * originate from this wallet's own `recoverLatest()` call. Because
   * `recoverLatest()` runs `classifyVersion`, which XOR-decodes the
   * inclusion-proof ciphertext with the wallet's `keyMaterial.xorSeed`
   * (HKDF-derived from the wallet's private key) and then verifies the
   * decoded CID via `fetchCar`'s content-address check, a candidate
   * surfaced by `recoverLatest()` is *implicitly* authenticated as
   * authored by this wallet. A foreign-author commitment at the same
   * version V would XOR-decode under our seed to a different 32-byte
   * pair, the resulting CID would fail content-address verification,
   * and `classifyVersion` would return SEMANTICALLY_INVALID — never
   * surfaced through `recoverLatest()` as a non-null result.
   *
   * Callers passing a `RecoverResult` from `recoverLatest()` therefore
   * get same-author-only downgrades by construction. Callers crafting
   * a candidate from another source MUST guarantee equivalent author
   * verification themselves (no such caller exists in this SDK).
   *
   * **Side effects.** When `candidate.version < currentLocalVersion`,
   * the method:
   *   1. Persists `profile.pointer.version = candidate.version` via
   *      the wired `persistLocalVersion` callback.
   *   2. Returns `{ reconciled: true, fromVersion, toVersion }`.
   *
   * Otherwise (`candidate.version >= currentLocalVersion`), it is a
   * no-op and returns `{ reconciled: false, ... }`.
   *
   * **NOT a CONFLICT path.** This is not §9.2 conflict reconciliation
   * — there is no `fetchAndJoin` of remote OpLog state, no bundle ref
   * write. The semantic is "the aggregator's view of our pointer is
   * BEHIND our local cursor; rewind our cursor so we publish from a
   * baseline the aggregator can see." Bundle data already published
   * at versions in `(candidate.version, fromVersion]` remains on IPFS
   * and is rediscoverable via the standard publish-retry path —
   * publish at `candidate.version + 1` will conflict against any
   * still-live version, re-trigger discovery, and converge.
   */
  async reconcileLocalVersionDownward(candidate) {
    this.#assertNotShuttingDown("reconcileLocalVersionDownward");
    return this.#tracked(this.#reconcileLocalVersionDownwardInner(candidate));
  }
  async #reconcileLocalVersionDownwardInner(candidate) {
    const fromVersion = await this.#init.readLocalVersion();
    if (candidate.version >= fromVersion) {
      return { reconciled: false, fromVersion, toVersion: fromVersion };
    }
    await this.#init.persistLocalVersion(candidate.version);
    return { reconciled: true, fromVersion, toVersion: candidate.version };
  }
  // ── discoverLatestVersion ────────────────────────────────────────────────
  /**
   * Run only the discovery phase (no CAR fetch, no XOR-decode, no CID parse —
   * BUT Phase 3 still calls classifyVersion which DOES fetch CAR for
   * validation per SPEC §8.2 step 3). Returns { validV, includedV } per H4.
   */
  async discoverLatestVersion(walkbackLimit, opts) {
    this.#assertNotShuttingDown("discoverLatestVersion");
    return this.#tracked(this.#discoverLatestVersionInner(walkbackLimit, opts?.abortSignal));
  }
  async #discoverLatestVersionInner(walkbackLimit, abortSignal) {
    if (abortSignal?.aborted) {
      const err = new Error("discoverLatestVersion aborted by caller");
      err.name = "AbortError";
      throw err;
    }
    const currentLocalVersion = await this.#init.readLocalVersion();
    const result = await findLatestValidVersion({
      currentLocalVersion,
      keyMaterial: this.#init.keyMaterial,
      signer: this.#init.signer,
      aggregatorClient: this.#init.aggregatorClient,
      trustBase: this.#init.trustBase,
      decodeCid: this.#init.decodeCid,
      fetchCar: this.#init.fetchCar,
      walkbackLimit,
      abortSignal
    });
    this.#lastProbeVersions = result.probeVersions;
    return result;
  }
  // ── isReachable ──────────────────────────────────────────────────────────
  /**
   * Aggregator reachability probe via HEALTH_CHECK_REQUEST_ID (§11.12).
   * Returns true iff aggregator responded with any HTTP response (even a
   * permissible PATH_NOT_INCLUDED). False only on network-level failure.
   */
  async isReachable() {
    this.#assertNotShuttingDown("isReachable");
    return this.#tracked(
      isReachable({
        signingPubKey: this.#init.signer.signingPubKey,
        aggregatorClient: this.#init.aggregatorClient
      })
    );
  }
  // ── isPublishBlocked ─────────────────────────────────────────────────────
  /**
   * Query the persistent BLOCKED state (§10.2). Returns true iff
   * BLOCKED_FLAG_KEY is set.
   *
   * Steelman¹⁹ warning: a CORRUPT record (invalid JSON, bad shape, or
   * unrecognized reason) is treated as BLOCKED for the purpose of read-
   * API queries. Read APIs are pure observations — letting CORRUPT
   * propagate would change a stable contract (always returns boolean) into
   * a throwing API and break consumers (UIs, telemetry, the publish
   * pre-check). The publish path still routes CORRUPT through the proper
   * error code via `setBlocked`'s catch-and-overwrite recovery, so this
   * wrapper does not mask the CORRUPT classification — it just keeps the
   * read API predictable.
   */
  async isPublishBlocked() {
    this.#assertNotShuttingDown("isPublishBlocked");
    return this.#tracked(this.#isPublishBlockedInner());
  }
  async #isPublishBlockedInner() {
    try {
      const state = await isBlocked(this.#init.flagStore);
      return state.blocked;
    } catch (err) {
      if (err instanceof AggregatorPointerError && err.code === AggregatorPointerErrorCode.CORRUPT) {
        return true;
      }
      throw err;
    }
  }
  /**
   * Returns the full BlockedState including reason and setAt timestamp.
   *
   * Steelman¹⁹ warning: on CORRUPT, returns a synthetic state with
   * `reason='corrupt'` and `setAt=0` so callers (UIs, telemetry) get a
   * stable shape. Operators investigating a corrupt block flag can read
   * the underlying record directly via the FlagStore.
   */
  async getBlockedState() {
    this.#assertNotShuttingDown("getBlockedState");
    return this.#tracked(this.#getBlockedStateInner());
  }
  async #getBlockedStateInner() {
    try {
      return await isBlocked(this.#init.flagStore);
    } catch (err) {
      if (err instanceof AggregatorPointerError && err.code === AggregatorPointerErrorCode.CORRUPT) {
        return { blocked: true, reason: "corrupt", setAt: Date.now() };
      }
      throw err;
    }
  }
  // ── clearBlocked ─────────────────────────────────────────────────────────
  /**
   * Clear BLOCKED after a legitimate §10.2.4 exit condition is met.
   * Gated on allowOperatorOverrides — the spec's strict CLEAR paths
   * (exclusion-proof or successful recovery) are typically detected and
   * cleared automatically by recoverLatest; this method is for operator-
   * initiated recovery when automatic detection is insufficient.
   *
   * Steelman⁴⁶ MEDIUM (forward-compat downgrade): when the persisted
   * BLOCKED record is well-formed in shape but its `reason` is not
   * recognized by this SDK build (e.g. a newer SDK wrote it and the
   * user rolled back), allow clearing WITHOUT operator override. A
   * recognized BLOCKED state still requires the override. This trades a
   * small attacker-injected-unknown-reason gap (which is already gated
   * by storage-write access — equivalent to setting any recognized
   * reason that this SDK could clear) for a real recovery path on
   * downgrade.
   *
   * @throws AggregatorPointerError(CAPABILITY_DENIED) if overrides disabled
   *   AND the persisted reason is recognized (or there is no persisted
   *   record at all — calling clearBlocked without a real block is a
   *   no-op but should still respect the capability gate).
   */
  async clearBlocked() {
    this.#assertNotShuttingDown("clearBlocked");
    return this.#tracked(this.#clearBlockedInner());
  }
  async #clearBlockedInner() {
    if (this.#config.allowOperatorOverrides) {
      await clearBlocked(this.#init.flagStore);
      return;
    }
    const isUnrecognized = await hasUnrecognizedBlockedReason(this.#init.flagStore);
    if (!isUnrecognized) {
      assertOperatorOverridesAllowed(this.#config, "clearBlocked");
    }
    const stillUnrecognized = await hasUnrecognizedBlockedReason(this.#init.flagStore);
    if (!stillUnrecognized) {
      assertOperatorOverridesAllowed(this.#config, "clearBlocked");
    }
    await clearBlocked(this.#init.flagStore);
  }
  // ── clearPendingMarker ───────────────────────────────────────────────────
  /**
   * Operator recovery path for a corrupt pending-version marker (§7.1.4 C1
   * clamp failure). Gated on allowOperatorOverrides. Side effect: SETs
   * BLOCKED so the next pass through §10.2.4 CLEAR requires verified
   * recovery — prevents a bypass where clearing a marker alone would
   * resume publish without re-verification.
   *
   * @throws AggregatorPointerError(CAPABILITY_DENIED) if overrides disabled.
   */
  async clearPendingMarker() {
    this.#assertNotShuttingDown("clearPendingMarker");
    assertOperatorOverridesAllowed(this.#config, "clearPendingMarker");
    return this.#tracked(this.#clearPendingMarkerInner());
  }
  async #clearPendingMarkerInner() {
    await clearMarker(this.#init.flagStore);
    await setBlocked(this.#init.flagStore, "marker_corrupt");
  }
  // ── acceptCarLoss ────────────────────────────────────────────────────────
  /**
   * H7 operator override for §10.7 CAR-unavailable state.
   *
   * This is the MINIMAL implementation — it checks the wall-clock gate
   * and the capability flag, then delegates the republish + advance to
   * the caller (via the existing publish() and persistLocalVersion
   * callbacks). Peer-availability poll and the §10.7.1 (3) gossipsub
   * integration remain caller responsibilities.
   *
   * @throws AggregatorPointerError(CAPABILITY_DENIED) if overrides disabled.
   * @throws AggregatorPointerError(UNREACHABLE_RECOVERY_BLOCKED) if gate not met.
   */
  async acceptCarLoss(version, cidProducer) {
    this.#assertNotShuttingDown("acceptCarLoss");
    assertOperatorOverridesAllowed(this.#config, "acceptCarLoss");
    return this.#tracked(this.#acceptCarLossInner(version, cidProducer));
  }
  async #acceptCarLossInner(version, cidProducer) {
    await assertAcceptCarLossEligible(this.#init.flagStore, version);
    const result = await this.#publishInner(cidProducer);
    await clearAttempts(this.#init.flagStore, version);
    return result;
  }
  /**
   * Record a CAR-fetch failure for H7 ledger (caller invokes this when
   * IPFS gateway fetches fail during recovery).
   */
  async recordCarFetchFailure(version, gateway) {
    this.#assertNotShuttingDown("recordCarFetchFailure");
    return this.#tracked(recordAttempt(this.#init.flagStore, version, gateway));
  }
  // ── acceptCorruptStreak ──────────────────────────────────────────────────
  /**
   * W6 / §10.8 operator override: raise DISCOVERY_CORRUPT_WALKBACK for a
   * single subsequent recovery attempt. Caller passes the raised ceiling
   * to the next `discoverLatestVersion(walkbackLimit)` call.
   *
   * @throws AggregatorPointerError(CAPABILITY_DENIED) if overrides disabled.
   */
  async acceptCorruptStreak(walkbackLimit = 4096) {
    this.#assertNotShuttingDown("acceptCorruptStreak");
    assertOperatorOverridesAllowed(this.#config, "acceptCorruptStreak");
    const capped = Math.min(walkbackLimit, 4096);
    return { walkbackUsed: capped };
  }
  // ── getProbeFingerprint ─────────────────────────────────────────────────
  /**
   * Short stable hash of the last discovery probe sequence for UI
   * same-wallet-clustering signal. Returns '' if no probe has run.
   */
  async getProbeFingerprint() {
    this.#assertNotShuttingDown("getProbeFingerprint");
    return computeProbeFingerprint(this.#lastProbeVersions);
  }
  // ── Probe helper (for external use / testing) ───────────────────────────
  /** Low-level probe for a single version — H2 OR-predicate. */
  async probe(v) {
    this.#assertNotShuttingDown("probe");
    return this.#tracked(probeVersion({
      v,
      keyMaterial: this.#init.keyMaterial,
      signer: this.#init.signer,
      aggregatorClient: this.#init.aggregatorClient,
      trustBase: this.#init.trustBase
    }));
  }
  /** Low-level classifyVersion. */
  async classify(v) {
    this.#assertNotShuttingDown("classify");
    return this.#tracked(classifyVersion({
      v,
      keyMaterial: this.#init.keyMaterial,
      signer: this.#init.signer,
      aggregatorClient: this.#init.aggregatorClient,
      trustBase: this.#init.trustBase,
      decodeCid: this.#init.decodeCid,
      fetchCar: this.#init.fetchCar
    }));
  }
};

// profile/aggregator-pointer/win-broadcast.ts
import { DataHasher } from "@unicitylabs/state-transition-sdk/lib/hash/DataHasher.js";
import { HashAlgorithm as HashAlgorithm3 } from "@unicitylabs/state-transition-sdk/lib/hash/HashAlgorithm.js";
import { Signature } from "@unicitylabs/state-transition-sdk/lib/sign/Signature.js";
import { SigningService as SigningService2 } from "@unicitylabs/state-transition-sdk/lib/sign/SigningService.js";
var MAX_PAYLOAD_AGE_MS = 5 * 60 * 1e3;
var WIN_BROADCAST_TAG_PREFIX = "pointer-win:";
var WIN_BROADCAST_KIND_MARKER = "pointer-win-broadcast";
var WIN_BROADCAST_SCHEMA_VERSION = 1;
function buildWinBroadcastTag(signingPubKeyHex) {
  if (typeof signingPubKeyHex !== "string" || signingPubKeyHex.length === 0) {
    throw new Error("buildWinBroadcastTag: signingPubKeyHex must be a non-empty string");
  }
  return `${WIN_BROADCAST_TAG_PREFIX}${signingPubKeyHex.toLowerCase()}`;
}
async function buildWinBroadcastHash(payload) {
  if (payload.v !== WIN_BROADCAST_SCHEMA_VERSION) {
    throw new Error(`buildWinBroadcastHash: unsupported schema version ${payload.v}`);
  }
  if (!Number.isInteger(payload.version) || payload.version < 0 || payload.version > 4294967295) {
    throw new Error(`buildWinBroadcastHash: version must be uint32, got ${payload.version}`);
  }
  if (!Number.isInteger(payload.ts) || payload.ts < 0 || !Number.isSafeInteger(payload.ts)) {
    throw new Error(`buildWinBroadcastHash: ts must be a safe integer >= 0, got ${payload.ts}`);
  }
  const pubKeyBytes = hexToBytes3(payload.signingPubKey);
  if (pubKeyBytes.length !== 33) {
    throw new Error(
      `buildWinBroadcastHash: signingPubKey must decode to 33 bytes, got ${pubKeyBytes.length}`
    );
  }
  const cidBytes = new TextEncoder().encode(payload.cid);
  const buf = new Uint8Array(1 + 4 + 8 + 33 + cidBytes.length);
  let offset = 0;
  buf[offset] = payload.v;
  offset += 1;
  buf[offset] = payload.version >>> 24 & 255;
  buf[offset + 1] = payload.version >>> 16 & 255;
  buf[offset + 2] = payload.version >>> 8 & 255;
  buf[offset + 3] = payload.version & 255;
  offset += 4;
  const tsHi = Math.floor(payload.ts / 4294967296);
  const tsLo = payload.ts >>> 0;
  buf[offset] = tsHi >>> 24 & 255;
  buf[offset + 1] = tsHi >>> 16 & 255;
  buf[offset + 2] = tsHi >>> 8 & 255;
  buf[offset + 3] = tsHi & 255;
  buf[offset + 4] = tsLo >>> 24 & 255;
  buf[offset + 5] = tsLo >>> 16 & 255;
  buf[offset + 6] = tsLo >>> 8 & 255;
  buf[offset + 7] = tsLo & 255;
  offset += 8;
  buf.set(pubKeyBytes, offset);
  offset += 33;
  buf.set(cidBytes, offset);
  return new DataHasher(HashAlgorithm3.SHA256).update(buf).digest();
}
async function signWinBroadcastPayload(signer, unsigned) {
  if (signer.signingPubKeyHex.toLowerCase() !== unsigned.signingPubKey.toLowerCase()) {
    throw new Error(
      `signWinBroadcastPayload: signer pubkey ${signer.signingPubKeyHex} does not match payload signingPubKey ${unsigned.signingPubKey}`
    );
  }
  const hash = await buildWinBroadcastHash(unsigned);
  const sig = await signer.service.sign(hash);
  return { ...unsigned, sig: sig.toJSON() };
}
function hexToBytes3(hex) {
  if (typeof hex !== "string") {
    throw new Error("hexToBytes: input must be string");
  }
  const normalized = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (normalized.length % 2 !== 0) {
    throw new Error(`hexToBytes: odd length (${normalized.length})`);
  }
  const out = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = parseInt(normalized.substr(i * 2, 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error(`hexToBytes: non-hex char at offset ${i * 2}`);
    }
    out[i] = byte;
  }
  return out;
}

// profile/pointer-wiring.ts
init_errors2();
init_ipfs_client();

// profile/profile-lean-snapshot.ts
init_sha2();
init_logger();
init_errors();
init_ipfs_client();
import { encode as dagCborEncode, decode as dagCborDecode } from "@ipld/dag-cbor";
import { CID as CID2 } from "multiformats/cid";
import { create as createMultihash2 } from "multiformats/hashes/digest";
import { CarWriter } from "@ipld/car/writer";
import { CarReader } from "@ipld/car";
var LEAN_PROFILE_SNAPSHOT_VERSION = 3;
var LEAN_PROFILE_SNAPSHOT_GLOBAL_GROUP_KEY = "__global__";
var ADDRESS_GROUP_PREFIX_RE = /^(DIRECT_[0-9a-f]{6}_[0-9a-f]{6})\./;
function groupKeyFor(key) {
  const m = ADDRESS_GROUP_PREFIX_RE.exec(key);
  return m !== null ? m[1] : LEAN_PROFILE_SNAPSHOT_GLOBAL_GROUP_KEY;
}
var LEAN_DEFAULT_MAX_SNAPSHOT_BYTES = 256 * 1024 * 1024;
var MAX_KV_ENTRIES = 1e5;
var MAX_KV_VALUE_BYTES = 8 * 1024 * 1024;
var PROFILE_CAR_IMPORT_MAX_BLOCK_BYTES = 1024 * 1024;
var DAG_CBOR_CODE = 113;
var LEAN_SNAPSHOT_FILTER_KEY_PATTERNS = [
  /^last_wallet_event_ts_/,
  /^last_dm_event_ts_/
];
function sha2562(bytes) {
  return sha256(bytes);
}
function dagCborCid(bytes) {
  const digest = createMultihash2(18, sha2562(bytes));
  return CID2.createV1(DAG_CBOR_CODE, digest);
}
function concatBytes2(chunks) {
  let total = 0;
  for (const c of chunks) total += c.byteLength;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}
function shouldExportKey(key) {
  for (const re of LEAN_SNAPSHOT_FILTER_KEY_PATTERNS) {
    if (re.test(key)) return false;
  }
  return true;
}
async function readAllKvEntries(storage) {
  const handle = storage;
  if (typeof handle.getEncryptedRaw !== "function") {
    throw new ProfileError(
      "PROFILE_NOT_INITIALIZED",
      "profile-lean-snapshot requires a ProfileStorageProvider \u2014 getEncryptedRaw() is missing on the supplied StorageProvider. Legacy file/IndexedDB-only wallets cannot be lean-snapshotted."
    );
  }
  const allKeys = await storage.keys();
  if (allKeys.length > MAX_KV_ENTRIES) {
    throw new ProfileError(
      "PROFILE_NOT_INITIALIZED",
      `Refusing to build lean snapshot: profile has ${allKeys.length} KV entries (cap ${MAX_KV_ENTRIES}).`
    );
  }
  const out = [];
  for (const key of allKeys) {
    if (!shouldExportKey(key)) continue;
    let value;
    try {
      value = await handle.getEncryptedRaw(key);
    } catch (err) {
      logger.warn(
        "ProfileLeanSnapshot",
        `failed to read encrypted KV entry "${key}": ${err instanceof Error ? err.message : String(err)} \u2014 skipping`
      );
      continue;
    }
    if (value === null) continue;
    if (Buffer.byteLength(value, "utf8") > MAX_KV_VALUE_BYTES) {
      throw new ProfileError(
        "PROFILE_NOT_INITIALIZED",
        `KV entry "${key}" value exceeds ${MAX_KV_VALUE_BYTES} bytes \u2014 refuse build to avoid huge snapshots.`
      );
    }
    out.push({ key, value });
  }
  out.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  return out;
}
async function readBundleRefs(tokenStorage) {
  const handle = tokenStorage;
  let bundleMap;
  try {
    bundleMap = await handle.listBundles();
  } catch (err) {
    throw new ProfileError(
      "PROFILE_NOT_INITIALIZED",
      `Failed to enumerate Profile bundles for lean snapshot: ${err instanceof Error ? err.message : String(err)}`,
      err
    );
  }
  const entries = [];
  for (const [cid, ref] of bundleMap) {
    if (ref.status === "unverified") {
      logger.debug(
        "ProfileLeanSnapshot",
        `skipping unverified bundle ${cid} (not propagated via lean snapshot)`
      );
      continue;
    }
    entries.push({
      cid,
      status: ref.status,
      createdAt: ref.createdAt,
      ...ref.tokenCount !== void 0 ? { tokenCount: ref.tokenCount } : {}
    });
  }
  entries.sort((a, b) => a.cid < b.cid ? -1 : a.cid > b.cid ? 1 : 0);
  return entries;
}
function buildEntryGroupBlocks(entries) {
  const groups = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    const groupKey = groupKeyFor(entry.key);
    let bucket = groups.get(groupKey);
    if (bucket === void 0) {
      bucket = [];
      groups.set(groupKey, bucket);
    }
    bucket.push({ key: entry.key, value: entry.value });
  }
  const groupBlocks = [];
  const groupRefs = [];
  const sortedGroupKeys = Array.from(groups.keys()).sort();
  for (const groupKey of sortedGroupKeys) {
    const groupEntries = groups.get(groupKey);
    const groupBytes = dagCborEncode({
      groupKey,
      entries: groupEntries.map((e) => ({ key: e.key, value: e.value }))
    });
    if (groupBytes.byteLength > PROFILE_CAR_IMPORT_MAX_BLOCK_BYTES) {
      throw new ProfileError(
        "PROFILE_NOT_INITIALIZED",
        `Lean snapshot entry-group "${groupKey}" sub-block is ${groupBytes.byteLength} bytes \u2014 exceeds per-block cap ${PROFILE_CAR_IMPORT_MAX_BLOCK_BYTES}. Reduce the number/size of KV entries for this group.`
      );
    }
    const groupCid = dagCborCid(groupBytes);
    groupBlocks.push({ cid: groupCid, bytes: groupBytes });
    groupRefs.push({
      groupKey,
      entriesCid: groupCid.toString(),
      entryCount: groupEntries.length
    });
  }
  return { groupRefs, groupBlocks };
}
async function assembleCarBytes(snapshot, maxSizeBytes) {
  const { groupRefs, groupBlocks } = buildEntryGroupBlocks(snapshot.entries);
  const rootBytes = dagCborEncode({
    version: LEAN_PROFILE_SNAPSHOT_VERSION,
    chainPubkey: snapshot.chainPubkey,
    network: snapshot.network,
    createdAt: snapshot.createdAt,
    entryGroups: groupRefs.map((g, idx) => ({
      groupKey: g.groupKey,
      // Embed the CID instance directly — dag-cbor encodes CID
      // instances as link tags (Tag 42), which is what
      // `fetchCarFromIpfs`'s `collectCidLinks` walker expects.
      entriesCid: groupBlocks[idx].cid,
      entryCount: g.entryCount
    })),
    bundles: snapshot.bundles.map((b) => {
      const obj = {
        cid: b.cid,
        status: b.status,
        createdAt: b.createdAt
      };
      if (b.tokenCount !== void 0) obj.tokenCount = b.tokenCount;
      return obj;
    })
  });
  if (rootBytes.byteLength > PROFILE_CAR_IMPORT_MAX_BLOCK_BYTES) {
    throw new ProfileError(
      "PROFILE_NOT_INITIALIZED",
      `Lean snapshot root block is ${rootBytes.byteLength} bytes \u2014 exceeds per-block cap ${PROFILE_CAR_IMPORT_MAX_BLOCK_BYTES}. Reduce the number/size of KV entries or split into per-writer subtrees.`
    );
  }
  const rootCid = dagCborCid(rootBytes);
  let estimatedTotal = rootBytes.byteLength + 128;
  for (const block of groupBlocks) estimatedTotal += block.bytes.byteLength + 64;
  if (estimatedTotal > maxSizeBytes) {
    throw new ProfileError(
      "PROFILE_NOT_INITIALIZED",
      `Refusing to assemble lean snapshot CAR: estimated ${estimatedTotal} bytes exceeds maxSizeBytes=${maxSizeBytes}.`
    );
  }
  const { writer, out } = CarWriter.create([rootCid]);
  const chunks = [];
  const collectPromise = (async () => {
    for await (const chunk of out) chunks.push(chunk);
  })();
  await writer.put({ cid: rootCid, bytes: rootBytes });
  for (const block of groupBlocks) {
    await writer.put({ cid: block.cid, bytes: block.bytes });
  }
  await writer.close();
  await collectPromise;
  const carBytes = concatBytes2(chunks);
  if (carBytes.byteLength > maxSizeBytes) {
    throw new ProfileError(
      "PROFILE_NOT_INITIALIZED",
      `Lean snapshot CAR is ${carBytes.byteLength} bytes \u2014 exceeds maxSizeBytes=${maxSizeBytes}.`
    );
  }
  return { carBytes, rootCid: rootCid.toString() };
}
async function buildLeanProfileSnapshot(options) {
  const maxSizeBytes = options.maxSizeBytes ?? LEAN_DEFAULT_MAX_SNAPSHOT_BYTES;
  if (options.gcExpiredTombstones) {
    try {
      await options.gcExpiredTombstones();
    } catch (err) {
      logger.warn(
        "ProfileLeanSnapshot",
        `tombstone GC hook threw: ${err instanceof Error ? err.message : String(err)} \u2014 proceeding with snapshot build (expired tombstones may propagate this round)`
      );
    }
  }
  const entries = await readAllKvEntries(options.storage);
  const bundles = await readBundleRefs(options.tokenStorage);
  const snapshot = {
    version: LEAN_PROFILE_SNAPSHOT_VERSION,
    chainPubkey: options.chainPubkey,
    network: options.network,
    createdAt: options.createdAt ?? Date.now(),
    entries,
    entryGroups: [],
    bundles
  };
  const { carBytes, rootCid } = await assembleCarBytes(snapshot, maxSizeBytes);
  return {
    carBytes,
    entryCount: entries.length,
    bundleCount: bundles.length,
    rootCid
  };
}
async function parseLeanProfileSnapshotFromRootBlock(rootBlockBytes, fetcher) {
  if (rootBlockBytes.byteLength > PROFILE_CAR_IMPORT_MAX_BLOCK_BYTES) {
    throw new ProfileError(
      "PROFILE_NOT_INITIALIZED",
      `Lean snapshot root block is ${rootBlockBytes.byteLength} bytes \u2014 exceeds per-block cap ${PROFILE_CAR_IMPORT_MAX_BLOCK_BYTES}.`
    );
  }
  let decoded;
  try {
    decoded = dagCborDecode(rootBlockBytes);
  } catch (err) {
    throw new ProfileError(
      "PROFILE_NOT_INITIALIZED",
      `Failed to decode lean snapshot root block as dag-cbor: ${err instanceof Error ? err.message : String(err)}`,
      err
    );
  }
  const validated = validateLeanSnapshotShape(decoded);
  if (validated.entryGroups.length === 0) {
    return validated;
  }
  if (fetcher === void 0) {
    return {
      version: validated.version,
      chainPubkey: validated.chainPubkey,
      network: validated.network,
      createdAt: validated.createdAt,
      entries: [],
      entryGroups: validated.entryGroups,
      bundles: validated.bundles
    };
  }
  const entries = await fetchAndDecodeAllGroupEntries(
    validated.entryGroups,
    fetcher
  );
  return {
    version: validated.version,
    chainPubkey: validated.chainPubkey,
    network: validated.network,
    createdAt: validated.createdAt,
    entries,
    entryGroups: validated.entryGroups,
    bundles: validated.bundles
  };
}
async function fetchAndDecodeAllGroupEntries(groups, fetcher) {
  if (groups.length === 0) return [];
  const groupResults = await Promise.all(
    groups.map(async (group) => {
      const blockBytes = await fetcher(group.entriesCid);
      if (blockBytes.byteLength > PROFILE_CAR_IMPORT_MAX_BLOCK_BYTES) {
        throw new ProfileError(
          "PROFILE_NOT_INITIALIZED",
          `Lean snapshot entry-group "${group.groupKey}" sub-block is ${blockBytes.byteLength} bytes \u2014 exceeds per-block cap ${PROFILE_CAR_IMPORT_MAX_BLOCK_BYTES}.`
        );
      }
      let groupDecoded;
      try {
        groupDecoded = dagCborDecode(blockBytes);
      } catch (err) {
        throw new ProfileError(
          "PROFILE_NOT_INITIALIZED",
          `Failed to decode lean snapshot entry-group "${group.groupKey}" sub-block: ${err instanceof Error ? err.message : String(err)}`,
          err
        );
      }
      return validateGroupBlockShape(group, groupDecoded);
    })
  );
  const flat = [];
  for (const slice of groupResults) {
    for (const entry of slice) flat.push(entry);
  }
  flat.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  return flat;
}
function validateGroupBlockShape(ref, decoded) {
  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) {
    throw new ProfileError(
      "PROFILE_NOT_INITIALIZED",
      `Lean snapshot entry-group "${ref.groupKey}" sub-block is not an object.`
    );
  }
  const obj = decoded;
  if (typeof obj.groupKey !== "string" || obj.groupKey !== ref.groupKey) {
    throw new ProfileError(
      "PROFILE_NOT_INITIALIZED",
      `Lean snapshot entry-group "${ref.groupKey}" sub-block has wrong groupKey field (claims "${String(obj.groupKey)}").`
    );
  }
  if (!Array.isArray(obj.entries)) {
    throw new ProfileError(
      "PROFILE_NOT_INITIALIZED",
      `Lean snapshot entry-group "${ref.groupKey}" sub-block missing entries[] array.`
    );
  }
  if (obj.entries.length !== ref.entryCount) {
    throw new ProfileError(
      "PROFILE_NOT_INITIALIZED",
      `Lean snapshot entry-group "${ref.groupKey}" sub-block has ${obj.entries.length} entries, but root metadata claims ${ref.entryCount}.`
    );
  }
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const e of obj.entries) {
    if (!e || typeof e !== "object" || Array.isArray(e)) {
      throw new ProfileError(
        "PROFILE_NOT_INITIALIZED",
        `Lean snapshot entry-group "${ref.groupKey}" sub-block has invalid KV entry shape.`
      );
    }
    const er = e;
    if (typeof er.key !== "string" || typeof er.value !== "string") {
      throw new ProfileError(
        "PROFILE_NOT_INITIALIZED",
        `Lean snapshot entry-group "${ref.groupKey}" sub-block KV entry must have string \`key\` and \`value\`.`
      );
    }
    if (seen.has(er.key)) {
      throw new ProfileError(
        "PROFILE_NOT_INITIALIZED",
        `Duplicate entry key in lean snapshot entry-group "${ref.groupKey}": "${er.key}".`
      );
    }
    seen.add(er.key);
    if (Buffer.byteLength(er.value, "utf8") > MAX_KV_VALUE_BYTES) {
      throw new ProfileError(
        "PROFILE_NOT_INITIALIZED",
        `Entry "${er.key}" value in entry-group "${ref.groupKey}" exceeds ${MAX_KV_VALUE_BYTES} bytes.`
      );
    }
    out.push({ key: er.key, value: er.value });
  }
  return out;
}
function validateLeanSnapshotShape(decoded) {
  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) {
    throw new ProfileError(
      "PROFILE_NOT_INITIALIZED",
      "Lean snapshot root is not an object."
    );
  }
  const obj = decoded;
  const version = obj.version;
  if (version === void 0 || version === null) {
    throw new ProfileError(
      "PROFILE_NOT_INITIALIZED",
      "Lean snapshot missing `version` field."
    );
  }
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    throw new ProfileError(
      "PROFILE_NOT_INITIALIZED",
      `Invalid lean snapshot version: ${String(version)}`
    );
  }
  if (version !== LEAN_PROFILE_SNAPSHOT_VERSION) {
    if (version > LEAN_PROFILE_SNAPSHOT_VERSION) {
      throw new ProfileError(
        "PROFILE_NOT_INITIALIZED",
        `Lean snapshot version ${version} is newer than this SDK supports (${LEAN_PROFILE_SNAPSHOT_VERSION}). Update the SDK.`
      );
    }
    throw new ProfileError(
      "PROFILE_NOT_INITIALIZED",
      `Lean snapshot version ${version} is not accepted by the lean reader (expected ${LEAN_PROFILE_SNAPSHOT_VERSION}). v1 payloads must be parsed by parseProfileSnapshot; v2 lean payloads predate the Phase 4 cutover and are no longer supported.`
    );
  }
  const chainPubkey = obj.chainPubkey;
  if (typeof chainPubkey !== "string" || chainPubkey.length === 0) {
    throw new ProfileError(
      "PROFILE_NOT_INITIALIZED",
      "Lean snapshot missing or invalid `chainPubkey` field."
    );
  }
  const network = obj.network;
  if (typeof network !== "string" || network.length === 0) {
    throw new ProfileError(
      "PROFILE_NOT_INITIALIZED",
      "Lean snapshot missing or invalid `network` field."
    );
  }
  const createdAt = obj.createdAt;
  if (typeof createdAt !== "number" || !Number.isFinite(createdAt) || createdAt < 0) {
    throw new ProfileError(
      "PROFILE_NOT_INITIALIZED",
      "Lean snapshot missing or invalid `createdAt` field."
    );
  }
  const entryGroups = parseV3EntryGroups(obj.entryGroups);
  const bundles = parseBundleEntries(obj.bundles);
  const result = {
    version: LEAN_PROFILE_SNAPSHOT_VERSION,
    chainPubkey,
    network,
    createdAt,
    entries: [],
    entryGroups,
    bundles
  };
  return result;
}
function parseV3EntryGroups(groupsRaw) {
  if (!Array.isArray(groupsRaw)) {
    throw new ProfileError(
      "PROFILE_NOT_INITIALIZED",
      "Lean snapshot `entryGroups` must be an array."
    );
  }
  if (groupsRaw.length > MAX_KV_ENTRIES) {
    throw new ProfileError(
      "PROFILE_NOT_INITIALIZED",
      `Lean snapshot has ${groupsRaw.length} entry groups \u2014 exceeds cap ${MAX_KV_ENTRIES}.`
    );
  }
  const groups = [];
  const seenGroupKeys = /* @__PURE__ */ new Set();
  let totalEntries = 0;
  for (const g of groupsRaw) {
    if (!g || typeof g !== "object" || Array.isArray(g)) {
      throw new ProfileError(
        "PROFILE_NOT_INITIALIZED",
        "Lean snapshot entryGroup ref must be an object."
      );
    }
    const gr = g;
    if (typeof gr.groupKey !== "string" || gr.groupKey.length === 0) {
      throw new ProfileError(
        "PROFILE_NOT_INITIALIZED",
        "Lean snapshot entryGroup ref missing or invalid `groupKey`."
      );
    }
    if (seenGroupKeys.has(gr.groupKey)) {
      throw new ProfileError(
        "PROFILE_NOT_INITIALIZED",
        `Duplicate entryGroup key in lean snapshot: "${gr.groupKey}".`
      );
    }
    seenGroupKeys.add(gr.groupKey);
    let entriesCidStr;
    const cidValue = gr.entriesCid;
    const asCid = cidValue instanceof Object ? CID2.asCID(cidValue) : null;
    if (asCid !== null) {
      entriesCidStr = asCid.toString();
    } else if (typeof cidValue === "string" && cidValue.length > 0) {
      try {
        CID2.parse(cidValue);
      } catch {
        throw new ProfileError(
          "PROFILE_NOT_INITIALIZED",
          `Lean snapshot entryGroup "${gr.groupKey}" has unparseable entriesCid: "${cidValue}"`
        );
      }
      entriesCidStr = cidValue;
    } else {
      throw new ProfileError(
        "PROFILE_NOT_INITIALIZED",
        `Lean snapshot entryGroup "${gr.groupKey}" missing or invalid \`entriesCid\` (expected CID link or string, got ${typeof cidValue}).`
      );
    }
    if (typeof gr.entryCount !== "number" || !Number.isInteger(gr.entryCount) || gr.entryCount < 0) {
      throw new ProfileError(
        "PROFILE_NOT_INITIALIZED",
        `Lean snapshot entryGroup "${gr.groupKey}" has missing/invalid entryCount.`
      );
    }
    totalEntries += gr.entryCount;
    if (totalEntries > MAX_KV_ENTRIES) {
      throw new ProfileError(
        "PROFILE_NOT_INITIALIZED",
        `Lean snapshot declares ${totalEntries} total entries across groups \u2014 exceeds cap ${MAX_KV_ENTRIES}.`
      );
    }
    groups.push({
      groupKey: gr.groupKey,
      entriesCid: entriesCidStr,
      entryCount: gr.entryCount
    });
  }
  return groups;
}
function parseBundleEntries(bundlesRaw) {
  if (!Array.isArray(bundlesRaw)) {
    throw new ProfileError(
      "PROFILE_NOT_INITIALIZED",
      "Lean snapshot `bundles` must be an array."
    );
  }
  const bundles = [];
  const seenBundleCids = /* @__PURE__ */ new Set();
  for (const b of bundlesRaw) {
    if (!b || typeof b !== "object" || Array.isArray(b)) {
      throw new ProfileError("PROFILE_NOT_INITIALIZED", "Invalid bundle entry shape.");
    }
    const br = b;
    if (typeof br.cid !== "string" || br.cid.length === 0) {
      throw new ProfileError("PROFILE_NOT_INITIALIZED", "Bundle entry missing `cid`.");
    }
    try {
      CID2.parse(br.cid);
    } catch {
      throw new ProfileError(
        "PROFILE_NOT_INITIALIZED",
        `Bundle entry has unparseable cid: "${br.cid}"`
      );
    }
    if (seenBundleCids.has(br.cid)) {
      throw new ProfileError(
        "PROFILE_NOT_INITIALIZED",
        `Duplicate bundle cid in lean snapshot: "${br.cid}".`
      );
    }
    seenBundleCids.add(br.cid);
    if (br.status !== "active" && br.status !== "superseded") {
      throw new ProfileError(
        "PROFILE_NOT_INITIALIZED",
        `Bundle entry has invalid status: ${String(br.status)} (lean snapshot accepts only 'active' | 'superseded')`
      );
    }
    if (typeof br.createdAt !== "number" || !Number.isFinite(br.createdAt)) {
      throw new ProfileError(
        "PROFILE_NOT_INITIALIZED",
        "Bundle entry missing/invalid `createdAt`."
      );
    }
    const entry = {
      cid: br.cid,
      status: br.status,
      createdAt: br.createdAt,
      ...typeof br.tokenCount === "number" ? { tokenCount: br.tokenCount } : {}
    };
    bundles.push(entry);
  }
  return bundles;
}

// profile/pointer-wiring.ts
var CAR_FETCH_TOTAL_BUDGET_MS = 6e4;
var LOCAL_VERSION_KEY = "profile.pointer.version";
async function extractCarRootCid(carBytes) {
  try {
    const { CarReader: CarReader5 } = await import("@ipld/car");
    const reader = await CarReader5.fromBytes(carBytes);
    const roots = await reader.getRoots();
    if (roots.length === 0) return null;
    return new Uint8Array(roots[0].bytes);
  } catch {
    return null;
  }
}
function cidBytesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
function buildCarFetcher(gateways) {
  return async (cidBytes) => {
    let cidString;
    try {
      cidString = CID3.decode(cidBytes).toString();
    } catch {
      return { ok: false, kind: "car_parse_failed" };
    }
    const startedAt = Date.now();
    const budgetRemaining = () => Math.max(0, CAR_FETCH_TOTAL_BUDGET_MS - (Date.now() - startedAt));
    let lastTransient = null;
    for (const gateway of gateways) {
      if (budgetRemaining() === 0) {
        return {
          ok: false,
          kind: "transient_unavailable"
        };
      }
      const url = `${gateway.replace(/\/+$/, "")}/ipfs/${cidString}?format=car`;
      let outcome;
      try {
        outcome = await fetchCarFromGateway(url, { totalMs: budgetRemaining() });
      } catch (err) {
        lastTransient = err instanceof Error ? err.message : String(err);
        continue;
      }
      if (outcome.ok) {
        const rootCid = await extractCarRootCid(outcome.bytes);
        if (rootCid === null) {
          return { ok: false, kind: "car_parse_failed" };
        }
        if (!cidBytesEqual(rootCid, cidBytes)) {
          return { ok: false, kind: "content_mismatch" };
        }
        return { ok: true };
      }
      switch (outcome.kind) {
        case "content_encoding_rejected":
          return { ok: false, kind: "car_parse_failed" };
        case "byte_cap_exceeded":
          return { ok: false, kind: "car_parse_failed" };
        case "initial_response_timeout":
        case "stall_timeout":
        case "total_timeout":
        case "http_error":
        case "network_error":
        default:
          lastTransient = outcome.detail;
          continue;
      }
    }
    return { ok: false, kind: "transient_unavailable", detail: lastTransient ?? "no gateways" };
  };
}
function buildResolveRemoteCid(deps) {
  return async (version) => {
    const result = await decodeVersionCid({
      v: version,
      keyMaterial: deps.keyMaterial,
      signer: deps.signer,
      aggregatorClient: deps.aggregatorClient,
      trustBase: deps.trustBase,
      decodeCid: deps.decodeCid
    });
    if (result.ok) return result.cidBytes;
    if (result.reason === "transient") {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.NETWORK_ERROR,
        `resolveRemoteCid: transient aggregator failure at v=${version}; retry later.`
      );
    }
    throw new AggregatorPointerError(
      AggregatorPointerErrorCode.PROTOCOL_ERROR,
      `resolveRemoteCid: semantic failure at v=${version} for a version previously classified as VALID.`
    );
  };
}
function buildFetchAndJoin(deps) {
  return async (remoteCid, remoteVersion) => {
    let cidString;
    try {
      cidString = CID3.decode(remoteCid).toString();
    } catch (err) {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.PROTOCOL_ERROR,
        `fetchAndJoin: invalid CID bytes at v=${remoteVersion}: ${err instanceof Error ? err.message : String(err)}`,
        void 0,
        { cause: err }
      );
    }
    if (deps.gateways.length === 0) {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.CAR_UNAVAILABLE,
        `fetchAndJoin: no IPFS gateways configured (cannot fetch ${cidString}).`
      );
    }
    let rootBlockBytes;
    try {
      rootBlockBytes = await fetchFromIpfs([...deps.gateways], cidString);
    } catch (err) {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.CAR_UNAVAILABLE,
        `fetchAndJoin: snapshot block fetch failed for ${cidString}: ${err instanceof Error ? err.message : String(err)}`,
        void 0,
        { cause: err }
      );
    }
    let snapshot;
    try {
      snapshot = await parseLeanProfileSnapshotFromRootBlock(
        rootBlockBytes,
        (subBlockCid) => fetchFromIpfs([...deps.gateways], subBlockCid)
      );
    } catch (err) {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.PROTOCOL_ERROR,
        `fetchAndJoin: lean-snapshot parse failed for ${cidString} at v=${remoteVersion}: ${err instanceof Error ? err.message : String(err)}`,
        void 0,
        { cause: err }
      );
    }
    try {
      await deps.applySnapshot(snapshot);
    } catch (err) {
      throw new AggregatorPointerError(
        AggregatorPointerErrorCode.PROTOCOL_ERROR,
        `fetchAndJoin: applySnapshot threw for ${cidString} at v=${remoteVersion}: ${err instanceof Error ? err.message : String(err)}`,
        void 0,
        { cause: err }
      );
    }
    await deps.persistLocalVersion(remoteVersion);
  };
}
function buildCidDecoder() {
  return (full) => {
    try {
      if (full.length === 0) return { ok: false };
      const cidLen = full[0];
      if (cidLen === void 0 || cidLen === 0 || cidLen > full.length - 1) {
        return { ok: false };
      }
      const cidBytes = full.subarray(1, 1 + cidLen);
      const cid = CID3.decode(cidBytes);
      return { ok: true, cidBytes: new Uint8Array(cid.bytes) };
    } catch {
      return { ok: false };
    }
  };
}
async function buildProfilePointerLayer(input) {
  const debug = input.debug ?? false;
  const log = (msg) => {
    if (debug) {
      logger.debug("PointerWiring", msg);
    }
  };
  if (!input.identity?.privateKey || !input.identity?.chainPubkey) {
    return { ok: false, reason: "identity_missing" };
  }
  if (!input.oracle) {
    return { ok: false, reason: "oracle_missing" };
  }
  const aggregatorClient = input.oracle.getAggregatorClient?.() ?? null;
  if (!aggregatorClient) {
    return { ok: false, reason: "aggregator_client_unavailable" };
  }
  const trustBase = input.oracle.getRootTrustBase?.() ?? null;
  if (!trustBase) {
    return { ok: false, reason: "trust_base_unavailable" };
  }
  if (!isDurableProvider(input.localCache)) {
    return { ok: false, reason: "storage_not_durable" };
  }
  if (typeof input.applySnapshot !== "function") {
    return { ok: false, reason: "snapshot_applier_missing" };
  }
  const rawPrivKeyBytes = hexToBytes4(input.identity.privateKey);
  let masterKey = null;
  try {
    masterKey = createMasterPrivateKey(rawPrivKeyBytes, input.network);
    rawPrivKeyBytes.fill(0);
    const keyMaterial = derivePointerKeyMaterial(masterKey);
    masterKey.zeroize();
    masterKey = null;
    const signer = await buildPointerSigner(keyMaterial.signingSeed);
    const flagStore = FlagStore.create(input.localCache, signer.signingPubKeyHex);
    const lockName = `profile.pointer.publish.${signer.signingPubKeyHex}`;
    const isNode2 = typeof process !== "undefined" && !!process.versions?.node;
    if (isNode2 && !input.lockFilePath) {
      return { ok: false, reason: "lock_file_path_missing" };
    }
    const mutex = createPointerMutex(lockName, {
      lockFilePath: input.lockFilePath
    });
    const fetchCar = buildCarFetcher(input.ipfsGateways);
    const decodeCid = buildCidDecoder();
    const readLocalVersion = async () => {
      const raw2 = await input.localCache.get(LOCAL_VERSION_KEY);
      if (raw2 === null) return 0;
      const parsed = Number.parseInt(raw2, 10);
      if (!Number.isFinite(parsed) || parsed < 0) return 0;
      return parsed;
    };
    const persistLocalVersion = async (v) => {
      await input.localCache.set(LOCAL_VERSION_KEY, String(v));
    };
    const resolveRemoteCid = buildResolveRemoteCid({
      keyMaterial,
      signer,
      aggregatorClient,
      trustBase,
      decodeCid
    });
    const fetchAndJoin = buildFetchAndJoin({
      gateways: input.ipfsGateways,
      persistLocalVersion,
      applySnapshot: input.applySnapshot
    });
    const layer = new ProfilePointerLayer({
      keyMaterial,
      signer,
      aggregatorClient,
      trustBase,
      flagStore,
      mutex,
      decodeCid,
      fetchCar,
      fetchAndJoin,
      readLocalVersion,
      persistLocalVersion,
      resolveRemoteCid,
      config: input.config
    });
    log(`constructed for pubkey ${signer.signingPubKeyHex.slice(0, 8)}\u2026`);
    return { ok: true, layer };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    const code2 = err instanceof AggregatorPointerError ? err.code : void 0;
    logger.warn("PointerWiring", `pointer layer init failed: ${detail}`);
    return { ok: false, reason: "pointer_init_failed", detail, code: code2, cause: err };
  } finally {
    if (masterKey !== null) masterKey.zeroize();
    rawPrivKeyBytes.fill(0);
  }
}
function hexToBytes4(hex) {
  if (typeof hex !== "string") {
    throw new TypeError(`hexToBytes: expected string, got ${typeof hex}`);
  }
  const hasPrefix = hex.length >= 2 && hex[0] === "0" && (hex[1] === "x" || hex[1] === "X");
  const clean2 = hasPrefix ? hex.slice(2) : hex;
  return hexToBytes(clean2);
}

// profile/profile-storage-provider.ts
init_logger();
init_hex();
init_originated_tag();
var PROFILE_CLEARED_KEY = "profile.cleared";
var TRACKED_ADDRESSES_PROFILE_KEY = "addresses.tracked";
var TRANSPORT_KEY_PATTERNS = [
  { legacyPrefix: "last_wallet_event_ts_", profilePrefix: "transport.lastWalletEventTs." },
  { legacyPrefix: "last_dm_event_ts_", profilePrefix: "transport.lastDmEventTs." }
];
var SWAP_KEY_PATTERN = /^(.+)_swap:(.+)$/;
var PAYLOAD_SIZE_WARN_BYTES = 8 * 1024;
function redactProfileKey(key) {
  return key.replace(
    /([.:])([A-Za-z0-9_-]{16,})$/,
    (_, sep, suffix) => `${sep}${suffix.slice(0, 4)}\u2026`
  );
}
var PER_ADDRESS_KEYS = new Set(
  Object.values(STORAGE_KEYS_ADDRESS)
);
function translateKey(key, addressId) {
  let stripped = key;
  if (stripped.startsWith(STORAGE_PREFIX)) {
    stripped = stripped.slice(STORAGE_PREFIX.length);
  }
  if (IPFS_STATE_KEYS_PATTERN.test(stripped)) {
    return { profileKey: stripped, cacheOnly: false, excluded: true };
  }
  for (const tp of TRANSPORT_KEY_PATTERNS) {
    if (stripped.startsWith(tp.legacyPrefix)) {
      const suffix = stripped.slice(tp.legacyPrefix.length);
      return { profileKey: `${tp.profilePrefix}${suffix}`, cacheOnly: false, excluded: false };
    }
  }
  const addrSepIdx = findAddressSeparator(stripped);
  if (addrSepIdx !== -1) {
    const addrPart = stripped.slice(0, addrSepIdx);
    const keyPart = stripped.slice(addrSepIdx + 1);
    if (keyPart.startsWith("swap:")) {
      return { profileKey: `${addrPart}.${keyPart}`, cacheOnly: false, excluded: false };
    }
    const mapping = PROFILE_KEY_MAPPING[keyPart];
    if (mapping) {
      const profileKey = mapping.profileKey.replace("{addr}", addrPart);
      const cacheOnly = CACHE_ONLY_KEYS.has(keyPart);
      return { profileKey, cacheOnly, excluded: false };
    }
    return { profileKey: `${addrPart}.${keyPart}`, cacheOnly: false, excluded: false };
  }
  if (PER_ADDRESS_KEYS.has(stripped) && addressId) {
    const mapping = PROFILE_KEY_MAPPING[stripped];
    if (mapping && mapping.dynamic) {
      const profileKey = mapping.profileKey.replace("{addr}", addressId);
      return { profileKey, cacheOnly: false, excluded: false };
    }
  }
  if (stripped.startsWith("swap:") && addressId) {
    return { profileKey: `${addressId}.${stripped}`, cacheOnly: false, excluded: false };
  }
  const globalMapping = PROFILE_KEY_MAPPING[stripped];
  if (globalMapping) {
    const cacheOnly = CACHE_ONLY_KEYS.has(stripped);
    let profileKey = globalMapping.profileKey;
    if (globalMapping.dynamic && addressId) {
      profileKey = profileKey.replace("{addr}", addressId);
    }
    return { profileKey, cacheOnly, excluded: false };
  }
  return { profileKey: stripped, cacheOnly: false, excluded: false };
}
function findAddressSeparator(key) {
  if (!key.startsWith("DIRECT_")) {
    const swapMatch = SWAP_KEY_PATTERN.exec(key);
    if (swapMatch) {
      return swapMatch[1].length;
    }
    return -1;
  }
  const expectedSepIdx = 20;
  if (key.length > expectedSepIdx && key[expectedSepIdx] === "_") {
    return expectedSepIdx;
  }
  return -1;
}
function reverseMapProfileKey(profileKey) {
  for (const tp of TRANSPORT_KEY_PATTERNS) {
    if (profileKey.startsWith(tp.profilePrefix)) {
      const suffix = profileKey.slice(tp.profilePrefix.length);
      return `${tp.legacyPrefix}${suffix}`;
    }
  }
  const swapDotIdx = profileKey.indexOf(".swap:");
  if (swapDotIdx !== -1) {
    const addr = profileKey.slice(0, swapDotIdx);
    const rest = profileKey.slice(swapDotIdx + 1);
    return `${addr}_${rest}`;
  }
  const reverseEntry = getReverseMapping(profileKey);
  if (reverseEntry) {
    return reverseEntry;
  }
  return profileKey;
}
var reverseMappingCache = null;
var perAddressReverseCache = null;
function buildReverseMapping() {
  reverseMappingCache = /* @__PURE__ */ new Map();
  perAddressReverseCache = [];
  for (const [legacyKey, entry] of Object.entries(PROFILE_KEY_MAPPING)) {
    if (entry.dynamic) {
      const suffix = entry.profileKey.replace("{addr}", "");
      perAddressReverseCache.push({ suffix, legacyKey });
    } else {
      reverseMappingCache.set(entry.profileKey, legacyKey);
    }
  }
}
function getReverseMapping(profileKey) {
  if (!reverseMappingCache || !perAddressReverseCache) {
    buildReverseMapping();
  }
  const globalMatch = reverseMappingCache.get(profileKey);
  if (globalMatch !== void 0) {
    return globalMatch;
  }
  for (const { suffix, legacyKey } of perAddressReverseCache) {
    if (profileKey.endsWith(suffix)) {
      const addr = profileKey.slice(0, profileKey.length - suffix.length);
      if (addr.startsWith("DIRECT_") || addr.length > 0) {
        return `${addr}_${legacyKey}`;
      }
    }
  }
  return null;
}
var ProfileStorageProvider = class {
  constructor(localCache, db, options) {
    this.localCache = localCache;
    this.db = db;
    this.options = options;
    this.encryptionEnabled = options?.encrypt !== false;
    this.debug = options?.debug ?? false;
  }
  // --- ProviderMetadata ---
  id = "profile-storage";
  name = "Profile Storage (OrbitDB)";
  type = "p2p";
  description = "OrbitDB-backed profile storage with local cache";
  // --- Internal state ---
  identity = null;
  profileEncryptionKey = null;
  /**
   * Base provider status — reflects LOCAL CACHE connectivity only.
   * A Phase-B (OrbitDB attach) failure does not poison this status because
   * the local cache is still usable; callers who defensively disconnect()
   * shouldn't destroy the working cache just because OrbitDB couldn't attach.
   */
  status = "disconnected";
  /**
   * Independent sub-status for the OrbitDB attach phase.
   *
   *   'disconnected' → initial / after disconnect
   *   'attaching'    → Phase B in progress
   *   'attached'     → OrbitDB is ready for reads/writes
   *   'error'        → transient failure (may be retried by next connect())
   *   'fatal'        → permanent failure (e.g. missing dependency); no retry
   */
  dbStatus = "disconnected";
  addressId = null;
  encryptionEnabled;
  debug;
  /**
   * Identity pubkey captured at the last successful Phase B attach.
   * Used by `setIdentity()` to detect a key swap after attach — which
   * would cause writes encrypted under key-B to hit an OrbitDB whose
   * access controller was initialised with key-A, silently rejecting
   * them. The warning gives operators a breadcrumb to diagnose.
   */
  attachedChainPubkey = null;
  /**
   * In-flight connect() promise. Deduplicates concurrent callers so Phase A
   * and Phase B each run at most once per observable result. Cleared on
   * completion (success or failure) so the next caller can retry.
   */
  connectPromise = null;
  /**
   * In-flight disconnect() promise. Blocks new connect() calls from
   * piggy-backing on a dying attach while disconnect awaits connectPromise.
   * Without this, a concurrent connect() could return success while the DB
   * is being torn down, and subsequent writes would hit a closing OrbitDB.
   */
  disconnectPromise = null;
  /**
   * Aggregator pointer layer (Phase D). Constructed lazily after Phase B
   * OrbitDB attach when an OracleProvider is configured AND all
   * preconditions are met (see profile/pointer-wiring.ts). Null when the
   * preconditions are not met — the caller falls back to the legacy
   * recovery path until T-D6 removes it.
   */
  pointerLayer = null;
  /**
   * Reason pointer construction was skipped (or null when successful /
   * not yet attempted). Surfaced via getPointerSkipReason() for
   * diagnostics and test assertions.
   */
  pointerSkipReason = null;
  /**
   * Steelman pass — serialize concurrent tryBuildPointerLayer() calls.
   * Both connect()'s Phase C and setIdentity()'s deferred fire-and-
   * forget can call tryBuildPointerLayer concurrently when they
   * interleave. Without serialization the buildProfilePointerLayer()
   * lock-file path and master-key construction can race; the layer
   * for identity A may be overwritten by a slower build for identity B
   * (or vice-versa) — silent divergence with OrbitDB writes.
   *
   * The dedup is an in-flight promise: while ANY build is running,
   * subsequent callers wait for it (idempotent re-entry); after it
   * settles, the next caller starts a fresh build.
   */
  pointerBuildPromise = null;
  /**
   * Item #15 Phase C — host-supplied "profile state changed" callback.
   * When set, every {@link OutboxWriter} / {@link SentLedgerWriter} /
   * {@link OrbitDbFinalizationQueueStorageAdapter} /
   * {@link OrbitDbRecipientContextStorageAdapter} produced by the
   * `build*` factories is wired with this callback. Mutations and
   * JOIN-applied remote changes invoke it to signal the host's
   * FlushScheduler.
   *
   * Null until {@link setProfileDirtyNotifier} runs (typically during
   * Sphere's wiring step alongside the token-storage facade). Writers
   * constructed before the notifier is set treat the callback as
   * absent — they simply don't emit dirty signals. This matches the
   * Phase A/B contract (the existing pre-#15 flush path is
   * functionally complete without the dirty signals).
   */
  profileDirtyNotifier = null;
  /**
   * Item #15 Phase D.2 / E — host-supplied snapshot-apply callback.
   * REQUIRED for pointer-layer construction under Phase E: the
   * `fetchAndJoin` callback parses each remote CAR as a lean profile
   * snapshot and dispatches per-writer JOIN through this callback.
   * The legacy bundle-CID-only write path was removed in Phase E, so
   * `tryBuildPointerLayer` skips with the `snapshot_applier_missing`
   * reason when this is null.
   *
   * Null until {@link setSnapshotApplier} runs (typically during the
   * Profile factory wiring step alongside the token-storage facade,
   * AFTER both providers are constructed so the closure can capture
   * `storage.buildOutboxWriter(...)` and `tokenStorage.getBundleIndex()`).
   *
   * The applier is read each time `tryBuildPointerLayer` runs (i.e.
   * each attach cycle), so callers may change it across reconnects.
   * In practice the factory sets it once at construction.
   */
  snapshotApplier = null;
  /**
   * Derived: true iff OrbitDB has been attached.
   * Single source of truth — no separate `dbConnected` field to diverge.
   */
  get dbConnected() {
    return this.dbStatus === "attached";
  }
  /**
   * Item #15 Phase C — register the host's "profile dirty" callback.
   * Idempotent: callers MAY re-register (the most recent callback
   * wins). Pass `null` to disable.
   *
   * The notifier propagates into every writer/adapter built AFTER
   * this call via the `build*` factories. Writers built BEFORE the
   * call continue with their construction-time notifier (or with
   * none if they were built without one). Sphere's wiring sets the
   * notifier early enough that the typical wallet-build path picks
   * it up.
   */
  setProfileDirtyNotifier(notifier) {
    this.profileDirtyNotifier = notifier;
  }
  /**
   * Item #15 Phase D.2 / E — register the host's snapshot-apply
   * callback. Idempotent: callers MAY re-register (the most recent
   * callback wins). Pass `null` to disable.
   *
   * The applier is threaded into the pointer-wiring layer on the next
   * `tryBuildPointerLayer` run (called from `doConnect`); callers
   * should set it BEFORE the first `connect()` call so it lands on
   * the first attach cycle. The factory wires it during provider
   * construction, satisfying this ordering.
   *
   * Phase E made the applier REQUIRED for pointer-layer construction.
   * Passing `null` causes the next `tryBuildPointerLayer` run to skip
   * with the `snapshot_applier_missing` reason — the wallet runs
   * without aggregator-pointer recovery rather than silently writing
   * the wrong CAR shape to the bundle index.
   */
  setSnapshotApplier(applier) {
    this.snapshotApplier = applier;
  }
  // ===========================================================================
  // BaseProvider Implementation
  // ===========================================================================
  async connect() {
    if (this.disconnectPromise) {
      try {
        await this.disconnectPromise;
      } catch {
      }
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }
    this.connectPromise = this.doConnect();
    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }
  /**
   * Serialized connect logic — always invoked through the `connectPromise`
   * guard in `connect()`. Must not be called directly.
   */
  async doConnect() {
    const identityAtStart = this.identity;
    const orbitDbConfig = this.options?.config?.orbitDb ?? null;
    if (this.status !== "connected" && this.status !== "connecting") {
      this.status = "connecting";
      try {
        await this.localCache.connect();
        this.status = "connected";
        this.log("Local cache connected");
      } catch (err) {
        this.status = "error";
        throw new ProfileError(
          "PROFILE_NOT_INITIALIZED",
          `Failed to connect ProfileStorageProvider (local cache): ${err instanceof Error ? err.message : String(err)}`,
          err
        );
      }
    }
    if (this.dbStatus !== "attached" && this.dbStatus !== "attaching" && this.dbStatus !== "fatal" && identityAtStart !== null && orbitDbConfig !== null) {
      this.dbStatus = "attaching";
      try {
        let dbNameOverride;
        const pkHex = identityAtStart.privateKey;
        if (pkHex && pkHex.length > 0) {
          const pkBytes = hexToBytes(pkHex);
          try {
            const secp256k1Module = await Promise.resolve().then(() => (init_secp256k1(), secp256k1_exports));
            const pubKeyBytes = secp256k1Module.secp256k1.getPublicKey(pkBytes, true);
            const pubHex = Array.from(pubKeyBytes, (b) => b.toString(16).padStart(2, "0")).join("");
            dbNameOverride = `sphere-profile-${pubHex.slice(0, 16)}`;
          } catch {
          } finally {
            pkBytes.fill(0);
          }
        }
        await this.db.connect({
          ...orbitDbConfig,
          privateKey: dbNameOverride ? void 0 : identityAtStart.privateKey,
          dbNameOverride,
          // Issue #266 — when the adapter is in `httpOnlyIpfs` mode it
          // needs the operator-controlled Kubo gateway list to install
          // the HTTP block broker. We carry `ipfsGateways` from the
          // top-level ProfileConfig (the canonical source) down into
          // OrbitDbConfig so the raw OrbitDbAdapter doesn't have to
          // reach back into ProfileConfig itself.
          ipfsGateways: orbitDbConfig.ipfsGateways ?? this.options?.config?.ipfsGateways
        });
        this.dbStatus = "attached";
        this.attachedChainPubkey = identityAtStart.chainPubkey ?? null;
        this.log("OrbitDB attached");
      } catch (err) {
        const isFatal = err instanceof ProfileError && err.code === "ORBITDB_NOT_INSTALLED";
        this.dbStatus = isFatal ? "fatal" : "error";
        throw new ProfileError(
          "PROFILE_NOT_INITIALIZED",
          `Failed to attach OrbitDB: ${err instanceof Error ? err.message : String(err)}`,
          err
        );
      }
    }
    if (this.dbStatus === "attached" && this.pointerLayer === null && !this.isPointerSkipSticky() && identityAtStart !== null) {
      await this.runPointerBuildSerialized(identityAtStart);
    }
  }
  /**
   * Serialized wrapper around tryBuildPointerLayer. Dedupes concurrent
   * calls from connect()'s Phase C and setIdentity()'s deferred build
   * (steelman). While a build is in-flight, subsequent callers await
   * the same promise; after settle, the field is cleared so a future
   * caller starts a fresh build.
   */
  async runPointerBuildSerialized(identity) {
    if (this.pointerBuildPromise) {
      try {
        await this.pointerBuildPromise;
      } catch {
      }
      if (this.pointerLayer !== null || this.isPointerSkipSticky()) {
        return;
      }
    }
    const promise = this.tryBuildPointerLayer(identity);
    this.pointerBuildPromise = promise;
    try {
      await promise;
    } finally {
      if (this.pointerBuildPromise === promise) {
        this.pointerBuildPromise = null;
      }
    }
  }
  /**
   * Is the current skip reason a terminal config error that will not
   * be resolved by another connect() attempt? Terminal cases:
   *   - `lock_file_path_missing` — Node without a lock path; fixing
   *     it requires re-constructing the provider
   *   - `pointer_init_failed`    — crypto stack failure (denylist,
   *     malformed key); re-attempting against the same inputs will
   *     fail identically
   * Everything else (oracle_missing, aggregator_client_unavailable,
   * trust_base_unavailable, storage_not_durable, identity_missing)
   * reflects state the caller can fix between connects.
   */
  isPointerSkipSticky() {
    return this.pointerSkipReason === "lock_file_path_missing" || this.pointerSkipReason === "pointer_init_failed";
  }
  /**
   * Attempt to construct the pointer layer. Never throws — sets
   * `pointerLayer` on success, `pointerSkipReason` otherwise. Runs
   * at most once per attach cycle (reset on disconnect()).
   */
  async tryBuildPointerLayer(identity) {
    const oracle = this.options?.oracle;
    if (!oracle) {
      return;
    }
    const gateways = this.options?.config?.ipfsGateways ?? [];
    const orbitDbDir = this.options?.config?.orbitDb?.directory;
    const lockFilePath = orbitDbDir ? `${orbitDbDir.replace(/\/+$/, "")}/profile-pointer-publish.lock` : void 0;
    if (!this.snapshotApplier) {
      this.pointerLayer = null;
      this.pointerSkipReason = "snapshot_applier_missing";
      logger.warn(
        "ProfileStorage",
        "pointer layer skipped: snapshot_applier_missing (factory wiring incomplete)"
      );
      return;
    }
    const result = await buildProfilePointerLayer({
      identity,
      localCache: this.localCache,
      oracle,
      ipfsGateways: gateways,
      lockFilePath,
      // SPEC §14.1 / §11.12 denylist gate: pass network through so
      // the pointer layer's master-key construction can reject the
      // canonical 0x01×32 KAT vector outside test-vectors deployments.
      network: this.options?.config?.network,
      // Item #15 Phase D.2 / E — required. Thread the host's snapshot
      // applier (set via `setSnapshotApplier` during factory wiring)
      // into the pointer-wiring layer. The pointer layer's
      // `fetchAndJoin` callback parses each remote CAR as a lean
      // profile snapshot and dispatches per-writer JOIN through this
      // callback.
      applySnapshot: this.snapshotApplier,
      debug: this.debug
    });
    if (result.ok) {
      this.pointerLayer = result.layer;
      this.pointerSkipReason = null;
      this.log("Pointer layer constructed");
    } else {
      this.pointerLayer = null;
      this.pointerSkipReason = result.reason;
      logger.warn(
        "ProfileStorage",
        `pointer layer skipped: ${result.reason}${result.detail ? ` \u2014 ${result.detail}` : ""}`
      );
    }
  }
  /**
   * Accessor for the constructed pointer layer. Returns null when the
   * layer could not be built (see `getPointerSkipReason()` for why).
   * Downstream call sites (T-D6 recovery/publish wiring) use this to
   * decide whether to go through the pointer layer or fall back to
   * the legacy path.
   */
  getPointerLayer() {
    return this.pointerLayer;
  }
  /**
   * Steelman accessor: the pointer-build state machine viewed from the
   * outside.
   *   - 'ready'       — `pointerLayer !== null`.
   *   - 'pending'     — a build is in-flight (`pointerBuildPromise`),
   *                     OR the preconditions are present but the build
   *                     hasn't started yet (e.g., `setIdentity` is about
   *                     to fire-and-forget the build).
   *   - 'unavailable' — no oracle wired, sticky skip reason, or the
   *                     pointer is structurally inaccessible. Callers
   *                     SHOULD NOT poll further; fall through to the
   *                     legacy path immediately.
   *
   * The "pending" classification is conservative: when in doubt, we
   * prefer to keep callers waiting rather than to fire the legacy
   * IPNS migration prematurely (which would fork the pointer chain).
   */
  getPointerBuildStatus() {
    if (this.pointerLayer !== null) return "ready";
    if (this.pointerBuildPromise !== null) return "pending";
    if (this.isPointerSkipSticky()) return "unavailable";
    if (!this.options?.oracle) return "unavailable";
    return "pending";
  }
  /**
   * Returns the reason pointer-layer construction was skipped on the
   * last attach attempt, or null when construction succeeded or was
   * not yet attempted (no oracle configured).
   */
  getPointerSkipReason() {
    return this.pointerSkipReason;
  }
  /**
   * Round 7 (FIX 1) — Build an {@link OrbitDbDispositionStorageAdapter}
   * bound to this provider's OrbitDB instance and profile encryption
   * key. Returns null when:
   *  - encryption is disabled (no key to encrypt records with), OR
   *  - identity has not been set yet (no key derived), OR
   *  - the caller passes nothing useful (defensive null-check).
   *
   * The adapter is intentionally constructed lazily: bootstrap callers
   * (Sphere) invoke this AFTER `setIdentity()` (which derives the
   * encryption key) but possibly BEFORE OrbitDB has finished attaching
   * (Phase B). The underlying `OrbitDbAdapter.put/get/all` methods all
   * `ensureConnected()`, so the adapter's actual reads/writes are
   * deferred until the DB is ready — there's no need for the adapter
   * to wait at construction time.
   *
   * Returned adapter is a fresh instance each call; callers SHOULD
   * cache the reference (the returned adapter holds a reference to
   * `this.db` and `this.profileEncryptionKey`, so it follows the
   * lifecycle of this provider).
   *
   * Encryption key sharing: the returned adapter shares the encryption
   * key reference with this provider's internal encrypt/decrypt. If the
   * provider's encryption key is rotated (e.g. via setIdentity with a
   * different chainPubkey), the existing adapter holds the OLD key.
   * Bootstrap layers that detect identity rotation MUST rebuild the
   * adapter via this method.
   */
  buildDispositionStorageAdapter() {
    if (!this.encryptionEnabled) {
      this.log("buildDispositionStorageAdapter: encryption disabled \u2014 returning null");
      return null;
    }
    if (this.profileEncryptionKey === null) {
      this.log("buildDispositionStorageAdapter: encryption key not yet derived (setIdentity pending) \u2014 returning null");
      return null;
    }
    return new OrbitDbDispositionStorageAdapter({
      db: this.db,
      encryptionKey: this.profileEncryptionKey,
      // Item #15 Phase B.4 — thread the dirty notifier into the adapter
      // so the four PrefixSyncWriters returned by `syncWritersFor` mark
      // the profile dirty when JOIN-applied remote records land.
      notifyProfileDirty: this.profileDirtyNotifier ?? void 0
    });
  }
  /**
   * G3 — Build an {@link OrbitDbFinalizationQueueStorageAdapter} bound
   * to this provider's OrbitDB instance and profile encryption key.
   * Lifecycle and null semantics mirror
   * {@link buildDispositionStorageAdapter}.
   *
   * The returned adapter persists recipient-side finalization queue
   * entries under `${addr}.finalizationQueue.${entryId}` keys. Each
   * record carries `_schemaVersion: 'uxf-1'` so the legacy
   * PaymentsModule.save() flush path leaves them alone.
   */
  buildFinalizationQueueStorageAdapter() {
    if (!this.encryptionEnabled) return null;
    if (this.profileEncryptionKey === null) return null;
    return new OrbitDbFinalizationQueueStorageAdapter({
      db: this.db,
      encryptionKey: this.profileEncryptionKey,
      notifyProfileDirty: this.profileDirtyNotifier ?? void 0
    });
  }
  /**
   * G7 — Build an {@link OrbitDbRecipientContextStorageAdapter} bound
   * to this provider's OrbitDB instance and profile encryption key.
   * Persists `_recipientRequestContextMap` and
   * `_recipientFinalizationContext` records under
   * `${addr}.recipientContext.{request,finalization}.${id}` keys.
   * Lifecycle and null semantics mirror
   * {@link buildDispositionStorageAdapter}.
   */
  buildRecipientContextStorageAdapter() {
    if (!this.encryptionEnabled) return null;
    if (this.profileEncryptionKey === null) return null;
    return new OrbitDbRecipientContextStorageAdapter({
      db: this.db,
      encryptionKey: this.profileEncryptionKey,
      notifyProfileDirty: this.profileDirtyNotifier ?? void 0
    });
  }
  /**
   * Issue #97 — Build an {@link OutboxWriter} bound to this provider's
   * OrbitDB instance and profile encryption key, scoped to the given
   * address. The writer persists per-entry-key UXF outbox entries under
   * `${addressId}.outbox.${id}` (PROFILE-ARCHITECTURE §10.12) which are
   * IPFS-synced as part of the profile so they survive total local
   * profile loss.
   *
   * Returns null when:
   *  - encryption is disabled, OR
   *  - the encryption key has not been derived yet (setIdentity pending)
   *
   * Lifecycle: callers SHOULD cache the returned writer for the current
   * address. On address switch, callers MUST rebuild via this method —
   * the writer's `addressId` is captured at construction.
   *
   * Lamport clock: the writer takes a fresh {@link Lamport} unless the
   * caller passes one. The writer's first `write()` calls
   * `collectObservedLamports()` to rehydrate `max(observed) + 1`, so the
   * fresh-instance default is correct after restart.
   */
  buildOutboxWriter(addressId, lamport) {
    if (!this.encryptionEnabled) {
      this.log("buildOutboxWriter: encryption disabled \u2014 returning null");
      return null;
    }
    if (this.profileEncryptionKey === null) {
      this.log("buildOutboxWriter: encryption key not yet derived (setIdentity pending) \u2014 returning null");
      return null;
    }
    if (typeof addressId !== "string" || addressId.length === 0) {
      this.log("buildOutboxWriter: addressId must be a non-empty string \u2014 returning null");
      return null;
    }
    return new OutboxWriter({
      db: this.db,
      encryptionKey: this.profileEncryptionKey,
      addressId,
      lamport: lamport ?? new Lamport(),
      notifyProfileDirty: this.profileDirtyNotifier ?? void 0
    });
  }
  /**
   * Issue #97 — Build a {@link SentLedgerWriter} bound to this
   * provider's OrbitDB instance and profile encryption key, scoped to
   * the given address. The writer persists per-entry-key SENT ledger
   * entries under `${addressId}.sent.${id}` (PROFILE-ARCHITECTURE
   * §10.12). Lifecycle and null semantics mirror
   * {@link buildOutboxWriter}.
   *
   * The SENT ledger and the outbox use distinct Lamport instances by
   * design — see profile/sent-ledger-writer.ts module docs. The
   * default `new Lamport()` is correct because the writer's first
   * `write()` rehydrates the max via `collectObservedLamports()`.
   */
  buildSentLedgerWriter(addressId, lamport) {
    if (!this.encryptionEnabled) {
      this.log("buildSentLedgerWriter: encryption disabled \u2014 returning null");
      return null;
    }
    if (this.profileEncryptionKey === null) {
      this.log("buildSentLedgerWriter: encryption key not yet derived (setIdentity pending) \u2014 returning null");
      return null;
    }
    if (typeof addressId !== "string" || addressId.length === 0) {
      this.log("buildSentLedgerWriter: addressId must be a non-empty string \u2014 returning null");
      return null;
    }
    return new SentLedgerWriter({
      db: this.db,
      encryptionKey: this.profileEncryptionKey,
      addressId,
      lamport: lamport ?? new Lamport(),
      notifyProfileDirty: this.profileDirtyNotifier ?? void 0
    });
  }
  async disconnect() {
    if (this.disconnectPromise) {
      return this.disconnectPromise;
    }
    this.disconnectPromise = this.doDisconnect();
    try {
      await this.disconnectPromise;
    } finally {
      this.disconnectPromise = null;
    }
  }
  async doDisconnect() {
    this.log("Disconnecting");
    if (this.connectPromise) {
      try {
        await this.connectPromise;
      } catch {
      }
    }
    try {
      const drainable = this.pointerLayer;
      if (drainable && typeof drainable.shutdown === "function") {
        await drainable.shutdown();
      }
    } catch {
    }
    try {
      if (this.dbStatus === "attached") {
        await this.db.close();
      }
    } catch {
    } finally {
      this.dbStatus = "disconnected";
      this.attachedChainPubkey = null;
      this._envelopesSupported = null;
      this.pointerLayer = null;
      if (!this.isPointerSkipSticky()) {
        this.pointerSkipReason = null;
      }
    }
    try {
      await this.localCache.disconnect();
    } catch {
    }
    this.status = "disconnected";
    this.log("Disconnected");
  }
  isConnected() {
    if (this.status !== "connected") return false;
    if (this.options?.config?.orbitDb && this.dbStatus !== "attached") {
      return false;
    }
    return true;
  }
  getStatus() {
    return this.status;
  }
  // ===========================================================================
  // StorageProvider Implementation
  // ===========================================================================
  /**
   * Set identity for scoped storage.
   * Synchronous. Stores identity, derives profileEncryptionKey via HKDF.
   * Does NOT open OrbitDB — that is deferred to `connect()`.
   */
  setIdentity(identity) {
    if (this.dbStatus === "attached" && this.attachedChainPubkey !== null && identity.chainPubkey !== this.attachedChainPubkey) {
      logger.warn(
        "ProfileStorage",
        "setIdentity called with a different chainPubkey while OrbitDB is attached \u2014 OrbitDB AccessController will reject writes under the new key. Call disconnect() and reconnect() to rebind."
      );
    }
    this.identity = identity;
    if (this.encryptionEnabled) {
      const privKeyBytes = hexToBytes(identity.privateKey);
      this.profileEncryptionKey = deriveProfileEncryptionKey(privKeyBytes);
    }
    if (identity.directAddress) {
      this.addressId = computeAddressId(identity.directAddress);
    }
    this.localCache.setIdentity(identity);
    this.log("Identity set:", identity.l1Address);
    if (this.dbStatus === "attached" && this.pointerLayer === null && !this.isPointerSkipSticky()) {
      void this.runPointerBuildSerialized(identity).catch((err) => {
        this.log(
          `setIdentity: deferred pointer-layer build failed: ${err instanceof Error ? err.message : String(err)}`
        );
      });
    }
  }
  /**
   * Get value by key.
   * Reads from local cache first. On cache miss, falls back to OrbitDB
   * (decrypt), populates cache, and returns the value.
   */
  async get(key) {
    const translated = translateKey(key, this.addressId);
    if (translated.excluded) {
      return null;
    }
    const cached = await this.localCache.get(key);
    if (cached !== null) {
      return cached;
    }
    if (translated.cacheOnly) {
      return null;
    }
    if (!this.dbConnected) {
      return null;
    }
    const encrypted = await this.readEnvelopePayload(translated.profileKey);
    if (encrypted === null) {
      return null;
    }
    const value = await this.decrypt(encrypted);
    try {
      await this.localCache.set(key, value);
    } catch {
    }
    return value;
  }
  /**
   * Set value by key.
   * Cache-only keys are written to local cache only.
   * All other keys are encrypted and written to both local cache AND OrbitDB.
   *
   * PROFILE-OPLOG-SCHEMA.md §5.1: the encrypted payload is wrapped in a
   * structured envelope carrying an originated tag. Generic `set` calls
   * default to `type='cache_index', originated='system'` — a safe
   * conservative classification. Callers that know the action semantics
   * SHOULD use `setEntry()` (see below) which accepts an explicit type.
   */
  async set(key, value, opts) {
    const translated = translateKey(key, this.addressId);
    if (translated.excluded) {
      return;
    }
    await this.localCache.set(key, value);
    if (translated.cacheOnly) {
      return;
    }
    if (this.dbConnected) {
      const encrypted = await this.encrypt(value);
      await this.writeEnvelope(translated.profileKey, encrypted, opts?.entryType ?? "cache_index");
    }
  }
  /**
   * Typed-entry write helper — lets callers pass an explicit OpLogEntryType
   * for W11 originated-tag discipline. Maps the user's `OpLogEntryType` to
   * the envelope's `(type, originated)` pair via the originated-tag coherence
   * rules (user-action types → 'user'; system types → 'system').
   *
   * Delegates to `set()` for local-cache write + key translation;
   * the envelope wrap happens internally.
   */
  async setEntry(key, value, entryType) {
    return this.set(key, value, { entryType });
  }
  // ---------- Envelope helpers (PROFILE-OPLOG-SCHEMA.md §5) ----------
  /**
   * Computed ONCE lazily from the adapter's capability surface. Both
   * putEntry AND getEntry must exist together, OR both must be absent —
   * an asymmetric adapter (one method but not the other) would silently
   * corrupt reads, so we treat it as a configuration error.
   *
   * Value is cached after first probe to avoid repeated `typeof` checks
   * on hot paths; reset in `disconnect()` on re-connect.
   */
  _envelopesSupported = null;
  /** Probe both putEntry + getEntry exactly once; throw on asymmetry. */
  supportsEnvelopes() {
    if (this._envelopesSupported !== null) return this._envelopesSupported;
    const hasPut = typeof this.db.putEntry === "function";
    const hasGet = typeof this.db.getEntry === "function";
    if (hasPut !== hasGet) {
      throw new ProfileError(
        "PROFILE_NOT_INITIALIZED",
        `ProfileDatabase adapter has asymmetric envelope support: putEntry=${hasPut}, getEntry=${hasGet}. Adapter must implement BOTH methods or NEITHER \u2014 asymmetric support would silently corrupt reads of envelope-wrapped writes (PROFILE-OPLOG-SCHEMA.md \xA77).`
      );
    }
    this._envelopesSupported = hasPut;
    return hasPut;
  }
  /**
   * Write `encryptedPayload` to OrbitDB wrapped in a structured envelope.
   * Falls back to raw-bytes `db.put` if the underlying adapter does not
   * implement putEntry (legacy test stubs, older adapter versions).
   *
   * Capability probe is symmetric: the first call asserts that putEntry
   * and getEntry are either both present or both absent. See
   * `supportsEnvelopes()`.
   */
  async writeEnvelope(profileKey, encryptedPayload, entryType = "cache_index") {
    if (encryptedPayload.byteLength > PAYLOAD_SIZE_WARN_BYTES) {
      logger.warn(
        "ProfileStorage",
        `[PAYLOAD-SIZE] OpLog write exceeds ${PAYLOAD_SIZE_WARN_BYTES} B soft-warn threshold \u2014 consider migrating this write site to a CID reference (PROFILE-CID-REFERENCES.md \xA78). key=${redactProfileKey(profileKey)} type=${entryType} size=${encryptedPayload.byteLength}`
      );
    }
    const originated = deriveOriginForType(entryType);
    if (this.supportsEnvelopes()) {
      const envelope = buildLocalEntry({
        type: entryType,
        originated,
        payload: encryptedPayload
      });
      await this.db.putEntry(profileKey, envelope);
    } else {
      await this.db.put(profileKey, encryptedPayload);
      const markHook = this.db.markLocallyAuthored;
      if (typeof markHook === "function") {
        markHook.call(this.db, profileKey);
      }
    }
  }
  /**
   * Read an envelope's encrypted payload from OrbitDB. Returns null if
   * the key is absent. Legacy raw-bytes entries are auto-wrapped by
   * `getEntry`'s legacy fallback (§7.1), so this helper works on both
   * pre-schema and post-schema OpLog contents.
   *
   * Passes `trustLocalClaim: true` — callers at this layer have already
   * established that this wallet's OrbitDB instance is its own source of
   * truth (no cross-wallet sharing). Peer writes reach this path only
   * through replication events, which clear the locally-authored set.
   */
  async readEnvelopePayload(profileKey) {
    if (this.supportsEnvelopes()) {
      const envelope = await this.db.getEntry(profileKey, {
        trustLocalClaim: true
      });
      return envelope ? envelope.payload : null;
    }
    return this.db.get(profileKey);
  }
  /**
   * Remove key from both cache and OrbitDB.
   */
  async remove(key) {
    const translated = translateKey(key, this.addressId);
    if (translated.excluded) {
      return;
    }
    await this.localCache.remove(key);
    if (!translated.cacheOnly && this.dbConnected) {
      await this.db.del(translated.profileKey);
    }
  }
  /**
   * Check if key exists.
   * Checks cache first, then OrbitDB.
   * Special handling for `wallet_exists` on cold cache — falls back to
   * checking OrbitDB for `identity.*` keys.
   */
  async has(key) {
    const translated = translateKey(key, this.addressId);
    if (translated.excluded) {
      return false;
    }
    const inCache = await this.localCache.has(key);
    if (inCache) {
      return true;
    }
    if (translated.cacheOnly) {
      return false;
    }
    if (key === "wallet_exists" || key === `${STORAGE_PREFIX}wallet_exists`) {
      if (this.dbConnected) {
        const clearedBytes = await this.readEnvelopePayload(PROFILE_CLEARED_KEY);
        if (clearedBytes !== null) {
          const clearedStr = await this.decrypt(clearedBytes);
          if (clearedStr === "true") {
            return false;
          }
        }
        const identityKeys = await this.db.all("identity.");
        return identityKeys.size > 0;
      }
      return false;
    }
    if (this.dbConnected) {
      const value = await this.readEnvelopePayload(translated.profileKey);
      return value !== null;
    }
    return false;
  }
  /**
   * Get all keys with optional prefix filter.
   * Returns the union of keys from cache and OrbitDB, mapped back to
   * legacy format (with appropriate prefixes for callers to consume).
   */
  async keys(prefix) {
    const keySet = /* @__PURE__ */ new Set();
    const cacheKeys = await this.localCache.keys(prefix);
    for (const k of cacheKeys) {
      keySet.add(k);
    }
    if (this.dbConnected) {
      const allEntries = await this.db.all();
      for (const profileKey of allEntries.keys()) {
        if (profileKey === PROFILE_CLEARED_KEY) continue;
        const legacyKey = reverseMapProfileKey(profileKey);
        if (prefix && !legacyKey.startsWith(prefix)) {
          continue;
        }
        keySet.add(legacyKey);
      }
    }
    return Array.from(keySet);
  }
  /**
   * Clear all keys with optional prefix filter.
   * Writes `profile.cleared = true` to OrbitDB so other devices see the clear.
   * Clears local cache via the composed provider.
   */
  async clear(prefix) {
    if (this.dbConnected) {
      if (!prefix) {
        const clearedBytes = await this.encrypt("true");
        await this.writeEnvelope(PROFILE_CLEARED_KEY, clearedBytes, "cache_index");
      } else {
        const allEntries = await this.db.all();
        for (const profileKey of allEntries.keys()) {
          const legacyKey = reverseMapProfileKey(profileKey);
          if (legacyKey.startsWith(prefix)) {
            await this.db.del(profileKey);
          }
        }
      }
    }
    await this.localCache.clear(prefix);
  }
  /**
   * Save tracked addresses — encrypt and write to OrbitDB key `addresses.tracked`.
   */
  async saveTrackedAddresses(entries) {
    const json = JSON.stringify({ version: 1, addresses: entries });
    await this.localCache.saveTrackedAddresses(entries);
    if (this.dbConnected) {
      const encrypted = await this.encrypt(json);
      await this.writeEnvelope(TRACKED_ADDRESSES_PROFILE_KEY, encrypted, "cache_index");
    }
  }
  /**
   * Load tracked addresses — read from cache or OrbitDB, decrypt, parse.
   */
  async loadTrackedAddresses() {
    const cached = await this.localCache.loadTrackedAddresses();
    if (cached.length > 0) {
      return cached;
    }
    if (!this.dbConnected) {
      return [];
    }
    const encrypted = await this.readEnvelopePayload(TRACKED_ADDRESSES_PROFILE_KEY);
    if (encrypted === null) {
      return [];
    }
    try {
      const json = await this.decrypt(encrypted);
      const parsed = JSON.parse(json);
      const addresses = parsed.addresses ?? [];
      try {
        await this.localCache.saveTrackedAddresses(addresses);
      } catch {
      }
      return addresses;
    } catch {
      return [];
    }
  }
  // ===========================================================================
  // Raw Encrypted Round-Trip (Wave 9 — profile-export/import)
  // ===========================================================================
  /**
   * Read the ENCRYPTED OrbitDB envelope payload for a key WITHOUT
   * decryption. Returns a base64-encoded ciphertext string suitable
   * for round-tripping through `setEncryptedRaw`. Returns null when
   * the key is absent or stored cache-only / excluded.
   *
   * The whole point of this method is to defeat the "decrypt-on-read,
   * leak-into-CAR" mnemonic-leak path closed in Wave 9 critical #1.
   * `profile-export` must NOT see plaintext for identity-class keys
   * (`mnemonic`, `master_key`, `chain_code`, ...) — the snapshot CAR
   * is supposed to carry encrypted bytes only, decryptable solely
   * by a wallet sharing the source's master key (and therefore
   * mnemonic). This entry point bypasses the in-cache plaintext
   * shadow that `set()` populates and reads the OrbitDB ciphertext
   * envelope directly.
   *
   * Cache-only keys (price cache, registry cache) and excluded keys
   * (IPFS state) return null — they are never written to OrbitDB.
   *
   * @param key - The legacy (caller-facing) key name, same shape as
   *              passed to `get()` / `set()`.
   * @returns Base64-encoded encrypted bytes, or null when absent.
   * @throws ProfileError when OrbitDB is not connected (the export
   *         path requires durable backing — refusing here forces
   *         the caller to surface the error rather than silently
   *         emit a snapshot with missing identity entries).
   */
  async getEncryptedRaw(key) {
    const translated = translateKey(key, this.addressId);
    if (translated.excluded) return null;
    if (translated.cacheOnly) return null;
    if (!this.dbConnected) {
      throw new ProfileError(
        "PROFILE_NOT_INITIALIZED",
        `getEncryptedRaw("${redactProfileKey(translated.profileKey)}") requires OrbitDB to be attached.`
      );
    }
    const encrypted = await this.readEnvelopePayload(translated.profileKey);
    if (encrypted === null) return null;
    return Buffer.from(encrypted).toString("base64");
  }
  /**
   * Write a previously-extracted encrypted envelope payload back to
   * OrbitDB without re-encryption. The destination wallet's master
   * key MUST match the source's (verified by the importer's
   * `expectedChainPubkey` check), or the ciphertext will be
   * unreadable on subsequent `get()` calls — but this method does
   * NOT verify decryptability, since the import path runs before the
   * destination's storage has settled.
   *
   * Local-cache plaintext is intentionally NOT populated here: the
   * destination's `get()` will fall through to OrbitDB and decrypt
   * fresh on first read. Populating cache with the ciphertext would
   * defeat the cache (it'd pretend to be plaintext and fail callers
   * with corrupted bytes).
   *
   * @param key   - Legacy key name (same shape as `set()`).
   * @param value - Base64-encoded encrypted bytes from `getEncryptedRaw`.
   */
  async setEncryptedRaw(key, value) {
    const translated = translateKey(key, this.addressId);
    if (translated.excluded) return;
    if (translated.cacheOnly) {
      throw new ProfileError(
        "PROFILE_NOT_INITIALIZED",
        `setEncryptedRaw refuses cache-only key "${redactProfileKey(translated.profileKey)}" \u2014 cache-only keys are not encrypted and must be replayed via set().`
      );
    }
    if (!this.dbConnected) {
      throw new ProfileError(
        "PROFILE_NOT_INITIALIZED",
        `setEncryptedRaw("${redactProfileKey(translated.profileKey)}") requires OrbitDB to be attached.`
      );
    }
    let bytes;
    try {
      bytes = Uint8Array.from(Buffer.from(value, "base64"));
    } catch (err) {
      throw new ProfileError(
        "PROFILE_NOT_INITIALIZED",
        `setEncryptedRaw: value is not valid base64: ${err instanceof Error ? err.message : String(err)}`,
        err
      );
    }
    await this.writeEnvelope(translated.profileKey, bytes, "cache_index");
  }
  // ===========================================================================
  // Private Helpers: Encryption
  // ===========================================================================
  /**
   * Encrypt a string value for OrbitDB storage.
   * If encryption is disabled, returns the raw UTF-8 bytes.
   */
  async encrypt(value) {
    if (!this.encryptionEnabled || !this.profileEncryptionKey) {
      return new TextEncoder().encode(value);
    }
    return encryptString(this.profileEncryptionKey, value);
  }
  /**
   * Decrypt bytes from OrbitDB to a string.
   * If encryption is disabled, decodes as raw UTF-8.
   */
  async decrypt(encrypted) {
    if (!this.encryptionEnabled || !this.profileEncryptionKey) {
      return new TextDecoder().decode(encrypted);
    }
    return decryptString(this.profileEncryptionKey, encrypted);
  }
  // ===========================================================================
  // Private Helpers: Logging
  // ===========================================================================
  log(...args) {
    if (this.debug) {
      console.debug("[ProfileStorage]", ...args);
    }
  }
};

// profile/profile-token-storage-provider.ts
init_logger();
init_errors3();

// types/txf.ts
var ARCHIVED_PREFIX = "archived-";
var FORKED_PREFIX = "_forked_";
var RESERVED_KEYS = ["_meta", "_nametag", "_nametags", "_tombstones", "_invalidatedNametags", "_outbox", "_mintOutbox", "_sent", "_invalid", "_integrity", "_history"];
function isTokenKey(key) {
  return key.startsWith("_") && !key.startsWith(ARCHIVED_PREFIX) && !key.startsWith(FORKED_PREFIX) && !RESERVED_KEYS.includes(key);
}
function isArchivedKey(key) {
  return key.startsWith(ARCHIVED_PREFIX);
}
function isForkedKey(key) {
  return key.startsWith(FORKED_PREFIX);
}

// profile/profile-token-storage-provider.ts
init_oplog_entry();
init_originated_tag();
init_encryption();
init_ipfs_client();

// profile/deriver.ts
function isArchivedKey2(key) {
  return isArchivedKey(key);
}
function isActiveTokenKey(key) {
  return isTokenKey(key);
}
function asMinimalToken(value) {
  if (value && typeof value === "object") {
    return value;
  }
  return null;
}
function lastTransaction(token) {
  const txs = token.transactions;
  if (!txs || txs.length === 0) return null;
  return txs[txs.length - 1];
}
function firstCoin(token) {
  const coinData = token.genesis?.data?.coinData;
  if (!coinData || coinData.length === 0) {
    return { coinId: "UNKNOWN", amount: "0" };
  }
  const [coinId, amount] = coinData[0];
  return { coinId: coinId ?? "UNKNOWN", amount: amount ?? "0" };
}
function currentStateHash(token) {
  const last = lastTransaction(token);
  if (last?.newStateHash) return last.newStateHash;
  return "";
}
function* iterateArchived(data) {
  for (const [key, value] of Object.entries(data)) {
    if (!isArchivedKey2(key)) continue;
    const token = asMinimalToken(value);
    if (!token) continue;
    yield [key, token];
  }
}
function* iterateActive(data) {
  for (const [key, value] of Object.entries(data)) {
    if (!isActiveTokenKey(key)) continue;
    const token = asMinimalToken(value);
    if (!token) continue;
    yield [key, token];
  }
}
function deriveTombstonesFromArchived(data, now = Date.now()) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const [, token] of iterateArchived(data)) {
    const tokenId = token.genesis?.data?.tokenId;
    if (!tokenId) continue;
    const stateHash = currentStateHash(token);
    if (!stateHash) continue;
    const key = `${tokenId}:${stateHash}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      tokenId,
      stateHash,
      timestamp: now
    });
  }
  return out;
}
function deriveSentFromArchived(data, now = Date.now()) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const [, token] of iterateArchived(data)) {
    const tokenId = token.genesis?.data?.tokenId;
    if (!tokenId) continue;
    const last = lastTransaction(token);
    const recipient = last?.data?.recipient ?? token.genesis?.data?.recipient ?? "unknown";
    const txHash = last?.inclusionProof?.transactionHash ?? "";
    if (seen.has(tokenId)) continue;
    seen.add(tokenId);
    out.push({
      tokenId,
      recipient,
      txHash,
      sentAt: now
    });
  }
  return out;
}
function deriveHistoryFromArchived(data, ourAddress, now = Date.now()) {
  const entries = [];
  const seenDedup = /* @__PURE__ */ new Set();
  let counter = 0;
  for (const [key, token] of iterateArchived(data)) {
    const tokenId = token.genesis?.data?.tokenId;
    if (!tokenId) continue;
    const { coinId, amount } = firstCoin(token);
    const last = lastTransaction(token);
    const recipient = last?.data?.recipient ?? token.genesis?.data?.recipient ?? void 0;
    const dedupKey = `SENT_derived_${key}`;
    if (seenDedup.has(dedupKey)) continue;
    seenDedup.add(dedupKey);
    entries.push({
      dedupKey,
      id: `derived-sent-${counter++}`,
      type: "SENT",
      amount,
      coinId,
      symbol: coinId,
      timestamp: now,
      tokenId,
      recipientAddress: recipient
    });
  }
  if (ourAddress) {
    for (const [key, token] of iterateActive(data)) {
      const tokenId = token.genesis?.data?.tokenId;
      if (!tokenId) continue;
      const genesisRecipient = token.genesis?.data?.recipient;
      if (genesisRecipient !== ourAddress && token.transactions?.length === 0) {
        continue;
      }
      const { coinId, amount } = firstCoin(token);
      const dedupKey = `RECEIVED_derived_${key}`;
      if (seenDedup.has(dedupKey)) continue;
      seenDedup.add(dedupKey);
      entries.push({
        dedupKey,
        id: `derived-recv-${counter++}`,
        type: "RECEIVED",
        amount,
        coinId,
        symbol: coinId,
        timestamp: now,
        tokenId
      });
    }
  }
  entries.sort((a, b) => b.timestamp - a.timestamp);
  return entries;
}

// profile/token-manifest.ts
function collectHeads(pkg, startHash) {
  const heads = /* @__PURE__ */ new Set();
  const seed = pkg.instanceChains.get(startHash);
  if (!seed) {
    heads.add(startHash);
    return heads;
  }
  const primaryTail = seed.chain[seed.chain.length - 1]?.hash;
  const uniqueEntries = /* @__PURE__ */ new Set();
  for (const entry of pkg.instanceChains.values()) {
    uniqueEntries.add(entry);
  }
  for (const entry of uniqueEntries) {
    const tail = entry.chain[entry.chain.length - 1]?.hash;
    if (tail === primaryTail) heads.add(entry.head);
  }
  if (heads.size === 0) heads.add(seed.head);
  return heads;
}
function classifyToken(heads, rootHash) {
  if (heads.size <= 1) {
    return { rootHash, status: "valid" };
  }
  const sorted = [...heads].sort();
  return {
    rootHash,
    status: "conflicting",
    conflictingHeads: sorted
  };
}
function deriveStructuralManifest(pkg) {
  const manifest = /* @__PURE__ */ new Map();
  const data = pkg.data;
  for (const tokenId of pkg.tokenIds()) {
    const rootHash = data.manifest.tokens.get(tokenId);
    if (!rootHash) continue;
    const heads = collectHeads(data, rootHash);
    manifest.set(tokenId, classifyToken(heads, rootHash));
  }
  return manifest;
}

// profile/profile-token-storage/bundle-index.ts
init_encryption();
init_oplog_entry();
var BUNDLE_KEY_PREFIX = "tokens.bundle.";
var CONSOLIDATION_WARNING_THRESHOLD = 3;
var CORRUPT_CIDS_PREVIEW_CAP = 100;
var BundleIndex = class {
  constructor(host) {
    this.host = host;
  }
  /**
   * List all bundle refs from OrbitDB, filtered to active status.
   */
  async listActiveBundles() {
    const allBundles = await this.listBundles();
    const active = /* @__PURE__ */ new Map();
    for (const [cid, ref] of allBundles) {
      if (ref.status === "active") {
        active.set(cid, ref);
      }
    }
    return active;
  }
  /**
   * List all bundle refs from OrbitDB (all statuses).
   *
   * Bundle refs are written as system-stamped envelopes by
   * `addBundle` (T-D11). Legacy wallets may have raw-bytes entries
   * (pre-envelope writes) — we detect those by attempting the
   * structured decode first, falling back to treating the stored
   * bytes as the encrypted payload directly. On the fallback path
   * the entry acts as a `v=0` legacy entry under the oplog-schema
   * contract (synthetic `originated='system'` at read time via the
   * adapter's legacy-wrapping).
   */
  async listBundles() {
    const rawEntries = await this.host.db.all(BUNDLE_KEY_PREFIX);
    const result = /* @__PURE__ */ new Map();
    const corruptCids = [];
    let firstCorruptError = null;
    const encryptionKey = this.host.getEncryptionKey();
    for (const [key, value] of rawEntries) {
      const cid = key.slice(BUNDLE_KEY_PREFIX.length);
      try {
        let encryptedPayload = value;
        try {
          const envelope = decodeEntry(value);
          if (envelope.v === 1) {
            encryptedPayload = envelope.payload;
          }
        } catch {
        }
        const decrypted = encryptionKey ? await decryptProfileValue(encryptionKey, encryptedPayload) : encryptedPayload;
        const ref = JSON.parse(new TextDecoder().decode(decrypted));
        result.set(cid, ref);
      } catch (err) {
        this.host.log(`Failed to deserialize bundle ref for ${cid}: ${err instanceof Error ? err.message : String(err)}`);
        corruptCids.push(cid);
        if (firstCorruptError === null) firstCorruptError = err;
      }
    }
    if (corruptCids.length > 0) {
      const ev = this.host.buildErrorEvent("storage:error", firstCorruptError, "CID_REF_CORRUPT");
      const truncated = corruptCids.length > CORRUPT_CIDS_PREVIEW_CAP;
      this.host.emitEvent({
        ...ev,
        data: {
          corruptCids: truncated ? corruptCids.slice(0, CORRUPT_CIDS_PREVIEW_CAP) : corruptCids,
          truncated,
          count: corruptCids.length
        }
      });
    }
    return result;
  }
  /**
   * Write a bundle ref to OrbitDB under a system-stamped envelope
   * (T-D11 W11). Bundle events are system-generated cache-index
   * writes; they are NOT user-actions (they reflect a token-pool
   * flush produced by the wallet itself, not a user intent to
   * commit tokens). Stamping `originated='system'` means peers
   * replicating the ref see it as a replicated system event after
   * the orbitdb-adapter's read-time downgrade, not a forged user
   * action.
   *
   * If the underlying adapter lacks `putEntry` (very old code paths
   * or test stubs), fall back to `db.put` of raw encrypted bytes —
   * readers auto-wrap raw writes as legacy entries (`v=0`, synthetic
   * `type='cache_index'`, `originated='system'`), so the semantic
   * outcome is identical and replication remains safe.
   */
  async addBundle(cid, ref) {
    const encryptionKey = this.host.getEncryptionKey();
    const serialized = new TextEncoder().encode(JSON.stringify(ref));
    const encryptedPayload = encryptionKey ? await encryptProfileValue(encryptionKey, serialized) : serialized;
    const key = BUNDLE_KEY_PREFIX + cid;
    const db = this.host.db;
    if (typeof db.putEntry === "function") {
      const envelope = buildLocalEntry({
        type: "cache_index",
        originated: "system",
        payload: encryptedPayload
      });
      await db.putEntry(key, envelope);
    } else {
      await db.put(key, encryptedPayload);
      const markHook = db.markLocallyAuthored;
      if (typeof markHook === "function") {
        markHook.call(db, key);
      }
    }
    this.host.getKnownBundleCids().add(cid);
    this.host.notifyProfileDirty();
  }
  /**
   * Check if the number of active bundles exceeds the consolidation
   * threshold.
   */
  async shouldConsolidate() {
    const active = await this.listActiveBundles();
    return active.size > CONSOLIDATION_WARNING_THRESHOLD;
  }
  /**
   * Refresh the local set of known bundle CIDs from OrbitDB.
   */
  async refreshKnownBundles() {
    const bundles = await this.listActiveBundles();
    this.host.setKnownBundleCids(new Set(bundles.keys()));
  }
  // ===========================================================================
  // Item #15 Phase B.6 — full-profile-snapshot sync API
  // ===========================================================================
  /**
   * Return every `tokens.bundle.*` entry as raw on-disk bytes for the
   * lean-snapshot builder. Bytes are returned verbatim — the envelope
   * wrapper, encrypted payload, and JSON-encoded UxfBundleRef stay
   * intact so the receiving peer can persist them with a single
   * `db.put` and let its own `listBundles()` decode them transparently.
   *
   * **No tombstones to surface.** Bundle refs do not get tombstoned in
   * the current architecture — superseded refs transition via the
   * `status: 'superseded'` field on a fresh `addBundle()` write, not via
   * a tombstone marker. Phase B's tombstone-sticky rules therefore
   * never fire here; the merge degenerates to "absent → write, live +
   * live → no-op (first wins at Lamport=0)".
   *
   * Stable order: ascending lexicographic key.
   */
  async snapshot() {
    let entries;
    try {
      entries = await this.host.db.all(BUNDLE_KEY_PREFIX);
    } catch {
      return [];
    }
    const out = [];
    const sortedKeys = [...entries.keys()].sort();
    for (const key of sortedKeys) {
      if (!key.startsWith(BUNDLE_KEY_PREFIX)) continue;
      const encryptedValue = entries.get(key);
      if (encryptedValue === void 0) continue;
      out.push({ key, encryptedValue });
    }
    return out;
  }
  /**
   * Apply a remote peer's bundle-index snapshot. Each remote entry
   * carries an envelope-wrapped, encrypted UxfBundleRef; the classifier
   * decodes + decrypts + parses + validates before the merge primitive
   * picks a winner.
   *
   * **Constant-Lamport semantics.** UxfBundleRef does not carry a
   * Lamport field, so `live + live` ties always favour local (the
   * first-wins behaviour matches Issue #166's refuse-write guard
   * semantics extended to this surface). If two replicas independently
   * transition the same CID from `active` to `superseded` after a
   * consolidation, both writes are observationally idempotent (the
   * resulting state is the same — superseded with the same
   * `supersededBy`).
   *
   * **Side-effect: known-CID refresh.** After a successful JOIN that
   * lands new bundles, this writer updates `knownBundleCids` so the
   * consolidation gate and replication handler observe the freshly-
   * landed refs.
   */
  async joinSnapshot(remote) {
    const result = await runJoinSnapshot(remote, {
      classifyLocal: async (key) => {
        if (!key.startsWith(BUNDLE_KEY_PREFIX)) return { kind: "absent" };
        let raw2;
        try {
          raw2 = await this.host.db.get(key);
        } catch {
          return { kind: "absent" };
        }
        if (raw2 === null) return { kind: "absent" };
        const slot = await this.classifyBundleBytes(
          raw2,
          /* remote = */
          false
        );
        return slot ?? { kind: "absent" };
      },
      classifyRemote: async (entry) => {
        if (!entry.key.startsWith(BUNDLE_KEY_PREFIX)) return null;
        return this.classifyBundleBytes(
          entry.encryptedValue,
          /* remote = */
          true
        );
      },
      writeRemote: async (key, bytes) => {
        const db = this.host.db;
        if (typeof db.putEntry === "function") {
          const envelope = buildLocalEntry({
            type: "cache_index",
            originated: "system",
            payload: bytes
          });
          await db.putEntry(key, envelope);
        } else {
          await db.put(key, bytes);
          const markHook = db.markLocallyAuthored;
          if (typeof markHook === "function") {
            markHook.call(db, key);
          }
        }
        const cid = key.slice(BUNDLE_KEY_PREFIX.length);
        if (cid.length > 0) {
          this.host.getKnownBundleCids().add(cid);
        }
      }
    });
    if (result.liveLanded > 0 || result.tombstonesLanded > 0) {
      this.host.notifyProfileDirty();
    }
    return result;
  }
  /**
   * Decode an envelope (if present), decrypt the inner payload, parse
   * as JSON, and validate the shape is a `UxfBundleRef`. Returns a
   * {@link ClassifiedSlot} on success or `null` on the remote path
   * for any failure (the JOIN counts as `remoteRejectedMalformed`).
   * On the local path, failure maps to `absent` so a well-formed
   * remote can land.
   *
   * UxfBundleRef shape (per `profile/types.ts`):
   *   - required: cid:string, status: 'active'|'superseded'|'unverified', createdAt:number
   *   - optional: device, supersededBy, removeFromProfileAfter, tokenCount
   */
  async classifyBundleBytes(raw2, remote) {
    if (!raw2 || raw2.byteLength === 0) {
      return remote ? null : { kind: "absent" };
    }
    let encryptedPayload = raw2;
    try {
      const envelope = decodeEntry(raw2);
      if (envelope.v === 1) {
        encryptedPayload = envelope.payload;
      }
    } catch {
    }
    const encryptionKey = this.host.getEncryptionKey();
    let decrypted;
    try {
      decrypted = encryptionKey ? await decryptProfileValue(encryptionKey, encryptedPayload) : encryptedPayload;
    } catch {
      return remote ? null : { kind: "absent" };
    }
    let parsed;
    try {
      parsed = JSON.parse(new TextDecoder().decode(decrypted));
    } catch {
      return remote ? null : { kind: "absent" };
    }
    if (!isUxfBundleRef(parsed)) {
      return remote ? null : { kind: "absent" };
    }
    return { kind: "live", lamport: 0 };
  }
};
function isUxfBundleRef(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const obj = value;
  if (typeof obj.cid !== "string" || obj.cid.length === 0) return false;
  if (obj.status !== "active" && obj.status !== "superseded" && obj.status !== "unverified") {
    return false;
  }
  if (typeof obj.createdAt !== "number" || !Number.isFinite(obj.createdAt)) return false;
  if (obj.device !== void 0 && typeof obj.device !== "string") return false;
  if (obj.supersededBy !== void 0 && typeof obj.supersededBy !== "string") return false;
  if (obj.removeFromProfileAfter !== void 0 && typeof obj.removeFromProfileAfter !== "number") {
    return false;
  }
  if (obj.tokenCount !== void 0 && typeof obj.tokenCount !== "number") return false;
  return true;
}

// profile/profile-token-storage/flush-scheduler.ts
init_ipfs_client();
init_transfer_payload();
var POINTER_MONOTONICITY_VIOLATION = "POINTER_MONOTONICITY_VIOLATION";
var FlushScheduler = class {
  constructor(host, bundleIndex) {
    this.host = host;
    this.bundleIndex = bundleIndex;
  }
  /**
   * Set when `scheduleFlushNoData()` arms a flush in the absence of
   * pending local data. The flush body reads this flag to decide
   * whether to source the CAR from `lastLoadedData` (merged
   * post-load state) instead of `pendingData`. The flag is cleared
   * inside `flushToIpfs()` after the snapshot is captured (analogous
   * to how `pendingData` is cleared after capture).
   */
  noDataFlushPending = false;
  /**
   * Issue #268 — in-memory dedup for background consolidation tasks.
   *
   * `flushToIpfs` triggers consolidation when bundle count exceeds
   * `CONSOLIDATION_THRESHOLD` (3). Without this flag a burst of N
   * rapid flushes (e.g. faucet topup delivering 6 tokens in quick
   * succession) would each spawn its own fire-and-forget consolidate
   * coroutine. The engine's `isConsolidationInProgress` cross-device
   * check would catch most of them, but only after each pays the
   * cost of one OrbitDB read. This in-process flag short-circuits
   * the spawn entirely, ensuring exactly one consolidation runs at a
   * time per provider instance. Cleared in the `finally` of the
   * fire-and-forget IIFE so the next eligible flush can spawn one.
   */
  consolidationInFlight = null;
  /**
   * Arm (or re-arm) the debounce timer. Subsequent `save()` calls
   * within the debounce window coalesce into a single flush.
   */
  scheduleFlush() {
    if (this.host.getIsShuttingDown()) return;
    const existing = this.host.getFlushTimer();
    if (existing !== null) {
      clearTimeout(existing);
    }
    const timer = setTimeout(() => {
      this.host.setFlushTimer(null);
      this.startSerializedFlush("save");
    }, this.host.flushDebounceMs);
    this.host.setFlushTimer(timer);
  }
  /**
   * Arm a flush in the absence of pending local data. Used by
   * `handleReplication()` to anchor our own pointer at the merged
   * post-load state when remote bundles arrive via OrbitDB pubsub.
   *
   * If a normal `scheduleFlush()` is already armed (or about to be —
   * the debounce timer is non-null), this just sets the flag and
   * lets the existing timer fire; the flush body will read the flag
   * and source from `lastLoadedData`.
   *
   * If no timer is armed, this arms one identical to `scheduleFlush()`.
   */
  scheduleFlushNoData() {
    if (this.host.getIsShuttingDown()) return;
    this.noDataFlushPending = true;
    if (this.host.getFlushTimer() !== null) return;
    const timer = setTimeout(() => {
      this.host.setFlushTimer(null);
      this.startSerializedFlush("no-data");
    }, this.host.flushDebounceMs);
    this.host.setFlushTimer(timer);
  }
  /**
   * Wrap a `flushToIpfs()` call in the chain barrier + identity-checked
   * finally clear that scheduleFlush() and scheduleFlushNoData() both
   * need.
   *
   * # Why serialize flushes (PR #127 follow-up — partial-CAR race fix)
   *
   * Without serialization, two `flushToIpfs()` calls can run in parallel
   * — the older one captures `pendingData_1`, the newer captures
   * `pendingData_2`, and both proceed to pinning + publish. The
   * aggregator's per-wallet publish mutex serializes the publishes in
   * mutex-acquisition order, NOT capture order. A slower-pinning OLDER
   * flush can publish AFTER a faster-pinning NEWER flush, putting the
   * older (partial) CAR behind the higher pointer version. A remote
   * device joining via `recoverLatest()` then walks to that higher
   * version, fetches the partial CAR, and silently misses tokens that
   * lived only in the newer save.
   *
   * Mode-A's monotonicity assertion (b5d347e) is defense-in-depth, but
   * does NOT cover the inversion: it reads `lastLoadedData` BEFORE pin
   * + publish, so at check-time the older flush's view of
   * `lastLoadedData` is still the older state — the check passes — and
   * by the time the older flush actually publishes, the newer flush
   * has already overtaken it on the aggregator.
   *
   * Serializing flushes guarantees publish order matches save order:
   * older save → older flush → older publish → smaller version. Newer
   * save → newer flush → newer publish → larger version with a CAR
   * that is byte-for-byte at-least-as-recent as anything below. The
   * latest pointer is always the freshest CAR; intermediate versions
   * remain partial by design (each save → snapshot of that point in
   * time), which is fine — `recoverLatest()` always walks to the top.
   *
   * # Mechanics
   *
   * - `previous = getFlushPromise() ?? Promise.resolve()` reads the
   *   current in-flight flush as the chain anchor. If no flush is in
   *   flight, the chain starts immediately.
   * - `previous.catch(() => {})` swallows the prior flush's rejection
   *   so a single failure does not stall every queued flush. Errors
   *   are still surfaced — each flush has its own catch arm below.
   * - `.then(() => this.flushToIpfs())` is what enforces ordering: the
   *   new flush only starts after the previous chain settles.
   * - The boxed `.finally` identity check prevents an older flush's
   *   completion handler from clobbering the host's `flushPromise`
   *   when a newer flush has already replaced it (Steelman³⁸).
   *   Steelman⁴⁶ is preserved: `flushBox.ref` is assigned synchronously
   *   after the chain is built and BEFORE the `.finally` microtask can
   *   run.
   */
  startSerializedFlush(mode) {
    this.startSerializedFlushInternal(
      mode,
      /* propagateError */
      false
    );
  }
  /**
   * Public wrapper around the same serialized-flush chain. Returns the
   * chained flush promise so a caller (e.g. PaymentsModule's at-least-
   * once gate) can `await` it AND see any error thrown by the underlying
   * flush body (POINTER_MONOTONICITY_VIOLATION, IPFS pin failure, etc.).
   *
   * Differs from the timer-driven `startSerializedFlush` callsite only in
   * that:
   *   - the returned promise rejects on flush error rather than just
   *     logging — letting the caller decide whether to retry or refuse
   *     to ack;
   *   - the per-flush `storage:error` event is still emitted (same
   *     side effects).
   *
   * Serializes through `host.flushPromise` so concurrent callers
   * compose into the same chain — preventing the BUNDLE-SET-CHECK
   * race where parallel flushes both pass the monotonicity check (each
   * sees the OTHER's about-to-pin CID as unknown).
   */
  forceFlushSerialized() {
    return this.startSerializedFlushInternal(
      "save",
      /* propagateError */
      true
    );
  }
  startSerializedFlushInternal(mode, propagateError) {
    const previous = this.host.getFlushPromise() ?? Promise.resolve();
    const flushBox = { ref: null };
    const myFlush = previous.catch(() => {
    }).then(() => this.flushToIpfs()).catch((err) => {
      const prefix = mode === "no-data" ? "Flush (no-data) failed" : "Flush failed";
      this.host.log(`${prefix}: ${err instanceof Error ? err.message : String(err)}`);
      this.host.emitEvent(this.host.buildErrorEvent("storage:error", err));
      if (propagateError) {
        throw err;
      }
    }).finally(() => {
      if (this.host.getFlushPromise() === flushBox.ref) {
        this.host.setFlushPromise(null);
      }
    });
    flushBox.ref = myFlush;
    this.host.setFlushPromise(myFlush);
    return myFlush;
  }
  /**
   * Run a single flush of the pending data: extract tokens and
   * operational state, build a UXF package, pin the CAR, write the
   * bundle ref, persist operational state, and publish the CID to the
   * aggregator pointer layer.
   *
   * No-data flush mode (Fix 2 of cross-device sync): if `pendingData`
   * is null but `noDataFlushPending` is set, source the CAR from
   * `lastLoadedData` (the merged post-load state). Skip pin + publish
   * if the resulting CID equals `lastDiscoveredPointerCid` (the
   * authoritative pointer already anchored this exact bytes — e.g.,
   * the remote originator already published while we were merging).
   */
  async flushToIpfs() {
    const encryptionKey = this.host.getEncryptionKey();
    if (!encryptionKey) return;
    const noDataMode = this.noDataFlushPending;
    this.noDataFlushPending = false;
    let data = this.host.getPendingData();
    if (!data && noDataMode) {
      const merged = this.host.getLastLoadedData();
      if (!merged) {
        this.host.log(
          "Flush (no-data): no lastLoadedData to anchor, skipping"
        );
        return;
      }
      data = merged;
    }
    if (!data) return;
    if (this.host.getPendingData() === data) {
      this.host.setPendingData(null);
    }
    try {
      let tokens = this.host.extractTokensFromTxfData(data);
      const opState = this.host.extractOperationalState(data);
      const { UxfPackage: UxfPackage2 } = await Promise.resolve().then(() => (init_UxfPackage(), UxfPackage_exports));
      const pkg = UxfPackage2.create();
      let tokenValues = [...tokens.values()];
      if (tokenValues.length > 0) {
        pkg.ingestAll(tokenValues);
      }
      const tokenCoinIds = tokenValues.map((t) => {
        const tok = t;
        const c = tok.genesis?.data?.coinData ?? tok.coinData;
        if (!c || c.length === 0) return "\u2205";
        return String(c[0]?.[0] ?? "").slice(-6);
      }).sort();
      const counts = {};
      for (const id of tokenCoinIds) counts[id] = (counts[id] ?? 0) + 1;
      const histogram = Object.entries(counts).map(([id, n]) => `${id}\xD7${n}`).sort().join(" ");
      this.host.log(
        `flushToIpfs: ${tokenValues.length} tokens {${histogram}} noDataMode=${noDataMode}`
      );
      let carBytes = await pkg.toCar();
      if (noDataMode) {
        const projectedCid = await extractCarRootCid2(carBytes);
        const knownDiscovered = this.host.getLastDiscoveredPointerCid();
        if (knownDiscovered === projectedCid) {
          this.host.log(
            `Flush (no-data) short-circuit: merged-state CID ${projectedCid} equals authoritative pointer; skipping pin + publish`
          );
          return;
        }
        try {
          const activeBundles = await this.bundleIndex.listActiveBundles();
          if (activeBundles.has(projectedCid)) {
            this.host.log(
              `Flush (no-data) short-circuit: merged-state CID ${projectedCid} already in OrbitDB bundle index; skipping pin + publish`
            );
            return;
          }
        } catch {
        }
      }
      const previousData = this.host.getLastLoadedData();
      const tokenMissing = [];
      if (previousData && previousData !== data) {
        const previousTokens = this.host.extractTokensFromTxfData(previousData);
        const stripKeyPrefix = (k) => {
          if (k.startsWith("archived-")) return k.substring("archived-".length);
          if (k.startsWith("_forked_")) {
            const rest = k.substring("_forked_".length);
            const sep = rest.indexOf("_");
            return sep === -1 ? rest : rest.substring(0, sep);
          }
          if (k.startsWith("_")) return k.substring(1);
          return k;
        };
        const currentTokenIds = /* @__PURE__ */ new Set();
        for (const k of tokens.keys()) currentTokenIds.add(stripKeyPrefix(k));
        const tombstoneTokenIds = /* @__PURE__ */ new Set();
        for (const t of opState.tombstones ?? []) {
          if (t && typeof t.tokenId === "string") {
            tombstoneTokenIds.add(t.tokenId);
          }
        }
        for (const key of previousTokens.keys()) {
          if (tokens.has(key)) continue;
          const id = stripKeyPrefix(key);
          if (currentTokenIds.has(id)) continue;
          if (tombstoneTokenIds.has(id)) continue;
          tokenMissing.push(key);
        }
      }
      const loadedBundleCids = this.host.getLastLoadedFromBundleCids();
      let unknownBundleCids = [];
      if (loadedBundleCids !== null) {
        try {
          const activeBundles = await this.bundleIndex.listActiveBundles();
          for (const cid2 of activeBundles.keys()) {
            if (!loadedBundleCids.has(cid2)) {
              unknownBundleCids.push(cid2);
            }
          }
        } catch (err) {
          this.host.log(
            `Pointer monotonicity bundle-set check skipped (listActiveBundles failed): ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
      if (unknownBundleCids.length > 0) {
        const mergedCids = [];
        const stillUnknown = [];
        for (const cid2 of unknownBundleCids) {
          try {
            const foreignCarBytes = await fetchCarFromIpfs(
              this.host.ipfsGateways,
              cid2,
              void 0,
              void 0,
              this.host.getHelia()
            );
            const foreignPkg = await UxfPackage2.fromCar(foreignCarBytes);
            pkg.merge(foreignPkg);
            mergedCids.push(cid2);
            if (loadedBundleCids !== null) {
              loadedBundleCids.add(cid2);
            }
          } catch (err) {
            stillUnknown.push(cid2);
            this.host.log(
              `In-place merge failed for unknown bundle ${cid2} (falling back to violation throw): ${err instanceof Error ? err.message : String(err)}`
            );
          }
        }
        if (mergedCids.length > 0) {
          tokens = pkg.assembleAll();
          tokenValues = [...tokens.values()];
          carBytes = await pkg.toCar();
          this.host.log(
            `In-place monotonicity recovery: merged ${mergedCids.length} foreign bundle(s) into in-flight CAR (${mergedCids.slice(0, 5).join(", ")}${mergedCids.length > 5 ? ", ..." : ""}) \u2014 pkg now has ${tokens.size} token(s)`
          );
        }
        unknownBundleCids = stillUnknown;
      }
      if (tokenMissing.length > 0 || unknownBundleCids.length > 0) {
        const reasonParts = [];
        if (tokenMissing.length > 0) {
          reasonParts.push(
            `would drop ${tokenMissing.length} token(s) from baseline (${tokenMissing.slice(0, 10).join(", ")}${tokenMissing.length > 10 ? ", ..." : ""})`
          );
        }
        if (unknownBundleCids.length > 0) {
          reasonParts.push(
            `${unknownBundleCids.length} unknown bundle(s) in OrbitDB not in baseline (${unknownBundleCids.slice(0, 5).join(", ")}${unknownBundleCids.length > 5 ? ", ..." : ""})`
          );
        }
        const violation = new Error(
          `Pointer monotonicity violation: ${reasonParts.join("; ")}. Aborting publish to prevent silent token loss across cross-device sync.`
        );
        violation.code = POINTER_MONOTONICITY_VIOLATION;
        this.host.log(`[POINTER_MONOTONICITY_VIOLATION] aborting publish: ${reasonParts.join("; ")}`);
        queueMicrotask(() => {
          this.host.refreshBaselineForMonotonicity().catch((err) => {
            this.host.log(
              `Baseline-refresh recovery threw (best-effort): ${err instanceof Error ? err.message : String(err)}`
            );
          });
        });
        this.host.emitEvent(
          this.host.buildErrorEvent(
            "storage:error",
            violation,
            POINTER_MONOTONICITY_VIOLATION
          )
        );
        this.host.emitEvent({
          type: "storage:error",
          timestamp: Date.now(),
          code: POINTER_MONOTONICITY_VIOLATION,
          error: violation.message,
          data: {
            alert: "transfer:operator-alert",
            missingTokenIds: tokenMissing.slice(0, 100),
            missingTokenCount: tokenMissing.length,
            unknownBundleCids: unknownBundleCids.slice(0, 100),
            unknownBundleCount: unknownBundleCids.length,
            truncated: tokenMissing.length > 100 || unknownBundleCids.length > 100
          }
        });
        throw violation;
      }
      let cid;
      const cachedCid = this.host.getLastPinnedCid();
      let useCachedCid = cachedCid !== null;
      if (useCachedCid && cachedCid !== null) {
        try {
          const activeBundles = await this.bundleIndex.listActiveBundles();
          if (!activeBundles.has(cachedCid)) {
            useCachedCid = false;
            this.host.setLastPinnedCid(null);
          }
        } catch {
        }
      }
      const cachedCidNow = this.host.getLastPinnedCid();
      if (useCachedCid && cachedCidNow) {
        cid = cachedCidNow;
      } else {
        const expectedRootCid = await extractCarRootCid2(carBytes);
        cid = await pinCarBlocksToIpfs(
          this.host.ipfsGateways,
          carBytes,
          expectedRootCid,
          void 0,
          this.host.getHelia()
        );
        this.host.setLastPinnedCid(cid);
      }
      const bundleRef = {
        cid,
        status: "active",
        createdAt: Math.floor(Date.now() / 1e3),
        tokenCount: tokens.size
      };
      await this.bundleIndex.addBundle(cid, bundleRef);
      this.host.setLastPinnedBundleCid(cid);
      const loadedBundleCidsForUpdate = this.host.getLastLoadedFromBundleCids();
      if (loadedBundleCidsForUpdate !== null) {
        loadedBundleCidsForUpdate.add(cid);
      }
      await this.host.writeOrbitOperationalState(opState);
      const derivedOk = await this.host.writeLocalDerivedCache(opState);
      if (!derivedOk) {
        this.host.log(`Derived-cache write failed; next load will rebuild from pool`);
      }
      this.host.setLastPinnedCid(null);
      if (this.host.getIsShuttingDown()) {
        this.host.log("Consolidation skipped: shutdown in progress");
      } else if (this.consolidationInFlight !== null) {
        this.host.log(
          "Consolidation skipped: background task already running on this instance"
        );
      } else if (await this.bundleIndex.shouldConsolidate()) {
        this.consolidationInFlight = (async () => {
          try {
            const { ConsolidationEngine: ConsolidationEngine2 } = await Promise.resolve().then(() => (init_consolidation(), consolidation_exports));
            const engine = new ConsolidationEngine2(
              this.host.db,
              encryptionKey,
              this.host.ipfsGateways
            );
            if (await engine.isConsolidationInProgress()) {
              this.host.log(
                "Consolidation skipped: another device is in progress"
              );
              return;
            }
            if (this.host.getIsShuttingDown()) {
              this.host.log(
                "Consolidation skipped: shutdown started before background spawn"
              );
              return;
            }
            const result = await engine.consolidate();
            if (result.consolidated) {
              this.host.log(
                `Consolidation: merged ${result.sourceBundleCount} bundles \u2192 ${result.consolidatedCid ?? "n/a"} (background)`
              );
            } else {
              this.host.log("Consolidation skipped (engine no-op)");
            }
          } catch (err) {
            this.host.log(
              `Consolidation failed (non-fatal, background): ${err instanceof Error ? err.message : String(err)}`
            );
          } finally {
            this.consolidationInFlight = null;
          }
        })();
      }
      let publishResult = null;
      let publishThrew = void 0;
      try {
        publishResult = await this.host.publishSnapshotIfWired();
      } catch (err) {
        publishThrew = err;
      }
      this.host.emitEvent({
        type: "storage:saved",
        timestamp: Date.now(),
        data: { cid, tokenCount: tokens.size }
      });
      if (publishThrew !== void 0) {
        throw publishThrew;
      }
      if (publishResult && !publishResult.ok && publishResult.transient) {
        this.host.emitEvent({
          type: "storage:pending-publish",
          timestamp: Date.now(),
          data: { cid, code: publishResult.code }
        });
      }
      const verifyDeadlineMs = this.host.options?.flushVerificationDeadlineMs ?? 0;
      const pointerWired = this.host.options?.getPointerLayer?.() ?? null;
      const shouldVerify = verifyDeadlineMs > 0 && !this.host.getIsShuttingDown() && pointerWired !== null;
      if (shouldVerify) {
        const freshSnapshotPublished = publishResult !== null && publishResult.ok;
        const snapshotCid = freshSnapshotPublished ? this.host.getLastDiscoveredPointerCid() : null;
        await this.host.verifyFlushDurability(cid, snapshotCid, verifyDeadlineMs);
      }
    } catch (err) {
      if (!this.host.getPendingData()) {
        this.host.setPendingData(data);
      }
      throw err;
    }
  }
  /**
   * Update the pending-data buffer and arm the debounce timer. Called
   * by the facade's `save()` after validation. The buffer cache (and
   * `lastLoadedData`) bookkeeping happens on the facade so byte-
   * identical fields stay in their original location.
   */
  enqueueSave(data) {
    this.host.setLastPinnedCid(null);
    this.host.setPendingData(data);
    this.scheduleFlush();
  }
};

// profile/profile-token-storage/history-store.ts
var HistoryStore = class {
  constructor(host) {
    this.host = host;
  }
  async addHistoryEntry(entry) {
    const entries = await this.getHistoryEntries();
    const existingIdx = entries.findIndex((e) => e.dedupKey === entry.dedupKey);
    if (existingIdx >= 0) {
      entries[existingIdx] = entry;
    } else {
      entries.push(entry);
    }
    entries.sort((a, b) => b.timestamp - a.timestamp);
    await this.host.writeProfileKey(
      `${this.host.getAddressId()}.transactionHistory`,
      JSON.stringify(entries)
    );
  }
  async getHistoryEntries() {
    const raw2 = await this.host.readProfileKey(
      `${this.host.getAddressId()}.transactionHistory`
    );
    if (!raw2) return [];
    try {
      const parsed = JSON.parse(raw2);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  async hasHistoryEntry(dedupKey) {
    const entries = await this.getHistoryEntries();
    return entries.some((e) => e.dedupKey === dedupKey);
  }
  async clearHistory() {
    try {
      await this.host.db.del(`${this.host.getAddressId()}.transactionHistory`);
    } catch {
    }
  }
  async importHistoryEntries(entries) {
    const existing = await this.getHistoryEntries();
    const existingKeys = new Set(existing.map((e) => e.dedupKey));
    let imported = 0;
    for (const entry of entries) {
      if (!existingKeys.has(entry.dedupKey)) {
        existing.push(entry);
        existingKeys.add(entry.dedupKey);
        imported++;
      }
    }
    if (imported > 0) {
      existing.sort((a, b) => b.timestamp - a.timestamp);
      await this.host.writeProfileKey(
        `${this.host.getAddressId()}.transactionHistory`,
        JSON.stringify(existing)
      );
    }
    return imported;
  }
};

// profile/profile-token-storage/lifecycle-manager.ts
init_hex();
init_encryption();
import { CID as CID8 } from "multiformats/cid";
init_logger();
init_ipfs_client();
var PERMANENT_POINTER_ERROR_CODES = /* @__PURE__ */ new Set([
  "AGGREGATOR_POINTER_UNREACHABLE_RECOVERY_BLOCKED",
  "AGGREGATOR_POINTER_REJECTED",
  "AGGREGATOR_POINTER_UNTRUSTED_PROOF",
  "AGGREGATOR_POINTER_TRUST_BASE_STALE",
  "AGGREGATOR_POINTER_MARKER_CORRUPT",
  "AGGREGATOR_POINTER_CORRUPT_STREAK",
  "AGGREGATOR_POINTER_AGGREGATOR_REJECTED",
  "SECURITY_ORIGIN_MISMATCH",
  "AGGREGATOR_POINTER_CAPABILITY_DENIED",
  "AGGREGATOR_POINTER_UNSUPPORTED_RUNTIME",
  "AGGREGATOR_POINTER_PROTOCOL_ERROR"
]);
var POINTER_POLL_MIN_MS = 3e4;
var POINTER_POLL_RANGE_MS = 6e4;
var POINTER_POLL_BACKOFF_MULTIPLIER = 5;
var SHUTDOWN_VERIFICATION_DEFAULT_DEADLINE_MS = 0;
var POINTER_READBACK_POLL_MS = 500;
var PENDING_PUBLISH_RETRY_INTERVAL_MS = 1e3;
var WALKBACK_FLOOR_RETRY_THROTTLE_MS = 6e4;
var WALKBACK_FLOOR_CODE = "AGGREGATOR_POINTER_WALKBACK_FLOOR";
var LifecycleManager = class {
  constructor(host, bundleIndex) {
    this.host = host;
    this.bundleIndex = bundleIndex;
  }
  /**
   * Periodic-poll timer for Path 2 (aggregator pointer recovery).
   * Owned by this module — does NOT live on the host because it is
   * private to the polling mechanism (no other seam reads or mutates
   * it). Set by `schedulePointerPoll()`, cleared by `shutdown()`.
   */
  pointerPollTimer = null;
  /**
   * Issue #245 #3 — wall-clock deadline (ms epoch) until which a
   * publish attempt should short-circuit because a recent attempt
   * hit `AGGREGATOR_POINTER_WALKBACK_FLOOR`. Zero when no throttle is
   * active. Cleared on:
   *   - any successful publish (lag has cleared)
   *   - a transient failure with a DIFFERENT code (the prior
   *     WALKBACK_FLOOR diagnosis no longer applies — different fault
   *     class, the inner retry budget is the right tool)
   * See `WALKBACK_FLOOR_RETRY_THROTTLE_MS` for rationale.
   */
  walkbackFloorThrottleUntilMs = 0;
  /**
   * Issue #245 #3 — number of throttled-skip events accumulated
   * during the active throttle window. Logged at the END (next
   * non-throttled outcome) so a single summary replaces the storm.
   */
  walkbackFloorThrottleSkipCount = 0;
  /**
   * Issue #247 — in-flight coalescing flag for
   * `publishAggregatorPointerBestEffort`.
   *
   * The PR #245 throttle (`walkbackFloorThrottleUntilMs`) only stops
   * SEQUENTIAL bursts: it's set in the catch arm AFTER
   * `pointer.publish()` resolves. Concurrent callers all pass the
   * entry check before any catch arm fires, all proceed to call
   * `pointer.publish()`, all fail, all 6+ print the same WARN line —
   * the storm PR #245 was supposed to suppress, reduced from
   * "hundreds" to "6 per cycle".
   *
   * The realistic concurrent callers in one process:
   *   - `flushScheduler.flushToIpfs` → `publishSnapshotIfWired`.
   *   - debounced `dispatchDirtyFlush` timer.
   *   - `retryPendingPublishIfAny` called from `runPointerPollOnce`.
   *
   * This field coalesces them: if a publish is in flight when a new
   * caller arrives, the new caller awaits and returns the in-flight
   * result instead of starting a parallel publish. Same shape as the
   * throttle entry check (returns `{ok, transient, code?}`); same
   * pendingPublishCid stamping semantics; same idempotency contract.
   *
   * Cleared in `finally` so a subsequent call after the in-flight
   * publish resolves starts a fresh attempt (or hits the throttle if
   * the prior publish armed it).
   */
  walkbackPublishInFlight = null;
  /**
   * Poll-discovery handler captured from `initialize()`. Invoked by
   * {@link runPointerPollOnce} after it adds a poll-discovered CID to
   * the bundle index — drives the necessary load() + scheduleFlushNoData
   * to keep `lastLoadedFromBundleCids` in sync with OrbitDB. Without it,
   * the periodic poll adds CIDs to OrbitDB but never loads them, and
   * subsequent save-driven flushes abort with
   * POINTER_MONOTONICITY_VIOLATION (correctly preventing silent token
   * loss, but causing the at-least-once gate to refuse every Nostr ack).
   *
   * Distinct from the pubsub-driven `replicationHandler` (closure
   * captured at line ~186) because the pubsub handler has its own
   * "did we observe anything new" diff check and snapshot ordering
   * that aren't applicable here (the poll already confirmed the CID
   * is new before invoking this callback).
   *
   * Set in `initialize()`; cleared (set to null) in `shutdown()`.
   */
  onPollDiscoveredNewCid = null;
  setIdentity(identity) {
    this.host.setIdentityState(identity);
    if (!this.host.getEncryptionKey()) {
      try {
        const privKeyBytes = hexToBytes(identity.privateKey);
        this.host.setEncryptionKey(deriveProfileEncryptionKey(privKeyBytes));
      } catch (err) {
        this.host.log(
          `Failed to derive encryption key: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
    if (identity.directAddress) {
      this.host.setComputedAddressId(computeAddressId(identity.directAddress));
    }
  }
  async initialize(replicationHandler, onPollDiscoveredNewCid) {
    this.onPollDiscoveredNewCid = onPollDiscoveredNewCid ?? null;
    if (this.host.getInitialized()) return true;
    if (!this.host.getIdentity()) {
      this.host.log("Cannot initialize: no identity set");
      return false;
    }
    this.host.setStatus("connecting");
    try {
      if (!this.host.db.isConnected()) {
        this.host.log("OrbitDB not connected; skipping bundle load until connected");
        this.host.setStatus("connected");
        this.host.setInitialized(true);
        return true;
      }
      await this.bundleIndex.refreshKnownBundles();
      if (this.host.getKnownBundleCids().size === 0) {
        const pointerRecovered = await this.recoverFromAggregatorPointerBestEffort();
        if (!pointerRecovered) {
          await this.runLegacyIpnsMigrationBestEffort();
        }
      }
      const unsub = this.host.db.onReplication(() => {
        replicationHandler().catch((err) => {
          this.host.log(`Replication handler error: ${err instanceof Error ? err.message : String(err)}`);
        });
      });
      this.host.setReplicationUnsub(unsub);
      this.host.setStatus("connected");
      this.host.setInitialized(true);
      this.host.log(`Initialized with ${this.host.getKnownBundleCids().size} known bundle(s)`);
      this.schedulePointerPoll();
      return true;
    } catch (err) {
      this.host.setStatus("error");
      this.host.log(`Initialization failed: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }
  async shutdown(options) {
    if (this.host.getIsShuttingDown()) return;
    this.host.setIsShuttingDown(true);
    if (this.pointerPollTimer !== null) {
      clearTimeout(this.pointerPollTimer);
      this.pointerPollTimer = null;
    }
    const timer = this.host.getFlushTimer();
    if (timer !== null) {
      clearTimeout(timer);
      this.host.setFlushTimer(null);
    }
    const inflight = this.host.getFlushPromise();
    if (inflight) {
      try {
        await inflight;
      } catch {
      }
    }
    if (this.host.getPendingData()) {
      try {
        await this.host.flushToIpfs();
      } catch (err) {
        this.host.log(`Shutdown flush failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    const gateDeadlineMs = options?.verificationDeadlineMs ?? SHUTDOWN_VERIFICATION_DEFAULT_DEADLINE_MS;
    if (!options?.force && gateDeadlineMs > 0) {
      try {
        await this.awaitRemoteDurability({
          deadlineMs: gateDeadlineMs,
          reason: options?.reason
        });
      } catch (err) {
        this.host.log(
          `Shutdown durability gate threw unexpectedly (continuing teardown): ${err instanceof Error ? err.message : String(err)}`
        );
      }
    } else {
      const lastSnapshot = this.host.getLastDiscoveredPointerCid();
      if (lastSnapshot && !this.host.getPendingPublishCid()) {
        this.host.setPendingPublishCid(lastSnapshot);
        this.host.log(
          `Shutdown (force): stamped pending-publish marker for cold-start retry: cid=${lastSnapshot}` + (options?.reason ? ` reason=${options.reason}` : "")
        );
      }
    }
    const unsub = this.host.getReplicationUnsub();
    if (unsub) {
      unsub();
      this.host.setReplicationUnsub(null);
    }
    this.host.setLastLoadedData(null);
    this.host.setLastLoadedFromBundleCids(null);
    this.host.setLastTokenManifest(null);
    this.onPollDiscoveredNewCid = null;
    this.host.setInitialized(false);
    this.host.setStatus("disconnected");
    this.host.setIsShuttingDown(false);
  }
  // ===========================================================================
  // Issue #239 — Remote-durability shutdown gate
  // ===========================================================================
  /**
   * Issue #239 — block until the prior process's pins + publishes are
   * verifiably durable on remote infrastructure, OR the deadline
   * elapses.
   *
   * Three legs run concurrently inside a shared deadline:
   *   1. **pending-publish retry**: if a previous publish left a
   *      `pendingPublishCid` marker, retry it until cleared or the
   *      deadline elapses.
   *   2. **pin-verify**: HEAD-poll the most-recent UXF bundle CID
   *      against the configured IPFS gateways until ≥1 gateway serves
   *      it. Skipped when no bundle has been pinned this process
   *      lifetime (`lastPinnedBundleCid === null`).
   *   3. **pointer-read-back**: poll `pointer.recoverLatest()` until it
   *      returns the most-recent published snapshot CID. Skipped when
   *      no snapshot has been published (`lastDiscoveredPointerCid ===
   *      null`) or no pointer layer is wired (the cross-process
   *      recovery path is structurally absent — nothing to verify).
   *
   * On any leg failing within the deadline, a
   * `shutdown:verification-timeout` event is emitted with structured
   * detail. Shutdown continues regardless: the event is informational
   * so operators can investigate cross-process recovery gaps without
   * blocking the calling thread indefinitely.
   *
   * NB: this method MUST NOT throw on the expected failure modes —
   * callers (`shutdown()` itself) wrap with a defensive try/catch but
   * we keep the contract clean: gate either completes within the
   * budget or emits a timeout event and returns.
   *
   * @param options.deadlineMs Total wall-clock budget across all legs.
   * @param options.reason     Free-form context recorded in the
   *                            timeout event payload.
   */
  async awaitRemoteDurability(options) {
    const deadline = Date.now() + Math.max(0, options.deadlineMs);
    const remainingMs = () => Math.max(0, deadline - Date.now());
    const controller = new AbortController();
    const deadlineTimer = setTimeout(() => controller.abort(), remainingMs());
    const bundleCid = this.host.getLastPinnedBundleCid();
    const snapshotCid = this.host.getLastDiscoveredPointerCid();
    const pendingCid = this.host.getPendingPublishCid();
    const verifiedBundle = this.host.getLastVerifiedBundleCid();
    const verifiedSnapshot = this.host.getLastVerifiedSnapshotCid();
    const bundleNeedsVerify = bundleCid !== null && bundleCid !== verifiedBundle;
    const snapshotNeedsVerify = snapshotCid !== null && snapshotCid !== verifiedSnapshot;
    const reason = options.reason;
    if (!bundleNeedsVerify && !snapshotNeedsVerify && !pendingCid) {
      clearTimeout(deadlineTimer);
      this.host.log(
        `Shutdown durability: nothing to verify (bundle ${bundleCid ? "already verified per-flush" : "not pinned"}, snapshot ${snapshotCid ? "already verified per-flush" : "not published"}, no pending publish)`
      );
      return;
    }
    this.host.log(
      `Shutdown durability gate: bundleCid=${bundleCid ?? "none"} (verified=${verifiedBundle ?? "none"}) snapshotCid=${snapshotCid ?? "none"} (verified=${verifiedSnapshot ?? "none"}) pendingCid=${pendingCid ?? "none"} deadlineMs=${options.deadlineMs}`
    );
    const legs = [];
    legs.push(
      this.awaitPendingPublishCleared(deadline, controller.signal, reason)
    );
    if (bundleNeedsVerify && bundleCid !== null) {
      legs.push(
        this.awaitPinVerified(bundleCid, deadline, controller.signal, reason)
      );
    }
    const pointer = this.host.options?.getPointerLayer?.() ?? null;
    if (snapshotCid && pointer) {
      legs.push(
        this.awaitAggregatorPointerReadBack(snapshotCid, deadline, controller.signal, reason)
      );
    }
    await Promise.allSettled(legs);
    clearTimeout(deadlineTimer);
  }
  /**
   * Leg 1 — drive `retryPendingPublishIfAny()` on a fast cadence until
   * the marker clears OR the deadline elapses. Emits
   * `shutdown:verification-timeout` (`leg: 'pending-publish-retry'`) on
   * deadline.
   */
  async awaitPendingPublishCleared(deadline, signal, reason) {
    let lastError;
    let lastCid = this.host.getPendingPublishCid();
    while (Date.now() < deadline && !signal.aborted) {
      const pending = this.host.getPendingPublishCid();
      if (!pending) return;
      lastCid = pending;
      try {
        const result = await this.retryPendingPublishIfAny();
        if (!result.attempted) {
          return;
        }
        if (result.ok) {
          return;
        }
        lastError = result.code ?? (result.transient ? "TRANSIENT" : "PERMANENT");
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
      if (signal.aborted || Date.now() >= deadline) break;
      const remaining = deadline - Date.now();
      const sleepMs = Math.min(PENDING_PUBLISH_RETRY_INTERVAL_MS, Math.max(0, remaining));
      if (sleepMs > 0) await this.sleepAbortable(sleepMs, signal);
    }
    if (!this.host.getPendingPublishCid()) return;
    this.emitVerificationTimeout({
      leg: "pending-publish-retry",
      cidsInQuestion: lastCid ? [lastCid] : [],
      lastError,
      reason
    });
  }
  /**
   * Leg 2 — wrap `verifyCidAccessibleWithRetry` for the bundle CID.
   * Emits `shutdown:verification-timeout` (`leg: 'pin-verify'`) on
   * `failureKind === 'deadline-exceeded'` or
   * `'gateway-not-serving'`. The `'aborted'` outcome is also surfaced
   * as a timeout — from the operator's perspective, the deadline (or
   * an abort) terminated the verification before it succeeded.
   */
  async awaitPinVerified(bundleCid, deadline, signal, reason) {
    const result = await verifyCidAccessibleWithRetry(
      this.host.ipfsGateways,
      bundleCid,
      {
        deadlineMs: Math.max(0, deadline - Date.now()),
        signal
      }
    );
    if (result.ok) {
      this.host.log(
        `Shutdown durability: bundle ${bundleCid} HEAD-verified (attempts=${result.attempts}, elapsedMs=${result.elapsedMs})`
      );
      return;
    }
    this.emitVerificationTimeout({
      leg: "pin-verify",
      cidsInQuestion: [bundleCid],
      lastError: result.failureKind,
      reason
    });
  }
  /**
   * Leg 3 — poll `pointer.recoverLatest()` until it returns
   * `snapshotCid` OR the deadline elapses. Emits
   * `shutdown:verification-timeout` (`leg: 'pointer-read-back'`) on
   * deadline. A transient `recoverLatest()` throw (network error)
   * is treated as a miss and the loop retries; permanent classification
   * surfaces as a `storage:error` via the lifecycle's existing
   * permanent-error path AND a verification-timeout event so the
   * shutdown record is complete.
   */
  async awaitAggregatorPointerReadBack(snapshotCid, deadline, signal, reason) {
    const pointer = this.host.options?.getPointerLayer?.() ?? null;
    if (!pointer) {
      this.emitVerificationTimeout({
        leg: "pointer-read-back",
        cidsInQuestion: [snapshotCid],
        lastError: "pointer-layer-unavailable",
        reason
      });
      return;
    }
    let lastError;
    while (Date.now() < deadline && !signal.aborted) {
      let recovered = null;
      try {
        recovered = await pointer.recoverLatest();
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        if (this.isPermanentPointerError(err)) {
          this.host.emitEvent(this.host.buildErrorEvent("storage:error", err));
          this.emitVerificationTimeout({
            leg: "pointer-read-back",
            cidsInQuestion: [snapshotCid],
            lastError,
            reason
          });
          return;
        }
      }
      if (recovered) {
        try {
          const recoveredCidStr = CID8.decode(recovered.cid).toString();
          if (recoveredCidStr === snapshotCid) {
            this.host.log(
              `Shutdown durability: aggregator read-back matched snapshot ${snapshotCid} (version=${recovered.version})`
            );
            return;
          }
          lastError = `aggregator returned different cid (${recoveredCidStr})`;
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
        }
      } else if (!lastError) {
        lastError = "aggregator returned null (no anchor yet)";
      }
      if (signal.aborted || Date.now() >= deadline) break;
      const remaining = deadline - Date.now();
      const sleepMs = Math.min(POINTER_READBACK_POLL_MS, Math.max(0, remaining));
      if (sleepMs > 0) await this.sleepAbortable(sleepMs, signal);
    }
    this.emitVerificationTimeout({
      leg: "pointer-read-back",
      cidsInQuestion: [snapshotCid],
      lastError,
      reason
    });
  }
  /**
   * Issue #239 — per-flush durability verification.
   *
   * Called by `FlushScheduler.flushToIpfs` AFTER pin + publish succeed,
   * before the flush is considered "done". Verifies that the just-
   * pinned CIDs are remotely fetchable by other peers (closes the
   * cross-process invoice-loss path documented in #234 / #239 where
   * `Sphere.destroy()` could return while the bundle CAR was still
   * propagating across HTTP gateways).
   *
   * Legs:
   *   1. **Bundle CID HEAD-accessible** on ≥1 IPFS gateway — the
   *      cross-device fetch path's critical block.
   *   2. **Snapshot CID HEAD-accessible** on ≥1 IPFS gateway — needed
   *      because cross-device recovery fetches the snapshot CAR first,
   *      then walks to bundle refs. Skipped when no snapshot was
   *      published (`snapshotCid === null`) — either because no pointer
   *      layer is wired OR because the publish returned a transient
   *      result (issue #241: a stale snapshot CID would be a no-op
   *      verify; only the bundle leg is checked in that case).
   *
   * NOT verified here:
   *   - **Aggregator `recoverLatest()` read-back of the snapshot CID.**
   *     The aggregator's read replicas can lag the primary by tens of
   *     seconds on testnet — verifying read-back per-flush would inject
   *     unacceptable latency into every save (every token receive /
   *     send / mint). The shutdown gate ({@link awaitRemoteDurability})
   *     does perform this leg with the configurable shutdown deadline,
   *     emitting a `shutdown:verification-timeout` event (warn-only,
   *     non-throwing) if the read-back doesn't catch up before exit.
   *     A successful `publishAggregatorPointerBestEffort` return already
   *     guarantees the aggregator COMMITTED the new version; only the
   *     replica catch-up is gapped, and the cold-start retry on next
   *     boot covers the small percentage of cases where the next
   *     process beats replica propagation.
   *
   * On ANY leg failing within the deadline, this method **throws** a
   * structured error so the caller (FlushScheduler) can propagate the
   * failure to `forceFlushSerialized`'s rejection arm. The at-least-
   * once gate (`awaitNextFlush` → `PaymentsModule.handleIncomingTransfer`)
   * then refuses to advance the Nostr `since` filter, the inbound event
   * replays on next reconnect, and the addToken stateHash dedup ensures
   * idempotency.
   *
   * Issue #241: only the IPFS pin legs gate the Nostr ack here. The
   * aggregator-publish durability (pointer read-back) is intentionally
   * NOT a per-flush leg — it's a liveness optimization for cold-import
   * discovery and is retried in background via `pendingPublishCid`.
   * Pin durability is the cross-device recoverability invariant.
   *
   * @param bundleCid    The UXF bundle CID just pinned via flushToIpfs.
   * @param snapshotCid  The lean-snapshot CID just published via
   *                      publishSnapshotIfWired. Null when no pointer
   *                      layer is wired.
   * @param deadlineMs   Total wall-clock budget across both legs.
   * @throws Error with code `FLUSH_DURABILITY_TIMEOUT` on any leg
   *         exhausting the deadline, with structured detail on which
   *         leg(s) failed.
   */
  async verifyFlushDurability(bundleCid, snapshotCid, deadlineMs) {
    const deadline = Date.now() + Math.max(0, deadlineMs);
    const noAbort = new AbortController();
    const signal = noAbort.signal;
    const legs = [];
    legs.push(
      this.verifyPinLeg(bundleCid, deadline, signal)
    );
    if (snapshotCid) {
      legs.push(
        this.verifyPinLeg(snapshotCid, deadline, signal)
      );
    }
    const results = await Promise.all(legs);
    const failed = results.filter((r) => !r.ok);
    if (failed.length === 0) {
      this.host.setLastVerifiedBundleCid(bundleCid);
      if (snapshotCid) {
        this.host.setLastVerifiedSnapshotCid(snapshotCid);
      }
      return;
    }
    const cidsInQuestion = failed.map((f) => f.cid);
    const legSummary = failed.map((f) => `${f.leg}:${f.cid}=${f.lastError ?? "fail"}`).join("; ");
    const err = new Error(
      `Flush durability verification timed out (${failed.length}/${results.length} legs failed): ` + legSummary
    );
    err.code = "FLUSH_DURABILITY_TIMEOUT";
    err.details = {
      failedLegs: failed.map((f) => ({ leg: f.leg, cid: f.cid, lastError: f.lastError })),
      cidsInQuestion
    };
    throw err;
  }
  /**
   * Single pin-verify leg used by both the shutdown gate and the
   * per-flush gate. Returns a structured result instead of emitting /
   * throwing so each caller can compose the legs differently.
   */
  async verifyPinLeg(cid, deadline, signal) {
    const result = await verifyCidAccessibleWithRetry(
      this.host.ipfsGateways,
      cid,
      { deadlineMs: Math.max(0, deadline - Date.now()), signal }
    );
    if (result.ok) {
      this.host.log(
        `Profile durability: ${cid} HEAD-verified (attempts=${result.attempts}, elapsedMs=${result.elapsedMs})`
      );
      return { leg: "pin-verify", ok: true, cid };
    }
    return { leg: "pin-verify", ok: false, lastError: result.failureKind, cid };
  }
  /**
   * Single pointer-read-back leg used by both the shutdown gate and
   * the per-flush gate. Returns a structured result for the same
   * composition reason as {@link verifyPinLeg}.
   */
  async verifyPointerReadBackLeg(snapshotCid, deadline, signal) {
    const pointer = this.host.options?.getPointerLayer?.() ?? null;
    if (!pointer) {
      return {
        leg: "pointer-read-back",
        ok: false,
        lastError: "pointer-layer-unavailable",
        cid: snapshotCid
      };
    }
    let lastError;
    while (Date.now() < deadline && !signal.aborted) {
      let recovered = null;
      try {
        recovered = await pointer.recoverLatest();
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        if (this.isPermanentPointerError(err)) {
          this.host.emitEvent(this.host.buildErrorEvent("storage:error", err));
          return {
            leg: "pointer-read-back",
            ok: false,
            lastError,
            cid: snapshotCid
          };
        }
      }
      if (recovered) {
        try {
          const recoveredStr = CID8.decode(recovered.cid).toString();
          if (recoveredStr === snapshotCid) {
            this.host.log(
              `Profile durability: aggregator read-back matched ${snapshotCid} (version=${recovered.version})`
            );
            return { leg: "pointer-read-back", ok: true, cid: snapshotCid };
          }
          lastError = `aggregator returned different cid (${recoveredStr})`;
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
        }
      } else if (!lastError) {
        lastError = "aggregator returned null (no anchor yet)";
      }
      if (signal.aborted || Date.now() >= deadline) break;
      const remaining = deadline - Date.now();
      const sleepMs = Math.min(POINTER_READBACK_POLL_MS, Math.max(0, remaining));
      if (sleepMs > 0) await this.sleepAbortable(sleepMs, signal);
    }
    return {
      leg: "pointer-read-back",
      ok: false,
      lastError,
      cid: snapshotCid
    };
  }
  /**
   * Issue #239 — emit a structured `shutdown:verification-timeout`
   * event. Centralised so the payload shape is uniform across the
   * three legs.
   */
  emitVerificationTimeout(payload) {
    this.host.log(
      `Shutdown durability TIMEOUT leg=${payload.leg} cids=[${payload.cidsInQuestion.join(",")}] lastError=${payload.lastError ?? "unknown"} reason=${payload.reason ?? "none"}`
    );
    this.host.emitEvent({
      type: "shutdown:verification-timeout",
      timestamp: Date.now(),
      data: {
        leg: payload.leg,
        cidsInQuestion: [...payload.cidsInQuestion],
        lastError: payload.lastError,
        reason: payload.reason
      }
    });
  }
  /**
   * Resolves after `ms` ms OR when `signal` aborts (whichever first).
   * Local helper for the verification legs' inter-attempt sleeps so a
   * shared deadline tears them all down promptly.
   */
  sleepAbortable(ms, signal) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
        resolve();
      };
      if (signal.aborted) {
        clearTimeout(timer);
        resolve();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }
  // ===========================================================================
  // Cold-start recovery
  // ===========================================================================
  /**
   * Classify a pointer-layer error as TRANSIENT (retry on next flush
   * / cold-start, no user action needed) or PERMANENT (user / operator
   * must intervene — wallet state is poisoned or aggregator rotation
   * requires SDK update). Used to decide whether to silently swallow
   * the error or surface it via a `storage:error` event.
   *
   * Non-exhaustive — unknown codes default to TRANSIENT on the premise
   * that "keep running and retry" is safer than "break the wallet".
   * Add to PERMANENT_POINTER_ERROR_CODES below when a new permanent
   * failure mode is introduced.
   */
  isPermanentPointerError(err) {
    if (!err || typeof err !== "object") return false;
    const code2 = err.code;
    if (typeof code2 !== "string") return false;
    return PERMANENT_POINTER_ERROR_CODES.has(code2);
  }
  /**
   * Publish the just-flushed CID to the aggregator pointer layer.
   *
   * Returns a structured result instead of swallowing failures so the
   * caller (FlushScheduler) can route transient failures via a soft
   * event without closing the at-least-once gate. The persistence of
   * the retry marker (`pendingPublishCid`) is handled here:
   *
   *   - SUCCESS — clears `pendingPublishCid`, anchors
   *     `lastDiscoveredPointerCid`, returns `{ ok: true }`.
   *   - TRANSIENT failure — sets `pendingPublishCid = cidString` (with
   *     localCache persistence for crash safety), returns
   *     `{ ok: false, transient: true, code? }`. Issue #241: callers
   *     route this to a `storage:pending-publish` event instead of
   *     throwing — the at-least-once Nostr gate is decoupled from
   *     aggregator-publish durability and rides on IPFS pin
   *     durability alone (which is the actual cross-device
   *     recoverability invariant). The pending marker is retried
   *     at start of every subsequent `flushToIpfs` and
   *     `runPointerPollOnce`.
   *
   *     A WALKBACK_FLOOR transient (aggregator read-replica lagging
   *     behind a version this wallet has already confirmed locally)
   *     additionally emits a typed `storage:replica-lag` event so
   *     operators can distinguish it from generic network
   *     transients in monitoring.
   *
   *   - PERMANENT failure (UNREACHABLE_RECOVERY_BLOCKED, REJECTED,
   *     UNTRUSTED_PROOF, TRUST_BASE_STALE, MARKER_CORRUPT, CORRUPT_STREAK,
   *     SECURITY_ORIGIN_MISMATCH, CAPABILITY_DENIED, UNSUPPORTED_RUNTIME,
   *     PROTOCOL_ERROR, AGGREGATOR_REJECTED) — emits `storage:error`
   *     event with the error code, clears `pendingPublishCid` (no
   *     retry would help; surfacing is the action), returns
   *     `{ ok: false, transient: false, code }`. Callers ack the event
   *     so the wallet does not deadlock on a permanently-failing
   *     publish — operator intervention is required and is surfaced
   *     via the emitted event.
   *
   * Returns `{ ok: false, transient: false }` (treated as permanent)
   * if no pointer-layer closure is wired — the wallet is not
   * configured for aggregator anchoring, so there's nothing to do.
   */
  async publishAggregatorPointerBestEffort(cidString) {
    const pointer = this.host.options?.getPointerLayer?.() ?? null;
    if (!pointer) {
      this.host.setPendingPublishCid(null);
      return { ok: false, transient: false };
    }
    if (this.walkbackPublishInFlight !== null) {
      return await this.walkbackPublishInFlight;
    }
    const nowMs = Date.now();
    if (nowMs < this.walkbackFloorThrottleUntilMs) {
      this.walkbackFloorThrottleSkipCount += 1;
      this.host.setPendingPublishCid(cidString);
      return { ok: false, transient: true, code: WALKBACK_FLOOR_CODE };
    }
    const inFlight = (async () => {
      try {
        const cidBytes = CID8.parse(cidString).bytes;
        const result = await pointer.publish(async () => cidBytes);
        this.host.setLastDiscoveredPointerCid(cidString);
        this.host.setPendingPublishCid(null);
        if (this.walkbackFloorThrottleSkipCount > 0) {
          this.host.log(
            `Pointer publish recovered after ${this.walkbackFloorThrottleSkipCount} WALKBACK_FLOOR-throttled skip(s).`
          );
        }
        this.walkbackFloorThrottleUntilMs = 0;
        this.walkbackFloorThrottleSkipCount = 0;
        this.host.log(
          `Pointer publish ok: cid=${cidString} version=${result.version} attempts=${result.attemptsUsed}`
        );
        try {
          const signerHandle = pointer.getSignerForWinBroadcast();
          const signed = await signWinBroadcastPayload(signerHandle.signer, {
            _kind: WIN_BROADCAST_KIND_MARKER,
            v: WIN_BROADCAST_SCHEMA_VERSION,
            version: result.version,
            cid: cidString,
            signingPubKey: signerHandle.signingPubKeyHex,
            ts: Date.now()
          });
          this.host.emitEvent({
            type: "storage:pointer-published",
            timestamp: Date.now(),
            data: {
              cid: cidString,
              version: result.version,
              attemptsUsed: result.attemptsUsed,
              signedPayloadJson: JSON.stringify(signed),
              broadcastTag: buildWinBroadcastTag(signerHandle.signingPubKeyHex)
            }
          });
        } catch (broadcastErr) {
          const errMsg = broadcastErr instanceof Error ? broadcastErr.message : String(broadcastErr);
          this.host.log(
            `Pointer publish: win-broadcast build/sign failed (best-effort, ignored): ${errMsg}`
          );
        }
        return { ok: true, transient: false };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (this.isPermanentPointerError(err)) {
          const code2 = err.code ?? "UNKNOWN";
          this.host.log(`Pointer publish PERMANENT failure (${code2}): ${msg}`);
          this.host.emitEvent(this.host.buildErrorEvent("storage:error", err));
          this.host.setPendingPublishCid(null);
          this.walkbackFloorThrottleUntilMs = 0;
          this.walkbackFloorThrottleSkipCount = 0;
          return { ok: false, transient: false, code: code2 };
        }
        const transientCode = typeof err.code === "string" ? err.code : "UNCLASSIFIED";
        logger.warn(
          "Profile-TokenStorage",
          `Pointer publish failed (transient, code=${transientCode}, cid=${cidString}): ${msg}`
        );
        if (transientCode === WALKBACK_FLOOR_CODE) {
          this.host.emitEvent({
            type: "storage:replica-lag",
            timestamp: Date.now(),
            data: { cid: cidString, code: transientCode, message: msg }
          });
          let reconciledDownward = false;
          try {
            const recovered = await pointer.recoverLatest();
            if (recovered) {
              const outcome = await pointer.reconcileLocalVersionDownward(recovered);
              if (outcome.reconciled) {
                reconciledDownward = true;
                this.host.log(
                  `Pointer publish reconciled localVersion downward: from=${outcome.fromVersion} to=${outcome.toVersion} (same-identity cross-device race; baseline now matches aggregator-visible version).`
                );
                this.host.emitEvent({
                  type: "storage:replica-lag-reconciled",
                  timestamp: Date.now(),
                  data: {
                    cid: cidString,
                    fromVersion: outcome.fromVersion,
                    toVersion: outcome.toVersion
                  }
                });
              }
            }
          } catch (reconcileErr) {
            const recMsg = reconcileErr instanceof Error ? reconcileErr.message : String(reconcileErr);
            this.host.log(
              `Pointer publish: WALKBACK_FLOOR reconcile attempt failed (${recMsg}); falling through to throttle.`
            );
          }
          if (reconciledDownward) {
            this.walkbackFloorThrottleUntilMs = 0;
            this.walkbackFloorThrottleSkipCount = 0;
          } else {
            this.walkbackFloorThrottleUntilMs = Date.now() + WALKBACK_FLOOR_RETRY_THROTTLE_MS;
            this.walkbackFloorThrottleSkipCount = 0;
          }
        } else {
          if (this.walkbackFloorThrottleSkipCount > 0) {
            this.host.log(
              `Pointer publish: ${this.walkbackFloorThrottleSkipCount} WALKBACK_FLOOR-throttled skip(s) cleared by new transient code=${transientCode}.`
            );
          }
          this.walkbackFloorThrottleUntilMs = 0;
          this.walkbackFloorThrottleSkipCount = 0;
        }
        this.host.setPendingPublishCid(cidString);
        return { ok: false, transient: true, code: transientCode };
      }
    })();
    this.walkbackPublishInFlight = inFlight;
    try {
      return await inFlight;
    } finally {
      if (this.walkbackPublishInFlight === inFlight) {
        this.walkbackPublishInFlight = null;
      }
    }
  }
  /**
   * If a previous publish left `pendingPublishCid` non-null, try
   * again. Called at the start of every `flushToIpfs` and every
   * `runPointerPollOnce` so the retry is gated on the normal flush
   * cadence rather than a dedicated timer.
   *
   * Returns the same result shape as `publishAggregatorPointerBestEffort`
   * with an additional `attempted` flag:
   *   - `attempted: false` when no marker is set (caller proceeds).
   *   - `attempted: true` when a retry was made (result indicates
   *     whether the marker was cleared).
   */
  async retryPendingPublishIfAny() {
    const pending = this.host.getPendingPublishCid();
    if (!pending) {
      return { attempted: false, ok: true, transient: false };
    }
    this.host.log(`Retrying pending pointer publish: cid=${pending}`);
    const result = await this.publishAggregatorPointerBestEffort(pending);
    return { attempted: true, ok: result.ok, transient: result.transient, code: result.code };
  }
  /**
   * Try to rebuild the local bundle set from the aggregator pointer
   * layer's last valid CID. Returns `true` iff a bundle ref was
   * recorded (caller should skip the IPNS fallback). Returns `false`
   * when the pointer has no anchor yet or transiently failed — the
   * caller falls through to IPNS.
   */
  async recoverFromAggregatorPointerBestEffort() {
    const getPointerLayer = this.host.options?.getPointerLayer;
    if (!getPointerLayer) {
      this.host.log(
        "Pointer recover: no getPointerLayer closure wired; skipping pointer-layer wait, falling through to legacy IPNS migration"
      );
      return false;
    }
    const getStatus = this.host.options?.getPointerBuildStatus;
    const pollDeadline = Date.now() + 3e4;
    let pointer = getPointerLayer() ?? null;
    while (!pointer && Date.now() < pollDeadline) {
      if (getStatus && getStatus() === "unavailable") {
        this.host.log(
          "Pointer recover: build status reports unavailable (no oracle / sticky skip); skipping pointer-layer wait, falling through to legacy IPNS migration"
        );
        return false;
      }
      await new Promise((r) => setTimeout(r, 100));
      pointer = getPointerLayer() ?? null;
    }
    if (!pointer) {
      const status = getStatus ? getStatus() : "unknown";
      this.host.log(
        `Pointer recover: no pointer layer wired after 30s wait (build status=${status}); ` + (status === "pending" ? "build is still in flight \u2014 bailing to avoid legacy-fallback fork. Subsequent sync()s will retry once the build completes." : "wallet has no aggregator pointer recovery (e.g., oracle not configured)")
      );
      return status === "pending";
    }
    let recovered;
    try {
      recovered = await pointer.recoverLatest();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (this.isPermanentPointerError(err)) {
        const code2 = err.code ?? "UNKNOWN";
        this.host.log(`Pointer recover PERMANENT failure (${code2}): ${msg}`);
        this.host.emitEvent(this.host.buildErrorEvent("storage:error", err));
        return true;
      }
      this.host.log(`Pointer recover failed (transient, best-effort): ${msg}`);
      return false;
    }
    if (!recovered) {
      this.host.log("Pointer recover: no anchor published yet");
      return false;
    }
    let cidString;
    try {
      cidString = CID8.decode(recovered.cid).toString();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.host.log(`Pointer recover: failed to decode recovered CID bytes: ${msg}`);
      return false;
    }
    try {
      const applyResult = await this.host.applySnapshotIfWired(cidString);
      if (applyResult === null) {
        this.host.log(
          `Pointer recover: snapshot applier not wired; treating as no-op (no legacy bundle-CID fallback per Item #15 Phase E)`
        );
        return false;
      }
      this.host.setLastDiscoveredPointerCid(cidString);
      this.host.log(
        `Pointer recover ok: cid=${cidString} version=${recovered.version} joinedAny=${applyResult.joinedAny} addresses=${applyResult.addressesSeen} bundles=${applyResult.bundleEntriesSeen}`
      );
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.host.log(
        `Pointer recover: applySnapshotIfWired failed (best-effort, will retry on next poll): ${msg}`
      );
      return true;
    }
  }
  /**
   * Run the legacy IPNS → pointer migration if the wallet pre-dates
   * the pointer layer. No-op for fresh wallets or wallets that have
   * already migrated. Never throws — any failure logs and returns,
   * leaving subsequent flushes to seed the anchor via the pointer
   * layer directly.
   */
  async runLegacyIpnsMigrationBestEffort() {
    const identity = this.host.getIdentity();
    if (!identity || this.host.ipfsGateways.length === 0) return;
    if (!this.host.localCache) return;
    try {
      const { runIpnsToPointerMigration: runIpnsToPointerMigration2 } = await Promise.resolve().then(() => (init_ipns_reader(), ipns_reader_exports));
      const localCache = this.host.localCache;
      const result = await runIpnsToPointerMigration2({
        localCache: {
          get: (k) => localCache.get(k),
          set: (k, v) => localCache.set(k, v)
        },
        privateKeyHex: identity.privateKey,
        gateways: this.host.ipfsGateways,
        onBundle: async (cid, ref) => this.bundleIndex.addBundle(cid, ref),
        log: (msg) => this.host.log(msg)
      });
      if (result.migrated) {
        this.host.log(
          `Legacy IPNS \u2192 pointer migration: imported ${result.bundlesImported} bundles`
        );
      } else if (result.skipped === "not-legacy") {
      } else {
        this.host.log(
          `Legacy migration skipped: ${result.skipped ?? "transient-failure"}`
        );
      }
    } catch (err) {
      this.host.log(
        `Legacy IPNS migration threw: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  // ===========================================================================
  // Periodic Path 2 (aggregator-pointer) polling
  // ===========================================================================
  /**
   * Sample the next polling interval. Exposed as a private method so
   * tests can spy on it. Returns ms in [30_000, 90_000).
   */
  samplePointerPollIntervalMs() {
    return POINTER_POLL_MIN_MS + Math.floor(Math.random() * POINTER_POLL_RANGE_MS);
  }
  /**
   * Arm (or re-arm) the periodic poll of `recoverLatest()`. Acts as a
   * safety net when OrbitDB pubsub (Path 1) stalls.
   *
   * Behaviour:
   *   - No pointer-layer closure wired → no-op (polling is structurally
   *     pointless). Production wires the closure when an oracle is
   *     configured; tests that omit it skip polling entirely.
   *   - `recoverLatest()` returns null (no anchor yet) → re-arm.
   *   - `recoverLatest()` returns a CID already in `knownBundleCids`
   *     → no-op (Path 1 or our own freshly-published flush already
   *     delivered it). Re-arm.
   *   - `recoverLatest()` returns a NEW CID → add to bundle index
   *     (mirrors cold-start recovery). Re-arm.
   *   - Transient failure → log + warn, re-arm at the normal interval.
   *   - Permanent failure → log + emit `storage:error` event, re-arm
   *     with a 5x back-off so we don't hammer a wallet that needs
   *     operator intervention.
   *
   * The intervals are randomised in [30s, 90s) to avoid synchronised
   * polling across devices that booted simultaneously.
   */
  /**
   * Public wake-up API: trigger an IMMEDIATE aggregator pointer poll
   * without waiting for the periodic [30s, 90s) cycle.
   *
   * Called by `ProfileTokenStorageProvider.handleReplication` when an
   * OrbitDB-pubsub replication event arrives. The aggregator is the
   * authoritative source of truth for the latest pointer version —
   * pubsub between two devices is unreliable (NAT, firewall, peer
   * discovery), so we treat the pubsub signal as a hint to consult
   * the aggregator NOW rather than waiting for the next periodic poll.
   *
   * When pubsub fails entirely, the periodic poll (worst case 90s)
   * still guarantees eventual sync — the aggregator is the ultimate
   * fallback channel.
   *
   * Idempotent: if no aggregator update is found, no-op. If a new CID
   * is found, adds it to the bundle index (same path as the periodic
   * poll). Re-arms the periodic timer so the next scheduled poll is
   * a fresh [30s, 90s) window from this call.
   *
   * Returns a promise that resolves when the poll completes (success
   * or transient failure). Rejection only on programmer error — all
   * transient/permanent failures are logged + swallowed (matching the
   * periodic-poll contract).
   */
  async triggerPointerPollNow() {
    return this.runPointerPollOnce();
  }
  schedulePointerPoll() {
    if (this.host.getIsShuttingDown()) return;
    const getPointerLayer = this.host.options?.getPointerLayer;
    if (!getPointerLayer) return;
    if (this.pointerPollTimer !== null) {
      clearTimeout(this.pointerPollTimer);
      this.pointerPollTimer = null;
    }
    const intervalMs = this.samplePointerPollIntervalMs();
    this.pointerPollTimer = setTimeout(() => {
      this.pointerPollTimer = null;
      void this.runPointerPollOnce();
    }, intervalMs);
  }
  /**
   * Single iteration of the periodic poll. Always re-arms unless
   * shutdown is in progress. Permanent failures re-arm with a 5x
   * back-off applied via the multiplier in the next-tick interval.
   */
  async runPointerPollOnce() {
    if (this.host.getIsShuttingDown()) return;
    const getPointerLayer = this.host.options?.getPointerLayer;
    if (!getPointerLayer) return;
    let nextBackoffMultiplier = 1;
    const pointer = getPointerLayer() ?? null;
    if (!pointer) {
      this.scheduleNextPointerPoll(nextBackoffMultiplier);
      return;
    }
    try {
      await this.retryPendingPublishIfAny();
    } catch (err) {
      this.host.log(
        `Pointer poll: pending-publish retry threw (best-effort): ${err instanceof Error ? err.message : String(err)}`
      );
    }
    let recovered = null;
    try {
      recovered = await pointer.recoverLatest();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (this.isPermanentPointerError(err)) {
        const code2 = err.code ?? "UNKNOWN";
        this.host.log(`Pointer poll PERMANENT failure (${code2}): ${msg}`);
        this.host.emitEvent(this.host.buildErrorEvent("storage:error", err));
        nextBackoffMultiplier = POINTER_POLL_BACKOFF_MULTIPLIER;
      } else {
        this.host.log(`Pointer poll failed (transient, best-effort): ${msg}`);
      }
      this.scheduleNextPointerPoll(nextBackoffMultiplier);
      return;
    }
    if (!recovered) {
      this.scheduleNextPointerPoll(nextBackoffMultiplier);
      return;
    }
    let cidString;
    try {
      cidString = CID8.decode(recovered.cid).toString();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.host.log(`Pointer poll: failed to decode recovered CID bytes: ${msg}`);
      this.scheduleNextPointerPoll(nextBackoffMultiplier);
      return;
    }
    if (this.host.getLastDiscoveredPointerCid() === cidString) {
      this.scheduleNextPointerPoll(nextBackoffMultiplier);
      return;
    }
    try {
      const applyResult = await this.host.applySnapshotIfWired(cidString);
      if (applyResult === null) {
        this.host.log(
          `Pointer poll: snapshot applier not wired; skipping CID dispatch (no legacy bundle-CID fallback per Item #15 Phase E)`
        );
        this.scheduleNextPointerPoll(nextBackoffMultiplier);
        return;
      }
      this.host.setLastDiscoveredPointerCid(cidString);
      this.host.log(
        `Pointer poll discovered NEW snapshot CID: cid=${cidString} version=${recovered.version} joinedAny=${applyResult.joinedAny} addresses=${applyResult.addressesSeen} bundles=${applyResult.bundleEntriesSeen}`
      );
      if (this.onPollDiscoveredNewCid) {
        try {
          await this.onPollDiscoveredNewCid();
        } catch (err2) {
          this.host.log(
            `Pointer poll: onPollDiscoveredNewCid failed (best-effort): ${err2 instanceof Error ? err2.message : String(err2)}`
          );
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.host.log(`Pointer poll: applySnapshotIfWired failed: ${msg}`);
    }
    this.scheduleNextPointerPoll(nextBackoffMultiplier);
  }
  /**
   * Re-arm the poll with the given back-off multiplier (1 = normal,
   * `POINTER_POLL_BACKOFF_MULTIPLIER` = permanent-failure back-off).
   */
  scheduleNextPointerPoll(backoffMultiplier) {
    if (this.host.getIsShuttingDown()) return;
    if (!this.host.options?.getPointerLayer) return;
    const baseIntervalMs = this.samplePointerPollIntervalMs();
    const intervalMs = baseIntervalMs * Math.max(1, backoffMultiplier);
    this.pointerPollTimer = setTimeout(() => {
      this.pointerPollTimer = null;
      void this.runPointerPollOnce();
    }, intervalMs);
  }
};

// profile/profile-token-storage-provider.ts
var DEFAULT_FLUSH_DEBOUNCE_MS = 2e3;
var ProfileTokenStorageProvider = class _ProfileTokenStorageProvider {
  constructor(db, encryptionKey, ipfsGateways, options, localCache) {
    this.db = db;
    this.options = options;
    this._db = db;
    this._encryptionKeyRaw = encryptionKey;
    this._ipfsGateways = ipfsGateways;
    this._options = options;
    this.localCache = localCache ?? null;
    this.flushDebounceMs = options?.flushDebounceMs ?? options?.config?.flushDebounceMs ?? DEFAULT_FLUSH_DEBOUNCE_MS;
    this.dirtyFlushDebounceMs = options?.dirtyFlushDebounceMs ?? this.flushDebounceMs;
    if (encryptionKey) {
      this.encryptionKey = encryptionKey;
    }
    const host = this.makeHost();
    this.bundleIndex = new BundleIndex(host);
    this.historyStore = new HistoryStore(host);
    this.lifecycleManager = new LifecycleManager(host, this.bundleIndex);
    this.flushScheduler = new FlushScheduler(host, this.bundleIndex);
  }
  // --- BaseProvider metadata ---
  id = "profile-token";
  name = "Profile Token Storage";
  type = "p2p";
  // --- State ---
  status = "disconnected";
  identity = null;
  encryptionKey = null;
  initialized = false;
  isShuttingDown = false;
  // --- Write-behind buffer ---
  pendingData = null;
  flushTimer = null;
  flushPromise = null;
  flushDebounceMs;
  // --- Item #15 Phase C.2 — dirty-signal debounce ---
  /**
   * Debounce timer armed by `notifyProfileDirty()`. Separate from
   * `flushTimer` because the lean-snapshot publish path is independent
   * of the token-bundle pin path (each can fire without the other).
   * Phase E will collapse the two when the bundle-only publish is
   * removed.
   */
  dirtyFlushTimer = null;
  /**
   * In-flight dirty-flush promise. Held to serialize concurrent
   * dispatches (a second notifyProfileDirty() that arrives mid-flush
   * gets coalesced into the next debounce window).
   */
  dirtyFlushPromise = null;
  /**
   * Latch — set when `notifyProfileDirty()` is called during an
   * in-flight flush. Re-arms the debounce after the current flush
   * settles so we don't lose the signal.
   */
  dirtyFlushPending = false;
  /**
   * Sticky latch — true once {@link shutdown} has completed at least
   * once. Distinct from `isShuttingDown` (which is reset to `false`
   * at the end of shutdown so re-arming-shutdown-on-restart works)
   * and from `status === 'disconnected'` (which is also the
   * pre-connect default). Used by `notifyProfileDirty` to ignore
   * late-arriving signals from writers that outlive the provider.
   */
  hasShutdown = false;
  dirtyFlushDebounceMs;
  // --- Cold-start sync dedup (steelman) ---
  // When two sync() calls race during cold-start, both observe
  // `lastLoadedData === null && knownBundleCids.size > 0` and both fall
  // through to load(). load() is idempotent for a single CAR but not
  // for the surrounding event emissions (sync:completed fires twice;
  // history-import counts may double-count). Dedupe by latching the
  // first cold-start sync's promise and have parallel callers await
  // the same result.
  coldStartSyncPromise = null;
  // --- Event system ---
  eventCallbacks = /* @__PURE__ */ new Set();
  // --- Bundle tracking (local cache of known bundles) ---
  knownBundleCids = /* @__PURE__ */ new Set();
  // --- Replication listener cleanup ---
  replicationUnsub = null;
  // --- Last loaded data (for sync diffing) ---
  lastLoadedData = null;
  // --- Last derived structural token manifest ---
  // Structural-only: status ∈ {valid, conflicting}. Oracle enrichment
  // (pending, invalid, spent) is a future layer. See
  // profile/token-manifest.ts.
  lastTokenManifest = null;
  // --- Computed short address ID ---
  addressId = null;
  // --- Last pinned CID for flush retry (Fix 8) ---
  lastPinnedCid = null;
  /**
   * Issue #239 — most-recent UXF bundle CID successfully pinned + written
   * to OrbitDB. Survives across flushes (unlike `lastPinnedCid`, the
   * pin-retry cache) so `LifecycleManager.shutdown()` can HEAD-verify
   * the bundle CAR is served by ≥1 IPFS gateway before exiting.
   * Null until the first successful flush.
   */
  lastPinnedBundleCid = null;
  /**
   * Issue #239 — verified-watermark CIDs. Set by
   * `verifyFlushDurability` after each successful per-flush
   * verification. Shutdown gate consults these to skip its own
   * verification when the just-flushed CIDs are already verified
   * (eliminates ~15-30s of redundant HEAD + aggregator round-trips
   * per destroy() in the common case where every save was per-flush
   * verified). Null until the first successful verification.
   */
  lastVerifiedBundleCid = null;
  lastVerifiedSnapshotCid = null;
  // --- Last CID observed via aggregator pointer (Fix 2 of cross-device sync) ---
  // Set by LifecycleManager on cold-start recoverLatest and on every
  // periodic poll iteration that returns a CID. Read by FlushScheduler
  // to short-circuit gratuitous re-publishes when the merged-state CAR
  // already matches the authoritative pointer (e.g., remote originator
  // already anchored the state we just merged from their bundle).
  lastDiscoveredPointerCid = null;
  /**
   * CID whose CAR is durably pinned + OrbitDB bundle ref written but
   * whose aggregator pointer publish is outstanding due to a transient
   * failure. The next `flushToIpfs` and the periodic pointer poll
   * retry the publish at start.
   *
   * Issue #241: while non-null, `awaitNextFlush` (and therefore the
   * at-least-once Nostr gate) NO LONGER rejects on transient publish
   * failure — pin durability is the cross-device recoverability
   * invariant, and the aggregator publish is a liveness optimization
   * for cold-import discovery. A `storage:pending-publish` event is
   * emitted so operators can monitor the outstanding state without
   * conflating it with the terminal `storage:error` class.
   *
   * Persisted to `localCache` under
   * `<STORAGE_KEYS_GLOBAL.PROFILE_PENDING_PUBLISH_CID>_<addressId>`
   * so a process restart resumes the retry. Loaded lazily on
   * `initialize()`; written via `setPendingPublishCidPersisted`.
   */
  pendingPublishCid = null;
  // --- Bundle CIDs merged into lastLoadedData (pointer monotonicity) ---
  // Snapshot of the active OrbitDB bundle index at the moment load()
  // produced lastLoadedData. Used by FlushScheduler's runtime monotonicity
  // assertion: if a flush would publish a pointer V_n while OrbitDB has
  // bundles NOT in this set, the flush's source state is stale and
  // would silently drop tokens from V_n's CAR. The assertion fires
  // before pin + publish.
  //
  // Null when no successful load() has run yet (no V_n-1 baseline → the
  // assertion has nothing to compare against and trivially passes).
  lastLoadedFromBundleCids = null;
  // --- Config storage for createForAddress ---
  _db;
  _encryptionKeyRaw;
  _ipfsGateways;
  _options;
  // --- Local-only derived cache (per-device, never replicated) ---
  // Holds tombstones, sent, history. See profile/deriver.ts and
  // PROFILE-ARCHITECTURE.md Q1 decision (Section 10).
  localCache;
  // --- Deduplication guard for concurrent rebuild attempts ---
  // When two load() calls both see an empty cache and both invoke
  // rebuildDerivedCache(), the second awaits the first's Promise
  // rather than starting a parallel rebuild that could interleave
  // writes. See rebuildDerivedCache().
  rebuildPromise = null;
  // --- One-time legacy-key cleanup flag ---
  // After a successful atomic `deriver.{addr}.all` write, we best-effort
  // delete the three legacy per-key entries so future reads cannot be
  // confused by stale data on cache-key downgrade. Guard with a flag
  // so we don't attempt the delete on every save.
  legacyKeysCleaned = false;
  // --- Sub-modules (Phase 8 facade refactor) ---
  bundleIndex;
  historyStore;
  lifecycleManager;
  flushScheduler;
  // ---------------------------------------------------------------------------
  // Host adapter — exposes facade-private state to the sub-modules.
  //
  // Every getter/setter mutates a field on `this` so the facade remains
  // the single source of truth. Tests reach into `(provider as any).
  // initialized` / `(provider as any).encryptionKey` directly; those
  // field names live here unchanged.
  // ---------------------------------------------------------------------------
  makeHost() {
    return {
      db: this.db,
      ipfsGateways: this._ipfsGateways,
      options: this.options,
      localCache: this.localCache,
      flushDebounceMs: this.flushDebounceMs,
      eventCallbacks: this.eventCallbacks,
      // Issue #236 — local Helia accessor, resolved lazily on each call
      // so connect()/close() lifecycle transitions are observed by the
      // next pin/fetch operation. Returns `null` for adapters predating
      // issue #236 (no getHelia method on ProfileDatabase).
      getHelia: () => this.db.getHelia?.() ?? null,
      // Lifecycle state
      getStatus: () => this.status,
      setStatus: (s) => {
        this.status = s;
      },
      getInitialized: () => this.initialized,
      setInitialized: (b) => {
        this.initialized = b;
      },
      getIsShuttingDown: () => this.isShuttingDown,
      setIsShuttingDown: (b) => {
        this.isShuttingDown = b;
      },
      getIdentity: () => this.identity,
      setIdentityState: (id) => {
        this.identity = id;
      },
      getEncryptionKey: () => this.encryptionKey,
      setEncryptionKey: (k) => {
        this.encryptionKey = k;
      },
      getComputedAddressId: () => this.addressId,
      setComputedAddressId: (id) => {
        this.addressId = id;
      },
      getReplicationUnsub: () => this.replicationUnsub,
      setReplicationUnsub: (fn) => {
        this.replicationUnsub = fn;
      },
      // Flush state
      getPendingData: () => this.pendingData,
      setPendingData: (d) => {
        this.pendingData = d;
      },
      getFlushTimer: () => this.flushTimer,
      setFlushTimer: (t) => {
        this.flushTimer = t;
      },
      getFlushPromise: () => this.flushPromise,
      setFlushPromise: (p) => {
        this.flushPromise = p;
      },
      getLastPinnedCid: () => this.lastPinnedCid,
      setLastPinnedCid: (c) => {
        this.lastPinnedCid = c;
      },
      getLastPinnedBundleCid: () => this.lastPinnedBundleCid,
      setLastPinnedBundleCid: (c) => {
        this.lastPinnedBundleCid = c;
      },
      getLastVerifiedBundleCid: () => this.lastVerifiedBundleCid,
      setLastVerifiedBundleCid: (c) => {
        this.lastVerifiedBundleCid = c;
      },
      getLastVerifiedSnapshotCid: () => this.lastVerifiedSnapshotCid,
      setLastVerifiedSnapshotCid: (c) => {
        this.lastVerifiedSnapshotCid = c;
      },
      getLastDiscoveredPointerCid: () => this.lastDiscoveredPointerCid,
      setLastDiscoveredPointerCid: (c) => {
        this.lastDiscoveredPointerCid = c;
      },
      getPendingPublishCid: () => this.pendingPublishCid,
      setPendingPublishCid: (c) => {
        this.pendingPublishCid = c;
        this.persistPendingPublishCid(c).catch((err) => {
          this.log(
            `persistPendingPublishCid failed (best-effort): ${err instanceof Error ? err.message : String(err)}`
          );
        });
      },
      // Bundle index state
      getKnownBundleCids: () => this.knownBundleCids,
      setKnownBundleCids: (s) => {
        this.knownBundleCids = s;
      },
      // Last-loaded snapshot
      getLastLoadedData: () => this.lastLoadedData,
      setLastLoadedData: (d) => {
        this.lastLoadedData = d;
      },
      getLastLoadedFromBundleCids: () => this.lastLoadedFromBundleCids,
      setLastLoadedFromBundleCids: (s) => {
        this.lastLoadedFromBundleCids = s;
      },
      getLastTokenManifest: () => this.lastTokenManifest,
      setLastTokenManifest: (m) => {
        this.lastTokenManifest = m;
      },
      // Address-scoped key prefix
      getAddressId: () => this.getAddressId(),
      // Logging / events
      log: (msg) => this.log(msg),
      emitEvent: (e) => this.emitEvent(e),
      buildErrorEvent: (type, err, code2) => this.buildErrorEvent(type, err, code2),
      // OrbitDB key helpers
      writeProfileKey: (key, value) => this.writeProfileKey(key, value),
      readProfileKey: (key) => this.readProfileKey(key),
      readProfileKeyJson: (key) => this.readProfileKeyJson(key),
      // Flush coordination
      flushToIpfs: () => this.flushScheduler.flushToIpfs(),
      refreshBaselineForMonotonicity: () => this.refreshBaselineForMonotonicity(),
      // TXF adapter helpers
      extractTokensFromTxfData: (data) => this.extractTokensFromTxfData(data),
      extractOperationalState: (data) => this.extractOperationalState(data),
      // Operational state persistence
      writeOrbitOperationalState: (opState) => this.writeOrbitOperationalState(opState),
      writeLocalDerivedCache: (opState) => this.writeLocalDerivedCache(opState),
      // Item #15 Phase C — dirty-signal entry point. The bundle index and
      // (future) lean-snapshot debounce wiring call this on any local
      // mutation. Today the implementation is a no-op stub: Phase C.2
      // wires a debounced FlushScheduler trigger here behind the
      // `features.fullProfileSnapshotSync` flag.
      notifyProfileDirty: () => this.notifyProfileDirty(),
      // Item #15 Phase D.1b — synchronous lean-snapshot publish for
      // FlushScheduler. Returns `null` when no `onProfileDirtyFlush`
      // callback is wired (legacy tests fall back to the bundle-CID
      // publish). Coordinates with the dirty-flush debouncer so we
      // don't double-publish.
      publishSnapshotIfWired: () => this.publishSnapshotIfWired(),
      // Item #15 Phase E follow-up — pull-side counterpart for the
      // periodic-poll and cold-start recovery paths in
      // LifecycleManager. Returns null when no factory closure is wired
      // (legacy tests); else fetches the CAR, parses as lean snapshot,
      // and dispatches per-writer JOIN through the host's applier.
      applySnapshotIfWired: (cid) => this.applySnapshotIfWired(cid),
      // Issue #239 — per-flush remote-durability verification entry
      // point for FlushScheduler. Delegates to LifecycleManager which
      // runs HEAD-verify + aggregator read-back legs in parallel and
      // throws on deadline. See ProfileTokenStorageHost.verifyFlushDurability.
      verifyFlushDurability: (bundleCid, snapshotCid, deadlineMs) => this.verifyFlushDurability(bundleCid, snapshotCid, deadlineMs)
    };
  }
  /**
   * Item #15 Phase C — central handler for "some profile state changed"
   * signals from per-writer mutations and JOIN-applied remote changes.
   *
   * Arms (or re-arms) a debounce timer. When the timer fires, the
   * host-injected `onProfileDirtyFlush` callback runs. Sphere wires
   * that callback to build a lean profile snapshot, pin it to IPFS,
   * and publish the CID via the aggregator pointer layer.
   *
   * Coalescing semantics:
   *   - Multiple notifyProfileDirty() calls within `dirtyFlushDebounceMs`
   *     coalesce into a single fire (last-one-wins on the timer reset).
   *   - A signal that arrives DURING an in-flight flush sets
   *     `dirtyFlushPending = true`. When the flush settles, the next
   *     debounce window is armed automatically so we don't lose the
   *     signal.
   *   - When `onProfileDirtyFlush` is absent (default during Phase C
   *     rollout), the timer still arms but the fire body is a no-op
   *     beyond the latch handling. This lets tests assert the wiring
   *     end-to-end without needing the full Sphere closure.
   *
   * Cancelled on shutdown — see {@link cancelDirtyFlushTimer} (invoked
   * by the lifecycle manager's shutdown path).
   *
   * Wired into:
   *   - BundleIndex.addBundle / joinSnapshot (this provider's bundle ref)
   *   - OutboxWriter / SentLedgerWriter / PrefixSyncWriter (via their own
   *     notifyProfileDirty callbacks plumbed by ProfileStorageProvider)
   *   - OrbitDb{Finalization,RecipientContext}StorageAdapter writeKey /
   *     deleteKey paths
   *
   * Public so the factory's bridge from
   * `ProfileStorageProvider.setProfileDirtyNotifier` can delegate
   * here. The host's `notifyProfileDirty` (used by internal sub-modules
   * like BundleIndex) routes through the same body via the host
   * interface.
   */
  notifyProfileDirty() {
    if (this.isShuttingDown || this.hasShutdown) return;
    if (this.dirtyFlushPromise !== null) {
      this.dirtyFlushPending = true;
      return;
    }
    if (this.dirtyFlushTimer !== null) {
      clearTimeout(this.dirtyFlushTimer);
    }
    this.dirtyFlushTimer = setTimeout(() => {
      this.dirtyFlushTimer = null;
      this.dispatchDirtyFlush();
    }, this.dirtyFlushDebounceMs);
  }
  /**
   * Item #15 Phase C.2 — invoke the host-injected
   * `onProfileDirtyFlush` callback (if wired). Errors are caught and
   * surfaced via `storage:error` with a typed code; they never
   * propagate into the caller's path because the dirty signal is
   * best-effort by design.
   *
   * If another `notifyProfileDirty()` arrived while this flush was
   * running, re-arm the debounce so the next signal isn't lost.
   */
  dispatchDirtyFlush() {
    if (this.isShuttingDown) return;
    const callback = this.options?.onProfileDirtyFlush;
    if (typeof callback !== "function") {
      this.consumePendingDirtyFlag();
      return;
    }
    const flush = (async () => {
      try {
        await callback();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.log(`onProfileDirtyFlush failed: ${msg}`);
        this.emitEvent(
          this.buildErrorEvent(
            "storage:error",
            err,
            "PROFILE_DIRTY_FLUSH_FAILED"
          )
        );
      }
    })().finally(() => {
      if (this.dirtyFlushPromise === flush) {
        this.dirtyFlushPromise = null;
      }
      this.consumePendingDirtyFlag();
    });
    this.dirtyFlushPromise = flush;
  }
  /**
   * Item #15 Phase C.2 — if a notifyProfileDirty() call arrived
   * during the just-completed flush, re-arm the debounce so we don't
   * lose the signal. Called from the dispatch path's `.finally`.
   */
  consumePendingDirtyFlag() {
    if (!this.dirtyFlushPending) return;
    this.dirtyFlushPending = false;
    if (this.isShuttingDown) return;
    this.notifyProfileDirty();
  }
  /**
   * Cancel any armed dirty-flush debounce timer. Called by the
   * lifecycle manager during shutdown to prevent late-firing
   * callbacks after the provider has been torn down.
   *
   * Does NOT abort an in-flight `dirtyFlushPromise` — the lifecycle
   * manager awaits that separately via the host.
   */
  cancelDirtyFlushTimer() {
    if (this.dirtyFlushTimer !== null) {
      clearTimeout(this.dirtyFlushTimer);
      this.dirtyFlushTimer = null;
    }
    this.dirtyFlushPending = false;
  }
  /**
   * Item #15 Phase C.2 — await the most recent dirty-flush dispatch
   * if one is in flight. Returns immediately when no flush is active.
   * Used by `shutdown()` and tests.
   */
  awaitDirtyFlushSettled() {
    return this.dirtyFlushPromise ?? Promise.resolve();
  }
  /**
   * Item #15 Phase D.1b — synchronously invoke the wired
   * `onProfileDirtyFlush` callback (lean-snapshot build + pin +
   * publish) for the FlushScheduler. Replaces the legacy bundle-CID
   * publish at the end of `flushToIpfs()` when a snapshot publisher
   * is wired.
   *
   * Semantics:
   *   - Returns `null` when no `onProfileDirtyFlush` callback is
   *     configured (legacy tests / providers without the Phase C.3
   *     closure). Caller (FlushScheduler) falls back to legacy
   *     bundle-CID publish via `LifecycleManager.publishAggregator
   *     PointerBestEffort()`.
   *   - Cancels any armed dirty-flush debounce timer so the
   *     debouncer doesn't separately fire a redundant publish for
   *     the same writer-side mutations that triggered this flush.
   *   - Awaits any in-flight `dirtyFlushPromise` so concurrent
   *     dispatches serialize. The `dirtyFlushPending` latch is
   *     cleared after our run so a follow-up `notifyProfileDirty()`
   *     (arriving during this synchronous fire) re-arms cleanly.
   *   - Tracks our own run as `dirtyFlushPromise` so a concurrent
   *     `notifyProfileDirty()` observes us as in-flight and latches
   *     `dirtyFlushPending` instead of starting a parallel fire.
   *   - On success: returns the publisher's structured
   *     `ProfileSnapshotPublishResult`. A `void` return from the
   *     callback (legacy `() => Promise<void>` shape) is normalised
   *     to `{ ok: true, transient: false }`.
   *   - On throw (programmer error, snapshot-build failure, etc.):
   *     emits `storage:error` with code `PROFILE_DIRTY_FLUSH_FAILED`
   *     (matching the debouncer's surfacing contract) and re-throws
   *     so FlushScheduler can propagate to `forceFlushSerialized`'s
   *     rejection arm. Issue #241: transient publish failures
   *     (e.g., aggregator replica lag) are NOT surfaced as throws —
   *     `publishAggregatorPointerBestEffort` returns a structured
   *     `{ ok: false, transient: true }` result. FlushScheduler emits
   *     `storage:pending-publish` and lets the flush succeed. Only
   *     non-publish exceptions (e.g., snapshot construction errors)
   *     reach this catch arm.
   *
   * The shutdown gate (`isShuttingDown` / `hasShutdown`) returns
   * `null` so a flush mid-shutdown skips the snapshot publish
   * entirely (the lifecycle's shutdown sequence drains the existing
   * dirty-flush promise separately).
   */
  async publishSnapshotIfWired() {
    if (this.isShuttingDown || this.hasShutdown) return null;
    const callback = this.options?.onProfileDirtyFlush;
    if (typeof callback !== "function") return null;
    if (this.dirtyFlushTimer !== null) {
      clearTimeout(this.dirtyFlushTimer);
      this.dirtyFlushTimer = null;
    }
    if (this.dirtyFlushPromise !== null) {
      try {
        await this.dirtyFlushPromise;
      } catch {
      }
    }
    this.dirtyFlushPending = false;
    const flushBody = (async () => {
      const result = await callback();
      return result ?? { ok: true, transient: false };
    })();
    const tracked = flushBody.then(
      () => void 0,
      () => void 0
    );
    this.dirtyFlushPromise = tracked;
    try {
      return await flushBody;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log(`publishSnapshotIfWired (synchronous fire) failed: ${msg}`);
      this.emitEvent(
        this.buildErrorEvent(
          "storage:error",
          err,
          "PROFILE_DIRTY_FLUSH_FAILED"
        )
      );
      throw err;
    } finally {
      if (this.dirtyFlushPromise === tracked) {
        this.dirtyFlushPromise = null;
      }
      if (this.dirtyFlushPending && !this.isShuttingDown && !this.hasShutdown) {
        this.dirtyFlushPending = false;
        this.notifyProfileDirty();
      }
    }
  }
  /**
   * Item #15 Phase E follow-up — late-bound pull-side snapshot applier.
   * Falls back to `options.onApplySnapshot` (construction-time) if
   * never set; otherwise the most recent registration wins. Set by
   * the factory after `tokenStorage` has been constructed so the
   * closure can reference `tokenStorage.getBundleIndex()` (which would
   * otherwise be a forward reference at construction time).
   */
  applySnapshotCallback = null;
  /**
   * Item #15 Phase E follow-up — install / replace the pull-side
   * snapshot applier. Idempotent: callers MAY re-register; pass `null`
   * to disable.
   *
   * Used by `profile/factory.ts:createProfileProviders` to install the
   * closure that backs `applySnapshotIfWired()` — the closure
   * references `tokenStorage.getBundleIndex()` so it must be set AFTER
   * the provider is constructed (forward-reference at construction
   * time).
   */
  setApplySnapshotCallback(callback) {
    this.applySnapshotCallback = callback;
  }
  /**
   * Item #15 Phase E follow-up — pull-side counterpart to
   * {@link publishSnapshotIfWired}. Invokes the host-injected applier
   * (if wired) for the given snapshot CID.
   *
   * Returns `null` when no factory closure is wired (legacy tests /
   * providers without the Phase E follow-up factory closure). On a
   * wired path the callback fetches the CAR, parses it as a lean
   * snapshot, and dispatches per-writer JOIN through the same
   * `runProfileSnapshotApply` closure that backs the pointer-wiring
   * layer's reconcile path. Errors propagate to the caller so the
   * periodic-poll / recovery wrapper can log + skip the re-arm.
   *
   * The shutdown gate returns `null` so a poll iteration mid-shutdown
   * skips the apply entirely. The lifecycle's shutdown sequence runs
   * its own teardown ordering; this method only declines to do new
   * work after the gate has closed.
   */
  async applySnapshotIfWired(cidString) {
    if (this.isShuttingDown || this.hasShutdown) return null;
    const callback = this.applySnapshotCallback ?? this.options?.onApplySnapshot ?? null;
    if (typeof callback !== "function") return null;
    return callback(cidString);
  }
  // ---------------------------------------------------------------------------
  // BaseProvider
  // ---------------------------------------------------------------------------
  async connect() {
    await this.initialize();
  }
  async disconnect() {
    await this.shutdown();
  }
  isConnected() {
    return this.status === "connected";
  }
  getStatus() {
    return this.status;
  }
  // ---------------------------------------------------------------------------
  // Identity
  // ---------------------------------------------------------------------------
  setIdentity(identity) {
    this.lifecycleManager.setIdentity(identity);
  }
  /**
   * Item #15 Phase C.3 — public read accessor for the bound identity.
   * Returns `null` until {@link setIdentity} has been called.
   *
   * Exposed for host wiring (factory's `onProfileDirtyFlush` closure)
   * that needs the wallet's `chainPubkey` to build a lean profile
   * snapshot. The closure must tolerate `null` (snapshot build is
   * skipped pre-identity).
   */
  getIdentity() {
    return this.identity;
  }
  /**
   * Item #15 Phase D.1a — public delegate for publishing a lean
   * snapshot CID via the aggregator pointer layer. Routes through
   * `LifecycleManager.publishAggregatorPointerBestEffort` so the
   * publish picks up:
   *   - pending-publish-marker persistence on transient failure;
   *   - permanent-vs-transient error classification;
   *   - `storage:error` emission on permanent failure;
   *   - automatic retry on the next `flushToIpfs` / pointer-poll cycle.
   *
   * Exposed for the factory's `onProfileDirtyFlush` closure (Phase D.1a)
   * and the flush-scheduler's snapshot-publish call site (Phase D.1b).
   * Direct callers should treat the result as authoritative — the
   * publish has either landed, deferred for retry, or surfaced an
   * operator alert. The `ProfileSnapshotPublishResult` shape matches
   * the underlying lifecycle method 1:1.
   */
  publishLeanSnapshotCid(cidString) {
    return this.lifecycleManager.publishAggregatorPointerBestEffort(cidString);
  }
  /**
   * Issue #239 — host-surface entry point for the per-flush remote-
   * durability verification gate. Delegates to
   * `LifecycleManager.verifyFlushDurability`. Exposed via the
   * `ProfileTokenStorageHost` interface so FlushScheduler can call it
   * AFTER pin + publish complete; throws on verification failure so
   * `forceFlushSerialized`'s rejection arm propagates the failure to
   * `awaitNextFlush` and the at-least-once gate refuses the Nostr ack.
   * See `ProfileTokenStorageHost.verifyFlushDurability` for the
   * contract.
   */
  verifyFlushDurability(bundleCid, snapshotCid, deadlineMs) {
    return this.lifecycleManager.verifyFlushDurability(
      bundleCid,
      snapshotCid,
      deadlineMs
    );
  }
  /**
   * Item #15 Phase D.2 — public accessor for the wallet-global
   * {@link BundleIndex}. Exposed so the factory's pull-side dispatcher
   * (`runProfileSnapshotJoin`) can dispatch JOIN over the
   * `tokens.bundle.*` slice of a remote lean snapshot. BundleIndex
   * implements {@link ProfileSyncWriter} and owns the
   * encrypted-envelope read/write contract for bundle refs.
   *
   * The handle remains owned by the provider — callers MUST NOT cache
   * it across `shutdown()`/`destroy()` cycles. Returns `null` only if
   * the provider has been torn down (today the field is non-null after
   * construction).
   */
  getBundleIndex() {
    return this.bundleIndex ?? null;
  }
  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------
  async initialize() {
    await this.restorePendingPublishCidFromCache();
    return this.lifecycleManager.initialize(
      () => this.handleReplication(),
      () => this.onPollDiscoveredNewCid()
    );
  }
  async shutdown(options) {
    this.cancelDirtyFlushTimer();
    try {
      await this.awaitDirtyFlushSettled();
    } catch {
    }
    await this.lifecycleManager.shutdown(options);
    this.hasShutdown = true;
  }
  /**
   * TokenStorageProvider.awaitNextFlush — force pending writes to durably
   * persist (IPFS pin + OrbitDB ref + aggregator pointer) and wait for
   * completion. Used by PaymentsModule.handleIncomingTransfer to gate
   * the Nostr `since`-filter advancement on real IPFS durability.
   *
   * Pattern mirrors `LifecycleManager.shutdown`'s flush sequence
   * (cancel debounce → await in-flight → flush remaining pending),
   * but as a re-callable method that does NOT teardown the provider.
   *
   * Loops to handle the case where a concurrent save() lands during
   * an in-flight flush: that save's data sits in pendingData; we run
   * another flush to capture it. Bounded by `timeoutMs`.
   *
   * Rejects via SphereError('TIMEOUT') if pending writes can't drain
   * within the budget — caller treats this as "NOT durable" → don't
   * advance Nostr `since` → re-replay on next reconnect (idempotent
   * via addToken stateHash dedup).
   *
   * @param timeoutMs Max wall-clock time. Default 30s.
   */
  async awaitNextFlush(timeoutMs = 3e4) {
    if (!this.initialized || !this.encryptionKey) return;
    const deadline = Date.now() + timeoutMs;
    const remainingMs = () => Math.max(0, deadline - Date.now());
    let monotonicityRetried = false;
    for (let iteration = 0; iteration < 4; iteration++) {
      const timer = this.flushTimer;
      if (timer !== null) {
        clearTimeout(timer);
        this.flushTimer = null;
      }
      if (this.pendingData === null && this.flushPromise === null) return;
      const chained = this.flushScheduler.forceFlushSerialized();
      try {
        await Promise.race([
          chained,
          new Promise(
            (_, reject) => setTimeout(
              () => reject(
                new SphereError(
                  "awaitNextFlush: timeout awaiting serialized flush",
                  "TIMEOUT"
                )
              ),
              remainingMs()
            )
          )
        ]);
      } catch (err) {
        if (err instanceof SphereError && err.code === "TIMEOUT") throw err;
        const code2 = err.code;
        if (code2 === "POINTER_MONOTONICITY_VIOLATION" && !monotonicityRetried) {
          monotonicityRetried = true;
          this.log(
            `awaitNextFlush: POINTER_MONOTONICITY_VIOLATION \u2014 refreshing baseline and retrying flush once`
          );
          const refreshed = await this.refreshBaselineForMonotonicity();
          if (!refreshed) {
            this.log(
              `awaitNextFlush: baseline refresh failed \u2014 propagating violation`
            );
            throw err;
          }
          continue;
        }
        throw err;
      }
      if (this.pendingData === null) return;
    }
    throw new SphereError(
      "awaitNextFlush: pendingData kept regenerating across 4 flush iterations",
      "TIMEOUT"
    );
  }
  // ---------------------------------------------------------------------------
  // save() -- Write-behind buffer
  // ---------------------------------------------------------------------------
  async save(data) {
    const timestamp = Date.now();
    if (!this.initialized || !this.encryptionKey) {
      return { success: false, error: "Provider not initialized", timestamp };
    }
    this.emitEvent({ type: "storage:saving", timestamp });
    this.lastLoadedData = data;
    this.flushScheduler.enqueueSave(data);
    this.emitEvent({ type: "storage:saved", timestamp, data: { debounced: true } });
    return { success: true, timestamp };
  }
  // ---------------------------------------------------------------------------
  // load() -- Multi-bundle merge
  // ---------------------------------------------------------------------------
  async load(_identifier) {
    const timestamp = Date.now();
    if (!this.initialized || !this.encryptionKey) {
      return {
        success: false,
        error: "Provider not initialized",
        source: "local",
        timestamp
      };
    }
    if (this.pendingData) {
      return {
        success: true,
        data: this.pendingData,
        source: "cache",
        timestamp
      };
    }
    if (this.flushPromise) {
      try {
        await this.flushPromise;
      } catch {
      }
    }
    this.emitEvent({ type: "storage:loading", timestamp });
    try {
      const activeBundles = await this.bundleIndex.listActiveBundles();
      if (activeBundles.size === 0) {
        const emptyData = this.buildEmptyTxfData();
        this.lastLoadedData = emptyData;
        this.lastLoadedFromBundleCids = /* @__PURE__ */ new Set();
        this.emitEvent({ type: "storage:loaded", timestamp: Date.now() });
        return {
          success: true,
          data: emptyData,
          source: "remote",
          timestamp: Date.now()
        };
      }
      const { UxfPackage: UxfPackage2 } = await Promise.resolve().then(() => (init_UxfPackage(), UxfPackage_exports));
      const mergedPkg = UxfPackage2.create();
      const loadedBundles = [];
      for (const [cid] of activeBundles) {
        try {
          const carBytes = await fetchCarFromIpfs(
            this._ipfsGateways,
            cid,
            void 0,
            void 0,
            this.db.getHelia?.()
          );
          const pkg = await UxfPackage2.fromCar(carBytes);
          loadedBundles.push({ cid, pkg });
        } catch (err) {
          this.log(`Failed to load bundle ${cid}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      let verifiedProofs = void 0;
      const verifyInclusionProof = this.options?.oracle?.verifyInclusionProof;
      if (verifyInclusionProof && loadedBundles.length >= 2) {
        try {
          const accum = /* @__PURE__ */ new Set();
          for (let i = 0; i < loadedBundles.length; i++) {
            for (let j = i + 1; j < loadedBundles.length; j++) {
              const pairwise = await loadedBundles[i].pkg.computeVerifiedProofs(
                loadedBundles[j].pkg,
                (input) => verifyInclusionProof.call(this.options.oracle, input)
              );
              for (const h of pairwise) accum.add(h);
            }
          }
          verifiedProofs = accum;
          this.log(
            `JOIN: computed verifiedProofs across ${loadedBundles.length} bundles (${accum.size} proof element(s) verified)`
          );
        } catch (err) {
          this.log(
            `JOIN: computeVerifiedProofs failed (Rule 4 enrichment skipped): ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
      for (const { cid, pkg } of loadedBundles) {
        try {
          mergedPkg.merge(pkg, verifiedProofs ? { verifiedProofs } : void 0);
        } catch (err) {
          this.log(`Failed to merge bundle ${cid}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      try {
        this.lastTokenManifest = deriveStructuralManifest(mergedPkg);
      } catch (err) {
        this.log(`Token manifest derivation failed: ${err instanceof Error ? err.message : String(err)}`);
        this.lastTokenManifest = /* @__PURE__ */ new Map();
      }
      const assembledTokens = mergedPkg.assembleAll();
      const opState = await this.readOperationalState();
      const txfData = this.buildTxfStorageData(assembledTokens, opState);
      const cacheIsEmpty = opState.tombstones.length === 0 && opState.sent.length === 0 && opState.history.length === 0;
      if (cacheIsEmpty && assembledTokens.size > 0) {
        const rebuilt = await this.rebuildDerivedCache(txfData);
        if (rebuilt.tombstones.length > 0) txfData._tombstones = rebuilt.tombstones;
        if (rebuilt.sent.length > 0) txfData._sent = rebuilt.sent;
        if (rebuilt.history.length > 0) txfData._history = rebuilt.history;
      }
      this.lastLoadedData = txfData;
      this.lastLoadedFromBundleCids = new Set(activeBundles.keys());
      this.emitEvent({ type: "storage:loaded", timestamp: Date.now() });
      return {
        success: true,
        data: txfData,
        source: "remote",
        timestamp: Date.now()
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.emitEvent(this.buildErrorEvent("storage:error", err));
      return {
        success: false,
        error: errorMsg,
        source: "remote",
        timestamp: Date.now()
      };
    }
  }
  // ---------------------------------------------------------------------------
  // sync()
  // ---------------------------------------------------------------------------
  async sync(localData) {
    if (!this.initialized || !this.encryptionKey) {
      return { success: false, added: 0, removed: 0, conflicts: 0, error: "Provider not initialized" };
    }
    this.emitEvent({ type: "sync:started", timestamp: Date.now() });
    try {
      const previousCids = new Set(this.knownBundleCids);
      try {
        await this.lifecycleManager.triggerPointerPollNow();
      } catch (err) {
        this.log(
          `sync: aggregator pointer poll failed (best-effort): ${err instanceof Error ? err.message : String(err)}`
        );
      }
      await this.bundleIndex.refreshKnownBundles();
      const newCids = [];
      for (const cid of this.knownBundleCids) {
        if (!previousCids.has(cid)) {
          newCids.push(cid);
        }
      }
      const removedCids = [];
      for (const cid of previousCids) {
        if (!this.knownBundleCids.has(cid)) {
          removedCids.push(cid);
        }
      }
      const coldStartLoadNeeded = this.lastLoadedData === null && this.knownBundleCids.size > 0;
      if (coldStartLoadNeeded && this.coldStartSyncPromise !== null) {
        return await this.coldStartSyncPromise;
      }
      if (newCids.length === 0 && removedCids.length === 0 && !coldStartLoadNeeded) {
        this.emitEvent({ type: "sync:completed", timestamp: Date.now() });
        return {
          success: true,
          merged: localData,
          added: 0,
          removed: 0,
          conflicts: 0
        };
      }
      const computeResult = async () => {
        const loadResult = await this.load();
        if (!loadResult.success || !loadResult.data) {
          return {
            success: false,
            added: newCids.length,
            removed: removedCids.length,
            conflicts: 0,
            error: loadResult.error ?? "Failed to load merged data"
          };
        }
        const localTokenIds = new Set(this.extractTokenIds(localData));
        const remoteTokenIds = new Set(this.extractTokenIds(loadResult.data));
        let added = 0;
        let removed = 0;
        for (const id of remoteTokenIds) {
          if (!localTokenIds.has(id)) added++;
        }
        for (const id of localTokenIds) {
          if (!remoteTokenIds.has(id)) removed++;
        }
        this.emitEvent({
          type: "sync:completed",
          timestamp: Date.now(),
          data: { added, removed, newBundles: newCids.length }
        });
        return {
          success: true,
          merged: loadResult.data,
          added,
          removed,
          conflicts: 0
        };
      };
      if (coldStartLoadNeeded) {
        const inflight = computeResult();
        this.coldStartSyncPromise = inflight;
        try {
          return await inflight;
        } finally {
          if (this.coldStartSyncPromise === inflight) {
            this.coldStartSyncPromise = null;
          }
        }
      }
      return await computeResult();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.emitEvent(this.buildErrorEvent("sync:error", err));
      return { success: false, added: 0, removed: 0, conflicts: 0, error: errorMsg };
    }
  }
  // ---------------------------------------------------------------------------
  // Optional TokenStorageProvider methods
  // ---------------------------------------------------------------------------
  async exists(_identifier) {
    if (!this.initialized || !this.db.isConnected()) return false;
    try {
      const bundles = await this.db.all(BUNDLE_KEY_PREFIX);
      return bundles.size > 0;
    } catch {
      return false;
    }
  }
  async clear() {
    if (!this.initialized) return false;
    try {
      const allBundles = await this.db.all(BUNDLE_KEY_PREFIX);
      for (const key of allBundles.keys()) {
        await this.db.del(key);
      }
      const addr = this.getAddressId();
      const opKeys = [
        `${addr}.tombstones`,
        `${addr}.outbox`,
        `${addr}.sent`,
        `${addr}.invalid`,
        `${addr}.history`,
        `${addr}.transactionHistory`,
        `${addr}.mintOutbox`,
        `${addr}.invalidatedNametags`
      ];
      for (const key of opKeys) {
        try {
          await this.db.del(key);
        } catch {
        }
      }
      this.knownBundleCids.clear();
      this.pendingData = null;
      this.lastLoadedData = null;
      this.lastLoadedFromBundleCids = null;
      return true;
    } catch (err) {
      this.log(`clear() failed: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }
  /**
   * Return the latest **structural** token manifest derived during
   * load(). Returns null if no load has completed yet.
   *
   * Structural-only: entries carry `status ∈ {'valid', 'conflicting'}`.
   * Oracle-based status (spent, pending, invalid) is produced by a
   * future higher-layer enrichment pass. See PROFILE-ARCHITECTURE.md
   * §10.2.2 and §10.6, and profile/token-manifest.ts for details.
   */
  getTokenManifest() {
    return this.lastTokenManifest;
  }
  createForAddress(addressId) {
    const resolvedAddressId = addressId ?? this.getAddressId();
    const options = this._options ? { ...this._options, addressId: resolvedAddressId } : void 0;
    return new _ProfileTokenStorageProvider(
      this._db,
      this._encryptionKeyRaw,
      this._ipfsGateways,
      options,
      this.localCache
    );
  }
  // ---------------------------------------------------------------------------
  // Event system
  // ---------------------------------------------------------------------------
  onEvent(callback) {
    this.eventCallbacks.add(callback);
    return () => {
      this.eventCallbacks.delete(callback);
    };
  }
  // ---------------------------------------------------------------------------
  // History operations — delegated to HistoryStore
  // ---------------------------------------------------------------------------
  async addHistoryEntry(entry) {
    return this.historyStore.addHistoryEntry(entry);
  }
  async getHistoryEntries() {
    return this.historyStore.getHistoryEntries();
  }
  async hasHistoryEntry(dedupKey) {
    return this.historyStore.hasHistoryEntry(dedupKey);
  }
  async clearHistory() {
    return this.historyStore.clearHistory();
  }
  async importHistoryEntries(entries) {
    return this.historyStore.importHistoryEntries(entries);
  }
  // ===========================================================================
  // Private: BundleIndex back-channels (preserved for tests that reach into
  // the facade via `(provider as unknown as { addBundle: ... }).addBundle`).
  //
  // These shims preserve the pre-refactor private surface byte-for-byte —
  // the facade keeps the same private method names, with the implementation
  // delegated to `BundleIndex`. SDK consumers MUST go through the public
  // API; these are documented as test-only back-channels.
  // ===========================================================================
  async addBundle(cid, ref) {
    return this.bundleIndex.addBundle(cid, ref);
  }
  async listBundles() {
    return this.bundleIndex.listBundles();
  }
  async listActiveBundles() {
    return this.bundleIndex.listActiveBundles();
  }
  async refreshKnownBundles() {
    return this.bundleIndex.refreshKnownBundles();
  }
  async shouldConsolidate() {
    return this.bundleIndex.shouldConsolidate();
  }
  // ===========================================================================
  // Private: TXF adapter (extract / build)
  // ===========================================================================
  /**
   * Extract token entries from TxfStorageDataBase.
   * Token keys include:
   * - Keys starting with `_` (standard tokens, excluding operational keys)
   * - Keys starting with `archived-` (archived tokens)
   * - Keys starting with `_forked_` (forked tokens — also caught by `_` prefix)
   */
  extractTokensFromTxfData(data) {
    const tokens = /* @__PURE__ */ new Map();
    for (const key of Object.keys(data)) {
      if (!isTokenKey(key) && !isArchivedKey(key) && !isForkedKey(key)) continue;
      const value = data[key];
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const candidate = value;
      if (!candidate.genesis || typeof candidate.genesis !== "object") {
        logger.warn("Profile", `extractTokensFromTxfData: skipping malformed token at key="${key}" (no genesis field)`);
        continue;
      }
      tokens.set(key, value);
    }
    return tokens;
  }
  /**
   * Extract operational state from TxfStorageDataBase.
   */
  extractOperationalState(data) {
    return {
      tombstones: data._tombstones ?? [],
      outbox: data._outbox ?? [],
      sent: data._sent ?? [],
      invalid: data._invalid ?? [],
      history: data._history ?? [],
      mintOutbox: data._mintOutbox ?? [],
      invalidatedNametags: data._invalidatedNametags ?? [],
      audit: data._audit ?? [],
      finalizationQueue: data._finalizationQueue ?? []
    };
  }
  /**
   * Build a TxfStorageDataBase from assembled tokens and operational state.
   */
  buildTxfStorageData(tokens, opState) {
    const meta = {
      version: 1,
      address: this.getAddressId(),
      formatVersion: "1.0.0",
      updatedAt: Date.now()
    };
    const result = {
      _meta: meta
    };
    if (opState.tombstones.length > 0) result._tombstones = opState.tombstones;
    if (opState.outbox.length > 0) result._outbox = opState.outbox;
    if (opState.sent.length > 0) result._sent = opState.sent;
    if (opState.invalid.length > 0) result._invalid = opState.invalid;
    if (opState.history.length > 0) result._history = opState.history;
    if (opState.mintOutbox.length > 0) {
      result._mintOutbox = opState.mintOutbox;
    }
    if (opState.invalidatedNametags.length > 0) {
      result._invalidatedNametags = opState.invalidatedNametags;
    }
    if (opState.audit.length > 0) result._audit = opState.audit;
    if (opState.finalizationQueue.length > 0) {
      result._finalizationQueue = opState.finalizationQueue;
    }
    for (const [tokenId, tokenData] of tokens) {
      const key = tokenId.startsWith("_") ? tokenId : `_${tokenId}`;
      result[key] = tokenData;
    }
    return result;
  }
  /**
   * Build an empty TxfStorageDataBase with just _meta.
   */
  buildEmptyTxfData() {
    return {
      _meta: {
        version: 1,
        address: this.getAddressId(),
        formatVersion: "1.0.0",
        updatedAt: Date.now()
      }
    };
  }
  // ===========================================================================
  // Private: Operational state persistence
  // ===========================================================================
  /**
   * Write the SYNCED portion of operational state to OrbitDB.
   *
   * Keys written: outbox, invalid, mintOutbox, invalidatedNametags.
   * These are authoritative across all Sphere instances sharing the
   * wallet identity.
   *
   * `tombstones`, `sent`, and `history` are NOT written here — they go
   * to the local-only cache via `writeLocalDerivedCache()`. See
   * PROFILE-ARCHITECTURE.md §10 (Q1 decision) for rationale.
   */
  async writeOrbitOperationalState(opState) {
    const addr = this.getAddressId();
    return this.writeOrbitOperationalStatePerEntry(opState, addr);
  }
  /**
   * Wave G.7: per-entry-key write path. See readOrbitOperationalState
   * for layout description. Diffs the in-memory `opState` against
   * the on-disk per-entry view and writes only the deltas:
   *   - new/modified entries → put `${prefix}.${id}` = JSON(entry)
   *   - removed entries → put `${prefix}.${id}` = JSON({ tombstoned: true, deletedAt })
   *
   * Tombstones are retained for `TOMBSTONE_RETENTION_MS` (30 days)
   * and then GC'd. This is best-effort — a long-offline device
   * coming back after >30 days could re-replicate a tombstoned
   * entry as if it were live; the hazard is bounded by the wallet's
   * tombstone retention policy and is acceptable given typical
   * online cadence.
   */
  async writeOrbitOperationalStatePerEntry(opState, addr) {
    const TOMBSTONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1e3;
    const now = Date.now();
    const liveOutbox = /* @__PURE__ */ new Map();
    for (const e of opState.outbox) {
      const id = e.id;
      if (typeof id === "string" && id.length > 0) liveOutbox.set(id, e);
    }
    const liveInvalid = /* @__PURE__ */ new Map();
    for (const e of opState.invalid) {
      const id = e.tokenId;
      if (typeof id === "string" && id.length > 0) liveInvalid.set(id, e);
    }
    const liveMint = /* @__PURE__ */ new Map();
    for (const e of opState.mintOutbox) {
      const id = e.tokenId;
      if (typeof id === "string" && id.length > 0) liveMint.set(id, e);
    }
    const liveAudit = /* @__PURE__ */ new Map();
    for (const e of opState.audit) {
      const id = e.id;
      if (typeof id === "string" && id.length > 0) liveAudit.set(id, e);
    }
    const liveFinalization = /* @__PURE__ */ new Map();
    for (const e of opState.finalizationQueue) {
      const id = e.id;
      if (typeof id === "string" && id.length > 0) liveFinalization.set(id, e);
    }
    let existingOutboxKeys;
    let existingInvalidKeys;
    let existingMintKeys;
    let existingAuditKeys;
    let existingFinalizationKeys;
    try {
      [
        existingOutboxKeys,
        existingInvalidKeys,
        existingMintKeys,
        existingAuditKeys,
        existingFinalizationKeys
      ] = await Promise.all([
        this.listExistingPerEntryKeys(`${addr}.outbox.`),
        this.listExistingPerEntryKeys(`${addr}.invalid.`),
        this.listExistingPerEntryKeys(`${addr}.mintOutbox.`),
        this.listExistingPerEntryKeys(`${addr}.audit.`),
        this.listExistingPerEntryKeys(`${addr}.finalizationQueue.`)
      ]);
    } catch (err) {
      this.log(
        `writeOrbitOperationalStatePerEntry: existing-keys listing failed; aborting flush to avoid lossy convergence: ${err instanceof Error ? err.message : String(err)}`
      );
      this.emitEvent(this.buildErrorEvent("storage:error", err));
      return;
    }
    await this.applyPerEntryDiff(
      `${addr}.outbox.`,
      liveOutbox,
      existingOutboxKeys,
      now,
      TOMBSTONE_RETENTION_MS,
      /* skipForeignSchema */
      true
    );
    await this.applyPerEntryDiff(
      `${addr}.invalid.`,
      liveInvalid,
      existingInvalidKeys,
      now,
      TOMBSTONE_RETENTION_MS,
      // G2 — DispositionWriter owns `_invalid` records under the same
      // prefix and stamps `_schemaVersion: 'uxf-1'` on every write. The
      // legacy `data._invalid` is a `TxfInvalidEntry[]` (no
      // `_schemaVersion`) while the DispositionWriter records carry the
      // discriminator. Without this flag, every legacy save() flush
      // tombstones the DispositionWriter records (forensic data loss).
      /* skipForeignSchema */
      true
    );
    await this.applyPerEntryDiff(
      `${addr}.mintOutbox.`,
      liveMint,
      existingMintKeys,
      now,
      TOMBSTONE_RETENTION_MS
    );
    await this.applyPerEntryDiff(
      `${addr}.audit.`,
      liveAudit,
      existingAuditKeys,
      now,
      TOMBSTONE_RETENTION_MS,
      // G1 — DispositionWriter owns `_audit` records under the same
      // prefix. See the `${addr}.invalid.` call above for full
      // rationale.
      /* skipForeignSchema */
      true
    );
    await this.applyPerEntryDiff(
      `${addr}.finalizationQueue.`,
      liveFinalization,
      existingFinalizationKeys,
      now,
      TOMBSTONE_RETENTION_MS,
      // G3 — recipient FinalizationQueue records (when persisted via
      // the OrbitDb-backed adapter) carry `_schemaVersion: 'uxf-1'`.
      // The legacy `data._finalizationQueue` is a
      // `TxfFinalizationQueueEntry[]` (no discriminator). Without this
      // flag every save() flush tombstones in-flight finalization
      // entries (cross-restart safety net erased).
      /* skipForeignSchema */
      true
    );
    try {
      await this.writeProfileKey(
        `${addr}.invalidatedNametags`,
        JSON.stringify(opState.invalidatedNametags)
      );
    } catch (err) {
      this.log(`Failed to write invalidatedNametags: ${err instanceof Error ? err.message : String(err)}`);
      this.emitEvent(this.buildErrorEvent("storage:error", err));
    }
    try {
      await this.writeProfileKey(
        `${addr}.tombstones`,
        JSON.stringify(opState.tombstones)
      );
    } catch (err) {
      this.log(
        `Failed to write tombstones: ${err instanceof Error ? err.message : String(err)}`
      );
      this.emitEvent(this.buildErrorEvent("storage:error", err));
    }
    for (const k of [
      `${addr}.outbox`,
      `${addr}.invalid`,
      `${addr}.mintOutbox`,
      `${addr}.audit`,
      `${addr}.finalizationQueue`
    ]) {
      try {
        const legacy = await this.db.get(k);
        if (legacy) await this.db.del(k);
      } catch {
      }
    }
  }
  /**
   * Wave G.7: list the on-disk per-entry keys with the given prefix.
   * Returns a Map<key, entryId> where entryId is the suffix after
   * the prefix. Used by the diff step to detect removals.
   */
  async listExistingPerEntryKeys(prefix) {
    const result = /* @__PURE__ */ new Map();
    const all = await this.db.all(prefix);
    for (const key of all.keys()) {
      if (!key.startsWith(prefix)) continue;
      const entryId = key.slice(prefix.length);
      if (entryId.length > 0) result.set(key, entryId);
    }
    return result;
  }
  /**
   * Wave G.7: apply the per-entry diff for one list:
   *   - For each live entry, write its key (idempotent: same content
   *     produces same OrbitDB OpLog hash, no spurious oplog growth).
   *   - For each on-disk entryId not in the live set, write a
   *     tombstone (or delete the entry+tombstone if its tombstone
   *     is older than retention).
   *
   * T.6.A: when `skipForeignSchema` is `true`, an existing value
   * carrying `_schemaVersion: 'uxf-1'` is NOT tombstoned by this writer
   * — it is owned by `OutboxWriter` and shares the same prefix. Used by
   * the outbox slot only; other slots pass `false` (the default).
   */
  async applyPerEntryDiff(prefix, liveById, existingKeys, now, retentionMs, skipForeignSchema = false) {
    for (const [id, entry] of liveById) {
      const key = `${prefix}${id}`;
      try {
        await this.writeProfileKey(key, JSON.stringify(entry));
      } catch (err) {
        this.log(`per-entry write ${key} failed: ${err instanceof Error ? err.message : String(err)}`);
        this.emitEvent(this.buildErrorEvent("storage:error", err));
      }
    }
    for (const [key, entryId] of existingKeys) {
      if (liveById.has(entryId)) continue;
      let existingRaw = null;
      try {
        existingRaw = await this.readProfileKey(key);
      } catch {
        existingRaw = null;
      }
      let isTombstone3 = false;
      let deletedAt = 0;
      let isForeignSchema = false;
      if (existingRaw !== null) {
        try {
          const parsed = JSON.parse(existingRaw);
          if (parsed !== null && typeof parsed === "object" && "tombstoned" in parsed && parsed.tombstoned === true) {
            isTombstone3 = true;
            const da = parsed.deletedAt;
            deletedAt = typeof da === "number" ? da : 0;
          } else if (skipForeignSchema && parsed !== null && typeof parsed === "object" && parsed._schemaVersion === "uxf-1") {
            isForeignSchema = true;
          }
        } catch {
        }
      }
      if (isForeignSchema) {
        continue;
      }
      if (isTombstone3) {
        if (deletedAt > 0 && now - deletedAt > retentionMs) {
          try {
            await this.db.del(key);
          } catch {
          }
        }
        continue;
      }
      try {
        await this.writeProfileKey(
          key,
          JSON.stringify({ tombstoned: true, deletedAt: now })
        );
      } catch (err) {
        this.log(`per-entry tombstone ${key} failed: ${err instanceof Error ? err.message : String(err)}`);
        this.emitEvent(this.buildErrorEvent("storage:error", err));
      }
    }
  }
  /**
   * Wave G.7 — legacy single-blob writer (preserved for reference;
   * unused after the per-entry migration).
   *
   * @deprecated kept only to allow reverting the per-entry path if
   * we hit unforeseen production issues. Not on any active code path.
   */
  async writeOrbitOperationalStateSingleBlob(opState) {
    const addr = this.getAddressId();
    const MAX_RMW_RETRIES = 3;
    const RMW_WALL_CLOCK_BUDGET_MS = 1e4;
    const rmwStart = Date.now();
    const localOutboxIds = new Set(opState.outbox.map((e) => e.id).filter((v) => v !== void 0));
    const localInvalidIds = new Set(opState.invalid.map((e) => e.tokenId).filter((v) => v !== void 0));
    const localMintIds = new Set(opState.mintOutbox.map((e) => e.tokenId).filter((v) => v !== void 0));
    const localTags = new Set(opState.invalidatedNametags);
    let attempt = 0;
    while (attempt <= MAX_RMW_RETRIES) {
      if (Date.now() - rmwStart > RMW_WALL_CLOCK_BUDGET_MS) {
        this.log(
          `writeOrbitOperationalState: wall-clock budget ${RMW_WALL_CLOCK_BUDGET_MS}ms exceeded after ${attempt} retries; surfacing storage:error and returning lossy.`
        );
        this.emitEvent(
          this.buildErrorEvent(
            "storage:error",
            new Error("writeOrbitOperationalState: convergence budget exhausted; entries may be lost until next flush")
          )
        );
        return;
      }
      const remainingBudget = () => Math.max(0, RMW_WALL_CLOCK_BUDGET_MS - (Date.now() - rmwStart));
      const raceWithBudget = async (p, label) => {
        const remaining = remainingBudget();
        if (remaining === 0) {
          throw new Error(`writeOrbitOperationalState: ${label} aborted; budget exhausted`);
        }
        let timer;
        const timeout = new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`writeOrbitOperationalState: ${label} timed out (budget ${remaining}ms)`)),
            remaining
          );
          if (typeof timer === "object" && timer !== null && "unref" in timer) {
            timer.unref();
          }
        });
        try {
          return await Promise.race([p, timeout]);
        } finally {
          if (timer !== void 0) clearTimeout(timer);
          p.then(
            () => void 0,
            () => void 0
          );
        }
      };
      let remote;
      try {
        remote = await raceWithBudget(this.readOperationalState(), "readOperationalState");
      } catch (err) {
        this.emitEvent(this.buildErrorEvent("storage:error", err));
        return;
      }
      const merged = {
        tombstones: opState.tombstones,
        sent: opState.sent,
        history: opState.history,
        outbox: mergeByPrimaryKey(remote.outbox, opState.outbox, "id"),
        invalid: mergeByPrimaryKey(remote.invalid, opState.invalid, "tokenId"),
        mintOutbox: mergeByPrimaryKey(remote.mintOutbox, opState.mintOutbox, "tokenId"),
        invalidatedNametags: Array.from(
          /* @__PURE__ */ new Set([
            ...remote.invalidatedNametags,
            ...opState.invalidatedNametags
          ])
        ),
        audit: mergeByPrimaryKey(remote.audit, opState.audit, "id"),
        finalizationQueue: mergeByPrimaryKey(
          remote.finalizationQueue,
          opState.finalizationQueue,
          "id"
        )
      };
      const writes = [
        [`${addr}.outbox`, merged.outbox],
        [`${addr}.invalid`, merged.invalid],
        [`${addr}.mintOutbox`, merged.mintOutbox],
        [`${addr}.invalidatedNametags`, merged.invalidatedNametags]
      ];
      let writeFailed = false;
      for (const [key, value] of writes) {
        try {
          await raceWithBudget(this.writeProfileKey(key, JSON.stringify(value)), `writeProfileKey(${key})`);
        } catch (err) {
          writeFailed = true;
          this.log(`Failed to write operational state key "${key}": ${err instanceof Error ? err.message : String(err)}`);
          this.emitEvent(this.buildErrorEvent("storage:error", err));
          break;
        }
      }
      if (writeFailed) return;
      let verify2;
      try {
        verify2 = await raceWithBudget(this.readOperationalState(), "verifyReadOperationalState");
      } catch (err) {
        this.emitEvent(this.buildErrorEvent("storage:error", err));
        return;
      }
      const verifyOutboxIds = new Set(verify2.outbox.map((e) => e.id));
      const verifyInvalidIds = new Set(verify2.invalid.map((e) => e.tokenId));
      const verifyMintIds = new Set(verify2.mintOutbox.map((e) => e.tokenId));
      const verifyTags = new Set(verify2.invalidatedNametags);
      const allPresent = Array.from(localOutboxIds).every((id) => verifyOutboxIds.has(id)) && Array.from(localInvalidIds).every((id) => verifyInvalidIds.has(id)) && Array.from(localMintIds).every((id) => verifyMintIds.has(id)) && Array.from(localTags).every((tag) => verifyTags.has(tag));
      if (allPresent) return;
      attempt++;
      if (attempt > MAX_RMW_RETRIES) {
        this.log(
          `writeOrbitOperationalState: divergence persisted after ${MAX_RMW_RETRIES} retries; surfacing storage:error \u2014 sibling-clobbered entries are lost until next flush.`
        );
        this.emitEvent(
          this.buildErrorEvent(
            "storage:error",
            new Error("writeOrbitOperationalState: convergence retries exhausted; entries may be lost until next flush")
          )
        );
        return;
      }
      await new Promise(
        (resolve) => setTimeout(resolve, 50 + Math.floor(Math.random() * 100))
      );
    }
  }
  /**
   * Write the LOCAL-ONLY derived cache (tombstones, sent, history) to
   * the injected StorageProvider. These views are per-device and MUST
   * NOT be replicated — a corrupt or malicious remote instance would
   * otherwise poison them everywhere simultaneously.
   *
   * **Atomicity**: all three fields are serialized into a single key
   * `deriver.{addressId}.all`. A crash or disk-full error between two
   * individual writes would otherwise leave the cache in an inconsistent
   * state that subsequent empty-checks would silently trust (since one
   * field being non-empty bypasses the rebuild).
   *
   * **Error surfacing**: a write failure emits a `storage:error` event
   * AND returns false, so callers can react (retry, degrade, alert).
   * Previously the failure was only logged — hiding corruption.
   *
   * If no local cache was injected, this is a no-op and the deriver
   * will rebuild from the token pool on next load.
   */
  async writeLocalDerivedCache(opState) {
    if (!this.localCache) return true;
    const addr = this.getAddressId();
    const key = `deriver.${addr}.all`;
    const payload = {
      tombstones: opState.tombstones,
      sent: opState.sent,
      history: opState.history
    };
    try {
      await this.localCache.set(key, JSON.stringify(payload));
      if (!this.legacyKeysCleaned) {
        this.legacyKeysCleaned = true;
        for (const legacy of [
          `deriver.${addr}.tombstones`,
          `deriver.${addr}.sent`,
          `deriver.${addr}.history`
        ]) {
          this.localCache.remove(legacy).catch((err) => {
            this.log(`Legacy cache cleanup failed for "${legacy}": ${err instanceof Error ? err.message : String(err)}`);
          });
        }
      }
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log(`Failed to write local derived cache "${key}": ${msg}`);
      this.emitEvent(this.buildErrorEvent("storage:error", err));
      return false;
    }
  }
  /**
   * Read SYNCED operational state from OrbitDB.
   */
  async readOrbitOperationalState() {
    const addr = this.getAddressId();
    const [
      outbox,
      invalid,
      mintOutbox,
      invalidatedNametagsLegacy,
      audit,
      finalizationQueue
    ] = await Promise.all([
      this.readPerEntryArrayLegacyOnly(
        `${addr}.outbox.`,
        `${addr}.outbox`
      ),
      this.readPerEntryArrayWithLegacyFallback(
        `${addr}.invalid.`,
        `${addr}.invalid`
      ),
      this.readPerEntryArrayWithLegacyFallback(
        `${addr}.mintOutbox.`,
        `${addr}.mintOutbox`
      ),
      this.readProfileKeyJson(`${addr}.invalidatedNametags`),
      this.readPerEntryArrayWithLegacyFallback(
        `${addr}.audit.`,
        `${addr}.audit`
      ),
      this.readPerEntryArrayWithLegacyFallback(
        `${addr}.finalizationQueue.`,
        `${addr}.finalizationQueue`
      )
    ]);
    return {
      outbox,
      invalid,
      mintOutbox,
      invalidatedNametags: invalidatedNametagsLegacy ?? [],
      audit,
      finalizationQueue
    };
  }
  /**
   * Wave G.7: per-entry-key reader with single-blob fallback.
   *
   * Iterates all OrbitDB keys with `prefix`, decodes each as a
   * tombstone or live entry, returns the live entries in
   * insertion-order-stable form. If no per-entry keys are found,
   * falls back to reading the single-blob `legacyBlobKey` for
   * backward compatibility with pre-G.7 wallets — the next write
   * will migrate the data forward.
   */
  async readPerEntryArrayWithLegacyFallback(prefix, legacyBlobKey) {
    let entries;
    try {
      entries = await this.db.all(prefix);
    } catch (err) {
      this.log(`per-entry read failed for prefix "${prefix}": ${err instanceof Error ? err.message : String(err)}`);
      const legacy = await this.readProfileKeyJson(legacyBlobKey);
      return legacy ?? [];
    }
    if (entries.size === 0) {
      const legacy = await this.readProfileKeyJson(legacyBlobKey);
      return legacy ?? [];
    }
    const out = [];
    const sortedKeys = [...entries.keys()].sort();
    for (const key of sortedKeys) {
      const decoded = await this.decodePerEntryValue(key);
      if (decoded === null) continue;
      out.push(decoded);
    }
    return out;
  }
  /**
   * T.6.A: shape-aware variant of {@link readPerEntryArrayWithLegacyFallback}
   * for the outbox prefix. The outbox per-entry-key namespace carries TWO
   * distinct on-disk shapes during the migration window:
   *
   *   - **legacy** `TxfOutboxEntry` (pre-T.6.A, no `_schemaVersion`)
   *   - **new** `UxfTransferOutboxEntry` (T.6.A, `_schemaVersion: 'uxf-1'`)
   *
   * The legacy-only reader filters out new-shape entries so the
   * {@link OperationalState.outbox} slot continues to carry exactly the
   * shape its consumers expect. New-shape entries are read via
   * `OutboxWriter.readAll()` (`profile/outbox-writer.ts`) on a separate
   * code path.
   *
   * The discriminator is presence of the literal `_schemaVersion: 'uxf-1'`.
   * Any other value (missing field, unrelated string) is treated as
   * legacy-shape — preserves backward compatibility for partial /
   * pre-migration entries.
   */
  async readPerEntryArrayLegacyOnly(prefix, legacyBlobKey) {
    let entries;
    try {
      entries = await this.db.all(prefix);
    } catch (err) {
      this.log(`per-entry read failed for prefix "${prefix}": ${err instanceof Error ? err.message : String(err)}`);
      const legacy = await this.readProfileKeyJson(legacyBlobKey);
      return legacy ?? [];
    }
    if (entries.size === 0) {
      const legacy = await this.readProfileKeyJson(legacyBlobKey);
      return legacy ?? [];
    }
    const out = [];
    const sortedKeys = [...entries.keys()].sort();
    for (const key of sortedKeys) {
      const decoded = await this.decodePerEntryValue(key);
      if (decoded === null) continue;
      if (decoded !== null && typeof decoded === "object" && decoded._schemaVersion === "uxf-1") {
        continue;
      }
      out.push(decoded);
    }
    return out;
  }
  /**
   * Wave G.7: decode a single per-entry value. Returns the entry
   * payload or `null` for a tombstoned / corrupt entry.
   *
   * Tombstone format: `{ tombstoned: true, deletedAt: number }`.
   * Live format: the entry value as JSON (same shape the legacy
   * single-blob array carried).
   */
  async decodePerEntryValue(key) {
    const raw2 = await this.readProfileKey(key);
    if (raw2 === null) return null;
    try {
      const parsed = JSON.parse(raw2);
      if (parsed !== null && typeof parsed === "object" && "tombstoned" in parsed && parsed.tombstoned === true) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
  /**
   * Read LOCAL-ONLY derived cache. Returns empty arrays if no cache
   * exists or no StorageProvider was injected. Callers that need a
   * populated cache should invoke `rebuildDerivedCache()` afterwards.
   *
   * Falls back to reading the pre-atomic legacy per-key layout on miss
   * so that caches written before the atomic migration continue to work
   * until their next rewrite.
   *
   * **Error rate-limiting**: at most one `storage:error` event is
   * emitted per call, even when multiple underlying reads fail.
   * Subscribers should not see an event flood when the cache is
   * globally corrupted.
   */
  async readLocalDerivedCache() {
    if (!this.localCache) {
      return { tombstones: [], sent: [], history: [] };
    }
    const addr = this.getAddressId();
    const failedKeys = [];
    const readSilent = async (key) => {
      try {
        const raw2 = await this.localCache.get(key);
        if (raw2 === null) return null;
        return JSON.parse(raw2);
      } catch (err) {
        this.log(`Failed to read local cache "${key}": ${err instanceof Error ? err.message : String(err)}`);
        failedKeys.push(key);
        return null;
      }
    };
    let result;
    const combined = await readSilent(`deriver.${addr}.all`);
    if (combined) {
      result = {
        tombstones: combined.tombstones ?? [],
        sent: combined.sent ?? [],
        history: combined.history ?? []
      };
    } else {
      const [tombRaw, sentRaw, histRaw] = await Promise.all([
        readSilent(`deriver.${addr}.tombstones`),
        readSilent(`deriver.${addr}.sent`),
        readSilent(`deriver.${addr}.history`)
      ]);
      result = {
        tombstones: tombRaw ?? [],
        sent: sentRaw ?? [],
        history: histRaw ?? []
      };
    }
    if (failedKeys.length > 0) {
      this.emitEvent({
        type: "storage:error",
        timestamp: Date.now(),
        error: `Local derived cache read failures: ${failedKeys.join(", ")}`,
        code: "LOCAL_CACHE_READ_FAILED",
        data: { failedKeys }
      });
    }
    return result;
  }
  /**
   * Read a JSON value from the local cache, returning null on miss or
   * parse failure. A parse failure is surfaced via `storage:error` so
   * it is not silently swallowed — corrupted cache data should be
   * visible to callers, not masked as "fresh device".
   *
   * This helper is used by non-derived-cache read paths that want the
   * per-call event semantics. The derived-cache read path in
   * `readLocalDerivedCache` uses its own rate-limited reader instead.
   */
  async readLocalJson(key) {
    if (!this.localCache) return null;
    try {
      const raw2 = await this.localCache.get(key);
      if (raw2 === null) return null;
      return JSON.parse(raw2);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log(`Failed to read local cache "${key}": ${msg}`);
      this.emitEvent(this.buildErrorEvent("storage:error", err, "LOCAL_CACHE_READ_FAILED"));
      return null;
    }
  }
  /**
   * Compose the per-address storage key for the pending-publish CID
   * marker. Per-address scoping is required because two derived
   * addresses on the same wallet have independent token pools and
   * independent pointer chains; sharing a single marker would let one
   * address's transient failure pollute another's retry state.
   */
  getPendingPublishCidKey() {
    const addr = this.getAddressId();
    return `${STORAGE_KEYS_GLOBAL.PROFILE_PENDING_PUBLISH_CID}_${addr}`;
  }
  /**
   * Persist the pending-publish CID marker to local cache. Called on
   * every mutation via `host.setPendingPublishCid`. Best-effort: a
   * failure leaves the in-memory state correct and the next mutation
   * retries. Crash-safety degrades to "best-effort"; an unwritten
   * marker means a process restart won't auto-retry, but the next
   * save-driven flush will re-derive the need to publish via the
   * baseline-staleness check.
   */
  async persistPendingPublishCid(cid) {
    if (!this.localCache) return;
    const key = this.getPendingPublishCidKey();
    if (!key) return;
    if (cid === null) {
      await this.localCache.remove(key);
    } else {
      await this.localCache.set(key, cid);
    }
  }
  /**
   * Load any previously-persisted pending-publish CID marker into the
   * in-memory field on initialize. Called by lifecycle-manager during
   * `initialize()` so the next flush / poll can re-attempt the
   * pending publish without waiting for a fresh save.
   */
  async restorePendingPublishCidFromCache() {
    if (!this.localCache) return;
    const key = this.getPendingPublishCidKey();
    if (!key) return;
    try {
      const raw2 = await this.localCache.get(key);
      if (raw2 && raw2.length > 0) {
        this.pendingPublishCid = raw2;
        this.log(`Restored pending publish CID from cache: ${raw2}`);
      }
    } catch (err) {
      this.log(
        `restorePendingPublishCidFromCache failed (best-effort): ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  /**
   * Refresh the merged-bundle baseline (`lastLoadedFromBundleCids`)
   * and the cached `lastLoadedData` by running a fresh `load()`.
   * Called by FlushScheduler when the runtime
   * `POINTER_MONOTONICITY_VIOLATION` check fires — repairing a stale
   * baseline so the next flush attempt passes the check.
   *
   * Returns true on success; false on internal load failure. The
   * caller (FlushScheduler / awaitNextFlush retry path) decides
   * whether to retry the flush or surface the original violation.
   *
   * IMPORTANT: this MUST NOT be called from inside `flushToIpfs`
   * directly because `load()` awaits the in-flight `flushPromise`,
   * which would deadlock. FlushScheduler invokes this via a
   * fire-and-forget pattern from the catch arm (which fires AFTER
   * the flush has already resolved/rejected), or the at-least-once
   * gate calls it explicitly between iterations.
   */
  async refreshBaselineForMonotonicity() {
    if (!this.initialized || !this.encryptionKey) return false;
    try {
      if (this.flushPromise) {
        try {
          await this.flushPromise;
        } catch {
        }
      }
      const activeBundles = await this.bundleIndex.listActiveBundles();
      this.lastLoadedFromBundleCids = new Set(activeBundles.keys());
      this.log(
        `refreshBaselineForMonotonicity: baseline updated to ${this.lastLoadedFromBundleCids.size} bundle(s)`
      );
      return true;
    } catch (err) {
      this.log(
        `refreshBaselineForMonotonicity: listActiveBundles failed: ${err instanceof Error ? err.message : String(err)}`
      );
      return false;
    }
  }
  /**
   * Rebuild the local derived cache from the token pool. Used when the
   * cache is empty on a fresh device or after corruption. Oracle-based
   * tombstone validation is deferred — this best-effort rebuild uses
   * archived tokens as the sole source.
   *
   * **Race guard**: concurrent load() calls are deduplicated — if a
   * rebuild is in flight, the second caller awaits the same Promise
   * rather than starting a second rebuild that could interleave writes.
   */
  async rebuildDerivedCache(data) {
    if (!this.rebuildPromise) {
      this.rebuildPromise = this.rebuildDerivedCacheInner(data).finally(() => {
        this.rebuildPromise = null;
      });
    }
    const shared = await this.rebuildPromise;
    return {
      tombstones: [...shared.tombstones],
      sent: [...shared.sent],
      history: [...shared.history]
    };
  }
  async rebuildDerivedCacheInner(data) {
    const tombstones = deriveTombstonesFromArchived(data);
    const sent = deriveSentFromArchived(data);
    const history = deriveHistoryFromArchived(data, this.getAddressId());
    if (this.localCache) {
      await this.writeLocalDerivedCache({ tombstones, sent, history });
    }
    return { tombstones, sent, history };
  }
  /**
   * Read the full operational state (synced + local-cached) for use
   * when building a TxfStorageDataBase on load.
   *
   * G4 — `tombstones` are read from BOTH the OrbitDB blob
   * (`${addr}.tombstones`, replicated, survives cold-start) AND the
   * local cache (`deriver.${addr}.all`, per-device). Both sources are
   * merged via union by primary-key (`tokenId`+`stateHash`) so a device
   * that has never written to OrbitDB yet still surfaces locally-known
   * tombstones, while a freshly-imported wallet pulls the boundary from
   * the synced source. Writes to OrbitDB happen in
   * `writeOrbitOperationalStatePerEntry`.
   */
  async readOperationalState() {
    const addr = this.getAddressId();
    const [orbit, local, orbitTombstones] = await Promise.all([
      this.readOrbitOperationalState(),
      this.readLocalDerivedCache(),
      this.readProfileKeyJson(`${addr}.tombstones`)
    ]);
    const tombstoneMap = /* @__PURE__ */ new Map();
    for (const t of local.tombstones) {
      tombstoneMap.set(`${t.tokenId}:${t.stateHash}`, t);
    }
    if (orbitTombstones !== null) {
      for (const t of orbitTombstones) {
        const k = `${t.tokenId}:${t.stateHash}`;
        const prior = tombstoneMap.get(k);
        if (prior === void 0 || t.timestamp < prior.timestamp) {
          tombstoneMap.set(k, t);
        }
      }
    }
    const mergedTombstones = Array.from(tombstoneMap.values());
    return {
      ...orbit,
      tombstones: mergedTombstones,
      sent: local.sent,
      history: local.history
    };
  }
  // ===========================================================================
  // Private: OrbitDB key read/write helpers
  // ===========================================================================
  /**
   * Cached envelope-support probe. Lazy-initialised by `supportsEnvelopes()`.
   * Both `putEntry` and `getEntry` must exist together — same invariant as
   * ProfileStorageProvider. See that class's `supportsEnvelopes` for the
   * asymmetry-rejection rationale.
   */
  _envelopesSupported = null;
  supportsEnvelopes() {
    if (this._envelopesSupported !== null) return this._envelopesSupported;
    const hasPut = typeof this.db.putEntry === "function";
    const hasGet = typeof this.db.getEntry === "function";
    if (hasPut !== hasGet) {
      throw new Error(
        `ProfileDatabase adapter has asymmetric envelope support: putEntry=${hasPut}, getEntry=${hasGet}. Adapter must implement BOTH methods or NEITHER.`
      );
    }
    this._envelopesSupported = hasPut;
    return this._envelopesSupported;
  }
  /**
   * Write a string value to an OrbitDB key, encrypting if enabled.
   *
   * **Routes through the OpLog envelope path** (`db.putEntry`) — same
   * format ProfileStorageProvider uses for `set()`. Both providers share
   * a single OrbitDB instance via the factory; if either side wrote raw
   * bytes via `db.put` while the other side read via `db.getEntry`, the
   * decode would fail with bogus errors like `tag not supported (21)` —
   * the dag-cbor decoder choking on encrypted-ciphertext bytes that
   * happen to start with byte values that look like CBOR tags. By
   * routing both providers through the envelope path, the OrbitDB key
   * is byte-compatible across consumers.
   */
  async writeProfileKey(key, value) {
    const encoded = new TextEncoder().encode(value);
    const ciphertext = this.encryptionKey ? await encryptProfileValue(this.encryptionKey, encoded) : encoded;
    if (this.supportsEnvelopes()) {
      const envelope = buildLocalEntry({
        type: "cache_index",
        originated: deriveOriginForType("cache_index"),
        payload: ciphertext
      });
      await this.db.putEntry(key, envelope);
    } else {
      await this.db.put(key, ciphertext);
    }
  }
  /**
   * Read a string value from an OrbitDB key, decrypting if needed.
   *
   * Symmetric with `writeProfileKey`: reads via the OpLog envelope path
   * (`db.getEntry`) so the same OrbitDB key is byte-compatible regardless
   * of which provider wrote it. See `writeProfileKey` for the cross-
   * provider decoding-collision rationale.
   *
   * Wave G.1 — deferred follow-up: emit a typed `storage:error` event
   * with `code: 'PROFILE_KEY_DECRYPT_FAILED'` so callers can route on
   * decrypt failures (likely indicates: encryption key changed,
   * key was rotated, or an attacker tampered with the ciphertext)
   * instead of treating them indistinguishably from "key not present".
   * The function still returns `null` to preserve the existing
   * caller contract (a missing-or-corrupt key triggers rebuild from
   * derived sources), but observability now distinguishes the two.
   */
  async readProfileKey(key) {
    let ciphertext = null;
    try {
      if (this.supportsEnvelopes()) {
        const envelope = await this.db.getEntry(key, {
          trustLocalClaim: true
        });
        ciphertext = envelope ? envelope.payload : null;
      } else {
        ciphertext = await this.db.get(key);
      }
    } catch (err) {
      this.log(`Failed to read OpLog entry at "${key}": ${err instanceof Error ? err.message : String(err)}`);
      this.emitEvent({
        ...this.buildErrorEvent("storage:error", err),
        code: "PROFILE_KEY_READ_FAILED"
      });
      return null;
    }
    if (!ciphertext) return null;
    try {
      const decrypted = this.encryptionKey ? await decryptProfileValue(this.encryptionKey, ciphertext) : ciphertext;
      return new TextDecoder().decode(decrypted);
    } catch (err) {
      this.log(`Failed to decrypt key "${key}": ${err instanceof Error ? err.message : String(err)}`);
      const evt = this.buildErrorEvent("storage:error", err);
      this.emitEvent({ ...evt, code: "PROFILE_KEY_DECRYPT_FAILED" });
      return null;
    }
  }
  /**
   * Read and parse a JSON value from an OrbitDB key.
   */
  async readProfileKeyJson(key) {
    const raw2 = await this.readProfileKey(key);
    if (!raw2) return null;
    try {
      return JSON.parse(raw2);
    } catch {
      return null;
    }
  }
  // ===========================================================================
  // Private: Replication handler
  // ===========================================================================
  /**
   * Handle OrbitDB replication events.
   * Checks for new `tokens.bundle.*` keys and emits `storage:remote-updated`.
   *
   * Cross-device sync resilience (Fix 2): when new bundle CIDs appear,
   * schedule a no-data flush so we anchor our OWN aggregator pointer
   * to the merged state. Without this, if Device A originated a bundle
   * and goes offline before Device B re-flushes, a future Device C
   * joining via the aggregator pointer would only see A's CID — which
   * is fine if A's bundle covered the full state, but loses anything
   * B contributed via Nostr DMs (or any source the originator hadn't
   * captured). The flush body short-circuits if the merged-state CAR
   * matches a known anchor (idempotent).
   *
   * # Pointer monotonicity invariant (CRITICAL)
   *
   * The published pointer V_n MUST reference a CAR that contains every
   * token reachable from V_n-1's CARs. Concretely: the CAR pinned by a
   * no-data flush MUST cover the union of every active bundle in OrbitDB
   * — otherwise Device C, joining via the aggregator pointer alone, would
   * see only V_n's CAR and miss tokens that lived in V_n-1's bundles.
   *
   * That invariant relies on `lastLoadedData` reflecting the current
   * bundle union when the flush body runs. Two events fire on every
   * replication tick:
   *   - `scheduleFlushNoData()` here (debounced ~ flushDebounceMs).
   *   - `storage:remote-updated` event → PaymentsModule.sync → load()
   *     (debounced 500ms, then load() awaits the in-flight flush).
   *
   * If the flush timer fires BEFORE load() refreshes `lastLoadedData`,
   * the flush body builds its CAR from STALE merged state — silently
   * dropping the newly-discovered remote bundle's tokens from V_n.
   *
   * Mode A fix #2: AWAIT a fresh `load()` here before scheduling the
   * no-data flush. load() reads the active bundle index, fetches all
   * CARs, merges, and writes the union into `lastLoadedData` — which is
   * exactly the superset the flush body needs. With this in place the
   * flush body's `lastLoadedData` snapshot is by-construction a superset
   * of V_n-1's bundle union, eliminating the race at the source.
   *
   * Why fix #2 over fix #1 (defer-with-retry): the retry approach is
   * brittle (the load could complete just as the flush fires; cap
   * exhaustion drops the publish silently) and adds an unobservable
   * timing dependency. Awaiting load() here is structurally clean,
   * synchronously verifiable, and uses load()'s existing dedup machinery
   * (it awaits an in-flight flush; the flush awaits the in-flight load
   * via its debounce timer). No new state, no retry counters.
   */
  /**
   * Called by `LifecycleManager.runPointerPollOnce` after the periodic
   * aggregator-pointer poll discovers a NEW CID (one not in
   * `knownBundleCids`) and adds it via `bundleIndex.addBundle`.
   *
   * Distinct from `handleReplication` in two ways:
   *   1. The poll already confirmed novelty via the `knownBundleCids`
   *      check — no diff against `previousCids` is needed (and any
   *      diff would be a no-op since `addBundle` updated
   *      `knownBundleCids` BEFORE this callback fires).
   *   2. No recursive aggregator-poll trigger — we're already inside
   *      the poll loop.
   *
   * Responsibilities:
   *   - `load()` to merge the new CID's content into `lastLoadedData`
   *     (this updates `lastLoadedFromBundleCids` as a side effect,
   *     restoring the pointer-monotonicity invariant).
   *   - Schedule a no-data flush to re-anchor our pointer at the
   *     merged state. The flush body short-circuits if the projected
   *     CID equals the just-discovered pointer CID (no duplicate
   *     pin / aggregator submit cost on the receiver side).
   *
   * Failures here are best-effort — load failures are surfaced via
   * `storage:error` events independently; we proceed to schedule the
   * flush so the next save-driven flush gets a fresh baseline check.
   */
  async onPollDiscoveredNewCid() {
    try {
      await this.load();
    } catch (err) {
      this.log(
        `onPollDiscoveredNewCid: load failed (best-effort): ${err instanceof Error ? err.message : String(err)}`
      );
    }
    this.emitEvent({
      type: "storage:remote-updated",
      timestamp: Date.now(),
      data: { source: "pointer-poll" }
    });
    this.flushScheduler.scheduleFlushNoData();
  }
  async handleReplication() {
    const previousCids = new Set(this.knownBundleCids);
    try {
      await this.lifecycleManager.triggerPointerPollNow();
    } catch (err) {
      this.log(
        `handleReplication: aggregator pointer poll failed (best-effort): ${err instanceof Error ? err.message : String(err)}`
      );
    }
    try {
      await this.bundleIndex.refreshKnownBundles();
      let hasNew = false;
      for (const cid of this.knownBundleCids) {
        if (!previousCids.has(cid)) {
          hasNew = true;
          break;
        }
      }
      if (hasNew) {
        this.emitEvent({
          type: "storage:remote-updated",
          timestamp: Date.now(),
          data: { source: "replication" }
        });
        try {
          await this.load();
        } catch (err) {
          this.log(
            `handleReplication: pre-flush load failed (best-effort, runtime assertion will guard): ${err instanceof Error ? err.message : String(err)}`
          );
        }
        this.flushScheduler.scheduleFlushNoData();
      }
    } catch (err) {
      this.log(`Replication check failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  // ===========================================================================
  // Private: Utilities
  // ===========================================================================
  /**
   * Get the address ID for per-address key scoping.
   * Returns the computed short address ID (DIRECT_xxxxxx_yyyyyy format),
   * falling back to the options addressId or 'default'.
   */
  getAddressId() {
    return this.addressId ?? this.options?.addressId ?? "default";
  }
  /**
   * Extract token IDs from a TxfStorageDataBase for diffing.
   * Includes standard tokens (`_`-prefixed), archived (`archived-`), and forked (`_forked_`).
   */
  extractTokenIds(data) {
    const ids = [];
    const operationalKeys = /* @__PURE__ */ new Set([
      "_meta",
      "_tombstones",
      "_outbox",
      "_sent",
      "_invalid",
      "_history",
      "_mintOutbox",
      "_invalidatedNametags"
    ]);
    for (const key of Object.keys(data)) {
      if (key.startsWith("_") && !operationalKeys.has(key)) {
        ids.push(key);
      } else if (key.startsWith("archived-")) {
        ids.push(key);
      }
    }
    return ids;
  }
  emitEvent(event) {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
      }
    }
  }
  /**
   * Steelman³⁸ warning: build an event payload that preserves typed
   * error codes (AggregatorPointerError.code, ProfileError.code,
   * UxfError.code, SphereError.code) instead of flattening to a string.
   * Consumers can switch on `event.code` to drive UI state.
   */
  buildErrorEvent(type, err, overrideCode) {
    const error = err instanceof Error ? err.message : String(err);
    let code2 = overrideCode;
    if (!code2 && typeof err === "object" && err !== null) {
      const codeField = err.code;
      if (typeof codeField === "string") code2 = codeField;
    }
    return {
      type,
      timestamp: Date.now(),
      error,
      code: code2,
      cause: err
    };
  }
  log(message) {
    logger.debug("Profile-TokenStorage", message);
  }
};
function mergeByPrimaryKey(remote, local, keyField) {
  const byKey = /* @__PURE__ */ new Map();
  for (const item of remote) {
    if (typeof item === "object" && item !== null) {
      const key = item[keyField];
      if (key !== void 0) byKey.set(key, item);
    }
  }
  for (const item of local) {
    if (typeof item === "object" && item !== null) {
      const key = item[keyField];
      if (key !== void 0) byKey.set(key, item);
    }
  }
  return Array.from(byKey.values());
}

// profile/factory.ts
init_ipfs_client();

// profile/profile-snapshot-dispatcher.ts
init_logger();
var ADDRESS_ID_PREFIX_RE = /^(DIRECT_[0-9a-f]{6}_[0-9a-f]{6})\./;
function base64ToBytes(b64) {
  if (typeof Buffer !== "undefined" && typeof Buffer.from === "function") {
    const buf = Buffer.from(b64, "base64");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function accumulate(agg, r) {
  agg.entriesEvaluated += r.entriesEvaluated;
  agg.liveLanded += r.liveLanded;
  agg.tombstonesLanded += r.tombstonesLanded;
  agg.localWon += r.localWon;
  agg.remoteRejectedMalformed += r.remoteRejectedMalformed;
}
async function runProfileSnapshotJoin(snapshot, deps) {
  const log = deps.log ?? ((msg) => logger.debug("SnapshotDispatcher", msg));
  const entries = snapshot.entries.map((e) => ({
    key: e.key,
    encryptedValue: base64ToBytes(e.value)
  }));
  const addressIds = /* @__PURE__ */ new Set();
  for (const e of entries) {
    const m = ADDRESS_ID_PREFIX_RE.exec(e.key);
    if (m !== null) addressIds.add(m[1]);
  }
  const aggregated = {
    entriesEvaluated: 0,
    liveLanded: 0,
    tombstonesLanded: 0,
    localWon: 0,
    remoteRejectedMalformed: 0
  };
  let bundleEntriesSeen = 0;
  for (const addressId of addressIds) {
    const writers = deps.writersFor(addressId);
    if (writers.length === 0) {
      log(
        `runProfileSnapshotJoin: no writers available for address ${addressId} (encryption/identity preconditions not yet met) \u2014 skipping`
      );
      continue;
    }
    for (const { keyPrefix, writer } of writers) {
      const slice = entries.filter((e) => e.key.startsWith(keyPrefix));
      if (slice.length === 0) continue;
      try {
        const result = await writer.joinSnapshot(slice);
        accumulate(aggregated, result);
      } catch (err) {
        log(
          `runProfileSnapshotJoin: writer @ ${keyPrefix} threw \u2014 skipping (error: ${err instanceof Error ? err.message : String(err)})`
        );
      }
    }
  }
  if (deps.bundleIndex !== null) {
    const bundleSlice = entries.filter((e) => e.key.startsWith(BUNDLE_KEY_PREFIX));
    bundleEntriesSeen = bundleSlice.length;
    if (bundleSlice.length > 0) {
      try {
        const result = await deps.bundleIndex.joinSnapshot(bundleSlice);
        accumulate(aggregated, result);
      } catch (err) {
        log(
          `runProfileSnapshotJoin: bundleIndex.joinSnapshot threw \u2014 skipping (error: ${err instanceof Error ? err.message : String(err)})`
        );
      }
    }
  } else {
    log(
      "runProfileSnapshotJoin: bundleIndex not available \u2014 bundle JOIN skipped"
    );
  }
  const joinedAny = aggregated.liveLanded > 0 || aggregated.tombstonesLanded > 0;
  return {
    joinedAny,
    addressesSeen: addressIds.size,
    bundleEntriesSeen,
    counters: aggregated
  };
}

// profile/factory.ts
init_logger();
var DEFAULT_PROFILE_TOMBSTONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1e3;
var ADDRESS_ID_KEY_RE = /^(DIRECT_[0-9a-f]{6}_[0-9a-f]{6})\./;
async function runProfileTombstoneGc(deps) {
  let keys;
  try {
    keys = await deps.listKeys();
  } catch (err) {
    logger.warn(
      "ProfileTombstoneGc",
      `listKeys() threw \u2014 skipping tombstone GC pass: ${err instanceof Error ? err.message : String(err)}`
    );
    return;
  }
  const addressIds = /* @__PURE__ */ new Set();
  for (const k of keys) {
    const m = ADDRESS_ID_KEY_RE.exec(k);
    if (m !== null) addressIds.add(m[1]);
  }
  if (addressIds.size === 0) return;
  for (const addressId of addressIds) {
    const outbox = deps.buildOutboxWriter(addressId);
    if (outbox !== null) {
      try {
        await outbox.gcExpiredTombstones({ retentionMs: deps.retentionMs });
      } catch (err) {
        logger.warn(
          "ProfileTombstoneGc",
          `OUTBOX gcExpiredTombstones threw for ${addressId} \u2014 continuing: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
    const sent = deps.buildSentLedgerWriter(addressId);
    if (sent !== null) {
      try {
        await sent.gcExpiredTombstones({ retentionMs: deps.retentionMs });
      } catch (err) {
        logger.warn(
          "ProfileTombstoneGc",
          `SENT gcExpiredTombstones threw for ${addressId} \u2014 continuing: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }
}
async function runProfileDirtyFlush(deps) {
  const chainPubkey = deps.getChainPubkey();
  if (!chainPubkey) {
    return { ok: false, transient: false, code: "NOT_READY_IDENTITY" };
  }
  const network = deps.getNetwork();
  if (!network) {
    return { ok: false, transient: false, code: "NOT_READY_NETWORK" };
  }
  const pointer = deps.getPointerLayer();
  if (!pointer) {
    return { ok: false, transient: false, code: "NOT_READY_POINTER" };
  }
  const snapshot = await deps.buildSnapshot(chainPubkey, network);
  await deps.pin(snapshot.carBytes, snapshot.rootCid);
  const result = await deps.publishCid(snapshot.rootCid);
  return result;
}
function runProfileSnapshotApply(snapshot, deps) {
  return runProfileSnapshotJoin(snapshot, {
    writersFor: deps.writersFor,
    bundleIndex: deps.getBundleIndex(),
    log: deps.log
  });
}
function createProfileProviders(config, cacheStorage, oracle) {
  const resolvedConfig = config.profileOrbitDbPeers ? {
    ...config,
    orbitDb: {
      ...config.orbitDb,
      bootstrapPeers: [
        ...config.orbitDb.bootstrapPeers ?? [],
        ...config.profileOrbitDbPeers
      ]
    }
  } : config;
  const db = new OrbitDbAdapter();
  const storage = new ProfileStorageProvider(cacheStorage, db, {
    config: resolvedConfig,
    encrypt: resolvedConfig.encrypt !== false,
    oracle,
    debug: resolvedConfig.debug
  });
  const ipfsGateways = resolvedConfig.ipfsGateways ?? [...DEFAULT_IPFS_GATEWAYS];
  const tokenStorageHolder = {
    current: null
  };
  const onProfileDirtyFlush = () => runProfileDirtyFlush({
    getChainPubkey: () => tokenStorageHolder.current?.getIdentity()?.chainPubkey ?? null,
    getNetwork: () => resolvedConfig.network ?? null,
    getPointerLayer: () => storage.getPointerLayer(),
    buildSnapshot: async (chainPubkey, network) => {
      const tokenStorage2 = tokenStorageHolder.current;
      if (!tokenStorage2) {
        throw new Error(
          "onProfileDirtyFlush: tokenStorage holder unexpectedly null"
        );
      }
      const retentionMs = resolvedConfig.tombstoneRetentionMs ?? DEFAULT_PROFILE_TOMBSTONE_RETENTION_MS;
      return buildLeanProfileSnapshot({
        storage,
        tokenStorage: tokenStorage2,
        chainPubkey,
        network,
        gcExpiredTombstones: () => runProfileTombstoneGc({
          listKeys: () => storage.keys(),
          buildOutboxWriter: (addressId) => storage.buildOutboxWriter(addressId),
          buildSentLedgerWriter: (addressId) => storage.buildSentLedgerWriter(addressId),
          retentionMs
        })
      });
    },
    pin: (carBytes, expectedRootCid) => (
      // Issue #236 — write each block to the local Helia blockstore
      // before the HTTP pin so the snapshot CID is locally readable
      // by the time `pin()` returns, regardless of gateway
      // propagation. `db.getHelia?.()` returns `null` for adapters
      // that predate issue #236, in which case the HTTP-only path
      // continues to apply.
      pinCarBlocksToIpfs(
        ipfsGateways,
        carBytes,
        expectedRootCid,
        void 0,
        db.getHelia?.()
      )
    ),
    // Phase D.1a — route the snapshot CID publish through the
    // provider's LifecycleManager so it picks up retry / error-
    // classification / pending-publish-marker machinery. The legacy
    // bundle-CID publish path (flush-scheduler) uses the same
    // entrypoint via lifecycle.publishAggregatorPointerBestEffort,
    // so both publishes share the same retry semantics. (Phase D.1b
    // will collapse the two paths so only the snapshot publish
    // runs — see Item #15 Phase E.)
    publishCid: async (cidString) => {
      const tokenStorage2 = tokenStorageHolder.current;
      if (!tokenStorage2) {
        return { ok: false, transient: false, code: "NOT_READY_HOLDER" };
      }
      return tokenStorage2.publishLeanSnapshotCid(cidString);
    }
  });
  const tokenStorageOptions = {
    config: resolvedConfig,
    addressId: "default",
    encrypt: resolvedConfig.encrypt !== false,
    flushDebounceMs: resolvedConfig.flushDebounceMs,
    // Issue #239 — propagate the per-flush remote-durability deadline
    // from ProfileConfig into the token storage provider. The factory
    // is the production seam, so the default here is 30 000 ms (the
    // contracted value from the issue spec). Callers can pass `0` in
    // `ProfileConfig.flushVerificationDeadlineMs` to opt out.
    //
    // The provider's direct-construction default is 0 (off) so legacy
    // tests that wire stub pointers + mock gateways don't hang on
    // HEAD retries; the factory override above is what gives real
    // wallets the verification contract.
    flushVerificationDeadlineMs: resolvedConfig.flushVerificationDeadlineMs ?? 3e4,
    oracle,
    // Lazy accessor: the pointer layer is built inside
    // `storage.doConnect()` after OrbitDB attach, long after the
    // token-storage constructor runs. A closure defers the read
    // until it is actually needed (inside initialize() / flushToIpfs).
    getPointerLayer: () => storage.getPointerLayer(),
    getPointerBuildStatus: () => storage.getPointerBuildStatus(),
    // Item #15 Phase C.3 — wire the lean-snapshot dirty-flush path.
    onProfileDirtyFlush,
    debug: resolvedConfig.debug
  };
  const tokenStorage = new ProfileTokenStorageProvider(
    db,
    null,
    // encryption key derived later via setIdentity()
    ipfsGateways,
    tokenStorageOptions,
    cacheStorage
  );
  tokenStorageHolder.current = tokenStorage;
  storage.setProfileDirtyNotifier(() => tokenStorage.notifyProfileDirty());
  const dispatchParsedSnapshot = (snapshot) => runProfileSnapshotApply(snapshot, {
    writersFor: (addressId) => {
      const writers = [];
      const outbox = storage.buildOutboxWriter(addressId);
      if (outbox !== null) {
        writers.push({ keyPrefix: `${addressId}.outbox.`, writer: outbox });
      }
      const sent = storage.buildSentLedgerWriter(addressId);
      if (sent !== null) {
        writers.push({ keyPrefix: `${addressId}.sent.`, writer: sent });
      }
      const finalizationAdapter = storage.buildFinalizationQueueStorageAdapter();
      if (finalizationAdapter !== null) {
        writers.push({
          keyPrefix: `${addressId}.finalizationQueue.`,
          writer: finalizationAdapter.syncWriterFor(addressId)
        });
      }
      const recipientContextAdapter = storage.buildRecipientContextStorageAdapter();
      if (recipientContextAdapter !== null) {
        const pair = recipientContextAdapter.syncWritersFor(addressId);
        writers.push({
          keyPrefix: requestContextPrefix(addressId),
          writer: pair.requestContext
        });
        writers.push({
          keyPrefix: finalizationContextPrefix(addressId),
          writer: pair.finalizationContext
        });
      }
      const dispositionAdapter = storage.buildDispositionStorageAdapter();
      if (dispositionAdapter !== null) {
        const dispoQuad = dispositionAdapter.syncWritersFor(addressId);
        writers.push({
          keyPrefix: dispositionInvalidPrefix(addressId),
          writer: dispoQuad.invalid
        });
        writers.push({
          keyPrefix: dispositionInvalidOrphanPrefix(addressId),
          writer: dispoQuad.invalidOrphan
        });
        writers.push({
          keyPrefix: dispositionAuditPrefix(addressId),
          writer: dispoQuad.audit
        });
        writers.push({
          keyPrefix: dispositionAuditOrphanPrefix(addressId),
          writer: dispoQuad.auditOrphan
        });
      }
      return writers;
    },
    getBundleIndex: () => tokenStorage.getBundleIndex()
  });
  storage.setSnapshotApplier((snapshot) => dispatchParsedSnapshot(snapshot));
  tokenStorage.setApplySnapshotCallback(async (cidString) => {
    const helia = db.getHelia?.();
    const rootBlockBytes = await fetchFromIpfs(
      ipfsGateways,
      cidString,
      void 0,
      void 0,
      helia
    );
    const snapshot = await parseLeanProfileSnapshotFromRootBlock(
      rootBlockBytes,
      (subBlockCid) => fetchFromIpfs(ipfsGateways, subBlockCid, void 0, void 0, helia)
    );
    return dispatchParsedSnapshot(snapshot);
  });
  return { storage, tokenStorage };
}

// impl/nodejs/storage/FileStorageProvider.ts
import * as fs from "fs";
import * as path from "path";
var FileStorageProvider = class {
  id = "file-storage";
  name = "File Storage";
  type = "local";
  /**
   * Durability marker consumed by the aggregator-pointer FlagStore
   * (SPEC §7.1.3). Writes go through `fs.fsyncSync()` on a temp file
   * followed by an atomic rename, which is a POSIX-durable write. Any
   * re-ordering by the OS page cache is flushed by fsync before the
   * rename commits the new inode — readers observe either the prior
   * or new state, never a torn write.
   */
  [DURABLE_STORAGE] = true;
  dataDir;
  filePath;
  isTxtMode;
  data = {};
  status = "disconnected";
  _identity = null;
  constructor(config) {
    if (typeof config === "string") {
      this.dataDir = config;
      this.filePath = path.join(config, "wallet.json");
    } else {
      this.dataDir = config.dataDir;
      this.filePath = path.join(config.dataDir, config.fileName ?? "wallet.json");
    }
    this.isTxtMode = this.filePath.endsWith(".txt");
  }
  setIdentity(identity) {
    this._identity = identity;
  }
  getIdentity() {
    return this._identity;
  }
  async connect() {
    if (this.status === "connected") {
      return;
    }
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (fs.existsSync(this.filePath)) {
      try {
        const content = fs.readFileSync(this.filePath, "utf-8").trim();
        if (this.isTxtMode) {
          if (content) {
            this.data = { [STORAGE_KEYS_GLOBAL.MNEMONIC]: content };
          }
        } else {
          this.data = JSON.parse(content);
        }
      } catch (mainErr) {
        const tmpPath = this.filePath + ".tmp";
        if (fs.existsSync(tmpPath)) {
          try {
            const tmpContent = fs.readFileSync(tmpPath, "utf-8").trim();
            this.data = this.isTxtMode ? tmpContent ? { [STORAGE_KEYS_GLOBAL.MNEMONIC]: tmpContent } : {} : JSON.parse(tmpContent);
            const corruptPath = this.filePath + ".corrupt";
            try {
              fs.renameSync(this.filePath, corruptPath);
            } catch {
            }
            fs.renameSync(tmpPath, this.filePath);
          } catch {
            throw new Error(
              `Wallet file "${this.filePath}" is corrupt and no valid backup exists. Manual recovery required. Check "${this.filePath}.corrupt" for the damaged file.`
            );
          }
        } else {
          throw new Error(
            `Wallet file "${this.filePath}" is corrupt (${mainErr instanceof Error ? mainErr.message : "parse error"}). No backup (.tmp) file found. Manual recovery required.`
          );
        }
      }
    }
    this.status = "connected";
  }
  async disconnect() {
    await this.save();
    this.status = "disconnected";
  }
  isConnected() {
    return this.status === "connected";
  }
  getStatus() {
    return this.status;
  }
  async get(key) {
    const fullKey = this.getFullKey(key);
    return this.data[fullKey] ?? null;
  }
  async set(key, value) {
    const fullKey = this.getFullKey(key);
    this.data[fullKey] = value;
    this.mutatedKeys.add(fullKey);
    this.removedKeys.delete(fullKey);
    await this.save();
  }
  /**
   * Wave G.6: atomic multi-key write — staged into in-memory state,
   * then flushed once via the existing save() path which holds the
   * cross-process file lock for the entire snapshot rewrite. This
   * gives true all-or-nothing semantics across keys: either the file
   * rewrite succeeds and ALL entries are visible on next read, or
   * the rewrite fails and the on-disk file is unchanged (atomic
   * temp+rename).
   *
   * On in-memory error (rare; allocator), restores the previous
   * values for any keys we'd already mutated and re-throws.
   */
  /**
   * Wave J: per-instance setMany serialization. Without this, two
   * concurrent setMany calls on the same instance could interleave
   * snapshot/mutate/save in a way that A's rollback leaves B's
   * pending mutations exposed (or vice versa). Serializing the
   * entire snapshot+mutate+save+rollback critical section gives a
   * single-mutator invariant within the process.
   */
  setManyChain = Promise.resolve();
  async setMany(entries) {
    if (entries.length === 0) return;
    const prev = this.setManyChain;
    let resolveSelf;
    let rejectSelf;
    const self = new Promise((res, rej) => {
      resolveSelf = res;
      rejectSelf = rej;
    });
    this.setManyChain = self.catch(() => void 0);
    await prev.catch(() => void 0);
    try {
      await this.setManyInner(entries);
      resolveSelf();
    } catch (err) {
      rejectSelf(err);
      throw err;
    }
  }
  async setManyInner(entries) {
    if (entries.length === 0) return;
    const previous = /* @__PURE__ */ new Map();
    const fullEntries = [];
    const prevMutated = new Set(this.mutatedKeys);
    const prevRemoved = new Set(this.removedKeys);
    for (const [key, value] of entries) {
      const fullKey = this.getFullKey(key);
      fullEntries.push([fullKey, value]);
      previous.set(fullKey, this.data[fullKey]);
    }
    try {
      for (const [fullKey, value] of fullEntries) {
        this.data[fullKey] = value;
        this.mutatedKeys.add(fullKey);
        this.removedKeys.delete(fullKey);
      }
      await this.save();
    } catch (err) {
      for (const [fullKey, prev] of previous) {
        if (prev === void 0) {
          delete this.data[fullKey];
        } else {
          this.data[fullKey] = prev;
        }
      }
      this.mutatedKeys = prevMutated;
      this.removedKeys = prevRemoved;
      throw err;
    }
  }
  async remove(key) {
    const fullKey = this.getFullKey(key);
    delete this.data[fullKey];
    this.removedKeys.add(fullKey);
    this.mutatedKeys.delete(fullKey);
    await this.save();
  }
  async has(key) {
    const fullKey = this.getFullKey(key);
    return fullKey in this.data;
  }
  async keys(prefix) {
    const allKeys = Object.keys(this.data);
    if (prefix) {
      return allKeys.filter((k) => k.startsWith(prefix));
    }
    return allKeys;
  }
  async clear(prefix) {
    if (prefix) {
      const keysToDelete = Object.keys(this.data).filter((k) => k.startsWith(prefix));
      for (const key of keysToDelete) {
        delete this.data[key];
        this.removedKeys.add(key);
        this.mutatedKeys.delete(key);
      }
    } else {
      try {
        if (fs.existsSync(this.filePath)) {
          const onDisk = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
          for (const k of Object.keys(onDisk)) this.removedKeys.add(k);
        }
      } catch {
      }
      for (const k of Object.keys(this.data)) this.removedKeys.add(k);
      this.mutatedKeys.clear();
      this.data = {};
    }
    await this.save();
  }
  async saveTrackedAddresses(entries) {
    await this.set(STORAGE_KEYS_GLOBAL.TRACKED_ADDRESSES, JSON.stringify({ version: 1, addresses: entries }));
  }
  async loadTrackedAddresses() {
    const data = await this.get(STORAGE_KEYS_GLOBAL.TRACKED_ADDRESSES);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return parsed.addresses ?? [];
    } catch {
      return [];
    }
  }
  /**
   * Get full storage key with address prefix for per-address keys
   */
  getFullKey(key) {
    const isPerAddressKey = Object.values(STORAGE_KEYS_ADDRESS).includes(
      key
    );
    if (isPerAddressKey && this._identity?.directAddress) {
      const addressId = getAddressId(this._identity.directAddress);
      return `${addressId}_${key}`;
    }
    return key;
  }
  /**
   * Steelman⁴³ critical: track which keys this process has mutated
   * since connect(), so save() can merge them ON TOP of the current
   * on-disk snapshot. Without this, two processes each holding their
   * own private snapshot would mutually overwrite the other's writes
   * (last-save-wins, intermediate keys lost).
   */
  mutatedKeys = /* @__PURE__ */ new Set();
  removedKeys = /* @__PURE__ */ new Set();
  saveInFlight = null;
  async save() {
    if (this.saveInFlight) {
      await this.saveInFlight;
    }
    this.saveInFlight = this.saveInner().finally(() => {
      this.saveInFlight = null;
    });
    return this.saveInFlight;
  }
  async saveInner() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    let releaseFileLock = null;
    let lockfileModule = null;
    try {
      lockfileModule = await import("proper-lockfile");
    } catch (err) {
      console.warn(
        "[FileStorageProvider] proper-lockfile module unavailable; saving without cross-process lock:",
        err instanceof Error ? err.message : String(err)
      );
    }
    if (lockfileModule) {
      if (!fs.existsSync(this.filePath)) {
        try {
          fs.writeFileSync(this.filePath, this.isTxtMode ? "" : "{}", { flag: "a" });
        } catch {
        }
      }
      try {
        releaseFileLock = await lockfileModule.lock(this.filePath, {
          stale: 1e4,
          retries: { retries: 50, minTimeout: 50, maxTimeout: 500 },
          realpath: false
        });
      } catch (err) {
        const wrapped = new Error(
          `FileStorageProvider: failed to acquire cross-process lock after retries: ${err instanceof Error ? err.message : String(err)}`
        );
        wrapped.code = "STORAGE_LOCK_CONTENDED";
        throw wrapped;
      }
    }
    try {
      if (!this.isTxtMode && fs.existsSync(this.filePath)) {
        try {
          const raw2 = fs.readFileSync(this.filePath, "utf8");
          if (raw2.length > 0) {
            const onDisk = JSON.parse(raw2);
            const merged = { ...onDisk };
            for (const key of this.mutatedKeys) {
              if (key in this.data) merged[key] = this.data[key];
            }
            for (const key of this.removedKeys) {
              delete merged[key];
            }
            this.data = merged;
          }
        } catch {
        }
      }
      this.mutatedKeys = /* @__PURE__ */ new Set();
      this.removedKeys = /* @__PURE__ */ new Set();
      let content;
      if (this.isTxtMode) {
        content = this.data[STORAGE_KEYS_GLOBAL.MNEMONIC] ?? "";
      } else {
        content = JSON.stringify(this.data);
      }
      const tmpPath = this.filePath + ".tmp";
      const fd = fs.openSync(tmpPath, "w", 384);
      try {
        fs.writeSync(fd, content);
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      fs.renameSync(tmpPath, this.filePath);
      try {
        const dirFd = fs.openSync(this.dataDir, "r");
        try {
          fs.fsyncSync(dirFd);
        } finally {
          fs.closeSync(dirFd);
        }
      } catch {
      }
    } finally {
      if (releaseFileLock !== null) {
        try {
          await releaseFileLock();
        } catch {
        }
      }
    }
  }
};
function createFileStorageProvider(config) {
  return new FileStorageProvider(config);
}

// impl/shared/resolvers.ts
function getNetworkConfig(network = "mainnet") {
  return NETWORKS[network];
}

// profile/node.ts
function createNodeProfileProviders(config) {
  const network = config.network;
  const networkConfig = getNetworkConfig(network);
  const localCache = createFileStorageProvider({
    dataDir: config.dataDir
  });
  const profileConfig = {
    orbitDb: {
      privateKey: "",
      // Set later via setIdentity()
      directory: config.profileConfig?.orbitDb?.directory ?? `${config.dataDir}/orbitdb`,
      // Issue #266 — Node.js wallet/CLI clients default to HTTP-only IPFS:
      // no libp2p DHT/bootstrap/peerDiscovery, memory-only blockstore,
      // operator Kubo gateway via HTTP for persistence. Operator-side
      // bridges that want real peer discovery pass `httpOnlyIpfs: false`
      // and configure `bootstrapPeers` explicitly.
      httpOnlyIpfs: true,
      ...config.profileConfig?.orbitDb ?? {}
    },
    encrypt: config.profileConfig?.encrypt ?? true,
    // Wave F.9: thread network through to ProfileConfig so the pointer
    // layer's SPEC §14.1 / §11.12 denylist gate (createMasterPrivateKey
    // network parameter) reaches createMasterPrivateKey via
    // ProfileStorageProvider → buildProfilePointerLayer. Previously
    // the factory dropped this field — production callers couldn't
    // opt into network='test-vectors' through the standard factory.
    network,
    ipfsGateways: config.profileConfig?.ipfsGateways ?? [...networkConfig.ipfsGateways ?? DEFAULT_IPFS_GATEWAYS],
    cacheMaxSizeBytes: config.profileConfig?.cacheMaxSizeBytes,
    consolidationRetentionMs: config.profileConfig?.consolidationRetentionMs,
    consolidationRetentionMinMs: config.profileConfig?.consolidationRetentionMinMs,
    flushDebounceMs: config.profileConfig?.flushDebounceMs,
    profileOrbitDbPeers: config.profileConfig?.profileOrbitDbPeers,
    debug: config.profileConfig?.debug
  };
  const { storage, tokenStorage } = createProfileProviders(
    profileConfig,
    localCache,
    config.oracle
  );
  return { storage, tokenStorage };
}
export {
  createNodeProfileProviders
};
/*! Bundled license information:

@noble/hashes/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/utils.js:
@noble/curves/abstract/modular.js:
@noble/curves/abstract/curve.js:
@noble/curves/abstract/weierstrass.js:
@noble/curves/secp256k1.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
//# sourceMappingURL=node.js.map