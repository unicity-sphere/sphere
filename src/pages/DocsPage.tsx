import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DEV_PORTAL_URL } from '../config/devPortal';

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
  | 'api-market'
  | 'guides'
  | 'guide-marketplace'
  | 'guide-wallet-backup'
  | 'examples'
  | 'example-payment'
  | 'example-marketplace'
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
      { id: 'api-payments-getbalance', label: 'payments.getBalance()' },
      { id: 'api-payments-getassets', label: 'payments.getAssets()' },
      { id: 'api-payments-gettokens', label: 'payments.getTokens()' },
      { id: 'api-payments-gethistory', label: 'payments.getHistory()' },
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
    id: 'api-market',
    label: 'Market',
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
      { id: 'guide-marketplace', label: 'Building a Marketplace' },
      { id: 'guide-wallet-backup', label: 'Wallet Backup & Recovery' },
    ],
  },
  {
    id: 'examples',
    label: 'Examples',
    children: [
      { id: 'example-payment', label: 'Simple Payment' },
      { id: 'example-marketplace', label: 'P2P Marketplace' },
    ],
  },
];

function CodeBlock({ code, filename, language = 'typescript' }: { code: string; filename?: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-neutral-900 rounded-xl overflow-hidden my-4">
      <div className="flex justify-between items-center px-4 py-2 border-b border-neutral-700">
        <span className="text-xs text-neutral-400 font-mono">{filename || language}</span>
        <button
          onClick={copyToClipboard}
          className="text-xs text-neutral-400 hover:text-white transition"
        >
          {copied ? '\u2713 Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 text-sm overflow-x-auto">
        <code className="text-amber-400">{code}</code>
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
              <span className="ml-3 text-sm font-normal text-neutral-500">v0.4.7</span>
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl">
              Build marketplaces where humans and AI agents trade anything. Payments, messaging, identity, and market intents in one SDK.
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
                code={`import { Sphere } from '@unicitylabs/sphere-sdk';
import { createBrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';

// 1. Create providers for your target network
const providers = createBrowserProviders({ network: 'testnet' });

// 2. Initialize (auto-loads existing wallet or creates new one)
const { sphere, created, generatedMnemonic } = await Sphere.init({
  ...providers,
  autoGenerate: true, // auto-generate mnemonic if no wallet exists
});

if (generatedMnemonic) {
  console.log('Save this mnemonic:', generatedMnemonic);
}

// 3. Check your identity
console.log('Nametag:', sphere.getNametag());
console.log('Identity:', sphere.identity);

// 4. Send tokens
await sphere.payments.send({
  coinId: '0x...',
  amount: '100000000',
  recipient: '@alice',
});

// 5. Listen for incoming transfers
sphere.on('transfer:incoming', (transfer) => {
  console.log('Received tokens:', transfer.tokens);
});`}
              />
            </div>

            <div id="browser-setup" data-section="browser-setup" className="scroll-mt-24 mb-12">
              <h2 className="text-2xl font-bold mb-4">Browser Setup</h2>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                The SDK uses a provider-based architecture. <code className="text-amber-600 dark:text-amber-400">createBrowserProviders()</code> creates
                all required providers for browser environments (IndexedDB storage, Nostr transport, aggregator oracle).
              </p>
              <CodeBlock
                filename="setup.ts"
                code={`import { createBrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';

const providers = createBrowserProviders({
  network: 'testnet',           // 'mainnet' | 'testnet' | 'dev'
  price: {
    platform: 'coingecko',      // fiat price provider
    cacheTtlMs: 5 * 60_000,    // cache prices for 5 minutes
  },
  groupChat: true,              // enable NIP-29 group chat
  market: true,                 // enable intent bulletin board
  tokenSync: {
    ipfs: { enabled: true },    // enable IPFS token backup
  },
});

// providers contains: storage, transport, oracle, tokenStorage,
// ipfsTokenStorage, groupChat, market`}
              />
              <p className="text-neutral-600 dark:text-neutral-400 mt-4">
                The providers object is spread into <code className="text-amber-600 dark:text-amber-400">Sphere.init()</code> to configure the SDK instance.
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
              <CodeBlock
                code={`// Access identity after initialization
console.log(sphere.identity);
// {
//   chainPubkey: '02abc...',
//   directAddress: 'DIRECT://...',
//   nametag: '@alice'
// }`}
              />
            </div>

            <div id="addresses" data-section="addresses" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">Addresses</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Each identity has several address types:
              </p>
              <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
                <li><strong>DIRECT address</strong> (<code className="text-amber-600 dark:text-amber-400">DIRECT://...</code>) - Used for L3 token transfers</li>
                <li><strong>PROXY address</strong> (<code className="text-amber-600 dark:text-amber-400">PROXY://...</code>) - Derived from nametag, used when direct address is unknown</li>
              </ul>
              <CodeBlock
                code={`// Derive additional addresses
const addr = sphere.deriveAddress(1); // second address
console.log(addr.publicKey);  // chain pubkey (hex)

// Switch active address
await sphere.switchToAddress(1);

// List all tracked addresses
const addresses = sphere.getActiveAddresses();`}
              />
            </div>

            <div id="nametags" data-section="nametags" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">Nametags (@username)</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Nametags are human-readable aliases registered on Nostr. Use them instead of addresses:
              </p>
              <CodeBlock
                filename="nametags.ts"
                code={`// Register a nametag (during wallet creation or later)
await sphere.registerNametag('alice');

// Check your nametag
console.log(sphere.getNametag()); // '@alice'

// Use nametags when sending tokens
await sphere.payments.send({
  coinId: '0x...',
  amount: '100',
  recipient: '@alice', // resolved automatically
});

// Resolve a nametag to peer info
const peer = await sphere.resolve('@bob');
console.log(peer?.directAddress);`}
              />
            </div>

            <div id="token-model" data-section="token-model" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">Token Model</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Tokens on Layer 3 are individual cryptographic objects with unique IDs, tracked by the aggregator.
              </p>
              <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
                <li><strong>Token</strong> - An individual token object with ID, coin type, amount, and state history</li>
                <li><strong>Asset</strong> - Aggregated balance for a coin type (sum of all tokens with same coinId)</li>
                <li><strong>coinId</strong> - Hex identifier for the token type (e.g., <code className="text-amber-600 dark:text-amber-400">0x...</code>)</li>
                <li>Amounts are strings in smallest units (like satoshis)</li>
              </ul>
              <CodeBlock
                code={`// Get individual tokens
const tokens = sphere.payments.getTokens();
tokens.forEach(t => {
  console.log(t.id, t.coinId, t.amount, t.status);
});

// Get aggregated balance per coin type
const assets = sphere.payments.getBalance();
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
                code={`// Transfer events
sphere.on('transfer:incoming', (data) => { /* incoming transfer */ });
sphere.on('transfer:confirmed', (data) => { /* transfer confirmed */ });

// Message events
sphere.on('message:dm', (msg) => { /* direct message received */ });

// Payment request events
sphere.on('payment_request:incoming', (req) => { /* payment request */ });

// Unsubscribe
const unsub = sphere.on('transfer:incoming', handler);
unsub(); // stop listening`}
              />
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
                  { name: 'mnemonic', type: 'string', description: 'BIP39 mnemonic to create wallet from (if no wallet exists)' },
                  { name: 'autoGenerate', type: 'boolean', description: 'Auto-generate mnemonic if wallet does not exist' },
                  { name: 'nametag', type: 'string', description: 'Register nametag on creation' },
                  { name: 'groupChat', type: 'boolean | config', description: 'Enable NIP-29 group chat module' },
                  { name: 'market', type: 'boolean | config', description: 'Enable market intent module' },
                  { name: 'password', type: 'string', description: 'Encrypt wallet with password' },
                ]}
              />

              <h4 className="font-medium text-lg mt-6 mb-3">Returns</h4>
              <CodeBlock
                code={`interface SphereInitResult {
  sphere: Sphere;              // The initialized instance
  created: boolean;            // Whether wallet was newly created
  generatedMnemonic?: string;  // Only if autoGenerate was used
}`}
              />

              <h4 className="font-medium text-lg mt-6 mb-3">Example</h4>
              <CodeBlock
                filename="init.ts"
                code={`import { Sphere } from '@unicitylabs/sphere-sdk';
import { createBrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';

const providers = createBrowserProviders({ network: 'testnet' });

// Auto-create with generated mnemonic
const { sphere, generatedMnemonic } = await Sphere.init({
  ...providers,
  autoGenerate: true,
  nametag: 'myagent',
});

// Or import with known mnemonic
const { sphere: imported } = await Sphere.init({
  ...providers,
  mnemonic: 'abandon badge cable drama ...',
});`}
              />
            </div>

            <div id="api-sphere-exists" data-section="api-sphere-exists" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">Sphere.exists(storage)</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Checks whether a wallet already exists in the given storage.
              </p>
              <CodeBlock code={`static async exists(storage: StorageProvider): Promise<boolean>`} />
              <CodeBlock
                filename="example.ts"
                code={`const providers = createBrowserProviders({ network: 'testnet' });
const hasWallet = await Sphere.exists(providers.storage);

if (hasWallet) {
  const { sphere } = await Sphere.init({ ...providers });
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
                code={`// Generate a 12-word mnemonic (128-bit entropy)
const mnemonic12 = Sphere.generateMnemonic();

// Generate a 24-word mnemonic (256-bit entropy)
const mnemonic24 = Sphere.generateMnemonic(256);

// Validate a mnemonic
const isValid = Sphere.validateMnemonic('abandon badge cable ...');
console.log(isValid); // true or false`}
              />
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
                The current wallet identity. Available after initialization.
              </p>
              <CodeBlock
                code={`interface Identity {
  chainPubkey: string;     // secp256k1 public key (hex)
  directAddress: string;   // DIRECT:// address for L3
  nametag?: string;        // registered @nametag
}

console.log(sphere.identity?.chainPubkey);
console.log(sphere.identity?.directAddress);
console.log(sphere.identity?.nametag); // '@alice'`}
              />
            </div>

            <div id="api-instance-nametag" data-section="api-instance-nametag" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">Nametag Methods</code>
              </h3>
              <CodeBlock
                code={`// Get current nametag
sphere.getNametag(); // '@alice' | undefined

// Check if nametag is registered
sphere.hasNametag(); // boolean

// Register a new nametag (publishes to Nostr)
await sphere.registerNametag('alice');

// Mint nametag as on-chain token
const result = await sphere.mintNametag('alice');

// Check availability
const available = await sphere.isNametagAvailable('bob'); // boolean`}
              />
            </div>

            <div id="api-instance-resolve" data-section="api-instance-resolve" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">sphere.resolve(identifier)</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Resolves a @nametag, DIRECT:// address, PROXY:// address, or pubkey to full peer info.
              </p>
              <CodeBlock code={`async resolve(identifier: string): Promise<PeerInfo | null>`} />
              <CodeBlock
                filename="resolve.ts"
                code={`const peer = await sphere.resolve('@alice');
if (peer) {
  console.log(peer.directAddress);  // DIRECT://...
  console.log(peer.transportPubkey);
}`}
              />
            </div>

            <div id="api-instance-events" data-section="api-instance-events" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">sphere.on(type, handler)</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Subscribe to SDK events. Returns an unsubscribe function.
              </p>
              <CodeBlock code={`on<T>(type: SphereEventType, handler: (data: T) => void): () => void`} />

              <h4 className="font-medium text-lg mt-6 mb-3">Event Types</h4>
              <ParamTable
                params={[
                  { name: 'transfer:incoming', type: 'IncomingTransfer', description: 'New incoming token transfer detected' },
                  { name: 'transfer:confirmed', type: 'TransferConfirmation', description: 'Outgoing transfer confirmed by aggregator' },
                  { name: 'message:dm', type: 'DirectMessage', description: 'Direct message received' },
                  { name: 'payment_request:incoming', type: 'IncomingPaymentRequest', description: 'Payment request received' },
                ]}
              />

              <CodeBlock
                filename="events.ts"
                code={`// Subscribe to incoming transfers
const unsub = sphere.on('transfer:incoming', (transfer) => {
  console.log('Tokens received:', transfer.tokens);
});

// Unsubscribe later
unsub();

// Remove a specific handler
sphere.off('transfer:incoming', myHandler);`}
              />
            </div>

            <div id="api-instance-wallet" data-section="api-instance-wallet" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">Wallet Management</code>
              </h3>
              <CodeBlock
                code={`// Get backup mnemonic
const mnemonic = sphere.getMnemonic(); // string | null

// Export wallet as JSON
const json = sphere.exportToJSON({
  includeMnemonic: true,
  password: 'optional-encryption',
});

// Export as text file
const txt = sphere.exportToTxt();

// Derive addresses
const addr = sphere.deriveAddress(0);
const addrs = sphere.deriveAddresses(5); // first 5 addresses

// Switch active address
await sphere.switchToAddress(1);

// Get wallet info
const info = sphere.getWalletInfo();
console.log(info.derivationMode); // 'bip32'
console.log(info.source);         // 'generated' | 'imported'

// Cleanup
await sphere.destroy();`}
              />
            </div>
          </section>

          {/* ============================================================ */}
          {/* API REFERENCE - PAYMENTS                                     */}
          {/* ============================================================ */}
          <section id="api-payments" data-section="api-payments" className="mb-16">
            <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-neutral-200 dark:border-neutral-700">
              API Reference &mdash; Payments (L3)
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-8">
              All L3 payment operations are accessed via <code className="text-amber-600 dark:text-amber-400">sphere.payments</code>.
            </p>

            <div id="api-payments-send" data-section="api-payments-send" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">sphere.payments.send(request)</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Sends tokens to a recipient. Supports @nametags and direct addresses.
              </p>

              <h4 className="font-medium text-lg mt-6 mb-3">Signature</h4>
              <CodeBlock code={`async send(request: TransferRequest): Promise<TransferResult>`} />

              <h4 className="font-medium text-lg mt-6 mb-3">Parameters</h4>
              <ParamTable
                params={[
                  { name: 'coinId', type: 'string', description: 'Token type ID (hex)', required: true },
                  { name: 'amount', type: 'string', description: 'Amount in smallest units', required: true },
                  { name: 'recipient', type: 'string', description: '@nametag or DIRECT:// address', required: true },
                  { name: 'memo', type: 'string', description: 'Optional memo' },
                  { name: 'addressMode', type: "'auto' | 'direct' | 'proxy'", description: "Address resolution mode (default: 'auto')" },
                  { name: 'transferMode', type: "'instant' | 'conservative'", description: "Transfer strategy (default: 'instant')" },
                ]}
              />

              <h4 className="font-medium text-lg mt-6 mb-3">Returns</h4>
              <CodeBlock
                code={`interface TransferResult {
  id: string;                    // Transfer ID
  status: TransferStatus;        // 'pending' | 'submitted' | 'confirmed' | ...
  tokens: Token[];               // Resulting tokens
  tokenTransfers: TokenTransferDetail[];
}`}
              />

              <h4 className="font-medium text-lg mt-6 mb-3">Example</h4>
              <CodeBlock
                filename="send.ts"
                code={`const result = await sphere.payments.send({
  coinId: '0x...',
  amount: '100000000',
  recipient: '@merchant',
  memo: 'Payment for order #123',
});

console.log('Transfer ID:', result.id);
console.log('Status:', result.status);`}
              />
            </div>

            <div id="api-payments-getbalance" data-section="api-payments-getbalance" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">sphere.payments.getBalance(coinId?)</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Returns aggregated balance per coin type. Synchronous (no network call).
              </p>
              <CodeBlock code={`getBalance(coinId?: string): Asset[]`} />
              <CodeBlock
                code={`interface Asset {
  coinId: string;
  symbol: string;
  totalAmount: string;     // in smallest units
  tokenCount: number;
  decimals: number;
  priceUsd: number | null;
  fiatValueUsd: number | null;
}`}
              />
              <CodeBlock
                filename="balance.ts"
                code={`// All assets
const assets = sphere.payments.getBalance();
assets.forEach(a => console.log(\`\${a.symbol}: \${a.totalAmount}\`));

// Specific coin
const [asset] = sphere.payments.getBalance('0x...');
console.log('Balance:', asset?.totalAmount);`}
              />
            </div>

            <div id="api-payments-getassets" data-section="api-payments-getassets" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">sphere.payments.getAssets(coinId?)</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Same as <code className="text-amber-600 dark:text-amber-400">getBalance()</code> but fetches live fiat prices from the price provider. Async.
              </p>
              <CodeBlock code={`async getAssets(coinId?: string): Promise<Asset[]>`} />
              <CodeBlock
                filename="assets.ts"
                code={`const assets = await sphere.payments.getAssets();
assets.forEach(a => {
  console.log(\`\${a.symbol}: \${a.totalAmount} ($\${a.fiatValueUsd})\`);
});`}
              />
            </div>

            <div id="api-payments-gettokens" data-section="api-payments-gettokens" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">sphere.payments.getTokens(filter?)</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Returns individual token objects. Optionally filter by coin ID or status.
              </p>
              <CodeBlock code={`getTokens(filter?: { coinId?: string; status?: TokenStatus }): Token[]`} />
              <CodeBlock
                filename="tokens.ts"
                code={`// All tokens
const tokens = sphere.payments.getTokens();

// Only confirmed tokens for a specific coin
const filtered = sphere.payments.getTokens({
  coinId: '0x...',
  status: 'confirmed',
});

tokens.forEach(t => {
  console.log(t.id, t.coinId, t.amount, t.status);
});`}
              />
            </div>

            <div id="api-payments-gethistory" data-section="api-payments-gethistory" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">sphere.payments.getHistory()</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Returns the L3 transaction history.
              </p>
              <CodeBlock code={`getHistory(): TransactionHistoryEntry[]`} />
              <CodeBlock
                filename="history.ts"
                code={`const history = sphere.payments.getHistory();
history.forEach(tx => {
  console.log(tx.type, tx.amount, tx.timestamp);
  // type: 'send' | 'receive'
});`}
              />
            </div>

            <div id="api-payments-receive" data-section="api-payments-receive" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">sphere.payments.receive(options?, callback?)</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Explicitly checks for and processes incoming token transfers.
              </p>
              <CodeBlock code={`async receive(options?: ReceiveOptions, callback?: (transfer: IncomingTransfer) => void): Promise<ReceiveResult>`} />
              <CodeBlock
                filename="receive.ts"
                code={`// Check for incoming transfers
const result = await sphere.payments.receive();
console.log('Received:', result.added, 'tokens');

// With callback for each transfer
await sphere.payments.receive({}, (transfer) => {
  console.log('Incoming:', transfer.tokens);
});`}
              />
            </div>

            <div id="api-payments-request" data-section="api-payments-request" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">Payment Requests</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Request payments from others and manage incoming/outgoing requests.
              </p>
              <CodeBlock
                filename="payment-requests.ts"
                code={`// Send a payment request to someone
await sphere.payments.sendPaymentRequest('@buyer', {
  amount: '50000000',
  coinId: '0x...',
  memo: 'Invoice #456',
});

// Handle incoming payment requests
sphere.payments.onPaymentRequest((request) => {
  console.log(\`\${request.senderNametag} requests \${request.amount}\`);
});

// List pending requests
const pending = sphere.payments.getPaymentRequests({ status: 'pending' });

// Pay a request
await sphere.payments.payPaymentRequest(requestId, 'Paid!');

// Or reject
await sphere.payments.rejectPaymentRequest(requestId);`}
              />
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
                Sends an encrypted direct message to a peer.
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
                code={`// Simple text message
const msg = await sphere.communications.sendDM('@alice', 'Hello!');
console.log('Message ID:', msg.id);

// Structured data (serialize as JSON)
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
              </p>
              <CodeBlock code={`onDirectMessage(handler: (message: DirectMessage) => void): () => void`} />
              <CodeBlock
                filename="on-dm.ts"
                code={`const unsub = sphere.communications.onDirectMessage((msg) => {
  console.log(\`From \${msg.senderNametag ?? msg.senderPubkey}\`);
  console.log('Content:', msg.content);
  console.log('Time:', new Date(msg.timestamp * 1000));
});

// Later: unsub();`}
              />
            </div>

            <div id="api-comms-conversations" data-section="api-comms-conversations" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">Conversations</code>
              </h3>
              <CodeBlock
                code={`// Get all conversations (grouped by peer)
const conversations = sphere.communications.getConversations();
// Map<string, DirectMessage[]>

conversations.forEach((messages, peerPubkey) => {
  console.log(\`\${peerPubkey}: \${messages.length} messages\`);
});

// Get messages with a specific peer
const msgs = sphere.communications.getConversation(peerPubkey);

// Delete a conversation
await sphere.communications.deleteConversation(peerPubkey);

// Mark messages as read
await sphere.communications.markAsRead(['msg-id-1', 'msg-id-2']);

// Get unread count
const unread = sphere.communications.getUnreadCount();`}
              />
            </div>

            <div id="api-comms-broadcast" data-section="api-comms-broadcast" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">
                <code className="text-amber-600 dark:text-amber-400">Broadcasts</code>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Send public messages to topics. Anyone subscribed to those tags will see them.
              </p>
              <CodeBlock
                code={`// Broadcast a message with tags
await sphere.communications.broadcast('New item listed!', ['marketplace', 'collectibles']);

// Subscribe to broadcasts on specific tags
const unsub = sphere.communications.subscribeToBroadcasts(['marketplace']);

// Listen for incoming broadcasts
sphere.communications.onBroadcast((msg) => {
  console.log(\`\${msg.content} [tags: \${msg.tags}]\`);
});

// Get recent broadcasts
const recent = sphere.communications.getBroadcasts(50);`}
              />
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
            </p>
            <CodeBlock
              filename="group-chat.ts"
              code={`// Connect to NIP-29 relay
await sphere.groupChat.connect();

// Discover public groups
const groups = await sphere.groupChat.fetchAvailableGroups();
groups.forEach(g => console.log(g.id, g.name));

// Join a group
await sphere.groupChat.joinGroup('group-id');

// Send a message
await sphere.groupChat.sendMessage('group-id', 'Hello everyone!');

// Fetch message history
const messages = await sphere.groupChat.fetchMessages('group-id');

// Listen for new messages
sphere.groupChat.onMessage((msg) => {
  console.log(\`[\${msg.groupId}] \${msg.pubkey}: \${msg.content}\`);
});

// Get your groups
const myGroups = sphere.groupChat.getGroups();

// Create a new group
const newGroup = await sphere.groupChat.createGroup({
  name: 'Traders',
  about: 'Trading discussions',
});

// Leave a group
await sphere.groupChat.leaveGroup('group-id');`}
            />
          </section>

          {/* ============================================================ */}
          {/* API REFERENCE - MARKET                                       */}
          {/* ============================================================ */}
          <section id="api-market" data-section="api-market" className="mb-16">
            <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-neutral-200 dark:border-neutral-700">
              API Reference &mdash; Market
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Intent bulletin board via <code className="text-amber-600 dark:text-amber-400">sphere.market</code>.
              Requires <code className="text-amber-600 dark:text-amber-400">market: true</code> in initialization.
            </p>
            <CodeBlock
              filename="market.ts"
              code={`// Post a sell intent
const result = await sphere.market.postIntent({
  description: 'PSA-10 Charizard card - Mint condition',
  intentType: 'sell',
  category: 'collectibles',
  price: 12000,
  currency: 'UCT',
});
console.log('Posted:', result.intentId);

// Search the marketplace
const results = await sphere.market.search('charizard card');
results.intents.forEach(intent => {
  console.log(intent.description, intent.price);
});

// Get your own intents
const myIntents = await sphere.market.getMyIntents();

// Close an intent
await sphere.market.closeIntent(intentId);

// Subscribe to live feed
const unsub = sphere.market.subscribeFeed((listing) => {
  console.log('New listing:', listing.description);
});

// Get recent listings
const recent = await sphere.market.getRecentListings();`}
            />
          </section>

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
                <li><strong>Host</strong> — the Sphere wallet (web app or browser extension). Manages keys, signs transactions, controls permissions.</li>
                <li><strong>Client</strong> — your dApp. Sends queries and intents to the wallet via a transport layer.</li>
              </ul>
              <p className="text-neutral-600 dark:text-neutral-300 mb-4">
                Three transport types are available depending on the environment:
              </p>
              <ul className="list-disc ml-6 text-neutral-600 dark:text-neutral-300 space-y-2">
                <li><strong>PostMessageTransport</strong> — for browser apps loaded in iframes or opened as popups</li>
                <li><strong>ExtensionTransport</strong> — for apps connecting via the Sphere browser extension <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium">In Development</span></li>
                <li><strong>WebSocketTransport</strong> — for Node.js / CLI applications</li>
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
                The recommended way to connect from a browser app. It automatically detects the best
                available transport and establishes the connection:
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
                      <td className="py-2 pr-4">Iframe</td>
                      <td className="py-2 text-neutral-600 dark:text-neutral-400">App is loaded inside Sphere as an agent</td>
                    </tr>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800">
                      <td className="py-2 pr-4 font-mono text-amber-600 dark:text-amber-400">P2</td>
                      <td className="py-2 pr-4">Extension <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium">In Development</span></td>
                      <td className="py-2 text-neutral-600 dark:text-neutral-400">Sphere browser extension is installed</td>
                    </tr>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800">
                      <td className="py-2 pr-4 font-mono text-amber-600 dark:text-amber-400">P3</td>
                      <td className="py-2 pr-4">Popup</td>
                      <td className="py-2 text-neutral-600 dark:text-neutral-400">Fallback — opens Sphere in a popup window</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <CodeBlock
                filename="connect-example.ts"
                code={`import { autoConnect } from '@unicitylabs/sphere-sdk/connect/browser';
import { WALLET_EVENTS } from '@unicitylabs/sphere-sdk/connect';

// Connect to wallet — auto-detects best transport (iframe → extension → popup)
const { client, connection, disconnect } = await autoConnect({
  dapp: {
    name: 'My App',
    url: location.origin,
    icon: location.origin + '/icon.svg',  // shown in wallet approval dialog
  },
  permissions: ['identity:read', 'sign:request', 'balance:read'],
});

// Query wallet
const identity = await client.query('sphere_getIdentity');
const balance = await client.query('sphere_getBalance');

// Send tokens (requires user confirmation in wallet).
// amount is in BASE UNITS (smallest indivisible unit) and coinId is
// required — the wallet rejects the intent with INVALID_PARAMS otherwise.
const result = await client.intent('send', {
  to: '@alice',                    // Unicity ID or DIRECT:// address
  amount: '1000000000000000000',   // base units, positive integer string
  coinId: '<lowercase hex coin id>', // e.g. from sphere_getAssets
});
// result: { success: true, transferId?: string, status: string,
//           deliveryPending: boolean }
// deliveryPending=true means the spend is FINAL on-chain but the recipient's
// delivery is queued and retries automatically — never re-send it.

// The wallet locked. The SESSION IS STILL ALIVE — do NOT disconnect, do NOT
// clear your saved session, do NOT re-handshake. Requests are answered
// WALLET_LOCKED (4009) until the wallet is unlocked. The wallet shows its own
// passive "requests blocked — Unlock" badge; nothing you do can raise its
// password field, and you should not try.
client.on(WALLET_EVENTS.LOCKED, () => {
  setWalletLocked(true);   // show a banner, keep everything else
});

// The wallet was unlocked — the SAME session continues. No re-handshake, no
// re-approval, and no re-subscribe: the host re-arms your event streams BEFORE
// it sends this. The payload carries the wallet's identity at unlock time, and it
// is NOT guaranteed to be the wallet you connected with — the lock screen's
// "Forgot password → restore from recovery phrase" installs a different seed.
// Compare before you retry anything.
client.on(WALLET_EVENTS.UNLOCKED, ({ identity }) => {
  if (identity?.chainPubkey !== connectedPubkey) {
    // A different wallet came back — treat it as a new connection.
    disconnect();
    return;
  }
  setWalletLocked(false);
  retryLastQuery();        // queries only — NEVER auto-resume an intent
});

// The session is GONE (logout, wallet deleted, you called disconnect, the session
// expired, or a different seed was restored behind the lock screen). THIS is the
// teardown signal — clear your session and re-handshake to continue. Unlocking
// does not cure it.
client.on(WALLET_EVENTS.DISCONNECTED, () => {
  clearSession();
  showConnectButton();
});

// An OLD wallet (Connect 2.0) never sends wallet:unlocked, so do not wait for one.
if (client.walletProtocol === '2.0') {
  // Legacy behaviour: a lock ends the session. Reconnect on wallet:locked.
}

// Handle wallet address switch
client.on(WALLET_EVENTS.IDENTITY_CHANGED, (newIdentity) => {
  // Update displayed identity
});

// Listen for real-time events
client.on('transfer:incoming', (transfer) => {
  console.log('Received:', transfer);
});

// Disconnect when done
disconnect();

// TIP: For popup mode, save connection.sessionId to sessionStorage
// and pass resumeSessionId to autoConnect() to survive page refreshes.
// See full guide: github.com/unicity-sphere/sphere-sdk/blob/main/docs/CONNECT.md`}
              />
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

            <div id="guide-marketplace" data-section="guide-marketplace" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">Building a P2P Marketplace</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Build a complete peer-to-peer marketplace using the Market, Communications, and Payments modules.
              </p>

              <h4 className="font-medium text-lg mt-6 mb-3">Step 1: Initialize</h4>
              <CodeBlock
                filename="marketplace.ts"
                code={`import { Sphere } from '@unicitylabs/sphere-sdk';
import { createBrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';

const providers = createBrowserProviders({
  network: 'testnet',
  market: true,
});

const { sphere } = await Sphere.init({
  ...providers,
  mnemonic: process.env.WALLET_MNEMONIC,
});`}
              />

              <h4 className="font-medium text-lg mt-6 mb-3">Step 2: Post Listings</h4>
              <CodeBlock
                code={`// Post items for sale
await sphere.market.postIntent({
  description: 'Vintage Rolex Submariner - Excellent condition',
  intentType: 'sell',
  category: 'watches',
  price: 15000,
  currency: 'UCT',
});`}
              />

              <h4 className="font-medium text-lg mt-6 mb-3">Step 3: Search & Negotiate</h4>
              <CodeBlock
                code={`// Search for items
const results = await sphere.market.search('rolex submariner');

// Message a seller to negotiate
const intent = results.intents[0];
await sphere.communications.sendDM(intent.agentPubkey, JSON.stringify({
  type: 'offer',
  intentId: intent.id,
  price: 14000,
}));

// Handle negotiation messages
sphere.communications.onDirectMessage(async (msg) => {
  const data = JSON.parse(msg.content);

  if (data.type === 'accepted') {
    // Seller accepted - send payment
    await sphere.payments.send({
      coinId: data.coinId,
      amount: String(data.price),
      recipient: msg.senderPubkey,
      memo: \`Payment for intent \${data.intentId}\`,
    });
  }
});`}
              />

              <h4 className="font-medium text-lg mt-6 mb-3">Step 4: Handle Payments</h4>
              <CodeBlock
                code={`// As a seller - listen for incoming payments
sphere.on('transfer:incoming', async (transfer) => {
  console.log('Payment received:', transfer.tokens);

  // Send confirmation to buyer
  await sphere.communications.sendDM(transfer.senderPubkey, JSON.stringify({
    type: 'payment_confirmed',
    amount: transfer.tokens[0]?.amount,
  }));
});`}
              />
            </div>

            <div id="guide-wallet-backup" data-section="guide-wallet-backup" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">Wallet Backup & Recovery</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                How to back up and recover wallets using mnemonics and JSON export.
              </p>

              <h4 className="font-medium text-lg mt-6 mb-3">Backup</h4>
              <CodeBlock
                code={`// Get the mnemonic (most important backup)
const mnemonic = sphere.getMnemonic();
// Store this securely - it can recover the entire wallet

// Export as JSON (includes addresses and metadata)
const json = sphere.exportToJSON({
  includeMnemonic: true,
  password: 'optional-encryption-password',
  addressCount: 5,
});

// Export as plain text
const txt = sphere.exportToTxt();`}
              />

              <h4 className="font-medium text-lg mt-6 mb-3">Recovery</h4>
              <CodeBlock
                code={`// Recover from mnemonic
const { sphere } = await Sphere.init({
  ...providers,
  mnemonic: 'abandon badge cable drama ...',
});

// Import from JSON file
const result = await Sphere.importFromJSON({
  ...providers,
  jsonContent: '{"version":...}',
});

// Import from legacy wallet file
const result = await Sphere.importFromLegacyFile({
  ...providers,
  fileContent: fileData,
  fileName: 'wallet.dat',
  password: 'if-encrypted',
});`}
              />
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
              </p>
              <CodeBlock
                filename="simple-payment.ts"
                code={`import { Sphere } from '@unicitylabs/sphere-sdk';
import { createBrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';

async function main() {
  const providers = createBrowserProviders({ network: 'testnet' });
  const { sphere } = await Sphere.init({
    ...providers,
    mnemonic: process.env.MNEMONIC,
  });

  // Check balance
  const assets = sphere.payments.getBalance();
  console.log('Balances:');
  assets.forEach(a => console.log(\`  \${a.symbol}: \${a.totalAmount}\`));

  // Send payment
  const result = await sphere.payments.send({
    coinId: assets[0].coinId,
    amount: '100000000',
    recipient: '@recipient',
    memo: 'Test payment',
  });
  console.log(\`Sent! Transfer ID: \${result.id}\`);

  // Listen for incoming payments
  sphere.on('transfer:incoming', (transfer) => {
    console.log('Received tokens:', transfer.tokens);
  });
}

main();`}
              />
            </div>

            <div id="example-marketplace" data-section="example-marketplace" className="scroll-mt-24 mb-12">
              <h3 className="text-xl font-semibold mb-4">P2P Marketplace</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                A peer-to-peer marketplace with intents, negotiation via DM, and payment settlement.
              </p>
              <CodeBlock
                filename="p2p-marketplace.ts"
                code={`import { Sphere } from '@unicitylabs/sphere-sdk';
import { createBrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';

async function main() {
  const providers = createBrowserProviders({
    network: 'testnet',
    market: true,
  });
  const { sphere } = await Sphere.init({
    ...providers,
    mnemonic: process.env.MNEMONIC,
  });

  // Post items for sale
  await sphere.market.postIntent({
    description: 'Vintage Rolex Submariner',
    intentType: 'sell',
    category: 'watches',
    price: 15000,
    currency: 'UCT',
  });

  await sphere.market.postIntent({
    description: 'PSA-10 Charizard',
    intentType: 'sell',
    category: 'collectibles',
    price: 12000,
    currency: 'UCT',
  });

  console.log('Listings posted!');

  // Handle incoming offers via DM
  sphere.communications.onDirectMessage(async (msg) => {
    try {
      const data = JSON.parse(msg.content);

      if (data.type === 'offer') {
        const myIntents = await sphere.market.getMyIntents();
        const intent = myIntents.find(i => i.id === data.intentId);
        if (!intent) return;

        if (data.price >= intent.price * 0.9) {
          // Accept offers within 10%
          await sphere.communications.sendDM(msg.senderPubkey, JSON.stringify({
            type: 'accepted',
            intentId: intent.id,
            price: data.price,
            coinId: '0x...',
          }));
        } else {
          await sphere.communications.sendDM(msg.senderPubkey, JSON.stringify({
            type: 'rejected',
            reason: 'Price too low',
          }));
        }
      }
    } catch {
      // Not JSON - regular chat message
    }
  });

  // Handle incoming payments
  sphere.on('transfer:incoming', async (transfer) => {
    console.log('Payment received:', transfer.tokens);
    await sphere.communications.sendDM(transfer.senderPubkey, JSON.stringify({
      type: 'payment_confirmed',
    }));
  });

  console.log('Marketplace running...');
}

main();`}
              />
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
