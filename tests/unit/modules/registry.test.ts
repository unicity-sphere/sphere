import { describe, it, expect } from 'vitest';
import { NILE_USDT_BRIDGE } from '@unicitylabs/bridge-plugin-tron-usdt/wallet';

import { WALLET_MODULES, describeCoin, moduleActions, moduleTokenPlugins } from '@/modules/registry';

describe('wallet module registry', () => {
  it('discovers the bridge module by its folder', () => {
    expect(WALLET_MODULES.map((m) => m.id)).toContain('bridge');
  });

  it('collects one token plugin per bridged asset, carrying its strict verifier', () => {
    const plugins = moduleTokenPlugins();
    const bridge = plugins.find((p) => p.id === 'bridge:tron:0xcd8690dc:usdt');
    expect(bridge).toBeDefined();
    expect(bridge?.mintJustificationVerifiers).toHaveLength(1);
  });

  it('describes a bridged coin the token registry does not list', () => {
    const coinId = NILE_USDT_BRIDGE.coinIdHex!;
    expect(describeCoin(coinId)).toEqual({ symbol: 'USDT', name: NILE_USDT_BRIDGE.label, decimals: 6, badge: 'Tron', priceUsd: 1 });
    expect(describeCoin(coinId.toUpperCase())).toBeDefined();
    expect(describeCoin('00'.repeat(32))).toBeUndefined();
  });

  it('offers the bridge action on test networks only (the vault is a testnet vault)', () => {
    expect(moduleActions('testnet2').map((a) => a.id)).toContain('bridge');
    expect(moduleActions('mainnet').map((a) => a.id)).not.toContain('bridge');
  });
});

describe('bridge chains', () => {
  it('groups assets by source chain for the picker', async () => {
    const { bridgeChainsFor } = await import('@/modules/bridge/assets');
    expect(bridgeChainsFor('testnet2')).toEqual([
      { id: 'tron:0xcd8690dc', name: 'Tron', networkName: 'Nile testnet', testnet: true },
    ]);
    expect(bridgeChainsFor('mainnet')).toEqual([]);
  });
});

describe('module coin views', () => {
  it('shows a bridged asset the registry does not list as the module says, priced at its reference', async () => {
    const { moduleAssetView, moduleTokenView } = await import('@/modules/registry');
    const coinId = NILE_USDT_BRIDGE.coinIdHex!;
    const raw = {
      coinId, symbol: 'F16348', name: coinId, decimals: 0, totalAmount: '10000000', tokenCount: 1,
      confirmedAmount: '10000000', unconfirmedAmount: '0', confirmedTokenCount: 1, unconfirmedTokenCount: 0,
      transferringTokenCount: 0, transferringAmount: '0', priceUsd: null, priceEur: null, change24h: null,
      fiatValueUsd: null, fiatValueEur: null,
    };
    const view = moduleAssetView(raw);
    expect(view).toMatchObject({ symbol: 'USDT', name: NILE_USDT_BRIDGE.label, decimals: 6, priceUsd: 1, fiatValueUsd: 10 });

    expect(moduleAssetView({ ...raw, priceUsd: 0.99, fiatValueUsd: 9.9 })).toMatchObject({ priceUsd: 0.99, fiatValueUsd: 9.9 });

    const other = { ...raw, coinId: '00'.repeat(32) };
    expect(moduleAssetView(other)).toBe(other);

    expect(moduleTokenView({ id: 't', coinId, symbol: 'F16348', name: coinId, decimals: 0, amount: '10000000', status: 'confirmed', createdAt: 0, updatedAt: 0 }))
      .toMatchObject({ symbol: 'USDT', decimals: 6 });
  });
});
