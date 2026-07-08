import { useQuery } from '@tanstack/react-query';
import { useSphereContext } from './useSphere';
import { SPHERE_KEYS } from '../../queryKeys';
import { truncateId } from '../../../utils/identifiers';
import type { Identity } from '@unicitylabs/sphere-sdk';

export interface UseIdentityReturn {
  identity: Identity | null;
  isLoading: boolean;
  error: Error | null;
  /** Internal keying only (sphere-api identity/XP) — do not render in UI outside My Public Keys. */
  directAddress: string | null;
  chainPubkey: string | null;
  nametag: string | null;
  displayName: string;
  shortAddress: string;
}

export function useIdentity(): UseIdentityReturn {
  const { sphere } = useSphereContext();

  const query = useQuery({
    queryKey: SPHERE_KEYS.identity.current,
    queryFn: () => sphere?.identity ? { ...sphere.identity } : null,
    enabled: !!sphere,
    staleTime: Infinity,
  });

  const identity = query.data ?? null;

  return {
    identity,
    isLoading: query.isLoading,
    error: query.error,
    directAddress: identity?.directAddress ?? null,
    chainPubkey: identity?.chainPubkey ?? null,
    nametag: identity?.nametag ?? null,
    displayName: identity?.nametag
      ? `@${identity.nametag}`
      : identity?.chainPubkey ? truncateId(identity.chainPubkey) : 'Unknown',
    shortAddress: identity?.chainPubkey ? truncateId(identity.chainPubkey) : '',
  };
}
