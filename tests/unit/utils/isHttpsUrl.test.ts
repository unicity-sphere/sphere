import { describe, it, expect } from 'vitest';
import { isHttpsUrl } from '../../../src/utils/isHttpsUrl';

describe('isHttpsUrl', () => {
  it('accepts a normal https:// URL', () => {
    expect(isHttpsUrl('https://github.com/owner/repo')).toBe(true);
  });

  it('rejects a javascript: URL', () => {
    expect(isHttpsUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects an http:// URL', () => {
    expect(isHttpsUrl('http://example.com')).toBe(false);
  });

  it('rejects unparseable strings and non-string values', () => {
    expect(isHttpsUrl('not a url')).toBe(false);
    expect(isHttpsUrl('')).toBe(false);
    expect(isHttpsUrl(null)).toBe(false);
    expect(isHttpsUrl(undefined)).toBe(false);
    expect(isHttpsUrl(42)).toBe(false);
  });
});
