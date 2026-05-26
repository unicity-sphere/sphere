// l1/types.ts
function parsePathComponents(path) {
  const match = path.match(/m\/\d+'\/\d+'\/\d+'\/(\d+)\/(\d+)/);
  if (!match) return null;
  return { chain: parseInt(match[1], 10), index: parseInt(match[2], 10) };
}
function isChangePath(path) {
  const parsed = parsePathComponents(path);
  return parsed?.chain === 1;
}
function getIndexFromPath(path) {
  const parsed = parsePathComponents(path);
  return parsed?.index ?? 0;
}
function pathToDOMId(path) {
  return path.replace(/'/g, "h").replace(/\//g, "-");
}
function domIdToPath(encoded) {
  const parts = encoded.split("-");
  return parts.map((part, idx) => {
    if (idx === 0) return part;
    return part.endsWith("h") ? `${part.slice(0, -1)}'` : part;
  }).join("/");
}

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

// core/bech32.ts
var CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
var GENERATOR = [996825010, 642813549, 513874426, 1027748829, 705979059];
function convertBits(data, fromBits, toBits, pad2) {
  let acc = 0;
  let bits = 0;
  const ret = [];
  const maxv = (1 << toBits) - 1;
  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    if (value < 0 || value >> fromBits !== 0) return null;
    acc = acc << fromBits | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push(acc >> bits & maxv);
    }
  }
  if (pad2) {
    if (bits > 0) {
      ret.push(acc << toBits - bits & maxv);
    }
  } else if (bits >= fromBits || acc << toBits - bits & maxv) {
    return null;
  }
  return ret;
}
function hrpExpand(hrp) {
  const ret = [];
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) >> 5);
  ret.push(0);
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) & 31);
  return ret;
}
function bech32Polymod(values) {
  let chk = 1;
  for (let p = 0; p < values.length; p++) {
    const top = chk >> 25;
    chk = (chk & 33554431) << 5 ^ values[p];
    for (let i = 0; i < 5; i++) {
      if (top >> i & 1) chk ^= GENERATOR[i];
    }
  }
  return chk;
}
function bech32Checksum(hrp, data) {
  const values = hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const mod = bech32Polymod(values) ^ 1;
  const ret = [];
  for (let p = 0; p < 6; p++) {
    ret.push(mod >> 5 * (5 - p) & 31);
  }
  return ret;
}
function encodeBech32(hrp, version, program) {
  if (version < 0 || version > 16) {
    throw new SphereError("Invalid witness version", "VALIDATION_ERROR");
  }
  const converted = convertBits(Array.from(program), 8, 5, true);
  if (!converted) {
    throw new SphereError("Failed to convert bits", "VALIDATION_ERROR");
  }
  const data = [version].concat(converted);
  const checksum = bech32Checksum(hrp, data);
  const combined = data.concat(checksum);
  let out = hrp + "1";
  for (let i = 0; i < combined.length; i++) {
    out += CHARSET[combined[i]];
  }
  return out;
}
function decodeBech32(addr) {
  addr = addr.toLowerCase();
  const pos = addr.lastIndexOf("1");
  if (pos < 1) return null;
  const hrp = addr.substring(0, pos);
  const dataStr = addr.substring(pos + 1);
  const data = [];
  for (let i = 0; i < dataStr.length; i++) {
    const val = CHARSET.indexOf(dataStr[i]);
    if (val === -1) return null;
    data.push(val);
  }
  const checksum = bech32Checksum(hrp, data.slice(0, -6));
  for (let i = 0; i < 6; i++) {
    if (checksum[i] !== data[data.length - 6 + i]) {
      return null;
    }
  }
  const version = data[0];
  const program = convertBits(data.slice(1, -6), 5, 8, false);
  if (!program) return null;
  return {
    hrp,
    witnessVersion: version,
    data: Uint8Array.from(program)
  };
}
var createBech32 = encodeBech32;

// l1/addressToScriptHash.ts
import CryptoJS from "crypto-js";
function bytesToHex(buf) {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function addressToScriptHash(address) {
  const decoded = decodeBech32(address);
  if (!decoded) throw new SphereError("Invalid bech32 address: " + address, "VALIDATION_ERROR");
  const scriptHex = "0014" + bytesToHex(decoded.data);
  const sha = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(scriptHex)).toString();
  return sha.match(/../g).reverse().join("");
}

