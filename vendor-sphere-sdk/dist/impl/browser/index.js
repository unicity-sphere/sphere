var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};

// ../../../node_modules/@noble/hashes/utils.js
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
function hexToBytes(hex) {
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
function createHasher(hashCons, info = {}) {
  const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
  const tmp = hashCons(void 0);
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = (opts) => hashCons(opts);
  Object.assign(hashC, info);
  return Object.freeze(hashC);
}
var hasHexBuiltin, hexes, asciis, oidNist;
var init_utils = __esm({
  "../../../node_modules/@noble/hashes/utils.js"() {
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

// ../../../node_modules/@noble/hashes/_md.js
function Chi(a, b, c) {
  return a & b ^ ~a & c;
}
function Maj(a, b, c) {
  return a & b ^ a & c ^ b & c;
}
var HashMD, SHA256_IV;
var init_md = __esm({
  "../../../node_modules/@noble/hashes/_md.js"() {
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
  }
});

// ../../../node_modules/@noble/hashes/sha2.js
var SHA256_K, SHA256_W, SHA2_32B, _SHA256, sha256;
var init_sha2 = __esm({
  "../../../node_modules/@noble/hashes/sha2.js"() {
    "use strict";
    init_md();
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
    sha256 = /* @__PURE__ */ createHasher(
      () => new _SHA256(),
      /* @__PURE__ */ oidNist(1)
    );
  }
});

// impl/browser/index.ts
import { Buffer as Buffer4 } from "buffer";

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
    const code2 = c.charCodeAt(0);
    if (code2 === 10) return "\\n";
    if (code2 === 13) return "\\r";
    if (code2 === 9) return "\\t";
    if (code2 === 27) return "\\x1b";
    return `\\x${code2.toString(16).padStart(2, "0")}`;
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
  constructor(message, code2, cause) {
    const redacted = redactCause(cause);
    super(message, redacted !== void 0 ? { cause: redacted } : void 0);
    this.name = "SphereError";
    this.code = code2;
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
var NOSTR_EVENT_KINDS = {
  /** NIP-04 encrypted direct message */
  DIRECT_MESSAGE: 4,
  /** Token transfer (Unicity custom - 31113) */
  TOKEN_TRANSFER: 31113,
  /** Payment request (Unicity custom - 31115) */
  PAYMENT_REQUEST: 31115,
  /** Payment request response (Unicity custom - 31116) */
  PAYMENT_REQUEST_RESPONSE: 31116,
  /** Nametag binding (NIP-78 app-specific data) */
  NAMETAG_BINDING: 30078,
  /** Public broadcast */
  BROADCAST: 1
};
var DEFAULT_AGGREGATOR_URL = "https://aggregator.unicity.network/rpc";
var DEV_AGGREGATOR_URL = "https://dev-aggregator.dyndns.org/rpc";
var TEST_AGGREGATOR_URL = "https://goggregator-test.unicity.network";
var DEFAULT_AGGREGATOR_TIMEOUT = 3e4;
var DEFAULT_AGGREGATOR_API_KEY = "sk_06365a9c44654841a366068bcfc68986";
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
var UNICITY_IPFS_NODES = [
  {
    host: "unicity-ipfs1.dyndns.org",
    peerId: "12D3KooWDKJqEMAhH4nsSSiKtK1VLcas5coUqSPZAfbWbZpxtL4u",
    httpPort: 9080,
    httpsPort: 443
  }
];
function getIpfsGatewayUrls(isSecure) {
  if (ENV_IPFS_GATEWAYS) return [...ENV_IPFS_GATEWAYS];
  return UNICITY_IPFS_NODES.map(
    (node) => isSecure !== false ? `https://${node.host}` : `http://${node.host}:${node.httpPort}`
  );
}
var DEFAULT_BASE_PATH = "m/44'/0'/0'";
var DEFAULT_DERIVATION_PATH = `${DEFAULT_BASE_PATH}/0/0`;
var DEFAULT_ELECTRUM_URL = "wss://fulcrum.unicity.network:50004";
var TEST_ELECTRUM_URL = "wss://fulcrum.unicity.network:50004";
var TOKEN_REGISTRY_URL = "https://raw.githubusercontent.com/unicitynetwork/unicity-ids/refs/heads/main/unicity-ids.testnet.json";
var TOKEN_REGISTRY_REFRESH_INTERVAL = 36e5;
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
var TIMEOUTS = {
  /** WebSocket connection timeout */
  WEBSOCKET_CONNECT: 1e4,
  /** Nostr relay reconnect delay */
  NOSTR_RECONNECT_DELAY: 3e3,
  /** Max reconnect attempts */
  MAX_RECONNECT_ATTEMPTS: 5,
  /** Proof polling interval */
  PROOF_POLL_INTERVAL: 1e3,
  /** Sync interval */
  SYNC_INTERVAL: 6e4
};
var LIMITS = {
  /** Min nametag length */
  NAMETAG_MIN_LENGTH: 3,
  /** Max nametag length */
  NAMETAG_MAX_LENGTH: 20,
  /** Max memo length */
  MEMO_MAX_LENGTH: 500,
  /** Max message length */
  MESSAGE_MAX_LENGTH: 1e4,
  /**
   * Issue #275 — FIFO cap for persisted dedup IDs in
   * `STORAGE_KEYS_GLOBAL.PROCESSED_WALLET_EVENT_IDS`. Sized for several
   * days of Nostr relay retention (typical relay holds 1-7 days). A
   * 10k cap at ~70 bytes per id is ~700KB serialized — well under
   * IndexedDB / file storage budgets.
   */
  PROCESSED_EVENT_IDS_CAP: 1e4,
  /**
   * Issue #275 — debounce interval for persisted dedup-set flushes.
   * Coalesces rapid arrivals (e.g., EOSE replay burst of N events) into
   * a single storage write rather than N writes. 200ms matches the
   * proven pattern in `GroupChatModule.persistProcessedEvents`.
   */
  PROCESSED_EVENT_IDS_FLUSH_MS: 200
};

// impl/browser/storage/LocalStorageProvider.ts
var LocalStorageProvider = class {
  id = "localStorage";
  name = "Local Storage";
  type = "local";
  description = "Browser localStorage for single-device persistence";
  config;
  identity = null;
  status = "disconnected";
  constructor(config) {
    const storage = config?.storage ?? this.getStorageSafe();
    this.config = {
      prefix: config?.prefix ?? "sphere_",
      storage,
      debug: config?.debug ?? false
    };
  }
  // ===========================================================================
  // BaseProvider Implementation
  // ===========================================================================
  async connect() {
    if (this.status === "connected") return;
    this.status = "connecting";
    try {
      const testKey = `${this.config.prefix}_test`;
      this.config.storage.setItem(testKey, "test");
      this.config.storage.removeItem(testKey);
      this.status = "connected";
      this.log("Connected to localStorage");
    } catch (error) {
      this.status = "error";
      throw new SphereError(`LocalStorage not available: ${error}`, "STORAGE_ERROR");
    }
  }
  async disconnect() {
    this.status = "disconnected";
    this.log("Disconnected from localStorage");
  }
  isConnected() {
    return this.status === "connected";
  }
  getStatus() {
    return this.status;
  }
  // ===========================================================================
  // StorageProvider Implementation
  // ===========================================================================
  setIdentity(identity) {
    this.identity = identity;
    this.log("Identity set:", identity.l1Address);
  }
  async get(key) {
    this.ensureConnected();
    const fullKey = this.getFullKey(key);
    return this.config.storage.getItem(fullKey);
  }
  async set(key, value) {
    this.ensureConnected();
    const fullKey = this.getFullKey(key);
    this.config.storage.setItem(fullKey, value);
  }
  async remove(key) {
    this.ensureConnected();
    const fullKey = this.getFullKey(key);
    this.config.storage.removeItem(fullKey);
  }
  async has(key) {
    this.ensureConnected();
    const fullKey = this.getFullKey(key);
    return this.config.storage.getItem(fullKey) !== null;
  }
  async keys(prefix) {
    this.ensureConnected();
    const basePrefix = this.getFullKey("");
    const searchPrefix = prefix ? this.getFullKey(prefix) : basePrefix;
    const result = [];
    for (let i = 0; i < this.config.storage.length; i++) {
      const key = this.config.storage.key(i);
      if (key?.startsWith(searchPrefix)) {
        result.push(key.slice(basePrefix.length));
      }
    }
    return result;
  }
  async clear(prefix) {
    this.ensureConnected();
    const keysToRemove = await this.keys(prefix);
    for (const key of keysToRemove) {
      await this.remove(key);
    }
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
  // ===========================================================================
  // Helpers
  // ===========================================================================
  /**
   * Get JSON data
   */
  async getJSON(key) {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  /**
   * Set JSON data
   */
  async setJSON(key, value) {
    await this.set(key, JSON.stringify(value));
  }
  // ===========================================================================
  // Private Methods
  // ===========================================================================
  getFullKey(key) {
    const isPerAddressKey = Object.values(STORAGE_KEYS_ADDRESS).includes(key);
    if (isPerAddressKey && this.identity?.directAddress) {
      const addressId = getAddressId(this.identity.directAddress);
      return `${this.config.prefix}${addressId}_${key}`;
    }
    return `${this.config.prefix}${key}`;
  }
  ensureConnected() {
    if (this.status !== "connected") {
      throw new SphereError("LocalStorageProvider not connected", "STORAGE_ERROR");
    }
  }
  getStorageSafe() {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
    return createInMemoryStorage();
  }
  log(message, ...args) {
    logger.debug("LocalStorage", message, ...args);
  }
};
function createInMemoryStorage() {
  const data = /* @__PURE__ */ new Map();
  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
    key(index) {
      return Array.from(data.keys())[index] ?? null;
    }
  };
}
function createLocalStorageProvider(config) {
  return new LocalStorageProvider(config);
}

// profile/aggregator-pointer/constants.ts
init_utils();
var PROFILE_POINTER_HKDF_INFO = utf8ToBytes("uxf-profile-aggregator-pointer-v1");
var SIGNING_SEED_INFO = utf8ToBytes("uxf-profile-pointer-sig-v1");
var XOR_SEED_INFO = utf8ToBytes("uxf-profile-pointer-xor-v1");
var PAD_SEED_INFO = utf8ToBytes("uxf-profile-pointer-pad-v1");
var VERSION_MAX = 2 ** 31 - 1;
var DISCOVERY_HARD_CEILING = 2 ** 22;
var PUBLISH_BACKOFF_MAX_MS = 4e3;
var AGGREGATOR_ALG_TAG_SHA256 = new Uint8Array([0, 0]);
var MAX_CAR_BYTES = 100 * 1024 * 1024;
var CAR_FETCH_PERSISTENT_RETRY_ATTEMPTS = 12;
var PUBLISH_REQUEST_TIMEOUT_MS = 3e4;
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

// profile/aggregator-pointer/master-key.ts
var TYPED_ARRAY_FILL = Uint8Array.prototype.fill;
var ARRAY_BUFFER_SLICE = ArrayBuffer.prototype.slice;
var NUMBER_IS_INTEGER = Number.isInteger;
var NUMBER_MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
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

// profile/aggregator-pointer/secret-key.ts
var REDACTED2 = "[REDACTED SecretKey]";
var UINT8_ARRAY_CTOR = Uint8Array;
var SecretKey = class {
  #bytes;
  #label;
  #zeroized = false;
  constructor(bytes, label) {
    if (bytes.length === 0) {
      throw new RangeError("SecretKey cannot wrap empty bytes");
    }
    this.#bytes = new UINT8_ARRAY_CTOR(bytes);
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
    return new UINT8_ARRAY_CTOR(this.#bytes);
  }
  get length() {
    return this.#bytes.length;
  }
  get label() {
    return this.#label;
  }
  toString() {
    return `${REDACTED2} <${this.#label}>`;
  }
  toJSON() {
    return `${REDACTED2} <${this.#label}>`;
  }
  // Node.js util.inspect customization — same redaction.
  // The symbol lookup is string-based to avoid a hard 'util' import in browser.
  [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
    return `${REDACTED2} <${this.#label}>`;
  }
  // Browser devtools / template-literal coercion fallback.
  [Symbol.toPrimitive](_hint) {
    return `${REDACTED2} <${this.#label}>`;
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

// ../../../node_modules/@noble/hashes/hmac.js
init_utils();
var _HMAC = class {
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
    const pad2 = new Uint8Array(blockLen);
    pad2.set(key.length > blockLen ? hash.create().update(key).digest() : key);
    for (let i = 0; i < pad2.length; i++)
      pad2[i] ^= 54;
    this.iHash.update(pad2);
    this.oHash = hash.create();
    for (let i = 0; i < pad2.length; i++)
      pad2[i] ^= 54 ^ 92;
    this.oHash.update(pad2);
    clean(pad2);
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
var hmac = (hash, key, message) => new _HMAC(hash, key).update(message).digest();
hmac.create = (hash, key) => new _HMAC(hash, key);

// ../../../node_modules/@noble/hashes/hkdf.js
init_utils();
function extract(hash, ikm, salt) {
  ahash(hash);
  if (salt === void 0)
    salt = new Uint8Array(hash.outputLen);
  return hmac(hash, salt, ikm);
}
var HKDF_COUNTER = /* @__PURE__ */ Uint8Array.of(0);
var EMPTY_BUFFER = /* @__PURE__ */ Uint8Array.of();
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
var hkdf = (hash, ikm, salt, info, length) => expand(hash, extract(hash, ikm, salt), info, length);

// profile/aggregator-pointer/key-derivation.ts
var TYPED_ARRAY_FILL2 = Uint8Array.prototype.fill;

// profile/aggregator-pointer/signing.ts
import { SigningService } from "@unicitylabs/state-transition-sdk/lib/sign/SigningService.js";

// profile/aggregator-pointer/health-check.ts
var HEALTH_CHECK_INFO = new TextEncoder().encode("profile-pointer-health-check");

// profile/aggregator-pointer/flag-store.ts
var DURABLE_STORAGE = /* @__PURE__ */ Symbol("aggregator-pointer:durable-storage");

// profile/aggregator-pointer/originated-tag.ts
var USER_ACTION_TYPES = [
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
var SYSTEM_ACTION_TYPES = [
  "session_receipt",
  "cache_index",
  "last_opened_ts"
];
var ALL_ENTRY_TYPES = Object.freeze([
  ...USER_ACTION_TYPES,
  ...SYSTEM_ACTION_TYPES
]);
var USER_ACTION_SET = new Set(USER_ACTION_TYPES);
var SYSTEM_ACTION_SET = new Set(SYSTEM_ACTION_TYPES);
for (const t of USER_ACTION_TYPES) {
  if (SYSTEM_ACTION_SET.has(t)) {
    throw new Error(
      `originated-tag: BUG \u2014 "${t}" appears in both USER_ACTION_TYPES and SYSTEM_ACTION_TYPES`
    );
  }
}

// profile/aggregator-pointer/aggregator-submit.ts
import { Authenticator } from "@unicitylabs/state-transition-sdk/lib/api/Authenticator.js";
import { RequestId } from "@unicitylabs/state-transition-sdk/lib/api/RequestId.js";
import {
  SubmitCommitmentStatus
} from "@unicitylabs/state-transition-sdk/lib/api/SubmitCommitmentResponse.js";
import { DataHash } from "@unicitylabs/state-transition-sdk/lib/hash/DataHash.js";
import { HashAlgorithm } from "@unicitylabs/state-transition-sdk/lib/hash/HashAlgorithm.js";

// profile/aggregator-pointer/aggregator-probe.ts
import { RequestId as RequestId2 } from "@unicitylabs/state-transition-sdk/lib/api/RequestId.js";
import { DataHash as DataHash2 } from "@unicitylabs/state-transition-sdk/lib/hash/DataHash.js";
import { HashAlgorithm as HashAlgorithm2 } from "@unicitylabs/state-transition-sdk/lib/hash/HashAlgorithm.js";
import { InclusionProofVerificationStatus } from "@unicitylabs/state-transition-sdk/lib/transaction/InclusionProof.js";

// profile/aggregator-pointer/car-loss-tracker.ts
var MAX_ATTEMPTS_RETAINED = CAR_FETCH_PERSISTENT_RETRY_ATTEMPTS * 4;

// profile/aggregator-pointer/win-broadcast.ts
import { DataHasher } from "@unicitylabs/state-transition-sdk/lib/hash/DataHasher.js";
import { HashAlgorithm as HashAlgorithm3 } from "@unicitylabs/state-transition-sdk/lib/hash/HashAlgorithm.js";
import { Signature } from "@unicitylabs/state-transition-sdk/lib/sign/Signature.js";
import { SigningService as SigningService2 } from "@unicitylabs/state-transition-sdk/lib/sign/SigningService.js";
var MAX_PAYLOAD_AGE_MS = 5 * 60 * 1e3;

// impl/browser/storage/IndexedDBStorageProvider.ts
var DB_NAME = "sphere-storage";
var DB_VERSION = 1;
var STORE_NAME = "kv";
var connectionSeq = 0;
var IndexedDBStorageProvider = class {
  id = "indexeddb-storage";
  name = "IndexedDB Storage";
  type = "local";
  description = "Browser IndexedDB for large-capacity persistence";
  /**
   * Durability marker consumed by the aggregator-pointer FlagStore
   * (SPEC §7.1.3). Write methods (`idbPut` / `idbDelete` / `idbClear`)
   * resolve their Promises on `tx.oncomplete` — at which point the
   * transaction has been committed by the IndexedDB engine and the
   * data survives a page reload or tab crash. Callers can therefore
   * treat a resolved `set()` / `remove()` as durable.
   */
  [DURABLE_STORAGE] = true;
  prefix;
  dbName;
  debug;
  identity = null;
  status = "disconnected";
  db = null;
  /** Monotonic connection ID for tracing open/close pairs */
  connId = 0;
  constructor(config) {
    this.prefix = config?.prefix ?? "sphere_";
    this.dbName = config?.dbName ?? DB_NAME;
    this.debug = config?.debug ?? false;
  }
  // ===========================================================================
  // BaseProvider Implementation
  // ===========================================================================
  async connect() {
    if (this.status === "connected" && this.db) return;
    for (let attempt = 0; attempt < 2; attempt++) {
      this.status = "connecting";
      const t0 = Date.now();
      logger.debug("IndexedDB", ` connect: opening db=${this.dbName}, attempt=${attempt + 1}/2`);
      try {
        this.db = await Promise.race([
          this.openDatabase(),
          new Promise(
            (_, reject) => setTimeout(() => reject(new Error("IndexedDB open timed out after 5s")), 5e3)
          )
        ]);
        this.status = "connected";
        logger.debug("IndexedDB", ` connect: connected db=${this.dbName} connId=${this.connId} (${Date.now() - t0}ms)`);
        return;
      } catch (error) {
        logger.warn("IndexedDB", ` connect: open failed db=${this.dbName} attempt=${attempt + 1} (${Date.now() - t0}ms):`, error);
        if (attempt === 0) {
          this.status = "disconnected";
          await new Promise((r) => setTimeout(r, 1e3));
          continue;
        }
        this.status = "error";
        throw new SphereError(`IndexedDB not available: ${error}`, "STORAGE_ERROR");
      }
    }
  }
  async disconnect() {
    const cid = this.connId;
    logger.debug("IndexedDB", ` disconnect: db=${this.dbName} connId=${cid} wasConnected=${!!this.db}`);
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.status = "disconnected";
  }
  isConnected() {
    return this.status === "connected" && this.db !== null;
  }
  getStatus() {
    return this.status;
  }
  // ===========================================================================
  // StorageProvider Implementation
  // ===========================================================================
  setIdentity(identity) {
    this.identity = identity;
    this.log("Identity set:", identity.l1Address);
  }
  async get(key) {
    this.ensureConnected();
    const fullKey = this.getFullKey(key);
    const result = await this.idbGet(fullKey);
    return result?.v ?? null;
  }
  async set(key, value) {
    this.ensureConnected();
    const fullKey = this.getFullKey(key);
    await this.idbPut({ k: fullKey, v: value });
  }
  /**
   * Wave G.6: atomic multi-key write within a single IDB transaction.
   * Either every entry commits (`tx.oncomplete`) or every entry is
   * rolled back (`tx.onabort` — IndexedDB auto-aborts on any per-
   * request error). This closes the partial-write hazard for cross-
   * key invariants like wallet metadata persistence.
   */
  async setMany(entries) {
    this.ensureConnected();
    if (entries.length === 0) return;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      const store = tx.objectStore(STORE_NAME);
      for (const [key, value] of entries) {
        const fullKey = this.getFullKey(key);
        const req = store.put({ k: fullKey, v: value });
        req.onerror = () => reject(req.error);
      }
    });
  }
  async remove(key) {
    this.ensureConnected();
    const fullKey = this.getFullKey(key);
    await this.idbDelete(fullKey);
  }
  async has(key) {
    this.ensureConnected();
    const fullKey = this.getFullKey(key);
    const count = await this.idbCount(fullKey);
    return count > 0;
  }
  async keys(prefix) {
    this.ensureConnected();
    const basePrefix = this.getFullKey("");
    const searchPrefix = prefix ? this.getFullKey(prefix) : basePrefix;
    const allEntries = await this.idbGetAll();
    const result = [];
    for (const entry of allEntries) {
      if (entry.k.startsWith(searchPrefix)) {
        result.push(entry.k.slice(basePrefix.length));
      }
    }
    return result;
  }
  async clear(prefix) {
    if (!prefix) {
      const t0 = Date.now();
      const prevConnId = this.connId;
      logger.debug("IndexedDB", ` clear: starting db=${this.dbName} connId=${prevConnId} status=${this.status} hasDb=${!!this.db}`);
      try {
        if (!this.db || this.status !== "connected") {
          if (this.db) {
            logger.debug("IndexedDB", ` clear: closing stale handle connId=${prevConnId}`);
            this.db.close();
            this.db = null;
          }
          logger.debug("IndexedDB", ` clear: opening fresh connection for wipe`);
          this.db = await Promise.race([
            this.openDatabase(),
            new Promise(
              (_, reject) => setTimeout(() => reject(new Error("open timed out")), 3e3)
            )
          ]);
          this.status = "connected";
        }
        await this.idbClear();
        logger.debug("IndexedDB", ` clear: store cleared db=${this.dbName} connId=${this.connId} (${Date.now() - t0}ms)`);
      } catch (err) {
        logger.warn("IndexedDB", ` clear: failed db=${this.dbName} (${Date.now() - t0}ms)`, err);
      } finally {
        if (this.db) {
          this.db.close();
          this.db = null;
        }
        this.status = "disconnected";
      }
      return;
    }
    this.ensureConnected();
    const keysToRemove = await this.keys(prefix);
    for (const key of keysToRemove) {
      await this.remove(key);
    }
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
  // ===========================================================================
  // Helpers
  // ===========================================================================
  /**
   * Get JSON data
   */
  async getJSON(key) {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  /**
   * Set JSON data
   */
  async setJSON(key, value) {
    await this.set(key, JSON.stringify(value));
  }
  // ===========================================================================
  // Private: Key Scoping
  // ===========================================================================
  getFullKey(key) {
    const isPerAddressKey = Object.values(STORAGE_KEYS_ADDRESS).includes(key);
    if (isPerAddressKey && this.identity?.directAddress) {
      const addressId = getAddressId(this.identity.directAddress);
      return `${this.prefix}${addressId}_${key}`;
    }
    return `${this.prefix}${key}`;
  }
  ensureConnected() {
    if (this.status !== "connected" || !this.db) {
      throw new SphereError("IndexedDBStorageProvider not connected", "STORAGE_ERROR");
    }
  }
  // ===========================================================================
  // Private: IndexedDB Operations
  // ===========================================================================
  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const cid = ++connectionSeq;
        this.connId = cid;
        db.onversionchange = () => {
          logger.debug("IndexedDB", ` onversionchange: auto-closing db=${this.dbName} connId=${cid}`);
          db.close();
          if (this.db === db) {
            this.db = null;
            this.status = "disconnected";
          }
        };
        resolve(db);
      };
      request.onblocked = () => {
        logger.warn("IndexedDB", ` open blocked by another connection, db=${this.dbName}`);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "k" });
        }
      };
    });
  }
  idbGet(key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? void 0);
    });
  }
  // Write paths resolve on `tx.oncomplete`, not `request.onsuccess`.
  // A successful put/delete request only means the op was queued
  // inside an uncommitted transaction — if the tab dies between
  // onsuccess and commit (or the browser flushes the transaction
  // later than the microtask that resolves our Promise), the write
  // would be lost. The pointer layer requires the DURABLE_STORAGE
  // contract (SPEC §7.1.3), which is defined as "the Promise
  // resolves only after the transaction commits" — IndexedDB fires
  // `tx.oncomplete` precisely at that moment. Errors surface via
  // `tx.onerror`/`tx.onabort` in addition to the request-level
  // error, so both event streams are listened on.
  idbPut(entry) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(entry);
      request.onerror = () => reject(request.error);
    });
  }
  idbDelete(key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onerror = () => reject(request.error);
    });
  }
  idbCount(key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.count(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
  idbGetAll() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? []);
    });
  }
  idbClear() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();
      request.onerror = () => reject(request.error);
    });
  }
  log(message, ...args) {
    logger.debug("IndexedDB", message, ...args);
  }
};
function createIndexedDBStorageProvider(config) {
  return new IndexedDBStorageProvider(config);
}

