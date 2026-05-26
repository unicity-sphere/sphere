import { describe, it, expect } from 'vitest';
import {
  hasMaterialContent,
  TXF_RESERVED_COLLECTIONS,
} from '../../../src/sdk/utils/tokenStorageProbe';

/**
 * Tests for the shared `hasMaterialContent` predicate. This is the
 * single source of truth used by BOTH the migration overwrite-guard
 * AND the banner data-presence probes — they MUST agree.
 */
describe('hasMaterialContent', () => {
  it('returns false for a snapshot containing only _meta', () => {
    expect(
      hasMaterialContent({
        _meta: { version: 1, address: '', formatVersion: '2.0', updatedAt: 0 },
      }),
    ).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(hasMaterialContent({})).toBe(false);
  });

  it('treats a single active-token key (`_<hex>`) as material content', () => {
    expect(
      hasMaterialContent({
        _meta: {},
        _abc123: { genesis: { tokenId: 'abc123' } },
      }),
    ).toBe(true);
  });

  it('treats an `archived-<id>` key as material content', () => {
    expect(
      hasMaterialContent({
        _meta: {},
        'archived-abc123': { genesis: { tokenId: 'abc123' } },
      }),
    ).toBe(true);
  });

  it('treats a `_forked_<id>_<state>` key as material content', () => {
    expect(
      hasMaterialContent({
        _meta: {},
        '_forked_abc123_aaaa': { genesis: { tokenId: 'abc123' } },
      }),
    ).toBe(true);
  });

  it('ignores empty reserved collections (arrays)', () => {
    expect(
      hasMaterialContent({
        _meta: {},
        _outbox: [],
        _sent: [],
        _tombstones: [],
        _audit: [],
      }),
    ).toBe(false);
  });

  it('treats a NON-empty `_outbox` array as material content', () => {
    expect(
      hasMaterialContent({
        _meta: {},
        _outbox: [{ id: 'outbox-1' }],
      }),
    ).toBe(true);
  });

  it('treats a NON-empty `_tombstones` array as material content', () => {
    expect(
      hasMaterialContent({
        _meta: {},
        _tombstones: [{ id: 'tomb-1' }],
      }),
    ).toBe(true);
  });

  it('treats `_history` and `_audit` populated arrays as material content', () => {
    expect(hasMaterialContent({ _meta: {}, _history: [{ id: 'h1' }] })).toBe(true);
    expect(hasMaterialContent({ _meta: {}, _audit: [{ id: 'a1' }] })).toBe(true);
  });

  it('ignores undefined / null values for any key (defensive)', () => {
    expect(
      hasMaterialContent({
        _meta: {},
        _foo: undefined,
        _bar: null,
      }),
    ).toBe(false);
  });

  it('treats a reserved collection that is an object (not array) with keys as material', () => {
    // Some reserved collections in the codebase are objects keyed by id
    // — guard against the array-only assumption.
    expect(
      hasMaterialContent({
        _meta: {},
        _nametags: { alice: { idx: 0 } },
      }),
    ).toBe(true);
  });

  it('keeps the reserved-collection set in sync with the SDK list', () => {
    // The expectation here is structural: the shared util MUST cover
    // every reserved key the SDK currently uses. We don't test the
    // SDK's list directly (it's not exported), but if this set ever
    // changes by accident we want the test to fail loudly.
    expect(TXF_RESERVED_COLLECTIONS).toContain('_outbox');
    expect(TXF_RESERVED_COLLECTIONS).toContain('_sent');
    expect(TXF_RESERVED_COLLECTIONS).toContain('_tombstones');
    expect(TXF_RESERVED_COLLECTIONS).toContain('_audit');
    expect(TXF_RESERVED_COLLECTIONS).toContain('_finalizationQueue');
    expect(TXF_RESERVED_COLLECTIONS).toContain('_nametags');
    expect(TXF_RESERVED_COLLECTIONS).toContain('_invalidatedNametags');
    expect(TXF_RESERVED_COLLECTIONS).toContain('_invalid');
    expect(TXF_RESERVED_COLLECTIONS).toContain('_history');
    expect(TXF_RESERVED_COLLECTIONS).toContain('_integrity');
    expect(TXF_RESERVED_COLLECTIONS).toContain('_mintOutbox');
    expect(TXF_RESERVED_COLLECTIONS).toContain('_nametag');
    // _meta is intentionally EXCLUDED (it's always present)
    expect(TXF_RESERVED_COLLECTIONS).not.toContain('_meta');
  });
});
