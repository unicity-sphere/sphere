import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { NetworkType } from '@unicitylabs/sphere-sdk';
import {
  isSwitchPromptSuppressed,
  suppressSwitchPrompt,
  clearSwitchPromptSuppression,
  getSuppressedOrigins,
} from '../../../src/utils/network-switch-prompts';
import {
  getApprovedOrigin,
  getApprovedOrigins,
  saveApprovedOrigin,
} from '../../../src/utils/connected-sites';
import { STORAGE_KEYS } from '../../../src/config/storageKeys';
import { SPHERE_NETWORK } from '../../../src/config/network';

// Mock localStorage — same harness as connected-sites.test.ts
let localStorageMock: Record<string, string>;

beforeEach(() => {
  localStorageMock = {};
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => localStorageMock[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      localStorageMock[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete localStorageMock[key];
    }),
    clear: vi.fn(() => { localStorageMock = {}; }),
    key: vi.fn((index: number) => Object.keys(localStorageMock)[index] ?? null),
    get length() { return Object.keys(localStorageMock).length; },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const KEY = STORAGE_KEYS.NETWORK_SWITCH_SUPPRESSED;
const ORIGIN = 'https://dapp.example';
const OTHER_ORIGIN = 'https://other.example';
const DAPP = { name: 'TestDApp', url: ORIGIN };
const PERMISSIONS = ['identity:read', 'balance:read'] as unknown as import('@unicitylabs/sphere-sdk/connect').PermissionScope[];

/** A well-formed persisted store holding one muted target for `origin`. */
function storeWith(origin: string, target: string, network: string = SPHERE_NETWORK): string {
  return JSON.stringify({
    v: 1,
    byNetwork: { [network]: { [origin]: { targets: { [target]: { at: 1 } } } } },
  });
}

// ==========================================
// Basic behaviour
// ==========================================

describe('isSwitchPromptSuppressed', () => {
  it('is false when nothing has been recorded', () => {
    expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(false);
  });

  it('is true after suppressSwitchPrompt for that origin and target', () => {
    suppressSwitchPrompt(ORIGIN, 'mainnet');
    expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(true);
  });

  it('is NOT true for a different target of the same origin', () => {
    // "Stop offering mainnet" is not "stop offering testnet2".
    suppressSwitchPrompt(ORIGIN, 'mainnet');
    expect(isSwitchPromptSuppressed(ORIGIN, 'testnet2')).toBe(false);
  });

  it('is NOT true for a different origin with the same target', () => {
    suppressSwitchPrompt(ORIGIN, 'mainnet');
    expect(isSwitchPromptSuppressed(OTHER_ORIGIN, 'mainnet')).toBe(false);
  });

  it('keeps two targets of one origin independent', () => {
    suppressSwitchPrompt(ORIGIN, 'mainnet');
    suppressSwitchPrompt(ORIGIN, 'testnet2');
    expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(true);
    expect(isSwitchPromptSuppressed(ORIGIN, 'testnet2')).toBe(true);
  });
});

describe('suppressSwitchPrompt', () => {
  it('persists the documented versioned, per-network shape', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234);
    suppressSwitchPrompt(ORIGIN, 'mainnet');

    expect(JSON.parse(localStorageMock[KEY])).toEqual({
      v: 1,
      byNetwork: {
        [SPHERE_NETWORK]: { [ORIGIN]: { targets: { mainnet: { at: 1234 } } } },
      },
    });
  });

  it('is idempotent and keeps the time the user first muted it', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    suppressSwitchPrompt(ORIGIN, 'mainnet');
    now.mockReturnValue(9000);
    suppressSwitchPrompt(ORIGIN, 'mainnet');

    expect(getSuppressedOrigins()).toEqual({ [ORIGIN]: ['mainnet'] });
    expect(JSON.parse(localStorageMock[KEY]).byNetwork[SPHERE_NETWORK][ORIGIN].targets.mainnet.at).toBe(1000);
  });
});

