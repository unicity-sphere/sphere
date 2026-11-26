import type { NetworkType } from '@unicitylabs/sphere-sdk';
import { createBrowserTrustBaseLoader } from '@unicitylabs/sphere-sdk/impl/browser';
import { RootTrustBase } from '@unicitylabs/state-transition-sdk/lib/api/bft/RootTrustBase.js';
import { UnicitySealQuorumSignaturesVerificationRule } from '@unicitylabs/state-transition-sdk/lib/api/bft/verification/rule/UnicitySealQuorumSignaturesVerificationRule.js';
import { UnicityCertificateVerifier } from '@unicitylabs/state-transition-sdk/lib/api/bft/verification/UnicityCertificateVerifier.js';
import { VerifiedSealCache } from '@unicitylabs/state-transition-sdk/lib/api/bft/verification/VerifiedSealCache.js';
import { Secp256k1SignatureVerifier } from '@unicitylabs/state-transition-sdk/lib/crypto/secp256k1/Secp256k1SignatureVerifier.js';
import { PredicateVerifierService } from '@unicitylabs/state-transition-sdk/lib/predicate/verification/PredicateVerifierService.js';
import type { TrustBaseInfo } from './types';

/** Everything a check needs: the trust base and the SDK verifiers built over it. */
export interface VerifyContext {
  readonly info: TrustBaseInfo;
  readonly trustBase: RootTrustBase;
  readonly quorumRule: UnicitySealQuorumSignaturesVerificationRule;
  readonly certificateVerifier: UnicityCertificateVerifier;
  readonly predicateVerifier: PredicateVerifierService;
}

export function verifyContextFromJson(json: unknown): VerifyContext {
  const trustBase = RootTrustBase.fromJSON(json);
  const quorumRule = new UnicitySealQuorumSignaturesVerificationRule(new Secp256k1SignatureVerifier(), new VerifiedSealCache(256));
  return {
    info: {
      networkId: trustBase.networkId.id,
      epoch: Number(trustBase.epoch),
      nodeIds: [...trustBase.rootNodes.keys()].sort(),
      quorum: Number(trustBase.quorumThreshold),
    },
    trustBase,
    quorumRule,
    certificateVerifier: new UnicityCertificateVerifier(quorumRule),
    predicateVerifier: PredicateVerifierService.create(),
  };
}

const contexts = new Map<NetworkType, Promise<VerifyContext>>();

/**
 * The trust base Sphere embeds for `network`: the same one the wallet verifies
 * payments against. Loaded once per network; a failed load is not cached.
 */
export function loadTrustBase(network: NetworkType): Promise<VerifyContext> {
  const cached = contexts.get(network);
  if (cached) return cached;
  const context = createBrowserTrustBaseLoader(network)
    .load()
    .then((json: unknown) => {
      if (!json) throw new Error(`Sphere has no trust base for ${network}`);
      return verifyContextFromJson(json);
    });
  context.catch(() => contexts.delete(network));
  contexts.set(network, context);
  return context;
}
