import { UnicityCertificate } from '@unicitylabs/state-transition-sdk/lib/api/bft/UnicityCertificate.js';
import { UnicitySealHashMatchesWithRootHashRule } from '@unicitylabs/state-transition-sdk/lib/api/bft/verification/rule/UnicitySealHashMatchesWithRootHashRule.js';
import { VerificationStatus } from '@unicitylabs/state-transition-sdk/lib/verification/VerificationStatus.js';
import { hexToBytes } from '../certificate';
import type { BlockDetail } from '../types';
import { toHex } from './path';
import type { VerifyContext } from './trustBase';
import type { CertificateReport, CertificateSummary, Check, Outcome } from './types';

/** How a run of checks ended: every check passed (`null`), or the outcome and reason it stopped on. */
export type Stop = { readonly outcome: Exclude<Outcome, 'verified'>; readonly reason: string } | null;

export function summarize(certificate: UnicityCertificate): CertificateSummary {
  const { inputRecord, unicitySeal: seal } = certificate;
  return {
    networkId: seal.networkId.id,
    rootRound: Number(seal.rootChainRoundNumber),
    epoch: Number(seal.epoch),
    shardId: certificate.shardTreeCertificate.shard.toString(),
    shardRound: Number(inputRecord.roundNumber),
    inputRecordHash: toHex(inputRecord.hash),
    previousHash: inputRecord.previousHash ? toHex(inputRecord.previousHash) : null,
    sealHash: toHex(seal.hash),
    sealedAt: Number(seal.timestamp),
    signers: [...(seal.signatures?.keys() ?? [])].sort(),
  };
}

/**
 * The checks every unicity certificate gets, in order: the network, the epoch,
 * that the seal covers this certificate, and the quorum. The first one that does
 * not pass ends the run; the rest are reported as skipped.
 *
 * A seal from a validator epoch this page has no keys for is not a failure: the
 * SDK would report it as one, so the epoch is compared before the quorum is checked.
 */
export async function certificateChecks(ctx: VerifyContext, certificate: UnicityCertificate): Promise<{ checks: Check[]; stop: Stop }> {
  const seal = certificate.unicitySeal;
  const signed = seal.signatures?.size ?? 0;
  const steps: { label: string; run: () => Promise<{ check: Check; stop: Stop }> }[] = [
    {
      label: 'Network',
      run: async () =>
        seal.networkId.id === ctx.info.networkId
          ? pass('Network', `network ${seal.networkId.id}`)
          : fail('Network', `sealed for network ${seal.networkId.id}, this trust base is network ${ctx.info.networkId}`),
    },
    {
      label: 'Epoch',
      run: async () => {
        if (Number(seal.epoch) === ctx.info.epoch) return pass('Epoch', `epoch ${ctx.info.epoch}`);
        const reason = `Signed by epoch ${seal.epoch}'s roots; this page has epoch ${ctx.info.epoch}'s keys`;
        return { check: { label: 'Epoch', result: 'skipped', detail: reason }, stop: { outcome: 'unchecked', reason } };
      },
    },
    {
      label: 'Seal covers this certificate',
      run: async () =>
        (await UnicitySealHashMatchesWithRootHashRule.verify(certificate)).status === VerificationStatus.OK
          ? pass('Seal covers this certificate')
          : fail('Seal covers this certificate', 'the unicity tree does not hash to the sealed root'),
    },
    {
      label: 'Quorum',
      run: async () => {
        const detail = `${signed} of ${ctx.info.nodeIds.length} roots signed, ${ctx.info.quorum} needed`;
        return (await ctx.quorumRule.verify(ctx.trustBase, seal)).status === VerificationStatus.OK
          ? pass('Quorum', detail)
          : fail('Quorum', `${detail}; the signatures do not make a quorum of this trust base`);
      },
    },
  ];
  return runSteps(steps);
}

/** A block's own certificate: the common checks, then that it certifies this block's root, for this block. */
export async function inspectBlockCertificate(ctx: VerifyContext, block: BlockDetail): Promise<CertificateReport> {
  if (!block.certificateHex) return { outcome: 'unchecked', reason: 'This block carries no unicity certificate', checks: [], summary: null };
  let certificate: UnicityCertificate;
  let summary: CertificateSummary;
  try {
    certificate = UnicityCertificate.fromCBOR(hexToBytes(block.certificateHex));
    summary = summarize(certificate);
  } catch (error) {
    return { outcome: 'unchecked', reason: `The certificate could not be decoded: ${messageOf(error)}`, checks: [], summary: null };
  }
  try {
    const common = await certificateChecks(ctx, certificate);
    const own = common.stop
      ? { checks: [skipped('Root hash'), skipped('This block')], stop: common.stop }
      : await runSteps([
          {
            label: 'Root hash',
            run: async () =>
              sameHex(summary.inputRecordHash, block.rootHash)
                ? pass('Root hash', 'the certificate certifies this block’s root')
                : fail('Root hash', `the certificate certifies ${summary.inputRecordHash}, the block reports ${block.rootHash}`),
          },
          { label: 'This block', run: async () => bindBlock(summary, block) },
        ]);
    return report([...common.checks, ...own.checks], own.stop, summary);
  } catch (error) {
    return { outcome: 'unchecked', reason: `The certificate could not be checked: ${messageOf(error)}`, checks: [], summary };
  }
}

function bindBlock(summary: CertificateSummary, block: BlockDetail): { check: Check; stop: Stop } {
  const mismatches: string[] = [];
  if (summary.shardId !== block.shardId) mismatches.push(`it is for shard ${summary.shardId}, not ${block.shardId}`);
  if (summary.shardRound !== block.index) mismatches.push(`it is for round ${summary.shardRound}, not ${block.index}`);
  if (summary.previousHash === null || !sameHex(summary.previousHash, block.previousBlockHash)) {
    mismatches.push('its previous root differs from the block’s previous hash');
  }
  return mismatches.length === 0
    ? pass('This block', `shard ${block.shardId}, round ${block.index}, previous root matches`)
    : fail('This block', mismatches.join('; '));
}

export async function runSteps(steps: { label: string; run: () => Promise<{ check: Check; stop: Stop }> }[]): Promise<{ checks: Check[]; stop: Stop }> {
  const checks: Check[] = [];
  let stop: Stop = null;
  for (const step of steps) {
    if (stop) {
      checks.push(skipped(step.label));
      continue;
    }
    const result = await step.run();
    checks.push(result.check);
    stop = result.stop;
  }
  return { checks, stop };
}

export function report(checks: Check[], stop: Stop, summary: CertificateSummary | null): CertificateReport {
  return stop ? { outcome: stop.outcome, reason: stop.reason, checks, summary } : { outcome: 'verified', reason: null, checks, summary };
}

export function pass(label: string, detail?: string): { check: Check; stop: Stop } {
  return { check: { label, result: 'pass', detail }, stop: null };
}

export function fail(label: string, detail: string): { check: Check; stop: Stop } {
  return { check: { label, result: 'fail', detail }, stop: { outcome: 'failed', reason: `${label}: ${detail}` } };
}

function skipped(label: string): Check {
  return { label, result: 'skipped' };
}

export function sameHex(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
