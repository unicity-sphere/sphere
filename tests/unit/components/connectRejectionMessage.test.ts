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
    expect(s).toContain('Mainnet');
    expect(s).toContain('Testnet');
  });

  // Both sides are labelled by the WALLET, from its own table, by id. The peer's `name` is
  // display text a hostile app can set to anything, and this sentence sits inside a paragraph
  // the wallet vouches for: "is built for Mainnet (4), but your wallet is on network 1" would
  // let the app out-label the wallet, whose own side carries no name at all.
  it('names each side from the wallet\'s own table, by id', () => {
    expect(
      describeConnectRejection({
        reason: 'network_incompatible',
        walletNetwork: { id: 4 },
        clientNetwork: { id: 1 },
      }),
    ).toBe('is built for Mainnet, but your wallet is on Testnet, so it cannot connect here.');
  });

  it('never prints the name the peer declared, whatever it claims to be', () => {
    const s = describeConnectRejection({
      reason: 'network_incompatible',
      walletNetwork: { id: 1 },
      clientNetwork: { id: 4, name: 'Mainnet (4)' },
    });
    // Id 4 is testnet2 whatever the app calls it, and the wallet's side is named the same way.
    // The exact-equality assertion is what proves nothing leaked: it pins the whole sentence, so
    // the peer's string cannot appear anywhere in it.
    expect(s).toBe('is built for Testnet, but your wallet is on Mainnet, so it cannot connect here.');
    // Named explicitly because it is the attack: the peer's claim, not merely the word in it.
    // "Mainnet" alone is no longer a leak signal — the wallet's own side is genuinely Mainnet
    // here, since networks are now labelled the way the rest of the wallet labels them.
    expect(s).not.toContain('Mainnet (4)');
  });

  it('names a network the wallet does not know by its id alone, and still not by the peer\'s name', () => {
    const s = describeConnectRejection({
      reason: 'network_incompatible',
      walletNetwork: { id: 4 },
      clientNetwork: { id: 999, name: 'Totally-Safe-Mainnet-<b>' },
    });
    expect(s).toBe('is built for network 999, but your wallet is on Testnet, so it cannot connect here.');
  });

  it('does not trust a name on the wallet side either: it is labelled from the table too', () => {
    const s = describeConnectRejection({
      reason: 'network_incompatible',
      walletNetwork: { id: 4, name: 'Definitely-Mainnet' },
      clientNetwork: { id: 1 },
    });
    expect(s).toContain('Testnet');
    expect(s).not.toContain('Definitely');
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

/**
 * When the network hook refuses to OFFER a switch, the user still deserves to know why.
 * Each reason has one fixed sentence, appended to the network copy and to nothing else.
 */
describe('describeConnectRejection with a switch refusal', () => {
  const NETWORK = {
    reason: 'network_incompatible',
    walletNetwork: { id: 4 },
    clientNetwork: { id: 1 },
  };
  const REASONS = [
    'suppressed',
    'unknown-network',
    'already-current',
    'wallet-network-unknown',
    'not-served-here',
    'coming-soon',
  ] as const;

  it('keeps the existing sentence and adds one clause per reason, each different', () => {
    const base = describeConnectRejection(NETWORK);
    const clauses = REASONS.map((reason) => {
      const full = describeConnectRejection(NETWORK, reason);
      expect(full.startsWith(`${base} `)).toBe(true);
      return full.slice(base.length + 1);
    });

    for (const clause of clauses) {
      expect(clause.length).toBeGreaterThan(10);
      expect(clause.endsWith('.')).toBe(true);
    }
    expect(new Set(clauses).size).toBe(REASONS.length);
  });

  it('says where a muted app can be turned back on', () => {
    expect(describeConnectRejection(NETWORK, 'suppressed')).toContain('Connected Sites');
  });

  it('never prints a peer string in a clause: the same words whatever the app declared', () => {
    const hostile = {
      ...NETWORK,
      clientNetwork: { id: 1, name: 'Totally-Safe-Testnet-<b>' },
      dapp: 'Free Money',
    };
    for (const reason of REASONS) {
      const clean = describeConnectRejection(NETWORK, reason).split(' so it cannot connect here. ')[1];
      const withPeer = describeConnectRejection(hostile, reason).split(' so it cannot connect here. ')[1];
      expect(clean).toBeDefined();
      expect(withPeer).toBe(clean);
      expect(withPeer).not.toContain('Totally-Safe');
    }
  });

  it('appends nothing to a protocol rejection, or to an unrecognised one', () => {
    const protocol = { reason: 'protocol_incompatible', requiredSdk: '0.12.0-0', actualSdk: '0.11.9' };
    expect(describeConnectRejection(protocol, 'coming-soon')).toBe(describeConnectRejection(protocol));
    expect(describeConnectRejection(undefined, 'coming-soon')).toBe('is not compatible with this wallet.');
  });

  it('adds nothing when there is no refusal to explain', () => {
    expect(describeConnectRejection(NETWORK, undefined)).toBe(describeConnectRejection(NETWORK));
  });
});
