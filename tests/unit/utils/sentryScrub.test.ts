import {
  scrubText,
  redactUrl,
  scrubBreadcrumb,
  scrubEvent,
  scrubTransactionEvent,
  isInjectedProviderNoise,
} from '@/utils/sentryScrub';
import type { Breadcrumb, ErrorEvent } from '@sentry/react';

type TransactionEvent = Parameters<typeof scrubTransactionEvent>[0];

const MNEMONIC =
  'abandon ability able about above absent absorb abstract absurd abuse access accident';
const PRIVATE_KEY = 'a'.repeat(64);

describe('scrubText', () => {
  it('redacts a 12-word mnemonic embedded in an error message', () => {
    const scrubbed = scrubText(`Invalid mnemonic: ${MNEMONIC}`);
    expect(scrubbed).not.toContain('abandon');
    expect(scrubbed).toContain('[possible mnemonic]');
  });

  it('redacts a 24-word mnemonic', () => {
    const scrubbed = scrubText(`${MNEMONIC} ${MNEMONIC}`);
    expect(scrubbed).not.toContain('abandon');
  });

  it('redacts a mnemonic separated by newlines (grid/textarea copy)', () => {
    expect(scrubText(MNEMONIC.split(' ').join('\n'))).not.toContain('abandon');
  });

  it('redacts 64+ char hex strings (private-key shaped)', () => {
    const scrubbed = scrubText(`Signing failed for key ${PRIVATE_KEY}`);
    expect(scrubbed).not.toContain(PRIVATE_KEY);
    expect(scrubbed).toContain('[hex]');
  });

  it('redacts 0x-prefixed keys and hex followed by a letter', () => {
    expect(scrubText(`key 0x${PRIVATE_KEY}`)).toBe('key [hex]');
    expect(scrubText(`${PRIVATE_KEY}z`)).toBe('[hex]z');
  });

  it('scrubs a 100KB blob without freezing (bounded backtracking)', () => {
    const start = performance.now();
    scrubText('a'.repeat(100_000));
    expect(performance.now() - start).toBeLessThan(500);
  });

  it('redacts email addresses', () => {
    expect(scrubText('Auth failed for user@example.com')).not.toContain('user@example.com');
  });

  it('redacts @nametag handles', () => {
    const scrubbed = scrubText('Unicity ID @bob is already taken');
    expect(scrubbed).not.toContain('@bob');
    expect(scrubbed).toContain('@[nametag]');
  });

  it('preserves npm scopes like @unicitylabs/sphere-sdk', () => {
    expect(scrubText("Cannot resolve '@unicitylabs/sphere-sdk'")).toContain(
      '@unicitylabs/sphere-sdk'
    );
  });

  it('preserves hyphenated npm scopes (no backtracking re-entry)', () => {
    expect(scrubText("Failed to resolve '@dnd-kit/sortable'")).toContain('@dnd-kit/sortable');
    expect(scrubText("import '@testing-library/react' failed")).toContain(
      '@testing-library/react'
    );
  });

  it('leaves ordinary error messages readable', () => {
    const message = 'Failed to fetch: NetworkError when attempting to fetch resource.';
    expect(scrubText(message)).toBe(message);
  });

  it('leaves short hex (addresses, trace ids) alone', () => {
    const message = `trace ${'b'.repeat(32)} failed`;
    expect(scrubText(message)).toBe(message);
  });
});

describe('redactUrl', () => {
  it('redacts query values but keeps the path and param names', () => {
    expect(redactUrl('/agents/dm?nametag=bob&tab=1')).toBe(
      '/agents/dm?nametag=[Filtered]&tab=[Filtered]'
    );
  });

  it('passes through URLs without a query', () => {
    expect(redactUrl('https://sphere.example/home')).toBe('https://sphere.example/home');
  });

  it('scrubs valueless query tokens through scrubText', () => {
    expect(redactUrl(`/page?${'c'.repeat(64)}`)).toBe('/page?[hex]');
    expect(redactUrl('/cb?user@example.com')).toBe('/cb?[email]');
  });

  it('redacts fragment values, with or without a query', () => {
    expect(redactUrl('/cb#access_token=secret123&state=xyz')).toBe(
      '/cb#access_token=[Filtered]&state=[Filtered]'
    );
    expect(redactUrl('/page?a=1#token=abc')).toBe('/page?a=[Filtered]#token=[Filtered]');
  });
});

