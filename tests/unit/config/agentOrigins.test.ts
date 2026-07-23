import { describe, it, expect } from 'vitest';
import {
  isWalletOwnOrigin,
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
