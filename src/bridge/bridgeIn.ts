/**
 * Bridge-in orchestration (06 §A1.1; 08 Phase 4 abstraction). Chain-neutral: it
 * runs an ordered list of opaque {DepositStep}s produced by a {BridgeSourceAdapter},
 * guarding account/network before every signature, persisting recovery
 * fail-closed, waiting for the committing (lock) receipt, then minting.
 *
 * This module contains **no** chain-specific logic — no RPC client, no allowance
 * read, no address/explorer handling, no event decoding (08 Phase 4 exit
 * criterion #1). It depends only on the neutral {ChainWallet} / {ReceiptReader} /
 * {BridgeSourceAdapter} interfaces; the concrete Tron wiring is injected by the
 * composition root (`loadBridges.createBridgeInDeps`). A second chain (or a
 * single-signature deposit) flows through this unchanged. Pure of React; the hook
 * (`useBridgeIn`) wraps it.
 */
import type { Sphere } from '@unicitylabs/sphere-sdk';
import type {
  BridgeSourceAdapter,
  CommitInfo,
} from '@unicitylabs/bridge-plugin-tron-usdt/lib/wallet/index.js';

import type { BridgeStore, PendingLock } from './store';

/**
 * The wallet capabilities the orchestrator needs (08 "ChainWallet" boundary):
 * connect once, then read the **live** account/network before every signature.
 * No signing here — the deposit steps sign via the wallet the adapter closed over.
 */
export interface ChainWallet {
  connect(): Promise<string>;
  getAddress(): Promise<string>;
  getNetwork(): Promise<number>;
}

/**
 * A committing/approval tx receipt the orchestrator inspects only for revert; the
 * rest is opaque and handed back to the adapter's `decodeCommit`. `null` until the
 * tx is mined.
 */
export interface TxReceipt {
  readonly success: boolean;
}

/** Node-read surface the orchestrator needs (08 "ChainClient" boundary): receipts. */
export interface ReceiptReader {
  getReceipt(txid: string): Promise<TxReceipt | null>;
}

/** The chain wiring the orchestrator runs on — built by the composition root. */
export interface BridgeInDeps {
  readonly wallet: ChainWallet;
  readonly receipts: ReceiptReader;
  readonly adapter: BridgeSourceAdapter;
  /** Source-chain network id the deposit targets; the guard pins + re-checks it. */
  readonly expectedNetwork: number;
  /** Human label for the wrong-network message (e.g. "USDT (bridged · Tron)"). */
  readonly chainLabel: string;
}

export type BridgeInPhase =
  | 'deriving'
  | 'approving'
  | 'locking'
  | 'waiting-lock'
  | 'minting'
  | 'done';

export interface BridgeInProgress {
  phase: BridgeInPhase;
  /** Committing (lock) txid, once broadcast. */
  lockTxid?: string;
  message?: string;
}

export interface BridgeInArgs extends BridgeInDeps {
  sphere: Sphere;
  store: BridgeStore;
  /** Amount in the asset's smallest unit. */
  amount: bigint;
  /** Unicity network id (e.g. testnet2 = 4). */
  networkId: number;
  /** One-time max approve (fewer prompts on repeat bridges); adapter-specific. */
  approveAmount?: bigint;
  onProgress?: (p: BridgeInProgress) => void;
}

export interface BridgeInResult {
  tokenId: string;
  amount: bigint;
}

/** A transaction that was mined but reverted (distinguished from a timeout). */
export class TxRevertedError extends Error {}

