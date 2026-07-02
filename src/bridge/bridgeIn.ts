/**
 * Bridge-in orchestration (06 §A1.1): derive → approve → lock → mint. Pure of
 * React; the hook (`useBridgeIn`) wraps it. The order is load-bearing — the lock
 * commits to a specific Unicity tokenId + recipient, and we then mint *that*
 * token. The minter trusts its own lock, so mint runs at `confirmations: 0` (no
 * K-wait). A {BridgeStore} persists the pending lock so a crash resumes the mint.
 */
import type { Sphere } from '@unicitylabs/sphere-sdk';
import { spherePaymentAmountExtractor } from '@unicitylabs/sphere-sdk/token-engine';
import {
  buildBridgeInPlan,
  buildSelfMintVerifierService,
  fromHex,
  queryAllowance,
  type LoadedBridge,
  type TronSigner,
} from '@unicitylabs/bridge-plugin-tron-usdt/lib/wallet/index.js';
import {
  decodeLockEvent,
  TronHttpRpcClient,
  type TronConstantCaller,
  type TronRpc,
  TronUsdtLockJustification,
} from '@unicitylabs/bridge-plugin-tron-usdt';

import type { BridgeStore, PendingLock } from './store';

/**
 * The node-read surface bridge-in needs (08 "ChainClient" boundary): allowance
 * reads + tx receipts. `TronHttpRpcClient` satisfies it; tests inject a fake.
 */
export type BridgeInRpc = TronConstantCaller & Pick<TronRpc, 'getTransactionInfo'>;

export type BridgeInPhase =
  | 'deriving'
  | 'approving'
  | 'locking'
  | 'waiting-lock'
  | 'minting'
  | 'done';

export interface BridgeInProgress {
  phase: BridgeInPhase;
  /** Tron lock txid, once broadcast. */
  lockTxid?: string;
  message?: string;
}

export interface BridgeInArgs {
  sphere: Sphere;
  bridge: LoadedBridge;
  signer: TronSigner;
  store: BridgeStore;
  /** Amount in the asset's smallest unit. */
  amount: bigint;
  /** Unicity network id (e.g. testnet2 = 4). */
  networkId: number;
  /** One-time max approve (fewer prompts on repeat bridges). */
  approveAmount?: bigint;
  /** Node-read client (allowance + receipts). Defaults to a manifest-configured HTTP client; injectable for tests. */
  rpc?: BridgeInRpc;
  onProgress?: (p: BridgeInProgress) => void;
}

export interface BridgeInResult {
  tokenId: string;
  amount: bigint;
}

