import { useState, useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { DEV_PORTAL_URL } from '../config/devPortal';
import { SDK_VERSION } from '../config/sdkVersion';
import { copyToClipboard } from '../utils/copyToClipboard';

type Section =
  | 'getting-started'
  | 'installation'
  | 'quick-start'
  | 'browser-setup'
  | 'core-concepts'
  | 'identity'
  | 'addresses'
  | 'nametags'
  | 'token-model'
  | 'events-system'
  | 'api-sphere'
  | 'api-sphere-init'
  | 'api-sphere-exists'
  | 'api-sphere-mnemonic'
  | 'api-instance'
  | 'api-instance-identity'
  | 'api-instance-nametag'
  | 'api-instance-resolve'
  | 'api-instance-events'
  | 'api-instance-wallet'
  | 'api-payments'
  | 'api-payments-send'
  | 'api-payments-getbalance'
  | 'api-payments-getassets'
  | 'api-payments-gettokens'
  | 'api-payments-gethistory'
  | 'api-payments-receive'
  | 'api-payments-request'
  | 'api-comms'
  | 'api-comms-senddm'
  | 'api-comms-ondm'
  | 'api-comms-conversations'
  | 'api-comms-broadcast'
  | 'api-groupchat'
  | 'guides'
  | 'guide-wallet-backup'
  | 'examples'
  | 'example-payment'
  | 'connect'
  | 'connect-overview'
  | 'connect-how-it-works'
  | 'connect-autoconnect'
  | 'connect-resources';

interface NavItem {
  id: Section;
  label: string;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    children: [
      { id: 'installation', label: 'Installation' },
      { id: 'quick-start', label: 'Quick Start' },
      { id: 'browser-setup', label: 'Browser Setup' },
    ],
  },
  {
    id: 'core-concepts',
    label: 'Core Concepts',
    children: [
      { id: 'identity', label: 'Identity & Keys' },
      { id: 'addresses', label: 'Addresses' },
      { id: 'nametags', label: 'Nametags (@username)' },
      { id: 'token-model', label: 'Token Model' },
      { id: 'events-system', label: 'Events System' },
    ],
  },
  {
    id: 'api-sphere',
    label: 'Sphere (Static)',
    children: [
      { id: 'api-sphere-init', label: 'Sphere.init()' },
      { id: 'api-sphere-exists', label: 'Sphere.exists()' },
      { id: 'api-sphere-mnemonic', label: 'Mnemonic Utilities' },
    ],
  },
  {
    id: 'api-instance',
    label: 'Sphere (Instance)',
    children: [
      { id: 'api-instance-identity', label: 'sphere.identity' },
      { id: 'api-instance-nametag', label: 'Nametags' },
      { id: 'api-instance-resolve', label: 'sphere.resolve()' },
      { id: 'api-instance-events', label: 'sphere.on()' },
      { id: 'api-instance-wallet', label: 'Wallet Management' },
    ],
  },
  {
    id: 'api-payments',
    label: 'Payments (L3)',
    children: [
      { id: 'api-payments-send', label: 'payments.send()' },
      { id: 'api-payments-getbalance', label: 'payments.assets()' },
      { id: 'api-payments-getassets', label: 'payments.mint()' },
      { id: 'api-payments-gettokens', label: 'payments.tokens()' },
      { id: 'api-payments-gethistory', label: 'payments.history()' },
      { id: 'api-payments-receive', label: 'payments.receive()' },
      { id: 'api-payments-request', label: 'Payment Requests' },
    ],
  },
  {
    id: 'api-comms',
    label: 'Communications',
    children: [
      { id: 'api-comms-senddm', label: 'sendDM()' },
      { id: 'api-comms-ondm', label: 'onDirectMessage()' },
      { id: 'api-comms-conversations', label: 'Conversations' },
      { id: 'api-comms-broadcast', label: 'Broadcasts' },
    ],
  },
  {
    id: 'api-groupchat',
    label: 'Group Chat',
  },
  {
    id: 'connect',
    label: 'Sphere Connect',
    children: [
      { id: 'connect-overview', label: 'Overview' },
      { id: 'connect-how-it-works', label: 'How It Works' },
      { id: 'connect-autoconnect', label: 'autoConnect()' },
      { id: 'connect-resources', label: 'Resources & Links' },
    ],
  },
  {
    id: 'guides',
    label: 'Guides',
    children: [
      { id: 'guide-wallet-backup', label: 'Wallet Backup & Recovery' },
    ],
  },
  {
    id: 'examples',
    label: 'Examples',
    children: [
      { id: 'example-payment', label: 'Simple Payment' },
    ],
  },
];

/**
 * Syntax colours for the samples on this page. Hand-rolled rather than a highlighter
 * dependency: every sample is TypeScript, this page is the only consumer, and shiki or
 * prism is a large addition for four token types. One pass, one regex; a comment or a
 * string is matched whole, so keywords and numbers inside one are never re-coloured.
 */
const TOKENS = new RegExp(
  [
    '(//[^\\n]*|/\\*[\\s\\S]*?\\*/)',
    '(\'(?:[^\'\\\\\\n]|\\\\.)*\'|"(?:[^"\\\\\\n]|\\\\.)*"|\\x60(?:[^\\x60\\\\]|\\\\.)*\\x60)',
    '\\b(import|export|from|const|let|var|function|async|await|return|if|else|for|of|in|try|catch|finally|throw|new|class|extends|interface|type|typeof|instanceof|null|undefined|true|false|void|as|declare)\\b',
    '\\b(0x[0-9a-fA-F]+|\\d[\\d_]*n?)\\b',
  ].join('|'),
  'g',
);

/** comment, string, keyword, number — in the order the alternation matches them. */
const TOKEN_CLASS = ['text-neutral-500 italic', 'text-emerald-400', 'text-sky-400', 'text-amber-400'] as const;

function highlight(source: string) {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of source.matchAll(TOKENS)) {
    const at = m.index;
    if (at > last) out.push(source.slice(last, at));
    out.push(
      <span key={key++} className={TOKEN_CLASS[m.slice(1).findIndex(Boolean)]}>
        {m[0]}
      </span>,
    );
    last = at + m[0].length;
  }
  if (last < source.length) out.push(source.slice(last));
  return out;
}

/**
 * `language` defaults to typescript and most blocks pass only a filename, so the filename
 * is what actually distinguishes the .env and terminal blocks from code.
 */
function isTypeScript(filename: string | undefined, language: string): boolean {
  if (language !== 'typescript') return false;
  if (!filename) return true;
  return !/^(terminal|\.env|shell|bash|json|.*\.(env|sh|json|txt))$/i.test(filename.trim());
}

