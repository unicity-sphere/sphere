import elliptic from 'elliptic';

interface Wallet {
    masterPrivateKey: string;
    chainCode?: string;
    addresses: WalletAddress[];
    createdAt?: number;
    isEncrypted?: boolean;
    encryptedMasterKey?: string;
    childPrivateKey?: string | null;
    isImportedAlphaWallet?: boolean;
    masterChainCode?: string | null;
    isBIP32?: boolean;
    descriptorPath?: string | null;
}
interface WalletAddress {
    address: string;
    publicKey?: string;
    privateKey?: string;
    path: string | null;
    index: number;
    createdAt?: string;
    isChange?: boolean;
}
interface StoredWallet {
    key: string;
    data: Wallet;
}
interface TransactionInput {
    txid: string;
    vout: number;
    value: number;
    address: string;
}
interface TransactionOutput {
    value: number;
    address: string;
}
interface Transaction {
    input: TransactionInput;
    outputs: TransactionOutput[];
    fee: number;
    changeAmount: number;
    changeAddress: string;
}
interface TransactionPlan {
    success: boolean;
    transactions: Transaction[];
    error?: string;
}
interface UTXO {
    txid?: string;
    tx_hash?: string;
    vout?: number;
    tx_pos?: number;
    value: number;
    height?: number;
    address?: string;
}
interface RestoreWalletResult {
    success: boolean;
    wallet: Wallet;
    message?: string;
    error?: string;
    /** Indicates that the wallet.dat file is encrypted and requires a password */
    isEncryptedDat?: boolean;
}
interface ExportOptions {
    password?: string;
    filename?: string;
}
/**
 * JSON Wallet Export Format v1.0
 *
 * Supports multiple wallet sources:
 * - "mnemonic": Created from BIP39 mnemonic phrase (new standard)
 * - "file_bip32": Imported from file with chain code (BIP32 HD wallet)
 * - "file_standard": Imported from file without chain code (HMAC-based)
 * - "dat_descriptor": Imported from wallet.dat descriptor wallet
 * - "dat_hd": Imported from wallet.dat HD wallet
 * - "dat_legacy": Imported from wallet.dat legacy wallet
 */
type WalletJSONSource = "mnemonic" | "file_bip32" | "file_standard" | "dat_descriptor" | "dat_hd" | "dat_legacy";
type WalletJSONDerivationMode = "bip32" | "wif_hmac" | "legacy_hmac";
interface WalletJSONAddress {
    address: string;
    publicKey: string;
    path: string;
    index?: number;
    isChange?: boolean;
}
/**
 * JSON Wallet Export structure
 */
interface WalletJSON {
    /** Format version */
    version: "1.0";
    /** Generation timestamp ISO 8601 */
    generated: string;
    /** Security warning */
    warning: string;
    /** Master private key (hex, 64 chars) */
    masterPrivateKey: string;
    /** Master chain code for BIP32 (hex, 64 chars) - optional for HMAC wallets */
    chainCode?: string;
    /** BIP39 mnemonic phrase - only present if source is "mnemonic" */
    mnemonic?: string;
    /** Derivation mode used */
    derivationMode: WalletJSONDerivationMode;
    /** Source of the wallet */
    source: WalletJSONSource;
    /** First address for verification */
    firstAddress: WalletJSONAddress;
    /** Descriptor path for BIP32 wallets (e.g., "84'/0'/0'") */
    descriptorPath?: string;
    /** Encrypted fields (when password protected) */
    encrypted?: {
        /** Encrypted master private key (AES-256) */
        masterPrivateKey: string;
        /** Encrypted mnemonic (AES-256) - only if source is "mnemonic" */
        mnemonic?: string;
        /** Salt used for key derivation */
        salt: string;
        /** Number of PBKDF2 iterations */
        iterations: number;
    };
    /** Additional addresses beyond first (optional) */
    addresses?: WalletJSONAddress[];
}
interface WalletJSONExportOptions {
    /** Password for encryption (optional) */
    password?: string;
    /** Include all addresses (default: only first address) */
    includeAllAddresses?: boolean;
    /** Number of addresses to include (if includeAllAddresses is false) */
    addressCount?: number;
}
interface WalletJSONImportResult {
    success: boolean;
    wallet?: Wallet;
    source?: WalletJSONSource;
    derivationMode?: WalletJSONDerivationMode;
    /** Indicates if mnemonic was found in the JSON */
    hasMnemonic?: boolean;
    /** The decrypted mnemonic phrase (if available) */
    mnemonic?: string;
    message?: string;
    error?: string;
}
type VestingMode = "all" | "vested" | "unvested";
interface ClassifiedUTXO extends UTXO {
    vestingStatus?: "vested" | "unvested" | "error";
    coinbaseHeight?: number | null;
}
interface VestingBalances {
    vested: bigint;
    unvested: bigint;
    all: bigint;
}
interface ClassificationResult {
    isVested: boolean;
    coinbaseHeight: number | null;
    error?: string;
}
/**
 * Parse BIP32 path components from a derivation path string
 * @param path - Full path like "m/84'/1'/0'/0/5" or "m/44'/0'/0'/1/3"
 * @returns { chain: number, index: number } where chain=0 is external, chain=1 is change
 *          Returns null if path is invalid
 *
 * Examples:
 *   "m/84'/1'/0'/0/5" -> { chain: 0, index: 5 } (external address 5)
 *   "m/84'/1'/0'/1/3" -> { chain: 1, index: 3 } (change address 3)
 */
