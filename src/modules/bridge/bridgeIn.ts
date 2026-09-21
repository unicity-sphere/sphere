import {
  mintBridgedToken,
  type BridgePayments,
  type BridgeSourceAdapter,
  type ChainWallet,
  type CommitInfo,
  type ReceiptReader,
} from '@unicitylabs/bridge-core';

import type { BridgeStore, PendingLock } from './store';
import type { BridgeInDeps } from './types';

export type BridgeInPhase = 'deriving' | 'approving' | 'locking' | 'waiting-lock' | 'minting' | 'done';

export interface BridgeInProgress {
  readonly phase: BridgeInPhase;
  readonly lockTxid?: string;
  readonly message?: string;
}

export interface WalletSide {
  readonly payments: BridgePayments;
  readonly recipientPubkey: Uint8Array;
  readonly networkId: number;
  readonly store: BridgeStore;
}

export interface BridgeInArgs extends BridgeInDeps, WalletSide {
  readonly amount: bigint;
  readonly onProgress?: (p: BridgeInProgress) => void;
}

export interface BridgeInResult {
  readonly tokenId: string;
  readonly amount: bigint;
}

export class TxRevertedError extends Error {}

export async function runBridgeIn(args: BridgeInArgs): Promise<BridgeInResult> {
  const { wallet, receipts, adapter, expectedNetwork, chainLabel, payments, store, amount, networkId } = args;
  const progress = args.onProgress ?? (() => {});

  progress({ phase: 'deriving' });

  const owner = await wallet.connect();
  const network = await wallet.getNetwork();
  assertOnChain(network, expectedNetwork, chainLabel);

  const deposit = await adapter.prepareDeposit({
    amount,
    networkId,
    recipientPubkey: args.recipientPubkey,
  });

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
    for (let i = 0; i < deposit.steps.length; i++) {
      const step = deposit.steps[i];
      await guardUnchanged(wallet, owner, network, expectedNetwork, chainLabel);
      const isCommit = i === deposit.commitIndex;
      progress({ phase: step.awaitReceipt ? 'approving' : 'locking', message: step.label });
      const txid = await step.send();
      if (isCommit) {
        commitTxid = txid;
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
    const commit = await waitForCommit(receipts, commitTxid, adapter);
    lockConfirmed = true;
    store.updateLock(lockRecord.id, {
      status: 'locked',
      nonce: Number(commit.nonce),
      lockBlock: Number(commit.blockNumber),
      logIndex: commit.logIndex,
    });

    progress({ phase: 'minting', lockTxid: commitTxid, message: 'Minting the bridged token…' });
    const tokenId = await mint(payments, adapter, { saltHex: lockRecord.saltHex, amount, commit, commitTxid });
    store.updateLock(lockRecord.id, { status: 'minted' });
    store.removeLock(lockRecord.id);

    progress({ phase: 'done', lockTxid: commitTxid });
    return { tokenId, amount };
  } catch (e) {
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

export interface ResumeArgs {
  readonly payments: BridgePayments;
  readonly adapter: BridgeSourceAdapter;
  readonly receipts: ReceiptReader;
  readonly store: BridgeStore;
  readonly lock: PendingLock;
}

export async function resumeBridgeMint({ payments, adapter, receipts, store, lock }: ResumeArgs): Promise<BridgeInResult> {
  if (!lock.lockTxid) throw new Error('This pending deposit has no lock transaction; nothing to resume.');

  let commit: CommitInfo;
  try {
    commit = await waitForCommit(receipts, lock.lockTxid, adapter);
  } catch (e) {
    if (e instanceof TxRevertedError) store.updateLock(lock.id, { status: 'failed' });
    throw e;
  }
  const amount = BigInt(lock.amount);
  const tokenId = await mint(payments, adapter, { saltHex: lock.saltHex, amount, commit, commitTxid: lock.lockTxid });
  store.updateLock(lock.id, { status: 'minted' });
  store.removeLock(lock.id);
  return { tokenId, amount };
}

function assertOnChain(network: number, expected: number, chainLabel: string): void {
  if (network !== expected) {
    throw new Error(
      `Wrong network: your wallet is on chain ${network}, but ${chainLabel} needs chain ${expected}. ` +
        'Switch networks in your wallet and try again.',
    );
  }
}

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
    throw new Error('Your wallet network changed during the bridge-in. Open Bridge again to retry.');
  }
  if (account !== pinnedOwner) {
    throw new Error('Your wallet account changed during the bridge-in. Open Bridge again to retry.');
  }
}

const POLL_MS = 3000;

async function waitForReceipt(receipts: ReceiptReader, txid: string, label: string, timeoutMs = 90_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const info = await receipts.getReceipt(txid);
    if (info) {
      if (info.success) return;
      throw new TxRevertedError(`The "${label}" transaction reverted. Please try again.`);
    }
    if (Date.now() > deadline) throw new Error(`Timed out waiting for "${label}" to confirm.`);
    await sleep(POLL_MS);
  }
}

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
      if (!info.success) throw new TxRevertedError('The lock transaction reverted; nothing was locked.');
      const commit = adapter.decodeCommit(info);
      if (commit) return commit;
    }
    if (Date.now() > deadline) throw new Error('Timed out waiting for the lock to confirm.');
    await sleep(POLL_MS);
  }
}

async function mint(
  payments: BridgePayments,
  adapter: BridgeSourceAdapter,
  args: { saltHex: string; amount: bigint; commit: CommitInfo; commitTxid: string },
): Promise<string> {
  const result = await mintBridgedToken(payments, adapter.buildMintRequest(args));
  if (!result.success || !result.tokenId) throw new Error(result.error ?? 'The wallet refused the mint.');
  return result.tokenId;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
