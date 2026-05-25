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

// impl/browser/ipfs.ts
var ipfs_exports = {};
__export(ipfs_exports, {
  BrowserIpfsStatePersistence: () => BrowserIpfsStatePersistence,
  IpfsStorageProvider: () => IpfsStorageProvider,
  createBrowserIpfsStorageProvider: () => createBrowserIpfsStorageProvider,
  createIpfsStorageProvider: () => createIpfsStorageProvider
});
module.exports = __toCommonJS(ipfs_exports);

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
function createHasher(hashCons, info = {}) {
  const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
  const tmp = hashCons(void 0);
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = (opts) => hashCons(opts);
  Object.assign(hashC, info);
  return Object.freeze(hashC);
}
var oidNist = (suffix) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, suffix])
});

// node_modules/@noble/hashes/hmac.js
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
var hmac = (hash, key, message) => new _HMAC(hash, key).update(message).digest();
hmac.create = (hash, key) => new _HMAC(hash, key);

// node_modules/@noble/hashes/hkdf.js
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

// node_modules/@noble/hashes/_md.js
function Chi(a, b, c) {
  return a & b ^ ~a & c;
}
function Maj(a, b, c) {
  return a & b ^ a & c ^ b & c;
}
var HashMD = class {
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
var SHA256_IV = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]);

// node_modules/@noble/hashes/sha2.js
var SHA256_K = /* @__PURE__ */ Uint32Array.from([
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
var SHA256_W = /* @__PURE__ */ new Uint32Array(64);
var SHA2_32B = class extends HashMD {
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
var _SHA256 = class extends SHA2_32B {
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
var sha256 = /* @__PURE__ */ createHasher(
  () => new _SHA256(),
  /* @__PURE__ */ oidNist(1)
);

// core/crypto.ts
var bip39 = __toESM(require("bip39"), 1);
var import_crypto_js = __toESM(require("crypto-js"), 1);
var import_elliptic = __toESM(require("elliptic"), 1);

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

// core/crypto.ts
var ec = new import_elliptic.default.ec("secp256k1");
var CURVE_ORDER = BigInt(
  "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141"
);
function hexToBytes2(hex) {
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
  const walletSecret = hexToBytes2(privateKeyHex);
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

// transport/websocket.ts
var WebSocketReadyState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

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
function createBrowserWebSocket(url) {
  return new WebSocket(url);
}
function createBrowserIpfsStorageProvider(config) {
  return new IpfsStorageProvider(
    { ...config, createWebSocket: config?.createWebSocket ?? createBrowserWebSocket },
    new BrowserIpfsStatePersistence()
  );
}
var createIpfsStorageProvider = createBrowserIpfsStorageProvider;
/*! Bundled license information:

@noble/hashes/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
//# sourceMappingURL=ipfs.cjs.map