declare function parsePathComponents(path: string): {
    chain: number;
    index: number;
} | null;
/**
 * Check if a BIP32 path represents a change address (chain=1)
 * @param path - Full BIP32 path string
 * @returns true if this is a change address path
 */
declare function isChangePath(path: string): boolean;
/**
 * Get display-friendly index from path (for UI display only)
 * @param path - Full BIP32 path string
 * @returns The address index number, or 0 if invalid
 */
declare function getIndexFromPath(path: string): number;
/**
 * Convert a BIP32 path to a DOM-safe ID string
 * Replaces characters that are invalid in DOM IDs:
 * - ' (apostrophe) -> 'h' (hardened marker)
 * - / (forward slash) -> '-' (dash)
 *
 * @param path - Full BIP32 path like "m/84'/1'/0'/0/5"
 * @returns DOM-safe ID like "m-84h-1h-0h-0-5"
 *
 * Examples:
 *   "m/84'/1'/0'/0/5" -> "m-84h-1h-0h-0-5"
 *   "m/44'/0'/0'/1/3" -> "m-44h-0h-0h-1-3"
 */
declare function pathToDOMId(path: string): string;
/**
 * Convert a DOM-safe ID back to a BIP32 path string
 * Reverses the transformation done by pathToDOMId:
 * - 'h' -> ' (apostrophe for hardened)
 * - '-' -> / (forward slash)
 *
 * @param encoded - DOM-safe ID like "m-84h-1h-0h-0-5"
 * @returns BIP32 path like "m/84'/1'/0'/0/5"
 *
 * Examples:
 *   "m-84h-1h-0h-0-5" -> "m/84'/1'/0'/0/5"
 *   "m-44h-0h-0h-1-3" -> "m/44'/0'/0'/1/3"
 */
declare function domIdToPath(encoded: string): string;

/**
 * Bech32 Encoding/Decoding
 * BIP-173 implementation for address encoding
 */
/** Bech32 character set from BIP-173 */
declare const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
/**
 * Convert between bit arrays (8→5 or 5→8)
 */
declare function convertBits(data: number[], fromBits: number, toBits: number, pad: boolean): number[] | null;
/**
 * Encode data to bech32 address
 *
 * @example
 * ```ts
 * const address = encodeBech32('alpha', 1, pubkeyHash);
 * // 'alpha1qw...'
 * ```
 */
declare function encodeBech32(hrp: string, version: number, program: Uint8Array): string;
/**
 * Decode bech32 address
 *
 * @example
 * ```ts
 * const result = decodeBech32('alpha1qw...');
 * // { hrp: 'alpha', witnessVersion: 1, data: Uint8Array }
 * ```
 */
