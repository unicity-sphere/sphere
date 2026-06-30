/**
 * Bridge-in orchestration (06 §A1.1): derive → approve → lock → mint. Pure of
 * React; the hook (`useBridgeIn`) wraps it. The order is load-bearing — the lock
 * commits to a specific Unicity tokenId + recipient, and we then mint *that*
 * token. The minter trusts its own lock, so mint runs at `confirmations: 0` (no
 * K-wait). A {BridgeStore} persists the pending lock so a crash resumes the mint.
 */
import type { Sphere } from '@unicitylabs/sphere-sdk';
import {
  buildBridgeInPlan,
  decodeLockEvent,
  fromHex,
  TronHttpRpcClient,
  TronUsdtLockJustification,
  type LoadedBridge,
  type TronSigner,
} from '@unicitylabs/bridge-plugin-tron-usdt/lib/wallet/index.js';

import type { BridgeStore, PendingLock } from './store';

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

  progress({ phase: 'deriving' });
  const plan = await buildBridgeInPlan({
    plugin: bridge.plugin,
    amount,
    networkId,
    recipientPubkey: fromHex(chainPubkey),
    approveAmount: args.approveAmount,
  });

  // Persist the intent BEFORE any Tron tx, so a crash mid-lock is recoverable.
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
  store.persistPendingLock(lockRecord);

  progress({ phase: 'approving', message: 'Approve USDT on Tron…' });
  await signer.sendCall(plan.approve);

  progress({ phase: 'locking', message: 'Lock USDT on Tron…' });
  const lockTxid = await signer.sendCall(plan.lock);
  store.updateLock(lockRecord.id, { lockTxid });
  progress({ phase: 'waiting-lock', lockTxid, message: 'Waiting for the lock to land in a block…' });

  const lockEvent = await waitForLock(bridge, lockTxid);
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
}

/** Resume a mint for a lock that already landed on-chain (crash recovery). */
export async function resumeBridgeMint(
  sphere: Sphere,
  bridge: LoadedBridge,
  store: BridgeStore,
  lock: PendingLock,
): Promise<BridgeInResult> {
  if (!lock.lockTxid) throw new Error('Pending lock has no lock txid — cannot resume');
  const lockEvent = await waitForLock(bridge, lock.lockTxid);
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

/** Poll the Tron node until the lock tx is mined and its `Lock` event is found. */
async function waitForLock(bridge: LoadedBridge, lockTxid: string, timeoutMs = 120_000): Promise<LockEventInfo> {
  const rpc = new TronHttpRpcClient({ baseUrl: bridge.manifest.rpcUrl, apiKey: bridge.manifest.apiKey });
  const vaultHex = bridge.plugin.resolvedConfig.lockContractHex;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const info = await rpc.getTransactionInfo(lockTxid);
    if (info && info.success) {
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
  });
  if (!result.success) throw new Error(result.error);
  return result.tokenId;
}
