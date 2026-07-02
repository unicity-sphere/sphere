/**
 * Bridge-in orchestration (06 §A1.1; 08 Phase 4 abstraction). Chain-neutral: it
 * runs an ordered list of opaque {DepositStep}s produced by a {BridgeSourceAdapter},
 * guarding account/network before every signature, persisting recovery
 * fail-closed, waiting for the committing (lock) receipt, then minting. All
 * chain-specific detail — allowance/approve, event decode, mint justification —
 * lives behind the adapter, so a second chain (or a single-signature deposit)
 * flows through this unchanged. Pure of React; the hook (`useBridgeIn`) wraps it.
 */
import type { Sphere } from '@unicitylabs/sphere-sdk';
import { spherePaymentAmountExtractor } from '@unicitylabs/sphere-sdk/token-engine';
import {
  createTronSourceAdapter,
  fromHex,
  type BridgeSourceAdapter,
  type CommitInfo,
  type LoadedBridge,
  type TronSigner,
} from '@unicitylabs/bridge-plugin-tron-usdt/lib/wallet/index.js';
import {
  TronHttpRpcClient,
  type TronConstantCaller,
  type TronRpc,
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
  /** Committing (lock) txid, once broadcast. */
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
  /** Source adapter. Defaults to the Tron/USDT adapter for `bridge`; injectable for tests / other chains. */
  adapter?: BridgeSourceAdapter;
  onProgress?: (p: BridgeInProgress) => void;
}

export interface BridgeInResult {
  tokenId: string;
  amount: bigint;
}

/** A transaction that was mined but reverted (distinguished from a timeout). */
export class TxRevertedError extends Error {}

/** Run the full deposit → mint. Returns the minted token id. */
export async function runBridgeIn(args: BridgeInArgs): Promise<BridgeInResult> {
  const { sphere, bridge, signer, store, amount, networkId } = args;
  const progress = args.onProgress ?? (() => {});
  const chainPubkey = sphere.identity?.chainPubkey;
  if (!chainPubkey) throw new Error('Wallet identity unavailable');

  const rpc: BridgeInRpc =
    args.rpc ?? new TronHttpRpcClient({ baseUrl: bridge.manifest.rpcUrl, apiKey: bridge.manifest.apiKey });
  const adapter =
    args.adapter ?? createTronSourceAdapter(bridge, signer, rpc, { extractAmount: spherePaymentAmountExtractor });

  progress({ phase: 'deriving' });

  // Connect once (08 §1.2) and pin {account, network}; verify the wallet is on
  // this bridge's chain BEFORE any signing (08 §1.3). The pin is re-checked live
  // before every signature below (08 §1.4).
  const owner = await signer.connect();
  const network = await signer.getNetwork();
  assertOnChain(network, bridge);

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
      await guardUnchanged(signer, owner, network, bridge);
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
        await waitForReceipt(rpc, txid, step.label);
      }
    }
    if (!commitTxid) throw new Error('The deposit produced no committing transaction.');

    progress({ phase: 'waiting-lock', lockTxid: commitTxid, message: 'Waiting for the lock to land in a block…' });
    const commit = await waitForCommit(rpc, commitTxid, adapter); // fast-fails on a mined revert
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
  bridge: LoadedBridge,
  store: BridgeStore,
  lock: PendingLock,
  rpc?: BridgeInRpc,
): Promise<BridgeInResult> {
  if (!lock.lockTxid) throw new Error('Pending lock has no lock txid — cannot resume');
  const node =
    rpc ?? new TronHttpRpcClient({ baseUrl: bridge.manifest.rpcUrl, apiKey: bridge.manifest.apiKey });
  // Recovery never signs, so the adapter's wallet is a no-op; only decode + mint are used.
  const adapter = createTronSourceAdapter(bridge, RESUME_NOOP_WALLET, node, {
    extractAmount: spherePaymentAmountExtractor,
  });

  let commit: CommitInfo;
  try {
    commit = await waitForCommit(node, lock.lockTxid, adapter);
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

const RESUME_NOOP_WALLET = {
  getAddress: async () => '',
  sendCall: async (): Promise<string> => {
    throw new Error('resumeBridgeMint does not sign');
  },
};

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

/**
 * Poll until the committing tx is mined and the adapter can decode its commit
 * event. Fast-fails on a mined revert (08 §1.4) — nothing is locked, no point
 * waiting out the timeout. The decode is the adapter's (chain-specific) concern.
 */
async function waitForCommit(
  rpc: BridgeInRpc,
  txid: string,
  adapter: BridgeSourceAdapter,
  timeoutMs = 120_000,
): Promise<CommitInfo> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const info = await rpc.getTransactionInfo(txid);
    if (info) {
      if (!info.success) {
        throw new TxRevertedError('The Tron lock transaction reverted; nothing was locked.');
      }
      const commit = adapter.decodeCommit(info);
      if (commit) return commit;
    }
    if (Date.now() > deadline) {
      throw new Error('Timed out waiting for the Tron lock to confirm.');
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