/** Minimal hex decoder for the recipient pubkey (no chain-specific util imported). */
function fromHex(hex: string): Uint8Array {
  const s = hex.startsWith('0x') ? hex.slice(2) : hex;
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Run the full deposit → mint. Returns the minted token id. */
export async function runBridgeIn(args: BridgeInArgs): Promise<BridgeInResult> {
  const { sphere, wallet, receipts, adapter, expectedNetwork, chainLabel, store, amount, networkId } = args;
  const progress = args.onProgress ?? (() => {});
  const chainPubkey = sphere.identity?.chainPubkey;
  if (!chainPubkey) throw new Error('Wallet identity unavailable');

  progress({ phase: 'deriving' });

  // Connect once (08 §1.2) and pin {account, network}; verify the wallet is on
  // this bridge's chain BEFORE any signing (08 §1.3). The pin is re-checked live
  // before every signature below (08 §1.4).
  const owner = await wallet.connect();
  const network = await wallet.getNetwork();
  assertOnChain(network, expectedNetwork, chainLabel);

  const deposit = await adapter.prepareDeposit({
    amount,
    networkId,
    recipientPubkey: fromHex(chainPubkey),
    approveAmount: args.approveAmount,
  });

  // Persist the intent BEFORE any tx — fail-closed (08 §1.5): a commit whose salt
  // we couldn't record is unmintable, so refuse to sign rather than strand it.
  const lockRecord: PendingLock = {
    id: deposit.recovery.tokenIdHex,
    coinIdHex: deposit.recovery.coinIdHex,
    tokenTypeHex: deposit.recovery.tokenTypeHex,
    chainId: deposit.recovery.chainId,
    saltHex: deposit.recovery.saltHex,
    tokenIdHex: deposit.recovery.tokenIdHex,
    recipientCommitmentHex: deposit.recovery.recipientCommitmentHex,
    amount: amount.toString(),
    createdAt: Date.now(),
    status: 'locking',
  };
  if (!store.persistPendingLock(lockRecord)) {
    throw new Error('Could not save the pending bridge-in locally; not signing (the mint would be unrecoverable).');
  }

  let lockConfirmed = false;
  let commitTxid: string | undefined;
  try {
    // Run the opaque deposit steps in order. Guard {account, network} live before
    // every signature (08 §1.4); wait for a step's receipt when it demands it (an
    // approval); record the committing (lock) txid for recovery.
    for (let i = 0; i < deposit.steps.length; i++) {
      const step = deposit.steps[i];
      await guardUnchanged(wallet, owner, network, expectedNetwork, chainLabel);
      const isCommit = i === deposit.commitIndex;
      progress({ phase: step.awaitReceipt ? 'approving' : 'locking', message: step.label });
      const txid = await step.send();
      if (isCommit) {
        commitTxid = txid;
        // Mutate the local record too, not just the store — the catch below reads
        // lockRecord.lockTxid, and store.updateLock only touches the persisted copy.
        lockRecord.lockTxid = txid;
        store.updateLock(lockRecord.id, { lockTxid: txid });
      }
      if (step.awaitReceipt) {
        progress({ phase: 'approving', message: 'Waiting for confirmation…' });
        await waitForReceipt(receipts, txid, step.label);
      }
    }
    if (!commitTxid) throw new Error('The deposit produced no committing transaction.');

    progress({ phase: 'waiting-lock', lockTxid: commitTxid, message: 'Waiting for the lock to land in a block…' });
    const commit = await waitForCommit(receipts, commitTxid, adapter); // fast-fails on a mined revert
    lockConfirmed = true;
    store.updateLock(lockRecord.id, {
      status: 'locked',
      nonce: Number(commit.nonce),
      lockBlock: Number(commit.blockNumber),
      logIndex: commit.logIndex,
    });

    progress({ phase: 'minting', lockTxid: commitTxid, message: 'Minting the bridged token…' });
    const tokenId = await mint(sphere, adapter, { saltHex: lockRecord.saltHex, amount, commit, commitTxid });
    store.updateLock(lockRecord.id, { status: 'minted' });
    store.removeLock(lockRecord.id);

    progress({ phase: 'done', lockTxid: commitTxid });
    return { tokenId, amount };
  } catch (e) {
    // Terminal pending-record handling (08 §1.4). With no committed tx confirmed,
    // nothing is locked: drop the intent (retry starts fresh with a new salt) — or,
    // if a commit broadcast but is *known* reverted, mark it failed. A commit that
    // merely timed out is left as-is (it may still confirm; resume handles it). The
    // record is kept only once the mint failed AFTER a confirmed commit (resumable).
    if (!lockConfirmed) {
      if (lockRecord.lockTxid && e instanceof TxRevertedError) {
        store.updateLock(lockRecord.id, { status: 'failed' });
      } else if (!lockRecord.lockTxid) {
        store.removeLock(lockRecord.id);
      }
    }
    throw e;
  }
}

/** Resume a mint for a commit that already landed on-chain (crash recovery). */
export async function resumeBridgeMint(
  sphere: Sphere,
  adapter: BridgeSourceAdapter,
  receipts: ReceiptReader,
  store: BridgeStore,
  lock: PendingLock,
): Promise<BridgeInResult> {
  if (!lock.lockTxid) throw new Error('Pending lock has no lock txid — cannot resume');

  let commit: CommitInfo;
  try {
    commit = await waitForCommit(receipts, lock.lockTxid, adapter);
  } catch (e) {
    // A reverted commit never moved funds — mark it terminal so it stops surfacing
    // as a resumable pending mint (08 §1.4). A timeout stays pending to retry.
    if (e instanceof TxRevertedError) store.updateLock(lock.id, { status: 'failed' });
    throw e;
  }
  const amount = BigInt(lock.amount);
  const tokenId = await mint(sphere, adapter, { saltHex: lock.saltHex, amount, commit, commitTxid: lock.lockTxid });
  store.updateLock(lock.id, { status: 'minted' });
  store.removeLock(lock.id);
  return { tokenId, amount };
}

/** Assert a chainId matches the deposit's target chain, or throw a clear wrong-network error (08 §1.3). */
function assertOnChain(network: number, expected: number, chainLabel: string): void {
  if (network !== expected) {
    throw new Error(
      `Wrong network: your wallet is on chainId ${network}, but ${chainLabel} ` +
        `requires chainId ${expected}. Switch networks in your wallet and try again.`,
    );
  }
}

/**
 * Re-read the wallet's live {account, network} and compare to the values pinned
 * at flow start (08 §1.4). Called immediately before every signature so a
 * mid-flow account/network switch aborts rather than signing on the wrong
 * chain/account. The wallet's `getAddress`/`getNetwork` read live (no cache).
 */
async function guardUnchanged(
  wallet: ChainWallet,
  pinnedOwner: string,
  pinnedNetwork: number,
  expectedNetwork: number,
  chainLabel: string,
): Promise<void> {
  const [account, network] = await Promise.all([wallet.getAddress(), wallet.getNetwork()]);
  assertOnChain(network, expectedNetwork, chainLabel);
  if (network !== pinnedNetwork) {
    throw new Error('Your wallet network changed during the bridge-in. Re-open Bridge to try again.');
  }
  if (account !== pinnedOwner) {
    throw new Error('Your wallet account changed during the bridge-in. Re-open Bridge to try again.');
  }
}

/** Poll until `txid` is mined; return on success, throw on revert or timeout (08 §1.4). */
async function waitForReceipt(receipts: ReceiptReader, txid: string, label: string, timeoutMs = 90_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const info = await receipts.getReceipt(txid);
    if (info) {
      if (info.success) return;
      throw new TxRevertedError(`The ${label} transaction reverted. Please try again.`);
    }
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for the ${label} to confirm.`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

/**
 * Poll until the committing tx is mined and the adapter can decode its commit
 * event. Fast-fails on a mined revert (08 §1.4) — nothing is locked, no point
 * waiting out the timeout. The decode is the adapter's (chain-specific) concern.
 */
async function waitForCommit(
  receipts: ReceiptReader,
  txid: string,
  adapter: BridgeSourceAdapter,
  timeoutMs = 120_000,
): Promise<CommitInfo> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const info = await receipts.getReceipt(txid);
    if (info) {
      if (!info.success) {
        throw new TxRevertedError('The lock transaction reverted; nothing was locked.');
      }
      const commit = adapter.decodeCommit(info);
      if (commit) return commit;
    }
    if (Date.now() > deadline) {
      throw new Error('Timed out waiting for the lock to confirm.');
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

/** Hand the adapter-built mint request to the SDK (engine `confirmations: 0`). */
async function mint(
  sphere: Sphere,
  adapter: BridgeSourceAdapter,
  args: { saltHex: string; amount: bigint; commit: CommitInfo; commitTxid: string },
): Promise<string> {
  const result = await sphere.payments.bridgeMint(adapter.buildMintRequest(args));
  if (!result.success) throw new Error(result.error);
  return result.tokenId;
}