// core/crypto.ts
import * as bip39 from "bip39";
import CryptoJS2 from "crypto-js";
import elliptic from "elliptic";
var ec = new elliptic.ec("secp256k1");
var CURVE_ORDER = BigInt(
  "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141"
);
function generateMasterKey(seedHex) {
  const I = CryptoJS2.HmacSHA512(
    CryptoJS2.enc.Hex.parse(seedHex),
    CryptoJS2.enc.Utf8.parse("Bitcoin seed")
  ).toString();
  const IL = I.substring(0, 64);
  const IR = I.substring(64);
  const masterKeyBigInt = BigInt("0x" + IL);
  if (masterKeyBigInt === 0n || masterKeyBigInt >= CURVE_ORDER) {
    throw new SphereError("Invalid master key generated", "VALIDATION_ERROR");
  }
  return {
    privateKey: IL,
    chainCode: IR
  };
}
function deriveChildKey(parentPrivKey, parentChainCode, index) {
  const isHardened = index >= 2147483648;
  let data;
  if (isHardened) {
    const indexHex = index.toString(16).padStart(8, "0");
    data = "00" + parentPrivKey + indexHex;
  } else {
    const keyPair = ec.keyFromPrivate(parentPrivKey, "hex");
    const compressedPubKey = keyPair.getPublic(true, "hex");
    const indexHex = index.toString(16).padStart(8, "0");
    data = compressedPubKey + indexHex;
  }
  const I = CryptoJS2.HmacSHA512(
    CryptoJS2.enc.Hex.parse(data),
    CryptoJS2.enc.Hex.parse(parentChainCode)
  ).toString();
  const IL = I.substring(0, 64);
  const IR = I.substring(64);
  const ilBigInt = BigInt("0x" + IL);
  const parentKeyBigInt = BigInt("0x" + parentPrivKey);
  if (ilBigInt >= CURVE_ORDER) {
    throw new SphereError("Invalid key: IL >= curve order", "VALIDATION_ERROR");
  }
  const childKeyBigInt = (ilBigInt + parentKeyBigInt) % CURVE_ORDER;
  if (childKeyBigInt === 0n) {
    throw new SphereError("Invalid key: child key is zero", "VALIDATION_ERROR");
  }
  const childPrivKey = childKeyBigInt.toString(16).padStart(64, "0");
  return {
    privateKey: childPrivKey,
    chainCode: IR
  };
}
function deriveKeyAtPath(masterPrivKey, masterChainCode, path) {
  const pathParts = path.replace("m/", "").split("/");
  let currentKey = masterPrivKey;
  let currentChainCode = masterChainCode;
  for (const part of pathParts) {
    const isHardened = part.endsWith("'") || part.endsWith("h");
    const indexStr = part.replace(/['h]$/, "");
    let index = parseInt(indexStr, 10);
    if (isHardened) {
      index += 2147483648;
    }
    const derived = deriveChildKey(currentKey, currentChainCode, index);
    currentKey = derived.privateKey;
    currentChainCode = derived.chainCode;
  }
  return {
    privateKey: currentKey,
    chainCode: currentChainCode
  };
}
function getPublicKey(privateKey, compressed = true) {
  const keyPair = ec.keyFromPrivate(privateKey, "hex");
  return keyPair.getPublic(compressed, "hex");
}
function sha256(data, inputEncoding = "hex") {
  const parsed = inputEncoding === "hex" ? CryptoJS2.enc.Hex.parse(data) : CryptoJS2.enc.Utf8.parse(data);
  return CryptoJS2.SHA256(parsed).toString();
}
function ripemd160(data, inputEncoding = "hex") {
  const parsed = inputEncoding === "hex" ? CryptoJS2.enc.Hex.parse(data) : CryptoJS2.enc.Utf8.parse(data);
  return CryptoJS2.RIPEMD160(parsed).toString();
}
function hash160(data) {
  const sha = sha256(data, "hex");
  return ripemd160(sha, "hex");
}
var computeHash160 = hash160;
function hash160ToBytes(hash160Hex) {
  if (typeof hash160Hex !== "string") {
    throw new TypeError(`hash160ToBytes: expected string, got ${typeof hash160Hex}`);
  }
  if (hash160Hex.length === 0) return new Uint8Array(0);
  if (hash160Hex.length % 2 !== 0) {
    throw new RangeError(`hash160ToBytes: odd-length hex string (${hash160Hex.length} chars)`);
  }
  if (!/^[0-9a-fA-F]+$/.test(hash160Hex)) {
    throw new RangeError("hash160ToBytes: contains non-hex characters");
  }
  const matches = hash160Hex.match(/../g);
  if (!matches) return new Uint8Array(0);
  return Uint8Array.from(matches.map((x) => parseInt(x, 16)));
}
function publicKeyToAddress(publicKey, prefix = "alpha", witnessVersion = 0) {
  const pubKeyHash = hash160(publicKey);
  const programBytes = hash160ToBytes(pubKeyHash);
  return encodeBech32(prefix, witnessVersion, programBytes);
}
function privateKeyToAddressInfo(privateKey, prefix = "alpha") {
  const publicKey = getPublicKey(privateKey);
  const address = publicKeyToAddress(publicKey, prefix);
  return { address, publicKey };
}
function generateAddressInfo(privateKey, index, path, prefix = "alpha") {
  const { address, publicKey } = privateKeyToAddressInfo(privateKey, prefix);
  return {
    privateKey,
    publicKey,
    address,
    path,
    index
  };
}

// l1/crypto.ts
import CryptoJS3 from "crypto-js";
var SALT = "alpha_wallet_salt";
var PBKDF2_ITERATIONS = 1e5;
function encrypt(text, password) {
  return CryptoJS3.AES.encrypt(text, password).toString();
}
function decrypt(encrypted, password) {
  const bytes = CryptoJS3.AES.decrypt(encrypted, password);
  return bytes.toString(CryptoJS3.enc.Utf8);
}
function generatePrivateKey() {
  return CryptoJS3.lib.WordArray.random(32).toString();
}
function encryptWallet(masterPrivateKey, password) {
  const passwordKey = CryptoJS3.PBKDF2(password, SALT, {
    keySize: 256 / 32,
    iterations: PBKDF2_ITERATIONS
  }).toString();
  const encrypted = CryptoJS3.AES.encrypt(
    masterPrivateKey,
    passwordKey
  ).toString();
  return encrypted;
}
function decryptWallet(encryptedData, password) {
  const passwordKey = CryptoJS3.PBKDF2(password, SALT, {
    keySize: 256 / 32,
    iterations: PBKDF2_ITERATIONS
  }).toString();
  const decrypted = CryptoJS3.AES.decrypt(encryptedData, passwordKey);
  return decrypted.toString(CryptoJS3.enc.Utf8);
}
function hexToWIF(hexKey) {
  const versionByte = "80";
  const extendedKey = versionByte + hexKey;
  const hash1 = CryptoJS3.SHA256(CryptoJS3.enc.Hex.parse(extendedKey)).toString();
  const hash2 = CryptoJS3.SHA256(CryptoJS3.enc.Hex.parse(hash1)).toString();
  const checksum = hash2.substring(0, 8);
  const finalHex = extendedKey + checksum;
  return base58Encode(finalHex);
}
function base58Encode(hex) {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let num = BigInt("0x" + hex);
  let encoded = "";
  while (num > 0n) {
    const remainder = Number(num % 58n);
    num = num / 58n;
    encoded = ALPHABET[remainder] + encoded;
  }
  for (let i = 0; i < hex.length && hex.substring(i, i + 2) === "00"; i += 2) {
    encoded = "1" + encoded;
  }
  return encoded;
}

// l1/address.ts
import CryptoJS4 from "crypto-js";
var deriveChildKeyBIP32 = deriveChildKey;
var deriveKeyAtPath2 = deriveKeyAtPath;
function generateMasterKeyFromSeed(seedHex) {
  const result = generateMasterKey(seedHex);
  return {
    masterPrivateKey: result.privateKey,
    masterChainCode: result.chainCode
  };
}
function generateHDAddressBIP32(masterPriv, chainCode, index, basePath = "m/44'/0'/0'", isChange = false) {
  const chain = isChange ? 1 : 0;
  const fullPath = `${basePath}/${chain}/${index}`;
  const derived = deriveKeyAtPath(masterPriv, chainCode, fullPath);
  return generateAddressInfo(derived.privateKey, index, fullPath);
}
function generateAddressFromMasterKey(masterPrivateKey, index) {
  const derivationPath = `m/44'/0'/${index}'`;
  const hmacInput = CryptoJS4.enc.Hex.parse(masterPrivateKey);
  const hmacKey = CryptoJS4.enc.Utf8.parse(derivationPath);
  const hmacOutput = CryptoJS4.HmacSHA512(hmacInput, hmacKey).toString();
  const childPrivateKey = hmacOutput.substring(0, 64);
  return generateAddressInfo(childPrivateKey, index, derivationPath);
}
function deriveChildKey2(masterPriv, chainCode, index) {
  const data = masterPriv + index.toString(16).padStart(8, "0");
  const I = CryptoJS4.HmacSHA512(
    CryptoJS4.enc.Hex.parse(data),
    CryptoJS4.enc.Hex.parse(chainCode)
  ).toString();
  return {
    privateKey: I.substring(0, 64),
    nextChainCode: I.substring(64)
  };
}
function generateHDAddress(masterPriv, chainCode, index) {
  const child = deriveChildKey2(masterPriv, chainCode, index);
  const path = `m/44'/0'/0'/${index}`;
  return generateAddressInfo(child.privateKey, index, path);
}

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
var DEFAULT_ELECTRUM_URL = "wss://fulcrum.unicity.network:50004";

// l1/network.ts
var DEFAULT_ENDPOINT = DEFAULT_ELECTRUM_URL;
var ws = null;
var isConnected = false;
var isConnecting = false;
var requestId = 0;
var reconnectAttempts = 0;
var isBlockSubscribed = false;
var lastBlockHeader = null;
var pingTimer = null;
var reconnectTimer = null;
var connectionEpoch = 0;
var pending = {};
var blockSubscribers = [];
var connectionCallbacks = [];
var MAX_RECONNECT_ATTEMPTS = 10;
var BASE_DELAY = 2e3;
var MAX_DELAY = 6e4;
var RPC_TIMEOUT = 3e4;
var CONNECTION_TIMEOUT = 3e4;
var PING_INTERVAL = 3e4;
function isWebSocketConnected() {
  return isConnected && ws !== null && ws.readyState === WebSocket.OPEN;
}
function waitForConnection() {
  if (isWebSocketConnected()) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const callback = {
      resolve: () => {
        if (callback.timeoutId) clearTimeout(callback.timeoutId);
        resolve();
      },
      reject: (err) => {
        if (callback.timeoutId) clearTimeout(callback.timeoutId);
        reject(err);
      }
    };
    callback.timeoutId = setTimeout(() => {
      const idx = connectionCallbacks.indexOf(callback);
      if (idx > -1) connectionCallbacks.splice(idx, 1);
      reject(new Error("Connection timeout"));
    }, CONNECTION_TIMEOUT);
    connectionCallbacks.push(callback);
  });
}
function startPingTimer() {
  stopPingTimer();
  pingTimer = setInterval(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      const id = ++requestId;
      ws.send(JSON.stringify({ jsonrpc: "2.0", id, method: "server.ping", params: [] }));
      pending[id] = {
        resolve: () => {
        },
        reject: () => {
        }
      };
      const timeoutId = setTimeout(() => {
        delete pending[id];
      }, 1e4);
      pending[id].timeoutId = timeoutId;
    } catch {
    }
  }, PING_INTERVAL);
}
function stopPingTimer() {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}
function connect(endpoint = DEFAULT_ENDPOINT) {
  if (isConnected) {
    return Promise.resolve();
  }
  if (isConnecting) {
    return waitForConnection();
  }
  isConnecting = true;
  if (ws) {
    try {
      ws.onopen = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      ws.close();
    } catch {
    }
    ws = null;
  }
  const epoch = ++connectionEpoch;
  return new Promise((resolve, reject) => {
    let hasResolved = false;
    try {
      ws = new WebSocket(endpoint);
    } catch (err) {
      logger.error("L1", "WebSocket constructor threw exception:", err);
      isConnecting = false;
      reject(err);
      return;
    }
    ws.onopen = () => {
      if (epoch !== connectionEpoch) return;
      isConnected = true;
      isConnecting = false;
      reconnectAttempts = 0;
      startPingTimer();
      hasResolved = true;
      resolve();
      connectionCallbacks.forEach((cb) => {
        if (cb.timeoutId) clearTimeout(cb.timeoutId);
        cb.resolve();
      });
      connectionCallbacks.length = 0;
    };
    ws.onclose = () => {
      if (epoch !== connectionEpoch) return;
      isConnected = false;
      isBlockSubscribed = false;
      stopPingTimer();
      Object.values(pending).forEach((req) => {
        if (req.timeoutId) clearTimeout(req.timeoutId);
        req.reject(new Error("WebSocket connection closed"));
      });
      Object.keys(pending).forEach((key) => delete pending[Number(key)]);
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        logger.error("L1", "Max reconnect attempts reached. Giving up.");
        isConnecting = false;
        const error = new Error("Max reconnect attempts reached");
        connectionCallbacks.forEach((cb) => {
          if (cb.timeoutId) clearTimeout(cb.timeoutId);
          cb.reject(error);
        });
        connectionCallbacks.length = 0;
        if (!hasResolved) {
          hasResolved = true;
          reject(error);
        }
        return;
      }
      const delay = Math.min(BASE_DELAY * Math.pow(2, reconnectAttempts), MAX_DELAY);
      reconnectAttempts++;
      logger.warn(
        "L1",
        `WebSocket closed unexpectedly. Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`
      );
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect(endpoint).then(() => {
          if (!hasResolved) {
            hasResolved = true;
            resolve();
          }
        }).catch((err) => {
          if (!hasResolved) {
            hasResolved = true;
            reject(err);
          }
        });
      }, delay);
    };
    ws.onerror = (err) => {
      logger.error("L1", "WebSocket error:", err);
    };
    ws.onmessage = (msg) => handleMessage(msg);
  });
}
function handleMessage(event) {
  const data = JSON.parse(event.data);
  if (data.id && pending[data.id]) {
    const request = pending[data.id];
    delete pending[data.id];
    if (data.error) {
      request.reject(data.error);
    } else {
      request.resolve(data.result);
    }
  }
  if (data.method === "blockchain.headers.subscribe") {
    const header = data.params[0];
    lastBlockHeader = header;
    blockSubscribers.forEach((cb) => cb(header));
  }
}
async function rpc(method, params = []) {
  if (!isConnected && !isConnecting) {
    await connect();
  }
  if (!isWebSocketConnected()) {
    await waitForConnection();
  }
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return reject(new Error("WebSocket not connected (OPEN)"));
    }
    const id = ++requestId;
    const timeoutId = setTimeout(() => {
      if (pending[id]) {
        delete pending[id];
        reject(new Error(`RPC timeout: ${method}`));
      }
    }, RPC_TIMEOUT);
    pending[id] = {
      resolve: (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      reject: (err) => {
        clearTimeout(timeoutId);
        reject(err);
      },
      timeoutId
    };
    ws.send(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
  });
}
async function getUtxo(address) {
  const scripthash = addressToScriptHash(address);
  const result = await rpc("blockchain.scripthash.listunspent", [scripthash]);
  if (!Array.isArray(result)) {
    logger.warn("L1", "listunspent returned non-array:", result);
    return [];
  }
  return result.map((u) => ({
    tx_hash: u.tx_hash,
    tx_pos: u.tx_pos,
    value: u.value,
    height: u.height,
    address
  }));
}
async function getBalance(address) {
  const scriptHash = addressToScriptHash(address);
  const result = await rpc("blockchain.scripthash.get_balance", [scriptHash]);
  const confirmed = result.confirmed || 0;
  const unconfirmed = result.unconfirmed || 0;
  const totalSats = confirmed + unconfirmed;
  const alpha = totalSats / 1e8;
  return alpha;
}
async function broadcast(rawHex) {
  return await rpc("blockchain.transaction.broadcast", [rawHex]);
}
async function subscribeBlocks(cb) {
  if (!isConnected && !isConnecting) {
    await connect();
  }
  if (!isWebSocketConnected()) {
    await waitForConnection();
  }
  blockSubscribers.push(cb);
  if (!isBlockSubscribed) {
    isBlockSubscribed = true;
    const header = await rpc("blockchain.headers.subscribe", []);
    if (header) {
      lastBlockHeader = header;
      blockSubscribers.forEach((subscriber) => subscriber(header));
    }
  } else if (lastBlockHeader) {
    cb(lastBlockHeader);
  }
  return () => {
    const index = blockSubscribers.indexOf(cb);
    if (index > -1) {
      blockSubscribers.splice(index, 1);
    }
  };
}
async function getTransactionHistory(address) {
  const scriptHash = addressToScriptHash(address);
  const result = await rpc("blockchain.scripthash.get_history", [scriptHash]);
  if (!Array.isArray(result)) {
    logger.warn("L1", "get_history returned non-array:", result);
    return [];
  }
  return result;
}
async function getTransaction(txid) {
  return await rpc("blockchain.transaction.get", [txid, true]);
}
async function getBlockHeader(height) {
  return await rpc("blockchain.block.header", [height, height]);
}
async function getCurrentBlockHeight() {
  try {
    const header = await rpc("blockchain.headers.subscribe", []);
    return header?.height || 0;
  } catch (err) {
    logger.error("L1", "Error getting current block height:", err);
    return 0;
  }
}
function disconnect() {
  stopPingTimer();
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  connectionEpoch++;
  if (ws) {
    ws.onopen = null;
    ws.onclose = null;
    ws.onerror = null;
    ws.onmessage = null;
    ws.close();
    ws = null;
  }
  isConnected = false;
  isConnecting = false;
  reconnectAttempts = 0;
  isBlockSubscribed = false;
  const disconnectError = new Error("WebSocket disconnected");
  Object.values(pending).forEach((req) => {
    if (req.timeoutId) clearTimeout(req.timeoutId);
    req.reject(disconnectError);
  });
  Object.keys(pending).forEach((key) => delete pending[Number(key)]);
  connectionCallbacks.forEach((cb) => {
    if (cb.timeoutId) clearTimeout(cb.timeoutId);
    cb.reject(disconnectError);
  });
  connectionCallbacks.length = 0;
  blockSubscribers.length = 0;
  lastBlockHeader = null;
}