declare function decodeBech32(addr: string): {
    hrp: string;
    witnessVersion: number;
    data: Uint8Array;
} | null;
/**
 * Alias for encodeBech32 (L1 SDK compatibility)
 */
declare const createBech32: typeof encodeBech32;

/**
 * Convert "alpha1xxxx" Bech32 → Electrum script hash
 * Required for:
 *  - blockchain.scripthash.get_history
 *  - blockchain.scripthash.listunspent
 */
declare function addressToScriptHash(address: string): string;

/**
 * Cryptographic utilities for SDK2
 *
 * Provides BIP39 mnemonic and BIP32 key derivation functions.
 * Platform-independent - no browser-specific APIs.
 */

declare const ec: elliptic.ec;
interface DerivedKey {
    privateKey: string;
    chainCode: string;
}
interface KeyPair {
    privateKey: string;
    publicKey: string;
}
interface AddressInfo extends KeyPair {
    address: string;
    path: string;
    index: number;
}
/**
 * Derive child key using BIP32 standard
 * @param parentPrivKey - Parent private key (64 hex chars)
 * @param parentChainCode - Parent chain code (64 hex chars)
 * @param index - Child index (>= 0x80000000 for hardened)
 */
declare function deriveChildKey$1(parentPrivKey: string, parentChainCode: string, index: number): DerivedKey;
/**
 * Derive key at a full BIP32/BIP44 path
 * @param masterPrivKey - Master private key
 * @param masterChainCode - Master chain code
 * @param path - BIP44 path like "m/44'/0'/0'/0/0"
 */
declare function deriveKeyAtPath$1(masterPrivKey: string, masterChainCode: string, path: string): DerivedKey;
/**
 * Compute HASH160 (SHA256 -> RIPEMD160)
 */
declare function hash160(data: string): string;
/**
 * Alias for hash160 (L1 SDK compatibility)
 */
declare const computeHash160: typeof hash160;
/**
 * Convert hex string to Uint8Array for witness program.
 *
 * Steelman³² warning: strict — reject odd-length and non-hex.
 * `match(/../g)` silently drops a trailing odd char; `parseInt('zz',16)
 * === NaN` silently coerces to 0. Used in publicKeyToAddress / L1
 * address derivation; a malformed hash silently produced a wrong
 * address with the previous behavior.
 */
declare function hash160ToBytes(hash160Hex: string): Uint8Array;
/**
 * Generate bech32 address from public key
 * @param publicKey - Compressed public key as hex string
 * @param prefix - Address prefix (default: "alpha")
 * @param witnessVersion - Witness version (default: 0 for P2WPKH)
 * @returns Bech32 encoded address
 */
declare function publicKeyToAddress(publicKey: string, prefix?: string, witnessVersion?: number): string;
/**
 * Get address info from private key
 */
declare function privateKeyToAddressInfo(privateKey: string, prefix?: string): {
    address: string;
    publicKey: string;
};
/**
 * Generate full address info from private key with index and path
 * (L1 SDK compatibility)
 */
declare function generateAddressInfo(privateKey: string, index: number, path: string, prefix?: string): AddressInfo;

declare function encrypt(text: string, password: string): string;
declare function decrypt(encrypted: string, password: string): string;
declare function generatePrivateKey(): string;
/**
 * Encrypt wallet master key with password using PBKDF2 + AES
 */
declare function encryptWallet(masterPrivateKey: string, password: string): string;
/**
 * Decrypt wallet master key with password
 */
declare function decryptWallet(encryptedData: string, password: string): string;
/**
 * Convert hex private key to WIF format
 */
declare function hexToWIF(hexKey: string): string;

/**
 * L1 Address Derivation
 *
 * Uses core crypto functions for standard BIP32 derivation,
 * plus legacy functions for backward compatibility with old wallets.
 */

/**
 * Standard BIP32 child key derivation
 * Re-export from core with L1 naming convention
 */
declare const deriveChildKeyBIP32: typeof deriveChildKey$1;
/**
 * Derive key at a full BIP44 path
 * Re-export from core
 */