/** Run the full lock→mint. Returns the minted token id. */
export async function runBridgeIn(args: BridgeInArgs): Promise<BridgeInResult> {
  const { sphere, bridge, signer, store, amount, networkId } = args;
  const progress = args.onProgress ?? (() => {});
  const chainPubkey = sphere.identity?.chainPubkey;
  if (!chainPubkey) throw new Error('Wallet identity unavailable');

  const rpc: BridgeInRpc =
    args.rpc ?? new TronHttpRpcClient({ baseUrl: bridge.manifest.rpcUrl, apiKey: bridge.manifest.apiKey });

  progress({ phase: 'deriving' });
  const plan = await buildBridgeInPlan({
    plugin: bridge.plugin,
    amount,
    networkId,
    recipientPubkey: fromHex(chainPubkey),
    approveAmount: args.approveAmount,
  });

  // Connect once (08 §1.2) and pin {account, network}; verify the wallet is on
  // this bridge's chain BEFORE any signing (08 §1.3). The pin is re-checked live
  // before every signature below (08 §1.4).
  const owner = await signer.connect();
  const network = await signer.getNetwork();
  assertOnChain(network, bridge);

  // Persist the intent BEFORE any Tron tx — fail-closed (08 §1.5): a lock whose
  // salt we couldn't record is unmintable, so refuse to lock rather than strand it.
  const lockRecord: PendingLock = {
    id: plan.tokenIdHex,
    coinIdHex: bridge.plugin.coinIdHex,
    tokenTypeHex: bridge.plugin.tokenTypeHex,
    chainId: bridge.manifest.chainId,
    saltHex: plan.saltHex,
    tokenIdHex: plan.tokenIdHex,
    recipientCommitmentHex: plan.recipientCommitmentHex,
    amount: amount.toString(),
    createdAt: Date.now(),
    status: 'locking',
  };
  if (!store.persistPendingLock(lockRecord)) {
    throw new Error('Could not save the pending bridge-in locally; not locking (the mint would be unrecoverable).');
  }

  let lockConfirmed = false;
  try {
    // Skip the approval entirely when the vault's allowance already covers the
    // amount (08 §1.1) — a repeat bridge-in becomes a single `lock` prompt.
    if (await needsApproval(rpc, bridge, owner, amount)) {
      await guardUnchanged(signer, owner, network, bridge); // re-check right before signing
      progress({ phase: 'approving', message: 'Approve USDT on Tron…' });
      const approveTxid = await signer.sendCall(plan.approve);
      // Wait for the approval to land + succeed before locking (08 §1.4); a revert
      // throws here instead of degrading into a lock-not-found timeout.
      progress({ phase: 'approving', message: 'Waiting for the approval to confirm…' });
      await waitForReceipt(rpc, approveTxid, 'approval');
    }

    await guardUnchanged(signer, owner, network, bridge); // re-check right before the lock
    progress({ phase: 'locking', message: 'Lock USDT on Tron…' });
    const lockTxid = await signer.sendCall(plan.lock);
    // Mutate the local record too, not just the store — mintFromLock below reads
    // lock.lockTxid off this same object, and store.updateLock only updates the
    // store's own persisted copy.
    lockRecord.lockTxid = lockTxid;
    store.updateLock(lockRecord.id, { lockTxid });
    progress({ phase: 'waiting-lock', lockTxid, message: 'Waiting for the lock to land in a block…' });

    const lockEvent = await waitForLock(rpc, bridge, lockTxid); // fast-fails on a mined revert
    lockConfirmed = true;
    store.updateLock(lockRecord.id, {
      status: 'locked',
      nonce: Number(lockEvent.nonce),
      lockBlock: Number(lockEvent.blockNumber),
      logIndex: lockEvent.logIndex,
    });

    progress({ phase: 'minting', lockTxid, message: 'Minting the bridged token…' });
    const tokenId = await mintFromLock(sphere, bridge, lockRecord, lockEvent, amount);
    store.updateLock(lockRecord.id, { status: 'minted' });
    store.removeLock(lockRecord.id);

    progress({ phase: 'done', lockTxid });
    return { tokenId, amount };
  } catch (e) {
    // Terminal pending-record handling (08 §1.4). With no on-chain lock confirmed,
    // nothing is locked: drop the intent (retry starts fresh with a new salt) — or,
    // if a lock broadcast but is *known* reverted, mark it failed. A lock that
    // merely timed out is left as-is (it may still confirm; resume handles it). The
    // record is kept only once the mint failed AFTER a confirmed lock (resumable).
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

/** A transaction that was mined but reverted (distinguished from a timeout). */
export class TxRevertedError extends Error {}

/** Resume a mint for a lock that already landed on-chain (crash recovery). */
export async function resumeBridgeMint(
  sphere: Sphere,
  bridge: LoadedBridge,
  store: BridgeStore,
  lock: PendingLock,
  rpc?: BridgeInRpc,
): Promise<BridgeInResult> {
  if (!lock.lockTxid) throw new Error('Pending lock has no lock txid — cannot resume');
  const node =
    rpc ?? new TronHttpRpcClient({ baseUrl: bridge.manifest.rpcUrl, apiKey: bridge.manifest.apiKey });
  let lockEvent: LockEventInfo;
  try {
    lockEvent = await waitForLock(node, bridge, lock.lockTxid);
  } catch (e) {
    // A reverted lock never moved funds — mark it terminal so it stops surfacing
    // as a resumable pending mint (08 §1.4). A timeout stays pending to retry.
    if (e instanceof TxRevertedError) store.updateLock(lock.id, { status: 'failed' });
    throw e;
  }
  const amount = BigInt(lock.amount);
  const tokenId = await mintFromLock(sphere, bridge, lock, lockEvent, amount);
  store.updateLock(lock.id, { status: 'minted' });
  store.removeLock(lock.id);
  return { tokenId, amount };
}

interface LockEventInfo {
  nonce: bigint;
  blockNumber: bigint;
  logIndex: number;
}

/** Assert a chainId matches this bridge, or throw a clear wrong-network error (08 §1.3). */
function assertOnChain(network: number, bridge: LoadedBridge): void {
  const expected = bridge.manifest.chainId;
  if (network !== expected) {
    throw new Error(
      `Wrong Tron network: your wallet is on chainId ${network}, but ${bridge.manifest.label} ` +
        `requires chainId ${expected}. Switch networks in your wallet and try again.`,
    );
  }
}

/**
 * Re-read the wallet's live {account, network} and compare to the values pinned
 * at flow start (08 §1.4). Called immediately before every signature so a
 * mid-flow account/network switch aborts rather than signing on the wrong
 * chain/account. TronLink's `getAddress`/`getNetwork` read live (no cache).
 */
async function guardUnchanged(
  signer: TronSigner,
  pinnedOwner: string,
  pinnedNetwork: number,
  bridge: LoadedBridge,
): Promise<void> {
  const [account, network] = await Promise.all([signer.getAddress(), signer.getNetwork()]);
  assertOnChain(network, bridge);
  if (network !== pinnedNetwork) {
    throw new Error('Your wallet network changed during the bridge-in. Re-open Bridge to try again.');
  }
  if (account !== pinnedOwner) {
    throw new Error('Your wallet account changed during the bridge-in. Re-open Bridge to try again.');
  }
}

/**
 * True when an `approve` is still required (08 §1.1). Reads the current
 * `allowance(owner, vault)`; on a read failure, defaults to `true` (send the
 * approve) — a redundant approval is safe, a skipped-but-needed one is not.
 */
async function needsApproval(
  rpc: BridgeInRpc,
  bridge: LoadedBridge,
  owner: string,
  amount: bigint,
): Promise<boolean> {
  try {
    const allowance = await queryAllowance(rpc, {
      assetAddress: bridge.plugin.resolvedConfig.assetContractHex,
      owner,
      spender: bridge.plugin.resolvedConfig.lockContractHex,
    });
    return allowance < amount;
  } catch {
    return true;
  }
}

/** Poll until `txid` is mined; return on success, throw on revert or timeout (08 §1.4). */
async function waitForReceipt(rpc: BridgeInRpc, txid: string, label: string, timeoutMs = 90_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const info = await rpc.getTransactionInfo(txid);
    if (info) {
      if (info.success) return;
      throw new TxRevertedError(`The Tron ${label} transaction reverted. Please try again.`);
    }
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for the Tron ${label} to confirm.`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

/** Poll the Tron node until the lock tx is mined and its `Lock` event is found. */
async function waitForLock(
  rpc: BridgeInRpc,
  bridge: LoadedBridge,
  lockTxid: string,
  timeoutMs = 120_000,
): Promise<LockEventInfo> {
  const vaultHex = bridge.plugin.resolvedConfig.lockContractHex;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const info = await rpc.getTransactionInfo(lockTxid);
    if (info) {
      // Mined-but-reverted: fail fast (08 §1.4) — nothing is locked; no point
      // waiting out the timeout. Distinguished so the caller can mark it failed.
      if (!info.success) {
        throw new TxRevertedError('The Tron lock transaction reverted; nothing was locked.');
      }
      const logIndex = info.logs.findIndex((l) => l.address.toLowerCase() === vaultHex);
      const decoded = logIndex >= 0 ? decodeLockEvent(info.logs[logIndex]) : null;
      if (decoded) {
        return { nonce: decoded.nonce, blockNumber: info.blockNumber, logIndex };
      }
    }
    if (Date.now() > deadline) {
      throw new Error('Timed out waiting for the Tron lock to confirm.');
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

/** Build the lock justification and mint the bridged token (engine `confirmations: 0`). */
async function mintFromLock(
  sphere: Sphere,
  bridge: LoadedBridge,
  lock: PendingLock,
  event: LockEventInfo,
  amount: bigint,
): Promise<string> {
  const justification = new TronUsdtLockJustification({
    chainId: bridge.manifest.chainId,
    lockContract: fromHex(bridge.plugin.resolvedConfig.lockContractHex),
    assetContract: fromHex(bridge.plugin.resolvedConfig.assetContractHex),
    txid: fromHex(lock.lockTxid!),
    logIndex: event.logIndex,
    amount,
    nonce: event.nonce,
  }).toCBOR();

  const result = await sphere.payments.bridgeMint({
    coinIdHex: bridge.plugin.coinIdHex,
    amount,
    tokenType: bridge.plugin.resolvedConfig.tokenType,
    salt: fromHex(lock.saltHex),
    genesisReason: justification,
    // The minter trusts its own just-broadcast lock (06 §A1.1) — verify this
    // one genesis at confirmations:0 instead of the manifest's K=confirmations
    // threshold (which the shared bridgeJustificationVerifiers service still
    // enforces for every other verification).
    mintJustificationVerifierOverride: buildSelfMintVerifierService(bridge, {
      extractAmount: spherePaymentAmountExtractor,
    }),
  });
  if (!result.success) throw new Error(result.error);
  return result.tokenId;
}