// impl/browser/storage/IndexedDBTokenStorageProvider.ts
var DB_NAME2 = "sphere-token-storage";
var DB_VERSION2 = 2;
var STORE_TOKENS = "tokens";
var STORE_META = "meta";
var STORE_HISTORY = "history";
var connectionSeq2 = 0;
var IndexedDBTokenStorageProvider = class _IndexedDBTokenStorageProvider {
  id = "indexeddb-token-storage";
  name = "IndexedDB Token Storage";
  type = "local";
  dbNamePrefix;
  dbName;
  debug;
  db = null;
  status = "disconnected";
  identity = null;
  /** Monotonic connection ID for tracing open/close pairs */
  connId = 0;
  constructor(config) {
    this.dbNamePrefix = config?.dbNamePrefix ?? DB_NAME2;
    this.dbName = this.dbNamePrefix;
    this.debug = config?.debug ?? false;
  }
  setIdentity(identity) {
    this.identity = identity;
    if (identity.directAddress) {
      const addressId = getAddressId(identity.directAddress);
      this.dbName = `${this.dbNamePrefix}-${addressId}`;
    }
    logger.debug("IndexedDBToken", `setIdentity: db=${this.dbName}`);
  }
  async initialize() {
    const prevConnId = this.connId;
    const t0 = Date.now();
    try {
      if (this.db) {
        logger.debug("IndexedDBToken", `initialize: closing existing connId=${prevConnId} before re-open (db=${this.dbName})`);
        this.db.close();
        this.db = null;
      }
      logger.debug("IndexedDBToken", `initialize: opening db=${this.dbName}`);
      this.db = await this.openDatabase();
      this.status = "connected";
      logger.debug("IndexedDBToken", `initialize: connected db=${this.dbName} connId=${this.connId} (${Date.now() - t0}ms)`);
      return true;
    } catch (error) {
      logger.error("IndexedDBToken", `initialize: failed db=${this.dbName} (${Date.now() - t0}ms):`, error);
      this.status = "error";
      return false;
    }
  }
  // Issue #239 — accept ShutdownOptions for interface conformance.
  // IndexedDBTokenStorageProvider has no remote-durability boundary
  // (every save() returns after the IDB transaction commits locally)
  // so the options are intentionally ignored.
  async shutdown(_options) {
    const cid = this.connId;
    logger.debug("IndexedDBToken", `shutdown: db=${this.dbName} connId=${cid} wasConnected=${!!this.db}`);
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.status = "disconnected";
  }
  async connect() {
    await this.initialize();
  }
  async disconnect() {
    await this.shutdown();
  }
  isConnected() {
    return this.status === "connected" && this.db !== null;
  }
  getStatus() {
    return this.status;
  }
  async load() {
    if (!this.db) {
      logger.warn("IndexedDBToken", `load: db not initialized (db=${this.dbName})`);
      return {
        success: false,
        error: "Database not initialized",
        source: "local",
        timestamp: Date.now()
      };
    }
    try {
      const data = {
        _meta: {
          version: 1,
          address: this.identity?.l1Address ?? "",
          formatVersion: "2.0",
          updatedAt: Date.now()
        }
      };
      const meta = await this.getFromStore(STORE_META, "meta");
      if (meta) {
        data._meta = meta;
      }
      const tokens = await this.getAllFromStore(STORE_TOKENS);
      for (const token of tokens) {
        if (token.id.startsWith("token-") || token.id.startsWith("nametag-")) {
          continue;
        }
        if (token.id.startsWith("archived-")) {
          data[token.id] = token.data;
        } else {
          const key = `_${token.id}`;
          data[key] = token.data;
        }
      }
      const tombstones = await this.getFromStore(STORE_META, "tombstones");
      if (tombstones) {
        data._tombstones = tombstones;
      }
      const outbox = await this.getFromStore(STORE_META, "outbox");
      if (outbox) {
        data._outbox = outbox;
      }
      const sent = await this.getFromStore(STORE_META, "sent");
      if (sent) {
        data._sent = sent;
      }
      const invalid = await this.getFromStore(STORE_META, "invalid");
      if (invalid) {
        data._invalid = invalid;
      }
      const tokenKeys = Object.keys(data).filter((k) => k.startsWith("_") && !["_meta", "_tombstones", "_outbox", "_sent", "_invalid"].includes(k));
      logger.debug("IndexedDBToken", `load: db=${this.dbName}, tokens=${tokenKeys.length}`);
      return {
        success: true,
        data,
        source: "local",
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error("IndexedDBToken", `load failed: db=${this.dbName}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        source: "local",
        timestamp: Date.now()
      };
    }
  }
  async save(data) {
    if (!this.db) {
      logger.warn("IndexedDBToken", `save: db not initialized (db=${this.dbName})`);
      return {
        success: false,
        error: "Database not initialized",
        timestamp: Date.now()
      };
    }
    try {
      const tokenKeys = Object.keys(data).filter((k) => k.startsWith("_") && !["_meta", "_tombstones", "_outbox", "_sent", "_invalid"].includes(k));
      const archivedKeys = Object.keys(data).filter((k) => k.startsWith("archived-"));
      logger.debug("IndexedDBToken", `save: db=${this.dbName}, tokens=${tokenKeys.length}, archived=${archivedKeys.length}, tombstones=${data._tombstones?.length ?? 0}`);
      await this.putToStore(STORE_META, "meta", data._meta);
      if (data._tombstones) {
        await this.putToStore(STORE_META, "tombstones", data._tombstones);
      }
      if (data._outbox) {
        await this.putToStore(STORE_META, "outbox", data._outbox);
      }
      if (data._sent) {
        await this.putToStore(STORE_META, "sent", data._sent);
      }
      if (data._invalid) {
        await this.putToStore(STORE_META, "invalid", data._invalid);
      }
      const reservedKeys = ["_meta", "_tombstones", "_outbox", "_sent", "_invalid"];
      for (const [key, value] of Object.entries(data)) {
        if (reservedKeys.includes(key)) continue;
        if (key.startsWith("_")) {
          const tokenId = key.slice(1);
          await this.putToStore(STORE_TOKENS, tokenId, { id: tokenId, data: value });
        } else if (key.startsWith("archived-")) {
          await this.putToStore(STORE_TOKENS, key, { id: key, data: value });
        }
      }
      if (data._tombstones) {
        for (const tombstone of data._tombstones) {
          await this.deleteFromStore(STORE_TOKENS, tombstone.tokenId);
        }
      }
      return {
        success: true,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now()
      };
    }
  }
  async sync(localData) {
    const saveResult = await this.save(localData);
    return {
      success: saveResult.success,
      merged: localData,
      added: 0,
      removed: 0,
      conflicts: 0,
      error: saveResult.error
    };
  }
  async exists() {
    if (!this.db) return false;
    const meta = await this.getFromStore(STORE_META, "meta");
    return meta !== null;
  }
  async clear() {
    const t0 = Date.now();
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      this.status = "disconnected";
      const dbNames = /* @__PURE__ */ new Set([this.dbName]);
      for (const name of await this.findPrefixedDatabases()) {
        dbNames.add(name);
      }
      logger.debug("IndexedDBToken", `clear: clearing ${dbNames.size} database(s) (${[...dbNames].join(", ")})`);
      const results = await Promise.allSettled(
        [...dbNames].map((name) => this.clearDatabaseStores(name))
      );
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        logger.warn(
          "IndexedDBToken",
          `clear: ${failed.length}/${dbNames.size} failed (${Date.now() - t0}ms)`,
          failed.map((r) => r.reason)
        );
      }
      logger.debug("IndexedDBToken", `clear: done ${dbNames.size} database(s) (${Date.now() - t0}ms)`);
      return failed.length === 0;
    } catch (err) {
      logger.warn("IndexedDBToken", `clear: failed (${Date.now() - t0}ms)`, err);
      return false;
    }
  }
  // =========================================================================
  // Private IndexedDB helpers
  // =========================================================================
  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, DB_VERSION2);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const cid = ++connectionSeq2;
        this.connId = cid;
        db.onversionchange = () => {
          logger.debug("IndexedDBToken", `onversionchange: auto-closing db=${this.dbName} connId=${cid}`);
          db.close();
          if (this.db === db) {
            this.db = null;
            this.status = "disconnected";
          }
        };
        resolve(db);
      };
      request.onblocked = () => {
        logger.warn("IndexedDBToken", `open blocked by another connection, db=${this.dbName}`);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_TOKENS)) {
          db.createObjectStore(STORE_TOKENS, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META);
        }
        if (!db.objectStoreNames.contains(STORE_HISTORY)) {
          db.createObjectStore(STORE_HISTORY, { keyPath: "dedupKey" });
        }
      };
    });
  }
  getFromStore(storeName, key) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null);
        return;
      }
      const transaction = this.db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  }
  getAllFromStore(storeName) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }
      const transaction = this.db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? []);
    });
  }
  putToStore(storeName, key, value) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }
      const transaction = this.db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = storeName === STORE_META ? store.put(value, key) : store.put(value);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  deleteFromStore(storeName, key) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }
      const transaction = this.db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  /**
   * Find all IndexedDB databases with our prefix.
   * Returns empty array if indexedDB.databases() is unavailable (older browsers).
   */
  async findPrefixedDatabases() {
    if (typeof indexedDB.databases !== "function") return [];
    try {
      const allDbs = await Promise.race([
        indexedDB.databases(),
        new Promise(
          (_, reject) => setTimeout(() => reject(new Error("databases() timed out")), 1500)
        )
      ]);
      return allDbs.map((info) => info.name).filter((name) => !!name && name.startsWith(this.dbNamePrefix));
    } catch {
      return [];
    }
  }
  // =========================================================================
  // Public: History operations
  // =========================================================================
  /**
   * Add a history entry. Uses `put` (upsert by dedupKey) so duplicate
   * calls with the same dedupKey simply overwrite — no duplicates.
   */
  async addHistoryEntry(entry) {
    await this.putToStore(STORE_HISTORY, entry.dedupKey, entry);
  }
  /**
   * Get all history entries sorted by timestamp descending.
   */
  async getHistoryEntries() {
    const entries = await this.getAllFromStore(STORE_HISTORY);
    return entries.sort((a, b) => b.timestamp - a.timestamp);
  }
  /**
   * Check if a history entry with the given dedupKey exists.
   */
  async hasHistoryEntry(dedupKey) {
    const entry = await this.getFromStore(STORE_HISTORY, dedupKey);
    return entry !== null;
  }
  /**
   * Clear all history entries.
   */
  async clearHistory() {
    if (!this.db) return;
    await new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_HISTORY, "readwrite");
      const req = tx.objectStore(STORE_HISTORY).clear();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }
  /**
   * Bulk import history entries. Entries with existing dedupKeys are
   * skipped (first-write-wins). Returns the number of newly imported entries.
   */
  async importHistoryEntries(entries) {
    if (!this.db || entries.length === 0) return 0;
    let imported = 0;
    for (const entry of entries) {
      const exists = await this.hasHistoryEntry(entry.dedupKey);
      if (!exists) {
        await this.addHistoryEntry(entry);
        imported++;
      }
    }
    return imported;
  }
  // =========================================================================
  // Private IndexedDB helpers (clear)
  // =========================================================================
  /**
   * Clear all object stores in a single database.
   * Opens a temporary connection, clears STORE_TOKENS and STORE_META, then closes.
   * Uses IDBObjectStore.clear() which is a normal readwrite transaction — cannot
   * be blocked by other connections (unlike deleteDatabase()).
   */
  async clearDatabaseStores(dbName) {
    const db = await Promise.race([
      new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName, DB_VERSION2);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db2 = req.result;
          db2.onversionchange = () => {
            db2.close();
          };
          resolve(db2);
        };
        req.onupgradeneeded = (event) => {
          const db2 = event.target.result;
          if (!db2.objectStoreNames.contains(STORE_TOKENS)) {
            db2.createObjectStore(STORE_TOKENS, { keyPath: "id" });
          }
          if (!db2.objectStoreNames.contains(STORE_META)) {
            db2.createObjectStore(STORE_META);
          }
          if (!db2.objectStoreNames.contains(STORE_HISTORY)) {
            db2.createObjectStore(STORE_HISTORY, { keyPath: "dedupKey" });
          }
        };
      }),
      new Promise(
        (_, reject) => setTimeout(() => reject(new Error(`open timed out: ${dbName}`)), 3e3)
      )
    ]);
    try {
      for (const storeName of [STORE_TOKENS, STORE_META, STORE_HISTORY]) {
        if (db.objectStoreNames.contains(storeName)) {
          await new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, "readwrite");
            const req = tx.objectStore(storeName).clear();
            req.onerror = () => reject(req.error);
            req.onsuccess = () => resolve();
          });
        }
      }
    } finally {
      db.close();
    }
  }
  /**
   * Create an independent instance for a different address.
   * The new instance shares the same config but has its own IDB connection.
   */
  createForAddress() {
    return new _IndexedDBTokenStorageProvider({
      dbNamePrefix: this.dbNamePrefix,
      debug: this.debug
    });
  }
};
function createIndexedDBTokenStorageProvider(config) {
  return new IndexedDBTokenStorageProvider(config);
}

// transport/NostrTransportProvider.ts
init_sha2();
import { Buffer as Buffer3 } from "buffer";
import {
  NostrKeyManager,
  NIP04,
  NIP17,
  NIP44,
  Event as NostrEventClass,
  EventKinds,
  decryptNametag,
  NostrClient,
  Filter,
  isChatMessage,
  isReadReceipt
} from "@unicitylabs/nostr-js-sdk";

// transport/transport-provider.ts
var SUPPORTED_WIRE_PROTOCOLS = [
  "uxf-car",
  "uxf-cid",
  "txf"
];
var SUPPORTED_ASSET_KINDS = ["coin", "nft"];

// transport/NostrTransportProvider.ts
init_utils();

// core/hex.ts
function hexToBytes2(hex) {
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
function bytesToHex3(bytes) {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

// transport/websocket.ts
var WebSocketReadyState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};
function defaultUUIDGenerator() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}

// types/uxf-transfer.ts
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isUxfTransferPayloadCar(value) {
  if (!isPlainObject(value)) return false;
  if (value.kind !== "uxf-car") return false;
  if (value.version !== "1.0") return false;
  if (value.mode !== "conservative" && value.mode !== "instant") return false;
  if (typeof value.bundleCid !== "string" || value.bundleCid.length === 0) return false;
  if (!Array.isArray(value.tokenIds)) return false;
  if (value.tokenIds.length > 256) return false;
  for (const t of value.tokenIds) {
    if (typeof t !== "string" || t.length === 0) return false;
  }
  if (typeof value.carBase64 !== "string") return false;
  if (value.carBase64.length === 0) return false;
  return true;
}
function isUxfTransferPayloadCid(value) {
  if (!isPlainObject(value)) return false;
  if (value.kind !== "uxf-cid") return false;
  if (value.version !== "1.0") return false;
  if (value.mode !== "conservative" && value.mode !== "instant") return false;
  if (typeof value.bundleCid !== "string" || value.bundleCid.length === 0) return false;
  if (!Array.isArray(value.tokenIds)) return false;
  if (value.tokenIds.length > 256) return false;
  for (const t of value.tokenIds) {
    if (typeof t !== "string" || t.length === 0) return false;
  }
  if ("carBase64" in value) return false;
  return true;
}
function isUxfTransferPayload(value) {
  if (!isPlainObject(value)) return false;
  if (value.kind === "uxf-car") return isUxfTransferPayloadCar(value);
  if (value.kind === "uxf-cid") return isUxfTransferPayloadCid(value);
  if (value.kind !== void 0) return false;
  return isLegacyTokenTransferPayload(value);
}
function isLegacyTokenTransferPayload(value) {
  if (!isPlainObject(value)) return false;
  if (value.type === "COMBINED_TRANSFER" && value.version === "6.0") return true;
  if (value.type === "INSTANT_SPLIT" && (value.version === "4.0" || value.version === "5.0")) {
    return true;
  }
  if (value.sourceToken !== void 0 && value.transferTx !== void 0) return true;
  if (value.token !== void 0 && value.proof !== void 0) return true;
  return false;
}

// uxf/transfer-payload.ts
import { CarReader } from "@ipld/car";
import { bytesReader, readHeader } from "@ipld/car/decoder";
import { Buffer as Buffer2 } from "buffer";

// uxf/limits.ts
var CAR_IMPORT_MAX_BLOCK_BYTES = 64 * 1024;
var VERIFY_MAX_ELEMENT_BYTES = 64 * 1024;
var EXTRACT_CAR_ROOT_HEADER_PROBE_BYTES = 4 * 1024;
var CAR_IMPORT_MAX_TOTAL_BYTES = 64 * 1024 * 1024;

// uxf/transfer-payload.ts
function encodeTransferPayload(payload) {
  if (!isUxfTransferPayload(payload)) {
    throw new SphereError(
      "encodeTransferPayload: payload failed structural validation",
      "BUNDLE_REJECTED_MALFORMED_ENVELOPE"
    );
  }
  const ordered = orderForSerialization(payload);
  return JSON.stringify(ordered);
}
var MAX_DECODE_CONTENT_BYTES = 8 * 1024 * 1024;
function decodeTransferPayload(content) {
  if (content.length > MAX_DECODE_CONTENT_BYTES) {
    throw new SphereError(
      `decodeTransferPayload: content length ${content.length} exceeds MAX_DECODE_CONTENT_BYTES=${MAX_DECODE_CONTENT_BYTES}`,
      "BUNDLE_REJECTED_MALFORMED_ENVELOPE"
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (cause) {
    throw new SphereError(
      "decodeTransferPayload: input is not valid JSON",
      "BUNDLE_REJECTED_MALFORMED_ENVELOPE",
      cause
    );
  }
  if (!isUxfTransferPayload(parsed)) {
    throw new SphereError(
      "decodeTransferPayload: payload failed structural validation",
      "BUNDLE_REJECTED_MALFORMED_ENVELOPE"
    );
  }
  return parsed;
}
async function extractCarRootCid(carBytes) {
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
      reader = await CarReader.fromBytes(carBytes);
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
function orderForSerialization(payload) {
  if (isUxfTransferPayloadCar(payload)) {
    return orderUxfCar(payload);
  }
  if (isUxfTransferPayloadCid(payload)) {
    return orderUxfCid(payload);
  }
  return sortKeysRecursive(payload);
}
function orderUxfCar(payload) {
  const out = {
    kind: payload.kind,
    version: payload.version,
    mode: payload.mode,
    bundleCid: payload.bundleCid,
    tokenIds: [...payload.tokenIds]
  };
  if (payload.memo !== void 0) out.memo = payload.memo;
  if (payload.sender !== void 0) {
    out.sender = orderSender(payload.sender);
  }
  out.carBase64 = payload.carBase64;
  return out;
}
function orderUxfCid(payload) {
  const out = {
    kind: payload.kind,
    version: payload.version,
    mode: payload.mode,
    bundleCid: payload.bundleCid,
    tokenIds: [...payload.tokenIds]
  };
  if (payload.memo !== void 0) out.memo = payload.memo;
  if (payload.sender !== void 0) {
    out.sender = orderSender(payload.sender);
  }
  if (payload.senderGateways !== void 0) {
    out.senderGateways = [...payload.senderGateways];
  }
  return out;
}
function orderSender(sender) {
  const out = {
    transportPubkey: sender.transportPubkey
  };
  if (sender.nametag !== void 0) out.nametag = sender.nametag;
  return out;
}
function sortKeysRecursive(value) {
  if (Array.isArray(value)) {
    return value.map((v) => sortKeysRecursive(v));
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value);
    entries.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    const out = {};
    for (const [k, v] of entries) {
      out[k] = sortKeysRecursive(v);
    }
    return out;
  }
  return value;
}

// transport/NostrTransportProvider.ts
var COMPOSING_INDICATOR_KIND = 25050;
var TIMESTAMP_RANDOMIZATION = 2 * 24 * 60 * 60;
var EVENT_KINDS = NOSTR_EVENT_KINDS;
var NostrTransportProvider = class _NostrTransportProvider {
  id = "nostr";
  name = "Nostr Transport";
  type = "p2p";
  description = "P2P messaging via Nostr protocol";
  config;
  storage = null;
  /** In-memory max event timestamp to avoid read-before-write races in updateLastEventTimestamp. */
  lastEventTs = 0;
  /** In-memory max DM (gift-wrap) event timestamp. */
  lastDmEventTs = 0;
  /** Fallback 'since' timestamp for first-time address subscriptions (consumed once). */
  fallbackSince = null;
  /** Fallback 'since' timestamp for DM (gift-wrap) subscriptions (consumed once). */
  fallbackDmSince = null;
  identity = null;
  keyManager = null;
  status = "disconnected";
  // NostrClient from nostr-js-sdk handles all WebSocket management,
  // keepalive pings, reconnection, and NIP-42 authentication
  nostrClient = null;
  mainSubscriptionId = null;
  // Event handlers — two-tier dedup (issue #275).
  //
  // `processedEventIds` is the PERSISTED set of event IDs that we have
  // successfully processed (i.e., the wallet cursor advanced past them).
  // It is hydrated from KV storage on connect/fetchPendingEvents so
  // cross-process CLI invocations do not re-walk the relay backlog. The
  // §C soak forensics in issue #275 showed 169 dispatches across 15
  // unique event IDs because this set previously lived in-process only
  // — 71.5% of §C wall-clock was wasted on duplicate dispatch.
  //
  // We MUST NOT add to this set before the event handler completes
  // successfully: doing so would mask the at-least-once retry that
  // TOKEN_TRANSFER's durability gate depends on (a failed event would
  // be persisted as "processed" and never re-tried across restarts).
  //
  // `inFlightEventIds` is the IN-MEMORY set used for concurrent-arrival
  // dedup: the same relay event may be delivered via multiple
  // subscriptions (wallet sub + chat sub) within the same process. It
  // is never persisted; entries are removed in the `finally` block of
  // `handleEvent` so the second arrival short-circuits while the first
  // is still in flight.
  processedEventIds = /* @__PURE__ */ new Set();
  inFlightEventIds = /* @__PURE__ */ new Set();
  /**
   * Issue #275 — debounce timer for persisting `processedEventIds` and
   * `failedEventCooldowns`. Coalesces a burst of EOSE-replay arrivals
   * into a single storage write. Set to `LIMITS.PROCESSED_EVENT_IDS_FLUSH_MS`.
   */
  persistDedupTimer = null;
  /** Reentrancy guard so concurrent schedules don't race the in-flight write. */
  persistDedupInFlight = null;
  /** True once dedup state has been hydrated from storage; gates re-hydration. */
  dedupHydrated = false;
  /**
   * Issue #272 + #275 — per-event failure cooldown ledger for TOKEN_TRANSFER
   * replays. When `handleIncomingTransfer` returns `false` (the at-
   * least-once gate refused the ack), we record an exponential cool-
   * down so the relay-paced replay storm cannot busy-spin the
   * receive pipeline (parse → crypto verify → flush → HEAD-verify)
   * for the same event on every reconnect cycle.
   *
   * Semantics:
   *   - `attempts` counts consecutive durability misses. Cleared on
   *     success (advance happens) or when the bounded budget exhausts.
   *   - `nextRetryAt` is `Date.now() + min(COOLDOWN_BASE_MS * 2^(n-1),
   *     COOLDOWN_MAX_MS)`. Events arriving inside the cooldown window
   *     are skipped without entering the gate.
   *   - After `MAX_REPLAY_ATTEMPTS` consecutive misses, we ADVANCE the
   *     cursor anyway and emit an operator alert. This matches the
   *     acceptance criterion in issue #272: "`[AT-LEAST-ONCE] not
   *     durable` count per token bounded by a small constant (≤3)
   *     rather than unbounded replay." Local-durability is intact
   *     (issue #272 also decoupled the per-flush HEAD-verify from
   *     the gate, so persistent durability=false now strictly
   *     indicates an underlying OrbitDB/pin POST/publish failure that
   *     replay alone won't fix — operator intervention is the right
   *     escalation).
   *   - The map is LRU-capped to bound memory under pathological
   *     replay floods. Eviction is single-victim per insert when at
   *     capacity (cheap; no full sort).
   *
   * Issue #275: this map is now PERSISTED across process restarts so
   * the bounded replay budget accumulates across CLI invocations
   * instead of resetting to zero per-process. Without persistence, a
   * persistently-failing TOKEN_TRANSFER could replay across CLI
   * sessions indefinitely because every fresh process saw `attempts=1`
   * and never reached the budget exhaustion threshold.
   */
  failedEventCooldowns = /* @__PURE__ */ new Map();
  static DURABILITY_COOLDOWN_BASE_MS = 3e4;
  static DURABILITY_COOLDOWN_MAX_MS = 12e4;
  static DURABILITY_MAX_REPLAY_ATTEMPTS = 3;
  static DURABILITY_COOLDOWN_MAP_CAP = 256;
  messageHandlers = /* @__PURE__ */ new Set();
  transferHandlers = /* @__PURE__ */ new Set();
  paymentRequestHandlers = /* @__PURE__ */ new Set();
  paymentRequestResponseHandlers = /* @__PURE__ */ new Set();
  readReceiptHandlers = /* @__PURE__ */ new Set();
  typingIndicatorHandlers = /* @__PURE__ */ new Set();
  composingHandlers = /* @__PURE__ */ new Set();
  pendingMessages = [];
  /**
   * Issue #247 — buffer for TOKEN_TRANSFER events that arrive on this
   * outer provider before any handler is registered. The pre-Mux race
   * (#223 comment in `handleTokenTransfer`) sees relay events landing
   * here while `PaymentsModule` has registered its handler on the
   * AddressTransportAdapter, not on this provider. Without a buffer,
   * the events are dropped (allDurable=false → since-not-advanced) and
   * the only recovery is replay-on-reconnect — producing the persistent
   * "TOKEN_TRANSFER ... not durable" storm observed in
   * manual-test-full-recovery.sh.
   *
   * Buffered transfers are drained when a handler registers via
   * `onTokenTransfer` (in-session catch-up). If the process exits
   * before any handler registers, `lastEventTs` was not advanced and
   * the events replay on next reconnect — preserving at-least-once.
   *
   * Each entry retains the original event's `created_at` (seconds) so
   * the drain can advance `lastEventTs` per-event on successful
   * delivery.
   */
  pendingTransfers = [];
  broadcastHandlers = /* @__PURE__ */ new Map();
  eventCallbacks = /* @__PURE__ */ new Set();
  constructor(config) {
    this.config = {
      relays: config.relays ?? [...DEFAULT_NOSTR_RELAYS],
      timeout: config.timeout ?? TIMEOUTS.WEBSOCKET_CONNECT,
      autoReconnect: config.autoReconnect ?? true,
      reconnectDelay: config.reconnectDelay ?? TIMEOUTS.NOSTR_RECONNECT_DELAY,
      maxReconnectAttempts: config.maxReconnectAttempts ?? TIMEOUTS.MAX_RECONNECT_ATTEMPTS,
      debug: config.debug ?? false,
      createWebSocket: config.createWebSocket,
      generateUUID: config.generateUUID ?? defaultUUIDGenerator
    };
    this.storage = config.storage ?? null;
  }
  /**
   * Get the WebSocket factory (used by MultiAddressTransportMux to share the same factory).
   */
  getWebSocketFactory() {
    return this.config.createWebSocket;
  }
  /**
   * Get the configured relay URLs.
   */
  getConfiguredRelays() {
    return [...this.config.relays];
  }
  /**
   * Get the storage adapter.
   */
  getStorageAdapter() {
    return this.storage;
  }
  /**
   * Get the underlying NostrClient (or null if not yet connected).
   *
   * Exposed so {@link MultiAddressTransportMux} can share the same
   * client/socket pair instead of opening a duplicate WebSocket per
   * relay (#123). The transport owns the client's lifecycle — callers
   * MUST NOT call {@code disconnect()} on the returned instance.
   */
  getNostrClient() {
    return this.nostrClient;
  }
  /**
   * Suppress event subscriptions — unsubscribe wallet/chat filters
   * but keep the connection alive for resolve/identity-binding operations.
   * Used when MultiAddressTransportMux takes over event handling.
   *
   * Stops application-level keepalive ping timers on the bare connection.
   * After suppression this NostrClient has zero active subscriptions; the
   * connection is retained only as an outbound resolve()/identity-binding
   * channel. Application pings on a subscription-free connection have been
   * empirically observed to elicit no relay response, causing
   * `appears stale` flapping every ~45 s. OS-level TCP keepalive maintains
   * connection liveness; we don't need application-level pings here.
   */
  suppressSubscriptions() {
    if (!this.nostrClient) return;
    if (this.walletSubscriptionId) {
      this.nostrClient.unsubscribe(this.walletSubscriptionId);
      this.walletSubscriptionId = null;
    }
    if (this.chatSubscriptionId) {
      this.nostrClient.unsubscribe(this.chatSubscriptionId);
      this.chatSubscriptionId = null;
    }
    if (this.mainSubscriptionId) {
      this.nostrClient.unsubscribe(this.mainSubscriptionId);
      this.mainSubscriptionId = null;
    }
    this.stopApplicationPingsOnBareClient();
    this._subscriptionsSuppressed = true;
    logger.debug("Nostr", "Subscriptions suppressed \u2014 mux handles event routing");
  }
  /**
   * Stop the bare NostrClient's per-relay application-level keepalive
   * ping timers. Reaches into NostrClient internals via a structural cast
   * because `stopPingTimer(url)` and `relays` are declared `private` in
   * @unicitylabs/nostr-js-sdk. An upstream PR adding a public
   * `stopAllPingTimers()` would let us drop this cast.
   *
   * Called from `suppressSubscriptions()` and from the post-reconnect path
   * in `setIdentity` when suppression is active — every fresh NostrClient
   * starts its own ping timers on connect, so we must re-stop them after
   * each replacement.
   */
  stopApplicationPingsOnBareClient() {
    if (!this.nostrClient) return;
    const internals = this.nostrClient;
    for (const url of internals.relays.keys()) {
      internals.stopPingTimer(url);
    }
  }
  // Flag to prevent re-subscription after suppressSubscriptions()
  _subscriptionsSuppressed = false;
  // ===========================================================================
  // BaseProvider Implementation
  // ===========================================================================
  async connect() {
    if (this.status === "connected") return;
    this.status = "connecting";
    try {
      if (!this.keyManager) {
        const tempKey = Buffer3.alloc(32);
        crypto.getRandomValues(tempKey);
        this.keyManager = NostrKeyManager.fromPrivateKey(tempKey);
      }
      this.nostrClient = new NostrClient(this.keyManager, {
        autoReconnect: this.config.autoReconnect,
        reconnectIntervalMs: this.config.reconnectDelay,
        maxReconnectIntervalMs: this.config.reconnectDelay * 16,
        // exponential backoff cap
        // 60 s keepalive — the SDK's no-filter `['REQ','ping',{limit:1}]`
        // trick false-positives at 15 s on real testnet under uneven relay
        // timing. After Mux takeover suppressSubscriptions stops these
        // timers entirely (see `stopApplicationPingsOnBareClient`); 60 s
        // covers the brief pre-suppress window AND any reconnect that
        // re-establishes the timer before suppression re-runs.
        pingIntervalMs: 6e4,
        // Bump query timeout from the SDK default of 5s to 20s.
        // Real-world testnet observation (2026-05-01): under transient
        // relay overload, kind:30078 (nametag binding) queries take 5-7s
        // to return EVENT messages, even though the binding is on the
        // relay. The default 5s timeout fires before the event arrives,
        // resolveNametag returns null, and downstream sendDM throws
        // INVALID_RECIPIENT — causing every np.propose_deal to fail. 20s
        // gives the slow path enough headroom to complete while still
        // bailing reasonably fast on a truly broken relay.
        queryTimeoutMs: 2e4
      });
      this.nostrClient.addConnectionListener({
        onConnect: (url) => {
          logger.debug("Nostr", "NostrClient connected to relay:", url);
          this.emitEvent({ type: "transport:connected", timestamp: Date.now() });
        },
        onDisconnect: (url, reason) => {
          logger.debug("Nostr", "NostrClient disconnected from relay:", url, "reason:", reason);
        },
        onReconnecting: (url, attempt) => {
          logger.debug("Nostr", "NostrClient reconnecting to relay:", url, "attempt:", attempt);
          this.emitEvent({ type: "transport:reconnecting", timestamp: Date.now() });
        },
        onReconnected: (url) => {
          logger.debug("Nostr", "NostrClient reconnected to relay:", url);
          this.emitEvent({ type: "transport:connected", timestamp: Date.now() });
          this.subscribeToEvents().catch((err) => {
            logger.error("Nostr", "Failed to re-subscribe after reconnect:", err);
          });
          if (this._subscriptionsSuppressed) {
            this.stopApplicationPingsOnBareClient();
          }
        }
      });
      await Promise.race([
        this.nostrClient.connect(...this.config.relays),
        new Promise(
          (_, reject) => setTimeout(() => reject(new Error(
            `Transport connection timed out after ${this.config.timeout}ms`
          )), this.config.timeout)
        )
      ]);
      if (!this.nostrClient.isConnected()) {
        throw new SphereError("Failed to connect to any relay", "TRANSPORT_ERROR");
      }
      this.status = "connected";
      this.emitEvent({ type: "transport:connected", timestamp: Date.now() });
      logger.debug("Nostr", "Connected to", this.nostrClient.getConnectedRelays().size, "relays");
      if (this.identity) {
        await this.subscribeToEvents();
      }
    } catch (error) {
      this.status = "error";
      throw error;
    }
  }
  async disconnect() {
    if (this.persistDedupTimer) {
      clearTimeout(this.persistDedupTimer);
      this.persistDedupTimer = null;
    }
    if (this.storage && this.keyManager) {
      try {
        await this.persistDedupNow();
      } catch (err) {
        logger.debug("Nostr", "disconnect: flush of persisted dedup failed:", err);
      }
    }
    if (this.nostrClient) {
      this.nostrClient.disconnect();
      this.nostrClient = null;
    }
    this.mainSubscriptionId = null;
    this.walletSubscriptionId = null;
    this.chatSubscriptionId = null;
    this.chatEoseFired = false;
    this.status = "disconnected";
    this.emitEvent({ type: "transport:disconnected", timestamp: Date.now() });
    logger.debug("Nostr", "Disconnected from all relays");
  }
  isConnected() {
    return this.status === "connected" && this.nostrClient?.isConnected() === true;
  }
  getStatus() {
    return this.status;
  }
  // ===========================================================================
  // Dynamic Relay Management
  // ===========================================================================
  /**
   * Get list of configured relay URLs
   */
  getRelays() {
    return [...this.config.relays];
  }
  /**
   * Get list of currently connected relay URLs
   */
  getConnectedRelays() {
    if (!this.nostrClient) return [];
    return Array.from(this.nostrClient.getConnectedRelays());
  }
  /**
   * Add a new relay dynamically
   * Will connect immediately if provider is already connected
   */
  async addRelay(relayUrl) {
    if (this.config.relays.includes(relayUrl)) {
      logger.debug("Nostr", "Relay already configured:", relayUrl);
      return false;
    }
    this.config.relays.push(relayUrl);
    if (this.status === "connected" && this.nostrClient) {
      try {
        await this.nostrClient.connect(relayUrl);
        logger.debug("Nostr", "Added and connected to relay:", relayUrl);
        this.emitEvent({
          type: "transport:relay_added",
          timestamp: Date.now(),
          data: { relay: relayUrl, connected: true }
        });
        return true;
      } catch (error) {
        logger.debug("Nostr", "Failed to connect to new relay:", relayUrl, error);
        this.emitEvent({
          type: "transport:relay_added",
          timestamp: Date.now(),
          data: { relay: relayUrl, connected: false, error: String(error) }
        });
        return false;
      }
    }
    this.emitEvent({
      type: "transport:relay_added",
      timestamp: Date.now(),
      data: { relay: relayUrl, connected: false }
    });
    return true;
  }
  /**
   * Remove a relay dynamically
   * Will disconnect from the relay if connected
   * NOTE: NostrClient doesn't support removing individual relays at runtime.
   * We remove from config so it won't be used on next connect().
   */
  async removeRelay(relayUrl) {
    const index = this.config.relays.indexOf(relayUrl);
    if (index === -1) {
      logger.debug("Nostr", "Relay not found:", relayUrl);
      return false;
    }
    this.config.relays.splice(index, 1);
    logger.debug("Nostr", "Removed relay from config:", relayUrl);
    this.emitEvent({
      type: "transport:relay_removed",
      timestamp: Date.now(),
      data: { relay: relayUrl }
    });
    if (this.nostrClient && !this.nostrClient.isConnected() && this.status === "connected") {
      this.status = "error";
      this.emitEvent({
        type: "transport:error",
        timestamp: Date.now(),
        data: { error: "No connected relays remaining" }
      });
    }
    return true;
  }
  /**
   * Check if a relay is configured
   */
  hasRelay(relayUrl) {
    return this.config.relays.includes(relayUrl);
  }
  /**
   * Check if a relay is currently connected
   */
  isRelayConnected(relayUrl) {
    if (!this.nostrClient) return false;
    return this.nostrClient.getConnectedRelays().has(relayUrl);
  }
  // ===========================================================================
  // TransportProvider Implementation
  // ===========================================================================
  async setIdentity(identity) {
    this.identity = identity;
    this.processedEventIds.clear();
    this.inFlightEventIds.clear();
    this.failedEventCooldowns.clear();
    this.dedupHydrated = false;
    this.lastEventTs = 0;
    this.lastDmEventTs = 0;
    this.fallbackDmSince = null;
    if (this.persistDedupTimer) {
      clearTimeout(this.persistDedupTimer);
      this.persistDedupTimer = null;
    }
    const secretKey = hexToBytes2(identity.privateKey);
    this.keyManager = NostrKeyManager.fromPrivateKey(secretKey);
    const nostrPubkey = this.keyManager.getPublicKeyHex();
    logger.debug("Nostr", "Identity set, Nostr pubkey:", nostrPubkey.slice(0, 16) + "...");
    if (this.nostrClient && this.status === "connected") {
      logger.debug("Nostr", "Identity changed while connected - recreating NostrClient");
      const oldClient = this.nostrClient;
      this.nostrClient = new NostrClient(this.keyManager, {
        autoReconnect: this.config.autoReconnect,
        reconnectIntervalMs: this.config.reconnectDelay,
        maxReconnectIntervalMs: this.config.reconnectDelay * 16,
        pingIntervalMs: 15e3,
        // 15 second keepalive pings
        queryTimeoutMs: 2e4
        // see same option above for rationale
      });
      this.nostrClient.addConnectionListener({
        onConnect: (url) => {
          logger.debug("Nostr", "NostrClient connected to relay:", url);
        },
        onDisconnect: (url, reason) => {
          logger.debug("Nostr", "NostrClient disconnected from relay:", url, "reason:", reason);
        },
        onReconnecting: (url, attempt) => {
          logger.debug("Nostr", "NostrClient reconnecting to relay:", url, "attempt:", attempt);
        },
        onReconnected: (url) => {
          logger.debug("Nostr", "NostrClient reconnected to relay:", url);
          if (this._subscriptionsSuppressed) {
            this.stopApplicationPingsOnBareClient();
          }
        }
      });
      await Promise.race([
        this.nostrClient.connect(...this.config.relays),
        new Promise(
          (_, reject) => setTimeout(() => reject(new Error(
            `Transport reconnection timed out after ${this.config.timeout}ms`
          )), this.config.timeout)
        )
      ]);
      await this.subscribeToEvents();
      if (this._subscriptionsSuppressed) {
        this.stopApplicationPingsOnBareClient();
      }
      oldClient.disconnect();
    } else if (this.isConnected()) {
      await this.subscribeToEvents();
    }
  }
  setFallbackSince(sinceSeconds) {
    this.fallbackSince = sinceSeconds;
  }
  setFallbackDmSince(sinceSeconds) {
    this.fallbackDmSince = sinceSeconds;
  }
  /**
   * Get the Nostr-format public key (32 bytes / 64 hex chars)
   * This is the x-coordinate only, without the 02/03 prefix.
   */
  getNostrPubkey() {
    if (!this.keyManager) {
      throw new SphereError("KeyManager not initialized - call setIdentity first", "NOT_INITIALIZED");
    }
    return this.keyManager.getPublicKeyHex();
  }
  async sendMessage(recipientPubkey, content) {
    this.ensureReady();
    const nostrRecipient = recipientPubkey.length === 66 && (recipientPubkey.startsWith("02") || recipientPubkey.startsWith("03")) ? recipientPubkey.slice(2) : recipientPubkey;
    const senderNametag = this.identity?.nametag;
    const wrappedContent = senderNametag ? JSON.stringify({ senderNametag, text: content }) : content;
    const giftWrap = NIP17.createGiftWrap(this.keyManager, nostrRecipient, wrappedContent);
    await this.publishWithVerification(giftWrap, 3, "dm");
    const selfWrapContent = JSON.stringify({
      selfWrap: true,
      originalId: giftWrap.id,
      recipientPubkey,
      senderNametag,
      text: content
    });
    const selfPubkey = this.keyManager.getPublicKeyHex();
    const selfGiftWrap = NIP17.createGiftWrap(this.keyManager, selfPubkey, selfWrapContent);
    this.publishEvent(selfGiftWrap).catch((err) => {
      logger.debug("Nostr", "Self-wrap publish failed:", err);
    });
    this.emitEvent({
      type: "message:sent",
      timestamp: Date.now(),
      data: { recipient: recipientPubkey }
    });
    return giftWrap.id;
  }
  onMessage(handler) {
    this.messageHandlers.add(handler);
    if (this.pendingMessages.length > 0) {
      const pending = this.pendingMessages;
      this.pendingMessages = [];
      logger.debug("Nostr", "Flushing", pending.length, "buffered messages to new handler");
      for (const message of pending) {
        try {
          handler(message);
        } catch (error) {
          logger.debug("Nostr", "Message handler error (buffered):", error);
        }
      }
    }
    return () => this.messageHandlers.delete(handler);
  }
  async sendTokenTransfer(recipientPubkey, payload) {
    this.ensureReady();
    const serialized = isUxfTransferPayload(payload) ? encodeTransferPayload(payload) : JSON.stringify(payload);
    const content = "token_transfer:" + serialized;
    const uniqueD = `token-transfer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const event = await this.createEncryptedEvent(
      EVENT_KINDS.TOKEN_TRANSFER,
      content,
      [
        ["p", recipientPubkey],
        ["d", uniqueD],
        ["type", "token_transfer"]
      ]
    );
    await this.publishWithVerification(event, 3, "token_transfer");
    this.emitEvent({
      type: "transfer:sent",
      timestamp: Date.now(),
      data: { recipient: recipientPubkey }
    });
    return event.id;
  }
  onTokenTransfer(handler) {
    this.transferHandlers.add(handler);
    if (this.pendingTransfers.length > 0) {
      const pending = this.pendingTransfers;
      this.pendingTransfers = [];
      logger.debug(
        "Nostr",
        `Flushing ${pending.length} buffered TOKEN_TRANSFER event(s) to new handler`
      );
      void (async () => {
        for (const { transfer, createdAtSec } of pending) {
          try {
            const result = await handler(transfer);
            if (result !== false) {
              this.updateLastEventTimestamp(createdAtSec);
              this.markEventProcessed(transfer.id);
            } else {
              logger.debug(
                "Nostr",
                `Buffered TOKEN_TRANSFER drain handler returned false \u2014 leaving since at ${this.lastEventTs}`
              );
            }
          } catch (error) {
            logger.debug("Nostr", "Buffered transfer handler error:", error);
          }
        }
      })();
    }
    return () => this.transferHandlers.delete(handler);
  }
  async sendPaymentRequest(recipientPubkey, payload) {
    this.ensureReady();
    const requestId = this.config.generateUUID();
    const amount = typeof payload.amount === "bigint" ? payload.amount.toString() : payload.amount;
    const requestContent = {
      requestId,
      amount,
      coinId: payload.coinId,
      message: payload.message,
      recipientNametag: payload.recipientNametag,
      deadline: Date.now() + 5 * 60 * 1e3
      // 5 minutes default
    };
    const content = "payment_request:" + JSON.stringify(requestContent);
    const tags = [
      ["p", recipientPubkey],
      ["type", "payment_request"],
      ["amount", amount]
    ];
    if (payload.recipientNametag) {
      tags.push(["recipient", payload.recipientNametag]);
    }
    const event = await this.createEncryptedEvent(
      EVENT_KINDS.PAYMENT_REQUEST,
      content,
      tags
    );
    await this.publishEvent(event);
    logger.debug("Nostr", "Sent payment request:", event.id);
    return event.id;
  }
  onPaymentRequest(handler) {
    this.paymentRequestHandlers.add(handler);
    return () => this.paymentRequestHandlers.delete(handler);
  }
  async sendPaymentRequestResponse(recipientPubkey, payload) {
    this.ensureReady();
    const responseContent = {
      requestId: payload.requestId,
      responseType: payload.responseType,
      message: payload.message,
      transferId: payload.transferId
    };
    const content = "payment_response:" + JSON.stringify(responseContent);
    const event = await this.createEncryptedEvent(
      EVENT_KINDS.PAYMENT_REQUEST_RESPONSE,
      content,
      [
        ["p", recipientPubkey],
        ["e", payload.requestId],
        // Reference to original request
        ["d", "payment-request-response"],
        ["type", "payment_response"]
      ]
    );
    await this.publishEvent(event);
    logger.debug("Nostr", "Sent payment request response:", event.id, "type:", payload.responseType);
    return event.id;
  }
  onPaymentRequestResponse(handler) {
    this.paymentRequestResponseHandlers.add(handler);
    return () => this.paymentRequestResponseHandlers.delete(handler);
  }
  // ===========================================================================
  // Read Receipts
  // ===========================================================================
  async sendReadReceipt(recipientTransportPubkey, messageEventId) {
    if (!this.keyManager) throw new SphereError("Not initialized", "NOT_INITIALIZED");
    const nostrRecipient = recipientTransportPubkey.length === 66 ? recipientTransportPubkey.slice(2) : recipientTransportPubkey;
    const event = NIP17.createReadReceipt(this.keyManager, nostrRecipient, messageEventId);
    await this.publishEvent(event);
    logger.debug("Nostr", "Sent read receipt for:", messageEventId, "to:", nostrRecipient.slice(0, 16));
  }
  onReadReceipt(handler) {
    this.readReceiptHandlers.add(handler);
    return () => this.readReceiptHandlers.delete(handler);
  }
  // ===========================================================================
  // Typing Indicators
  // ===========================================================================
  async sendTypingIndicator(recipientTransportPubkey) {
    if (!this.keyManager) throw new SphereError("Not initialized", "NOT_INITIALIZED");
    const nostrRecipient = recipientTransportPubkey.length === 66 ? recipientTransportPubkey.slice(2) : recipientTransportPubkey;
    const content = JSON.stringify({
      type: "typing",
      senderNametag: this.identity?.nametag
    });
    const event = NIP17.createGiftWrap(this.keyManager, nostrRecipient, content);
    await this.publishEvent(event);
  }
  onTypingIndicator(handler) {
    this.typingIndicatorHandlers.add(handler);
    return () => this.typingIndicatorHandlers.delete(handler);
  }
  onChatReady(handler) {
    if (this.chatEoseFired) {
      try {
        handler();
      } catch {
      }
      return () => {
      };
    }
    this.chatEoseHandlers.push(handler);
    return () => {
      this.chatEoseHandlers = this.chatEoseHandlers.filter((h) => h !== handler);
    };
  }
  // ===========================================================================
  // Composing Indicators (NIP-59 kind 25050)
  // ===========================================================================
  onComposing(handler) {
    this.composingHandlers.add(handler);
    return () => this.composingHandlers.delete(handler);
  }
  async sendComposingIndicator(recipientPubkey, content) {
    this.ensureReady();
    const nostrRecipient = recipientPubkey.length === 66 && (recipientPubkey.startsWith("02") || recipientPubkey.startsWith("03")) ? recipientPubkey.slice(2) : recipientPubkey;
    const giftWrap = this.createCustomKindGiftWrap(nostrRecipient, content, COMPOSING_INDICATOR_KIND);
    await this.publishEvent(giftWrap);
  }
  /**
   * Resolve any identifier to full peer information.
   * Routes to the appropriate specific resolve method based on identifier format.
   */
  async resolve(identifier) {
    if (identifier.startsWith("@")) {
      return this.resolveNametagInfo(identifier.slice(1));
    }
    if (identifier.startsWith("DIRECT:") || identifier.startsWith("PROXY:")) {
      return this.resolveAddressInfo(identifier);
    }
    if (identifier.startsWith("alpha1") || identifier.startsWith("alphat1")) {
      return this.resolveAddressInfo(identifier);
    }
    if (/^0[23][0-9a-f]{64}$/i.test(identifier)) {
      return this.resolveAddressInfo(identifier);
    }
    if (/^[0-9a-f]{64}$/i.test(identifier)) {
      return this.resolveTransportPubkeyInfo(identifier);
    }
    return this.resolveNametagInfo(identifier);
  }
  async resolveNametag(nametag) {
    await this.ensureConnectedForResolve();
    return this.nostrClient.queryPubkeyByNametag(nametag);
  }
  async resolveNametagInfo(nametag) {
    await this.ensureConnectedForResolve();
    const binding = await this.nostrClient.queryBindingByNametag(nametag);
    if (!binding) {
      logger.debug("Nostr", `resolveNametagInfo: no binding events found for Unicity ID "${nametag}"`);
      return null;
    }
    return this.bindingInfoToPeerInfo(binding, nametag);
  }
  /**
   * Resolve a DIRECT://, PROXY://, or L1 address to full peer info.
   * Performs reverse lookup via nostr-js-sdk with first-seen-wins anti-hijacking.
   */
  async resolveAddressInfo(address) {
    await this.ensureConnectedForResolve();
    const binding = await this.nostrClient.queryBindingByAddress(address);
    if (!binding) return null;
    return this.bindingInfoToPeerInfo(binding);
  }
  /**
   * Convert a BindingInfo (from nostr-js-sdk) to PeerInfo (sphere-sdk type).
   * Computes PROXY address from nametag if available.
   *
   * T.8.B — When a nametag is resolved we additionally do a best-effort
   * query for the peer's capability-bearing identity binding event (lives
   * on a different d-tag than the nametag binding). Capability hints are
   * informational only and the lookup never throws on failure.
   */
  async bindingInfoToPeerInfo(binding, nametag) {
    const nametagValue = nametag || binding.nametag;
    let proxyAddress = binding.proxyAddress;
    if (nametagValue && !proxyAddress) {
      try {
        const { ProxyAddress } = await import("@unicitylabs/state-transition-sdk/lib/address/ProxyAddress");
        const proxyAddr = await ProxyAddress.fromNameTag(nametagValue);
        proxyAddress = proxyAddr.toString();
      } catch {
      }
    }
    const capabilities = await this.fetchCapabilityHints(binding.transportPubkey);
    return {
      nametag: nametagValue,
      transportPubkey: binding.transportPubkey,
      chainPubkey: binding.publicKey || "",
      l1Address: binding.l1Address || "",
      directAddress: binding.directAddress || "",
      proxyAddress,
      timestamp: binding.timestamp,
      ...capabilities
    };
  }
  /**
   * T.8.B — Extract capability hints (`wireProtocols`, `assetKinds`) from
   * a binding event's raw JSON content.
   *
   * Returns an object whose keys are present ONLY when the corresponding
   * field appeared in the parsed content. This preserves the W20 absent vs
   * empty distinction at the type level: a missing key on the returned
   * object means "field absent on the wire" (for `assetKinds` callers
   * default to `['coin']` per W20); an EMPTY array means "field present
   * but empty" (informational quirk, no W20 default).
   */
  extractCapabilityHints(rawContent) {
    if (!rawContent || typeof rawContent !== "object") return {};
    const content = rawContent;
    const out = {};
    const wp = content.wire_protocols;
    if (Array.isArray(wp)) {
      out.wireProtocols = wp.filter((v) => typeof v === "string");
    }
    const ak = content.asset_kinds;
    if (Array.isArray(ak)) {
      out.assetKinds = ak.filter((v) => typeof v === "string");
    }
    return out;
  }
  /**
   * T.8.B — Best-effort fetch of capability hints for a peer.
   *
   * Queries the predictable per-pubkey identity binding event (the one
   * `publishIdentityBindingWithCapabilities` writes) and returns the hints
   * extracted from its content. Returns an empty object on any failure
   * (relay error, no event, parse error). Capability hints are
   * informational and MUST NOT block resolution.
   */
  async fetchCapabilityHints(transportPubkey) {
    try {
      const events = await this.queryEvents({
        kinds: [EVENT_KINDS.NAMETAG_BINDING],
        authors: [transportPubkey],
        limit: 5
      });
      if (events.length === 0) return {};
      const sorted = [...events].sort((a, b) => b.created_at - a.created_at);
      for (const event of sorted) {
        try {
          const content = JSON.parse(event.content);
          const hints = this.extractCapabilityHints(content);
          if (hints.wireProtocols !== void 0 || hints.assetKinds !== void 0) {
            return hints;
          }
        } catch {
        }
      }
      return {};
    } catch {
      return {};
    }
  }
  /**
   * Resolve transport pubkey (Nostr pubkey) to full peer info.
   * Queries binding events authored by the given pubkey.
   */
  async resolveTransportPubkeyInfo(transportPubkey) {
    await this.ensureConnectedForResolve();
    const events = await this.queryEvents({
      kinds: [EVENT_KINDS.NAMETAG_BINDING],
      authors: [transportPubkey],
      limit: 5
    });
    if (events.length === 0) return null;
    events.sort((a, b) => b.created_at - a.created_at);
    const bindingEvent = events[0];
    try {
      const content = JSON.parse(bindingEvent.content);
      const capabilities = this.extractCapabilityHints(content);
      return {
        nametag: content.nametag || void 0,
        transportPubkey: bindingEvent.pubkey,
        chainPubkey: content.public_key || "",
        l1Address: content.l1_address || "",
        directAddress: content.direct_address || "",
        proxyAddress: content.proxy_address || void 0,
        timestamp: bindingEvent.created_at * 1e3,
        ...capabilities
      };
    } catch {
      return {
        transportPubkey: bindingEvent.pubkey,
        chainPubkey: "",
        l1Address: "",
        directAddress: "",
        timestamp: bindingEvent.created_at * 1e3
      };
    }
  }
  /**
   * Batch-resolve multiple transport pubkeys to peer info.
   * Used for HD address discovery — single relay query with multi-author filter.
   */
  async discoverAddresses(transportPubkeys) {
    await this.ensureConnectedForResolve();
    if (transportPubkeys.length === 0) return [];
    const events = await this.queryEvents({
      kinds: [EVENT_KINDS.NAMETAG_BINDING],
      authors: transportPubkeys,
      limit: transportPubkeys.length * 2
    });
    if (events.length === 0) return [];
    const byAuthor = /* @__PURE__ */ new Map();
    for (const event of events) {
      const existing = byAuthor.get(event.pubkey);
      if (!existing || event.created_at > existing.created_at) {
        byAuthor.set(event.pubkey, event);
      }
    }
    const results = [];
    for (const [pubkey, event] of byAuthor) {
      try {
        const content = JSON.parse(event.content);
        const capabilities = this.extractCapabilityHints(content);
        results.push({
          nametag: content.nametag || void 0,
          transportPubkey: pubkey,
          chainPubkey: content.public_key || "",
          l1Address: content.l1_address || "",
          directAddress: content.direct_address || "",
          proxyAddress: content.proxy_address || void 0,
          timestamp: event.created_at * 1e3,
          ...capabilities
        });
      } catch {
      }
    }
    return results;
  }
  /**
   * Recover nametag for the current identity by searching for encrypted nametag events
   * Used after wallet import to recover associated nametag
   * @returns Decrypted nametag or null if none found
   */
  async recoverNametag() {
    await this.ensureConnectedForResolve();
    if (!this.identity) {
      throw new SphereError("Identity not set", "NOT_INITIALIZED");
    }
    if (!this.identity || !this.keyManager) {
      throw new SphereError("Identity not set", "NOT_INITIALIZED");
    }
    const nostrPubkey = this.getNostrPubkey();
    logger.debug("Nostr", "Searching for nametag events for pubkey:", nostrPubkey.slice(0, 16) + "...");
    const events = await this.queryEvents({
      kinds: [EVENT_KINDS.NAMETAG_BINDING],
      authors: [nostrPubkey],
      limit: 10
      // Get recent events in case of updates
    });
    if (events.length === 0) {
      logger.debug("Nostr", "No nametag events found for this pubkey");
      return null;
    }
    events.sort((a, b) => b.created_at - a.created_at);
    for (const event of events) {
      try {
        const content = JSON.parse(event.content);
        if (content.encrypted_nametag) {
          const decrypted = await decryptNametag(
            content.encrypted_nametag,
            this.identity.privateKey
          );
          if (decrypted) {
            logger.debug("Nostr", "Recovered Unicity ID:", decrypted);
            return decrypted;
          }
        }
      } catch {
        continue;
      }
    }
    logger.debug("Nostr", "Could not decrypt Unicity ID from any event");
    return null;
  }
  /**
   * Publish identity binding event on Nostr.
   * Without nametag: publishes base binding (chainPubkey, l1Address, directAddress)
   * using a per-identity d-tag for address discovery.
   * With nametag: delegates to nostr-js-sdk's publishNametagBinding which handles
   * conflict detection (first-seen-wins), encryption, and indexed tags.
   *
   * @returns true if successful, false if nametag is taken by another pubkey
   */
  async publishIdentityBinding(chainPubkey, l1Address, directAddress, nametag) {
    this.ensureReady();
    if (!this.identity) {
      throw new SphereError("Identity not set", "NOT_INITIALIZED");
    }
    const nostrPubkey = this.getNostrPubkey();
    if (nametag) {
      const { ProxyAddress } = await import("@unicitylabs/state-transition-sdk/lib/address/ProxyAddress");
      const proxyAddr = await ProxyAddress.fromNameTag(nametag);
      try {
        const success2 = await this.nostrClient.publishNametagBinding(
          nametag,
          nostrPubkey,
          {
            publicKey: chainPubkey,
            l1Address,
            directAddress,
            proxyAddress: proxyAddr.toString()
          }
        );
        if (success2) {
          logger.debug("Nostr", "Published identity binding with Unicity ID:", nametag, "for pubkey:", nostrPubkey.slice(0, 16) + "...");
          await this.publishIdentityBindingWithCapabilities(
            chainPubkey,
            l1Address,
            directAddress,
            nametag,
            proxyAddr.toString()
          );
        }
        return success2;
      } catch (error) {
        if (error instanceof Error && error.message.includes("already claimed")) {
          logger.debug("Nostr", "Unicity ID already taken:", nametag);
          return false;
        }
        throw error;
      }
    }
    const success = await this.publishIdentityBindingWithCapabilities(
      chainPubkey,
      l1Address,
      directAddress
    );
    if (success) {
      logger.debug("Nostr", "Published identity binding (no Unicity ID) for pubkey:", nostrPubkey.slice(0, 16) + "...");
    }
    return success;
  }
  /**
   * T.8.B — Publish a base identity binding event (no nametag) carrying
   * capability hints in the JSON content.
   *
   * Uses the same d-tag formula as the upstream nostr-js-sdk
   * createIdentityBindingEvent (`SHA256('unicity:identity:' + nostrPubkey)`)
   * so this event participates in the same parameterized-replaceable slot
   * (kind 30078 — APP_DATA). Older readers that parse only the four
   * canonical fields (`public_key`, `l1_address`, `direct_address`,
   * `proxy_address`) ignore the additional `wire_protocols` and
   * `asset_kinds` arrays — forward-compatible by construction.
   *
   * Spec refs: §10.4 (capability hints), W20 (assetKinds default).
   */
  async publishIdentityBindingWithCapabilities(chainPubkey, l1Address, directAddress, nametag, proxyAddress) {
    const nostrPubkey = this.getNostrPubkey();
    const dTag = bytesToHex(
      sha256(new TextEncoder().encode("unicity:identity:" + nostrPubkey))
    );
    const content = {
      public_key: chainPubkey,
      l1_address: l1Address,
      direct_address: directAddress,
      // T.8.B — capability hints (§10.4). Snake_case to match the upstream
      // content schema convention.
      wire_protocols: [...SUPPORTED_WIRE_PROTOCOLS],
      asset_kinds: [...SUPPORTED_ASSET_KINDS]
    };
    if (nametag) content.nametag = nametag;
    if (proxyAddress) content.proxy_address = proxyAddress;
    const { NametagUtils } = await import("@unicitylabs/nostr-js-sdk");
    const tags = [["d", dTag]];
    if (chainPubkey) {
      tags.push(["t", NametagUtils.hashAddressForTag(chainPubkey)]);
    }
    if (l1Address) {
      tags.push(["t", NametagUtils.hashAddressForTag(l1Address)]);
    }
    if (directAddress) {
      tags.push(["t", NametagUtils.hashAddressForTag(directAddress)]);
    }
    const event = await this.createEvent(
      EVENT_KINDS.NAMETAG_BINDING,
      JSON.stringify(content),
      tags
    );
    try {
      await this.publishEvent(event);
      return true;
    } catch (err) {
      logger.warn("Nostr", "Failed to publish identity binding with capabilities:", err);
      return false;
    }
  }
  // Track broadcast subscriptions
  broadcastSubscriptions = /* @__PURE__ */ new Map();
  // key -> subId
  subscribeToBroadcast(tags, handler) {
    const key = tags.sort().join(":");
    if (!this.broadcastHandlers.has(key)) {
      this.broadcastHandlers.set(key, /* @__PURE__ */ new Set());
      if (this.isConnected() && this.nostrClient) {
        this.subscribeToTags(tags);
      }
    }
    this.broadcastHandlers.get(key).add(handler);
    return () => {
      this.broadcastHandlers.get(key)?.delete(handler);
      if (this.broadcastHandlers.get(key)?.size === 0) {
        this.broadcastHandlers.delete(key);
        const subId = this.broadcastSubscriptions.get(key);
        if (subId && this.nostrClient) {
          this.nostrClient.unsubscribe(subId);
          this.broadcastSubscriptions.delete(key);
        }
      }
    };
  }
  async publishBroadcast(content, tags) {
    this.ensureReady();
    const eventTags = tags?.map((t) => ["t", t]) ?? [];
    const event = await this.createEvent(EVENT_KINDS.BROADCAST, content, eventTags);
    await this.publishEvent(event);
    return event.id;
  }
  // ===========================================================================
  // Event Subscription
  // ===========================================================================
  onEvent(callback) {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }
  // ===========================================================================
  // Private: Message Handling
  // ===========================================================================
  async handleEvent(event) {
    if (event.id && this.processedEventIds.has(event.id)) {
      return;
    }
    if (event.id && this.inFlightEventIds.has(event.id)) {
      return;
    }
    if (event.id) {
      this.inFlightEventIds.add(event.id);
    }
    logger.debug("Nostr", "Processing event kind:", event.kind, "id:", event.id?.slice(0, 12));
    try {
      let tokenTransferDurable = true;
      switch (event.kind) {
        case EVENT_KINDS.DIRECT_MESSAGE:
          await this.handleDirectMessage(event);
          break;
        case EventKinds.GIFT_WRAP:
          logger.debug("Nostr", "Handling gift wrap (NIP-17 DM)");
          await this.handleGiftWrap(event);
          break;
        case EVENT_KINDS.TOKEN_TRANSFER:
          if (event.id && this.isInDurabilityCooldown(event.id)) {
            logger.debug(
              "Nostr",
              `[AT-LEAST-ONCE] TOKEN_TRANSFER ${event.id.slice(0, 12)} in durability cooldown \u2014 skipping replay`
            );
            return;
          }
          tokenTransferDurable = await this.handleTokenTransfer(event);
          break;
        case EVENT_KINDS.PAYMENT_REQUEST:
          await this.handlePaymentRequest(event);
          break;
        case EVENT_KINDS.PAYMENT_REQUEST_RESPONSE:
          await this.handlePaymentRequestResponse(event);
          break;
        case EVENT_KINDS.BROADCAST:
          this.handleBroadcast(event);
          break;
      }
      if (event.created_at && this.storage && this.keyManager) {
        const kind = event.kind;
        if (kind === EVENT_KINDS.DIRECT_MESSAGE || kind === EVENT_KINDS.PAYMENT_REQUEST || kind === EVENT_KINDS.PAYMENT_REQUEST_RESPONSE) {
          this.updateLastEventTimestamp(event.created_at);
          this.markEventProcessed(event.id);
        } else if (kind === EVENT_KINDS.TOKEN_TRANSFER) {
          if (tokenTransferDurable) {
            if (event.id) this.failedEventCooldowns.delete(event.id);
            this.updateLastEventTimestamp(event.created_at);
            this.markEventProcessed(event.id);
          } else if (event.id) {
            const shouldAdvance = this.recordDurabilityMiss(event.id);
            if (shouldAdvance) {
              logger.warn(
                "Nostr",
                `[AT-LEAST-ONCE] TOKEN_TRANSFER ${event.id.slice(0, 12)} exhausted ${_NostrTransportProvider.DURABILITY_MAX_REPLAY_ATTEMPTS} durability replay attempts \u2014 advancing cursor; operator should investigate local OrbitDB/IPFS-pin/publish failures.`
              );
              this.updateLastEventTimestamp(event.created_at);
              this.markEventProcessed(event.id);
            } else {
              const entry = this.failedEventCooldowns.get(event.id);
              const cooldownMs = entry ? Math.max(0, entry.nextRetryAt - Date.now()) : 0;
              logger.warn(
                "Nostr",
                `[AT-LEAST-ONCE] TOKEN_TRANSFER ${event.id.slice(0, 12)} not durable \u2014 leaving 'since' at ${this.lastEventTs}; cooldown ${cooldownMs}ms (attempt ${entry?.attempts ?? "?"}/${_NostrTransportProvider.DURABILITY_MAX_REPLAY_ATTEMPTS}).`
              );
              this.schedulePersistDedup();
            }
          } else {
            logger.warn(
              "Nostr",
              `[AT-LEAST-ONCE] TOKEN_TRANSFER (no id) not durable \u2014 leaving 'since' at ${this.lastEventTs}; event will replay on next reconnect`
            );
          }
        } else {
          this.markEventProcessed(event.id);
        }
      } else {
        this.markEventProcessed(event.id);
      }
    } catch (error) {
      logger.debug("Nostr", "Failed to handle event:", error);
    } finally {
      if (event.id) {
        this.inFlightEventIds.delete(event.id);
      }
    }
  }
  /**
   * Issue #275 — add an event ID to the persistent dedup set and
   * schedule a debounced write. FIFO-eviction keeps the set bounded
   * at `LIMITS.PROCESSED_EVENT_IDS_CAP`.
   */
  markEventProcessed(eventId) {
    if (!eventId) return;
    if (this.processedEventIds.has(eventId)) return;
    this.processedEventIds.add(eventId);
    while (this.processedEventIds.size > LIMITS.PROCESSED_EVENT_IDS_CAP) {
      const oldest = this.processedEventIds.keys().next().value;
      if (oldest === void 0) break;
      this.processedEventIds.delete(oldest);
    }
    this.schedulePersistDedup();
  }
  /**
   * Issue #275 — schedule a debounced write of the persistent dedup
   * sets to storage. Coalesces a burst of EOSE-replay arrivals into a
   * single storage transaction. Subsequent calls within the debounce
   * window are no-ops (timer already armed).
   */
  schedulePersistDedup() {
    if (!this.storage || !this.keyManager) return;
    if (this.persistDedupTimer) return;
    this.persistDedupTimer = setTimeout(() => {
      this.persistDedupTimer = null;
      this.persistDedupNow().catch((err) => {
        logger.debug("Nostr", "Persisted dedup write failed (will retry on next mark):", err);
      });
    }, LIMITS.PROCESSED_EVENT_IDS_FLUSH_MS);
  }
  /**
   * Issue #275 — write the persistent dedup sets to storage. Serialized
   * via `persistDedupInFlight` so concurrent timer fires (debounce + a
   * forced flush) don't race on the underlying KV write.
   */
  async persistDedupNow() {
    if (!this.storage || !this.keyManager) return;
    if (this.persistDedupInFlight) {
      await this.persistDedupInFlight.catch(() => void 0);
    }
    const inFlight = this.doPersistDedup();
    this.persistDedupInFlight = inFlight;
    try {
      await inFlight;
    } finally {
      if (this.persistDedupInFlight === inFlight) {
        this.persistDedupInFlight = null;
      }
    }
  }
  async doPersistDedup() {
    if (!this.storage || !this.keyManager) return;
    const pubkey = this.keyManager.getPublicKeyHex();
    const prefix = pubkey.slice(0, 16);
    const eventsKey = `${STORAGE_KEYS_GLOBAL.PROCESSED_WALLET_EVENT_IDS}_${prefix}`;
    const cooldownsKey = `${STORAGE_KEYS_GLOBAL.FAILED_EVENT_COOLDOWNS}_${prefix}`;
    const ids = Array.from(this.processedEventIds);
    const cooldownsArr = Array.from(
      this.failedEventCooldowns.entries()
    );
    try {
      await this.storage.set(eventsKey, JSON.stringify(ids));
    } catch (err) {
      logger.debug("Nostr", "Persisted dedup: events write failed:", err);
    }
    try {
      await this.storage.set(cooldownsKey, JSON.stringify(cooldownsArr));
    } catch (err) {
      logger.debug("Nostr", "Persisted dedup: cooldowns write failed:", err);
    }
  }
  /**
   * Issue #275 — hydrate the persistent dedup sets from storage on the
   * first connect/fetchPendingEvents per identity. Idempotent: subsequent
   * calls are no-ops once `dedupHydrated` is true.
   *
   * Failure modes (storage read throw, JSON parse error, malformed
   * data) all degrade to "start fresh" — the wallet still works, just
   * pays the cross-process re-dispatch tax once until the next write
   * cycle repopulates the disk.
   */
  async hydrateProcessedDedup() {
    if (this.dedupHydrated) return;
    if (!this.storage || !this.keyManager) {
      this.dedupHydrated = true;
      return;
    }
    const pubkey = this.keyManager.getPublicKeyHex();
    const prefix = pubkey.slice(0, 16);
    const eventsKey = `${STORAGE_KEYS_GLOBAL.PROCESSED_WALLET_EVENT_IDS}_${prefix}`;
    const cooldownsKey = `${STORAGE_KEYS_GLOBAL.FAILED_EVENT_COOLDOWNS}_${prefix}`;
    try {
      const raw2 = await this.storage.get(eventsKey);
      if (raw2) {
        const parsed = JSON.parse(raw2);
        if (Array.isArray(parsed)) {
          for (const id of parsed) {
            if (typeof id === "string" && id.length > 0) {
              this.processedEventIds.add(id);
            }
          }
        }
      }
    } catch (err) {
      logger.debug("Nostr", "hydrateProcessedDedup events parse/read failed:", err);
    }
    try {
      const raw2 = await this.storage.get(cooldownsKey);
      if (raw2) {
        const parsed = JSON.parse(raw2);
        if (Array.isArray(parsed)) {
          const now2 = Date.now();
          let dropped = 0;
          for (const entry of parsed) {
            if (Array.isArray(entry) && entry.length === 2 && typeof entry[0] === "string" && entry[1] !== null && typeof entry[1] === "object") {
              const [eventId, meta] = entry;
              const m = meta;
              const nextRetryAt = typeof m.nextRetryAt === "number" ? m.nextRetryAt : NaN;
              const attempts = typeof m.attempts === "number" ? m.attempts : NaN;
              if (Number.isFinite(nextRetryAt) && Number.isFinite(attempts) && attempts >= 1 && attempts < _NostrTransportProvider.DURABILITY_MAX_REPLAY_ATTEMPTS) {
                const elapsed = now2 - nextRetryAt;
                if (elapsed > _NostrTransportProvider.DURABILITY_COOLDOWN_MAX_MS * 2) {
                  dropped++;
                  continue;
                }
                this.failedEventCooldowns.set(eventId, { nextRetryAt, attempts });
              }
            }
          }
          if (dropped > 0) {
            logger.debug("Nostr", `hydrateProcessedDedup: dropped ${dropped} stale cooldown entries`);
          }
        }
      }
    } catch (err) {
      logger.debug("Nostr", "hydrateProcessedDedup cooldowns parse/read failed:", err);
    }
    this.dedupHydrated = true;
    logger.debug(
      "Nostr",
      `[#275] Persisted dedup hydrated: ${this.processedEventIds.size} event IDs, ${this.failedEventCooldowns.size} cooldown entries`
    );
  }
  /**
   * Save the max event timestamp to storage (fire-and-forget, no await needed by caller).
   * Uses in-memory `lastEventTs` to avoid read-before-write race conditions
   * when multiple events arrive in quick succession.
   */
  updateLastEventTimestamp(createdAt) {
    if (!this.storage || !this.keyManager) return;
    if (createdAt <= this.lastEventTs) return;
    this.lastEventTs = createdAt;
    const pubkey = this.keyManager.getPublicKeyHex();
    const storageKey = `${STORAGE_KEYS_GLOBAL.LAST_WALLET_EVENT_TS}_${pubkey.slice(0, 16)}`;
    this.storage.set(storageKey, createdAt.toString()).catch((err) => {
      logger.debug("Nostr", "Failed to save last event timestamp:", err);
    });
  }
  /**
   * Issue #272 — return true iff this event ID has a live durability
   * cooldown. Cleans up the entry when the cooldown has expired so the
   * map doesn't accumulate stale entries on the read path.
   */
  isInDurabilityCooldown(eventId) {
    const entry = this.failedEventCooldowns.get(eventId);
    if (!entry) return false;
    if (Date.now() >= entry.nextRetryAt) {
      return false;
    }
    return true;
  }
  /**
   * Issue #272 — record a durability miss for this event ID and arm
   * an exponential cooldown. Returns `true` when the per-event replay
   * budget (`DURABILITY_MAX_REPLAY_ATTEMPTS`) is exhausted — in that
   * case the caller should advance the `since` cursor (the entry is
   * deleted by this method to free the slot) so subsequent events
   * are not blocked indefinitely behind one persistently-failing one.
   * Local-durability is decoupled from this gate (issue #272 background-
   * verify patch in `flush-scheduler.ts`), so a persistent miss after
   * the budget exhausts indicates a genuine local persistence failure
   * (OrbitDB write timeout / pin POST != 200 / monotonicity violation)
   * that re-replay alone cannot resolve.
   */
  recordDurabilityMiss(eventId) {
    const prior = this.failedEventCooldowns.get(eventId);
    const attempts = (prior?.attempts ?? 0) + 1;
    if (attempts >= _NostrTransportProvider.DURABILITY_MAX_REPLAY_ATTEMPTS) {
      this.failedEventCooldowns.delete(eventId);
      return true;
    }
    if (this.failedEventCooldowns.size >= _NostrTransportProvider.DURABILITY_COOLDOWN_MAP_CAP) {
      const oldestKey = this.failedEventCooldowns.keys().next().value;
      if (oldestKey !== void 0) {
        this.failedEventCooldowns.delete(oldestKey);
      }
    }
    const delayMs = Math.min(
      _NostrTransportProvider.DURABILITY_COOLDOWN_BASE_MS * Math.pow(2, attempts - 1),
      _NostrTransportProvider.DURABILITY_COOLDOWN_MAX_MS
    );
    this.failedEventCooldowns.set(eventId, {
      nextRetryAt: Date.now() + delayMs,
      attempts
    });
    return false;
  }
  /** Persist the max DM (gift-wrap) event timestamp for the since filter on next connect. */
  updateLastDmEventTimestamp(createdAt) {
    if (!this.storage || !this.keyManager) return;
    if (createdAt <= this.lastDmEventTs) return;
    this.lastDmEventTs = createdAt;
    const pubkey = this.keyManager.getPublicKeyHex();
    const storageKey = `${STORAGE_KEYS_GLOBAL.LAST_DM_EVENT_TS}_${pubkey.slice(0, 16)}`;
    this.storage.set(storageKey, createdAt.toString()).catch((err) => {
      logger.debug("Nostr", "Failed to save last DM event timestamp:", err);
    });
  }
  async handleDirectMessage(event) {
    logger.debug("Nostr", "Ignoring NIP-04 kind 4 event (DMs use NIP-17):", event.id?.slice(0, 12));
  }
  async handleGiftWrap(event) {
    if (!this.identity || !this.keyManager) {
      logger.debug("Nostr", "handleGiftWrap: no identity/keyManager");
      return;
    }
    try {
      const pm = NIP17.unwrap(event, this.keyManager);
      this.updateLastDmEventTimestamp(Math.floor(Date.now() / 1e3));
      logger.debug("Nostr", "Gift wrap unwrapped, sender:", pm.senderPubkey?.slice(0, 16), "kind:", pm.kind);
      if (pm.senderPubkey === this.keyManager.getPublicKeyHex()) {
        try {
          const parsed = JSON.parse(pm.content);
          if (parsed?.selfWrap && parsed.recipientPubkey) {
            logger.debug("Nostr", "Self-wrap replay for recipient:", parsed.recipientPubkey?.slice(0, 16));
            const message2 = {
              id: parsed.originalId || pm.eventId,
              senderTransportPubkey: pm.senderPubkey,
              senderNametag: parsed.senderNametag,
              recipientTransportPubkey: parsed.recipientPubkey,
              content: parsed.text ?? "",
              timestamp: pm.timestamp * 1e3,
              encrypted: true,
              isSelfWrap: true
            };
            for (const handler of this.messageHandlers) {
              try {
                handler(message2);
              } catch (e) {
                logger.debug("Nostr", "Self-wrap handler error:", e);
              }
            }
            return;
          }
        } catch {
        }
        logger.debug("Nostr", "Skipping own non-self-wrap message");
        return;
      }
      if (isReadReceipt(pm)) {
        logger.debug("Nostr", "Read receipt from:", pm.senderPubkey?.slice(0, 16), "for:", pm.replyToEventId);
        if (pm.replyToEventId) {
          const receipt = {
            senderTransportPubkey: pm.senderPubkey,
            messageEventId: pm.replyToEventId,
            timestamp: pm.timestamp * 1e3
          };
          for (const handler of this.readReceiptHandlers) {
            try {
              handler(receipt);
            } catch (e) {
              logger.debug("Nostr", "Read receipt handler error:", e);
            }
          }
        }
        return;
      }
      if (pm.kind === COMPOSING_INDICATOR_KIND) {
        let senderNametag2;
        let expiresIn = 3e4;
        try {
          const parsed = JSON.parse(pm.content);
          senderNametag2 = parsed.senderNametag || void 0;
          expiresIn = parsed.expiresIn ?? 3e4;
        } catch {
        }
        const indicator = {
          senderPubkey: pm.senderPubkey,
          senderNametag: senderNametag2,
          expiresIn
        };
        logger.debug("Nostr", "Composing indicator from:", indicator.senderNametag || pm.senderPubkey?.slice(0, 16));
        for (const handler of this.composingHandlers) {
          try {
            handler(indicator);
          } catch (e) {
            logger.debug("Nostr", "Composing handler error:", e);
          }
        }
        return;
      }
      try {
        const parsed = JSON.parse(pm.content);
        if (parsed?.type === "typing") {
          logger.debug("Nostr", "Typing indicator from:", pm.senderPubkey?.slice(0, 16));
          const indicator = {
            senderTransportPubkey: pm.senderPubkey,
            senderNametag: parsed.senderNametag,
            timestamp: pm.timestamp * 1e3
          };
          for (const handler of this.typingIndicatorHandlers) {
            try {
              handler(indicator);
            } catch (e) {
              logger.debug("Nostr", "Typing handler error:", e);
            }
          }
          return;
        }
      } catch {
      }
      if (!isChatMessage(pm)) {
        logger.debug("Nostr", "Skipping unknown message kind:", pm.kind);
        return;
      }
      let content = pm.content;
      let senderNametag;
      try {
        const parsed = JSON.parse(content);
        if (typeof parsed === "object" && parsed.text !== void 0) {
          content = parsed.text;
          senderNametag = parsed.senderNametag || void 0;
        }
      } catch {
      }
      logger.debug("Nostr", "DM received from:", senderNametag || pm.senderPubkey?.slice(0, 16), "content:", content?.slice(0, 50));
      const message = {
        // Use outer gift wrap event.id so it matches the sender's stored giftWrap.id.
        // This ensures read receipts reference an ID the sender recognizes.
        id: event.id,
        senderTransportPubkey: pm.senderPubkey,
        senderNametag,
        content,
        timestamp: pm.timestamp * 1e3,
        encrypted: true
      };
      this.emitEvent({ type: "message:received", timestamp: Date.now() });
      if (this.messageHandlers.size === 0) {
        logger.debug("Nostr", "No message handlers registered, buffering message for later delivery");
        this.pendingMessages.push(message);
      } else {
        logger.debug("Nostr", "Dispatching to", this.messageHandlers.size, "handlers");
        for (const handler of this.messageHandlers) {
          try {
            handler(message);
          } catch (error) {
            logger.debug("Nostr", "Message handler error:", error);
          }
        }
      }
    } catch (err) {
      logger.debug("Nostr", "Gift wrap decrypt failed (expected if not for us):", err?.message?.slice(0, 50));
    }
  }
  async handleTokenTransfer(event) {
    if (!this.identity) return true;
    const content = await this.decryptContent(event.content, event.pubkey);
    const payload = decodeTransferPayload(content);
    const transfer = {
      id: event.id,
      senderTransportPubkey: event.pubkey,
      payload,
      timestamp: event.created_at * 1e3
    };
    this.emitEvent({ type: "transfer:received", timestamp: Date.now() });
    if (this.transferHandlers.size === 0) {
      this.pendingTransfers.push({ transfer, createdAtSec: event.created_at });
      logger.debug(
        "Nostr",
        `Buffered TOKEN_TRANSFER ${event.id?.slice(0, 12)} \u2014 no handler registered yet (buffer size=${this.pendingTransfers.length})`
      );
      return false;
    }
    let allDurable = true;
    for (const handler of this.transferHandlers) {
      try {
        const result = await handler(transfer);
        if (result === false) allDurable = false;
      } catch (error) {
        logger.debug("Nostr", "Transfer handler error:", error);
        allDurable = false;
      }
    }
    return allDurable;
  }
  async handlePaymentRequest(event) {
    if (!this.identity) return;
    try {
      const content = await this.decryptContent(event.content, event.pubkey);
      const requestData = JSON.parse(content);
      const request = {
        id: event.id,
        senderTransportPubkey: event.pubkey,
        senderNametag: requestData.recipientNametag,
        request: {
          requestId: requestData.requestId,
          amount: requestData.amount,
          coinId: requestData.coinId,
          message: requestData.message,
          recipientNametag: requestData.recipientNametag,
          metadata: requestData.metadata
        },
        timestamp: event.created_at * 1e3
      };
      logger.debug("Nostr", "Received payment request:", request.id);
      for (const handler of this.paymentRequestHandlers) {
        try {
          handler(request);
        } catch (error) {
          logger.debug("Nostr", "Payment request handler error:", error);
        }
      }
    } catch (error) {
      logger.debug("Nostr", "Failed to handle payment request:", error);
    }
  }
  async handlePaymentRequestResponse(event) {
    if (!this.identity) return;
    try {
      const content = await this.decryptContent(event.content, event.pubkey);
      const responseData = JSON.parse(content);
      const response = {
        id: event.id,
        responderTransportPubkey: event.pubkey,
        response: {
          requestId: responseData.requestId,
          responseType: responseData.responseType,
          message: responseData.message,
          transferId: responseData.transferId
        },
        timestamp: event.created_at * 1e3
      };
      logger.debug("Nostr", "Received payment request response:", response.id, "type:", responseData.responseType);
      for (const handler of this.paymentRequestResponseHandlers) {
        try {
          handler(response);
        } catch (error) {
          logger.debug("Nostr", "Payment request response handler error:", error);
        }
      }
    } catch (error) {
      logger.debug("Nostr", "Failed to handle payment request response:", error);
    }
  }
  handleBroadcast(event) {
    const tags = event.tags.filter((t) => t[0] === "t").map((t) => t[1]);
    const broadcast = {
      id: event.id,
      authorTransportPubkey: event.pubkey,
      content: event.content,
      tags,
      timestamp: event.created_at * 1e3
    };
    for (const [key, handlers] of this.broadcastHandlers) {
      const subscribedTags = key.split(":");
      if (tags.some((t) => subscribedTags.includes(t))) {
        for (const handler of handlers) {
          try {
            handler(broadcast);
          } catch (error) {
            logger.debug("Nostr", "Broadcast handler error:", error);
          }
        }
      }
    }
  }
  // ===========================================================================
  // Private: Event Creation & Publishing
  // ===========================================================================
  async createEvent(kind, content, tags) {
    if (!this.identity) throw new SphereError("Identity not set", "NOT_INITIALIZED");
    if (!this.keyManager) throw new SphereError("KeyManager not initialized", "NOT_INITIALIZED");
    const signedEvent = NostrEventClass.create(this.keyManager, {
      kind,
      content,
      tags
    });
    const event = {
      id: signedEvent.id,
      kind: signedEvent.kind,
      content: signedEvent.content,
      tags: signedEvent.tags,
      pubkey: signedEvent.pubkey,
      created_at: signedEvent.created_at,
      sig: signedEvent.sig
    };
    return event;
  }
  async createEncryptedEvent(kind, content, tags) {
    if (!this.keyManager) throw new SphereError("KeyManager not initialized", "NOT_INITIALIZED");
    const recipientTag = tags.find((t) => t[0] === "p");
    if (!recipientTag || !recipientTag[1]) {
      throw new SphereError("No recipient pubkey in tags for encryption", "VALIDATION_ERROR");
    }
    const recipientPubkey = recipientTag[1];
    const encrypted = await NIP04.encryptHex(
      content,
      this.keyManager.getPrivateKeyHex(),
      recipientPubkey
    );
    return this.createEvent(kind, encrypted, tags);
  }
  async publishEvent(event) {
    if (!this.nostrClient) {
      throw new SphereError("NostrClient not initialized", "NOT_INITIALIZED");
    }
    const MAX_ATTEMPTS = 3;
    const RETRY_BASE_DELAY_MS = 500;
    const RETRY_JITTER_MS = 200;
    let lastError;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const client = this.nostrClient;
      if (!client) {
        throw new SphereError("Transport disconnected during retry", "TRANSPORT_ERROR");
      }
      try {
        const sdkEvent = NostrEventClass.fromJSON(event);
        await client.publishEvent(sdkEvent);
        return;
      } catch (err) {
        lastError = err;
        const rawMessage = err instanceof Error ? err.message : String(err);
        const lowered = rawMessage.toLocaleLowerCase("en-US");
        const isRelayRejection = lowered.startsWith("event rejected:") || lowered.startsWith("sent 0 of");
        if (!isRelayRejection || attempt === MAX_ATTEMPTS) {
          break;
        }
        const delay = RETRY_BASE_DELAY_MS + Math.floor(Math.random() * RETRY_JITTER_MS);
        logger.debug(
          "Nostr",
          `publishEvent attempt ${attempt}/${MAX_ATTEMPTS} failed (${rawMessage}); retrying in ${delay}ms`
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    const reason = lastError instanceof Error ? lastError.message : String(lastError);
    logger.error("Nostr", `publishEvent failed after ${MAX_ATTEMPTS} attempts: ${reason}`);
    throw new SphereError(
      `Failed to publish event: ${reason}`,
      "TRANSPORT_ERROR",
      lastError
    );
  }
  /**
   * Publish an event with verification: after publishing, query the relay to
   * confirm the event was stored. Retries up to `maxAttempts` times on failure.
   *
   * This is critical for token transfers and DMs where silent loss means
   * funds or messages disappear. The nostr-js-sdk's publishEvent resolves on
   * a 5s timeout even without relay confirmation, so verification is needed.
   */
  async publishWithVerification(event, maxAttempts = 3, label = "event") {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.publishEvent(event);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Event rejected") && !msg.includes("rate") && !msg.includes("limit")) {
          throw err;
        }
        if (attempt === maxAttempts) throw err;
        logger.debug("Nostr", `${label} publish attempt ${attempt} failed (${msg}), retrying in ${attempt}s...`);
        await new Promise((r) => setTimeout(r, 1e3 * attempt));
        continue;
      }
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 1200));
      try {
        const found = await this.queryEvents({
          ids: [event.id],
          limit: 1
        });
        if (found.length > 0) {
          if (attempt > 1) {
            logger.debug("Nostr", `${label} verified on relay after ${attempt} attempt(s)`);
          }
          return;
        }
      } catch {
        if (attempt === maxAttempts) {
          logger.debug("Nostr", `${label} verification query failed \u2014 accepting publish as best-effort`);
          return;
        }
      }
      if (attempt < maxAttempts) {
        const delay = Math.min(2e3 * attempt, 1e4);
        logger.debug("Nostr", `${label} not found on relay, retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw new SphereError(
          `${label} not verified on relay after ${maxAttempts} attempts \u2014 delivery failed`,
          "TRANSPORT_ERROR"
        );
      }
    }
  }
  /**
   * Issue #166 P2 #3 — Verify a previously published TOKEN_TRANSFER
   * event is still persisted by querying the relay for its event id.
   *
   * Implements the {@link TransportProvider.verifyTokenTransferRetained}
   * contract: NEVER throws — converts query failures (no connection,
   * timeout, malformed response) to `'unverifiable'`. The verifier
   * worker treats `'unverifiable'` as "retry next cycle"; only
   * `'missing'` triggers a retention-warning event.
   */
  async verifyTokenTransferRetained(eventId) {
    if (typeof eventId !== "string" || eventId.length === 0) {
      return "unverifiable";
    }
    if (!this.nostrClient?.isConnected()) {
      return "unverifiable";
    }
    try {
      const found = await this.queryEvents({
        ids: [eventId],
        limit: 1
      });
      return found.length > 0 ? "retained" : "missing";
    } catch {
      return "unverifiable";
    }
  }
  async fetchPendingEvents() {
    if (!this.nostrClient?.isConnected() || !this.keyManager) {
      throw new SphereError("Transport not connected", "TRANSPORT_ERROR");
    }
    await this.hydrateProcessedDedup();
    const __span = logger.time("transport:nostr", "fetchPendingEvents", {});
    const nostrPubkey = this.keyManager.getPublicKeyHex();
    const walletFilter = new Filter();
    walletFilter.kinds = [
      EVENT_KINDS.DIRECT_MESSAGE,
      EVENT_KINDS.TOKEN_TRANSFER,
      EVENT_KINDS.PAYMENT_REQUEST,
      EVENT_KINDS.PAYMENT_REQUEST_RESPONSE,
      EventKinds.GIFT_WRAP
      // NIP-17 gift-wrapped DMs (swap proposals, invoice receipts, etc.)
    ];
    walletFilter["#p"] = [nostrPubkey];
    walletFilter.since = Math.floor(Date.now() / 1e3) - 86400 - 172800;
    const client = this.nostrClient;
    const events = [];
    let subId;
    await new Promise((resolve, reject) => {
      let timeout;
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve();
      };
      try {
        subId = client.subscribe(walletFilter, {
          onEvent: (event) => {
            events.push({
              id: event.id,
              kind: event.kind,
              content: event.content,
              tags: event.tags,
              pubkey: event.pubkey,
              created_at: event.created_at,
              sig: event.sig
            });
          },
          onEndOfStoredEvents: () => settle()
        });
      } catch (err) {
        reject(err);
        return;
      }
      if (!settled) {
        timeout = setTimeout(() => settle(), 5e3);
      }
    });
    if (subId) {
      try {
        client.unsubscribe(subId);
      } catch {
      }
    }
    __span.mark("eose", { eventCount: events.length });
    const __dispatchT0 = Date.now();
    for (const event of events) {
      await this.handleEvent(event);
    }
    __span.end({
      eventCount: events.length,
      dispatchDurationMs: Date.now() - __dispatchT0
    });
  }
  /**
   * Default upper bound for `queryEvents` REQ→EOSE wait. Was 15 s historically
   * but real-network testnet runs (Phase 9 e2e) repeatedly observed the relay
   * fluctuating between healthy (<200 ms EOSE) and degraded (10-25 s EOSE,
   * sometimes never EOSE). 60 s pushes the timeout past every degraded
   * sample we've captured while still failing fast on real "no such event"
   * queries. Override per call via the second argument.
   */
  static DEFAULT_QUERY_TIMEOUT_MS = 6e4;
  async queryEvents(filterObj, timeoutMs = _NostrTransportProvider.DEFAULT_QUERY_TIMEOUT_MS) {
    if (!this.nostrClient || !this.nostrClient.isConnected()) {
      throw new SphereError("No connected relays", "TRANSPORT_ERROR");
    }
    const client = this.nostrClient;
    const events = [];
    const filter = new Filter(filterObj);
    let subId;
    return new Promise((resolve) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        if (subId) {
          try {
            client.unsubscribe(subId);
          } catch {
          }
        }
        logger.warn("Nostr", `queryEvents timed out after ${timeoutMs}ms, returning ${events.length} event(s)`, { kinds: filterObj.kinds, limit: filterObj.limit });
        resolve(events);
      }, timeoutMs);
      const settle = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (subId) {
          try {
            client.unsubscribe(subId);
          } catch {
          }
        }
        resolve(events);
      };
      try {
        subId = client.subscribe(filter, {
          onEvent: (event) => {
            events.push({
              id: event.id,
              kind: event.kind,
              content: event.content,
              tags: event.tags,
              pubkey: event.pubkey,
              created_at: event.created_at,
              sig: event.sig
            });
          },
          onEndOfStoredEvents: () => settle()
        });
      } catch {
        clearTimeout(timeout);
        resolve(events);
        return;
      }
    });
  }
  // ===========================================================================
  // Private: Subscriptions
  // ===========================================================================
  // Track subscription IDs for cleanup
  walletSubscriptionId = null;
  chatSubscriptionId = null;
  // Chat EOSE handlers — fired once when relay finishes delivering stored DMs
  chatEoseHandlers = [];
  chatEoseFired = false;
  async subscribeToEvents() {
    logger.debug("Nostr", "subscribeToEvents called, identity:", !!this.identity, "keyManager:", !!this.keyManager, "nostrClient:", !!this.nostrClient);
    if (this._subscriptionsSuppressed) {
      logger.debug("Nostr", "subscribeToEvents: suppressed \u2014 mux handles event routing");
      return;
    }
    if (!this.identity || !this.keyManager || !this.nostrClient) {
      logger.debug("Nostr", "subscribeToEvents: skipped - no identity, keyManager, or nostrClient");
      return;
    }
    if (this.walletSubscriptionId) {
      this.nostrClient.unsubscribe(this.walletSubscriptionId);
      this.walletSubscriptionId = null;
    }
    if (this.chatSubscriptionId) {
      this.nostrClient.unsubscribe(this.chatSubscriptionId);
      this.chatSubscriptionId = null;
    }
    if (this.mainSubscriptionId) {
      this.nostrClient.unsubscribe(this.mainSubscriptionId);
      this.mainSubscriptionId = null;
    }
    const nostrPubkey = this.keyManager.getPublicKeyHex();
    logger.debug("Nostr", "Subscribing with Nostr pubkey:", nostrPubkey);
    await this.hydrateProcessedDedup();
    let since;
    if (this.storage) {
      const storageKey = `${STORAGE_KEYS_GLOBAL.LAST_WALLET_EVENT_TS}_${nostrPubkey.slice(0, 16)}`;
      try {
        const stored = await this.storage.get(storageKey);
        if (stored) {
          since = parseInt(stored, 10);
          this.lastEventTs = since;
          this.fallbackSince = null;
          logger.debug("Nostr", "Resuming from stored event timestamp:", since);
        } else if (this.fallbackSince !== null) {
          since = this.fallbackSince;
          this.lastEventTs = since;
          this.fallbackSince = null;
          logger.debug("Nostr", "Using fallback since timestamp:", since);
        } else {
          since = Math.floor(Date.now() / 1e3);
          logger.debug("Nostr", "No stored timestamp, starting from now:", since);
        }
      } catch (err) {
        logger.debug("Nostr", "Failed to read last event timestamp, falling back to now:", err);
        since = Math.floor(Date.now() / 1e3);
        this.fallbackSince = null;
      }
    } else {
      since = Math.floor(Date.now() / 1e3) - 86400;
      logger.debug("Nostr", "No storage adapter, using 24h fallback");
    }
    const walletFilter = new Filter();
    walletFilter.kinds = [
      EVENT_KINDS.DIRECT_MESSAGE,
      EVENT_KINDS.TOKEN_TRANSFER,
      EVENT_KINDS.PAYMENT_REQUEST,
      EVENT_KINDS.PAYMENT_REQUEST_RESPONSE
    ];
    walletFilter["#p"] = [nostrPubkey];
    walletFilter.since = since;
    this.walletSubscriptionId = this.nostrClient.subscribe(walletFilter, {
      onEvent: (event) => {
        logger.debug("Nostr", "Received wallet event kind:", event.kind, "id:", event.id?.slice(0, 12));
        this.handleEvent({
          id: event.id,
          kind: event.kind,
          content: event.content,
          tags: event.tags,
          pubkey: event.pubkey,
          created_at: event.created_at,
          sig: event.sig
        });
      },
      onEndOfStoredEvents: () => {
        logger.debug("Nostr", "Wallet subscription ready (EOSE)");
      },
      onError: (_subId, error) => {
        logger.debug("Nostr", "Wallet subscription error:", error);
      }
    });
    logger.debug("Nostr", "Wallet subscription created, subId:", this.walletSubscriptionId);
    let dmSince;
    if (this.storage) {
      const dmStorageKey = `${STORAGE_KEYS_GLOBAL.LAST_DM_EVENT_TS}_${nostrPubkey.slice(0, 16)}`;
      try {
        const stored = await this.storage.get(dmStorageKey);
        const parsed = stored ? parseInt(stored, 10) : NaN;
        if (Number.isFinite(parsed)) {
          dmSince = parsed;
          this.lastDmEventTs = dmSince;
          this.fallbackDmSince = null;
          logger.debug("Nostr", "DM resuming from stored timestamp:", dmSince);
        } else if (this.fallbackDmSince !== null) {
          dmSince = this.fallbackDmSince;
          this.lastDmEventTs = dmSince;
          this.fallbackDmSince = null;
          logger.debug("Nostr", "DM using fallback since timestamp:", dmSince);
        } else {
          dmSince = Math.floor(Date.now() / 1e3);
          logger.debug("Nostr", "No stored DM timestamp, starting from now:", dmSince);
        }
      } catch (err) {
        if (this.fallbackDmSince !== null) {
          dmSince = this.fallbackDmSince;
          this.lastDmEventTs = dmSince;
          this.fallbackDmSince = null;
          logger.debug("Nostr", "Storage read failed, using DM fallback since:", dmSince, err);
        } else {
          dmSince = Math.floor(Date.now() / 1e3);
          logger.debug("Nostr", "Failed to read last DM event timestamp, falling back to now:", err);
        }
      }
    } else if (this.fallbackDmSince !== null) {
      dmSince = this.fallbackDmSince;
      this.lastDmEventTs = dmSince;
      this.fallbackDmSince = null;
      logger.debug("Nostr", "No storage adapter for DM, using fallback since:", dmSince);
    } else {
      dmSince = Math.floor(Date.now() / 1e3);
      logger.debug("Nostr", "No storage adapter for DM, starting from now:", dmSince);
    }
    const chatFilter = new Filter();
    chatFilter.kinds = [EventKinds.GIFT_WRAP];
    chatFilter["#p"] = [nostrPubkey];
    chatFilter.since = Math.max(0, dmSince - TIMESTAMP_RANDOMIZATION);
    this.chatSubscriptionId = this.nostrClient.subscribe(chatFilter, {
      onEvent: (event) => {
        logger.debug("Nostr", "Received chat event kind:", event.kind, "id:", event.id?.slice(0, 12));
        this.handleEvent({
          id: event.id,
          kind: event.kind,
          content: event.content,
          tags: event.tags,
          pubkey: event.pubkey,
          created_at: event.created_at,
          sig: event.sig
        });
      },
      onEndOfStoredEvents: () => {
        logger.debug("Nostr", "Chat subscription ready (EOSE)");
        if (!this.chatEoseFired) {
          this.chatEoseFired = true;
          for (const handler of this.chatEoseHandlers) {
            try {
              handler();
            } catch {
            }
          }
          this.chatEoseHandlers = [];
        }
      },
      onError: (_subId, error) => {
        logger.debug("Nostr", "Chat subscription error:", error);
      }
    });
    logger.debug("Nostr", "Chat subscription created, subId:", this.chatSubscriptionId);
  }
  subscribeToTags(tags) {
    if (!this.nostrClient) return;
    const key = tags.sort().join(":");
    const filter = new Filter({
      kinds: [EVENT_KINDS.BROADCAST],
      "#t": tags,
      since: Math.floor(Date.now() / 1e3) - 3600
      // Last hour
    });
    const subId = this.nostrClient.subscribe(filter, {
      onEvent: (event) => {
        this.handleBroadcast({
          id: event.id,
          kind: event.kind,
          content: event.content,
          tags: event.tags,
          pubkey: event.pubkey,
          created_at: event.created_at,
          sig: event.sig
        });
      }
    });
    this.broadcastSubscriptions.set(key, subId);
  }
  // ===========================================================================
  // Private: Encryption
  // ===========================================================================
  async decryptContent(content, senderPubkey) {
    if (!this.keyManager) throw new SphereError("KeyManager not initialized", "NOT_INITIALIZED");
    const decrypted = await NIP04.decryptHex(
      content,
      this.keyManager.getPrivateKeyHex(),
      senderPubkey
    );
    return this.stripContentPrefix(decrypted);
  }
  /**
   * Strip known content prefixes (nostr-js-sdk compatibility)
   * Handles: payment_request:, token_transfer:, etc.
   */
  stripContentPrefix(content) {
    const prefixes = [
      "payment_request:",
      "token_transfer:",
      "payment_response:"
    ];
    for (const prefix of prefixes) {
      if (content.startsWith(prefix)) {
        return content.slice(prefix.length);
      }
    }
    return content;
  }
  // ===========================================================================
  // Private: Helpers
  // ===========================================================================
  ensureConnected() {
    if (!this.isConnected()) {
      throw new SphereError("NostrTransportProvider not connected", "TRANSPORT_ERROR");
    }
  }
  /**
   * Async version of ensureConnected — reconnects if the original transport
   * lost its WebSocket while subscriptions are suppressed (mux handles events).
   * Used by resolve methods which are always async.
   */
  async ensureConnectedForResolve() {
    if (this.isConnected()) return;
    if (this._subscriptionsSuppressed && this.nostrClient) {
      logger.debug("Nostr", "Suppressed transport disconnected \u2014 reconnecting for resolve");
      try {
        await Promise.race([
          this.nostrClient.connect(...this.config.relays),
          new Promise(
            (_, reject) => setTimeout(() => reject(new Error("reconnect timeout")), 5e3)
          )
        ]);
        if (this.nostrClient.isConnected()) {
          this.status = "connected";
          return;
        }
      } catch {
      }
    }
    throw new SphereError("NostrTransportProvider not connected", "TRANSPORT_ERROR");
  }
  ensureReady() {
    this.ensureConnected();
    if (!this.identity) {
      throw new SphereError("Identity not set", "NOT_INITIALIZED");
    }
  }
  emitEvent(event) {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch (error) {
        logger.debug("Nostr", "Event callback error:", error);
      }
    }
  }
  /**
   * Create a NIP-17 gift wrap with a custom inner rumor kind.
   * Replicates the three-layer NIP-59 envelope (rumor → seal → gift wrap)
   * because NIP17.createGiftWrap hardcodes kind 14 for the inner rumor.
   */
  createCustomKindGiftWrap(recipientPubkeyHex, content, rumorKind) {
    return _NostrTransportProvider.createCustomKindGiftWrap(this.keyManager, recipientPubkeyHex, content, rumorKind);
  }
  /**
   * Create a NIP-17 gift wrap with a custom rumor kind.
   * Shared between NostrTransportProvider and MultiAddressTransportMux.
   */
  static createCustomKindGiftWrap(keyManager, recipientPubkeyHex, content, rumorKind) {
    const senderPubkey = keyManager.getPublicKeyHex();
    const now2 = Math.floor(Date.now() / 1e3);
    const rumorTags = [["p", recipientPubkeyHex]];
    const rumorSerialized = JSON.stringify([0, senderPubkey, now2, rumorKind, rumorTags, content]);
    const rumorId = bytesToHex(sha256(new TextEncoder().encode(rumorSerialized)));
    const rumor = { id: rumorId, pubkey: senderPubkey, created_at: now2, kind: rumorKind, tags: rumorTags, content };
    const recipientPubkeyBytes = hexToBytes(recipientPubkeyHex);
    const encryptedRumor = NIP44.encrypt(JSON.stringify(rumor), keyManager.getPrivateKey(), recipientPubkeyBytes);
    const sealTimestamp = now2 + Math.floor(Math.random() * 2 * TIMESTAMP_RANDOMIZATION) - TIMESTAMP_RANDOMIZATION;
    const seal = NostrEventClass.create(keyManager, {
      kind: EventKinds.SEAL,
      tags: [],
      content: encryptedRumor,
      created_at: sealTimestamp
    });
    const ephemeralKeys = NostrKeyManager.generate();
    const encryptedSeal = NIP44.encrypt(JSON.stringify(seal.toJSON()), ephemeralKeys.getPrivateKey(), recipientPubkeyBytes);
    const wrapTimestamp = now2 + Math.floor(Math.random() * 2 * TIMESTAMP_RANDOMIZATION) - TIMESTAMP_RANDOMIZATION;
    const giftWrap = NostrEventClass.create(ephemeralKeys, {
      kind: EventKinds.GIFT_WRAP,
      tags: [["p", recipientPubkeyHex]],
      content: encryptedSeal,
      created_at: wrapTimestamp
    });
    ephemeralKeys.clear();
    return giftWrap;
  }
};

// impl/browser/transport/index.ts
function createBrowserWebSocket(url) {
  return new WebSocket(url);
}
function createNostrTransportProvider(config) {
  return new NostrTransportProvider({
    ...config,
    createWebSocket: createBrowserWebSocket
  });
}

// oracle/UnicityAggregatorProvider.ts
import { StateTransitionClient } from "@unicitylabs/state-transition-sdk/lib/StateTransitionClient";
import { AggregatorClient } from "@unicitylabs/state-transition-sdk/lib/api/AggregatorClient";
import { RootTrustBase } from "@unicitylabs/state-transition-sdk/lib/bft/RootTrustBase";
import { Token as SdkToken } from "@unicitylabs/state-transition-sdk/lib/token/Token";
import { PredicateEngineService } from "@unicitylabs/state-transition-sdk/lib/predicate/PredicateEngineService";
import { waitInclusionProof } from "@unicitylabs/state-transition-sdk/lib/util/InclusionProofUtils";
import {
  InclusionProof as SdkInclusionProof,
  InclusionProofVerificationStatus as InclusionProofVerificationStatus2
} from "@unicitylabs/state-transition-sdk/lib/transaction/InclusionProof";
import { RequestId as RequestId3 } from "@unicitylabs/state-transition-sdk/lib/api/RequestId";
import { DataHash as DataHash3 } from "@unicitylabs/state-transition-sdk/lib/hash/DataHash";
var UnicityAggregatorProvider = class _UnicityAggregatorProvider {
  id = "unicity-aggregator";
  name = "Unicity Aggregator";
  type = "network";
  description = "Unicity state transition aggregator (oracle implementation)";
  config;
  status = "disconnected";
  eventCallbacks = /* @__PURE__ */ new Set();
  // SDK clients
  aggregatorClient = null;
  stateTransitionClient = null;
  trustBase = null;
  /** Get the current trust base */
  getTrustBase() {
    return this.trustBase;
  }
  /**
   * Get the bundled RootTrustBase (H6 — SPEC §8.4.2).
   *
   * Alias for getTrustBase(), exposed under the spec-canonical name so the
   * pointer layer can consume the same bundled trust base as L4.
   */
  getRootTrustBase() {
    return this.trustBase;
  }
  /** Get the state transition client */
  getStateTransitionClient() {
    return this.stateTransitionClient;
  }
  /** Get the aggregator client */
  getAggregatorClient() {
    return this.aggregatorClient;
  }
  // Cache for spent states (immutable). Wave L: capped at 4096 with
  // delete-oldest LRU eviction to prevent unbounded growth. Spent
  // states are immutable so caching is safe; the cap protects long-
  // running wallet processes that observe many unique stateHashes
  // (transfers, validate() loops, cross-wallet sync) from gradual
  // memory bloat.
  spentCache = /* @__PURE__ */ new Map();
  static SPENT_CACHE_MAX = 4096;
  /** Wave L: bounded cache insert. */
  cacheSpent(stateHash) {
    if (this.spentCache.size >= _UnicityAggregatorProvider.SPENT_CACHE_MAX) {
      const firstKey = this.spentCache.keys().next().value;
      if (firstKey !== void 0) this.spentCache.delete(firstKey);
    }
    this.spentCache.set(stateHash, true);
  }
  constructor(config) {
    this.config = {
      url: config.url,
      apiKey: config.apiKey ?? "",
      timeout: config.timeout ?? DEFAULT_AGGREGATOR_TIMEOUT,
      skipVerification: config.skipVerification ?? false,
      debug: config.debug ?? false,
      trustBaseLoader: config.trustBaseLoader
    };
  }
  // ===========================================================================
  // BaseProvider Implementation
  // ===========================================================================
  async connect() {
    if (this.status === "connected") return;
    this.status = "connecting";
    this.status = "connected";
    this.emitEvent({ type: "oracle:connected", timestamp: Date.now() });
    this.log("Connected to oracle:", this.config.url);
  }
  async disconnect() {
    this.status = "disconnected";
    this.emitEvent({ type: "oracle:disconnected", timestamp: Date.now() });
    this.log("Disconnected from oracle");
  }
  isConnected() {
    return this.status === "connected";
  }
  getStatus() {
    return this.status;
  }
  // ===========================================================================
  // OracleProvider Implementation
  // ===========================================================================
  async initialize(trustBase) {
    this.inclusionProofCache.clear();
    this.aggregatorClient = new AggregatorClient(
      this.config.url,
      this.config.apiKey || null
    );
    this.stateTransitionClient = new StateTransitionClient(this.aggregatorClient);
    if (trustBase) {
      this.trustBase = trustBase;
    } else if (!this.config.skipVerification && this.config.trustBaseLoader) {
      try {
        const trustBaseJson = await this.config.trustBaseLoader.load();
        if (trustBaseJson) {
          this.trustBase = RootTrustBase.fromJSON(trustBaseJson);
        } else {
          throw new SphereError(
            "TrustBaseLoader.load() returned null/undefined \u2014 cannot verify proofs",
            "NOT_INITIALIZED"
          );
        }
      } catch (error) {
        if (error instanceof SphereError) {
          throw error;
        }
        throw new SphereError(
          `Failed to load trust base \u2014 refusing to initialize aggregator: ${error instanceof Error ? error.message : String(error)}`,
          "NOT_INITIALIZED",
          error
        );
      }
    }
    await this.connect();
    this.log("Initialized with trust base:", !!this.trustBase);
  }
  /**
   * Submit a transfer commitment to the aggregator.
   * Accepts either an SDK TransferCommitment or a simple commitment object.
   */
  async submitCommitment(commitment) {
    this.ensureConnected();
    try {
      let requestId;
      if (this.isSdkTransferCommitment(commitment)) {
        const response = await this.stateTransitionClient.submitTransferCommitment(commitment);
        requestId = typeof commitment.requestId === "object" && commitment.requestId !== null && typeof commitment.requestId.toJSON === "function" ? commitment.requestId.toJSON() : commitment.requestId !== void 0 ? String(commitment.requestId) : response.status;
      } else {
        const response = await this.rpcCall("submit_commitment", {
          sourceToken: commitment.sourceToken,
          recipient: commitment.recipient,
          salt: Array.from(commitment.salt),
          data: commitment.data
        });
        requestId = response.requestId ?? "";
      }
      this.emitEvent({
        type: "commitment:submitted",
        timestamp: Date.now(),
        data: { requestId }
      });
      return {
        success: true,
        requestId,
        timestamp: Date.now()
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMsg,
        timestamp: Date.now()
      };
    }
  }
  /**
   * Submit a mint commitment to the aggregator (SDK only)
   * @param commitment - SDK MintCommitment instance
   */
  async submitMintCommitment(commitment) {
    this.ensureConnected();
    try {
      const response = await this.stateTransitionClient.submitMintCommitment(commitment);
      const requestId = typeof commitment.requestId === "object" && commitment.requestId !== null && typeof commitment.requestId.toJSON === "function" ? commitment.requestId.toJSON() : commitment.requestId !== void 0 ? String(commitment.requestId) : response.status;
      this.emitEvent({
        type: "commitment:submitted",
        timestamp: Date.now(),
        data: { requestId }
      });
      return {
        success: true,
        requestId,
        timestamp: Date.now()
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMsg,
        timestamp: Date.now()
      };
    }
  }
  isSdkTransferCommitment(commitment) {
    return commitment !== null && typeof commitment === "object" && "requestId" in commitment && typeof commitment.requestId?.toString === "function";
  }
  async getProof(requestId) {
    this.ensureConnected();
    try {
      const response = await this.rpcCall("get_inclusion_proof", { requestId });
      const proof = response.inclusionProof ?? response.proof;
      if (!proof) {
        return null;
      }
      if (typeof proof !== "object" || proof === null || Array.isArray(proof)) {
        logger.warn(
          "Aggregator",
          `getProof: rejected non-object inclusion proof shape (got ${Array.isArray(proof) ? "array" : typeof proof})`
        );
        return null;
      }
      const proofObj = proof;
      const requiredKeys = [
        "authenticator",
        "merkleTreePath",
        "transactionHash",
        "unicityCertificate"
      ];
      for (const k of requiredKeys) {
        if (!(k in proofObj)) {
          logger.warn(
            "Aggregator",
            `getProof: rejected inclusion proof missing required field "${k}"`
          );
          return null;
        }
      }
      try {
        SdkInclusionProof.fromJSON(proof);
      } catch (parseErr) {
        logger.warn(
          "Aggregator",
          "getProof: SDK fromJSON rejected inclusion proof shape",
          parseErr
        );
        return null;
      }
      return {
        requestId,
        roundNumber: response.roundNumber ?? 0,
        proof,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.warn("Aggregator", "getProof failed", error);
      return null;
    }
  }
  async waitForProof(requestId, options) {
    const timeout = options?.timeout ?? this.config.timeout;
    const pollInterval = options?.pollInterval ?? TIMEOUTS.PROOF_POLL_INTERVAL;
    const startTime = Date.now();
    let attempt = 0;
    while (Date.now() - startTime < timeout) {
      options?.onPoll?.(++attempt);
      const proof = await this.getProof(requestId);
      if (proof) {
        this.emitEvent({
          type: "proof:received",
          timestamp: Date.now(),
          data: { requestId, roundNumber: proof.roundNumber }
        });
        return proof;
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
    throw new SphereError(`Timeout waiting for proof: ${requestId}`, "TIMEOUT");
  }
  async validateToken(tokenData) {
    this.ensureConnected();
    let sdkToken = null;
    try {
      sdkToken = await SdkToken.fromJSON(tokenData);
    } catch {
    }
    try {
      if (this.trustBase && !this.config.skipVerification && sdkToken !== null) {
        try {
          const verifyResult = await sdkToken.verify(this.trustBase);
          const stateHash = await sdkToken.state.calculateHash();
          const stateHashStr = stateHash.toJSON();
          const valid2 = verifyResult.isSuccessful;
          this.emitEvent({
            type: "validation:completed",
            timestamp: Date.now(),
            data: { valid: valid2 }
          });
          return {
            valid: valid2,
            spent: false,
            // Spend check is separate
            stateHash: stateHashStr,
            error: valid2 ? void 0 : "SDK verification failed"
          };
        } catch (sdkError) {
          this.log("SDK validation failed, falling back to RPC:", sdkError);
        }
      }
      const response = await this.rpcCall("validateToken", { token: tokenData });
      const valid = response.valid ?? false;
      const spent = response.spent ?? false;
      this.emitEvent({
        type: "validation:completed",
        timestamp: Date.now(),
        data: { valid }
      });
      if (response.stateHash && spent) {
        const pubkeyHex = await this.derivePredicatePublicKeyHex(sdkToken);
        const cacheKey = pubkeyHex !== null ? `${pubkeyHex}:${response.stateHash}` : response.stateHash;
        this.cacheSpent(cacheKey);
      }
      return {
        valid,
        spent,
        stateHash: response.stateHash,
        error: response.error
      };
    } catch (error) {
      return {
        valid: false,
        spent: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * Issue #245 #5 — derive the hex-encoded publicKey from a parsed
   * SDK Token's current state predicate. Best-effort; returns `null`
   * when the predicate is missing or cannot be materialized.
   *
   * Same recipe as PaymentsModule's
   * `extractCurrentStatePublicKeyHexFromSdkData` but operates on an
   * already-parsed `SdkToken` (validateToken parses once and shares).
   */
  async derivePredicatePublicKeyHex(sdkToken) {
    if (sdkToken === null || sdkToken === void 0) return null;
    const statePredicate = sdkToken?.state?.predicate;
    if (statePredicate === void 0 || statePredicate === null) return null;
    let predicate;
    try {
      predicate = await PredicateEngineService.createPredicate(statePredicate);
    } catch {
      return null;
    }
    const pubkey = predicate.publicKey;
    if (!(pubkey instanceof Uint8Array) || pubkey.length === 0) return null;
    return bytesToHex3(pubkey);
  }
  /**
   * Wait for inclusion proof using SDK (for SDK commitments)
   */
  async waitForProofSdk(commitment, signal) {
    this.ensureConnected();
    if (!this.trustBase) {
      throw new SphereError("Trust base not initialized", "NOT_INITIALIZED");
    }
    return await waitInclusionProof(
      this.trustBase,
      this.stateTransitionClient,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      commitment,
      signal
    );
  }
  /**
   * Wave G.3: cryptographic verification of an inclusion proof for
   * the UXF Rule 4 enrichment gate.
   *
   * Reconstructs the SDK `InclusionProof` from the supplied JSON
   * shape, derives the `RequestId` from the proof's authenticator
   * (publicKey + stateHash imprint), and calls `proof.verify()`
   * against the bundled `RootTrustBase`. Returns true ONLY on
   * `OK` — anything else (PATH_NOT_INCLUDED / PATH_INVALID /
   * NOT_AUTHENTICATED / thrown) returns false so a buggy or
   * forged proof can never be lifted into a synthetic token-root.
   *
   * Cache: results are memoized by transactionHash since proof
   * verification is deterministic given (proofJson, trustBase,
   * tx). The cache is bounded; a Profile-level merge typically
   * runs verifyInclusionProof O(N) times where N = number of
   * unique tx-proof pairs in the merge candidates, often
   * single-digit.
   */
  inclusionProofCache = /* @__PURE__ */ new Map();
  static INCLUSION_PROOF_CACHE_MAX = 1024;
  async verifyInclusionProof(input) {
    if (this.trustBase === null) {
      throw new SphereError(
        "verifyInclusionProof: trustBase not loaded \u2014 call initialize() first",
        "NOT_INITIALIZED"
      );
    }
    if (typeof input.transactionHash !== "string" || input.transactionHash.length < 4 || input.transactionHash.length % 2 !== 0 || !/^[0-9a-f]+$/.test(input.transactionHash)) {
      logger.debug(
        "Aggregator",
        "verifyInclusionProof: transactionHash must be even-length lowercase hex (got=" + (typeof input.transactionHash === "string" ? input.transactionHash : typeof input.transactionHash) + ")"
      );
      return false;
    }
    const cacheKey = input.proofHash ? `${input.proofHash}:${input.transactionHash}` : input.transactionHash;
    const cached = this.inclusionProofCache.get(cacheKey);
    if (cached !== void 0) {
      this.inclusionProofCache.delete(cacheKey);
      this.inclusionProofCache.set(cacheKey, cached);
      return cached;
    }
    let result = false;
    try {
      const proof = SdkInclusionProof.fromJSON(input.proofJson);
      if (!proof.authenticator) {
        result = false;
      } else {
        const proofTxHashHex = proof.transactionHash ? Array.from(proof.transactionHash.imprint).map((b) => b.toString(16).padStart(2, "0")).join("") : null;
        if (proofTxHashHex === null) {
          result = false;
        } else if (!input.transactionHash || input.transactionHash.toLowerCase() !== proofTxHashHex.toLowerCase()) {
          logger.debug(
            "Aggregator",
            `verifyInclusionProof: transactionHash mismatch (input=${input.transactionHash}, proof.transactionHash.imprint=${proofTxHashHex}). Hint: callers must pass the SDK-encoded DataHash imprint (typically 68 chars for sha2-256), not the 64-char digest.`
          );
          result = false;
        } else {
          const requestId = await RequestId3.create(
            proof.authenticator.publicKey,
            proof.authenticator.stateHash
          );
          const status = await proof.verify(this.trustBase, requestId);
          result = status === InclusionProofVerificationStatus2.OK;
        }
      }
    } catch (err) {
      logger.debug("Aggregator", "verifyInclusionProof failed (treated as invalid)", err);
      result = false;
    }
    if (this.inclusionProofCache.size >= _UnicityAggregatorProvider.INCLUSION_PROOF_CACHE_MAX) {
      const firstKey = this.inclusionProofCache.keys().next().value;
      if (firstKey !== void 0) this.inclusionProofCache.delete(firstKey);
    }
    this.inclusionProofCache.set(cacheKey, result);
    return result;
  }
  async isSpent(publicKey, stateHash) {
    const cacheKey = `${publicKey}:${stateHash}`;
    if (this.spentCache.has(cacheKey)) {
      const cached = this.spentCache.get(cacheKey);
      this.spentCache.delete(cacheKey);
      this.spentCache.set(cacheKey, cached);
      return cached;
    }
    this.ensureConnected();
    let requestIdHex;
    try {
      const pubkeyBytes = hexToBytes2(publicKey);
      const stateHashDataHash = DataHash3.fromJSON(stateHash);
      const requestId = await RequestId3.create(pubkeyBytes, stateHashDataHash);
      requestIdHex = requestId.toJSON();
    } catch (error) {
      const cause = error instanceof Error ? error.message : String(error);
      throw new SphereError(
        `isSpent: failed to derive requestId from publicKey/stateHash (${cause})`,
        "AGGREGATOR_ERROR",
        error
      );
    }
    let response;
    try {
      response = await this.rpcCall("get_inclusion_proof", {
        requestId: requestIdHex
      });
    } catch (error) {
      const cause = error instanceof Error ? error.message : String(error);
      logger.warn("Aggregator", "isSpent RPC failed; refusing to fail-open", error);
      throw new SphereError(
        `isSpent: aggregator RPC failed (${cause})`,
        "AGGREGATOR_ERROR",
        error
      );
    }
    const proof = response.inclusionProof ?? response.proof;
    let spent = false;
    if (proof !== void 0 && proof !== null && typeof proof === "object") {
      const txHash = proof.transactionHash;
      spent = typeof txHash === "string" && txHash.length > 0;
    }
    if (spent) {
      this.cacheSpent(cacheKey);
    }
    return spent;
  }
  async getTokenState(tokenId) {
    this.ensureConnected();
    try {
      const response = await this.rpcCall("getTokenState", { tokenId });
      if (!response.state) {
        return null;
      }
      return {
        tokenId,
        stateHash: response.state.stateHash ?? "",
        spent: response.state.spent ?? false,
        roundNumber: response.state.roundNumber,
        lastUpdated: Date.now()
      };
    } catch (error) {
      logger.warn("Aggregator", "getTokenState failed", error);
      return null;
    }
  }
  async getCurrentRound() {
    if (!this.aggregatorClient) {
      throw new Error("UnicityAggregatorProvider: aggregator client not initialized");
    }
    const blockHeight = await this.aggregatorClient.getBlockHeight();
    return Number(blockHeight);
  }
  async mint(params) {
    this.ensureConnected();
    try {
      const response = await this.rpcCall("mint", {
        coinId: params.coinId,
        amount: params.amount,
        recipientAddress: params.recipientAddress,
        recipientPubkey: params.recipientPubkey
      });
      return {
        success: true,
        requestId: response.requestId,
        tokenId: response.tokenId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  // ===========================================================================
  // Event Subscription
  // ===========================================================================
  onEvent(callback) {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }
  // ===========================================================================
  // Private: RPC
  // ===========================================================================
  async rpcCall(method, params) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);
    try {
      const response = await fetch(this.config.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method,
          params
        }),
        signal: controller.signal
      });
      if (!response.ok) {
        throw new SphereError(`HTTP ${response.status}: ${response.statusText}`, "AGGREGATOR_ERROR");
      }
      const result = await response.json();
      if (result.error) {
        throw new SphereError(result.error.message ?? "RPC error", "AGGREGATOR_ERROR");
      }
      return result.result ?? {};
    } finally {
      clearTimeout(timeout);
    }
  }
  // ===========================================================================
  // Private: Helpers
  // ===========================================================================
  ensureConnected() {
    if (this.status !== "connected") {
      throw new SphereError("UnicityAggregatorProvider not connected", "NOT_INITIALIZED");
    }
  }
  emitEvent(event) {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch (error) {
        this.log("Event callback error:", error);
      }
    }
  }
  log(message, ...args) {
    logger.debug("Aggregator", message, ...args);
  }
};
var UnicityOracleProvider = UnicityAggregatorProvider;

// assets/trustbase.ts
var TRUSTBASE_TESTNET = {
  version: 1,
  networkId: 3,
  epoch: 1,
  epochStartRound: 1,
  rootNodes: [
    {
      nodeId: "16Uiu2HAkyQRiA7pMgzgLj9GgaBJEJa8zmx9dzqUDa6WxQPJ82ghU",
      sigKey: "0x039afb2acb65f5fbc272d8907f763d0a5d189aadc9b97afdcc5897ea4dd112e68b",
      stake: 1
    }
  ],
  quorumThreshold: 1,
  stateHash: "",
  changeRecordHash: "",
  previousEntryHash: "",
  signatures: {
    "16Uiu2HAkyQRiA7pMgzgLj9GgaBJEJa8zmx9dzqUDa6WxQPJ82ghU": "0xf157c9fdd8a378e3ca70d354ccc4475ab2cd8de360127bc46b0aeab4b453a80f07fd9136a5843b60a8babaff23e20acc8879861f7651440a5e2829f7541b31f100"
  }
};
var TRUSTBASE_MAINNET = null;
var TRUSTBASE_DEV = TRUSTBASE_TESTNET;

// impl/shared/trustbase-loader.ts
function getEmbeddedTrustBase(network) {
  switch (network) {
    case "mainnet":
      return TRUSTBASE_MAINNET;
    case "testnet":
      return TRUSTBASE_TESTNET;
    case "dev":
      return TRUSTBASE_DEV;
    default:
      return TRUSTBASE_TESTNET;
  }
}
var BaseTrustBaseLoader = class {
  network;
  constructor(network = "testnet") {
    this.network = network;
  }
  async load() {
    const external = await this.loadFromExternal();
    if (external) {
      return external;
    }
    return getEmbeddedTrustBase(this.network);
  }
};

// impl/browser/oracle/index.ts
var BrowserTrustBaseLoader = class extends BaseTrustBaseLoader {
  url;
  constructor(networkOrUrl = "testnet") {
    if (networkOrUrl.startsWith("/") || networkOrUrl.startsWith("http")) {
      super("testnet");
      this.url = networkOrUrl;
    } else {
      super(networkOrUrl);
    }
  }
  async loadFromExternal() {
    if (!this.url) return null;
    try {
      const response = await fetch(this.url);
      if (response.ok) {
        return await response.json();
      }
    } catch {
    }
    return null;
  }
};
function createBrowserTrustBaseLoader(networkOrUrl) {
  return new BrowserTrustBaseLoader(networkOrUrl);
}
function createUnicityAggregatorProvider(config) {
  const { trustBaseUrl, network, ...restConfig } = config;
  return new UnicityAggregatorProvider({
    ...restConfig,
    trustBaseLoader: createBrowserTrustBaseLoader(trustBaseUrl ?? network ?? "testnet")
  });
}
var createUnicityOracleProvider = createUnicityAggregatorProvider;

// impl/browser/download.ts
function downloadFile(content, filename, mimeType = "text/plain") {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
function downloadTextFile(content, filename) {
  downloadFile(content, filename, "text/plain");
}
function downloadJSONFile(content, filename) {
  const jsonString = typeof content === "string" ? content : JSON.stringify(content, null, 2);
  downloadFile(jsonString, filename, "application/json");
}
function downloadWalletText(sphere, options = {}) {
  const content = sphere.exportToTxt({
    password: options.password,
    addressCount: options.addressCount
  });
  const filename = options.filename ? `${options.filename}.txt` : `sphere-wallet-${Date.now()}.txt`;
  downloadTextFile(content, filename);
}
function downloadWalletJSON(sphere, options = {}) {
  const json = sphere.exportToJSON({
    password: options.password,
    addressCount: options.addressCount,
    includeMnemonic: options.includeMnemonic
  });
  const filename = options.filename ? `${options.filename}.json` : `sphere-wallet-${Date.now()}.json`;
  const jsonString = options.pretty !== false ? JSON.stringify(json, null, 2) : JSON.stringify(json);
  downloadFile(jsonString, filename, "application/json");
}
function downloadWalletJSONData(json, filename) {
  const name = filename || `sphere-wallet-${Date.now()}.json`;
  downloadJSONFile(json, name.endsWith(".json") ? name : `${name}.json`);
}
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}
async function readFileAsUint8Array(file) {
  const buffer = await readFileAsArrayBuffer(file);
  return new Uint8Array(buffer);
}

// impl/shared/ipfs/ipfs-error-types.ts
var IpfsError = class extends Error {
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

// impl/shared/ipfs/ipfs-state-persistence.ts
var InMemoryIpfsStatePersistence = class {
  states = /* @__PURE__ */ new Map();
  async load(ipnsName) {
    return this.states.get(ipnsName) ?? null;
  }
  async save(ipnsName, state) {
    this.states.set(ipnsName, { ...state });
  }
  async clear(ipnsName) {
    this.states.delete(ipnsName);
  }
};

// impl/shared/ipfs/ipns-key-derivation.ts
init_sha2();

// core/crypto.ts
import * as bip39 from "bip39";
import CryptoJS from "crypto-js";
import elliptic from "elliptic";
var ec = new elliptic.ec("secp256k1");
var CURVE_ORDER = BigInt(
  "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141"
);
function hexToBytes3(hex) {
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

// impl/shared/ipfs/ipns-key-derivation.ts
var IPNS_HKDF_INFO = "ipfs-storage-ed25519-v1";
var libp2pCryptoModule = null;
var libp2pPeerIdModule = null;
async function loadLibp2pModules() {
  if (!libp2pCryptoModule) {
    [libp2pCryptoModule, libp2pPeerIdModule] = await Promise.all([
      import("@libp2p/crypto/keys"),
      import("@libp2p/peer-id")
    ]);
  }
  return {
    generateKeyPairFromSeed: libp2pCryptoModule.generateKeyPairFromSeed,
    peerIdFromPrivateKey: libp2pPeerIdModule.peerIdFromPrivateKey
  };
}
function deriveEd25519KeyMaterial(privateKeyHex, info = IPNS_HKDF_INFO) {
  const walletSecret = hexToBytes3(privateKeyHex);
  const infoBytes = new TextEncoder().encode(info);
  return hkdf(sha256, walletSecret, void 0, infoBytes, 32);
}
async function deriveIpnsIdentity(privateKeyHex) {
  const { generateKeyPairFromSeed, peerIdFromPrivateKey } = await loadLibp2pModules();
  const derivedKey = deriveEd25519KeyMaterial(privateKeyHex);
  const keyPair = await generateKeyPairFromSeed("Ed25519", derivedKey);
  const peerId = peerIdFromPrivateKey(keyPair);
  return {
    keyPair,
    ipnsName: peerId.toString()
  };
}

// impl/shared/ipfs/ipns-record-manager.ts
var DEFAULT_LIFETIME_MS = 99 * 365 * 24 * 60 * 60 * 1e3;
var ipnsModule = null;
async function loadIpnsModule() {
  if (!ipnsModule) {
    const mod = await import("ipns");
    ipnsModule = {
      createIPNSRecord: mod.createIPNSRecord,
      marshalIPNSRecord: mod.marshalIPNSRecord,
      unmarshalIPNSRecord: mod.unmarshalIPNSRecord
    };
  }
  return ipnsModule;
}
var ipnsValidatorModule = null;
async function loadIpnsValidator() {
  if (!ipnsValidatorModule) {
    const mod = await import("ipns/validator");
    ipnsValidatorModule = { validate: mod.validate };
  }
  return ipnsValidatorModule;
}
var peerIdModule = null;
async function loadPeerIdModule() {
  if (!peerIdModule) {
    const mod = await import("@libp2p/peer-id");
    peerIdModule = { peerIdFromString: mod.peerIdFromString };
  }
  return peerIdModule;
}
async function createSignedRecord(keyPair, cid, sequenceNumber, lifetimeMs = DEFAULT_LIFETIME_MS) {
  const { createIPNSRecord, marshalIPNSRecord } = await loadIpnsModule();
  const record = await createIPNSRecord(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keyPair,
    `/ipfs/${cid}`,
    sequenceNumber,
    lifetimeMs
  );
  return marshalIPNSRecord(record);
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
  const { validate } = publicKey !== null ? await loadIpnsValidator() : { validate: null };
  const lines = responseText.trim().split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.Extra) {
        const recordData = base64ToUint8Array(obj.Extra);
        if (publicKey !== null && validate !== null) {
          try {
            await validate(publicKey, recordData);
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

// impl/shared/ipfs/ipfs-cache.ts
var DEFAULT_IPNS_TTL_MS = 6e4;
var DEFAULT_FAILURE_COOLDOWN_MS = 6e4;
var DEFAULT_FAILURE_THRESHOLD = 3;
var DEFAULT_KNOWN_FRESH_WINDOW_MS = 3e4;
var IpfsCache = class {
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

// impl/shared/ipfs/ipfs-http-client.ts
var DEFAULT_CONNECTIVITY_TIMEOUT_MS = 5e3;
var DEFAULT_FETCH_TIMEOUT_MS = 15e3;
var DEFAULT_RESOLVE_TIMEOUT_MS = 1e4;
var DEFAULT_PUBLISH_TIMEOUT_MS = 3e4;
var DEFAULT_GATEWAY_PATH_TIMEOUT_MS = 3e3;
var DEFAULT_ROUTING_API_TIMEOUT_MS = 2e3;
var IpfsHttpClient = class {
  gateways;
  fetchTimeoutMs;
  resolveTimeoutMs;
  publishTimeoutMs;
  connectivityTimeoutMs;
  debug;
  cache;
  constructor(config, cache) {
    this.gateways = config.gateways;
    this.fetchTimeoutMs = config.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
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

// impl/shared/ipfs/txf-merge.ts
function mergeTxfData(local, remote) {
  let added = 0;
  let removed = 0;
  let conflicts = 0;
  const localVersion = local._meta?.version ?? 0;
  const remoteVersion = remote._meta?.version ?? 0;
  const baseMeta = localVersion >= remoteVersion ? local._meta : remote._meta;
  const mergedMeta = {
    ...baseMeta,
    version: Math.max(localVersion, remoteVersion) + 1,
    updatedAt: Date.now()
  };
  const mergedTombstones = mergeTombstones(
    local._tombstones ?? [],
    remote._tombstones ?? []
  );
  const tombstoneKeys = new Set(
    mergedTombstones.map((t) => `${t.tokenId}:${t.stateHash}`)
  );
  const localTokenKeys = getTokenKeys(local);
  const remoteTokenKeys = getTokenKeys(remote);
  const allTokenKeys = /* @__PURE__ */ new Set([...localTokenKeys, ...remoteTokenKeys]);
  const mergedTokens = {};
  for (const key of allTokenKeys) {
    const tokenId = key.startsWith("_") ? key.slice(1) : key;
    const localToken = local[key];
    const remoteToken = remote[key];
    if (isTokenTombstoned(tokenId, localToken, remoteToken, tombstoneKeys)) {
      if (localTokenKeys.has(key)) removed++;
      continue;
    }
    if (localToken && !remoteToken) {
      mergedTokens[key] = localToken;
    } else if (!localToken && remoteToken) {
      mergedTokens[key] = remoteToken;
      added++;
    } else if (localToken && remoteToken) {
      mergedTokens[key] = localToken;
      conflicts++;
    }
  }
  const mergedOutbox = mergeArrayById(
    local._outbox ?? [],
    remote._outbox ?? [],
    "id"
  );
  const mergedSent = mergeArrayById(
    local._sent ?? [],
    remote._sent ?? [],
    "tokenId"
  );
  const mergedInvalid = mergeArrayById(
    local._invalid ?? [],
    remote._invalid ?? [],
    "tokenId"
  );
  const localNametags = local._nametags ?? [];
  const remoteNametags = remote._nametags ?? [];
  const mergedNametags = mergeNametagsByName(localNametags, remoteNametags);
  const localHistory = local._history ?? [];
  const remoteHistory = remote._history ?? [];
  const mergedHistory = mergeArrayById(localHistory, remoteHistory, "dedupKey");
  const merged = {
    _meta: mergedMeta,
    _tombstones: mergedTombstones.length > 0 ? mergedTombstones : void 0,
    _nametags: mergedNametags.length > 0 ? mergedNametags : void 0,
    _outbox: mergedOutbox.length > 0 ? mergedOutbox : void 0,
    _sent: mergedSent.length > 0 ? mergedSent : void 0,
    _invalid: mergedInvalid.length > 0 ? mergedInvalid : void 0,
    _history: mergedHistory.length > 0 ? mergedHistory : void 0,
    ...mergedTokens
  };
  return { merged, added, removed, conflicts };
}
function mergeTombstones(local, remote) {
  const merged = /* @__PURE__ */ new Map();
  for (const tombstone of [...local, ...remote]) {
    const key = `${tombstone.tokenId}:${tombstone.stateHash}`;
    const existing = merged.get(key);
    if (!existing || tombstone.timestamp > existing.timestamp) {
      merged.set(key, tombstone);
    }
  }
  return Array.from(merged.values());
}
function getTokenKeys(data) {
  const reservedKeys = /* @__PURE__ */ new Set([
    "_meta",
    "_tombstones",
    "_outbox",
    "_sent",
    "_invalid",
    "_nametag",
    "_nametags",
    "_mintOutbox",
    "_invalidatedNametags",
    "_integrity",
    "_history"
  ]);
  const keys = /* @__PURE__ */ new Set();
  for (const key of Object.keys(data)) {
    if (reservedKeys.has(key)) continue;
    if (key.startsWith("archived-") || key.startsWith("_forked_")) continue;
    keys.add(key);
  }
  return keys;
}
function isTokenTombstoned(tokenId, localToken, remoteToken, tombstoneKeys) {
  for (const key of tombstoneKeys) {
    if (key.startsWith(`${tokenId}:`)) {
      return true;
    }
  }
  void localToken;
  void remoteToken;
  return false;
}
function mergeNametagsByName(local, remote) {
  const seen = /* @__PURE__ */ new Map();
  for (const item of local) {
    if (item.name) seen.set(item.name, item);
  }
  for (const item of remote) {
    if (item.name && !seen.has(item.name)) {
      seen.set(item.name, item);
    }
  }
  return Array.from(seen.values());
}
function mergeArrayById(local, remote, idField) {
  const seen = /* @__PURE__ */ new Map();
  for (const item of local) {
    const id = item[idField];
    if (id !== void 0) {
      seen.set(id, item);
    }
  }
  for (const item of remote) {
    const id = item[idField];
    if (id !== void 0 && !seen.has(id)) {
      seen.set(id, item);
    }
  }
  return Array.from(seen.values());
}

// impl/shared/ipfs/ipns-subscription-client.ts
var IpnsSubscriptionClient = class {
  ws = null;
  subscriptions = /* @__PURE__ */ new Map();
  reconnectTimeout = null;
  pingInterval = null;
  fallbackPollInterval = null;
  wsUrl;
  createWebSocket;
  pingIntervalMs;
  initialReconnectDelayMs;
  maxReconnectDelayMs;
  debugEnabled;
  reconnectAttempts = 0;
  isConnecting = false;
  connectionOpenedAt = 0;
  destroyed = false;
  /** Minimum stable connection time before resetting backoff (30 seconds) */
  minStableConnectionMs = 3e4;
  fallbackPollFn = null;
  fallbackPollIntervalMs = 0;
  constructor(config) {
    this.wsUrl = config.wsUrl;
    this.createWebSocket = config.createWebSocket;
    this.pingIntervalMs = config.pingIntervalMs ?? 3e4;
    this.initialReconnectDelayMs = config.reconnectDelayMs ?? 5e3;
    this.maxReconnectDelayMs = config.maxReconnectDelayMs ?? 6e4;
    this.debugEnabled = config.debug ?? false;
  }
  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  /**
   * Subscribe to IPNS updates for a specific name.
   * Automatically connects the WebSocket if not already connected.
   * If WebSocket is connecting, the name will be subscribed once connected.
   */
  subscribe(ipnsName, callback) {
    if (!ipnsName || typeof ipnsName !== "string") {
      this.log("Invalid IPNS name for subscription");
      return () => {
      };
    }
    const isNewSubscription = !this.subscriptions.has(ipnsName);
    if (isNewSubscription) {
      this.subscriptions.set(ipnsName, /* @__PURE__ */ new Set());
    }
    this.subscriptions.get(ipnsName).add(callback);
    if (isNewSubscription && this.ws?.readyState === WebSocketReadyState.OPEN) {
      this.sendSubscribe([ipnsName]);
    }
    if (!this.ws || this.ws.readyState !== WebSocketReadyState.OPEN) {
      this.connect();
    }
    return () => {
      const callbacks = this.subscriptions.get(ipnsName);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(ipnsName);
          if (this.ws?.readyState === WebSocketReadyState.OPEN) {
            this.sendUnsubscribe([ipnsName]);
          }
          if (this.subscriptions.size === 0) {
            this.disconnect();
          }
        }
      }
    };
  }
  /**
   * Register a convenience update callback for all subscriptions.
   * Returns an unsubscribe function.
   */
  onUpdate(callback) {
    if (!this.subscriptions.has("*")) {
      this.subscriptions.set("*", /* @__PURE__ */ new Set());
    }
    this.subscriptions.get("*").add(callback);
    return () => {
      const callbacks = this.subscriptions.get("*");
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete("*");
        }
      }
    };
  }
  /**
   * Set a fallback poll function to use when WebSocket is disconnected.
   * The poll function will be called at the specified interval while WS is down.
   */
  setFallbackPoll(fn, intervalMs) {
    this.fallbackPollFn = fn;
    this.fallbackPollIntervalMs = intervalMs;
    if (!this.isConnected()) {
      this.startFallbackPolling();
    }
  }
  /**
   * Connect to the WebSocket server.
   */
  connect() {
    if (this.destroyed) return;
    if (this.ws?.readyState === WebSocketReadyState.OPEN || this.isConnecting) {
      return;
    }
    this.isConnecting = true;
    try {
      this.log(`Connecting to ${this.wsUrl}...`);
      this.ws = this.createWebSocket(this.wsUrl);
      this.ws.onopen = () => {
        this.log("WebSocket connected");
        this.isConnecting = false;
        this.connectionOpenedAt = Date.now();
        const names = Array.from(this.subscriptions.keys()).filter((n) => n !== "*");
        if (names.length > 0) {
          this.sendSubscribe(names);
        }
        this.startPingInterval();
        this.stopFallbackPolling();
      };
      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
      this.ws.onclose = () => {
        const connectionDuration = this.connectionOpenedAt > 0 ? Date.now() - this.connectionOpenedAt : 0;
        const wasStable = connectionDuration >= this.minStableConnectionMs;
        this.log(`WebSocket closed (duration: ${Math.round(connectionDuration / 1e3)}s)`);
        this.isConnecting = false;
        this.connectionOpenedAt = 0;
        this.stopPingInterval();
        if (wasStable) {
          this.reconnectAttempts = 0;
        }
        this.startFallbackPolling();
        this.scheduleReconnect();
      };
      this.ws.onerror = () => {
        this.log("WebSocket error");
        this.isConnecting = false;
      };
    } catch (e) {
      this.log(`Failed to connect: ${e}`);
      this.isConnecting = false;
      this.startFallbackPolling();
      this.scheduleReconnect();
    }
  }
  /**
   * Disconnect from the WebSocket server and clean up.
   */
  disconnect() {
    this.destroyed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.stopPingInterval();
    this.stopFallbackPolling();
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }
  /**
   * Check if connected to the WebSocket server.
   */
  isConnected() {
    return this.ws?.readyState === WebSocketReadyState.OPEN;
  }
  // ---------------------------------------------------------------------------
  // Internal: Message Handling
  // ---------------------------------------------------------------------------
  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      switch (message.type) {
        case "update":
          if (message.name && message.sequence !== void 0) {
            this.notifySubscribers({
              type: "update",
              name: message.name,
              sequence: message.sequence,
              cid: message.cid ?? "",
              timestamp: message.timestamp || (/* @__PURE__ */ new Date()).toISOString()
            });
          }
          break;
        case "subscribed":
          this.log(`Subscribed to ${message.names?.length || 0} names`);
          break;
        case "unsubscribed":
          this.log(`Unsubscribed from ${message.names?.length || 0} names`);
          break;
        case "pong":
          break;
        case "error":
          this.log(`Server error: ${message.message}`);
          break;
        default:
          break;
      }
    } catch {
      this.log("Failed to parse message");
    }
  }
  notifySubscribers(update) {
    const callbacks = this.subscriptions.get(update.name);
    if (callbacks) {
      this.log(`Update: ${update.name.slice(0, 16)}... seq=${update.sequence}`);
      for (const callback of callbacks) {
        try {
          callback(update);
        } catch {
        }
      }
    }
    const globalCallbacks = this.subscriptions.get("*");
    if (globalCallbacks) {
      for (const callback of globalCallbacks) {
        try {
          callback(update);
        } catch {
        }
      }
    }
  }
  // ---------------------------------------------------------------------------
  // Internal: WebSocket Send
  // ---------------------------------------------------------------------------
  sendSubscribe(names) {
    if (this.ws?.readyState === WebSocketReadyState.OPEN) {
      this.ws.send(JSON.stringify({ action: "subscribe", names }));
    }
  }
  sendUnsubscribe(names) {
    if (this.ws?.readyState === WebSocketReadyState.OPEN) {
      this.ws.send(JSON.stringify({ action: "unsubscribe", names }));
    }
  }
  // ---------------------------------------------------------------------------
  // Internal: Reconnection
  // ---------------------------------------------------------------------------
  /**
   * Schedule reconnection with exponential backoff.
   * Sequence: 5s, 10s, 20s, 40s, 60s (capped)
   */
  scheduleReconnect() {
    if (this.destroyed || this.reconnectTimeout) return;
    const realSubscriptions = Array.from(this.subscriptions.keys()).filter((n) => n !== "*");
    if (realSubscriptions.length === 0) return;
    this.reconnectAttempts++;
    const delay = Math.min(
      this.initialReconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelayMs
    );
    this.log(`Reconnecting in ${(delay / 1e3).toFixed(1)}s (attempt ${this.reconnectAttempts})...`);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }
  // ---------------------------------------------------------------------------
  // Internal: Keepalive
  // ---------------------------------------------------------------------------
  startPingInterval() {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocketReadyState.OPEN) {
        this.ws.send(JSON.stringify({ action: "ping" }));
      }
    }, this.pingIntervalMs);
  }
  stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
  // ---------------------------------------------------------------------------
  // Internal: Fallback Polling
  // ---------------------------------------------------------------------------
  startFallbackPolling() {
    if (this.fallbackPollInterval || !this.fallbackPollFn || this.destroyed) return;
    this.log(`Starting fallback polling (${this.fallbackPollIntervalMs / 1e3}s interval)`);
    this.fallbackPollFn().catch((err) => {
      logger.warn("IPNS-WS", "Fallback poll error:", err);
    });
    this.fallbackPollInterval = setInterval(() => {
      this.fallbackPollFn?.().catch((err) => {
        logger.warn("IPNS-WS", "Fallback poll error:", err);
      });
    }, this.fallbackPollIntervalMs);
  }
  stopFallbackPolling() {
    if (this.fallbackPollInterval) {
      clearInterval(this.fallbackPollInterval);
      this.fallbackPollInterval = null;
    }
  }
  // ---------------------------------------------------------------------------
  // Internal: Logging
  // ---------------------------------------------------------------------------
  log(message) {
    logger.debug("IPNS-WS", message);
  }
};

// impl/shared/ipfs/write-behind-buffer.ts
var AsyncSerialQueue = class {
  tail = Promise.resolve();
  /** Enqueue an async operation. Returns when it completes. */
  enqueue(fn) {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.tail = this.tail.then(
      () => fn().then(resolve, reject),
      () => fn().then(resolve, reject)
    );
    return promise;
  }
};
var WriteBuffer = class {
  /** Full TXF data from save() calls — latest wins */
  txfData = null;
  /** IPNS context captured at save() time — ensures flush writes to the correct
   *  IPNS record even if identity changes between save() and flush(). */
  capturedIpnsKeyPair = null;
  capturedIpnsName = null;
  get isEmpty() {
    return this.txfData === null;
  }
  clear() {
    this.txfData = null;
    this.capturedIpnsKeyPair = null;
    this.capturedIpnsName = null;
  }
  /**
   * Merge another buffer's contents into this one (for rollback).
   * Existing (newer) mutations in `this` take precedence over `other`.
   */
  mergeFrom(other) {
    if (other.txfData && !this.txfData) {
      this.txfData = other.txfData;
      this.capturedIpnsKeyPair = other.capturedIpnsKeyPair;
      this.capturedIpnsName = other.capturedIpnsName;
    }
  }
};

// impl/shared/ipfs/ipfs-storage-provider.ts
var IpfsStorageProvider = class _IpfsStorageProvider {
  id = "ipfs";
  name = "IPFS Storage";
  type = "p2p";
  status = "disconnected";
  identity = null;
  ipnsKeyPair = null;
  ipnsName = null;
  ipnsSequenceNumber = 0n;
  lastCid = null;
  lastKnownRemoteSequence = 0n;
  dataVersion = 0;
  /**
   * The CID currently stored on the sidecar for this IPNS name.
   * Used as `_meta.lastCid` in the next save to satisfy chain validation.
   * - null for bootstrap (first-ever save)
   * - set after every successful save() or load()
   */
  remoteCid = null;
  cache;
  httpClient;
  statePersistence;
  eventCallbacks = /* @__PURE__ */ new Set();
  debug;
  ipnsLifetimeMs;
  /** WebSocket factory for push subscriptions */
  createWebSocket;
  /** Override WS URL */
  wsUrl;
  /** Fallback poll interval (default: 90000) */
  fallbackPollIntervalMs;
  /** IPNS subscription client for push notifications */
  subscriptionClient = null;
  /** Unsubscribe function from subscription client */
  subscriptionUnsubscribe = null;
  /** Write-behind buffer: serializes flush / sync / shutdown */
  flushQueue = new AsyncSerialQueue();
  /** Pending mutations not yet flushed to IPFS */
  pendingBuffer = new WriteBuffer();
  /** Debounce timer for background flush */
  flushTimer = null;
  /** Debounce interval in ms */
  flushDebounceMs;
  /** Set to true during shutdown to prevent new flushes */
  isShuttingDown = false;
  /** Stored config for createForAddress() cloning */
  _config;
  _statePersistenceCtor;
  /** Process-wide flag to emit the deprecation warning at most once. */
  static _deprecationWarned = false;
  constructor(config, statePersistence) {
    if (!_IpfsStorageProvider._deprecationWarned) {
      _IpfsStorageProvider._deprecationWarned = true;
      console.warn(
        "[sphere-sdk] IpfsStorageProvider is DEPRECATED. The IPNS-based mutable-pointer flow it implements is superseded by the Profile token-storage path (OrbitDB + aggregator pointer + IPFS CAR). Migrate via createNodeProfileProviders / createBrowserProfileProviders. This provider remains functional for backward compatibility but is no longer the recommended path for new code."
      );
    }
    this._config = config;
    this._statePersistenceCtor = statePersistence;
    const gateways = config?.gateways ?? getIpfsGatewayUrls();
    this.debug = config?.debug ?? false;
    this.ipnsLifetimeMs = config?.ipnsLifetimeMs ?? 99 * 365 * 24 * 60 * 60 * 1e3;
    this.flushDebounceMs = config?.flushDebounceMs ?? 2e3;
    this.cache = new IpfsCache({
      ipnsTtlMs: config?.ipnsCacheTtlMs,
      failureCooldownMs: config?.circuitBreakerCooldownMs,
      failureThreshold: config?.circuitBreakerThreshold,
      knownFreshWindowMs: config?.knownFreshWindowMs
    });
    this.httpClient = new IpfsHttpClient({
      gateways,
      fetchTimeoutMs: config?.fetchTimeoutMs,
      resolveTimeoutMs: config?.resolveTimeoutMs,
      publishTimeoutMs: config?.publishTimeoutMs,
      connectivityTimeoutMs: config?.connectivityTimeoutMs,
      debug: this.debug
    }, this.cache);
    this.statePersistence = statePersistence ?? new InMemoryIpfsStatePersistence();
    this.createWebSocket = config?.createWebSocket;
    this.wsUrl = config?.wsUrl;
    this.fallbackPollIntervalMs = config?.fallbackPollIntervalMs ?? 9e4;
  }
  // ---------------------------------------------------------------------------
  // BaseProvider interface
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
  // Identity & Initialization
  // ---------------------------------------------------------------------------
  setIdentity(identity) {
    this.identity = identity;
  }
  async initialize() {
    if (!this.identity) {
      this.log("Cannot initialize: no identity set");
      return false;
    }
    this.status = "connecting";
    this.emitEvent({ type: "storage:loading", timestamp: Date.now() });
    try {
      const { keyPair, ipnsName } = await deriveIpnsIdentity(this.identity.privateKey);
      this.ipnsKeyPair = keyPair;
      this.ipnsName = ipnsName;
      this.log(`IPNS name derived: ${ipnsName}`);
      const persisted = await this.statePersistence.load(ipnsName);
      if (persisted) {
        this.ipnsSequenceNumber = BigInt(persisted.sequenceNumber);
        this.lastCid = persisted.lastCid;
        this.remoteCid = persisted.lastCid;
        this.dataVersion = persisted.version;
        this.log(`Loaded persisted state: seq=${this.ipnsSequenceNumber}, cid=${this.lastCid}`);
      }
      if (this.createWebSocket) {
        try {
          const wsUrlFinal = this.wsUrl ?? this.deriveWsUrl();
          if (wsUrlFinal) {
            this.subscriptionClient = new IpnsSubscriptionClient({
              wsUrl: wsUrlFinal,
              createWebSocket: this.createWebSocket,
              debug: this.debug
            });
            this.subscriptionUnsubscribe = this.subscriptionClient.subscribe(
              ipnsName,
              (update) => {
                this.log(`Push update: seq=${update.sequence}, cid=${update.cid}`);
                this.emitEvent({
                  type: "storage:remote-updated",
                  timestamp: Date.now(),
                  data: { name: update.name, sequence: update.sequence, cid: update.cid }
                });
              }
            );
            this.subscriptionClient.setFallbackPoll(
              () => this.pollForRemoteChanges(),
              this.fallbackPollIntervalMs
            );
            this.subscriptionClient.connect();
          }
        } catch (wsError) {
          this.log(`Failed to set up IPNS subscription: ${wsError}`);
        }
      }
      this.httpClient.findHealthyGateways().then((healthy) => {
        if (healthy.length > 0) {
          this.log(`${healthy.length} healthy gateway(s) found`);
        } else {
          this.log("Warning: no healthy gateways found");
        }
      }).catch((err) => {
        logger.warn("IPFS-Storage", "Gateway health check failed (non-fatal):", err);
      });
      this.isShuttingDown = false;
      this.status = "connected";
      this.emitEvent({ type: "storage:loaded", timestamp: Date.now() });
      return true;
    } catch (error) {
      this.status = "error";
      this.emitEvent({
        type: "storage:error",
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
  // Issue #239 — accept ShutdownOptions for interface conformance.
  // IpfsStorageProvider already has its own internal best-effort flush
  // semantics; the new options are intentionally ignored (the IPNS
  // pinning model predates the per-flush verification gate). Callers
  // that need verified durability should use the Profile provider.
  async shutdown(_options) {
    this.isShuttingDown = true;
    logger.debug("IPFS-Storage", `shutdown: ipnsName=${this.ipnsName?.slice(0, 20)}..., pendingEmpty=${this.pendingBuffer.isEmpty}, capturedIpns=${this.pendingBuffer.capturedIpnsName?.slice(0, 20) ?? "none"}`);
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flushQueue.enqueue(async () => {
      if (!this.pendingBuffer.isEmpty) {
        try {
          await this.executeFlush();
        } catch {
          this.log("Final flush on shutdown failed (data may be lost)");
        }
      }
    });
    if (this.subscriptionUnsubscribe) {
      this.subscriptionUnsubscribe();
      this.subscriptionUnsubscribe = null;
    }
    if (this.subscriptionClient) {
      this.subscriptionClient.disconnect();
      this.subscriptionClient = null;
    }
    this.cache.clear();
    this.status = "disconnected";
  }
  // ---------------------------------------------------------------------------
  // Save (non-blocking — buffers data for async flush)
  // ---------------------------------------------------------------------------
  async save(data) {
    if (!this.ipnsKeyPair || !this.ipnsName) {
      return { success: false, error: "Not initialized", timestamp: Date.now() };
    }
    this.pendingBuffer.txfData = data;
    this.pendingBuffer.capturedIpnsKeyPair = this.ipnsKeyPair;
    this.pendingBuffer.capturedIpnsName = this.ipnsName;
    this.scheduleFlush();
    return { success: true, timestamp: Date.now() };
  }
  // ---------------------------------------------------------------------------
  // Internal: Blocking save (used by sync and executeFlush)
  // ---------------------------------------------------------------------------
  /**
   * Perform the actual upload + IPNS publish synchronously.
   * Called by executeFlush() and sync() — never by public save().
   */
  async _doSave(data, overrideIpns) {
    const ipnsKeyPair = overrideIpns?.keyPair ?? this.ipnsKeyPair;
    const ipnsName = overrideIpns?.name ?? this.ipnsName;
    const metaAddr = data?._meta?.address;
    logger.debug("IPFS-Storage", `_doSave: ipnsName=${ipnsName?.slice(0, 20)}..., override=${!!overrideIpns}, meta.address=${metaAddr?.slice(0, 20) ?? "none"}`);
    if (!ipnsKeyPair || !ipnsName) {
      return { success: false, error: "Not initialized", timestamp: Date.now() };
    }
    this.emitEvent({ type: "storage:saving", timestamp: Date.now() });
    try {
      this.dataVersion++;
      const metaUpdate = {
        ...data._meta,
        version: this.dataVersion,
        ipnsName,
        updatedAt: Date.now()
      };
      if (this.remoteCid) {
        metaUpdate.lastCid = this.remoteCid;
      }
      const updatedData = { ...data, _meta: metaUpdate };
      const { cid } = await this.httpClient.upload(updatedData);
      this.log(`Content uploaded: CID=${cid}`);
      const baseSeq = this.ipnsSequenceNumber > this.lastKnownRemoteSequence ? this.ipnsSequenceNumber : this.lastKnownRemoteSequence;
      const newSeq = baseSeq + 1n;
      const marshalledRecord = await createSignedRecord(
        ipnsKeyPair,
        cid,
        newSeq,
        this.ipnsLifetimeMs
      );
      const publishResult = await this.httpClient.publishIpns(
        ipnsName,
        marshalledRecord
      );
      if (!publishResult.success) {
        this.dataVersion--;
        this.log(`IPNS publish failed: ${publishResult.error}`);
        return {
          success: false,
          error: publishResult.error ?? "IPNS publish failed",
          timestamp: Date.now()
        };
      }
      this.ipnsSequenceNumber = newSeq;
      this.lastCid = cid;
      this.remoteCid = cid;
      this.cache.setIpnsRecord(ipnsName, {
        cid,
        sequence: newSeq,
        gateway: "local"
      });
      this.cache.setContent(cid, updatedData);
      this.cache.markIpnsFresh(ipnsName);
      await this.statePersistence.save(ipnsName, {
        sequenceNumber: newSeq.toString(),
        lastCid: cid,
        version: this.dataVersion
      });
      this.emitEvent({
        type: "storage:saved",
        timestamp: Date.now(),
        data: { cid, sequence: newSeq.toString() }
      });
      this.log(`Saved: CID=${cid}, seq=${newSeq}`);
      return { success: true, cid, timestamp: Date.now() };
    } catch (error) {
      this.dataVersion--;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emitEvent({
        type: "storage:error",
        timestamp: Date.now(),
        error: errorMessage
      });
      return { success: false, error: errorMessage, timestamp: Date.now() };
    }
  }
  // ---------------------------------------------------------------------------
  // Write-behind buffer: scheduling and flushing
  // ---------------------------------------------------------------------------
  /**
   * Schedule a debounced background flush.
   * Resets the timer on each call so rapid mutations coalesce.
   */
  scheduleFlush() {
    if (this.isShuttingDown) return;
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flushQueue.enqueue(() => this.executeFlush()).catch((err) => {
        this.log(`Background flush failed: ${err}`);
      });
    }, this.flushDebounceMs);
  }
  /**
   * Execute a flush of the pending buffer to IPFS.
   * Runs inside AsyncSerialQueue for concurrency safety.
   */
  async executeFlush() {
    if (this.pendingBuffer.isEmpty) return;
    const active = this.pendingBuffer;
    this.pendingBuffer = new WriteBuffer();
    try {
      const baseData = active.txfData ?? {
        _meta: { version: 0, address: this.identity?.directAddress ?? "", formatVersion: "2.0", updatedAt: 0 }
      };
      const overrideIpns = active.capturedIpnsKeyPair && active.capturedIpnsName ? { keyPair: active.capturedIpnsKeyPair, name: active.capturedIpnsName } : void 0;
      const result = await this._doSave(baseData, overrideIpns);
      if (!result.success) {
        throw new SphereError(result.error ?? "Save failed", "STORAGE_ERROR");
      }
      this.log(`Flushed successfully: CID=${result.cid}`);
    } catch (error) {
      this.pendingBuffer.mergeFrom(active);
      const msg = error instanceof Error ? error.message : String(error);
      this.log(`Flush failed (will retry): ${msg}`);
      this.scheduleFlush();
      throw error;
    }
  }
  // ---------------------------------------------------------------------------
  // Load
  // ---------------------------------------------------------------------------
  async load(identifier) {
    if (!this.ipnsName && !identifier) {
      return { success: false, error: "Not initialized", source: "local", timestamp: Date.now() };
    }
    this.emitEvent({ type: "storage:loading", timestamp: Date.now() });
    try {
      if (identifier) {
        const data2 = await this.httpClient.fetchContent(identifier);
        return { success: true, data: data2, source: "remote", timestamp: Date.now() };
      }
      const ipnsName = this.ipnsName;
      if (this.cache.isIpnsKnownFresh(ipnsName)) {
        const cached = this.cache.getIpnsRecordIgnoreTtl(ipnsName);
        if (cached) {
          const content = this.cache.getContent(cached.cid);
          if (content) {
            this.log("Using known-fresh cached data");
            return { success: true, data: content, source: "cache", timestamp: Date.now() };
          }
        }
      }
      const cachedRecord = this.cache.getIpnsRecord(ipnsName);
      if (cachedRecord) {
        const content = this.cache.getContent(cachedRecord.cid);
        if (content) {
          this.log("IPNS cache hit");
          return { success: true, data: content, source: "cache", timestamp: Date.now() };
        }
        try {
          const data2 = await this.httpClient.fetchContent(cachedRecord.cid);
          return { success: true, data: data2, source: "remote", timestamp: Date.now() };
        } catch {
        }
      }
      const { best } = await this.httpClient.resolveIpns(ipnsName);
      if (!best) {
        this.log("IPNS record not found (new wallet?)");
        return { success: false, error: "IPNS record not found", source: "remote", timestamp: Date.now() };
      }
      if (best.sequence > this.lastKnownRemoteSequence) {
        this.lastKnownRemoteSequence = best.sequence;
      }
      this.remoteCid = best.cid;
      const data = await this.httpClient.fetchContent(best.cid);
      const remoteVersion = data?._meta?.version;
      if (typeof remoteVersion === "number" && remoteVersion > this.dataVersion) {
        this.dataVersion = remoteVersion;
      }
      this.emitEvent({
        type: "storage:loaded",
        timestamp: Date.now(),
        data: { cid: best.cid, sequence: best.sequence.toString() }
      });
      return { success: true, data, source: "remote", timestamp: Date.now() };
    } catch (error) {
      if (this.ipnsName) {
        const cached = this.cache.getIpnsRecordIgnoreTtl(this.ipnsName);
        if (cached) {
          const content = this.cache.getContent(cached.cid);
          if (content) {
            this.log("Network error, returning stale cache");
            return { success: true, data: content, source: "cache", timestamp: Date.now() };
          }
        }
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emitEvent({
        type: "storage:error",
        timestamp: Date.now(),
        error: errorMessage
      });
      return { success: false, error: errorMessage, source: "remote", timestamp: Date.now() };
    }
  }
  // ---------------------------------------------------------------------------
  // Sync (enters serial queue to avoid concurrent IPNS conflicts)
  // ---------------------------------------------------------------------------
  async sync(localData) {
    return this.flushQueue.enqueue(async () => {
      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }
      this.emitEvent({ type: "sync:started", timestamp: Date.now() });
      try {
        this.pendingBuffer.clear();
        const remoteResult = await this.load();
        if (!remoteResult.success || !remoteResult.data) {
          this.log("No remote data found, uploading local data");
          const saveResult2 = await this._doSave(localData);
          this.emitEvent({ type: "sync:completed", timestamp: Date.now() });
          return {
            success: saveResult2.success,
            merged: localData,
            added: 0,
            removed: 0,
            conflicts: 0,
            error: saveResult2.error
          };
        }
        const remoteData = remoteResult.data;
        const localVersion = localData._meta?.version ?? 0;
        const remoteVersion = remoteData._meta?.version ?? 0;
        if (localVersion === remoteVersion && this.lastCid) {
          this.log("Data is in sync (same version)");
          this.emitEvent({ type: "sync:completed", timestamp: Date.now() });
          return {
            success: true,
            merged: localData,
            added: 0,
            removed: 0,
            conflicts: 0
          };
        }
        this.log(`Merging: local v${localVersion} <-> remote v${remoteVersion}`);
        const { merged, added, removed, conflicts } = mergeTxfData(localData, remoteData);
        if (conflicts > 0) {
          this.emitEvent({
            type: "sync:conflict",
            timestamp: Date.now(),
            data: { conflicts }
          });
        }
        const saveResult = await this._doSave(merged);
        this.emitEvent({
          type: "sync:completed",
          timestamp: Date.now(),
          data: { added, removed, conflicts }
        });
        return {
          success: saveResult.success,
          merged,
          added,
          removed,
          conflicts,
          error: saveResult.error
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.emitEvent({
          type: "sync:error",
          timestamp: Date.now(),
          error: errorMessage
        });
        return {
          success: false,
          added: 0,
          removed: 0,
          conflicts: 0,
          error: errorMessage
        };
      }
    });
  }
  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Optional Methods
  // ---------------------------------------------------------------------------
  async exists() {
    if (!this.ipnsName) return false;
    const cached = this.cache.getIpnsRecord(this.ipnsName);
    if (cached) return true;
    const { best } = await this.httpClient.resolveIpns(this.ipnsName);
    return best !== null;
  }
  async clear() {
    if (!this.ipnsKeyPair || !this.ipnsName) return false;
    this.pendingBuffer.clear();
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    const emptyData = {
      _meta: {
        version: 0,
        address: this.identity?.directAddress ?? "",
        ipnsName: this.ipnsName,
        formatVersion: "2.0",
        updatedAt: Date.now()
      }
    };
    const result = await this._doSave(emptyData);
    if (result.success) {
      this.cache.clear();
      await this.statePersistence.clear(this.ipnsName);
    }
    return result.success;
  }
  onEvent(callback) {
    this.eventCallbacks.add(callback);
    return () => {
      this.eventCallbacks.delete(callback);
    };
  }
  // ---------------------------------------------------------------------------
  // Public Accessors
  // ---------------------------------------------------------------------------
  getIpnsName() {
    return this.ipnsName;
  }
  getLastCid() {
    return this.lastCid;
  }
  getSequenceNumber() {
    return this.ipnsSequenceNumber;
  }
  getDataVersion() {
    return this.dataVersion;
  }
  getRemoteCid() {
    return this.remoteCid;
  }
  // ---------------------------------------------------------------------------
  // Testing helper: wait for pending flush to complete
  // ---------------------------------------------------------------------------
  /**
   * Wait for the pending flush timer to fire and the flush operation to
   * complete. Useful in tests to await background writes.
   * Returns immediately if no flush is pending.
   */
  async waitForFlush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
      await this.flushQueue.enqueue(() => this.executeFlush()).catch((err) => {
        logger.warn("IPFS-Storage", "Flush on shutdown failed:", err);
      });
    } else if (!this.pendingBuffer.isEmpty) {
      await this.flushQueue.enqueue(() => this.executeFlush()).catch((err) => {
        logger.warn("IPFS-Storage", "Flush on shutdown failed:", err);
      });
    } else {
      await this.flushQueue.enqueue(async () => {
      });
    }
  }
  // ---------------------------------------------------------------------------
  // Internal: Push Subscription Helpers
  // ---------------------------------------------------------------------------
  /**
   * Derive WebSocket URL from the first configured gateway.
   * Converts https://host → wss://host/ws/ipns
   */
  deriveWsUrl() {
    const gateways = this.httpClient.getGateways();
    if (gateways.length === 0) return null;
    const gateway = gateways[0];
    const wsProtocol = gateway.startsWith("https://") ? "wss://" : "ws://";
    const host = gateway.replace(/^https?:\/\//, "");
    return `${wsProtocol}${host}/ws/ipns`;
  }
  /**
   * Poll for remote IPNS changes (fallback when WS is unavailable).
   * Compares remote sequence number with last known and emits event if changed.
   */
  async pollForRemoteChanges() {
    if (!this.ipnsName) return;
    try {
      const { best } = await this.httpClient.resolveIpns(this.ipnsName);
      if (best && best.sequence > this.lastKnownRemoteSequence) {
        this.log(`Poll detected remote change: seq=${best.sequence} (was ${this.lastKnownRemoteSequence})`);
        this.lastKnownRemoteSequence = best.sequence;
        this.emitEvent({
          type: "storage:remote-updated",
          timestamp: Date.now(),
          data: { name: this.ipnsName, sequence: Number(best.sequence), cid: best.cid }
        });
      }
    } catch {
    }
  }
  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------
  emitEvent(event) {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
      }
    }
  }
  log(message) {
    logger.debug("IPFS-Storage", message);
  }
  /**
   * Create an independent instance for a different address.
   * Shares the same gateway/timeout config but has fresh IPNS state.
   */
  createForAddress() {
    return new _IpfsStorageProvider(this._config, this._statePersistenceCtor);
  }
};

// impl/browser/ipfs/browser-ipfs-state-persistence.ts
var KEY_PREFIX = "sphere_ipfs_";
function seqKey(ipnsName) {
  return `${KEY_PREFIX}seq_${ipnsName}`;
}
function cidKey(ipnsName) {
  return `${KEY_PREFIX}cid_${ipnsName}`;
}
function verKey(ipnsName) {
  return `${KEY_PREFIX}ver_${ipnsName}`;
}
var BrowserIpfsStatePersistence = class {
  async load(ipnsName) {
    try {
      const seq = localStorage.getItem(seqKey(ipnsName));
      if (!seq) return null;
      return {
        sequenceNumber: seq,
        lastCid: localStorage.getItem(cidKey(ipnsName)),
        version: parseInt(localStorage.getItem(verKey(ipnsName)) ?? "0", 10)
      };
    } catch {
      return null;
    }
  }
  async save(ipnsName, state) {
    try {
      localStorage.setItem(seqKey(ipnsName), state.sequenceNumber);
      if (state.lastCid) {
        localStorage.setItem(cidKey(ipnsName), state.lastCid);
      } else {
        localStorage.removeItem(cidKey(ipnsName));
      }
      localStorage.setItem(verKey(ipnsName), String(state.version));
    } catch {
    }
  }
  async clear(ipnsName) {
    try {
      localStorage.removeItem(seqKey(ipnsName));
      localStorage.removeItem(cidKey(ipnsName));
      localStorage.removeItem(verKey(ipnsName));
    } catch {
    }
  }
};

// impl/browser/ipfs/index.ts
function createBrowserWebSocket2(url) {
  return new WebSocket(url);
}
function createBrowserIpfsStorageProvider(config) {
  return new IpfsStorageProvider(
    { ...config, createWebSocket: config?.createWebSocket ?? createBrowserWebSocket2 },
    new BrowserIpfsStatePersistence()
  );
}

// price/CoinGeckoPriceProvider.ts
var CoinGeckoPriceProvider = class {
  platform = "coingecko";
  cache = /* @__PURE__ */ new Map();
  apiKey;
  cacheTtlMs;
  timeout;
  debug;
  baseUrl;
  storage;
  /** In-flight fetch promise for deduplication of concurrent getPrices() calls */
  fetchPromise = null;
  /** Token names being fetched in the current in-flight request */
  fetchNames = null;
  /** Whether persistent cache has been loaded into memory */
  persistentCacheLoaded = false;
  /** Promise for loading persistent cache (deduplication) */
  loadCachePromise = null;
  constructor(config) {
    this.apiKey = config?.apiKey;
    this.cacheTtlMs = config?.cacheTtlMs ?? 6e4;
    this.timeout = config?.timeout ?? 1e4;
    this.debug = config?.debug ?? false;
    this.storage = config?.storage ?? null;
    this.baseUrl = config?.baseUrl ?? (this.apiKey ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3");
  }
  async getPrices(tokenNames) {
    if (tokenNames.length === 0) {
      return /* @__PURE__ */ new Map();
    }
    if (!this.persistentCacheLoaded && this.storage) {
      await this.loadFromStorage();
    }
    const now2 = Date.now();
    const result = /* @__PURE__ */ new Map();
    const uncachedNames = [];
    for (const name of tokenNames) {
      const cached = this.cache.get(name);
      if (cached && cached.expiresAt > now2) {
        result.set(name, cached.price);
      } else {
        uncachedNames.push(name);
      }
    }
    if (uncachedNames.length === 0) {
      return result;
    }
    if (this.fetchPromise && this.fetchNames) {
      const allCovered = uncachedNames.every((n) => this.fetchNames.has(n));
      if (allCovered) {
        if (this.debug) {
          logger.debug("CoinGecko", "Deduplicating request, reusing in-flight fetch");
        }
        const fetched = await this.fetchPromise;
        for (const name of uncachedNames) {
          const price = fetched.get(name);
          if (price) {
            result.set(name, price);
          }
        }
        return result;
      }
    }
    const fetchPromise = this.doFetch(uncachedNames);
    this.fetchPromise = fetchPromise;
    this.fetchNames = new Set(uncachedNames);
    try {
      const fetched = await fetchPromise;
      for (const [name, price] of fetched) {
        result.set(name, price);
      }
    } finally {
      if (this.fetchPromise === fetchPromise) {
        this.fetchPromise = null;
        this.fetchNames = null;
      }
    }
    return result;
  }
  async doFetch(uncachedNames) {
    const result = /* @__PURE__ */ new Map();
    const now2 = Date.now();
    try {
      const ids = uncachedNames.join(",");
      const url = `${this.baseUrl}/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd,eur&include_24hr_change=true`;
      const headers = { Accept: "application/json" };
      if (this.apiKey) {
        headers["x-cg-pro-api-key"] = this.apiKey;
      }
      if (this.debug) {
        logger.debug("CoinGecko", `Fetching prices for: ${uncachedNames.join(", ")}`);
      }
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(this.timeout)
      });
      if (!response.ok) {
        if (response.status === 429) {
          this.extendCacheOnRateLimit(uncachedNames);
        }
        throw new SphereError(`CoinGecko API error: ${response.status} ${response.statusText}`, "NETWORK_ERROR");
      }
      const data = await response.json();
      for (const [name, values] of Object.entries(data)) {
        if (values && typeof values === "object") {
          const price = {
            tokenName: name,
            priceUsd: values.usd ?? 0,
            priceEur: values.eur,
            change24h: values.usd_24h_change,
            timestamp: now2
          };
          this.cache.set(name, { price, expiresAt: now2 + this.cacheTtlMs });
          result.set(name, price);
        }
      }
      for (const name of uncachedNames) {
        if (!result.has(name)) {
          const zeroPrice = {
            tokenName: name,
            priceUsd: 0,
            priceEur: 0,
            change24h: 0,
            timestamp: now2
          };
          this.cache.set(name, { price: zeroPrice, expiresAt: now2 + this.cacheTtlMs });
          result.set(name, zeroPrice);
        }
      }
      if (this.debug) {
        logger.debug("CoinGecko", `Fetched ${result.size} prices`);
      }
      this.saveToStorage();
    } catch (error) {
      if (this.debug) {
        logger.warn("CoinGecko", "Fetch failed, using stale cache:", error);
      }
      for (const name of uncachedNames) {
        const stale = this.cache.get(name);
        if (stale) {
          result.set(name, stale.price);
        }
      }
    }
    return result;
  }
  // ===========================================================================
  // Persistent Storage
  // ===========================================================================
  /**
   * Load cached prices from StorageProvider into in-memory cache.
   * Only loads entries that are still within cacheTtlMs.
   */
  async loadFromStorage() {
    if (this.loadCachePromise) {
      return this.loadCachePromise;
    }
    this.loadCachePromise = this.doLoadFromStorage();
    try {
      await this.loadCachePromise;
    } finally {
      this.loadCachePromise = null;
    }
  }
  async doLoadFromStorage() {
    this.persistentCacheLoaded = true;
    if (!this.storage) return;
    try {
      const [cached, cachedTs] = await Promise.all([
        this.storage.get(STORAGE_KEYS_GLOBAL.PRICE_CACHE),
        this.storage.get(STORAGE_KEYS_GLOBAL.PRICE_CACHE_TS)
      ]);
      if (!cached || !cachedTs) return;
      const ts = parseInt(cachedTs, 10);
      if (isNaN(ts)) return;
      const age = Date.now() - ts;
      if (age > this.cacheTtlMs) return;
      const data = JSON.parse(cached);
      const expiresAt = ts + this.cacheTtlMs;
      for (const [name, price] of Object.entries(data)) {
        if (!this.cache.has(name)) {
          this.cache.set(name, { price, expiresAt });
        }
      }
      if (this.debug) {
        logger.debug("CoinGecko", `Loaded ${Object.keys(data).length} prices from persistent cache`);
      }
    } catch {
    }
  }
  /**
   * Save current prices to StorageProvider (fire-and-forget).
   */
  saveToStorage() {
    if (!this.storage) return;
    const data = {};
    for (const [name, entry] of this.cache) {
      data[name] = entry.price;
    }
    Promise.all([
      this.storage.set(STORAGE_KEYS_GLOBAL.PRICE_CACHE, JSON.stringify(data)),
      this.storage.set(STORAGE_KEYS_GLOBAL.PRICE_CACHE_TS, String(Date.now()))
    ]).catch((err) => logger.debug("Price", "Cache save failed (non-critical)", err));
  }
  // ===========================================================================
  // Rate-limit handling
  // ===========================================================================
  /**
   * On 429 rate-limit, extend stale cache entries so subsequent calls
   * don't immediately retry and hammer the API.
   */
  extendCacheOnRateLimit(names) {
    const backoffMs = 6e4;
    const extendedExpiry = Date.now() + backoffMs;
    for (const name of names) {
      const existing = this.cache.get(name);
      if (existing) {
        existing.expiresAt = Math.max(existing.expiresAt, extendedExpiry);
      }
    }
    if (this.debug) {
      logger.warn("CoinGecko", `Rate-limited (429), extended cache TTL by ${backoffMs / 1e3}s`);
    }
  }
  async getPrice(tokenName) {
    const prices = await this.getPrices([tokenName]);
    return prices.get(tokenName) ?? null;
  }
  clearCache() {
    this.cache.clear();
  }
};

// price/index.ts
function createPriceProvider(config) {
  switch (config.platform) {
    case "coingecko":
      return new CoinGeckoPriceProvider(config);
    default:
      throw new SphereError(`Unsupported price platform: ${String(config.platform)}`, "INVALID_CONFIG");
  }
}

// registry/TokenRegistry.ts
var FETCH_TIMEOUT_MS = 1e4;
var TokenRegistry = class _TokenRegistry {
  static instance = null;
  definitionsById;
  definitionsBySymbol;
  definitionsByName;
  // Remote refresh state
  remoteUrl = null;
  storage = null;
  refreshIntervalMs = TOKEN_REGISTRY_REFRESH_INTERVAL;
  refreshTimer = null;
  lastRefreshAt = 0;
  refreshPromise = null;
  initialLoadPromise = null;
  constructor() {
    this.definitionsById = /* @__PURE__ */ new Map();
    this.definitionsBySymbol = /* @__PURE__ */ new Map();
    this.definitionsByName = /* @__PURE__ */ new Map();
  }
  /**
   * Get singleton instance of TokenRegistry
   */
  static getInstance() {
    if (!_TokenRegistry.instance) {
      _TokenRegistry.instance = new _TokenRegistry();
    }
    return _TokenRegistry.instance;
  }
  /**
   * Configure remote registry refresh with persistent caching.
   *
   * On first call:
   * 1. Loads cached data from StorageProvider (if available and fresh)
   * 2. Starts periodic remote fetch (if autoRefresh is true, which is default)
   *
   * @param options - Configuration options
   * @param options.remoteUrl - Remote URL to fetch definitions from
   * @param options.storage - StorageProvider for persistent caching
   * @param options.refreshIntervalMs - Refresh interval in ms (default: 1 hour)
   * @param options.autoRefresh - Start auto-refresh immediately (default: true)
   */
  static configure(options) {
    const instance = _TokenRegistry.getInstance();
    if (options.remoteUrl !== void 0) {
      instance.remoteUrl = options.remoteUrl;
    }
    if (options.storage !== void 0) {
      instance.storage = options.storage;
    }
    if (options.refreshIntervalMs !== void 0) {
      instance.refreshIntervalMs = options.refreshIntervalMs;
    }
    const autoRefresh = options.autoRefresh ?? true;
    instance.initialLoadPromise = instance.performInitialLoad(autoRefresh);
  }
  /**
   * Reset the singleton instance (useful for testing).
   * Stops auto-refresh if running.
   */
  static resetInstance() {
    if (_TokenRegistry.instance) {
      _TokenRegistry.instance.stopAutoRefresh();
    }
    _TokenRegistry.instance = null;
  }
  /**
   * Destroy the singleton: stop auto-refresh and reset.
   */
  static destroy() {
    _TokenRegistry.resetInstance();
  }
  /**
   * Wait for the initial data load (cache or remote) to complete.
   * Returns true if data was loaded, false if not (timeout or no data source).
   *
   * @param timeoutMs - Maximum wait time in ms (default: 10s). Set to 0 for no timeout.
   */
  static async waitForReady(timeoutMs = 1e4) {
    const instance = _TokenRegistry.getInstance();
    if (!instance.initialLoadPromise) {
      return instance.definitionsById.size > 0;
    }
    if (timeoutMs <= 0) {
      return instance.initialLoadPromise;
    }
    return Promise.race([
      instance.initialLoadPromise,
      new Promise((resolve) => setTimeout(() => resolve(false), timeoutMs))
    ]);
  }
  // ===========================================================================
  // Initial Load
  // ===========================================================================
  /**
   * Perform initial data load: try cache first, fall back to remote fetch.
   * After initial data is available, start periodic auto-refresh if configured.
   */
  async performInitialLoad(autoRefresh) {
    let loaded = false;
    if (this.storage) {
      loaded = await this.loadFromCache();
    }
    if (loaded) {
      if (autoRefresh && this.remoteUrl) {
        this.startAutoRefresh();
      }
      return true;
    }
    if (autoRefresh && this.remoteUrl) {
      loaded = await this.refreshFromRemote();
      this.stopAutoRefresh();
      this.refreshTimer = setInterval(() => {
        this.refreshFromRemote();
      }, this.refreshIntervalMs);
      return loaded;
    }
    return false;
  }
  // ===========================================================================
  // Cache (StorageProvider)
  // ===========================================================================
  /**
   * Load definitions from StorageProvider cache.
   * Only applies if cache exists and is fresh (within refreshIntervalMs).
   */
  async loadFromCache() {
    if (!this.storage) return false;
    try {
      const [cached, cachedTs] = await Promise.all([
        this.storage.get(STORAGE_KEYS_GLOBAL.TOKEN_REGISTRY_CACHE),
        this.storage.get(STORAGE_KEYS_GLOBAL.TOKEN_REGISTRY_CACHE_TS)
      ]);
      if (!cached || !cachedTs) return false;
      const ts = parseInt(cachedTs, 10);
      if (isNaN(ts)) return false;
      const age = Date.now() - ts;
      if (age > this.refreshIntervalMs) return false;
      if (this.lastRefreshAt > ts) return false;
      const data = JSON.parse(cached);
      if (!this.isValidDefinitionsArray(data)) return false;
      this.applyDefinitions(data);
      this.lastRefreshAt = ts;
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Save definitions to StorageProvider cache.
   */
  async saveToCache(definitions) {
    if (!this.storage) return;
    try {
      await Promise.all([
        this.storage.set(STORAGE_KEYS_GLOBAL.TOKEN_REGISTRY_CACHE, JSON.stringify(definitions)),
        this.storage.set(STORAGE_KEYS_GLOBAL.TOKEN_REGISTRY_CACHE_TS, String(Date.now()))
      ]);
    } catch {
    }
  }
  // ===========================================================================
  // Remote Refresh
  // ===========================================================================
  /**
   * Apply an array of token definitions to the internal maps.
   * Clears existing data before applying.
   */
  applyDefinitions(definitions) {
    this.definitionsById.clear();
    this.definitionsBySymbol.clear();
    this.definitionsByName.clear();
    for (const def of definitions) {
      const idLower = def.id.toLowerCase();
      this.definitionsById.set(idLower, def);
      if (def.symbol) {
        this.definitionsBySymbol.set(def.symbol.toUpperCase(), def);
      }
      this.definitionsByName.set(def.name.toLowerCase(), def);
    }
  }
  /**
   * Validate that data is an array of objects with 'id' field
   */
  isValidDefinitionsArray(data) {
    return Array.isArray(data) && data.every((item) => item && typeof item === "object" && "id" in item);
  }
  /**
   * Fetch token definitions from the remote URL and update the registry.
   * On success, also persists to StorageProvider cache.
   * Returns true on success, false on failure. On failure, existing data is preserved.
   * Concurrent calls are deduplicated — only one fetch runs at a time.
   */
  async refreshFromRemote() {
    if (!this.remoteUrl) {
      return false;
    }
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    this.refreshPromise = this.doRefresh();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }
  async doRefresh() {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      let response;
      try {
        response = await fetch(this.remoteUrl, {
          headers: { Accept: "application/json" },
          signal: controller.signal
        });
      } finally {
        clearTimeout(timer);
      }
      if (!response.ok) {
        logger.warn("TokenRegistry", `Remote fetch failed: HTTP ${response.status} ${response.statusText}`);
        return false;
      }
      const data = await response.json();
      if (!this.isValidDefinitionsArray(data)) {
        logger.warn("TokenRegistry", "Remote data is not a valid token definitions array");
        return false;
      }
      const definitions = data;
      this.applyDefinitions(definitions);
      this.lastRefreshAt = Date.now();
      this.saveToCache(definitions);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn("TokenRegistry", `Remote refresh failed: ${message}`);
      return false;
    }
  }
  /**
   * Start periodic auto-refresh from the remote URL.
   * Does an immediate fetch, then repeats at the configured interval.
   */
  startAutoRefresh(intervalMs) {
    this.stopAutoRefresh();
    if (intervalMs !== void 0) {
      this.refreshIntervalMs = intervalMs;
    }
    this.refreshFromRemote();
    this.refreshTimer = setInterval(() => {
      this.refreshFromRemote();
    }, this.refreshIntervalMs);
  }
  /**
   * Stop periodic auto-refresh
   */
  stopAutoRefresh() {
    if (this.refreshTimer !== null) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
  /**
   * Timestamp of the last successful remote refresh (0 if never refreshed)
   */
  getLastRefreshAt() {
    return this.lastRefreshAt;
  }
  // ===========================================================================
  // Lookup Methods
  // ===========================================================================
  /**
   * Get token definition by hex coin ID
   * @param coinId - 64-character hex string
   * @returns Token definition or undefined if not found
   */
  getDefinition(coinId) {
    if (!coinId) return void 0;
    return this.definitionsById.get(coinId.toLowerCase());
  }
  /**
   * Get token definition by symbol (e.g., "UCT", "BTC")
   * @param symbol - Token symbol (case-insensitive)
   * @returns Token definition or undefined if not found
   */
  getDefinitionBySymbol(symbol) {
    if (!symbol) return void 0;
    return this.definitionsBySymbol.get(symbol.toUpperCase());
  }
  /**
   * Get token definition by name (e.g., "bitcoin", "ethereum")
   * @param name - Token name (case-insensitive)
   * @returns Token definition or undefined if not found
   */
  getDefinitionByName(name) {
    if (!name) return void 0;
    return this.definitionsByName.get(name.toLowerCase());
  }
  /**
   * Get token symbol for a coin ID
   * @param coinId - 64-character hex string
   * @returns Symbol (e.g., "UCT") or truncated ID if not found
   */
  getSymbol(coinId) {
    const def = this.getDefinition(coinId);
    if (def?.symbol) {
      return def.symbol;
    }
    return coinId.slice(0, 6).toUpperCase();
  }
  /**
   * Get token name for a coin ID
   * @param coinId - 64-character hex string
   * @returns Name (e.g., "Bitcoin") or coin ID if not found
   */
  getName(coinId) {
    const def = this.getDefinition(coinId);
    if (def?.name) {
      return def.name.charAt(0).toUpperCase() + def.name.slice(1);
    }
    return coinId;
  }
  /**
   * Get decimal places for a coin ID
   * @param coinId - 64-character hex string
   * @returns Decimals or 0 if not found
   */
  getDecimals(coinId) {
    const def = this.getDefinition(coinId);
    return def?.decimals ?? 0;
  }
  /**
   * Get icon URL for a coin ID
   * @param coinId - 64-character hex string
   * @param preferPng - Prefer PNG format over SVG
   * @returns Icon URL or null if not found
   */
  getIconUrl(coinId, preferPng = true) {
    const def = this.getDefinition(coinId);
    if (!def?.icons || def.icons.length === 0) {
      return null;
    }
    if (preferPng) {
      const pngIcon = def.icons.find((i) => i.url.toLowerCase().includes(".png"));
      if (pngIcon) return pngIcon.url;
    }
    return def.icons[0].url;
  }
  /**
   * Check if a coin ID is known in the registry
   * @param coinId - 64-character hex string
   * @returns true if the coin is in the registry
   */
  isKnown(coinId) {
    return this.definitionsById.has(coinId.toLowerCase());
  }
  /**
   * Get all token definitions
   * @returns Array of all token definitions
   */
  getAllDefinitions() {
    return Array.from(this.definitionsById.values());
  }
  /**
   * Get all fungible token definitions
   * @returns Array of fungible token definitions
   */
  getFungibleTokens() {
    return this.getAllDefinitions().filter((def) => def.assetKind === "fungible");
  }
  /**
   * Get all non-fungible token definitions
   * @returns Array of non-fungible token definitions
   */
  getNonFungibleTokens() {
    return this.getAllDefinitions().filter((def) => def.assetKind === "non-fungible");
  }
  /**
   * Get coin ID by symbol
   * @param symbol - Token symbol (e.g., "UCT")
   * @returns Coin ID hex string or undefined if not found
   */
  getCoinIdBySymbol(symbol) {
    const def = this.getDefinitionBySymbol(symbol);
    return def?.id;
  }
  /**
   * Get coin ID by name
   * @param name - Token name (e.g., "bitcoin")
   * @returns Coin ID hex string or undefined if not found
   */
  getCoinIdByName(name) {
    const def = this.getDefinitionByName(name);
    return def?.id;
  }
};

// profile/ipfs-client.ts
init_sha2();
import { CID } from "multiformats/cid";
import * as raw from "multiformats/codecs/raw";
import { create as createMultihash } from "multiformats/hashes/digest";

// profile/errors.ts
var ProfileError = class extends Error {
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

// profile/ipfs-client.ts
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
var DEFAULT_IPFS_API_URL = "https://ipfs.unicity.network";
var DEFAULT_PIN_TIMEOUT_MS = 6e4;
var DEFAULT_PIN_CONCURRENCY = 10;
var DEFAULT_MAX_SIZE_BYTES = 50 * 1024 * 1024;
var SIDECAR_SUBMIT_MAX_BYTES = 32 * 1024 * 1024;
var SIDECAR_SUBMIT_TIMEOUT_MS = 5e3;
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
var CODEC_NAMES = {
  85: "raw",
  // raw
  113: "dag-cbor",
  // dag-cbor
  112: "dag-pb"
  // dag-pb (legacy IPFS UnixFS — not produced by Profile, listed for completeness)
};
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
async function pinCarBlocksToIpfs(gateways, carBytes, expectedRootCid, timeoutMs = DEFAULT_PIN_TIMEOUT_MS, helia, concurrency = DEFAULT_PIN_CONCURRENCY) {
  const localHelia = asHelia(helia);
  const { CarReader: CarReader2 } = await import("@ipld/car");
  let reader;
  try {
    reader = await CarReader2.fromBytes(carBytes);
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
  const effectiveConcurrency = Math.max(
    1,
    Number.isFinite(concurrency) ? Math.floor(concurrency) : DEFAULT_PIN_CONCURRENCY
  );
  const workerCount = Math.min(effectiveConcurrency, blocks.length);
  let nextIndex = 0;
  let aborted = false;
  const workerErrors = [];
  const processOne = async (block) => {
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
  };
  const worker = async () => {
    while (!aborted) {
      const i = nextIndex++;
      if (i >= blocks.length) return;
      try {
        await processOne(blocks[i]);
      } catch (err) {
        aborted = true;
        throw err;
      }
    }
  };
  const workers = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push(
      worker().catch((err) => {
        workerErrors.push(err);
      })
    );
  }
  await Promise.all(workers);
  if (workerErrors.length > 0) {
    throw workerErrors[0];
  }
  return expectedRootCid;
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

// modules/payments/transfer/ipfs-publisher.ts
function createUxfCarPublisher(gateways, timeoutMs) {
  const frozenGateways = [...gateways];
  return async (carBytes) => {
    const bundleCid = await extractCarRootCid(carBytes);
    const publishedCid = await pinCarBlocksToIpfs(
      frozenGateways,
      carBytes,
      bundleCid,
      timeoutMs
    );
    return { cid: publishedCid };
  };
}

// impl/shared/resolvers.ts
function getNetworkConfig(network = "mainnet") {
  return NETWORKS[network];
}
function resolveTransportConfig(network, config) {
  const networkConfig = getNetworkConfig(network);
  let relays;
  if (config?.relays) {
    relays = config.relays;
  } else {
    relays = [...networkConfig.nostrRelays];
    if (config?.additionalRelays) {
      relays = [...relays, ...config.additionalRelays];
    }
  }
  return {
    relays,
    timeout: config?.timeout,
    autoReconnect: config?.autoReconnect,
    debug: config?.debug,
    // Browser-specific
    reconnectDelay: config?.reconnectDelay,
    maxReconnectAttempts: config?.maxReconnectAttempts
  };
}
function resolveOracleConfig(network, config) {
  const networkConfig = getNetworkConfig(network);
  return {
    url: config?.url ?? networkConfig.aggregatorUrl,
    apiKey: config?.apiKey ?? DEFAULT_AGGREGATOR_API_KEY,
    timeout: config?.timeout,
    skipVerification: config?.skipVerification,
    debug: config?.debug,
    // Node.js-specific
    trustBasePath: config?.trustBasePath
  };
}
function resolveL1Config(network, config) {
  if (config === void 0) {
    return void 0;
  }
  const networkConfig = getNetworkConfig(network);
  return {
    electrumUrl: config.electrumUrl ?? networkConfig.electrumUrl,
    defaultFeeRate: config.defaultFeeRate,
    enableVesting: config.enableVesting
  };
}
function resolvePriceConfig(config, storage) {
  if (config === void 0) {
    return void 0;
  }
  return {
    platform: config.platform ?? "coingecko",
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    cacheTtlMs: config.cacheTtlMs,
    timeout: config.timeout,
    debug: config.debug,
    storage
  };
}
function resolveArrayConfig(defaults, replace, additional) {
  if (replace) {
    return replace;
  }
  const result = [...defaults];
  if (additional) {
    return [...result, ...additional];
  }
  return result;
}
function resolveGroupChatConfig(network, config) {
  if (!config) return void 0;
  if (config === true) {
    const netConfig2 = getNetworkConfig(network);
    return { relays: [...netConfig2.groupRelays] };
  }
  if (typeof config === "object" && config.enabled === false) {
    return void 0;
  }
  const netConfig = getNetworkConfig(network);
  return {
    relays: config.relays ?? [...netConfig.groupRelays]
  };
}
function resolveMarketConfig(config) {
  if (!config) return void 0;
  if (config === true) return {};
  return { apiUrl: config.apiUrl, timeout: config.timeout };
}

// impl/browser/index.ts
if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer4;
}
function resolveIpfsSyncConfig(network, config) {
  if (!config) return void 0;
  const networkConfig = getNetworkConfig(network);
  const gateways = resolveArrayConfig(
    networkConfig.ipfsGateways,
    config.gateways,
    config.additionalGateways
  );
  return {
    enabled: config.enabled ?? false,
    gateways,
    bootstrapPeers: config.bootstrapPeers ?? config.additionalBootstrapPeers,
    useDht: config.useDht
  };
}
function resolveTokenSyncConfig(network, config) {
  if (!config) return void 0;
  const result = {};
  const ipfs = resolveIpfsSyncConfig(network, config.ipfs);
  if (ipfs) result.ipfs = ipfs;
  if (config.file) {
    result.file = {
      enabled: config.file.enabled ?? false,
      directory: config.file.directory,
      format: config.file.format
    };
  }
  if (config.cloud) {
    result.cloud = {
      enabled: config.cloud.enabled ?? false,
      provider: config.cloud.provider,
      bucket: config.cloud.bucket,
      endpoint: config.cloud.endpoint,
      apiKey: config.cloud.apiKey
    };
  }
  if (config.mongodb) {
    result.mongodb = {
      enabled: config.mongodb.enabled ?? false,
      uri: config.mongodb.uri,
      database: config.mongodb.database,
      collection: config.mongodb.collection
    };
  }
  return Object.keys(result).length > 0 ? result : void 0;
}
function createBrowserProviders(config) {
  const network = config?.network ?? "mainnet";
  if (config?.debug !== void 0) {
    logger.configure({ debug: config.debug });
  }
  if (config?.transport?.debug) logger.setTagDebug("Nostr", true);
  if (config?.oracle?.debug) logger.setTagDebug("Aggregator", true);
  if (config?.price?.debug) logger.setTagDebug("Price", true);
  const transportConfig = resolveTransportConfig(network, config?.transport);
  const oracleConfig = resolveOracleConfig(network, config?.oracle);
  const l1Config = resolveL1Config(network, config?.l1);
  const tokenSyncConfig = resolveTokenSyncConfig(network, config?.tokenSync);
  const storage = createIndexedDBStorageProvider(config?.storage);
  const priceConfig = resolvePriceConfig(config?.price, storage);
  const ipfsConfig = tokenSyncConfig?.ipfs;
  const ipfsTokenStorage = ipfsConfig?.enabled ? createBrowserIpfsStorageProvider({
    gateways: ipfsConfig.gateways,
    debug: config?.tokenSync?.ipfs?.useDht
    // reuse debug-like flag
  }) : void 0;
  const publishToIpfs = ipfsConfig?.enabled ? createUxfCarPublisher(ipfsConfig.gateways) : void 0;
  const cidFetchGateways = ipfsConfig?.enabled ? ipfsConfig.gateways : void 0;
  const groupChat = resolveGroupChatConfig(network, config?.groupChat);
  const market = resolveMarketConfig(config?.market);
  const networkConfig = getNetworkConfig(network);
  TokenRegistry.configure({ remoteUrl: networkConfig.tokenRegistryUrl, storage });
  return {
    storage,
    groupChat,
    market,
    transport: createNostrTransportProvider({
      relays: transportConfig.relays,
      timeout: transportConfig.timeout,
      autoReconnect: transportConfig.autoReconnect,
      reconnectDelay: transportConfig.reconnectDelay,
      maxReconnectAttempts: transportConfig.maxReconnectAttempts,
      debug: transportConfig.debug,
      storage
    }),
    oracle: createUnicityAggregatorProvider({
      url: oracleConfig.url,
      apiKey: oracleConfig.apiKey,
      timeout: oracleConfig.timeout,
      skipVerification: oracleConfig.skipVerification,
      debug: oracleConfig.debug,
      network
    }),
    tokenStorage: createIndexedDBTokenStorageProvider(),
    l1: l1Config,
    price: priceConfig ? createPriceProvider(priceConfig) : void 0,
    ipfsTokenStorage,
    publishToIpfs,
    cidFetchGateways,
    tokenSyncConfig
  };
}
export {
  BrowserTrustBaseLoader,
  IndexedDBStorageProvider,
  IndexedDBTokenStorageProvider,
  LocalStorageProvider,
  NostrTransportProvider,
  UnicityAggregatorProvider,
  UnicityOracleProvider,
  WebSocketReadyState,
  createBrowserProviders,
  createBrowserTrustBaseLoader,
  createBrowserWebSocket,
  createIndexedDBStorageProvider,
  createIndexedDBTokenStorageProvider,
  createLocalStorageProvider,
  createNostrTransportProvider,
  createUnicityAggregatorProvider,
  createUnicityOracleProvider,
  defaultUUIDGenerator,
  downloadFile,
  downloadJSONFile,
  downloadTextFile,
  downloadWalletJSON,
  downloadWalletJSONData,
  downloadWalletText,
  readFileAsArrayBuffer,
  readFileAsText,
  readFileAsUint8Array
};
/*! Bundled license information:

@noble/hashes/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
//# sourceMappingURL=index.js.map