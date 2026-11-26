import { InclusionProofResponse } from '@unicitylabs/state-transition-sdk/lib/api/InclusionProofResponse.js';
import type { InclusionProof } from '@unicitylabs/state-transition-sdk/lib/api/InclusionProof.js';
import type { UnicityCertificate } from '@unicitylabs/state-transition-sdk/lib/api/bft/UnicityCertificate.js';
import {
  InclusionProofVerificationRule,
  InclusionProofVerificationStatus,
} from '@unicitylabs/state-transition-sdk/lib/transaction/verification/rule/InclusionProofVerificationRule.js';
import { hexToBytes } from '../certificate';
import type { AggregatorRecord } from '../types';
import { certificateChecks, fail, messageOf, pass, report, sameHex, summarize, type Stop } from './certificate';
import { decodePath, toHex } from './path';
import type { VerifyContext } from './trustBase';
import type { CertificateReport, Check, ProofReport } from './types';

/**
 * A commitment's inclusion proof, checked against what its block reported.
 *
 * The gateway answers against its LATEST certified root, so the proof's block
 * number and certificate are newer than the record's block. A "not included"
 * answer from a root older than the record's block is no evidence against the
 * record (a gateway can answer a block behind during a leader failover), so it
 * is reported as unchecked, never as failed.
 */
export async function inspectProof(ctx: VerifyContext, record: AggregatorRecord, blockIndex: number, proofHex: string): Promise<ProofReport> {
  let response: InclusionProofResponse;
  try {
    response = InclusionProofResponse.fromCBOR(hexToBytes(proofHex));
  } catch (error) {
    return empty(`The proof could not be decoded: ${messageOf(error)}`);
  }
  const answeredAtBlock = Number(response.blockNumber);
  try {
    const proof = response.inclusionProof;
    if (!proof) return await nonInclusion(ctx, response.unicityCertificate, answeredAtBlock, blockIndex);

    const certificate = await inspectCertificate(ctx, proof.unicityCertificate);
    const path = decodePath(proof.inclusionCertificate.encode());
    const base = { kind: 'inclusion' as const, answeredAtBlock, certificate, path };
    if (certificate.outcome === 'unchecked') {
      return { ...base, outcome: 'unchecked', reason: certificate.reason, checks: [] };
    }
    const matches = recordMatches(record, proof);
    const checks: Check[] = [matches.check];
    let stop: Stop = matches.stop;
    if (stop) {
      checks.push({ label: 'Inclusion proof', result: 'skipped' });
    } else {
      const cd = proof.certificationData;
      const result = await InclusionProofVerificationRule.verify(
        ctx.trustBase,
        ctx.predicateVerifier,
        ctx.certificateVerifier,
        proof,
        cd.transactionHash,
        cd.expiresAt,
        cd.lockScript,
        cd.sourceStateHash,
      );
      const verdict =
        result.status === InclusionProofVerificationStatus.OK
          ? pass('Inclusion proof', `the path leads from this state to the root certified at block ${answeredAtBlock}`)
          : fail('Inclusion proof', String(result.status));
      checks.push(verdict.check);
      stop = verdict.stop;
    }
    return { ...base, outcome: stop ? stop.outcome : 'verified', reason: stop ? stop.reason : null, checks };
  } catch (error) {
    return { ...empty(`The proof could not be checked: ${messageOf(error)}`), answeredAtBlock };
  }
}

async function nonInclusion(ctx: VerifyContext, uc: UnicityCertificate, answeredAtBlock: number, blockIndex: number): Promise<ProofReport> {
  const certificate = await inspectCertificate(ctx, uc);
  const base = { kind: 'non-inclusion' as const, answeredAtBlock, certificate, path: null, checks: [] };
  if (answeredAtBlock < blockIndex) {
    return { ...base, outcome: 'unchecked', reason: `The gateway answered from block ${answeredAtBlock}, before this commitment's block` };
  }
  return { ...base, outcome: 'failed', reason: `The gateway says this state is not in the tree at block ${answeredAtBlock}` };
}

/** The common certificate checks for a proof's certificate; it certifies a later root, so there is no block to bind it to. */
async function inspectCertificate(ctx: VerifyContext, uc: UnicityCertificate): Promise<CertificateReport> {
  const summary = summarize(uc);
  const { checks, stop } = await certificateChecks(ctx, uc);
  return report(checks, stop, summary);
}

/** What the block listed must be exactly what the proof certifies. */
function recordMatches(record: AggregatorRecord, proof: InclusionProof): { check: Check; stop: Stop } {
  const cd = proof.certificationData;
  const mismatches: string[] = [];
  if (!sameHex(toHex(cd.transactionHash.data), record.transactionHash)) mismatches.push('transaction hash');
  if (!sameHex(toHex(cd.sourceStateHash.data), record.sourceStateHash)) mismatches.push('source state hash');
  if (
    Number(cd.lockScript.engine) !== record.ownerPredicate.engine ||
    !sameBytes(cd.lockScript.encodeCode(), base64ToBytes(record.ownerPredicate.code)) ||
    !sameBytes(cd.lockScript.encodeParameters(), base64ToBytes(record.ownerPredicate.params))
  ) {
    mismatches.push('owner predicate');
  }
  const expiresAt = cd.expiresAt === null ? null : Number(cd.expiresAt);
  if (expiresAt !== record.expiresAt) mismatches.push('deadline');
  return mismatches.length === 0
    ? pass('Record matches proof', 'transaction, source state, owner and deadline are what the proof certifies')
    : fail('Record matches proof', `the block lists a different ${mismatches.join(', ')} than the proof certifies`);
}

function empty(reason: string): ProofReport {
  return { outcome: 'unchecked', reason, checks: [], kind: null, answeredAtBlock: null, certificate: null, path: null };
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, i) => byte === b[i]);
}