declare const deriveKeyAtPath: typeof deriveKeyAtPath$1;
/**
 * Generate master key and chain code from seed (BIP32 standard)
 * Wrapper around core function with L1 return type naming
 */
declare function generateMasterKeyFromSeed(seedHex: string): {
    masterPrivateKey: string;
    masterChainCode: string;
};
/**
 * Generate HD address using standard BIP32
 * Standard path: m/44'/0'/0'/0/{index} (external chain, non-hardened)
 * For change addresses, use isChange = true to get m/44'/0'/0'/1/{index}
 */
declare function generateHDAddressBIP32(masterPriv: string, chainCode: string, index: number, basePath?: string, isChange?: boolean): AddressInfo;
/**
 * Generate address from master private key using HMAC-SHA512 derivation
 * This matches exactly the original index.html implementation
 * NOTE: This is NON-STANDARD derivation for legacy wallet compatibility
 *
 * @param masterPrivateKey - 32-byte hex private key (64 chars)
 * @param index - Address index
 */
declare function generateAddressFromMasterKey(masterPrivateKey: string, index: number): AddressInfo;
/**
 * @deprecated Use deriveChildKeyBIP32 for new wallets
 * Legacy HMAC-SHA512 derivation (non-standard)
 * Kept for backward compatibility with old wallets
 */
declare function deriveChildKey(masterPriv: string, chainCode: string, index: number): {
    privateKey: string;
    nextChainCode: string;
};
/**
 * @deprecated Use generateHDAddressBIP32 for new wallets
 * Legacy HD address generation (non-standard derivation)
 */
declare function generateHDAddress(masterPriv: string, chainCode: string, index: number): AddressInfo;

interface BlockHeader {
    height: number;
    hex: string;
    [key: string]: unknown;
}
declare function isWebSocketConnected(): boolean;
declare function waitForConnection(): Promise<void>;
declare function connect(endpoint?: string): Promise<void>;
declare function rpc(method: string, params?: unknown[]): Promise<unknown>;
declare function getUtxo(address: string): Promise<{
    tx_hash: string | undefined;
    tx_pos: number | undefined;
    value: number;
    height: number | undefined;
    address: string;
}[]>;
declare function getBalance(address: string): Promise<number>;
declare function broadcast(rawHex: string): Promise<unknown>;
declare function subscribeBlocks(cb: (header: BlockHeader) => void): Promise<() => void>;
interface TransactionHistoryItem {
    tx_hash: string;
    height: number;
    fee?: number;
}
interface TransactionDetail {
    txid: string;
    version: number;
    locktime: number;
    vin: Array<{
        txid: string;
        vout: number;
        scriptSig?: {
            hex: string;
        };
        sequence: number;
    }>;
    vout: Array<{
        value: number;
        n: number;
        scriptPubKey: {
            hex: string;
            type: string;
            addresses?: string[];
            address?: string;
        };
    }>;
    blockhash?: string;
    confirmations?: number;
    time?: number;
    blocktime?: number;
}
declare function getTransactionHistory(address: string): Promise<TransactionHistoryItem[]>;
declare function getTransaction(txid: string): Promise<unknown>;
declare function getBlockHeader(height: number): Promise<unknown>;
declare function getCurrentBlockHeight(): Promise<number>;
declare function disconnect(): void;

/**
 * Create scriptPubKey for address (P2WPKH for bech32)
 * Exact copy from index.html
 */
declare function createScriptPubKey(address: string): string;
/**
 * Build a proper SegWit transaction
 * Exact copy from index.html buildSegWitTransaction()
 */
declare function buildSegWitTransaction(txPlan: {
    input: {
        tx_hash: string;
        tx_pos: number;
        value: number;
    };
    outputs: Array<{
        value: number;
        address: string;
    }>;
}, keyPair: elliptic.ec.KeyPair, publicKey: string): {
    hex: string;
    txid: string;
};
/**
 * Create and sign a transaction
 * Uses the private key for the specific address being spent from
 */
declare function createAndSignTransaction(wallet: Wallet, txPlan: Transaction): {
    raw: string;
    txid: string;
};
/**
 * Collect UTXOs for required amount
 * Based on index.html collectUtxosForAmount()
 *
 * Strategy: First try to find a single UTXO that can cover amount + fee.
 * If not found, fall back to combining multiple UTXOs.
 */