describe('clearSwitchPromptSuppression', () => {
  it('removes the suppression, for every target of that origin', () => {
    suppressSwitchPrompt(ORIGIN, 'mainnet');
    suppressSwitchPrompt(ORIGIN, 'testnet2');

    clearSwitchPromptSuppression(ORIGIN);

    expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(false);
    expect(isSwitchPromptSuppressed(ORIGIN, 'testnet2')).toBe(false);
    expect(getSuppressedOrigins()).toEqual({});
  });

  it('leaves other origins alone', () => {
    suppressSwitchPrompt(ORIGIN, 'mainnet');
    suppressSwitchPrompt(OTHER_ORIGIN, 'mainnet');

    clearSwitchPromptSuppression(ORIGIN);

    expect(isSwitchPromptSuppressed(OTHER_ORIGIN, 'mainnet')).toBe(true);
  });

  it('is a no-op, and does not even write, for an unknown origin', () => {
    localStorageMock[KEY] = storeWith(ORIGIN, 'mainnet');

    clearSwitchPromptSuppression(OTHER_ORIGIN);

    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(true);
  });
});

describe('getSuppressedOrigins', () => {
  it('returns an empty object when nothing is recorded', () => {
    expect(getSuppressedOrigins()).toEqual({});
  });

  it('maps each origin to its muted targets', () => {
    suppressSwitchPrompt(ORIGIN, 'mainnet');
    suppressSwitchPrompt(ORIGIN, 'testnet2');
    suppressSwitchPrompt(OTHER_ORIGIN, 'mainnet');

    expect(getSuppressedOrigins()).toEqual({
      [ORIGIN]: ['mainnet', 'testnet2'],
      [OTHER_ORIGIN]: ['mainnet'],
    });
  });
});

// ==========================================
// Network scoping
// ==========================================

/**
 * A refusal is scoped by network for the same reason an approval is (#497
 * item 1): what the user decided about one network says nothing about another.
 * A wallet that muted "switch me to mainnet" while it ran on testnet2 has not
 * muted it for the mainnet wallet, where the switch is a different decision.
 *
 * Same shape as the per-network control in connected-sites.test.ts, and for
 * the same reason it is the only shape that can catch the bug: write under ONE
 * network, read back under ANOTHER. SPHERE_NETWORK is resolved at module scope,
 * so switching networks means re-importing the module under a different runtime
 * config while the localStorage mock survives — the real upgrade path.
 */
