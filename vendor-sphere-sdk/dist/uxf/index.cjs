"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
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

// uxf/errors.ts
var UxfError;
var init_errors = __esm({
  "uxf/errors.ts"() {
    "use strict";
    UxfError = class extends Error {
      constructor(code, message, cause) {
        super(`[UXF:${code}] ${message}`);
        this.code = code;
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
var ELEMENT_TYPE_TOKEN_ROOT, ELEMENT_TYPE_TRANSACTION, ELEMENT_TYPE_INCLUSION_PROOF, ELEMENT_TYPE_IDS, STRATEGY_LATEST, STRATEGY_ORIGINAL;
var init_types = __esm({
  "uxf/types.ts"() {
    "use strict";
    init_errors();
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
    STRATEGY_ORIGINAL = { type: "original" };
  }
});

// node_modules/@noble/hashes/utils.js
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
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
function createHasher(hashCons, info = {}) {
  const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
  const tmp = hashCons(void 0);
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = (opts) => hashCons(opts);
  Object.assign(hashC, info);
  return Object.freeze(hashC);
}
var oidNist;
var init_utils = __esm({
  "node_modules/@noble/hashes/utils.js"() {
    "use strict";
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
var HashMD, SHA256_IV;
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
  }
});

// node_modules/@noble/hashes/sha2.js
var SHA256_K, SHA256_W, SHA2_32B, _SHA256, sha256;
var init_sha2 = __esm({
  "node_modules/@noble/hashes/sha2.js"() {
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
var init_errors2 = __esm({
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
      constructor(message, code, cause) {
        const redacted = redactCause(cause);
        super(message, redacted !== void 0 ? { cause: redacted } : void 0);
        this.name = "SphereError";
        this.code = code;
        this.context = redacted;
      }
    };
  }
});

// core/hex.ts
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

// core/bech32.ts
var init_bech32 = __esm({
  "core/bech32.ts"() {
    "use strict";
    init_errors2();
    init_hex();
  }
});

// core/crypto.ts
function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
var bip39, import_crypto_js, import_elliptic, ec, CURVE_ORDER;
var init_crypto = __esm({
  "core/crypto.ts"() {
    "use strict";
    bip39 = __toESM(require("bip39"), 1);
    import_crypto_js = __toESM(require("crypto-js"), 1);
    import_elliptic = __toESM(require("elliptic"), 1);
    init_bech32();
    init_errors2();
    ec = new import_elliptic.default.ec("secp256k1");
    CURVE_ORDER = BigInt(
      "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141"
    );
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

// uxf/hash.ts
function hexToBytes2(hex) {
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
        return hexToBytes2(h);
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
        const decoded = hexToBytes2(value);
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
    data: seg.data === null || seg.data === void 0 ? null : hexToBytes2(seg.data),
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
      result[key] = value.map((h) => hexToBytes2(h));
    } else {
      result[key] = hexToBytes2(value);
    }
  }
  return result;
}
function computeElementHash(element) {
  const header = [
    element.header.representation,
    element.header.semantics,
    element.header.kind,
    element.header.predecessor !== null ? hexToBytes2(element.header.predecessor) : null
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
  const cborBytes = (0, import_dag_cbor.encode)(canonical);
  const hashBytes = sha256(cborBytes);
  return contentHash(bytesToHex(hashBytes));
}
var import_dag_cbor, BYTE_FIELDS;
var init_hash = __esm({
  "uxf/hash.ts"() {
    "use strict";
    init_sha2();
    import_dag_cbor = require("@ipld/dag-cbor");
    init_crypto();
    init_types();
    init_errors();
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
    init_errors();
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
    init_errors();
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
function createInstanceChainIndex() {
  return /* @__PURE__ */ new Map();
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
function pruneInstanceChains(index, removedHashes) {
  if (removedHashes.size === 0) return;
  const affectedChains = /* @__PURE__ */ new Set();
  for (const hash of removedHashes) {
    const entry = index.get(hash);
    if (entry) {
      affectedChains.add(entry);
    }
    index.delete(hash);
  }
  for (const oldEntry of affectedChains) {
    const remainingLinks = oldEntry.chain.filter(
      (link) => !removedHashes.has(link.hash)
    );
    if (remainingLinks.length <= 1) {
      for (const link of remainingLinks) {
        index.delete(link.hash);
      }
      continue;
    }
    const newEntry = {
      head: remainingLinks[0].hash,
      chain: remainingLinks
    };
    for (const link of remainingLinks) {
      index.set(link.hash, newEntry);
    }
  }
}
function rebuildInstanceChainIndex(pool) {
  const index = createInstanceChainIndex();
  const successorOf = /* @__PURE__ */ new Map();
  const hasPredecessor = /* @__PURE__ */ new Set();
  for (const [hash, element] of pool.entries()) {
    if (element.header.predecessor !== null) {
      hasPredecessor.add(hash);
      const pred = element.header.predecessor;
      let successors = successorOf.get(pred);
      if (!successors) {
        successors = [];
        successorOf.set(pred, successors);
      }
      successors.push(hash);
    }
  }
  const tails = [];
  for (const [hash, element] of pool.entries()) {
    if (element.header.predecessor === null && successorOf.has(hash)) {
      tails.push(hash);
    }
  }
  for (const tailHash of tails) {
    const tailElement = pool.get(tailHash);
    if (!tailElement) continue;
    const forwardChain = [];
    const visited = /* @__PURE__ */ new Set();
    const walkBranch = (startHash, startKind, prefix) => {
      const chain = [...prefix, { hash: startHash, kind: startKind }];
      visited.add(startHash);
      let currentHash = startHash;
      while (true) {
        const succs = successorOf.get(currentHash);
        if (!succs || succs.length === 0) {
          break;
        }
        if (succs.length === 1) {
          const nextHash = succs[0];
          if (visited.has(nextHash)) break;
          const nextElement = pool.get(nextHash);
          if (!nextElement) break;
          const tailLink = chain[chain.length - 1];
          const tailLookupHash = tailLink ? tailLink.hash : tailHash;
          const tailElement2 = pool.get(tailLookupHash);
          if (!tailElement2) break;
          if (nextElement.type !== tailElement2.type) break;
          try {
            assertVersionField("semantics", nextElement.header.semantics, tailElement2.header.semantics);
            assertVersionField("representation", nextElement.header.representation, tailElement2.header.representation);
          } catch {
            break;
          }
          visited.add(nextHash);
          chain.push({ hash: nextHash, kind: nextElement.header.kind });
          currentHash = nextHash;
        } else {
          const currentElement = pool.get(currentHash);
          if (!currentElement) return;
          for (const nextHash of succs) {
            if (visited.has(nextHash)) continue;
            const nextElement = pool.get(nextHash);
            if (!nextElement) continue;
            if (nextElement.type !== currentElement.type) continue;
            try {
              assertVersionField("semantics", nextElement.header.semantics, currentElement.header.semantics);
              assertVersionField("representation", nextElement.header.representation, currentElement.header.representation);
            } catch {
              continue;
            }
            walkBranch(nextHash, nextElement.header.kind, chain);
          }
          return;
        }
      }
      const reversedChain = [...chain].reverse();
      const headHash = reversedChain[0].hash;
      const entry = {
        head: headHash,
        chain: reversedChain
      };
      for (const link of reversedChain) {
        index.set(link.hash, entry);
      }
    };
    walkBranch(tailHash, tailElement.header.kind, []);
  }
  return index;
}
var init_instance_chain = __esm({
  "uxf/instance-chain.ts"() {
    "use strict";
    init_errors();
    init_header_validation();
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
    return (0, import_dag_cbor3.decode)(reason);
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
var import_dag_cbor3;
var init_assemble = __esm({
  "uxf/assemble.ts"() {
    "use strict";
    import_dag_cbor3 = require("@ipld/dag-cbor");
    init_types();
    init_element_pool();
    init_instance_chain();
    init_hash();
    init_errors();
  }
});

// uxf/index.ts
var uxf_exports = {};
__export(uxf_exports, {
  ELEMENT_TYPE_IDS: () => ELEMENT_TYPE_IDS,
  ElementPool: () => ElementPool,
  InMemoryUxfStorage: () => InMemoryUxfStorage,
  KvUxfStorageAdapter: () => KvUxfStorageAdapter,
  STRATEGY_LATEST: () => STRATEGY_LATEST,
  STRATEGY_ORIGINAL: () => STRATEGY_ORIGINAL,
  UxfError: () => UxfError,
  UxfPackage: () => UxfPackage,
  addInstance: () => addInstance,
  applyDelta: () => applyDelta,
  assembleToken: () => assembleToken,
  assembleTokenAtState: () => assembleTokenAtState,
  assembleTokenFromRoot: () => assembleTokenFromRoot,
  carBase64ToBytes: () => carBase64ToBytes,
  carBytesToBase64: () => carBytesToBase64,
  cidToContentHash: () => cidToContentHash,
  collectGarbage: () => collectGarbage,
  computeCid: () => computeCid,
  computeElementHash: () => computeElementHash,
  consolidateProofs: () => consolidateProofs,
  contentHash: () => contentHash,
  contentHashToCid: () => contentHashToCid,
  createInstanceChainIndex: () => createInstanceChainIndex,
  decodeNostrEventContent: () => decodeNostrEventContent,
  decodeTransferPayload: () => decodeTransferPayload,
  deconstructToken: () => deconstructToken,
  diff: () => diff,
  elementToIpldBlock: () => elementToIpldBlock,
  encodeTransferPayload: () => encodeTransferPayload,
  exportToCar: () => exportToCar,
  extractCarRootCid: () => extractCarRootCid,
  hexToBytes: () => hexToBytes2,
  importFromCar: () => importFromCar,
  ingest: () => ingest,
  ingestAll: () => ingestAll,
  merge: () => mergePkg,
  mergeInstanceChains: () => mergeInstanceChains,
  packageFromJson: () => packageFromJson,
  packageToJson: () => packageToJson,
  prepareChildrenForHashing: () => prepareChildrenForHashing,
  prepareContentForHashing: () => prepareContentForHashing,
  pruneInstanceChains: () => pruneInstanceChains,
  rebuildInstanceChainIndex: () => rebuildInstanceChainIndex,
  removeToken: () => removeToken,
  resolveElement: () => resolveElement,
  selectInstance: () => selectInstance,
  verify: () => verify,
  walkReachable: () => walkReachable
});
module.exports = __toCommonJS(uxf_exports);
init_types();
init_errors();
init_hash();
init_element_pool();
init_instance_chain();

// uxf/deconstruct.ts
var import_dag_cbor2 = require("@ipld/dag-cbor");
init_errors();
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
  return (0, import_dag_cbor2.encode)(reason);
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

// uxf/index.ts
init_assemble();

// uxf/verify.ts
init_hash();
var import_dag_cbor4 = require("@ipld/dag-cbor");
init_limits();
var EXPECTED_CHILD_TYPES = {
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
var EXPECTED_ARRAY_CHILD_TYPES = {
  "token-root": {
    transactions: "transaction",
    nametags: "token-root"
  }
};
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
      const probe = (0, import_dag_cbor4.encode)({
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

// uxf/diff.ts
init_hash();
init_errors();
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

// uxf/json.ts
init_types();

// uxf/token-join.ts
init_types();
init_hash();
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
var EMPTY_VERIFIED_PROOFS = Object.freeze(
  /* @__PURE__ */ new Set()
);
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
var ENRICHED_SYNTHETIC_KIND = "enriched-synthetic";

// uxf/json.ts
init_errors();
init_hash();
init_hex();
init_header_validation();
init_limits();
var TYPE_ID_TO_TAG = new Map(
  Object.entries(ELEMENT_TYPE_IDS).map(
    ([tag, id]) => [id, tag]
  )
);
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
  let raw;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      `Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`
    );
  }
  if (typeof raw !== "object" || raw === null) {
    throw new UxfError("SERIALIZATION_ERROR", "JSON root must be an object");
  }
  if (raw.uxf !== "1.0.0") {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      `Unsupported uxf version: ${typeof raw.uxf === "string" ? `"${raw.uxf}"` : String(raw.uxf)}`
    );
  }
  const meta = raw.metadata;
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
  if (typeof raw.manifest !== "object" || raw.manifest === null) {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      'Missing or invalid "manifest" field'
    );
  }
  const manifestEntries = Object.entries(raw.manifest);
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
  if (typeof raw.elements !== "object" || raw.elements === null) {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      'Missing or invalid "elements" field'
    );
  }
  const pool = /* @__PURE__ */ new Map();
  const elementEntries = Object.entries(raw.elements);
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
  if (raw.instanceChainIndex && typeof raw.instanceChainIndex === "object") {
    for (const [, entryJson] of Object.entries(raw.instanceChainIndex)) {
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
  if (raw.indexes && typeof raw.indexes === "object") {
    indexes = deserializeIndexes(raw.indexes);
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
var HEX_PATTERN = /^[0-9a-fA-F]{64,}$/;
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
var hexStringToUint8Array = hexToBytesAllowEmpty;
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

// uxf/ipld.ts
var import_dag_cbor5 = require("@ipld/dag-cbor");
var import_multiformats = require("multiformats");
init_sha2();
var import_writer = require("@ipld/car/writer");
var import_car = require("@ipld/car");
init_types();
init_errors();
init_header_validation();
init_hash();
init_limits();
var DAG_CBOR_CODE = 113;
var TYPE_ID_TO_TAG2 = new Map(
  Object.entries(ELEMENT_TYPE_IDS).map(
    ([tag, id]) => [id, tag]
  )
);
function contentHashToCid(hash) {
  const digestBytes = hexToBytes2(hash);
  const digest = createSha256Digest(digestBytes);
  return import_multiformats.CID.createV1(DAG_CBOR_CODE, digest);
}
function cidToContentHash(cid) {
  if (cid.multihash.code !== 18) {
    throw new UxfError(
      "SERIALIZATION_ERROR",
      `Expected sha2-256 (0x12) multihash, got 0x${cid.multihash.code.toString(16)}`
    );
  }
  return contentHash(bytesToHex2(cid.multihash.digest));
}
function computeCid(element) {
  const canonical = buildCanonicalForm(element);
  const cborBytes = (0, import_dag_cbor5.encode)(canonical);
  const hashBytes = sha256Sync(cborBytes);
  const digest = createSha256Digest(hashBytes);
  return import_multiformats.CID.createV1(DAG_CBOR_CODE, digest);
}
function elementToIpldBlock(element) {
  const canonical = buildCanonicalForm(element);
  const bytes = (0, import_dag_cbor5.encode)(canonical);
  const hashBytes = sha256Sync(bytes);
  const digest = createSha256Digest(hashBytes);
  const cid = import_multiformats.CID.createV1(DAG_CBOR_CODE, digest);
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
  const manifestBytes = (0, import_dag_cbor5.encode)(manifestNode);
  const manifestHashBytes = sha256Sync(manifestBytes);
  const manifestDigest = createSha256Digest(manifestHashBytes);
  const manifestCid = import_multiformats.CID.createV1(DAG_CBOR_CODE, manifestDigest);
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
  const envelopeBytes = (0, import_dag_cbor5.encode)(envelopeNode);
  const envelopeHashBytes = sha256Sync(envelopeBytes);
  const envelopeDigest = createSha256Digest(envelopeHashBytes);
  const envelopeCid = import_multiformats.CID.createV1(DAG_CBOR_CODE, envelopeDigest);
  const { writer, out } = import_writer.CarWriter.create([envelopeCid]);
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
  const reader = await import_car.CarReader.fromBytes(car);
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
  const envelopeNode = (0, import_dag_cbor5.decode)(envelopeBlock.bytes);
  const manifestCid = envelopeNode.manifest;
  if (!(manifestCid instanceof import_multiformats.CID)) {
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
  const manifestNode = (0, import_dag_cbor5.decode)(manifestBlock.bytes);
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
    if (!(cid instanceof import_multiformats.CID)) {
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
    const node = (0, import_dag_cbor5.decode)(block.bytes);
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
    element.header.predecessor !== null ? hexToBytes2(element.header.predecessor) : null
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
    predecessorHash = contentHash(bytesToHex2(predecessor));
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
        result[key] = bytesToHex2(value);
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
        data: s.data instanceof Uint8Array ? bytesToHex2(s.data) : s.data,
        path: pathStr
      };
    });
  }
  if (type === "transaction-data" && key === "nametagRefs") {
    return value.map(
      (item) => item instanceof Uint8Array ? bytesToHex2(item) : item
    );
  }
  return value.map((item) => {
    if (item instanceof Uint8Array) {
      return bytesToHex2(item);
    }
    if (Array.isArray(item)) {
      return item.map(
        (sub) => sub instanceof Uint8Array ? bytesToHex2(sub) : sub
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
    } else if (value instanceof import_multiformats.CID) {
      result[key] = cidToContentHash(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item, index) => {
        if (item instanceof Uint8Array) {
          return decodeChildBytes(item, `${key}[${index}]`);
        }
        if (item instanceof import_multiformats.CID) {
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
  return contentHash(bytesToHex2(bytes));
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
  const code = 18;
  const size = hash.length;
  const bytes = new Uint8Array(2 + size);
  bytes[0] = code;
  bytes[1] = size;
  bytes.set(hash, 2);
  return { code, size, digest: hash, bytes };
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
function bytesToHex2(bytes) {
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

// uxf/UxfPackage.ts
init_types();
init_errors();
init_hash();
init_element_pool();
init_instance_chain();
init_assemble();

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
  return redactValue2(input, 0, seen);
}
function redactValue2(value, depth, seen) {
  if (value == null) return value;
  if (depth >= REDACT_MAX_DEPTH) return REDACT_TRUNCATED;
  if (Array.isArray(value)) {
    if (seen.has(value)) return REDACT_TRUNCATED;
    seen.add(value);
    return value.map((el) => redactValue2(el, depth + 1, seen));
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
        out[k] = redactValue2(v, depth + 1, seen);
      }
    }
    return out;
  }
  return value;
}
function redactArgs(args) {
  if (args.length === 0) return args;
  const seen = /* @__PURE__ */ new WeakSet();
  return args.map((a) => redactValue2(a, 0, seen));
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

// uxf/UxfPackage.ts
var UxfPackage = class _UxfPackage {
  data;
  constructor(data) {
    this.data = data;
  }
  // ---------- Static Factories ----------
  /**
   * Create a new empty package.
   */
  static create(options) {
    const now2 = Math.floor(Date.now() / 1e3);
    const envelope = {
      version: "1.0.0",
      createdAt: now2,
      updatedAt: now2,
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
var WRAP_POOL_MAX_SIZE = 1e6;
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

// uxf/storage-adapters.ts
var InMemoryUxfStorage = class {
  data = null;
  async save(pkg) {
    this.data = packageToJson(pkg);
  }
  async load() {
    if (this.data === null) {
      return null;
    }
    return packageFromJson(this.data);
  }
  async clear() {
    this.data = null;
  }
};
var KvUxfStorageAdapter = class {
  constructor(storage, key = "uxf_package") {
    this.storage = storage;
    this.key = key;
  }
  async save(pkg) {
    await this.storage.set(this.key, packageToJson(pkg));
  }
  async load() {
    const json = await this.storage.get(this.key);
    return json ? packageFromJson(json) : null;
  }
  async clear() {
    await this.storage.remove(this.key);
  }
};

// uxf/transfer-payload.ts
var import_car2 = require("@ipld/car");
var import_decoder = require("@ipld/car/decoder");
var import_buffer = require("buffer");
init_errors2();

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
init_limits();
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
function decodeNostrEventContent(eventContent) {
  return decodeTransferPayload(eventContent);
}
async function extractCarRootCid(carBytes) {
  let roots;
  let fastPathError;
  if (carBytes.byteLength > EXTRACT_CAR_ROOT_HEADER_PROBE_BYTES) {
    const probe = carBytes.subarray(0, EXTRACT_CAR_ROOT_HEADER_PROBE_BYTES);
    try {
      const reader = (0, import_decoder.bytesReader)(probe);
      const header = await (0, import_decoder.readHeader)(reader);
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
      reader = await import_car2.CarReader.fromBytes(carBytes);
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
function carBytesToBase64(carBytes) {
  return import_buffer.Buffer.from(carBytes.buffer, carBytes.byteOffset, carBytes.byteLength).toString("base64");
}
function carBase64ToBytes(carBase64) {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(carBase64)) {
    throw new SphereError(
      "carBase64ToBytes: input is not valid base64",
      "BUNDLE_REJECTED_MALFORMED_ENVELOPE"
    );
  }
  const buf = import_buffer.Buffer.from(carBase64, "base64");
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}
/*! Bundled license information:

@noble/hashes/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
//# sourceMappingURL=index.cjs.map