declare function collectUtxosForAmount(utxoList: UTXO[], amountSats: number, recipientAddress: string, senderAddress: string): TransactionPlan;
/**
 * Create transaction plan from wallet
 * @param wallet - The wallet
 * @param toAddress - Recipient address
 * @param amountAlpha - Amount in ALPHA
 * @param fromAddress - Optional: specific address to send from (defaults to first address)
 */
declare function createTransactionPlan(wallet: Wallet, toAddress: string, amountAlpha: number, fromAddress?: string): Promise<TransactionPlan>;
/**
 * Send ALPHA to address
 * @param wallet - The wallet
 * @param toAddress - Recipient address
 * @param amountAlpha - Amount in ALPHA
 * @param fromAddress - Optional: specific address to send from
 */
declare function sendAlpha(wallet: Wallet, toAddress: string, amountAlpha: number, fromAddress?: string): Promise<{
    txid: string;
    raw: string;
    broadcastResult: unknown;
}[]>;

declare const VESTING_THRESHOLD = 280000;
declare class VestingClassifier {
    private memoryCache;
    private dbName;
    private storeName;
    private db;
    /**
     * Initialize IndexedDB for persistent caching.
     * In Node.js (no IndexedDB), silently falls back to memory-only caching.
     */
    initDB(): Promise<void>;
    /**
     * Check if transaction is coinbase
     */
    private isCoinbaseTransaction;
    /**
     * Load from IndexedDB cache
     */
    private loadFromDB;
    /**
     * Save to IndexedDB cache
     */
    private saveToDB;
    /**
     * Trace a transaction to its coinbase origin
     * Alpha blockchain has single-input transactions, making this a linear trace
     */
    traceToOrigin(txHash: string): Promise<{
        coinbaseHeight: number | null;
        error?: string;
    }>;
    /**
     * Classify a single UTXO
     */
    classifyUtxo(utxo: UTXO): Promise<ClassificationResult>;
    /**
     * Classify multiple UTXOs with progress callback
     */
    classifyUtxos(utxos: UTXO[], onProgress?: (current: number, total: number) => void): Promise<{
        vested: ClassifiedUTXO[];
        unvested: ClassifiedUTXO[];
        errors: Array<{
            utxo: UTXO;
            error: string;
        }>;
    }>;
    /**
     * Clear all caches
     */
    clearCaches(): void;
    /**
     * Destroy caches and delete the IndexedDB database entirely.
     */
    destroy(): Promise<void>;
}
declare const vestingClassifier: VestingClassifier;

declare class VestingStateManager {
    private currentMode;
    private addressCache;
    private classificationInProgress;
    /**
     * Set the current vesting mode
     */
    setMode(mode: VestingMode): void;
    getMode(): VestingMode;
    /**
     * Classify all UTXOs for an address
     */
    classifyAddressUtxos(address: string, utxos: UTXO[], onProgress?: (current: number, total: number) => void): Promise<void>;
    /**
     * Get filtered UTXOs based on current vesting mode
     */
    getFilteredUtxos(address: string): ClassifiedUTXO[];
    /**
     * Get all UTXOs regardless of vesting mode (for transactions)
     */
    getAllUtxos(address: string): ClassifiedUTXO[];
    /**
     * Get balance for current vesting mode (in satoshis)
     */
    getBalance(address: string): bigint;
    /**
     * Get all balances for display
     */
    getAllBalances(address: string): VestingBalances;
    /**
     * Check if address has been classified
     */
    hasClassifiedData(address: string): boolean;
    /**
     * Check if classification is in progress
     */
    isClassifying(): boolean;
    /**
     * Clear cache for an address
     */
    clearAddressCache(address: string): void;
    /**
     * Clear all caches
     */
    clearAllCaches(): void;
}
declare const vestingState: VestingStateManager;