describe('suppressions are scoped to the network they were made on', () => {
  const MAINNET_LIVE = {
    DEFAULT_NETWORK: 'mainnet',
    WALLET_API_URL_MAINNET: 'https://wallet-api.example',
    SUBSCRIPTION_ENABLED: 'true',
    MAINNET_ROLLOUT_ENABLED: 'true',
  };

  const load = async (
    runtime: Record<string, string> | null,
    expectedNetwork: NetworkType,
  ): Promise<typeof import('../../../src/utils/network-switch-prompts')> => {
    (window as unknown as { __SPHERE_RUNTIME_CONFIG__?: unknown }).__SPHERE_RUNTIME_CONFIG__ =
      runtime ?? {};
    vi.resetModules();
    const mod = await import('../../../src/utils/network-switch-prompts');
    // Guard against a vacuous test: if both loads resolved to the same network,
    // "does not leak" and "keeps each network's own" would prove nothing.
    const { SPHERE_NETWORK: active } = await import('../../../src/config/network');
    expect(active).toBe(expectedNetwork);
    return mod;
  };

  afterEach(() => {
    delete (window as unknown as { __SPHERE_RUNTIME_CONFIG__?: unknown }).__SPHERE_RUNTIME_CONFIG__;
  });

  it('does not leak a suppression across networks', async () => {
    // Suppress on testnet2, then re-load the module as a mainnet wallet. The
    // record is keyed per network for the same reason approvals are: a decision
    // the user made about one network says nothing about the other.
    const onTestnet = await load(null, 'testnet2');
    onTestnet.suppressSwitchPrompt(ORIGIN, 'mainnet');
    expect(onTestnet.isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(true);

    const onMainnet = await load(MAINNET_LIVE, 'mainnet');

    expect(onMainnet.isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(false);
    expect(onMainnet.isSwitchPromptSuppressed(ORIGIN, 'testnet2')).toBe(false);
    expect(onMainnet.getSuppressedOrigins()).toEqual({});
  });

  it("keeps each network's own record — switching back finds the original", async () => {
    const onTestnet = await load(null, 'testnet2');
    onTestnet.suppressSwitchPrompt(ORIGIN, 'mainnet');

    const onMainnet = await load(MAINNET_LIVE, 'mainnet');
    onMainnet.suppressSwitchPrompt(ORIGIN, 'testnet2');
    expect(onMainnet.isSwitchPromptSuppressed(ORIGIN, 'testnet2')).toBe(true);
    expect(onMainnet.isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(false);

    const backOnTestnet = await load(null, 'testnet2');
    expect(backOnTestnet.isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(true);
    expect(backOnTestnet.isSwitchPromptSuppressed(ORIGIN, 'testnet2')).toBe(false);
  });

  it("clearing on one network leaves the other network's record alone", async () => {
    const onTestnet = await load(null, 'testnet2');
    onTestnet.suppressSwitchPrompt(ORIGIN, 'mainnet');
    const onMainnet = await load(MAINNET_LIVE, 'mainnet');
    onMainnet.suppressSwitchPrompt(ORIGIN, 'testnet2');

    onMainnet.clearSwitchPromptSuppression(ORIGIN);
    expect(onMainnet.isSwitchPromptSuppressed(ORIGIN, 'testnet2')).toBe(false);

    const backOnTestnet = await load(null, 'testnet2');
    expect(backOnTestnet.isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(true);
  });
});

// ==========================================
// Separation from the approval store
// ==========================================

/**
 * An approval is consent to act; this record is a refusal to be asked. They say
 * opposite things, so a bug that read one as the other would silently approve an
 * origin the user pushed away. The only structural defence is that they share
 * nothing — these pin that, in both directions.
 */
describe('the record is separate from the Connect approval store', () => {
  it('lives under its own storage key', () => {
    expect(STORAGE_KEYS.NETWORK_SWITCH_SUPPRESSED).not.toBe(STORAGE_KEYS.CONNECTED_SITES);
  });

  it('a suppression is never readable as an approval', () => {
    suppressSwitchPrompt(ORIGIN, 'mainnet');

    expect(localStorageMock[STORAGE_KEYS.CONNECTED_SITES]).toBeUndefined();
    expect(getApprovedOrigins()).toEqual({});
    expect(getApprovedOrigin(ORIGIN)).toBeNull();
  });

  it('an approval is never readable as a suppression', () => {
    saveApprovedOrigin(ORIGIN, DAPP, PERMISSIONS);

    expect(localStorageMock[KEY]).toBeUndefined();
    expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(false);
    expect(getSuppressedOrigins()).toEqual({});
  });

  it("suppressing and clearing never touch the approval store's bytes", () => {
    saveApprovedOrigin(ORIGIN, DAPP, PERMISSIONS);
    const before = localStorageMock[STORAGE_KEYS.CONNECTED_SITES];

    suppressSwitchPrompt(ORIGIN, 'mainnet');
    clearSwitchPromptSuppression(ORIGIN);

    expect(localStorageMock[STORAGE_KEYS.CONNECTED_SITES]).toBe(before);
    expect(getApprovedOrigin(ORIGIN)).not.toBeNull();
  });

  it('ignores a suppression-shaped record planted under the approval key', () => {
    localStorageMock[STORAGE_KEYS.CONNECTED_SITES] = storeWith(ORIGIN, 'mainnet');

    expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(false);
    // The direction that would GRANT something: the same bytes must not read as
    // an approval either. Asserting only the line above proves the safe half.
    expect(getApprovedOrigin(ORIGIN)).toBeNull();
    expect(getApprovedOrigins()).toEqual({});
  });

  describe('approval-shaped bytes planted under the suppression key', () => {
    /** The exact bytes a real approval writes, lifted out from under its own key. */
    const realApprovalBytes = (): string => {
      saveApprovedOrigin(ORIGIN, DAPP, PERMISSIONS);
      const bytes = localStorageMock[STORAGE_KEYS.CONNECTED_SITES];
      delete localStorageMock[STORAGE_KEYS.CONNECTED_SITES];
      return bytes;
    };

    // Two plants, because two independent checks each refuse an approval: its
    // version (2, not 1) and its shape (no `targets`, no `at`). The second plant
    // relabels the record `v: 1` so the version check is out of the picture and
    // the shape check has to hold on its own.
    const PLANTS: Array<[string, () => string]> = [
      ['exactly as an approval writes them', realApprovalBytes],
      ['inside a v1 envelope', () => JSON.stringify({ ...JSON.parse(realApprovalBytes()), v: 1 })],
    ];

    for (const [name, plant] of PLANTS) {
      it(`reads nothing from approval records ${name}`, () => {
        localStorageMock[KEY] = plant();

        expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(false);
        expect(isSwitchPromptSuppressed(ORIGIN, 'testnet2')).toBe(false);
        expect(getSuppressedOrigins()).toEqual({});
      });
    }
  });
});

// ==========================================
// Degrades quietly
// ==========================================

/**
 * The real failure: with site data blocked, merely READING window.localStorage
 * throws a SecurityError — the getter throws, not just getItem.
 */
function blockLocalStorage(): void {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    },
  });
}

/** localStorage that reads fine but refuses every write (quota, write-protected). */
function failWrites(): void {
  vi.mocked(localStorage.setItem).mockImplementation(() => {
    throw new DOMException('quota', 'QuotaExceededError');
  });
}

/** localStorage whose reads throw while writes would still succeed. */
function failReads(): void {
  vi.mocked(localStorage.getItem).mockImplementation(() => {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  });
}

describe('a blocked localStorage degrades to "not suppressed"', () => {
  beforeEach(blockLocalStorage);

  it('is really blocked (control for the tests below)', () => {
    expect(() => localStorage.getItem('x')).toThrow();
  });

  it('isSwitchPromptSuppressed answers false without throwing', () => {
    expect(() => isSwitchPromptSuppressed(ORIGIN, 'mainnet')).not.toThrow();
    expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(false);
  });

  it('getSuppressedOrigins answers {} without throwing', () => {
    expect(getSuppressedOrigins()).toEqual({});
  });

  it('suppress and clear swallow the failure', () => {
    expect(() => suppressSwitchPrompt(ORIGIN, 'mainnet')).not.toThrow();
    expect(() => clearSwitchPromptSuppression(ORIGIN)).not.toThrow();
    // Nothing could be stored, so the user is simply asked again next time.
    expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(false);
  });
});

describe('a full or write-protected localStorage does not break suppression', () => {
  it('suppressSwitchPrompt swallows a throwing setItem', () => {
    failWrites();

    expect(() => suppressSwitchPrompt(ORIGIN, 'mainnet')).not.toThrow();
    expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(false);
  });

  it('clearSwitchPromptSuppression swallows a throwing setItem', () => {
    localStorageMock[KEY] = storeWith(ORIGIN, 'mainnet');
    failWrites();

    expect(() => clearSwitchPromptSuppression(ORIGIN)).not.toThrow();
  });
});

// ==========================================
// The writes say whether they landed
// ==========================================

/**
 * Failing toward "ask again" is the right direction, but the caller must be able
 * to know: a user who has just clicked "never ask again" and is asked again a
 * minute later, with nothing visibly wrong, has been lied to. `true` means the
 * store now holds what was asked for — including "it already did".
 */
describe('the writes report whether they landed', () => {
  describe('suppressSwitchPrompt', () => {
    it('returns true once the mute is stored', () => {
      expect(suppressSwitchPrompt(ORIGIN, 'mainnet')).toBe(true);
      expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(true);
    });

    it('returns true, without writing, when it was already muted', () => {
      localStorageMock[KEY] = storeWith(ORIGIN, 'mainnet');

      expect(suppressSwitchPrompt(ORIGIN, 'mainnet')).toBe(true);
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('returns false when the write is refused, and nothing is remembered', () => {
      failWrites();

      expect(suppressSwitchPrompt(ORIGIN, 'mainnet')).toBe(false);
      expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(false);
    });

    it('returns false when localStorage is blocked', () => {
      blockLocalStorage();

      expect(suppressSwitchPrompt(ORIGIN, 'mainnet')).toBe(false);
    });

    it('returns false, and overwrites nothing, when the store cannot be read', () => {
      // Reads fail but writes would go through: writing now would replace
      // records it could not see with a store holding only this one mute.
      localStorageMock[KEY] = storeWith(OTHER_ORIGIN, 'mainnet');
      const before = localStorageMock[KEY];
      failReads();

      expect(suppressSwitchPrompt(ORIGIN, 'mainnet')).toBe(false);
      expect(localStorage.setItem).not.toHaveBeenCalled();
      expect(localStorageMock[KEY]).toBe(before);
    });

    it('a refused second target reports false and leaves the first mute standing', () => {
      suppressSwitchPrompt(ORIGIN, 'mainnet');
      failWrites();

      expect(suppressSwitchPrompt(ORIGIN, 'testnet2')).toBe(false);
      expect(isSwitchPromptSuppressed(ORIGIN, 'testnet2')).toBe(false);
      expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(true);
    });
  });

  describe('clearSwitchPromptSuppression', () => {
    it('returns true once the mute is removed', () => {
      suppressSwitchPrompt(ORIGIN, 'mainnet');

      expect(clearSwitchPromptSuppression(ORIGIN)).toBe(true);
      expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(false);
    });

    it('returns true, without writing, when nothing was muted', () => {
      localStorageMock[KEY] = storeWith(ORIGIN, 'mainnet');

      expect(clearSwitchPromptSuppression(OTHER_ORIGIN)).toBe(true);
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('returns false when the removal is refused — and the mute still stands', () => {
      // The serious direction: the user asked for this origin to be heard from
      // again, and it stays silenced.
      localStorageMock[KEY] = storeWith(ORIGIN, 'mainnet');
      failWrites();

      expect(clearSwitchPromptSuppression(ORIGIN)).toBe(false);
      expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(true);
    });

    it('returns false when localStorage is blocked', () => {
      blockLocalStorage();

      expect(clearSwitchPromptSuppression(ORIGIN)).toBe(false);
    });

    it('returns false, not "already clear", when the store cannot be read', () => {
      // Unreadable is not empty: a mute may be standing that it cannot see.
      localStorageMock[KEY] = storeWith(ORIGIN, 'mainnet');
      const before = localStorageMock[KEY];
      failReads();

      expect(clearSwitchPromptSuppression(ORIGIN)).toBe(false);
      expect(localStorage.setItem).not.toHaveBeenCalled();
      expect(localStorageMock[KEY]).toBe(before);
    });
  });
});

describe('a corrupt persisted value is discarded, not trusted', () => {
  it('unparseable JSON reads as "not suppressed"', () => {
    localStorageMock[KEY] = '{invalid json';

    expect(() => isSwitchPromptSuppressed(ORIGIN, 'mainnet')).not.toThrow();
    expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(false);
    expect(getSuppressedOrigins()).toEqual({});
  });

  it('is replaced by a good store on the next suppression', () => {
    localStorageMock[KEY] = '{invalid json';

    suppressSwitchPrompt(ORIGIN, 'mainnet');

    expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(true);
    expect(JSON.parse(localStorageMock[KEY]).v).toBe(1);
  });

  const WRONG_STORES: Array<[string, unknown]> = [
    ['null', null],
    ['a string', 'suppressed'],
    ['a bare array of origins', [ORIGIN]],
    ['a flat origin record with no version', { [ORIGIN]: { targets: { mainnet: { at: 1 } } } }],
    ['a version this code does not know', {
      v: 2,
      byNetwork: { [SPHERE_NETWORK]: { [ORIGIN]: { targets: { mainnet: { at: 1 } } } } },
    }],
    ['byNetwork as an array', { v: 1, byNetwork: [] }],
    ['byNetwork missing', { v: 1 }],
  ];

  for (const [name, wrong] of WRONG_STORES) {
    it(`does not honour ${name}`, () => {
      localStorageMock[KEY] = JSON.stringify(wrong);

      expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(false);
      expect(getSuppressedOrigins()).toEqual({});
      expect(() => suppressSwitchPrompt(ORIGIN, 'mainnet')).not.toThrow();
      expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(true);
    });
  }

  // Writing through a primitive bucket throws under ESM strict mode, which would
  // take the whole prompt flow down (connected-sites.test.ts, Copilot #498).
  for (const bad of [5, 'nonsense', [1, 2], true, null] as const) {
    it(`suppressSwitchPrompt survives a ${JSON.stringify(bad)} bucket`, () => {
      localStorageMock[KEY] = JSON.stringify({ v: 1, byNetwork: { [SPHERE_NETWORK]: bad } });

      expect(() => suppressSwitchPrompt(ORIGIN, 'mainnet')).not.toThrow();
      expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(true);
    });
  }

  it("drops only the unusable bucket, never a sibling network's record", () => {
    localStorageMock[KEY] = JSON.stringify({
      v: 1,
      byNetwork: {
        [SPHERE_NETWORK]: { [ORIGIN]: { targets: { mainnet: { at: 1 } } } },
        'some-other-network': 42,
      },
    });

    expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(true);
  });

  const BAD_ENTRIES: Array<[string, unknown]> = [
    ['a number', 5],
    ['a string', 'x'],
    ['null', null],
    ['an array', [1]],
    ['no targets', {}],
    ['targets as a number', { targets: 5 }],
    ['targets as an array', { targets: ['mainnet'] }],
    ['empty targets', { targets: {} }],
    ['a target that is just true', { targets: { mainnet: true } }],
    ['a target with no timestamp', { targets: { mainnet: {} } }],
    ['a target with a non-numeric timestamp', { targets: { mainnet: { at: 'now' } } }],
    ['a target with a null timestamp', { targets: { mainnet: { at: null } } }],
  ];

  for (const [name, bad] of BAD_ENTRIES) {
    it(`discards an origin entry that is ${name}, keeping its healthy neighbour`, () => {
      localStorageMock[KEY] = JSON.stringify({
        v: 1,
        byNetwork: {
          [SPHERE_NETWORK]: {
            [ORIGIN]: bad,
            [OTHER_ORIGIN]: { targets: { mainnet: { at: 1 } } },
          },
        },
      });

      expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(false);
      expect(getSuppressedOrigins()).toEqual({ [OTHER_ORIGIN]: ['mainnet'] });
    });
  }

  it('keeps the valid targets of an entry that also holds an invalid one', () => {
    localStorageMock[KEY] = JSON.stringify({
      v: 1,
      byNetwork: {
        [SPHERE_NETWORK]: { [ORIGIN]: { targets: { mainnet: { at: 1 }, testnet2: true } } },
      },
    });

    expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(true);
    expect(isSwitchPromptSuppressed(ORIGIN, 'testnet2')).toBe(false);
    expect(getSuppressedOrigins()).toEqual({ [ORIGIN]: ['mainnet'] });
  });
});

// ==========================================
// Keys that are also prototype properties
// ==========================================

/**
 * The origin arrives from a dApp. On a plain object, `bucket['__proto__'] = x`
 * re-parents the bucket instead of storing a key, and `bucket['constructor']`
 * reads a real function; both would make the record lie about what was stored.
 */
describe('origins and targets named like prototype properties', () => {
  const INHERITED = ['constructor', 'toString', 'hasOwnProperty', 'valueOf', '__proto__'];

  // With NO record written there is nothing for an inherited-property read to
  // trip over — the network bucket is simply absent — so these need a record
  // first. Against plain-object dictionaries, a bucket read of 'constructor'
  // yields the Object function and `.targets[target]` on it throws a TypeError,
  // and a target read of 'constructor' yields that function too: a phantom
  // "never ask" for something the user never muted.
  describe('with a record already stored', () => {
    beforeEach(() => {
      suppressSwitchPrompt(ORIGIN, 'mainnet');
      // Control: the record really is there, so the reads below have a bucket.
      expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(true);
    });

    for (const name of INHERITED) {
      it(`origin "${name}" is not suppressed and does not throw`, () => {
        expect(() => isSwitchPromptSuppressed(name, 'mainnet')).not.toThrow();
        expect(isSwitchPromptSuppressed(name, 'mainnet')).toBe(false);
      });

      it(`target "${name}" is not suppressed for a real origin, and does not throw`, () => {
        expect(() => isSwitchPromptSuppressed(ORIGIN, name as NetworkType)).not.toThrow();
        expect(isSwitchPromptSuppressed(ORIGIN, name as NetworkType)).toBe(false);
      });
    }

    it('clearing an inherited-property origin is a no-op that does not write', () => {
      vi.mocked(localStorage.setItem).mockClear();

      expect(clearSwitchPromptSuppression('constructor')).toBe(true);
      expect(localStorage.setItem).not.toHaveBeenCalled();
      expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(true);
    });

    it('suppressing an inherited-property origin leaves the existing record intact', () => {
      expect(() => suppressSwitchPrompt('constructor', 'mainnet')).not.toThrow();

      expect(isSwitchPromptSuppressed('constructor', 'mainnet')).toBe(true);
      expect(isSwitchPromptSuppressed(ORIGIN, 'mainnet')).toBe(true);
    });
  });

  it('round-trip through storage when actually suppressed', () => {
    suppressSwitchPrompt('__proto__', 'mainnet');
    suppressSwitchPrompt(ORIGIN, '__proto__' as NetworkType);

    expect(isSwitchPromptSuppressed('__proto__', 'mainnet')).toBe(true);
    expect(isSwitchPromptSuppressed(ORIGIN, '__proto__' as NetworkType)).toBe(true);
    // ...without leaking into unrelated origins or the global prototype.
    expect(isSwitchPromptSuppressed(OTHER_ORIGIN, 'mainnet')).toBe(false);
    expect(({} as Record<string, unknown>).targets).toBeUndefined();
    expect(Object.keys(getSuppressedOrigins()).sort()).toEqual([ORIGIN, '__proto__'].sort());
  });
});