function CodeBlock({ code, filename, language = 'typescript' }: { code: string; filename?: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-neutral-900 rounded-xl overflow-hidden my-4">
      <div className="flex justify-between items-center px-4 py-2 border-b border-neutral-700">
        <span className="text-xs text-neutral-400 font-mono">{filename || language}</span>
        <button
          onClick={handleCopy}
          className="text-xs text-neutral-400 hover:text-white transition"
        >
          {copied ? '\u2713 Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 text-sm overflow-x-auto">
        {/* Only TypeScript is tokenised: a .env or shell block would have its URLs and
            words mis-painted by a TS tokenizer (# is not a comment here, // is not one there). */}
        <code className="text-neutral-200">{isTypeScript(filename, language) ? highlight(code) : code}</code>
      </pre>
    </div>
  );
}

function ParamTable({ params }: { params: { name: string; type: string; description: string; required?: boolean }[] }) {
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-neutral-500 border-b border-neutral-200 dark:border-neutral-700">
            <th className="pb-2 pr-4">Parameter</th>
            <th className="pb-2 pr-4">Type</th>
            <th className="pb-2">Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p, i) => (
            <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800">
              <td className="py-2 pr-4">
                <code className="text-amber-600 dark:text-amber-400">{p.name}</code>
                {p.required && <span className="text-red-500 ml-1">*</span>}
              </td>
              <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-400 font-mono text-xs">{p.type}</td>
              <td className="py-2 text-neutral-600 dark:text-neutral-400">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DocsPage() {
  const [activeSection, setActiveSection] = useState<Section>('getting-started');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<Section>>(new Set(['getting-started', 'api-payments']));

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('[data-section]');
      let currentSection: Section = 'getting-started';

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 100) {
          currentSection = section.getAttribute('data-section') as Section;
        }
      });

      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: Section) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
      setMobileNavOpen(false);
      window.history.replaceState(null, '', `#${id}`);
    }
  };

  // Read hash on mount and scroll to section
  useEffect(() => {
    const hash = window.location.hash.slice(1) as Section;
    if (hash) {
      // Expand parent nav group if needed
      for (const item of navigation) {
        if (item.id === hash || item.children?.some(c => c.id === hash)) {
          setExpandedSections(prev => new Set(prev).add(item.id));
          break;
        }
      }
      // Delay to let DOM render
      requestAnimationFrame(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setActiveSection(hash);
        }
      });
    }
  }, []);

  const toggleSection = (id: Section) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen text-neutral-900 dark:text-white relative z-0"
    >
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
        className="lg:hidden fixed top-16 left-4 z-30 p-2 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-lg rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {mobileNavOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/50 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-14 z-20 w-64 h-[calc(100vh-3.5rem)] overflow-y-auto
        backdrop-blur-lg lg:backdrop-blur-none border-r border-neutral-200/50 dark:border-neutral-800/50 lg:border-0
        transform transition-transform
        ${mobileNavOpen ? 'left-0 translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:left-[max(1rem,calc((100vw-80rem)/2))]
        p-4 lg:py-8 lg:pr-8
      `}>
          <nav className="space-y-1">
            {navigation.map((item) => (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (item.children) {
                      toggleSection(item.id);
                    }
                    scrollToSection(item.id);
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition
                    ${activeSection === item.id || item.children?.some(c => c.id === activeSection)
                      ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'}
                  `}
                >
                  <span>{item.label}</span>
                  {item.children && (
                    <svg
                      className={`w-4 h-4 transition-transform ${expandedSections.has(item.id) ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
                {item.children && expandedSections.has(item.id) && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => scrollToSection(child.id)}
                        className={`
                          w-full flex items-center px-3 py-1.5 text-sm rounded-lg transition
                          ${activeSection === child.id
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-neutral-500 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}
                        `}
                      >
                        <span>{child.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:pl-72">

          {/* ============================================================ */}
          {/* GETTING STARTED                                              */}
          {/* ============================================================ */}
          <section id="getting-started" data-section="getting-started" className="mb-16">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">
              Sphere SDK
              {/* The version this page documents is the version this app is pinned to.
                  SDK_VERSION is asserted against the package.json pin in
                  tests/unit/config/sdkVersion.test.ts, so it cannot drift silently the
                  way the old hard-coded v0.4.7 label did. A "latest on npm" link would
                  drift the other way: it points at whatever npm ships today, which is
                  not necessarily what these samples were checked against. */}
              <a
                href={`https://www.npmjs.com/package/@unicitylabs/sphere-sdk/v/${SDK_VERSION}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-3 text-sm font-normal text-neutral-500 hover:text-orange-500 transition align-middle"
              >
                v{SDK_VERSION}
              </a>
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl">
              Build apps where humans and AI agents trade anything. Payments, messaging and identity in one SDK.
            </p>

            <div id="installation" data-section="installation" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold mb-4">Installation</h2>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Install the Sphere SDK using npm or yarn:
              </p>
              <CodeBlock code="npm install @unicitylabs/sphere-sdk" filename="terminal" />
              <CodeBlock code="yarn add @unicitylabs/sphere-sdk" filename="terminal" />
            </div>

            <div id="quick-start" data-section="quick-start" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold mb-4">Quick Start</h2>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Initialize a wallet and send your first payment:
              </p>
              <CodeBlock
                filename="app.ts"
                code={`import { Sphere, TokenRegistry, getCoinIdBySymbol } from '@unicitylabs/sphere-sdk';
import { createBrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';
import { createWalletApiProviders } from '@unicitylabs/sphere-sdk/impl/shared/wallet-api';

const NETWORK = 'testnet2'; // 'mainnet' | 'testnet2'

const base = createBrowserProviders({ network: NETWORK });

const providers = createWalletApiProviders(base, {
  baseUrl: import.meta.env.VITE_WALLET_API_URL,
  network: NETWORK,
});

const { sphere, created, generatedMnemonic } = await Sphere.init({
  ...providers,
  network: NETWORK,
  autoGenerate: true,
});

if (generatedMnemonic) {
  console.log('Save this mnemonic:', generatedMnemonic);
}

console.log('Nametag:', sphere.getNametag());
console.log('Identity:', sphere.identity);

await TokenRegistry.waitForReady();
const coinId = getCoinIdBySymbol('UCT'); // the 64-hex id, never a symbol or '0x…'
if (coinId) {
  await sphere.payments.send({
    coinId,
    amount: '100000000',
    recipient: '@alice',
  });
}

sphere.on('transfer:incoming', (transfer) => {
  console.log('Received tokens:', transfer.tokens);
});`}
              />
            </div>

            <div id="browser-setup" data-section="browser-setup" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold mb-4">Browser Setup</h2>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                The SDK uses a provider-based architecture, composed in two steps.
                <code className="text-amber-600 dark:text-amber-400"> createBrowserProviders()</code> builds the
                platform providers (IndexedDB storage, Nostr transport, aggregator oracle), and
                <code className="text-amber-600 dark:text-amber-400"> createWalletApiProviders()</code> attaches the
                wallet-api transport config the payments vertical is built from.
              </p>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                <strong>TypeScript note:</strong> <code className="text-amber-600 dark:text-amber-400">@unicitylabs/sphere-sdk/impl/browser</code> ships
                no type declarations in {SDK_VERSION}, so a strict project reports <code className="text-amber-600 dark:text-amber-400">TS7016</code> on
                that import (here and in the Quick Start above). Add a
                <code className="text-amber-600 dark:text-amber-400"> declare module '@unicitylabs/sphere-sdk/impl/browser'</code> shim &mdash; the SDK
                README&rsquo;s <em>TypeScript: declarations for ./impl/browser</em> section has one ready to paste.
                <code className="text-amber-600 dark:text-amber-400"> createWalletApiProviders</code> is typed normally.
              </p>
              <CodeBlock
                filename="setup.ts"
                code={`import { createBrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';
import { createWalletApiProviders } from '@unicitylabs/sphere-sdk/impl/shared/wallet-api';

const NETWORK = 'testnet2'; // 'mainnet' | 'testnet2'

const base = createBrowserProviders({
  network: NETWORK,
  price: { platform: 'coingecko', cacheTtlMs: 5 * 60_000 },
  groupChat: true,
});

const providers = createWalletApiProviders(base, {
  baseUrl: import.meta.env.VITE_WALLET_API_URL,
  network: NETWORK,             // must equal the Sphere network
});`}
              />
              <p className="text-neutral-600 dark:text-neutral-400 mt-4">
                <code className="text-amber-600 dark:text-amber-400">base</code> carries storage, transport, oracle and —
                because they were configured here — price and groupChat;{' '}
                <code className="text-amber-600 dark:text-amber-400">createWalletApiProviders</code> adds
                <code className="text-amber-600 dark:text-amber-400"> walletApi</code> to it. The price block selects the
                fiat provider and how long quotes are cached.
              </p>
              <p className="text-neutral-600 dark:text-neutral-400 mt-4">
                The providers object is spread into <code className="text-amber-600 dark:text-amber-400">Sphere.init()</code>,
                together with the same <code className="text-amber-600 dark:text-amber-400">network</code> value.
              </p>
              <div className="my-4 p-4 rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10">
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  <strong>The wallet-api composition is mandatory.</strong> Assets move only through that vertical;
                  there is no local-custody fallback. <code className="text-amber-600 dark:text-amber-400">Sphere.init()</code> throws
                  <code className="text-amber-600 dark:text-amber-400"> INVALID_CONFIG</code> when
                  <code className="text-amber-600 dark:text-amber-400"> walletApi</code> is missing, when
                  <code className="text-amber-600 dark:text-amber-400"> network</code> is missing, or when
                  <code className="text-amber-600 dark:text-amber-400"> walletApi.network</code> does not match it. The
                  base URL is deployment-specific — take it from your own configuration rather than hard-coding one.
                </p>
              </div>
              <h3 className="text-lg font-semibold mt-8 mb-3">What belongs in your .env</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Only non-secret, deployment-specific values. Vite inlines every
                <code className="text-amber-600 dark:text-amber-400"> VITE_</code>-prefixed variable into the client bundle,
                so anything you put there is served verbatim to every visitor.
              </p>
              <CodeBlock
                filename=".env"
                code={`# Deployment-specific, and public by design — these ship in the bundle.
VITE_WALLET_API_URL=https://wallet-api.example.unicity.network

# NEVER a seed phrase, a private key or an API secret. A VITE_ variable is not
# configuration the browser keeps to itself: it is compiled into app.js and
# downloaded by anyone who opens the page. A mnemonic put here is published.
# Wallets come from the user at runtime (an import prompt) or from
# autoGenerate; server-only secrets stay in a server-side process.`}
              />
              <p className="text-neutral-600 dark:text-neutral-400 mt-4">
                The legacy <code className="text-amber-600 dark:text-amber-400">'testnet'</code> key still resolves to the same
                configuration as <code className="text-amber-600 dark:text-amber-400">'testnet2'</code>, but new code should not
                use it. It is deliberately absent from <code className="text-amber-600 dark:text-amber-400">SPHERE_NETWORKS</code>,
                which is what a dApp sends in a Connect handshake — and, more sharply, the init guard compares
                <code className="text-amber-600 dark:text-amber-400"> walletApi.network</code> with
                <code className="text-amber-600 dark:text-amber-400"> options.network</code> as raw strings. Passing
                <code className="text-amber-600 dark:text-amber-400"> 'testnet'</code> to one and
                <code className="text-amber-600 dark:text-amber-400"> 'testnet2'</code> to the other throws
                <code className="text-amber-600 dark:text-amber-400"> INVALID_CONFIG</code> even though both name the same network.
                Use one literal — the <code className="text-amber-600 dark:text-amber-400">NETWORK</code> constant in the samples
                above exists for exactly that reason.
              </p>
            </div>
          </section>

          {/* ============================================================ */}
          {/* CORE CONCEPTS                                                */}
          {/* ============================================================ */}
          <section id="core-concepts" data-section="core-concepts" className="mb-16">
            <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-neutral-200 dark:border-neutral-700">
              Core Concepts
            </h2>

            <div id="identity" data-section="identity" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">Identity & Keys</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Sphere uses cryptographic identity based on BIP39 mnemonics. Your mnemonic seed generates
                a hierarchical deterministic (HD) wallet with multiple addresses.
              </p>
              <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
                <li>No registration or API keys needed</li>
                <li>BIP32 HD wallet with derivation path <code className="text-amber-600 dark:text-amber-400">m/44'/0'/0'</code></li>
                <li>Multiple addresses from a single seed</li>
                <li>Identity includes chain pubkey, direct address, and optional nametag</li>
              </ul>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                <code className="text-amber-600 dark:text-amber-400">sphere.identity</code> is populated once
                <code className="text-amber-600 dark:text-amber-400"> Sphere.init()</code> resolves. Its type is
                <code className="text-amber-600 dark:text-amber-400"> Identity | null</code>.
              </p>
              <CodeBlock
                code={`console.log(sphere.identity);`}
              />
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                What it carries:
              </p>
              <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
                <li>
                  <code className="text-amber-600 dark:text-amber-400">chainPubkey</code> &mdash; the compressed secp256k1
                  chain public key as hex, such as <code className="text-amber-600 dark:text-amber-400">'02abc...'</code>
                </li>
                <li>
                  <code className="text-amber-600 dark:text-amber-400">directAddress</code> &mdash; the L3 address, such as
                  <code className="text-amber-600 dark:text-amber-400"> 'DIRECT://...'</code>. Optional.
                </li>
                <li>
                  <code className="text-amber-600 dark:text-amber-400">nametag</code> &mdash; the bare name, such as
                  <code className="text-amber-600 dark:text-amber-400"> 'alice'</code>, with no leading
                  <code className="text-amber-600 dark:text-amber-400"> @</code>. Optional.
                </li>
              </ul>
            </div>

            <div id="addresses" data-section="addresses" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">Addresses</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                There are two address formats:
              </p>
              <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
                <li><strong>DIRECT address</strong> (<code className="text-amber-600 dark:text-amber-400">DIRECT://...</code>) - Used for L3 token transfers</li>
                <li><strong>@nametag</strong> (<code className="text-amber-600 dark:text-amber-400">@alice</code>) - A human-readable alias, resolved to a DIRECT address over transport</li>
              </ul>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                <code className="text-amber-600 dark:text-amber-400">PROXY://</code> is not an address type &mdash; it was removed from the SDK.
                <code className="text-amber-600 dark:text-amber-400"> parseAddress()</code> returns
                <code className="text-amber-600 dark:text-amber-400"> null</code> for one, and a send to it fails with
                <code className="text-amber-600 dark:text-amber-400"> INVALID_RECIPIENT</code>: &ldquo;Use @nametag, DIRECT://, or a hex pubkey.&rdquo;
              </p>
              <CodeBlock
                code={`const addr = sphere.deriveAddress(1);
console.log(addr.publicKey);

await sphere.switchToAddress(1);

const addresses = sphere.getActiveAddresses();`}
              />
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                The index is zero-based, so <code className="text-amber-600 dark:text-amber-400">deriveAddress(1)</code> derives the
                second address. <code className="text-amber-600 dark:text-amber-400">addr.publicKey</code> is its chain pubkey as hex.
                <code className="text-amber-600 dark:text-amber-400"> switchToAddress(1)</code> makes that address the active one, and
                <code className="text-amber-600 dark:text-amber-400"> getActiveAddresses()</code> lists every address the wallet tracks.
              </p>
            </div>

            <div id="nametags" data-section="nametags" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">Nametags (@username)</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Nametags are human-readable aliases registered on Nostr. Use them instead of addresses:
              </p>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                The <code className="text-amber-600 dark:text-amber-400">@</code> is an input and display sigil only. The SDK strips it on
                registration and stores the bare name, so <code className="text-amber-600 dark:text-amber-400">getNametag()</code> and
                <code className="text-amber-600 dark:text-amber-400"> identity.nametag</code> return
                <code className="text-amber-600 dark:text-amber-400"> 'alice'</code> &mdash; prepend the
                <code className="text-amber-600 dark:text-amber-400"> @</code> yourself for display.
                <code className="text-amber-600 dark:text-amber-400"> resolve()</code> and
                <code className="text-amber-600 dark:text-amber-400"> send()</code> accept either form.
              </p>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Register a nametag during wallet creation or at any time after it. Once registered it works as a recipient:
                <code className="text-amber-600 dark:text-amber-400"> send()</code> resolves it to a DIRECT address for you.
              </p>
              <CodeBlock
                filename="nametags.ts"
                code={`await sphere.registerNametag('alice');

console.log(sphere.getNametag());

await sphere.payments.send({
  coinId: '<64-hex coin id>', // no '0x' prefix — see Token Model
  amount: '100',
  recipient: '@alice',
});

const peer = await sphere.resolve('@bob');
console.log(peer?.directAddress);`}
              />
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                <code className="text-amber-600 dark:text-amber-400">getNametag()</code> prints
                <code className="text-amber-600 dark:text-amber-400"> 'alice'</code>, stored without the
                <code className="text-amber-600 dark:text-amber-400"> '@'</code>.
                <code className="text-amber-600 dark:text-amber-400"> resolve()</code> turns a nametag into peer info, including the
                peer's DIRECT address.
              </p>
            </div>

            <div id="token-model" data-section="token-model" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">Token Model</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Tokens on Layer 3 are individual cryptographic objects with unique IDs, tracked by the aggregator.
              </p>
              <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
                <li><strong>Token</strong> - An individual token object with ID, coin type, amount, and state history</li>
                <li><strong>Asset</strong> - Aggregated balance for a coin type (sum of all tokens with same coinId)</li>
                <li><strong>coinId</strong> - The token type&rsquo;s 64-character lowercase hex id, with no <code className="text-amber-600 dark:text-amber-400">0x</code> prefix</li>
                <li>Amounts are strings in smallest units (like satoshis)</li>
              </ul>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Get a coinId from <code className="text-amber-600 dark:text-amber-400">getCoinIdBySymbol('UCT')</code> after
                <code className="text-amber-600 dark:text-amber-400"> await TokenRegistry.waitForReady()</code> (it returns
                <code className="text-amber-600 dark:text-amber-400"> undefined</code> for an unknown symbol), or read it off
                <code className="text-amber-600 dark:text-amber-400"> payments.assets()</code>. The money path resolves no symbols itself, so a
                symbol or a <code className="text-amber-600 dark:text-amber-400">0x</code>-prefixed id matches no holdings:
                <code className="text-amber-600 dark:text-amber-400"> send()</code> fails with
                <code className="text-amber-600 dark:text-amber-400"> SEND_INSUFFICIENT_BALANCE</code>, and
                <code className="text-amber-600 dark:text-amber-400"> mint()</code> resolves
                <code className="text-amber-600 dark:text-amber-400"> {'{ success: false }'}</code> with nothing minted.
              </p>
              <CodeBlock
                code={`const tokens = sphere.payments.tokens();
tokens.forEach(t => {
  console.log(t.id, t.coinId, t.amount, t.status);
});

const assets = await sphere.payments.assets();
assets.forEach(a => {
  console.log(a.symbol, a.totalAmount, a.tokenCount);
});`}
              />
            </div>

            <div id="events-system" data-section="events-system" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">Events System</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Subscribe to SDK events using <code className="text-amber-600 dark:text-amber-400">sphere.on(eventType, handler)</code>.
                Returns an unsubscribe function.
              </p>
              <CodeBlock
                code={`sphere.on('transfer:incoming', (transfer) => console.log(transfer.tokens));
sphere.on('transfer:updated', (result) => console.log(result.status));
sphere.on('message:dm', (msg) => console.log(msg.content));
sphere.on('payment_request:incoming', (req) => console.log(req.amount));

const unsub = sphere.on('transfer:incoming', handler);
unsub();`}
              />
              <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
                <li><code className="text-amber-600 dark:text-amber-400">transfer:incoming</code> &mdash; a transfer arrived</li>
                <li><code className="text-amber-600 dark:text-amber-400">transfer:updated</code> &mdash; an outgoing transfer changed state</li>
                <li><code className="text-amber-600 dark:text-amber-400">message:dm</code> &mdash; a direct message arrived</li>
                <li><code className="text-amber-600 dark:text-amber-400">payment_request:incoming</code> &mdash; a payment request arrived</li>
              </ul>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Calling the returned <code className="text-amber-600 dark:text-amber-400">unsub()</code> stops that listener.
              </p>
            </div>
          </section>

          {/* ============================================================ */}
          {/* API REFERENCE - SPHERE STATIC                                */}
          {/* ============================================================ */}
          <section id="api-sphere" data-section="api-sphere" className="mb-16">
            <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-neutral-200 dark:border-neutral-700">
              API Reference &mdash; Sphere (Static)
            </h2>

            <div id="api-sphere-init" data-section="api-sphere-init" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">Sphere.init(options)</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Unified initialization: auto-loads an existing wallet or creates a new one.
              </p>

              <h4 className="font-medium text-lg mt-6 mb-3">Signature</h4>
              <CodeBlock code={`static async init(options: SphereInitOptions): Promise<SphereInitResult>`} />

              <h4 className="font-medium text-lg mt-6 mb-3">Parameters</h4>
              <ParamTable
                params={[
                  { name: 'storage', type: 'StorageProvider', description: 'Storage provider (IndexedDB in browser)', required: true },
                  { name: 'transport', type: 'TransportProvider', description: 'Transport provider (Nostr in browser)', required: true },
                  { name: 'oracle', type: 'OracleProvider', description: 'Aggregator oracle provider', required: true },
                  { name: 'walletApi', type: "WalletApiTransportConfig | 'none'", description: "Wallet-api transport config from createWalletApiProviders(). Missing it throws INVALID_CONFIG; pass the literal 'none' for a messaging-only wallet with no payments, then check sphere.hasPayments before touching sphere.payments", required: true },
                  { name: 'network', type: "'mainnet' | 'testnet2'", description: 'Network this wallet runs on. Must equal walletApi.network; missing it throws INVALID_CONFIG', required: true },
                  { name: 'mnemonic', type: 'string', description: 'BIP39 mnemonic to create wallet from (if no wallet exists)' },
                  { name: 'autoGenerate', type: 'boolean', description: 'Auto-generate mnemonic if wallet does not exist' },
                  { name: 'nametag', type: 'string', description: 'Register nametag on creation' },
                  { name: 'groupChat', type: 'boolean | config', description: 'Enable NIP-29 group chat module' },
                  { name: 'password', type: 'string', description: 'Encrypt wallet with password' },
                ]}
              />

              <h4 className="font-medium text-lg mt-6 mb-3">Returns</h4>
              <CodeBlock
                code={`interface SphereInitResult {
  sphere: Sphere;
  created: boolean;
  generatedMnemonic?: string;
}`}
              />
              <p className="text-neutral-600 dark:text-neutral-400 mt-4">
                <code className="text-amber-600 dark:text-amber-400">sphere</code> is the initialized instance.
                <code className="text-amber-600 dark:text-amber-400"> created</code> says whether the wallet was newly created.
                <code className="text-amber-600 dark:text-amber-400"> generatedMnemonic</code> is present only when
                <code className="text-amber-600 dark:text-amber-400"> autoGenerate</code> was used.
              </p>

              <h4 className="font-medium text-lg mt-6 mb-3">Example</h4>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                The first call auto-creates a wallet with a generated mnemonic. The second creates one from a mnemonic you
                already hold.
              </p>
              <CodeBlock
                filename="init.ts"
                code={`import { Sphere } from '@unicitylabs/sphere-sdk';
import { createBrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';
import { createWalletApiProviders } from '@unicitylabs/sphere-sdk/impl/shared/wallet-api';

const NETWORK = 'testnet2';

const providers = createWalletApiProviders(
  createBrowserProviders({ network: NETWORK }),
  { baseUrl: import.meta.env.VITE_WALLET_API_URL, network: NETWORK },
);

const { sphere, generatedMnemonic } = await Sphere.init({
  ...providers,
  network: NETWORK,
  autoGenerate: true,
  nametag: 'myagent',
});

// IGNORED if a wallet already exists
const { sphere: imported } = await Sphere.init({
  ...providers,
  network: NETWORK,
  mnemonic: 'abandon badge cable drama ...',
});`}
              />
              <p className="text-neutral-600 dark:text-neutral-400 mt-4">
                <code className="text-amber-600 dark:text-amber-400">init()</code> never replaces a stored wallet: if one
                already exists it is loaded and <code className="text-amber-600 dark:text-amber-400">mnemonic</code>,
                <code className="text-amber-600 dark:text-amber-400"> nametag</code> and
                <code className="text-amber-600 dark:text-amber-400"> autoGenerate</code> are ignored
                (<code className="text-amber-600 dark:text-amber-400">created: false</code>). Seed-phrase restore is
                <code className="text-amber-600 dark:text-amber-400"> Sphere.import()</code>, which rejects with
                <code className="text-amber-600 dark:text-amber-400"> ALREADY_INITIALIZED</code> over an existing wallet
                unless <code className="text-amber-600 dark:text-amber-400">overwrite: true</code> is passed.
              </p>
            </div>

            <div id="api-sphere-exists" data-section="api-sphere-exists" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">Sphere.exists(storage)</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Checks whether a wallet already exists in the given storage. It returns
                <code className="text-amber-600 dark:text-amber-400"> false</code> both when no wallet is stored and when
                the storage cannot be opened or read, so a single
                <code className="text-amber-600 dark:text-amber-400"> false</code> is not proof the storage is empty.
                <code className="text-amber-600 dark:text-amber-400"> init()</code>,
                <code className="text-amber-600 dark:text-amber-400"> create()</code> and
                <code className="text-amber-600 dark:text-amber-400"> import()</code> use a non-swallowing check instead:
                a failing store makes them reject rather than pass for an empty one.
              </p>
              <CodeBlock code={`static async exists(storage: StorageProvider): Promise<boolean>`} />
              <CodeBlock
                filename="example.ts"
                code={`const NETWORK = 'testnet2';
const providers = createWalletApiProviders(
  createBrowserProviders({ network: NETWORK }),
  { baseUrl: import.meta.env.VITE_WALLET_API_URL, network: NETWORK },
);

const hasWallet = await Sphere.exists(providers.storage);

if (hasWallet) {
  const { sphere } = await Sphere.init({ ...providers, network: NETWORK });
} else {
  // Show onboarding flow
}`}
              />
            </div>

            <div id="api-sphere-mnemonic" data-section="api-sphere-mnemonic" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">Mnemonic Utilities</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Static helpers for generating and validating BIP39 mnemonics.
              </p>
              <CodeBlock
                code={`const mnemonic12 = Sphere.generateMnemonic();
const mnemonic24 = Sphere.generateMnemonic(256);

const isValid = Sphere.validateMnemonic('abandon badge cable ...');
console.log(isValid);`}
              />
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                <code className="text-amber-600 dark:text-amber-400">generateMnemonic()</code> returns 12 words from 128 bits of
                entropy. Pass <code className="text-amber-600 dark:text-amber-400">256</code> for a 24-word mnemonic.
                <code className="text-amber-600 dark:text-amber-400"> validateMnemonic()</code> returns
                <code className="text-amber-600 dark:text-amber-400"> true</code> or
                <code className="text-amber-600 dark:text-amber-400"> false</code>.
              </p>
            </div>
          </section>

          {/* ============================================================ */}
          {/* API REFERENCE - SPHERE INSTANCE                              */}
          {/* ============================================================ */}
          <section id="api-instance" data-section="api-instance" className="mb-16">
            <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-neutral-200 dark:border-neutral-700">
              API Reference &mdash; Sphere (Instance)
            </h2>

            <div id="api-instance-identity" data-section="api-instance-identity" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">sphere.identity</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                The current wallet identity. Available after initialization. Every field except
                <code className="text-amber-600 dark:text-amber-400"> chainPubkey</code> is optional, so guard
                <code className="text-amber-600 dark:text-amber-400"> directAddress</code> before using it as a recipient.
              </p>
              <CodeBlock
                code={`interface Identity {
  readonly chainPubkey: string;
  readonly directAddress?: string;
  readonly ipnsName?: string;
  readonly nametag?: string;
}

console.log(sphere.identity?.chainPubkey);
console.log(sphere.identity?.directAddress);
console.log(sphere.identity?.nametag);`}
              />
              <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
                <li><code className="text-amber-600 dark:text-amber-400">chainPubkey</code> &mdash; the secp256k1 public key as hex</li>
                <li><code className="text-amber-600 dark:text-amber-400">directAddress</code> &mdash; the <code className="text-amber-600 dark:text-amber-400">DIRECT://</code> address used on L3</li>
                <li><code className="text-amber-600 dark:text-amber-400">nametag</code> &mdash; the registered nametag without the <code className="text-amber-600 dark:text-amber-400">@</code>, such as <code className="text-amber-600 dark:text-amber-400">'alice'</code></li>
              </ul>
            </div>

            <div id="api-instance-nametag" data-section="api-instance-nametag" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">Nametag Methods</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                A nametag is a Nostr identity binding (UNIP-01) linking the name to your
                <code className="text-amber-600 dark:text-amber-400"> chainPubkey</code>, not a token.
                <code className="text-amber-600 dark:text-amber-400"> registerNametag()</code> publishes that binding, and
                nothing is minted on chain.
              </p>
              <CodeBlock
                code={`sphere.getNametag();
sphere.hasNametag();

await sphere.registerNametag('alice');

const available = await sphere.isNametagAvailable('bob');`}
              />
              <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
                <li><code className="text-amber-600 dark:text-amber-400">getNametag()</code> &mdash; the current nametag, <code className="text-amber-600 dark:text-amber-400">'alice' | undefined</code>, with no <code className="text-amber-600 dark:text-amber-400">@</code> prefix</li>
                <li><code className="text-amber-600 dark:text-amber-400">hasNametag()</code> &mdash; a boolean: whether one is registered</li>
                <li><code className="text-amber-600 dark:text-amber-400">registerNametag(name)</code> &mdash; registers a new nametag</li>
                <li><code className="text-amber-600 dark:text-amber-400">isNametagAvailable(name)</code> &mdash; a boolean: whether the name is free</li>
              </ul>
            </div>

            <div id="api-instance-resolve" data-section="api-instance-resolve" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">sphere.resolve(identifier)</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Resolves a @nametag or bare nametag, a DIRECT:// address, a compressed chain pubkey (02/03 + 64 hex) or a
                64-hex transport pubkey to full peer info. Anything else is tried as a nametag and resolves to
                <code className="text-amber-600 dark:text-amber-400"> null</code>.
              </p>
              <CodeBlock code={`async resolve(identifier: string): Promise<PeerInfo | null>`} />
              <CodeBlock
                filename="resolve.ts"
                code={`const peer = await sphere.resolve('@alice');
if (peer) {
  console.log(peer.directAddress);
  console.log(peer.transportPubkey);
}`}
              />
            </div>

            <div id="api-instance-events" data-section="api-instance-events" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">sphere.on(type, handler)</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Subscribe to SDK events. Returns an unsubscribe function. The generic is the event <em>name</em>: the
                handler payload is derived from it, so pass the event as a literal and let it infer.
              </p>
              <CodeBlock code={`on<T extends SphereEventType>(type: T, handler: (data: SphereEventMap[T]) => void): () => void
off<T extends SphereEventType>(type: T, handler: (data: SphereEventMap[T]) => void): void`} />

              <h4 className="font-medium text-lg mt-6 mb-3">Event Types</h4>
              <ParamTable
                params={[
                  { name: 'transfer:incoming', type: 'IncomingTransfer', description: 'New incoming transfer. Fungible tokens are in .tokens, NFTs in .coinless' },
                  { name: 'transfer:updated', type: 'TransferResult', description: 'Outgoing transfer updated (confirmed, delivery pending or failed)' },
                  { name: 'message:dm', type: 'DirectMessage', description: 'Direct message received' },
                  { name: 'payment_request:incoming', type: 'PaymentRequestView', description: 'Payment request received' },
                ]}
              />
              <p className="text-neutral-600 dark:text-neutral-400 mt-4">
                Handlers are typed from the event name, so these rarely need importing. To name one yourself,
                <code className="text-amber-600 dark:text-amber-400"> PaymentRequestView</code> comes from
                <code className="text-amber-600 dark:text-amber-400"> @unicitylabs/sphere-sdk/payments-v2</code>; the other
                three are exported from the package root.
              </p>

              <CodeBlock
                filename="events.ts"
                code={`const unsub = sphere.on('transfer:incoming', (transfer) => {
  console.log('Tokens received:', transfer.tokens);
});

unsub();

sphere.off('transfer:incoming', myHandler);`}
              />
              <p className="text-neutral-600 dark:text-neutral-400 mt-4">
                <code className="text-amber-600 dark:text-amber-400">on()</code> returns an unsubscribe function &mdash; call
                <code className="text-amber-600 dark:text-amber-400"> unsub()</code> when you are done listening.
                <code className="text-amber-600 dark:text-amber-400"> off()</code> removes one specific handler instead.
              </p>
            </div>

            <div id="api-instance-wallet" data-section="api-instance-wallet" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">Wallet Management</code>
              </h3>
              <CodeBlock
                code={`const mnemonic = sphere.getMnemonic();

const backup = sphere.exportToJSON({
  includeMnemonic: true,
  password: 'optional-encryption',
});
const json = JSON.stringify(backup, null, 2);

const txt = sphere.exportToTxt();

const addr = sphere.deriveAddress(0);
const addrs = sphere.deriveAddresses(5);

await sphere.switchToAddress(1);

const info = sphere.getWalletInfo();
console.log(info.derivationMode);
console.log(info.source);

await sphere.destroy();`}
              />
              <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
                <li>
                  <code className="text-amber-600 dark:text-amber-400">getMnemonic()</code> &mdash; the backup mnemonic, typed
                  <code className="text-amber-600 dark:text-amber-400"> string | null</code>
                </li>
                <li>
                  <code className="text-amber-600 dark:text-amber-400">exportToJSON()</code> &mdash; returns a
                  <code className="text-amber-600 dark:text-amber-400"> WalletJSON</code> object, not a string, so stringify it before
                  writing a file. <code className="text-amber-600 dark:text-amber-400">includeMnemonic</code> puts the seed in the
                  backup, and <code className="text-amber-600 dark:text-amber-400">password</code> encrypts it. Both are optional.
                </li>
                <li>
                  <code className="text-amber-600 dark:text-amber-400">exportToTxt()</code> &mdash; the text export, already a string
                </li>
                <li>
                  <code className="text-amber-600 dark:text-amber-400">deriveAddress(0)</code> derives one address;
                  <code className="text-amber-600 dark:text-amber-400"> deriveAddresses(5)</code> derives the first five
                </li>
                <li>
                  <code className="text-amber-600 dark:text-amber-400">switchToAddress(1)</code> changes the active address
                </li>
                <li>
                  <code className="text-amber-600 dark:text-amber-400">getWalletInfo()</code> &mdash;
                  <code className="text-amber-600 dark:text-amber-400"> derivationMode</code> logs
                  <code className="text-amber-600 dark:text-amber-400"> 'bip32'</code>, and
                  <code className="text-amber-600 dark:text-amber-400"> source</code> is
                  <code className="text-amber-600 dark:text-amber-400"> 'mnemonic' | 'file' | 'unknown'</code>
                </li>
                <li>
                  <code className="text-amber-600 dark:text-amber-400">destroy()</code> releases the wallet's resources
                </li>
              </ul>
            </div>
          </section>

          {/* ============================================================ */}
          {/* API REFERENCE - PAYMENTS                                     */}
          {/* ============================================================ */}
          <section id="api-payments" data-section="api-payments" className="mb-16">
            <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-neutral-200 dark:border-neutral-700">
              API Reference &mdash; Payments (L3)
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              All L3 payment operations are accessed via <code className="text-amber-600 dark:text-amber-400">sphere.payments</code> — available
              on every wallet composed with a wallet-api transport. The one exception is the messaging-only composition
              <code className="text-amber-600 dark:text-amber-400"> walletApi: 'none'</code>, where the getter throws
              <code className="text-amber-600 dark:text-amber-400"> PAYMENTS_NOT_COMPOSED</code>; branch on
              <code className="text-amber-600 dark:text-amber-400"> sphere.hasPayments</code>.
            </p>
            <p className="text-neutral-600 dark:text-neutral-400 mb-8">
              <code className="text-amber-600 dark:text-amber-400">coinId</code> is the 64-character lowercase hex coin id — no
              <code className="text-amber-600 dark:text-amber-400"> 0x</code> prefix. Get it from
              <code className="text-amber-600 dark:text-amber-400"> getCoinIdBySymbol('UCT')</code> after
              <code className="text-amber-600 dark:text-amber-400"> await TokenRegistry.waitForReady()</code>, or take it from
              <code className="text-amber-600 dark:text-amber-400"> assets()</code>. A prefixed id matches no holdings, and
              <code className="text-amber-600 dark:text-amber-400"> mint()</code> resolves
              <code className="text-amber-600 dark:text-amber-400"> {'{ success: false }'}</code> with nothing minted.
            </p>

            <div id="api-payments-send" data-section="api-payments-send" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">sphere.payments.send(request)</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Sends tokens to a recipient. Supports @nametags and direct addresses.
              </p>

              <h4 className="font-medium text-lg mt-6 mb-3">Signature</h4>
              <CodeBlock code={`async send(request: SendRequest): Promise<TransferResult>`} />

              <h4 className="font-medium text-lg mt-6 mb-3">Parameters</h4>
              <ParamTable
                params={[
                  { name: 'coinId', type: 'string', description: '64-char lowercase hex coin id (no 0x prefix)', required: true },
                  { name: 'amount', type: 'string', description: 'Amount in smallest units', required: true },
                  { name: 'recipient', type: 'string', description: '@nametag or DIRECT:// address', required: true },
                  { name: 'memo', type: 'string', description: 'Optional memo' },
                ]}
              />

              <h4 className="font-medium text-lg mt-6 mb-3">Returns</h4>
              <CodeBlock
                code={`interface TransferResult {
  id: string;
  status: TransferStatus;
  tokens: Token[];
  tokenTransfers: TokenTransferDetail[];
  error?: string;
  deliveryPending?: boolean;
  deliveryState?: 'landed' | 'pending-delivery';
}`}
              />
              <p className="text-neutral-600 dark:text-neutral-400 mt-4">
                <code className="text-amber-600 dark:text-amber-400">id</code> is the transfer ID.
                A resolved <code className="text-amber-600 dark:text-amber-400">send()</code> means the spend is final on-chain, so
                <code className="text-amber-600 dark:text-amber-400"> status</code> is only ever
                <code className="text-amber-600 dark:text-amber-400"> 'delivered'</code> (<code className="text-amber-600 dark:text-amber-400">deliveryState: 'landed'</code> — it
                reached the recipient's mailbox) or <code className="text-amber-600 dark:text-amber-400">'confirmed'</code> with
                <code className="text-amber-600 dark:text-amber-400"> deliveryPending: true</code> — certified on-chain, delivery still being retried
                automatically. Both mean the money left the wallet; neither is an error.
                <code className="text-amber-600 dark:text-amber-400"> 'submitted'</code> and
                <code className="text-amber-600 dark:text-amber-400"> 'failed'</code> appear only on the
                <code className="text-amber-600 dark:text-amber-400"> transfer:updated</code> event, never as a resolved result.
                <code className="text-amber-600 dark:text-amber-400"> tokens</code> holds the source tokens this send consumed — each carrying the full
                source amount, not the amount sent, and not new holdings. Read
                <code className="text-amber-600 dark:text-amber-400"> sphere.payments.tokens()</code> for what the wallet holds afterwards.
              </p>

              <h4 className="font-medium text-lg mt-6 mb-3">Example</h4>
              <CodeBlock
                filename="send.ts"
                code={`const result = await sphere.payments.send({
  coinId,
  amount: '100000000',
  recipient: '@merchant',
  memo: 'Payment for order #123',
});

console.log('Transfer ID:', result.id);
if (result.deliveryPending) console.log('Sent — delivery pending, retried automatically');`}
              />

              <div className="my-4 p-4 rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10">
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  <strong>A failure throws — and a retry must never call send() again.</strong> When
                  <code className="text-amber-600 dark:text-amber-400"> isPossiblyCommittedSendOutcome(err)</code> is true
                  (<code className="text-amber-600 dark:text-amber-400">SEND_SYNC_PENDING</code>,
                  <code className="text-amber-600 dark:text-amber-400"> CERTIFICATION_UNCONFIRMED</code>,
                  <code className="text-amber-600 dark:text-amber-400"> CHECKPOINT_PERSIST_FAILED</code>,
                  <code className="text-amber-600 dark:text-amber-400"> SPLIT_CHECKPOINT_LOST</code>,
                  <code className="text-amber-600 dark:text-amber-400"> CHECKPOINT_TRUSTBASE_MISMATCH</code>,
                  <code className="text-amber-600 dark:text-amber-400"> SEND_PARTIALLY_COMPLETED</code>) the money may already have left the
                  wallet and the SDK finishes the original transfer itself: surface it with
                  <code className="text-amber-600 dark:text-amber-400"> sphere.payments.pendingTransfers()</code> and wire any Retry button to
                  <code className="text-amber-600 dark:text-amber-400"> sphere.payments.resumeNow()</code>. A second
                  <code className="text-amber-600 dark:text-amber-400"> send()</code> gets a new transfer ID and pays the recipient twice. A
                  <code className="text-amber-600 dark:text-amber-400"> PartialSendConflictError</code> means part of the amount is already final and only
                  <code className="text-amber-600 dark:text-amber-400"> err.remainingAmount</code> is still owed. Otherwise nothing left the wallet and a
                  fresh <code className="text-amber-600 dark:text-amber-400">send()</code> is safe.
                </p>
              </div>
              <CodeBlock
                filename="send-errors.ts"
                code={`import { PartialSendConflictError, isPossiblyCommittedSendOutcome } from '@unicitylabs/sphere-sdk';

try {
  await sphere.payments.send({ coinId, amount: '100000000', recipient: '@merchant' });
} catch (err) {
  if (err instanceof PartialSendConflictError) {
    // Only err.remainingAmount is still owed — pay it as a NEW send of exactly that amount.
    console.warn(\`Partly sent: \${err.remainingAmount} base units were not sent\`);
  } else if (isPossiblyCommittedSendOutcome(err)) {
    // May already have left the wallet — never re-send. Offer resumeNow(), not send().
    console.warn('Sent, waiting for confirmation');
  } else {
    // Clean pre-commit failure: nothing left the wallet, a fresh send() is safe.
    console.error(err instanceof Error ? err.message : String(err));
  }
}`}
              />
            </div>

            <div id="api-payments-getbalance" data-section="api-payments-getbalance" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">sphere.payments.assets(coinId?)</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Returns aggregated balance per coin type, with fiat prices from the price provider. Async. Amounts are in smallest units,
                and <code className="text-amber-600 dark:text-amber-400">totalAmount</code> excludes tokens in flight on an outgoing send — those are
                reported separately, in <code className="text-amber-600 dark:text-amber-400">transferringAmount</code> and
                <code className="text-amber-600 dark:text-amber-400"> transferringTokenCount</code>, so a UI can show a &ldquo;Sending&rdquo;
                badge without inflating the spendable balance.
              </p>
              <CodeBlock code={`async assets(coinId?: string): Promise<Asset[]>`} />
              <CodeBlock
                code={`interface Asset {
  coinId: string;
  symbol: string;
  totalAmount: string;
  tokenCount: number;
  transferringAmount: string;
  transferringTokenCount: number;
  decimals: number;
  priceUsd: number | null;
  fiatValueUsd: number | null;
}`}
              />
              <p className="text-neutral-600 dark:text-neutral-400 mt-4 mb-4">
                An <code className="text-amber-600 dark:text-amber-400">Asset</code> also carries
                <code className="text-amber-600 dark:text-amber-400"> name</code>,
                <code className="text-amber-600 dark:text-amber-400"> iconUrl</code>, the
                <code className="text-amber-600 dark:text-amber-400"> confirmed*</code>/<code className="text-amber-600 dark:text-amber-400">unconfirmed*</code> counterparts,
                <code className="text-amber-600 dark:text-amber-400"> priceEur</code>,
                <code className="text-amber-600 dark:text-amber-400"> change24h</code> and
                <code className="text-amber-600 dark:text-amber-400"> fiatValueEur</code>.
              </p>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Called with no argument it returns every asset. Pass a
                <code className="text-amber-600 dark:text-amber-400"> coinId</code> to get only that one.
              </p>
              <CodeBlock
                filename="balance.ts"
                code={`const assets = await sphere.payments.assets();
assets.forEach(a => console.log(\`\${a.symbol}: \${a.totalAmount} ($\${a.fiatValueUsd})\`));

const [asset] = await sphere.payments.assets(coinId);
console.log('Balance:', asset?.totalAmount);`}
              />
            </div>

            <div id="api-payments-getassets" data-section="api-payments-getassets" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">sphere.payments.mint(coinId, amount)</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Self-mints fungible tokens to this wallet (testnet top-up — no faucet).
              </p>
              <CodeBlock code={`async mint(coinId: string, amount: bigint): Promise<MintResult>`} />
              <CodeBlock
                filename="mint.ts"
                code={`const result = await sphere.payments.mint(coinId, 100000000n);
if (result.success) {
  console.log('Minted token:', result.tokenId);
}`}
              />
            </div>

            <div id="api-payments-gettokens" data-section="api-payments-gettokens" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">sphere.payments.tokens(filter?)</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Returns individual token objects. Optionally filter by coin ID. Synchronous. Coinless (NFT) holdings are never
                returned here and never counted by <code className="text-amber-600 dark:text-amber-400">assets()</code> — read them with
                <code className="text-amber-600 dark:text-amber-400"> sphere.payments.coinless()</code>.
              </p>
              <CodeBlock code={`tokens(filter?: { coinId?: string }): Token[]`} />
              <CodeBlock
                filename="tokens.ts"
                code={`const tokens = sphere.payments.tokens();

const filtered = sphere.payments.tokens({ coinId });

tokens.forEach(t => {
  console.log(t.id, t.coinId, t.amount, t.status);
});`}
              />
            </div>

            <div id="api-payments-gethistory" data-section="api-payments-gethistory" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">sphere.payments.history(page?)</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Returns the L3 transaction history, newest-first, in cursor pages.
              </p>
              <CodeBlock code={`async history(page?: { before?: string; limit?: number }): Promise<HistoryPage>`} />
              <CodeBlock
                filename="history.ts"
                code={`const { entries, more, cursor } = await sphere.payments.history({ limit: 50 });
entries.forEach(tx => {
  console.log(tx.type, tx.amount, tx.timestamp);
});

if (more && cursor) {
  const nextPage = await sphere.payments.history({ before: cursor, limit: 50 });
}`}
              />
              <p className="text-neutral-600 dark:text-neutral-400 mt-4">
                Each entry's <code className="text-amber-600 dark:text-amber-400">type</code> is
                <code className="text-amber-600 dark:text-amber-400"> 'SENT'</code>,
                <code className="text-amber-600 dark:text-amber-400"> 'RECEIVED'</code> or
                <code className="text-amber-600 dark:text-amber-400"> 'MINT'</code>, and
                <code className="text-amber-600 dark:text-amber-400"> timestamp</code> is epoch ms. While
                <code className="text-amber-600 dark:text-amber-400"> more</code> is true, pass
                <code className="text-amber-600 dark:text-amber-400"> cursor</code> as
                <code className="text-amber-600 dark:text-amber-400"> before</code> to get the next, older page.
              </p>
            </div>

            <div id="api-payments-receive" data-section="api-payments-receive" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">sphere.payments.receive()</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Explicitly checks for and processes incoming token transfers. A coinless (NFT) arrival is named in
                <code className="text-amber-600 dark:text-amber-400"> transfer.coinless</code>, never in
                <code className="text-amber-600 dark:text-amber-400"> transfer.tokens</code>, which is empty for it — read both.
              </p>
              <CodeBlock code={`async receive(): Promise<{ transfers: IncomingTransfer[] }>`} />
              <CodeBlock
                filename="receive.ts"
                code={`const { transfers } = await sphere.payments.receive();
console.log('Received:', transfers.length, 'transfers');
transfers.forEach(transfer => {
  console.log('Incoming coins:', transfer.tokens);
  console.log('Incoming NFTs:', transfer.coinless ?? []);
});`}
              />
            </div>

            <div id="api-payments-request" data-section="api-payments-request" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">Payment Requests</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Request payments from others and manage incoming requests via <code className="text-amber-600 dark:text-amber-400">sphere.payments.requests</code>.
                <code className="text-amber-600 dark:text-amber-400"> create()</code> never throws — it resolves
                <code className="text-amber-600 dark:text-amber-400"> {'{ success, requestId?, error? }'}</code>, so check
                <code className="text-amber-600 dark:text-amber-400"> success</code>.
                <code className="text-amber-600 dark:text-amber-400"> status</code> is
                <code className="text-amber-600 dark:text-amber-400"> 'pending' | 'settling' | 'paid' | 'rejected' | 'expired'</code>;
                <code className="text-amber-600 dark:text-amber-400"> 'settling'</code> means a <code className="text-amber-600 dark:text-amber-400">pay()</code> is
                still converging, so the SDK refuses to pay that request again, and
                <code className="text-amber-600 dark:text-amber-400"> dismissProcessed()</code> clears only the terminal three.
              </p>
              <CodeBlock
                filename="payment-requests.ts"
                code={`const req = await sphere.payments.requests.create('@buyer', {
  amount: '50000000',
  coinId,
  memo: 'Invoice #456',
});
if (!req.success) throw new Error(req.error);

sphere.on('payment_request:incoming', (request) => {
  console.log(\`\${request.senderNametag} requests \${request.amount}\`);
});

const pending = sphere.payments.requests.list()
  .filter(r => r.status === 'pending');

await sphere.payments.requests.pay(requestId);
await sphere.payments.requests.decline(requestId);

sphere.payments.requests.dismissProcessed();`}
              />
              <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
                <li><code className="text-amber-600 dark:text-amber-400">create(recipient, terms)</code> sends a payment request to a peer</li>
                <li><code className="text-amber-600 dark:text-amber-400">payment_request:incoming</code> fires for requests sent to you</li>
                <li><code className="text-amber-600 dark:text-amber-400">list()</code> returns every request, so filter it by <code className="text-amber-600 dark:text-amber-400">status</code> yourself</li>
                <li><code className="text-amber-600 dark:text-amber-400">pay(requestId)</code> settles one, <code className="text-amber-600 dark:text-amber-400">decline(requestId)</code> rejects it</li>
                <li><code className="text-amber-600 dark:text-amber-400">dismissProcessed()</code> clears the paid, rejected and expired requests from the list</li>
              </ul>
            </div>
          </section>

          {/* ============================================================ */}
          {/* API REFERENCE - COMMUNICATIONS                               */}
          {/* ============================================================ */}
          <section id="api-comms" data-section="api-comms" className="mb-16">
            <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-neutral-200 dark:border-neutral-700">
              API Reference &mdash; Communications
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-8">
              End-to-end encrypted messaging via Nostr, accessed via <code className="text-amber-600 dark:text-amber-400">sphere.communications</code>.
            </p>

            <div id="api-comms-senddm" data-section="api-comms-senddm" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">sphere.communications.sendDM(recipient, content)</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Sends an encrypted direct message to a peer. The content is a string, so serialize structured data as JSON
                yourself.
              </p>
              <CodeBlock code={`async sendDM(recipient: string, content: string): Promise<DirectMessage>`} />
              <ParamTable
                params={[
                  { name: 'recipient', type: 'string', description: '@nametag or transport pubkey', required: true },
                  { name: 'content', type: 'string', description: 'Message content (plain text or JSON string)', required: true },
                ]}
              />
              <CodeBlock
                filename="send-dm.ts"
                code={`const msg = await sphere.communications.sendDM('@alice', 'Hello!');
console.log('Message ID:', msg.id);

await sphere.communications.sendDM('@alice', JSON.stringify({
  type: 'offer',
  item: 'PSA-10 Charizard',
  price: 12000,
}));`}
              />
            </div>

            <div id="api-comms-ondm" data-section="api-comms-ondm" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">sphere.communications.onDirectMessage(handler)</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Subscribes to incoming direct messages. Returns an unsubscribe function.
                <code className="text-amber-600 dark:text-amber-400"> timestamp</code> is epoch ms.
              </p>
              <CodeBlock code={`onDirectMessage(handler: (message: DirectMessage) => void): () => void`} />
              <CodeBlock
                filename="on-dm.ts"
                code={`const unsub = sphere.communications.onDirectMessage((msg) => {
  console.log(\`From \${msg.senderNametag ?? msg.senderPubkey}\`);
  console.log('Content:', msg.content);
  console.log('Time:', new Date(msg.timestamp));
});`}
              />
              <p className="text-neutral-600 dark:text-neutral-400 mt-4">
                Call <code className="text-amber-600 dark:text-amber-400">unsub()</code> when you stop listening.
              </p>
            </div>

            <div id="api-comms-conversations" data-section="api-comms-conversations" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">Conversations</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                <code className="text-amber-600 dark:text-amber-400">getConversations()</code> returns every conversation grouped by
                peer, as a <code className="text-amber-600 dark:text-amber-400">{'Map<string, DirectMessage[]>'}</code>.
              </p>
              <CodeBlock
                code={`const conversations = sphere.communications.getConversations();

conversations.forEach((messages, peerPubkey) => {
  console.log(\`\${peerPubkey}: \${messages.length} messages\`);
});

const msgs = sphere.communications.getConversation(peerPubkey);

await sphere.communications.deleteConversation(peerPubkey);

await sphere.communications.markAsRead(['msg-id-1', 'msg-id-2']);

const unread = sphere.communications.getUnreadCount();`}
              />
              <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
                <li><code className="text-amber-600 dark:text-amber-400">getConversation(peerPubkey)</code> &mdash; the messages with one peer</li>
                <li><code className="text-amber-600 dark:text-amber-400">deleteConversation(peerPubkey)</code> &mdash; deletes that conversation</li>
                <li><code className="text-amber-600 dark:text-amber-400">markAsRead(ids)</code> &mdash; marks those message ids read</li>
                <li><code className="text-amber-600 dark:text-amber-400">getUnreadCount()</code> &mdash; the unread count</li>
              </ul>
            </div>

            <div id="api-comms-broadcast" data-section="api-comms-broadcast" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">Broadcasts</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Send public messages to topics. Anyone subscribed to those tags will see them.
              </p>
              <CodeBlock
                code={`await sphere.communications.broadcast('New item listed!', ['marketplace', 'collectibles']);

const unsub = sphere.communications.subscribeToBroadcasts(['marketplace']);

sphere.communications.onBroadcast((msg) => {
  console.log(\`\${msg.content} [tags: \${msg.tags}]\`);
});

const recent = sphere.communications.getBroadcasts(50);`}
              />
              <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
                <li><code className="text-amber-600 dark:text-amber-400">broadcast(content, tags)</code> publishes a message under those tags</li>
                <li><code className="text-amber-600 dark:text-amber-400">subscribeToBroadcasts(tags)</code> subscribes to the given tags and returns an unsubscribe function</li>
                <li><code className="text-amber-600 dark:text-amber-400">onBroadcast(handler)</code> delivers incoming broadcasts</li>
                <li><code className="text-amber-600 dark:text-amber-400">getBroadcasts(50)</code> returns the 50 most recent broadcasts</li>
              </ul>
            </div>
          </section>

          {/* ============================================================ */}
          {/* API REFERENCE - GROUP CHAT                                   */}
          {/* ============================================================ */}
          <section id="api-groupchat" data-section="api-groupchat" className="mb-16">
            <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-neutral-200 dark:border-neutral-700">
              API Reference &mdash; Group Chat (NIP-29)
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              NIP-29 group messaging via <code className="text-amber-600 dark:text-amber-400">sphere.groupChat</code>.
              Requires <code className="text-amber-600 dark:text-amber-400">groupChat: true</code> in initialization.
              <code className="text-amber-600 dark:text-amber-400"> sphere.groupChat</code> is
              <code className="text-amber-600 dark:text-amber-400"> GroupChatModule | null</code> — null until you enable it, so narrow it once. Each
              message carries <code className="text-amber-600 dark:text-amber-400">senderPubkey</code>, plus
              <code className="text-amber-600 dark:text-amber-400"> senderNametag</code> when the sender published one.
            </p>
            <CodeBlock
              filename="group-chat.ts"
              code={`const chat = sphere.groupChat;
if (!chat) throw new Error('groupChat is not enabled');

await chat.connect();

const groups = await chat.fetchAvailableGroups();
groups.forEach(g => console.log(g.id, g.name));

await chat.joinGroup('group-id');

await chat.sendMessage('group-id', 'Hello everyone!');

const messages = await chat.fetchMessages('group-id');

chat.onMessage((msg) => {
  console.log(\`[\${msg.groupId}] \${msg.senderNametag ?? msg.senderPubkey}: \${msg.content}\`);
});

const myGroups = chat.getGroups();

const newGroup = await chat.createGroup({
  name: 'Traders',
  description: 'Trading discussions',
});

await chat.leaveGroup('group-id');`}
            />
            <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li><code className="text-amber-600 dark:text-amber-400">connect()</code> opens the NIP-29 relay connection</li>
              <li><code className="text-amber-600 dark:text-amber-400">fetchAvailableGroups()</code> discovers public groups</li>
              <li><code className="text-amber-600 dark:text-amber-400">joinGroup(id)</code> joins one, <code className="text-amber-600 dark:text-amber-400">leaveGroup(id)</code> leaves it</li>
              <li><code className="text-amber-600 dark:text-amber-400">sendMessage(id, content)</code> posts to a group</li>
              <li><code className="text-amber-600 dark:text-amber-400">fetchMessages(id)</code> pulls the message history</li>
              <li><code className="text-amber-600 dark:text-amber-400">onMessage(handler)</code> delivers new messages as they arrive</li>
              <li><code className="text-amber-600 dark:text-amber-400">getGroups()</code> returns the groups you belong to</li>
              <li><code className="text-amber-600 dark:text-amber-400">createGroup(options)</code> creates a new one</li>
            </ul>
          </section>

          {/* ============================================================ */}
          {/* ============================================================ */}

          {/* ============================================================ */}
          {/* SPHERE CONNECT                                                */}
          {/* ============================================================ */}
          <section id="connect" data-section="connect" className="mb-16">
            <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-neutral-200 dark:border-neutral-700">
              Sphere Connect
            </h2>

            {/* Overview */}
            <div id="connect-overview" data-section="connect-overview" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">Overview</h3>
              <p className="text-neutral-600 dark:text-neutral-300 mb-4">
                Sphere Connect is a protocol that lets external dApps interact with the Sphere wallet.
                Instead of managing private keys directly, your app connects to the user's wallet
                and requests actions through a secure, permission-based interface.
              </p>
              <p className="text-neutral-600 dark:text-neutral-300 mb-4">
                The protocol follows a <strong>Host / Client</strong> architecture:
              </p>
              <ul className="list-disc ml-6 text-neutral-600 dark:text-neutral-300 space-y-2 mb-4">
                <li><strong>Host</strong> — the Sphere wallet web app. Manages keys, signs transactions, controls permissions.</li>
                <li><strong>Client</strong> — your dApp. Sends queries and intents to the wallet via a transport layer.</li>
              </ul>
              <p className="text-neutral-600 dark:text-neutral-300 mb-4">
                The SDK ships three transports. Only one of them reaches the hosted Sphere wallet:
              </p>
              <ul className="list-disc ml-6 text-neutral-600 dark:text-neutral-300 space-y-2">
                <li><strong>PostMessageTransport</strong> — <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 font-medium">Supported</span> the browser path, and the only transport the hosted wallet implements. In the supported arrangement your dApp runs <em>inside</em> Sphere, in an iframe, and talks to the wallet page that frames it; the popup fallback below rides the same transport against the wallet&rsquo;s <code>/connect</code> page.</li>
                <li><strong>WebSocketTransport</strong> — for a wallet host you run yourself. Its server mode expects the <em>wallet</em> to listen on a WebSocket port, which a browser page cannot do, so the hosted wallet at sphere.unicity.network never sits behind it. Use it for Node.js / CLI setups where you supply both ends.</li>
                <li><strong>ExtensionTransport</strong> — <span className="text-xs px-1.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 font-medium">Deprecated</span> the SDK still exports it, but there is no supported wallet behind it. The Sphere browser extension is discontinued — do not build against this transport.</li>
              </ul>
            </div>

            {/* How It Works */}
            <div id="connect-how-it-works" data-section="connect-how-it-works" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">How It Works</h3>

              {/* Flow diagram */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 my-8">
                <div className="flex flex-col items-center px-6 py-4 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 min-w-[140px]">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Your App</span>
                  <span className="font-semibold text-sm">ConnectClient</span>
                </div>
                <div className="text-neutral-400 dark:text-neutral-500 text-2xl sm:rotate-0 rotate-90">
                  &#x2194;
                </div>
                <div className="flex flex-col items-center px-6 py-4 border border-orange-300 dark:border-orange-600/50 rounded-xl bg-orange-50 dark:bg-orange-500/10 min-w-[140px]">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Channel</span>
                  <span className="font-semibold text-sm">Transport</span>
                </div>
                <div className="text-neutral-400 dark:text-neutral-500 text-2xl sm:rotate-0 rotate-90">
                  &#x2194;
                </div>
                <div className="flex flex-col items-center px-6 py-4 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 min-w-[140px]">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Wallet</span>
                  <span className="font-semibold text-sm">ConnectHost</span>
                </div>
              </div>

              <p className="text-neutral-600 dark:text-neutral-300 mb-3">
                Your app communicates with the wallet through three types of messages:
              </p>
              <ul className="list-disc ml-6 text-neutral-600 dark:text-neutral-300 space-y-2">
                <li><strong>Queries</strong> — read-only requests (get balance, identity, assets, transaction history)</li>
                <li><strong>Intents</strong> — actions that require user confirmation (send tokens, sign messages, send DMs)</li>
                <li><strong>Events</strong> — real-time push notifications from the wallet (incoming transfers, identity changes)</li>
              </ul>
            </div>

            {/* autoConnect */}
            <div id="connect-autoconnect" data-section="connect-autoconnect" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">autoConnect()</h3>
              <p className="text-neutral-600 dark:text-neutral-300 mb-4">
                The recommended way to connect from a browser app. It detects the environment and
                picks a transport, in this order:
              </p>

              <div className="overflow-x-auto my-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-neutral-500 border-b border-neutral-200 dark:border-neutral-700">
                      <th className="pb-2 pr-4">Priority</th>
                      <th className="pb-2 pr-4">Mode</th>
                      <th className="pb-2">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800">
                      <td className="py-2 pr-4 font-mono text-amber-600 dark:text-amber-400">P1</td>
                      <td className="py-2 pr-4">Iframe <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 font-medium">Supported</span></td>
                      <td className="py-2 text-neutral-600 dark:text-neutral-400">Your app is loaded inside Sphere as an agent. This is the path to build for.</td>
                    </tr>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800">
                      <td className="py-2 pr-4 font-mono text-amber-600 dark:text-amber-400">P2</td>
                      <td className="py-2 pr-4">Extension <span className="text-xs px-1.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 font-medium">Deprecated</span></td>
                      <td className="py-2 text-neutral-600 dark:text-neutral-400">Never selected in practice: the Sphere browser extension is discontinued, so nothing installs the <code>window.sphere</code> bridge this probes for.</td>
                    </tr>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800">
                      <td className="py-2 pr-4 font-mono text-amber-600 dark:text-amber-400">P3</td>
                      <td className="py-2 pr-4">Popup <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium">Fallback</span></td>
                      <td className="py-2 text-neutral-600 dark:text-neutral-400">Last resort when the page is not framed: needs <code>walletUrl</code>, a popup the browser does not block, and a fresh handshake on every reload — session resume does not work here. Not the arrangement to design for, but it is the usable one against a wallet you run yourself (a local Sphere dev server on <code>localhost:5173</code>).</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="my-6 p-4 rounded-xl border border-orange-300 dark:border-orange-500/40 bg-orange-50 dark:bg-orange-500/10">
                <p className="text-sm font-semibold mb-2">Running your dApp against the wallet</p>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-3">
                  The supported arrangement is your dApp running <em>inside</em> Sphere. To try a build you host yourself,
                  open it as a custom agent:
                </p>
                <CodeBlock
                  filename="open in Sphere"
                  code={`https://sphere.unicity.network/agents/custom?url=<your https url>`}
                />
                <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-3">
                  <strong>The URL must be https.</strong> Sphere only frames a custom tab whose URL parses with an
                  <code className="text-amber-600 dark:text-amber-400"> https:</code> protocol; anything else falls through
                  to the &ldquo;Load Custom URL&rdquo; prompt and never loads. The check is protocol-only, and it is not
                  the only gate — see below.
                </p>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-3">
                  <strong>A localhost URL will not get that far.</strong> The CDN in front of
                  <code className="text-amber-600 dark:text-amber-400"> sphere.unicity.network</code> rejects any request
                  whose query string contains <code className="text-amber-600 dark:text-amber-400">localhost</code> or
                  <code className="text-amber-600 dark:text-amber-400"> 127.0.0.1</code> with a
                  <strong> 403</strong> and its own error page, before the request reaches the wallet at all. Measured with
                  <code className="text-amber-600 dark:text-amber-400"> curl</code> on 2026-09-17: the same routes return
                  <strong> 200</strong> without those substrings
                  (<code className="text-amber-600 dark:text-amber-400">/connect</code>,
                  <code className="text-amber-600 dark:text-amber-400"> /connect?origin=…</code> and
                  <code className="text-amber-600 dark:text-amber-400"> /agents/custom?url=…</code> all answered 200), and
                  403 with them, on every route tried and regardless of request headers. It is a rule about local URLs in
                  the query, not something specific to Connect or to the popup path.
                </p>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  So to try a local build against the <em>hosted</em> wallet, put it on a publicly reachable https origin —
                  an https tunnel in front of your dev server is enough — and pass that URL. Plain http would not be framed
                  anyway. (Typing an https URL into the wallet&rsquo;s own &ldquo;Load Custom URL&rdquo; prompt never sends
                  that query string to the CDN, so it should clear the 403 and only face the https gate; that path has not
                  been verified end to end.) Against a wallet you run yourself — this repo&rsquo;s dev server on
                  <code className="text-amber-600 dark:text-amber-400"> localhost:5173</code> — no CDN is in the way at all,
                  so the popup path over plain <code className="text-amber-600 dark:text-amber-400">http://localhost</code> is
                  fine. The https rule above is the wallet&rsquo;s own, so it still applies to anything Sphere frames as a
                  custom tab, local or not.
                </p>
              </div>

              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                In the supported arrangement your dApp is already framed by Sphere, so
                <code className="text-amber-600 dark:text-amber-400"> autoConnect</code> picks the iframe transport by itself.
              </p>
              <CodeBlock
                filename="connect-example.ts"
                code={`import { autoConnect } from '@unicitylabs/sphere-sdk/connect/browser';
import { SPHERE_NETWORKS, WALLET_EVENTS } from '@unicitylabs/sphere-sdk/connect';
import type { PublicIdentity, WalletUnlockedPayload } from '@unicitylabs/sphere-sdk/connect';

const { client, connection, disconnect } = await autoConnect({
  dapp: {
    name: 'My App',
    url: location.origin,
    icon: location.origin + '/icon.svg',
  },
  network: SPHERE_NETWORKS.testnet2,
  permissions: ['identity:read', 'balance:read', 'transfer:request', 'events:subscribe'],
  walletUrl: 'https://sphere.unicity.network',
});`}
              />
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                <code className="text-amber-600 dark:text-amber-400">dapp.icon</code> is shown in the wallet approval dialog.
              </p>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                <code className="text-amber-600 dark:text-amber-400">network</code> is required. The wallet&rsquo;s
                compatibility gate treats a missing or mismatched network as
                <code className="text-amber-600 dark:text-amber-400"> INCOMPATIBLE_NETWORK</code> (4008) and refuses the
                handshake before any UI appears. Take the id from the
                <code className="text-amber-600 dark:text-amber-400"> SPHERE_NETWORKS</code> table so it cannot drift:
                <code className="text-amber-600 dark:text-amber-400"> SPHERE_NETWORKS.testnet2</code> or
                <code className="text-amber-600 dark:text-amber-400"> SPHERE_NETWORKS.mainnet</code>.
              </p>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                <code className="text-amber-600 dark:text-amber-400">walletUrl</code> matters only to the popup fallback
                (P3), where <code className="text-amber-600 dark:text-amber-400">autoConnect</code> opens
                <code className="text-amber-600 dark:text-amber-400"> {'<walletUrl>'}/connect?origin={'<your origin>'}</code>.
                Passing it is harmless. It is not what makes the iframe path work &mdash; that needs Sphere to frame your page.
              </p>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Ask for exactly the scopes this file uses. Every query, intent and event subscription below maps to one:
              </p>
              <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
                <li>
                  <code className="text-amber-600 dark:text-amber-400">identity:read</code> &mdash;
                  <code className="text-amber-600 dark:text-amber-400"> sphere_getIdentity</code>
                </li>
                <li>
                  <code className="text-amber-600 dark:text-amber-400">balance:read</code> &mdash;
                  <code className="text-amber-600 dark:text-amber-400"> sphere_getBalance</code>
                </li>
                <li>
                  <code className="text-amber-600 dark:text-amber-400">transfer:request</code> &mdash; the
                  <code className="text-amber-600 dark:text-amber-400"> send</code> intent. Without it the intent is refused
                  with <code className="text-amber-600 dark:text-amber-400">PERMISSION_DENIED</code> (4002).
                </li>
                <li>
                  <code className="text-amber-600 dark:text-amber-400">events:subscribe</code> &mdash;
                  <code className="text-amber-600 dark:text-amber-400"> client.on('transfer:incoming', &hellip;)</code>. The
                  subscribe RPC fails silently, so without this scope the handler never fires.
                </li>
              </ul>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Queries are read-only. The <code className="text-amber-600 dark:text-amber-400">send</code> intent is not:
                it moves money, and the wallet asks the user to confirm it.
              </p>
              <CodeBlock
                filename="connect-example.ts"
                code={`const identity = await client.query('sphere_getIdentity');
const balance = await client.query('sphere_getBalance');

// 4201 INTENT_OUTCOME_UNKNOWN: it may or may not have moved — reconcile, never retry.
const result = await client.intent('send', {
  to: '@alice',
  amount: '1000000000000000000',
  coinId: '<lowercase hex coin id>',
});`}
              />
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                <code className="text-amber-600 dark:text-amber-400">to</code> takes a Unicity ID or a
                <code className="text-amber-600 dark:text-amber-400"> DIRECT://</code> address.
                <code className="text-amber-600 dark:text-amber-400"> amount</code> is in base units &mdash; the smallest
                indivisible unit &mdash; as a positive integer string.
                <code className="text-amber-600 dark:text-amber-400"> coinId</code> is required, and it is the bare lowercase
                hex id with no <code className="text-amber-600 dark:text-amber-400">0x</code> prefix; read one off
                <code className="text-amber-600 dark:text-amber-400"> sphere_getAssets</code>. Omit it and the wallet rejects
                the intent with <code className="text-amber-600 dark:text-amber-400">INVALID_PARAMS</code>.
              </p>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                The result is
                <code className="text-amber-600 dark:text-amber-400"> {'{ success: true, transferId?: string, status: string, deliveryPending: boolean }'}</code>.
                <code className="text-amber-600 dark:text-amber-400"> deliveryPending: true</code> means the spend is final
                on-chain and the recipient&rsquo;s delivery is queued; it retries automatically. Never re-send it.
              </p>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                A lock is a state, not a teardown. The session is still alive: do not disconnect, do not clear your saved
                session, do not re-handshake. Until the wallet is unlocked, every request except
                <code className="text-amber-600 dark:text-amber-400"> sphere_getIdentity</code>,
                <code className="text-amber-600 dark:text-amber-400"> sphere_subscribe</code>,
                <code className="text-amber-600 dark:text-amber-400"> sphere_unsubscribe</code> and
                <code className="text-amber-600 dark:text-amber-400"> sphere_disconnect</code> is answered
                <code className="text-amber-600 dark:text-amber-400"> WALLET_LOCKED</code> (4009).
                <code className="text-amber-600 dark:text-amber-400"> sphere_getIdentity</code> is served from the pre-lock
                snapshot, so keep showing the connected identity. Show a banner and keep everything else.
              </p>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                The wallet shows its own passive &ldquo;requests blocked &mdash; Unlock&rdquo; badge. Nothing you do can
                raise its password field, and you should not try.
              </p>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                <code className="text-amber-600 dark:text-amber-400">ConnectEventHandler</code> is
                <code className="text-amber-600 dark:text-amber-400"> (data: unknown) =&gt; void</code>, so destructuring the
                payload directly does not compile under strict TypeScript. Narrow it with the exported payload type.
              </p>
              <CodeBlock
                filename="connect-example.ts"
                code={`client.on(WALLET_EVENTS.LOCKED, () => {
  setWalletLocked(true);
});

client.on(WALLET_EVENTS.UNLOCKED, (payload) => {
  const { identity } = (payload ?? {}) as WalletUnlockedPayload;
  if (identity?.chainPubkey !== connectedPubkey) {
    disconnect();
    return;
  }
  setWalletLocked(false);
  retryLastQuery();        // queries only — NEVER auto-resume an intent
});`}
              />
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                On unlock the same session continues: no re-handshake, no re-approval, and no re-subscribe, because the host
                re-arms your event streams before it sends the event. The payload carries the wallet&rsquo;s identity at
                unlock time, and it is not guaranteed to be the wallet you connected with &mdash; the lock screen&rsquo;s
                &ldquo;Forgot password &rarr; restore from recovery phrase&rdquo; installs a different seed. Compare before
                you retry anything. A different wallet is a new connection, so disconnect and start over.
              </p>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                <code className="text-amber-600 dark:text-amber-400">wallet:disconnected</code> is the teardown signal. The
                session is gone &mdash; logout, wallet deleted, you called
                <code className="text-amber-600 dark:text-amber-400"> disconnect</code>, the session expired, or a different
                seed was restored behind the lock screen. Clear your session and re-handshake to continue. Unlocking does not
                cure it.
              </p>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                An old wallet (Connect 2.0) never sends
                <code className="text-amber-600 dark:text-amber-400"> wallet:unlocked</code>, so do not wait for one. There a
                lock ends the session: reconnect on
                <code className="text-amber-600 dark:text-amber-400"> wallet:locked</code> instead.
              </p>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                <code className="text-amber-600 dark:text-amber-400">identity:changed</code> fires when the active wallet
                address switches. Its payload is the new public identity, narrowed the same way. Update the identity you
                display.
              </p>
              <CodeBlock
                filename="connect-example.ts"
                code={`client.on(WALLET_EVENTS.DISCONNECTED, () => {
  clearSession();
  showConnectButton();
});

if (client.walletProtocol === '2.0') {
  client.on(WALLET_EVENTS.LOCKED, () => reconnect());
}

client.on(WALLET_EVENTS.IDENTITY_CHANGED, (payload) => {
  showIdentity(payload as PublicIdentity);
});`}
              />
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Unlike the <code className="text-amber-600 dark:text-amber-400">wallet:*</code> events above,
                <code className="text-amber-600 dark:text-amber-400"> transfer:incoming</code> is not auto-pushed. It goes
                through <code className="text-amber-600 dark:text-amber-400">sphere_subscribe</code>, which needs
                <code className="text-amber-600 dark:text-amber-400"> events:subscribe</code>. Without that scope the
                subscribe is refused and swallowed: no throw, no error, and the handler never fires.
              </p>
              <CodeBlock
                filename="connect-example.ts"
                code={`client.on('transfer:incoming', (transfer) => {
  console.log('Received:', transfer);
});

disconnect();`}
              />
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Call <code className="text-amber-600 dark:text-amber-400">disconnect()</code> when you are done with the
                wallet. The full guide is at
                <code className="text-amber-600 dark:text-amber-400"> github.com/unicity-sphere/sphere-sdk/blob/main/docs/CONNECT.md</code>.
              </p>
              <p className="text-neutral-600 dark:text-neutral-400 mt-4">
                <strong>Session resume is an iframe-mode feature.</strong> In P1, save
                <code className="text-amber-600 dark:text-amber-400"> connection.sessionId</code> and pass it back as
                <code className="text-amber-600 dark:text-amber-400"> resumeSessionId</code> so your dApp&rsquo;s own reload
                reconnects without a prompt. In the popup fallback
                <code className="text-amber-600 dark:text-amber-400"> autoConnect</code> opens a fresh
                <code className="text-amber-600 dark:text-amber-400"> {'<walletUrl>'}/connect</code> page on every call, so a
                reload always re-handshakes — there it is the wallet&rsquo;s stored approval for your origin, not the
                sessionId, that keeps the prompt away.
              </p>
            </div>

            {/* Resources & Links */}
            <div id="connect-resources" data-section="connect-resources" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">Resources & Links</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <a
                  href="https://github.com/unicity-sphere/sphere-sdk-connect-example"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-2 p-5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-orange-400 dark:hover:border-orange-500 transition bg-white/50 dark:bg-neutral-800/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm group-hover:text-orange-500 transition">Connect Example Repository</span>
                    <svg className="w-4 h-4 text-neutral-400 group-hover:text-orange-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Working examples for browser and Node.js integration
                  </p>
                </a>

                <a
                  href="https://github.com/unicity-sphere/sphere-sdk/blob/main/docs/CONNECT.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-2 p-5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-orange-400 dark:hover:border-orange-500 transition bg-white/50 dark:bg-neutral-800/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm group-hover:text-orange-500 transition">Full Connect Documentation</span>
                    <svg className="w-4 h-4 text-neutral-400 group-hover:text-orange-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Complete protocol spec — RPC methods, intents, events, permissions
                  </p>
                </a>

                <a
                  href="https://github.com/unicity-sphere/unicity-claude-marketplace"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-2 p-5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-orange-400 dark:hover:border-orange-500 transition bg-white/50 dark:bg-neutral-800/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm group-hover:text-orange-500 transition">Claude Code Plugin Marketplace</span>
                    <svg className="w-4 h-4 text-neutral-400 group-hover:text-orange-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Sphere Connect plugin for Claude Code — auto-generates integration code
                  </p>
                </a>
              </div>
            </div>
          </section>

          {/* ============================================================ */}
          {/* GUIDES                                                       */}
          {/* ============================================================ */}
          <section id="guides" data-section="guides" className="mb-16">
            <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-neutral-200 dark:border-neutral-700">
              Guides
            </h2>

            <div id="guide-wallet-backup" data-section="guide-wallet-backup" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">Wallet Backup & Recovery</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                How to back up and recover wallets using mnemonics and JSON export.
              </p>

              <h4 className="font-medium text-lg mt-6 mb-3">Backup</h4>
              <CodeBlock
                code={`// This phrase recovers the entire wallet — store it securely.
const mnemonic = sphere.getMnemonic();

const json = sphere.exportToJSON({
  includeMnemonic: true,
  password: 'optional-encryption-password',
  addressCount: 5,
});

const txt = sphere.exportToTxt();`}
              />
              <p className="text-neutral-600 dark:text-neutral-400 mt-4">
                The mnemonic is the most important backup.
                <code className="text-amber-600 dark:text-amber-400"> exportToJSON()</code> wraps it in the addresses and
                the wallet metadata; <code className="text-amber-600 dark:text-amber-400">exportToTxt()</code> writes a
                plain-text backup, and takes the same <code className="text-amber-600 dark:text-amber-400">password</code> and
                <code className="text-amber-600 dark:text-amber-400"> addressCount</code> options.
              </p>

              <h4 className="font-medium text-lg mt-6 mb-3">Recovery</h4>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                <code className="text-amber-600 dark:text-amber-400">providers</code> below is the composed bundle from
                <a href="#browser-setup" className="text-orange-500 hover:underline"> Browser Setup</a> &mdash;
                <code className="text-amber-600 dark:text-amber-400"> createBrowserProviders(...)</code> wrapped in
                <code className="text-amber-600 dark:text-amber-400"> createWalletApiProviders(...)</code>. Every entry
                point needs the same <code className="text-amber-600 dark:text-amber-400">network</code> as
                <code className="text-amber-600 dark:text-amber-400"> walletApi.network</code>.
              </p>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                The mnemonic comes from the user at runtime &mdash; a textarea they paste into, a hardware prompt,
                whatever your UI is. Never a build-time constant, and never
                <code className="text-amber-600 dark:text-amber-400"> import.meta.env</code>: a
                <code className="text-amber-600 dark:text-amber-400"> VITE_</code> variable is inlined into the bundle
                and served to every visitor, so a seed put there is a published seed.
              </p>
              <CodeBlock
                code={`const NETWORK = 'testnet2';

const phrase = mnemonicInput.value.trim();
const { sphere } = await Sphere.init({
  ...providers,
  network: NETWORK,
  mnemonic: phrase,
});

const fromJson = await Sphere.importFromJSON({
  ...providers,
  network: NETWORK,
  jsonContent: '{"version":...}',
});

const fromLegacy = await Sphere.importFromLegacyFile({
  ...providers,
  network: NETWORK,
  fileContent: fileData,
  fileName: 'wallet.txt',
  password: 'if-encrypted',
  overwrite: userConfirmedReplacement, // omit it to keep an existing wallet safe
});`}
              />
              <p className="text-neutral-600 dark:text-neutral-400 mt-4">
                Since 0.17.4 an import over a storage that already holds a wallet is refused with
                <code className="text-amber-600 dark:text-amber-400"> ALREADY_INITIALIZED</code>, and that wallet is left
                untouched. <code className="text-amber-600 dark:text-amber-400">importFromJSON</code> returns that
                refusal as <code className="text-amber-600 dark:text-amber-400">{'{ success: false, error }'}</code>; the
                other paths reject. Pass <code className="text-amber-600 dark:text-amber-400">overwrite: true</code> only
                after the user has confirmed the replacement &mdash; the old wallet is erased before the new one is
                brought up, and it is not restored if that fails.
              </p>
              <p className="text-neutral-600 dark:text-neutral-400 mt-4">
                <code className="text-amber-600 dark:text-amber-400">importFromLegacyFile</code> reads the older backup
                files: <code className="text-amber-600 dark:text-amber-400">.txt</code> and JSON exports.
                <code className="text-amber-600 dark:text-amber-400"> .dat</code> was removed.
              </p>
            </div>
          </section>

          {/* ============================================================ */}
          {/* EXAMPLES                                                     */}
          {/* ============================================================ */}
          <section id="examples" data-section="examples" className="mb-16">
            <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-neutral-200 dark:border-neutral-700">
              Examples
            </h2>

            <div id="example-payment" data-section="example-payment" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">Simple Payment</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                A minimal example: initialize, check balance, send tokens, listen for incoming transfers.
                A brand-new wallet holds nothing, so the example stops before sending until there is a balance.
              </p>
              <CodeBlock
                filename="simple-payment.ts"
                code={`import { Sphere, isPossiblyCommittedSendOutcome } from '@unicitylabs/sphere-sdk';
import { createBrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';
import { createWalletApiProviders } from '@unicitylabs/sphere-sdk/impl/shared/wallet-api';

const NETWORK = 'testnet2';

async function main() {
  const providers = createWalletApiProviders(
    createBrowserProviders({ network: NETWORK }),
    { baseUrl: import.meta.env.VITE_WALLET_API_URL, network: NETWORK },
  );
  const { sphere, created, generatedMnemonic } = await Sphere.init({
    ...providers,
    network: NETWORK,
    autoGenerate: true,
  });
  if (created && generatedMnemonic) {
    console.log('New wallet — save this phrase:', generatedMnemonic);
  }

  const assets = await sphere.payments.assets();
  console.log('Balances:');
  assets.forEach(a => console.log(\`  \${a.symbol}: \${a.totalAmount}\`));
  const [asset] = assets;
  if (!asset) return console.log('Nothing to send yet — mint or receive tokens first.');

  // A rejected send may already have spent: resumeNow() converges the original.
  try {
    const result = await sphere.payments.send({
      coinId: asset.coinId,
      amount: '100000000',
      recipient: '@recipient',
      memo: 'Test payment',
    });
    console.log(\`Sent! Transfer ID: \${result.id}\`);
  } catch (err) {
    if (isPossiblyCommittedSendOutcome(err)) await sphere.payments.resumeNow();
    else throw err;
  }

  sphere.on('transfer:incoming', (transfer) => {
    console.log('Received tokens:', transfer.tokens);
  });
}

main();`}
              />
              <p className="text-neutral-600 dark:text-neutral-400 mt-4">
                <code className="text-amber-600 dark:text-amber-400">init()</code> loads the wallet already in this
                browser&rsquo;s storage. <code className="text-amber-600 dark:text-amber-400">autoGenerate</code> only
                fires when there is none, and the throwaway wallet it creates hands its phrase straight to the user. A
                seed never comes from <code className="text-amber-600 dark:text-amber-400">import.meta.env</code>:
                <code className="text-amber-600 dark:text-amber-400"> VITE_</code> variables are inlined into the bundle
                and served to every visitor.
              </p>
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-neutral-200 dark:border-neutral-700 pt-8 mt-16">
            <div className="flex flex-wrap gap-6 text-sm text-neutral-600 dark:text-neutral-400 mb-6">
              <a href="https://discord.com/invite/PGzNZT5uVp" target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition">
                Discord
              </a>
              <a href="https://github.com/unicity-sphere/sphere" target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition">
                GitHub
              </a>
              <a href={DEV_PORTAL_URL} target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition">
                Developer Portal
              </a>
            </div>
            <p className="text-sm text-neutral-500">
              AgentSphere by Unicity Labs
            </p>
          </footer>
        </main>
    </motion.div>
  );
}