/**
 * WalletAddressHelper - Path-based address lookup and mutation utilities
 *
 * Key principle: A BIP32 path ALWAYS derives the same address from a given master key.
 * - If we try to add a different address for an existing path → FATAL ERROR
 * - This indicates corruption, wrong derivation, or data integrity issue
 *
 * Performance: O(n) lookup is negligible for typical wallet sizes (5-100 addresses)
 */

declare class WalletAddressHelper {
    /**
     * Find address by BIP32 derivation path
     * @param wallet - The wallet to search
     * @param path - Full BIP32 path like "m/84'/1'/0'/0/5"
     * @returns The address if found, undefined otherwise
     */
    static findByPath(wallet: Wallet, path: string): WalletAddress | undefined;
    /**
     * Get the default address (first external/non-change address)
     * This replaces `wallet.addresses[0]` pattern for safer access
     *
     * @param wallet - The wallet
     * @returns First non-change address, or first address if all are change
     */
    static getDefault(wallet: Wallet): WalletAddress;
    /**
     * Get the default address, or undefined if wallet has no addresses
     * Safe version that doesn't throw on empty wallet
     */
    static getDefaultOrNull(wallet: Wallet): WalletAddress | undefined;
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
    static add(wallet: Wallet, newAddress: WalletAddress): Wallet;
    /**
     * Remove address by path (immutable operation)
     * @param wallet - The wallet to modify
     * @param path - The path of the address to remove
     * @returns New wallet object with address removed
     */
    static removeByPath(wallet: Wallet, path: string): Wallet;
    /**
     * Get all external (non-change) addresses
     * @param wallet - The wallet
     * @returns Array of external addresses
     */
    static getExternal(wallet: Wallet): WalletAddress[];
    /**
     * Get all change addresses
     * @param wallet - The wallet
     * @returns Array of change addresses
     */
    static getChange(wallet: Wallet): WalletAddress[];
    /**
     * Check if wallet has an address with the given path
     * @param wallet - The wallet to check
     * @param path - The path to look for
     * @returns true if path exists
     */
    static hasPath(wallet: Wallet, path: string): boolean;
    /**
     * Validate wallet address array integrity
     * Checks for duplicate paths which indicate data corruption
     *
     * @param wallet - The wallet to validate
     * @throws Error if duplicate paths found
     */
    static validate(wallet: Wallet): void;
    /**
     * Sort addresses with external first, then change, each sorted by index
     * Useful for display purposes
     *
     * @param wallet - The wallet
     * @returns New wallet with sorted addresses
     */
    static sortAddresses(wallet: Wallet): Wallet;
}

export { type BlockHeader, CHARSET, type ClassificationResult, type ClassifiedUTXO, type ExportOptions, type RestoreWalletResult, type StoredWallet, type Transaction, type TransactionDetail, type TransactionHistoryItem, type TransactionInput, type TransactionOutput, type TransactionPlan, type UTXO, VESTING_THRESHOLD, type VestingBalances, type VestingMode, type Wallet, type WalletAddress, WalletAddressHelper, type WalletJSON, type WalletJSONAddress, type WalletJSONDerivationMode, type WalletJSONExportOptions, type WalletJSONImportResult, type WalletJSONSource, addressToScriptHash, broadcast, buildSegWitTransaction, collectUtxosForAmount, computeHash160, connect, convertBits, createAndSignTransaction, createBech32, createScriptPubKey, createTransactionPlan, decodeBech32, decrypt, decryptWallet, deriveChildKey, deriveChildKeyBIP32, deriveKeyAtPath, disconnect, domIdToPath, ec, encodeBech32, encrypt, encryptWallet, generateAddressFromMasterKey, generateAddressInfo, generateHDAddress, generateHDAddressBIP32, generateMasterKeyFromSeed, generatePrivateKey, getBalance, getBlockHeader, getCurrentBlockHeight, getIndexFromPath, getTransaction, getTransactionHistory, getUtxo, hash160, hash160ToBytes, hexToWIF, isChangePath, isWebSocketConnected, parsePathComponents, pathToDOMId, privateKeyToAddressInfo, publicKeyToAddress, rpc, sendAlpha, subscribeBlocks, vestingClassifier, vestingState, waitForConnection };
