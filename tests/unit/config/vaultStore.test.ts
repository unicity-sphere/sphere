/**
 * vaultStore — multi-store model: legacy migration, active-store resolution,
 * and normalization on persist. Pure localStorage logic (jsdom).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getVaultStore,
  setVaultStore,
  getActiveCustomUrl,
  isValidVaultUrl,
  hostLabel,
  type VaultStoreSetting,
  type CustomStore,
} from '../../../src/config/vaultStore';
import { STORAGE_KEYS } from '../../../src/config/storageKeys';

function seed(raw: unknown): void {
  localStorage.setItem(STORAGE_KEYS.VAULT_STORE, JSON.stringify(raw));
}

describe('vaultStore — multi-store', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { store = {}; },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('returns null when nothing has been saved (so callers fall back to env)', () => {
    expect(getVaultStore()).toBeNull();
  });

  it('migrates a legacy { mode:custom, customUrl } into customStores + activeCustomId', () => {
    seed({ mode: 'custom', customUrl: 'https://my.token-api.example' });
    const s = getVaultStore()!;
    expect(s.mode).toBe('custom');
    expect(s.customStores).toHaveLength(1);
    expect(s.customStores![0].url).toBe('https://my.token-api.example');
    expect(s.activeCustomId).toBe(s.customStores![0].id);
    // The migrated setting resolves to the legacy URL.
    expect(getActiveCustomUrl(s)).toBe('https://my.token-api.example');
  });

  it('resolves the ACTIVE store among several customs', () => {
    const a: CustomStore = { id: 'a', label: 'A', url: 'https://a.example', addedAt: 1 };
    const b: CustomStore = { id: 'b', label: 'B', url: 'https://b.example', addedAt: 2 };
    seed({ mode: 'custom', customStores: [a, b], activeCustomId: 'b' });
    const s = getVaultStore()!;
    expect(s.customStores).toHaveLength(2);
    expect(getActiveCustomUrl(s)).toBe('https://b.example');
  });

  it('falls back to the first store when activeCustomId is stale/missing', () => {
    seed({
      mode: 'custom',
      customStores: [{ id: 'a', label: 'A', url: 'https://a.example', addedAt: 1 }],
      activeCustomId: 'gone',
    });
    const s = getVaultStore()!;
    expect(s.activeCustomId).toBe('a');
    expect(getActiveCustomUrl(s)).toBe('https://a.example');
  });

  it('filters out invalid custom stores', () => {
    seed({
      mode: 'custom',
      customStores: [
        { id: 'good', label: 'ok', url: 'https://ok.example', addedAt: 1 },
        { id: 'bad', label: 'nope', url: 'not-a-url', addedAt: 2 },
        { id: 'nourl', label: 'x', addedAt: 3 },
      ],
    });
    const s = getVaultStore()!;
    expect(s.customStores).toHaveLength(1);
    expect(s.customStores![0].id).toBe('good');
  });

  it('getActiveCustomUrl is undefined for non-custom modes', () => {
    expect(getActiveCustomUrl({ mode: 'default' })).toBeUndefined();
    expect(getActiveCustomUrl({ mode: 'off' })).toBeUndefined();
  });

  it('setVaultStore normalizes — drops the legacy customUrl, keeps the migrated list', () => {
    const setting: VaultStoreSetting = { mode: 'custom', customUrl: 'https://legacy.example' };
    setVaultStore(setting);
    const rawAfter = JSON.parse(localStorage.getItem(STORAGE_KEYS.VAULT_STORE)!);
    expect(rawAfter.customUrl).toBeUndefined();
    expect(rawAfter.customStores).toHaveLength(1);
    expect(rawAfter.customStores[0].url).toBe('https://legacy.example');
  });

  it('isValidVaultUrl + hostLabel helpers', () => {
    expect(isValidVaultUrl('https://x.example')).toBe(true);
    expect(isValidVaultUrl('ftp://x')).toBe(false);
    expect(isValidVaultUrl('')).toBe(false);
    expect(hostLabel('https://api.example.com:8080/path')).toBe('api.example.com:8080');
  });
});
