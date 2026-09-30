import { describe, it, expect } from 'vitest';
import {
  isWalletOwnOrigin,
  isUsableOrigin,
  classifyAgentOrigin,
  AGENT_IFRAME_SANDBOX,
  AGENT_IFRAME_ALLOW,
} from '../../../src/config/agentOrigins';

describe('isWalletOwnOrigin (self-framing guard)', () => {
  it('is true when the framed origin equals the wallet origin', () => {
    expect(isWalletOwnOrigin('https://wallet.example', 'https://wallet.example')).toBe(true);
  });

  it('is false for a different origin', () => {
    expect(isWalletOwnOrigin('https://dapp.example', 'https://wallet.example')).toBe(false);
  });

  it('normalizes case so a spoofed-case host still matches the wallet origin', () => {
    expect(isWalletOwnOrigin('https://Wallet.Example', 'https://wallet.example')).toBe(true);
  });

  it('is false for an unparseable origin', () => {
    expect(isWalletOwnOrigin('not a url', 'https://wallet.example')).toBe(false);
  });
});

/**
 * The predicate every origin-keyed consent in the wallet leans on (the network-switch
 * grace marker and, with it, the network-switch prompt and its mute). It moved here
 * from config/network.ts, where its first caller lived; these cases are its own.
 */
describe('isUsableOrigin (an identity one site can hold and another cannot)', () => {
  it.each([
    'https://app.example',
    'http://localhost:5173',
    'https://app.example:8443',
    'http://127.0.0.1:3000',
  ])('accepts the canonical origin %s', (origin) => {
    expect(isUsableOrigin(origin)).toBe(true);
  });

  it.each([
    ['the empty string', ''],
    ["'null', which every opaque or sandboxed frame reports", 'null'],
    ["'*', which the transport treats as allow-all", '*'],
    ['a path', 'https://app.example/path'],
    ['a trailing slash', 'https://app.example/'],
    ['an upper-case host', 'https://App.Example'],
    ['a default port', 'https://app.example:443'],
    ['a query', 'https://app.example?x=1'],
    ['a value that is not a URL', 'not a url'],
    ['an opaque scheme', 'data:text/html,hi'],
  ])('refuses %s', (_label, value) => {
    expect(isUsableOrigin(value)).toBe(false);
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a number', 4],
    ['an object', { origin: 'https://app.example' }],
  ])('refuses %s, which is not a string at all', (_label, value) => {
    expect(isUsableOrigin(value)).toBe(false);
  });
});

describe('classifyAgentOrigin (trust level of a framed agent origin)', () => {
  it('classifies the wallet own origin as "self"', () => {
    expect(
      classifyAgentOrigin('https://wallet.example', { selfOrigin: 'https://wallet.example' }),
    ).toBe('self');
  });

  it('classifies an allowlisted origin as "trusted"', () => {
    expect(
      classifyAgentOrigin('https://trusted.example', {
        selfOrigin: 'https://wallet.example',
        trustedOrigins: ['https://trusted.example'],
      }),
    ).toBe('trusted');
  });

  it('classifies any other origin as "untrusted"', () => {
    expect(
      classifyAgentOrigin('https://attacker.example', {
        selfOrigin: 'https://wallet.example',
        trustedOrigins: ['https://trusted.example'],
      }),
    ).toBe('untrusted');
  });

  it('self takes precedence even if the origin is also allowlisted', () => {
    expect(
      classifyAgentOrigin('https://wallet.example', {
        selfOrigin: 'https://wallet.example',
        trustedOrigins: ['https://wallet.example'],
      }),
    ).toBe('self');
  });
});

describe('hardened agent-iframe sandbox/allow', () => {
  it('does not grant clipboard-write to agent frames (address-swap vector)', () => {
    expect(AGENT_IFRAME_ALLOW).not.toMatch(/clipboard-write/);
  });

  it('does not let popups escape the sandbox (unsandboxed phishing popups)', () => {
    expect(AGENT_IFRAME_SANDBOX).not.toMatch(/allow-popups-to-escape-sandbox/);
  });

  it('still allows scripts and forms so normal dApps keep working', () => {
    expect(AGENT_IFRAME_SANDBOX).toMatch(/allow-scripts/);
    expect(AGENT_IFRAME_SANDBOX).toMatch(/allow-forms/);
  });
});