// l1/tx.ts
import CryptoJS5 from "crypto-js";
import elliptic2 from "elliptic";

// l1/vesting.ts
var VESTING_THRESHOLD = 28e4;
var currentBlockHeight = null;
var VestingClassifier = class {
  memoryCache = /* @__PURE__ */ new Map();
  dbName = "SphereVestingCacheV5";
  // V5 - new cache with proper null handling
  storeName = "vestingCache";
  db = null;
  /**
   * Initialize IndexedDB for persistent caching.
   * In Node.js (no IndexedDB), silently falls back to memory-only caching.
   */
  async initDB() {
    if (typeof indexedDB === "undefined") {
      return;
    }
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "txHash" });
        }
      };
      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.db.onversionchange = () => {
          if (this.db) {
            this.db.close();
            this.db = null;
          }
        };
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }
  /**
   * Check if transaction is coinbase
   */
  isCoinbaseTransaction(txData) {
    if (txData.vin && txData.vin.length === 1) {
      const vin = txData.vin[0];
      if (vin.coinbase || !vin.txid && vin.coinbase !== void 0) {
        return true;
      }
      if (vin.txid === "0000000000000000000000000000000000000000000000000000000000000000") {
        return true;
      }
    }
    return false;
  }
  /**
   * Load from IndexedDB cache
   */
  async loadFromDB(txHash) {
    if (!this.db) return null;
    return new Promise((resolve) => {
      const tx = this.db.transaction(this.storeName, "readonly");
      const store = tx.objectStore(this.storeName);
      const request = store.get(txHash);
      request.onsuccess = () => {
        if (request.result) {
          resolve({
            blockHeight: request.result.blockHeight,
            isCoinbase: request.result.isCoinbase,
            inputTxId: request.result.inputTxId
          });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  }
  /**
   * Save to IndexedDB cache
   */
  async saveToDB(txHash, entry) {
    if (!this.db) return;
    return new Promise((resolve) => {
      const tx = this.db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      store.put({ txHash, ...entry });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }
  /**
   * Trace a transaction to its coinbase origin
   * Alpha blockchain has single-input transactions, making this a linear trace
   */
  async traceToOrigin(txHash) {
    let currentTxHash = txHash;
    let iterations = 0;
    const MAX_ITERATIONS = 1e4;
    while (iterations < MAX_ITERATIONS) {
      iterations++;
      const cached = this.memoryCache.get(currentTxHash);
      if (cached) {
        if (cached.isCoinbase) {
          if (cached.blockHeight !== null && cached.blockHeight !== void 0) {
            return { coinbaseHeight: cached.blockHeight };
          }
        } else if (cached.inputTxId) {
          currentTxHash = cached.inputTxId;
          continue;
        }
      }
      const dbCached = await this.loadFromDB(currentTxHash);
      if (dbCached) {
        this.memoryCache.set(currentTxHash, dbCached);
        if (dbCached.isCoinbase) {
          if (dbCached.blockHeight !== null && dbCached.blockHeight !== void 0) {
            return { coinbaseHeight: dbCached.blockHeight };
          }
        } else if (dbCached.inputTxId) {
          currentTxHash = dbCached.inputTxId;
          continue;
        }
      }
      const txData = await getTransaction(currentTxHash);
      if (!txData || !txData.txid) {
        return { coinbaseHeight: null, error: `Failed to fetch tx ${currentTxHash}` };
      }
      const isCoinbase = this.isCoinbaseTransaction(txData);
      let blockHeight = null;
      if (txData.confirmations && currentBlockHeight !== null && currentBlockHeight !== void 0) {
        blockHeight = currentBlockHeight - txData.confirmations + 1;
      }
      let inputTxId = null;
      if (!isCoinbase && txData.vin && txData.vin.length > 0 && txData.vin[0].txid) {
        inputTxId = txData.vin[0].txid;
      }
      const cacheEntry = {
        blockHeight,
        // Can be null if confirmations not available
        isCoinbase,
        inputTxId
      };
      this.memoryCache.set(currentTxHash, cacheEntry);
      await this.saveToDB(currentTxHash, cacheEntry);
      if (isCoinbase) {
        return { coinbaseHeight: blockHeight };
      }
      if (!inputTxId) {
        return { coinbaseHeight: null, error: "Could not find input transaction" };
      }
      currentTxHash = inputTxId;
    }
    return { coinbaseHeight: null, error: "Max iterations exceeded" };
  }
  /**
   * Classify a single UTXO
   */
  async classifyUtxo(utxo) {
    const txHash = utxo.tx_hash || utxo.txid;
    if (!txHash) {
      return { isVested: false, coinbaseHeight: null, error: "No transaction hash" };
    }
    try {
      const result = await this.traceToOrigin(txHash);
      if (result.error || result.coinbaseHeight === null) {
        return { isVested: false, coinbaseHeight: null, error: result.error || "Could not trace to origin" };
      }
      return {
        isVested: result.coinbaseHeight <= VESTING_THRESHOLD,
        coinbaseHeight: result.coinbaseHeight
      };
    } catch (err) {
      return {
        isVested: false,
        coinbaseHeight: null,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }
  /**
   * Classify multiple UTXOs with progress callback
   */
  async classifyUtxos(utxos, onProgress) {
    currentBlockHeight = await getCurrentBlockHeight();
    this.memoryCache.clear();
    const vested = [];
    const unvested = [];
    const errors = [];
    for (let i = 0; i < utxos.length; i++) {
      const utxo = utxos[i];
      const result = await this.classifyUtxo(utxo);
      if (result.error) {
        errors.push({ utxo, error: result.error });
        unvested.push({
          ...utxo,
          vestingStatus: "error",
          coinbaseHeight: null
        });
      } else if (result.isVested) {
        vested.push({
          ...utxo,
          vestingStatus: "vested",
          coinbaseHeight: result.coinbaseHeight
        });
      } else {
        unvested.push({
          ...utxo,
          vestingStatus: "unvested",
          coinbaseHeight: result.coinbaseHeight
        });
      }
      if (onProgress) {
        onProgress(i + 1, utxos.length);
      }
      if (i % 5 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    return { vested, unvested, errors };
  }
  /**
   * Clear all caches
   */
  clearCaches() {
    this.memoryCache.clear();
    if (this.db) {
      const tx = this.db.transaction(this.storeName, "readwrite");
      tx.objectStore(this.storeName).clear();
    }
  }
  /**
   * Destroy caches and delete the IndexedDB database entirely.
   */
  async destroy() {
    this.memoryCache.clear();
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    if (typeof indexedDB !== "undefined") {
      await new Promise((resolve) => {
        const req = indexedDB.deleteDatabase(this.dbName);
        const timer = setTimeout(() => {
          logger.warn("L1", ` destroy: deleteDatabase timed out for ${this.dbName}`);
          resolve();
        }, 3e3);
        req.onsuccess = () => {
          clearTimeout(timer);
          resolve();
        };
        req.onerror = () => {
          clearTimeout(timer);
          resolve();
        };
        req.onblocked = () => {
          logger.warn("L1", ` destroy: deleteDatabase blocked for ${this.dbName}, waiting...`);
        };
      });
    }
  }
};
var vestingClassifier = new VestingClassifier();

// l1/vestingState.ts
var VestingStateManager = class {
  currentMode = "all";
  addressCache = /* @__PURE__ */ new Map();
  classificationInProgress = false;
  /**
   * Set the current vesting mode
   */
  setMode(mode) {
    if (!["all", "vested", "unvested"].includes(mode)) {
      throw new SphereError(`Invalid vesting mode: ${mode}`, "VALIDATION_ERROR");
    }
    this.currentMode = mode;
  }
  getMode() {
    return this.currentMode;
  }
  /**
   * Classify all UTXOs for an address
   */
  async classifyAddressUtxos(address, utxos, onProgress) {
    if (this.classificationInProgress) return;
    this.classificationInProgress = true;
    try {
      await vestingClassifier.initDB();
      const result = await vestingClassifier.classifyUtxos(utxos, onProgress);
      const vestedBalance = result.vested.reduce(
        (sum, utxo) => sum + BigInt(utxo.value),
        0n
      );
      const unvestedBalance = result.unvested.reduce(
        (sum, utxo) => sum + BigInt(utxo.value),
        0n
      );
      this.addressCache.set(address, {
        classifiedUtxos: {
          vested: result.vested,
          unvested: result.unvested,
          all: [...result.vested, ...result.unvested]
        },
        vestingBalances: {
          vested: vestedBalance,
          unvested: unvestedBalance,
          all: vestedBalance + unvestedBalance
        }
      });
      if (result.errors.length > 0) {
        logger.warn("L1", `Vesting classification errors: ${result.errors.length}`);
        result.errors.slice(0, 5).forEach((err) => {
          const txHash = err.utxo.tx_hash || err.utxo.txid;
          logger.warn("L1", `  ${txHash}: ${err.error}`);
        });
      }
    } finally {
      this.classificationInProgress = false;
    }
  }
  /**
   * Get filtered UTXOs based on current vesting mode
   */
  getFilteredUtxos(address) {
    const cache = this.addressCache.get(address);
    if (!cache) return [];
    switch (this.currentMode) {
      case "vested":
        return cache.classifiedUtxos.vested;
      case "unvested":
        return cache.classifiedUtxos.unvested;
      default:
        return cache.classifiedUtxos.all;
    }
  }
  /**
   * Get all UTXOs regardless of vesting mode (for transactions)
   */
  getAllUtxos(address) {
    const cache = this.addressCache.get(address);
    if (!cache) return [];
    return cache.classifiedUtxos.all;
  }
  /**
   * Get balance for current vesting mode (in satoshis)
   */
  getBalance(address) {
    const cache = this.addressCache.get(address);
    if (!cache) return 0n;
    return cache.vestingBalances[this.currentMode];
  }
  /**
   * Get all balances for display
   */
  getAllBalances(address) {
    const cache = this.addressCache.get(address);
    if (!cache) {
      return { vested: 0n, unvested: 0n, all: 0n };
    }
    return cache.vestingBalances;
  }
  /**
   * Check if address has been classified
   */
  hasClassifiedData(address) {
    return this.addressCache.has(address);
  }
  /**
   * Check if classification is in progress
   */
  isClassifying() {
    return this.classificationInProgress;
  }
  /**
   * Clear cache for an address
   */
  clearAddressCache(address) {
    this.addressCache.delete(address);
  }
  /**
   * Clear all caches
   */
  clearAllCaches() {
    this.addressCache.clear();
    vestingClassifier.clearCaches();
  }
};
var vestingState = new VestingStateManager();

// l1/addressHelpers.ts
var WalletAddressHelper = class {
  /**
   * Find address by BIP32 derivation path
   * @param wallet - The wallet to search
   * @param path - Full BIP32 path like "m/84'/1'/0'/0/5"
   * @returns The address if found, undefined otherwise
   */
  static findByPath(wallet, path) {
    return wallet.addresses.find((a) => a.path === path);
  }
  /**
   * Get the default address (first external/non-change address)
   * This replaces `wallet.addresses[0]` pattern for safer access
   *
   * @param wallet - The wallet
   * @returns First non-change address, or first address if all are change
   */
  static getDefault(wallet) {
    return wallet.addresses.find((a) => !a.isChange) ?? wallet.addresses[0];
  }
  /**
   * Get the default address, or undefined if wallet has no addresses
   * Safe version that doesn't throw on empty wallet
   */
  static getDefaultOrNull(wallet) {
    if (!wallet.addresses || wallet.addresses.length === 0) {
      return void 0;
    }
    return wallet.addresses.find((a) => !a.isChange) ?? wallet.addresses[0];
  }
  /**
   * Add new address to wallet (immutable operation)
   *
   * THROWS if address with same path but different address string already exists.
   * This indicates a serious derivation or data corruption issue.
   *
   * If the same path+address already exists, returns wallet unchanged (idempotent).
   *
   * @param wallet - The wallet to add to
   * @param newAddress - The address to add
   * @returns New wallet object with address added
   * @throws Error if path exists with different address (corruption indicator)
   */
  static add(wallet, newAddress) {
    if (!newAddress.path) {
      throw new SphereError("Cannot add address without a path", "INVALID_CONFIG");
    }
    const existing = this.findByPath(wallet, newAddress.path);
    if (existing) {
      if (existing.address !== newAddress.address) {
        throw new SphereError(
          `CRITICAL: Attempted to overwrite address for path ${newAddress.path}
Existing: ${existing.address}
New: ${newAddress.address}
This indicates master key corruption or derivation logic error.`,
          "INVALID_CONFIG"
        );
      }
      return wallet;
    }
    return {
      ...wallet,
      addresses: [...wallet.addresses, newAddress]
    };
  }
  /**
   * Remove address by path (immutable operation)
   * @param wallet - The wallet to modify
   * @param path - The path of the address to remove
   * @returns New wallet object with address removed
   */
  static removeByPath(wallet, path) {
    return {
      ...wallet,
      addresses: wallet.addresses.filter((a) => a.path !== path)
    };
  }
  /**
   * Get all external (non-change) addresses
   * @param wallet - The wallet
   * @returns Array of external addresses
   */
  static getExternal(wallet) {
    return wallet.addresses.filter((a) => !a.isChange);
  }
  /**
   * Get all change addresses
   * @param wallet - The wallet
   * @returns Array of change addresses
   */
  static getChange(wallet) {
    return wallet.addresses.filter((a) => a.isChange);
  }
  /**
   * Check if wallet has an address with the given path
   * @param wallet - The wallet to check
   * @param path - The path to look for
   * @returns true if path exists
   */
  static hasPath(wallet, path) {
    return wallet.addresses.some((a) => a.path === path);
  }
  /**
   * Validate wallet address array integrity
   * Checks for duplicate paths which indicate data corruption
   *
   * @param wallet - The wallet to validate
   * @throws Error if duplicate paths found
   */
  static validate(wallet) {
    const paths = wallet.addresses.map((a) => a.path).filter(Boolean);
    const uniquePaths = new Set(paths);
    if (paths.length !== uniquePaths.size) {
      const duplicates = paths.filter((p, i) => paths.indexOf(p) !== i);
      throw new SphereError(
        `CRITICAL: Wallet has duplicate paths: ${duplicates.join(", ")}
This indicates data corruption. Please restore from backup.`,
        "INVALID_CONFIG"
      );
    }
  }
  /**
   * Sort addresses with external first, then change, each sorted by index
   * Useful for display purposes
   *
   * @param wallet - The wallet
   * @returns New wallet with sorted addresses
   */
  static sortAddresses(wallet) {
    const sorted = [...wallet.addresses].sort((a, b) => {
      const aIsChange = a.isChange ? 1 : 0;
      const bIsChange = b.isChange ? 1 : 0;
      if (aIsChange !== bIsChange) return aIsChange - bIsChange;
      return a.index - b.index;
    });
    return {
      ...wallet,
      addresses: sorted
    };
  }
};

// l1/tx.ts
var ec2 = new elliptic2.ec("secp256k1");
var FEE = 1e4;
var DUST = 546;
var SAT = 1e8;
function createScriptPubKey(address) {
  if (!address || typeof address !== "string") {
    throw new SphereError("Invalid address: must be a string", "VALIDATION_ERROR");
  }
  const decoded = decodeBech32(address);
  if (!decoded) {
    throw new SphereError("Invalid bech32 address: " + address, "VALIDATION_ERROR");
  }
  const dataHex = Array.from(decoded.data).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return "0014" + dataHex;
}
function createSignatureHash(txPlan, publicKey) {
  let preimage = "";
  preimage += "02000000";
  const txidBytes = txPlan.input.tx_hash.match(/../g).reverse().join("");
  const voutBytes = ("00000000" + txPlan.input.tx_pos.toString(16)).slice(-8).match(/../g).reverse().join("");
  const prevouts = txidBytes + voutBytes;
  const hashPrevouts = CryptoJS5.SHA256(CryptoJS5.SHA256(CryptoJS5.enc.Hex.parse(prevouts))).toString();
  preimage += hashPrevouts;
  const sequence = "feffffff";
  const hashSequence = CryptoJS5.SHA256(CryptoJS5.SHA256(CryptoJS5.enc.Hex.parse(sequence))).toString();
  preimage += hashSequence;
  preimage += txPlan.input.tx_hash.match(/../g).reverse().join("");
  preimage += ("00000000" + txPlan.input.tx_pos.toString(16)).slice(-8).match(/../g).reverse().join("");
  const pubKeyHash = CryptoJS5.RIPEMD160(CryptoJS5.SHA256(CryptoJS5.enc.Hex.parse(publicKey))).toString();
  const scriptCode = "1976a914" + pubKeyHash + "88ac";
  preimage += scriptCode;
  const amountHex = txPlan.input.value.toString(16).padStart(16, "0");
  preimage += amountHex.match(/../g).reverse().join("");
  preimage += sequence;
  let outputs = "";
  for (const output of txPlan.outputs) {
    const outAmountHex = output.value.toString(16).padStart(16, "0");
    outputs += outAmountHex.match(/../g).reverse().join("");
    const scriptPubKey = createScriptPubKey(output.address);
    const scriptLength = (scriptPubKey.length / 2).toString(16).padStart(2, "0");
    outputs += scriptLength;
    outputs += scriptPubKey;
  }
  const hashOutputs = CryptoJS5.SHA256(CryptoJS5.SHA256(CryptoJS5.enc.Hex.parse(outputs))).toString();
  preimage += hashOutputs;
  preimage += "00000000";
  preimage += "01000000";
  const hash1 = CryptoJS5.SHA256(CryptoJS5.enc.Hex.parse(preimage));
  const hash2 = CryptoJS5.SHA256(hash1);
  return hash2.toString();
}
function createWitnessData(txPlan, keyPair, publicKey) {
  const sigHash = createSignatureHash(txPlan, publicKey);
  const signature = keyPair.sign(sigHash);
  const halfOrder = ec2.curve.n.shrn(1);
  if (signature.s.cmp(halfOrder) > 0) {
    signature.s = ec2.curve.n.sub(signature.s);
  }
  const derSig = signature.toDER("hex") + "01";
  let witness = "";
  witness += "02";
  const sigLen = (derSig.length / 2).toString(16).padStart(2, "0");
  witness += sigLen;
  witness += derSig;
  const pubKeyLen = (publicKey.length / 2).toString(16).padStart(2, "0");
  witness += pubKeyLen;
  witness += publicKey;
  return witness;
}
function buildSegWitTransaction(txPlan, keyPair, publicKey) {
  let txHex = "";
  txHex += "02000000";
  txHex += "00";
  txHex += "01";
  txHex += "01";
  const prevTxHash = txPlan.input.tx_hash;
  const reversedHash = prevTxHash.match(/../g).reverse().join("");
  txHex += reversedHash;
  const vout = txPlan.input.tx_pos;
  txHex += ("00000000" + vout.toString(16)).slice(-8).match(/../g).reverse().join("");
  txHex += "00";
  txHex += "feffffff";
  const outputCount = txPlan.outputs.length;
  txHex += ("0" + outputCount.toString(16)).slice(-2);
  for (const output of txPlan.outputs) {
    const amountHex = output.value.toString(16).padStart(16, "0");
    txHex += amountHex.match(/../g).reverse().join("");
    const scriptPubKey = createScriptPubKey(output.address);
    const scriptLength = (scriptPubKey.length / 2).toString(16).padStart(2, "0");
    txHex += scriptLength;
    txHex += scriptPubKey;
  }
  const witnessData = createWitnessData(txPlan, keyPair, publicKey);
  txHex += witnessData;
  txHex += "00000000";
  let txForId = "";
  txForId += "02000000";
  txForId += "01";
  const inputTxidBytes = txPlan.input.tx_hash.match(/../g).reverse().join("");
  txForId += inputTxidBytes;
  txForId += ("00000000" + txPlan.input.tx_pos.toString(16)).slice(-8).match(/../g).reverse().join("");
  txForId += "00";
  txForId += "feffffff";
  txForId += ("0" + txPlan.outputs.length.toString(16)).slice(-2);
  for (const output of txPlan.outputs) {
    const amountHex = ("0000000000000000" + output.value.toString(16)).slice(-16);
    const amountLittleEndian = amountHex.match(/../g).reverse().join("");
    txForId += amountLittleEndian;
    const scriptPubKey = createScriptPubKey(output.address);
    const scriptLength = ("0" + (scriptPubKey.length / 2).toString(16)).slice(-2);
    txForId += scriptLength;
    txForId += scriptPubKey;
  }
  txForId += "00000000";
  const hash1 = CryptoJS5.SHA256(CryptoJS5.enc.Hex.parse(txForId));
  const hash2 = CryptoJS5.SHA256(hash1);
  const txid = hash2.toString().match(/../g).reverse().join("");
  return {
    hex: txHex,
    txid
  };
}
function createAndSignTransaction(wallet, txPlan) {
  const fromAddress = txPlan.input.address;
  const addressEntry = wallet.addresses.find((a) => a.address === fromAddress);
  let privateKeyHex;
  if (addressEntry?.privateKey) {
    privateKeyHex = addressEntry.privateKey;
  } else if (wallet.childPrivateKey) {
    privateKeyHex = wallet.childPrivateKey;
  } else {
    privateKeyHex = wallet.masterPrivateKey;
  }
  if (!privateKeyHex) {
    throw new SphereError("No private key available for address: " + fromAddress, "INVALID_CONFIG");
  }
  const keyPair = ec2.keyFromPrivate(privateKeyHex, "hex");
  const publicKey = keyPair.getPublic(true, "hex");
  const txPlanForBuild = {
    input: {
      tx_hash: txPlan.input.txid,
      tx_pos: txPlan.input.vout,
      value: txPlan.input.value
    },
    outputs: txPlan.outputs
  };
  const tx = buildSegWitTransaction(txPlanForBuild, keyPair, publicKey);
  return {
    raw: tx.hex,
    txid: tx.txid
  };
}
function collectUtxosForAmount(utxoList, amountSats, recipientAddress, senderAddress) {
  const totalAvailable = utxoList.reduce((sum, u) => sum + u.value, 0);
  if (totalAvailable < amountSats + FEE) {
    return {
      success: false,
      transactions: [],
      error: `Insufficient funds. Available: ${totalAvailable / SAT} ALPHA, Required: ${(amountSats + FEE) / SAT} ALPHA (including fee)`
    };
  }
  const sortedByValue = [...utxoList].sort((a, b) => a.value - b.value);
  const sufficientUtxo = sortedByValue.find((u) => u.value >= amountSats + FEE);
  if (sufficientUtxo) {
    const changeAmount = sufficientUtxo.value - amountSats - FEE;
    const tx = {
      input: {
        txid: sufficientUtxo.txid ?? sufficientUtxo.tx_hash ?? "",
        vout: sufficientUtxo.vout ?? sufficientUtxo.tx_pos ?? 0,
        value: sufficientUtxo.value,
        address: sufficientUtxo.address ?? senderAddress
      },
      outputs: [{ address: recipientAddress, value: amountSats }],
      fee: FEE,
      changeAmount,
      changeAddress: senderAddress
    };
    if (changeAmount > DUST) {
      tx.outputs.push({ value: changeAmount, address: senderAddress });
    }
    return {
      success: true,
      transactions: [tx]
    };
  }
  const sortedDescending = [...utxoList].sort((a, b) => b.value - a.value);
  const transactions = [];
  let remainingAmount = amountSats;
  for (const utxo of sortedDescending) {
    if (remainingAmount <= 0) break;
    const utxoValue = utxo.value;
    let txAmount = 0;
    let changeAmount = 0;
    if (utxoValue >= remainingAmount + FEE) {
      txAmount = remainingAmount;
      changeAmount = utxoValue - remainingAmount - FEE;
      remainingAmount = 0;
    } else {
      txAmount = utxoValue - FEE;
      if (txAmount <= 0) continue;
      remainingAmount -= txAmount;
    }
    const tx = {
      input: {
        txid: utxo.txid ?? utxo.tx_hash ?? "",
        vout: utxo.vout ?? utxo.tx_pos ?? 0,
        value: utxo.value,
        address: utxo.address ?? senderAddress
      },
      outputs: [{ address: recipientAddress, value: txAmount }],
      fee: FEE,
      changeAmount,
      changeAddress: senderAddress
    };
    if (changeAmount > DUST) {
      tx.outputs.push({ value: changeAmount, address: senderAddress });
    }
    transactions.push(tx);
  }
  if (remainingAmount > 0) {
    return {
      success: false,
      transactions: [],
      error: `Unable to collect enough UTXOs. Short by ${remainingAmount / SAT} ALPHA after fees.`
    };
  }
  return {
    success: true,
    transactions
  };
}
async function createTransactionPlan(wallet, toAddress, amountAlpha, fromAddress) {
  if (!decodeBech32(toAddress)) {
    throw new SphereError("Invalid recipient address", "INVALID_RECIPIENT");
  }
  const defaultAddr = WalletAddressHelper.getDefault(wallet);
  const senderAddress = fromAddress || defaultAddr.address;
  const amountSats = Math.floor(amountAlpha * SAT);
  let utxos;
  const currentMode = vestingState.getMode();
  if (vestingState.hasClassifiedData(senderAddress)) {
    utxos = vestingState.getFilteredUtxos(senderAddress);
    logger.debug("L1", `Using ${utxos.length} ${currentMode} UTXOs`);
  } else {
    utxos = await getUtxo(senderAddress);
    logger.debug("L1", `Using ${utxos.length} UTXOs (vesting not classified yet)`);
  }
  if (!Array.isArray(utxos) || utxos.length === 0) {
    const modeText = currentMode !== "all" ? ` (${currentMode} coins)` : "";
    throw new SphereError(`No UTXOs available${modeText} for address: ` + senderAddress, "INSUFFICIENT_BALANCE");
  }
  return collectUtxosForAmount(utxos, amountSats, toAddress, senderAddress);
}
async function sendAlpha(wallet, toAddress, amountAlpha, fromAddress) {
  const plan = await createTransactionPlan(wallet, toAddress, amountAlpha, fromAddress);
  if (!plan.success) {
    throw new SphereError(plan.error || "Transaction planning failed", "TRANSFER_FAILED");
  }
  const results = [];
  for (const tx of plan.transactions) {
    const signed = createAndSignTransaction(wallet, tx);
    const result = await broadcast(signed.raw);
    results.push({
      txid: signed.txid,
      raw: signed.raw,
      broadcastResult: result
    });
  }
  return results;
}
export {
  CHARSET,
  VESTING_THRESHOLD,
  WalletAddressHelper,
  addressToScriptHash,
  broadcast,
  buildSegWitTransaction,
  collectUtxosForAmount,
  computeHash160,
  connect,
  convertBits,
  createAndSignTransaction,
  createBech32,
  createScriptPubKey,
  createTransactionPlan,
  decodeBech32,
  decrypt,
  decryptWallet,
  deriveChildKey2 as deriveChildKey,
  deriveChildKeyBIP32,
  deriveKeyAtPath2 as deriveKeyAtPath,
  disconnect,
  domIdToPath,
  ec,
  encodeBech32,
  encrypt,
  encryptWallet,
  generateAddressFromMasterKey,
  generateAddressInfo,
  generateHDAddress,
  generateHDAddressBIP32,
  generateMasterKeyFromSeed,
  generatePrivateKey,
  getBalance,
  getBlockHeader,
  getCurrentBlockHeight,
  getIndexFromPath,
  getTransaction,
  getTransactionHistory,
  getUtxo,
  hash160,
  hash160ToBytes,
  hexToWIF,
  isChangePath,
  isWebSocketConnected,
  parsePathComponents,
  pathToDOMId,
  privateKeyToAddressInfo,
  publicKeyToAddress,
  rpc,
  sendAlpha,
  subscribeBlocks,
  vestingClassifier,
  vestingState,
  waitForConnection
};
//# sourceMappingURL=index.js.map