describe('scrubTransactionEvent', () => {
  it('redacts URLs and drops query attributes in fetch/xhr span data', () => {
    const event = {
      type: 'transaction',
      request: { url: '/home?nametag=bob' },
      contexts: { trace: { data: { url: '/home?nametag=bob' } } },
      spans: [
        {
          data: {
            'url': '/api/auth/challenge?address=addr1&pubkey=pk1',
            'http.url': 'https://api.example/auth?address=addr1',
            'url.full': 'https://api.example/auth?address=addr1',
            'http.query': '?address=addr1&pubkey=pk1',
            'http.fragment': '#secret',
            'http.method': 'GET',
          },
        },
      ],
    } as unknown as TransactionEvent;

    const scrubbed = scrubTransactionEvent(event);
    const serialized = JSON.stringify(scrubbed);

    expect(serialized).not.toContain('addr1');
    expect(serialized).not.toContain('pk1');
    expect(serialized).not.toContain('bob');
    expect(serialized).not.toContain('secret');
    expect(scrubbed.spans?.[0].data?.['http.method']).toBe('GET');
    expect(scrubbed.spans?.[0].data?.['url']).toBe(
      '/api/auth/challenge?address=[Filtered]&pubkey=[Filtered]'
    );
  });
});

describe('scrubBreadcrumb', () => {
  it('drops console breadcrumbs entirely', () => {
    expect(scrubBreadcrumb({ category: 'console', message: 'anything' })).toBeNull();
  });

  it('redacts query strings in fetch breadcrumb URLs', () => {
    const crumb: Breadcrumb = {
      category: 'fetch',
      data: { url: '/wallet-api/v1/requests?address=abc123', method: 'GET' },
    };
    expect(scrubBreadcrumb(crumb)?.data?.url).toBe('/wallet-api/v1/requests?address=[Filtered]');
  });

  it('redacts navigation breadcrumb from/to', () => {
    const crumb: Breadcrumb = {
      category: 'navigation',
      data: { from: '/home', to: '/agents/group-chat?join=secret-invite' },
    };
    expect(scrubBreadcrumb(crumb)?.data?.to).toBe('/agents/group-chat?join=[Filtered]');
  });
});

describe('scrubEvent', () => {
  it('scrubs exception values, request URL, and breadcrumbs', () => {
    const event = {
      type: undefined,
      message: `mnemonic leak: ${MNEMONIC}`,
      exception: { values: [{ type: 'Error', value: `bad key ${PRIVATE_KEY}` }] },
      request: { url: '/connect?origin=https://evil.example', headers: { Cookie: 'x' } },
      breadcrumbs: [
        { category: 'console', message: `logged ${MNEMONIC}` },
        { category: 'fetch', data: { url: '/rpc?apiKey=sk_live_123' } },
      ],
      extra: { seed: MNEMONIC, note: `contains ${PRIVATE_KEY}` },
    } as unknown as ErrorEvent;

    const scrubbed = scrubEvent(event);
    const serialized = JSON.stringify(scrubbed);

    expect(serialized).not.toContain('abandon');
    expect(serialized).not.toContain(PRIVATE_KEY);
    expect(serialized).not.toContain('sk_live_123');
    expect(serialized).not.toContain('evil.example');
    expect(scrubbed.request?.headers).toBeUndefined();
    // console breadcrumb dropped, fetch breadcrumb kept
    expect(scrubbed.breadcrumbs).toHaveLength(1);
    // sensitive key names in extra are filtered wholesale
    expect(scrubbed.extra?.seed).toBe('[Filtered]');
  });
});

describe('isInjectedProviderNoise', () => {
  const rejection = (serialized: unknown, mechanism = 'auto.browser.global_handlers.onunhandledrejection'): ErrorEvent =>
    ({
      exception: { values: [{ type: 'UnhandledRejection', mechanism: { type: mechanism } }] },
      extra: { __serialized__: serialized },
    }) as unknown as ErrorEvent;

  it('drops an EIP-1193 disconnect rejection without a stack (SPHERE-A shape)', () => {
    expect(
      isInjectedProviderNoise(
        rejection({ code: 4900, message: 'The provider is disconnected from all chains.' })
      )
    ).toBe(true);
  });

  it('drops an object rejection whose stack string points into an extension (SPHERE-9 shape)', () => {
    expect(
      isInjectedProviderNoise(
        rejection({
          code: 4900,
          message: 'The provider is disconnected from all chains.',
          stack: 'Error: ...\n    at s (chrome-extension://acmacodkjbdgmoleebolmdjonilkdbch/background.js:4:1)',
        })
      )
    ).toBe(true);
  });

  it('keeps our JSON-RPC-style rejections (negative codes)', () => {
    expect(isInjectedProviderNoise(rejection({ code: -32000, message: 'aggregator busy' }))).toBe(false);
  });

  it('keeps object rejections with non-EIP-1193 codes and app-origin stacks', () => {
    expect(
      isInjectedProviderNoise(
        rejection({ code: 500, message: 'x', stack: 'Error at https://sphere.unicity.network/assets/index.js:1:1' })
      )
    ).toBe(false);
  });

  it('ignores events from other mechanisms even with a 4900 code', () => {
    expect(isInjectedProviderNoise(rejection({ code: 4900, message: 'x' }, 'generic'))).toBe(false);
  });

  it('ignores events without a serialized rejection object', () => {
    expect(isInjectedProviderNoise({ exception: { values: [] } } as unknown as ErrorEvent)).toBe(false);
  });
});
