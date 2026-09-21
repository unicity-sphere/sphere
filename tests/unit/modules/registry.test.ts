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
    expect(describeCoin(coinId)).toEqual({ symbol: 'USDT', name: NILE_USDT_BRIDGE.label, decimals: 6, badge: 'Tron' });
    expect(describeCoin(coinId.toUpperCase())).toBeDefined();
    expect(describeCoin('00'.repeat(32))).toBeUndefined();
  });

  it('offers the bridge action on test networks only (the vault is a testnet vault)', () => {
    expect(moduleActions('testnet2').map((a) => a.id)).toContain('bridge');
    expect(moduleActions('mainnet').map((a) => a.id)).not.toContain('bridge');
  });
});
