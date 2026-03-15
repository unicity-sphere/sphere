import { useQuery } from '@tanstack/react-query';
import { useSphereContext } from '../core/useSphere';
import { SPHERE_KEYS } from '../../queryKeys';

export interface Utxo {
  txid: string;
  vout: number;
  value: string;
  address: string;
  isVested: boolean;
}

export interface UseL1UtxosReturn {
  utxos: Utxo[];
  isLoading: boolean;
  error: Error | null;
  utxoCount: number;
  vestedUtxos: Utxo[];
  unvestedUtxos: Utxo[];
}

export function useL1Utxos(): UseL1UtxosReturn {
  const { adapter } = useSphereContext();

  const query = useQuery({
    queryKey: SPHERE_KEYS.l1.utxos,
    queryFn: async (): Promise<Utxo[]> => {
      if (!adapter) return [];
      const utxos = await adapter.l1GetUtxos();
      return utxos.map((u) => ({
        txid: u.txid,
        vout: u.vout,
        value: u.amount,
        address: u.address,
        isVested: u.isVested ?? false,
      }));
    },
    enabled: !!adapter,
    staleTime: 30_000,
  });

  const utxos = query.data ?? [];

  return {
    utxos,
    isLoading: query.isLoading,
    error: query.error,
    utxoCount: utxos.length,
    vestedUtxos: utxos.filter((u) => u.isVested),
    unvestedUtxos: utxos.filter((u) => !u.isVested),
  };
}
