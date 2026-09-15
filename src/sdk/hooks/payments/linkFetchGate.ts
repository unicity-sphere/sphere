import { useContext } from 'react';
import type { NftLink } from '@unicitylabs/sphere-sdk';
import { linkHostIsMinterChosen } from '../../../components/wallet/shared/nft/media';
import { NftLinkFetchContext, type NftLinkFetchPolicy } from '../../../components/wallet/shared/nft/linkFetch';

/** A link waiting for the user (#785): the host fetching it would reach, and how to ask for it. */
export interface LinkRequest {
  readonly host: string;
  readonly load: () => void;
}

export interface LinkFetchGate {
  /** Fetch as soon as the link is shown. */
  readonly automatic: boolean;
  /** The minter-chosen host a fetch would reach, when the link waits for the user; else null. */
  readonly host: string | null;
}

const CLOSED: LinkFetchGate = { automatic: false, host: null };
const OPEN: LinkFetchGate = { automatic: true, host: null };

/**
 * Whether a view fetches `link` from `url` on its own, or waits for the user: it
 * waits when the link's host is one its minter chose, unless the policy — `policy`
 * when given, else the nearest NftLinkFetchContext — is `automatic`.
 */
export function useLinkFetchGate(link: NftLink | null, url: string | null, policy?: NftLinkFetchPolicy): LinkFetchGate {
  const contextPolicy = useContext(NftLinkFetchContext);
  if (!link || url === null) return CLOSED;
  if ((policy ?? contextPolicy) === 'automatic' || !linkHostIsMinterChosen(link.uri)) return OPEN;
  return { automatic: false, host: new URL(url).host };
}

/** The part of a query result the gate reads. */
interface GatedQuery {
  readonly data: unknown;
  readonly isError: boolean;
  readonly fetchStatus: 'fetching' | 'paused' | 'idle';
  readonly refetch: () => Promise<unknown>;
}

/** A gated link the user has not asked for yet: nothing fetched, being fetched, or failed. */
export function waitsForUser(gate: LinkFetchGate, query: GatedQuery): boolean {
  return gate.host !== null && query.data === undefined && !query.isError && query.fetchStatus === 'idle';
}

/**
 * How the user asks for a gated link. Asking refetches the query every view of the
 * link watches, so each of them shows the answer.
 */
export function linkRequestOf(gate: LinkFetchGate, query: GatedQuery): LinkRequest | undefined {
  if (gate.host === null) return undefined;
  return {
    host: gate.host,
    load: () => {
      void query.refetch();
    },
  };
}
