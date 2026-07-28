import { describe, it, expect } from 'vitest';
import { describeConnectRejection } from '../../../src/components/connect/rejectionMessage';

/**
 * The gate's refusal copy is the ONLY thing a developer sees when their app is turned
 * away — the modal shows this fragment plus a bare error code. "Built for an older
 * version" without a number tells them to upgrade without saying to what, so the
 * versions the SDK already puts in `error.data` have to reach the sentence.
 */
describe('describeConnectRejection', () => {
  it('names the SDK version the app has and the one the wallet wants', () => {
    const s = describeConnectRejection({
      reason: 'protocol_incompatible',
      requiredSdk: '0.12.0-0',
      actualSdk: '0.11.9',
    });
    expect(s).toContain('0.11.9');
    expect(s).toContain('0.12.0-0');
  });

  it('still names the required SDK version when the app reported none', () => {
    const s = describeConnectRejection({
      reason: 'protocol_incompatible',
      requiredSdk: '0.12.0-0',
      actualSdk: null,
    });
    expect(s).toContain('0.12.0-0');
    expect(s).not.toContain('null');
  });

  it('names both protocol versions on a protocol floor', () => {
    const s = describeConnectRejection({
      reason: 'protocol_incompatible',
      clientProtocol: '2.0',
      requiredProtocol: '2.1',
      walletProtocol: '2.1',
    });
    expect(s).toContain('2.0');
    expect(s).toContain('2.1');
  });

  it('names both protocol versions on a MAJOR mismatch', () => {
    const s = describeConnectRejection({
      reason: 'protocol_incompatible',
      clientProtocol: '1.0',
      walletProtocol: '2.1',
    });
    expect(s).toContain('1.0');
    expect(s).toContain('2.1');
  });

  it('prefers the SDK floor over the protocol numbers when both are present', () => {
    // The gate checks MAJOR → MINOR → SDK, so an SDK-floor refusal also carries the
    // (perfectly fine) protocol pair. Quoting both would read as two separate faults.
    const s = describeConnectRejection({
      reason: 'protocol_incompatible',
      walletProtocol: '2.1',
      clientProtocol: '2.1',
      requiredSdk: '0.12.0-0',
      actualSdk: '0.11.9',
    });
    expect(s).toContain('0.11.9');
    expect(s).not.toContain('Connect protocol');
  });

  it('falls back to the generic protocol copy when no versions were sent', () => {
    const s = describeConnectRejection({ reason: 'protocol_incompatible' });
    expect(s).toContain('older version of Sphere');
    expect(s).toContain('developer');
  });

  it('names both networks on a network mismatch', () => {
    const s = describeConnectRejection({
      reason: 'network_incompatible',
      walletNetwork: { id: 4 },
      clientNetwork: { id: 1, name: 'mainnet' },
    });
    expect(s).toContain('mainnet');
    expect(s).toContain('4');
  });

  it('falls back to the generic network copy when the app sent no network', () => {
    const s = describeConnectRejection({
      reason: 'network_incompatible',
      walletNetwork: { id: 4 },
      clientNetwork: null,
    });
    expect(s).toContain('different Unicity network');
    expect(s).not.toContain('null');
  });

  it('falls back to the generic copy for an unknown reason or no data', () => {
    expect(describeConnectRejection(undefined)).toBe('is not compatible with this wallet.');
    expect(describeConnectRejection({ reason: 'something_new' })).toBe('is not compatible with this wallet.');
  });

  it('stays a fragment that reads after the dApp name', () => {
    const s = describeConnectRejection({ reason: 'protocol_incompatible', requiredSdk: '0.12.0-0', actualSdk: '0.11.9' });
    expect(s.startsWith('was ')).toBe(true);
    expect(s.endsWith('.')).toBe(true);
  });
});
