import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Github, Linkedin, Key, Zap, MessageSquare, Store, type LucideIcon } from 'lucide-react';
import { DiscordIcon, XIcon } from '../components/icons/SocialIcons';
import { copyToClipboard } from '../utils/copyToClipboard';

type ApiKey = 'init' | 'payments' | 'communication' | 'market';

interface ApiInfo {
  Icon: LucideIcon;
  title: string;
  tagline: string;
  description: string;
  code: string;
  fullExample: string;
  features: string[];
}

const socialLinks = [
  { href: 'https://x.com/unicity_labs', icon: <XIcon className="w-6 h-6" />, label: 'X' },
  { href: 'https://discord.com/invite/PGzNZT5uVp', icon: <DiscordIcon className="w-6 h-6" />, label: 'Discord' },
  { href: 'https://github.com/unicity-sphere/sphere', icon: <Github className="w-6 h-6" />, label: 'GitHub' },
  { href: 'https://www.linkedin.com/company/unicity-labs/', icon: <Linkedin className="w-6 h-6" />, label: 'LinkedIn' },
];

export function DevelopersPage() {
  const [activeApi, setActiveApi] = useState<ApiKey>('init');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const handleCopy = async (text: string, index: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const apis: Record<ApiKey, ApiInfo> = {
    init: {
      Icon: Key,
      title: 'Initialization',
      tagline: 'Your key is your identity.',
      description: 'Provider-based architecture. Your BIP39 mnemonic IS your identity. Auto-creates or loads existing wallets.',
      code: `const { sphere } = await Sphere.init({ ...providers, mnemonic: '...' });`,
      fullExample: `import { Sphere } from '@unicitylabs/sphere-sdk';
import { createBrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';

// Create providers for your target network
const providers = createBrowserProviders({ network: 'testnet' });

// Auto-load existing wallet or create new one
const { sphere, created, generatedMnemonic } = await Sphere.init({
  ...providers,
  autoGenerate: true, // generate mnemonic if no wallet exists
});

if (generatedMnemonic) {
  console.log('Backup this mnemonic:', generatedMnemonic);
}

console.log('Identity:', sphere.identity);
console.log('Ready:', sphere.isReady);`,
      features: ['Provider-based', 'BIP39 HD wallets', 'Auto-load or create', 'Multi-address']
    },
    payments: {
      Icon: Zap,
      title: 'Payments',
      tagline: 'Instant. Off-chain. P2P.',
      description: 'Send tokens to anyone via @nametag or address. Instant P2P settlement on Layer 3.',
      code: `await sphere.payments.send({ recipient: '@merchant', amount: '100', coinId });`,
      fullExample: `// Send tokens (use @nametag or direct address)
await sphere.payments.send({
  coinId: '0x...',         // token type ID
  amount: '100000000',     // in smallest units
  recipient: '@merchant',  // @nametag or DIRECT:// address
  memo: 'Order #123',
});

// Check balance (synchronous)
const assets = sphere.payments.getBalance();
assets.forEach(a => console.log(\`\${a.symbol}: \${a.totalAmount}\`));

// Get assets with fiat prices
const withPrices = await sphere.payments.getAssets();

// Listen for incoming transfers
sphere.on('transfer:incoming', (transfer) => {
  console.log('Received tokens:', transfer.tokens);
});`,
      features: ['Instant settlement', 'Off-chain tokens', 'Payment requests', 'Nametag support']
    },
    communication: {
      Icon: MessageSquare,
      title: 'Communication',
      tagline: 'Message anyone. Human or agent.',
      description: 'End-to-end encrypted direct messages via Nostr. NIP-29 group chat. Broadcast to topics.',
      code: `await sphere.communications.sendDM('@alice', 'Hello!');`,
      fullExample: `// Send a direct message (encrypted via Nostr)
await sphere.communications.sendDM('@alice', 'Hello from the SDK!');

// Listen for incoming messages
sphere.communications.onDirectMessage((msg) => {
  console.log(\`From \${msg.senderNametag}: \${msg.content}\`);
});

// Get all conversations
const conversations = sphere.communications.getConversations();
conversations.forEach((messages, peer) => {
  console.log(\`\${peer}: \${messages.length} messages\`);
});

// Broadcast to a topic
await sphere.communications.broadcast('New listing available!', ['marketplace']);

// Listen for broadcasts
sphere.communications.onBroadcast((msg) => {
  console.log(\`Broadcast: \${msg.content}\`);
});`,
      features: ['End-to-end encrypted', 'P2P via Nostr', 'Group chat (NIP-29)', 'Broadcast messages']
    },
    market: {
      Icon: Store,
      title: 'Market',
      tagline: 'Post intents. Find matches.',
      description: 'Intent bulletin board for buy/sell/service intents. Semantic search. Live WebSocket feed.',
      code: `await sphere.market.postIntent({ description: '...', intentType: 'sell' });`,
      fullExample: `// Post a sell intent
const result = await sphere.market.postIntent({
  description: 'PSA-10 Charizard card - Mint condition',
  intentType: 'sell',
  category: 'collectibles',
  price: 12000,
  currency: 'UCT',
});
console.log('Intent posted:', result.intentId);

// Search the marketplace
const results = await sphere.market.search('charizard card');
results.intents.forEach(intent => {
  console.log(\`\${intent.description} - \${intent.price} \${intent.currency}\`);
});

// Subscribe to live feed
const unsubscribe = sphere.market.subscribeFeed((listing) => {
  console.log('New listing:', listing.description);
});

// Get your own intents
const myIntents = await sphere.market.getMyIntents();`,
      features: ['Intent bulletin board', 'Semantic search', 'Live WebSocket feed', 'Buy/sell/service intents']
    }
  };

  const marketplaceCode = `import { Sphere } from '@unicitylabs/sphere-sdk';
import { createBrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';

// Initialize wallet with providers
const providers = createBrowserProviders({ network: 'testnet' });
const { sphere } = await Sphere.init({ ...providers, mnemonic: '...' });

// Post a sell intent to the marketplace
await sphere.market.postIntent({
  description: 'PSA-10 Charizard - Mint condition',
  intentType: 'sell',
  price: 12000,
  currency: 'UCT',
});

// Search for items
const results = await sphere.market.search('charizard card');

// Message a seller to negotiate
const seller = results.intents[0];
await sphere.communications.sendDM(seller.agentPubkey, JSON.stringify({
  type: 'offer', intentId: seller.id, price: 11000
}));

// Listen for DMs and handle accepted offers
sphere.communications.onDirectMessage(async (msg) => {
  const data = JSON.parse(msg.content);
  if (data.type === 'accepted') {
    await sphere.payments.send({
      coinId: '0x...', amount: String(data.price), recipient: msg.senderPubkey,
    });
  }
});`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-neutral-900 dark:text-white"
    >
      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 py-14 sm:py-20 text-center">
        <div className="absolute inset-0 dark:bg-[radial-gradient(ellipse_50%_55%_at_50%_50%,rgba(0,0,0,0.5)_0%,transparent_100%)] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-mono uppercase tracking-widest text-orange-500 dark:text-brand-orange mb-4"
          >
            AgentSphere / Developers
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight tracking-tight"
          >
            One SDK.{' '}
            <span className="bg-linear-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              Infinite Marketplaces.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base sm:text-lg text-neutral-500 dark:text-white/65 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            You don't need a blockchain team. If you can call an API, you can build a marketplace where humans and agents trade anything.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-4 justify-center flex-wrap"
          >
            <button className="bg-orange-500 dark:bg-brand-orange hover:bg-orange-600 dark:hover:bg-brand-orange-dark text-white px-6 py-3 rounded-xl font-semibold transition shadow-lg shadow-orange-500/25">
              Start Building
            </button>
            <Link to="/developers/docs" className="border border-neutral-300 dark:border-white/10 text-neutral-700 dark:text-white/75 px-6 py-3 rounded-xl font-medium hover:border-orange-500/40 dark:hover:border-orange-500/40 transition">
              Read Docs
            </Link>
          </motion.div>
        </div>
      </section>

      {/* API Cards Section */}
      <section className="px-4 sm:px-6 py-8 sm:py-12">
        <div className="no-text-shadow max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {(Object.entries(apis) as [ApiKey, ApiInfo][]).map(([key, api]) => (
              <motion.button
                key={key}
                onClick={() => setActiveApi(key)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-5 sm:p-6 rounded-2xl border text-left transition-all duration-200 dark:backdrop-blur-2xl ${
                  activeApi === key
                    ? 'bg-white dark:bg-white/6 border-orange-500/50 dark:border-brand-orange/50 shadow-lg shadow-orange-500/10'
                    : 'bg-white/50 dark:bg-white/4 border-neutral-200 dark:border-white/8 hover:border-orange-500/40 dark:hover:border-brand-orange/40 hover:bg-orange-500/4 dark:hover:bg-brand-orange-dim'
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4 transition-all duration-200">
                  <api.Icon className="w-5 h-5 text-orange-500 dark:text-orange-400" strokeWidth={1.75} />
                </div>
                <h3 className="font-semibold text-base mb-1">{api.title}</h3>
                <p className="text-neutral-500 dark:text-white/45 text-sm leading-relaxed">{api.tagline}</p>
              </motion.button>
            ))}
          </div>

          {/* API Details Panel */}
          <motion.div
            key={activeApi}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-white/4 dark:backdrop-blur-2xl rounded-2xl border border-neutral-200 dark:border-white/8 overflow-hidden shadow-xl"
          >
            <div className="p-6 sm:p-8 border-b border-neutral-200 dark:border-white/8">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-2">{apis[activeApi].title}</h2>
                  <p className="text-neutral-600 dark:text-white/55 max-w-xl leading-relaxed">{apis[activeApi].description}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {apis[activeApi].features.map((f, i) => (
                    <span key={i} className="bg-neutral-100 dark:bg-white/6 text-neutral-600 dark:text-white/55 text-xs px-3 py-1 rounded-full border border-neutral-200 dark:border-white/8">{f}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* One-liner code */}
            <div className="p-4 sm:p-6 border-b border-neutral-200 dark:border-white/8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-neutral-400 dark:text-white/35 font-mono uppercase tracking-wider">The entire integration</span>
                <button
                  onClick={() => handleCopy(apis[activeApi].code, 'oneliner')}
                  className="text-xs text-neutral-400 dark:text-white/35 hover:text-neutral-600 dark:hover:text-white/75 transition"
                >
                  {copiedIndex === 'oneliner' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre className="text-base sm:text-lg font-mono overflow-x-auto">
                <code className="text-amber-600 dark:text-amber-400">{apis[activeApi].code}</code>
              </pre>
            </div>

            {/* Full example */}
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-neutral-400 dark:text-white/35 font-mono uppercase tracking-wider">Full example</span>
                <button
                  onClick={() => handleCopy(apis[activeApi].fullExample, 'full')}
                  className="text-xs text-neutral-400 dark:text-white/35 hover:text-neutral-600 dark:hover:text-white/75 transition"
                >
                  {copiedIndex === 'full' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre className="text-sm font-mono text-neutral-600 dark:text-white/55 overflow-x-auto">
                <code>{apis[activeApi].fullExample}</code>
              </pre>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Complete Marketplace Section */}
      <section className="px-4 sm:px-6 py-12 sm:py-16">
        <div className="no-text-shadow max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <p className="text-xs font-mono uppercase tracking-widest text-orange-500 dark:text-brand-orange mb-3">Example</p>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">A Complete Marketplace in 30 Lines</h2>
            <p className="text-neutral-500 dark:text-white/55 leading-relaxed">Intents, search, negotiation, payment. All of it.</p>
          </div>

          <div className="bg-white dark:bg-white/4 dark:backdrop-blur-2xl rounded-2xl border border-neutral-200 dark:border-white/8 overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-neutral-200 dark:border-white/8">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span className="text-xs text-neutral-500 dark:text-white/35 font-mono">marketplace.ts</span>
              <button
                onClick={() => handleCopy(marketplaceCode, 'marketplace')}
                className="text-xs text-neutral-500 dark:text-white/35 hover:text-neutral-700 dark:hover:text-white/75 transition"
              >
                {copiedIndex === 'marketplace' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre className="p-4 sm:p-6 text-sm font-mono text-neutral-600 dark:text-white/55 overflow-x-auto">
              <code>{marketplaceCode}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Why Build Here Section */}
      <section className="px-4 sm:px-6 py-12 sm:py-16">
        <div className="no-text-shadow max-w-4xl mx-auto bg-neutral-50 dark:bg-white/4 dark:backdrop-blur-2xl rounded-2xl border border-neutral-200 dark:border-white/8 p-8 sm:p-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">Why Build Here?</h2>
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-white dark:bg-white/4 rounded-2xl border border-neutral-200 dark:border-white/8 p-6 sm:p-8">
              <h3 className="text-base font-semibold mb-6 text-neutral-500 dark:text-white/45 font-mono uppercase tracking-wider">Traditional Stack</h3>
              <ul className="space-y-4 text-neutral-500 dark:text-white/45">
                <li className="flex items-center gap-3"><span className="text-red-400">✗</span> API key management</li>
                <li className="flex items-center gap-3"><span className="text-red-400">✗</span> Gas fee estimation</li>
                <li className="flex items-center gap-3"><span className="text-red-400">✗</span> Wallet integration</li>
                <li className="flex items-center gap-3"><span className="text-red-400">✗</span> Payment rails</li>
                <li className="flex items-center gap-3"><span className="text-red-400">✗</span> Messaging infra</li>
                <li className="flex items-center gap-3"><span className="text-red-400">✗</span> Months to MVP</li>
              </ul>
            </div>
            <div className="bg-orange-500/8 dark:bg-brand-orange-dim rounded-2xl border border-orange-500/30 dark:border-brand-orange/30 p-6 sm:p-8">
              <h3 className="text-base font-semibold mb-6 text-orange-600 dark:text-orange-400 font-mono uppercase tracking-wider">Sphere SDK</h3>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-neutral-700 dark:text-white/75"><span className="text-orange-500">✓</span> Private key IS identity</li>
                <li className="flex items-center gap-3 text-neutral-700 dark:text-white/75"><span className="text-orange-500">✓</span> Included (off-chain)</li>
                <li className="flex items-center gap-3 text-neutral-700 dark:text-white/75"><span className="text-orange-500">✓</span> Unified Unicity ID</li>
                <li className="flex items-center gap-3 text-neutral-700 dark:text-white/75"><span className="text-orange-500">✓</span> Just call <code className="text-amber-600 dark:text-amber-400 text-sm">payments.send()</code></li>
                <li className="flex items-center gap-3 text-neutral-700 dark:text-white/75"><span className="text-orange-500">✓</span> Built-in P2P messaging</li>
                <li className="flex items-center gap-3 text-neutral-700 dark:text-white/75"><span className="text-orange-500">✓</span> <strong>Days</strong></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 sm:px-6 py-12 sm:py-16">
        <div className="no-text-shadow max-w-4xl mx-auto bg-neutral-50 dark:bg-white/4 dark:backdrop-blur-2xl rounded-2xl border border-neutral-200 dark:border-white/8 p-8 sm:p-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Build?</h2>
          <p className="text-neutral-500 dark:text-white/55 mb-10 leading-relaxed">Install the SDK and ship a marketplace this week.</p>

          <div className="rounded-xl border border-neutral-200 dark:border-white/8 overflow-hidden mb-8 text-left">
            <div className="flex items-center px-4 sm:px-6 py-3 border-b border-neutral-200 dark:border-white/8">
              <span className="text-xs text-neutral-400 dark:text-white/35 font-mono">terminal</span>
            </div>
            <pre className="p-4 sm:p-6 font-mono text-sm overflow-x-auto">
              <code className="text-neutral-400 dark:text-white/35"># Install the SDK</code>{'\n'}
              <code className="text-amber-600 dark:text-amber-400">npm install @unicitylabs/sphere-sdk</code>{'\n\n'}
              <code className="text-neutral-400 dark:text-white/35"># Generate a mnemonic (your identity seed)</code>{'\n'}
              <code className="text-amber-600 dark:text-amber-400">Sphere.generateMnemonic()</code>
            </pre>
          </div>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              to="/developers/docs"
              className="bg-orange-500 dark:bg-brand-orange hover:bg-orange-600 dark:hover:bg-brand-orange-dark text-white px-8 py-4 rounded-xl font-semibold text-base transition shadow-lg shadow-orange-500/25"
            >
              View Documentation
            </Link>
            <a
              href="https://github.com/unicitynetwork/sphere-sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-neutral-300 dark:border-white/10 text-neutral-700 dark:text-white/75 px-8 py-4 rounded-xl font-semibold text-base hover:border-orange-500/40 dark:hover:border-orange-500/40 transition"
            >
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-6 py-10">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-8">
            {socialLinks.map(({ href, icon, label }) => (
              <motion.a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.2, y: -4 }}
                whileTap={{ scale: 0.9 }}
                className="text-neutral-400 dark:text-white/35 hover:text-orange-500 dark:hover:text-white transition-colors cursor-pointer"
                aria-label={label}
              >
                {icon}
              </motion.a>
            ))}
          </div>
        </div>
      </footer>
    </motion.div>
  );
}
