import{r as l,j as e,m as y,b as f,c as k}from"./index-B1hqbeEy.js";const x="0.17.2",b=[{id:"getting-started",label:"Getting Started",children:[{id:"installation",label:"Installation"},{id:"quick-start",label:"Quick Start"},{id:"browser-setup",label:"Browser Setup"}]},{id:"core-concepts",label:"Core Concepts",children:[{id:"identity",label:"Identity & Keys"},{id:"addresses",label:"Addresses"},{id:"nametags",label:"Nametags (@username)"},{id:"token-model",label:"Token Model"},{id:"events-system",label:"Events System"}]},{id:"api-sphere",label:"Sphere (Static)",children:[{id:"api-sphere-init",label:"Sphere.init()"},{id:"api-sphere-exists",label:"Sphere.exists()"},{id:"api-sphere-mnemonic",label:"Mnemonic Utilities"}]},{id:"api-instance",label:"Sphere (Instance)",children:[{id:"api-instance-identity",label:"sphere.identity"},{id:"api-instance-nametag",label:"Nametags"},{id:"api-instance-resolve",label:"sphere.resolve()"},{id:"api-instance-events",label:"sphere.on()"},{id:"api-instance-wallet",label:"Wallet Management"}]},{id:"api-payments",label:"Payments (L3)",children:[{id:"api-payments-send",label:"payments.send()"},{id:"api-payments-getbalance",label:"payments.assets()"},{id:"api-payments-getassets",label:"payments.mint()"},{id:"api-payments-gettokens",label:"payments.tokens()"},{id:"api-payments-gethistory",label:"payments.history()"},{id:"api-payments-receive",label:"payments.receive()"},{id:"api-payments-request",label:"Payment Requests"}]},{id:"api-comms",label:"Communications",children:[{id:"api-comms-senddm",label:"sendDM()"},{id:"api-comms-ondm",label:"onDirectMessage()"},{id:"api-comms-conversations",label:"Conversations"},{id:"api-comms-broadcast",label:"Broadcasts"}]},{id:"api-groupchat",label:"Group Chat"},{id:"api-market",label:"Market"},{id:"connect",label:"Sphere Connect",children:[{id:"connect-overview",label:"Overview"},{id:"connect-how-it-works",label:"How It Works"},{id:"connect-autoconnect",label:"autoConnect()"},{id:"connect-resources",label:"Resources & Links"}]},{id:"guides",label:"Guides",children:[{id:"guide-marketplace",label:"Building a Marketplace"},{id:"guide-wallet-backup",label:"Wallet Backup & Recovery"}]},{id:"examples",label:"Examples",children:[{id:"example-payment",label:"Simple Payment"},{id:"example-marketplace",label:"P2P Marketplace"}]}];function t({code:i,filename:n,language:o="typescript"}){const[c,d]=l.useState(!1),m=async()=>{await k(i)&&(d(!0),setTimeout(()=>d(!1),2e3))};return e.jsxs("div",{className:"bg-neutral-900 rounded-xl overflow-hidden my-4",children:[e.jsxs("div",{className:"flex justify-between items-center px-4 py-2 border-b border-neutral-700",children:[e.jsx("span",{className:"text-xs text-neutral-400 font-mono",children:n||o}),e.jsx("button",{onClick:m,className:"text-xs text-neutral-400 hover:text-white transition",children:c?"✓ Copied":"Copy"})]}),e.jsx("pre",{className:"p-4 text-sm overflow-x-auto",children:e.jsx("code",{className:"text-amber-400",children:i})})]})}function p({params:i}){return e.jsx("div",{className:"overflow-x-auto my-4",children:e.jsxs("table",{className:"w-full text-sm",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"text-left text-neutral-500 border-b border-neutral-200 dark:border-neutral-700",children:[e.jsx("th",{className:"pb-2 pr-4",children:"Parameter"}),e.jsx("th",{className:"pb-2 pr-4",children:"Type"}),e.jsx("th",{className:"pb-2",children:"Description"})]})}),e.jsx("tbody",{children:i.map((n,o)=>e.jsxs("tr",{className:"border-b border-neutral-100 dark:border-neutral-800",children:[e.jsxs("td",{className:"py-2 pr-4",children:[e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:n.name}),n.required&&e.jsx("span",{className:"text-red-500 ml-1",children:"*"})]}),e.jsx("td",{className:"py-2 pr-4 text-neutral-600 dark:text-neutral-400 font-mono text-xs",children:n.type}),e.jsx("td",{className:"py-2 text-neutral-600 dark:text-neutral-400",children:n.description})]},o))})]})})}function j(){const[i,n]=l.useState("getting-started"),[o,c]=l.useState(!1),[d,m]=l.useState(new Set(["getting-started","api-payments"]));l.useEffect(()=>{const s=()=>{const a=document.querySelectorAll("[data-section]");let r="getting-started";a.forEach(u=>{u.getBoundingClientRect().top<=100&&(r=u.getAttribute("data-section"))}),n(r)};return window.addEventListener("scroll",s),()=>window.removeEventListener("scroll",s)},[]);const h=s=>{const a=document.getElementById(s);a&&(a.scrollIntoView({behavior:"smooth",block:"start"}),n(s),c(!1),window.history.replaceState(null,"",`#${s}`))};l.useEffect(()=>{const s=window.location.hash.slice(1);if(s){for(const a of b)if(a.id===s||a.children?.some(r=>r.id===s)){m(r=>new Set(r).add(a.id));break}requestAnimationFrame(()=>{const a=document.getElementById(s);a&&(a.scrollIntoView({behavior:"smooth",block:"start"}),n(s))})}},[]);const g=s=>{m(a=>{const r=new Set(a);return r.has(s)?r.delete(s):r.add(s),r})};return e.jsxs(y.div,{initial:{opacity:0},animate:{opacity:1},className:"min-h-screen text-neutral-900 dark:text-white relative z-0",children:[e.jsx("button",{onClick:()=>c(!o),className:"lg:hidden fixed top-16 left-4 z-30 p-2 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-lg rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white",children:e.jsx("svg",{className:"w-5 h-5",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:o?e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M6 18L18 6M6 6l12 12"}):e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M4 6h16M4 12h16M4 18h16"})})}),o&&e.jsx("div",{className:"fixed inset-0 z-10 bg-black/50 lg:hidden",onClick:()=>c(!1)}),e.jsx("aside",{className:`
        fixed top-14 z-20 w-64 h-[calc(100vh-3.5rem)] overflow-y-auto
        backdrop-blur-lg lg:backdrop-blur-none border-r border-neutral-200/50 dark:border-neutral-800/50 lg:border-0
        transform transition-transform
        ${o?"left-0 translate-x-0":"-translate-x-full lg:translate-x-0"}
        lg:left-[max(1rem,calc((100vw-80rem)/2))]
        p-4 lg:py-8 lg:pr-8
      `,children:e.jsx("nav",{className:"space-y-1",children:b.map(s=>e.jsxs("div",{children:[e.jsxs("button",{onClick:()=>{s.children&&g(s.id),h(s.id)},className:`
                    w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition
                    ${i===s.id||s.children?.some(a=>a.id===i)?"text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10":"text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"}
                  `,children:[e.jsx("span",{children:s.label}),s.children&&e.jsx("svg",{className:`w-4 h-4 transition-transform ${d.has(s.id)?"rotate-90":""}`,fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M9 5l7 7-7 7"})})]}),s.children&&d.has(s.id)&&e.jsx("div",{className:"ml-4 mt-1 space-y-1",children:s.children.map(a=>e.jsx("button",{onClick:()=>h(a.id),className:`
                          w-full flex items-center px-3 py-1.5 text-sm rounded-lg transition
                          ${i===a.id?"text-orange-600 dark:text-orange-400":"text-neutral-500 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white"}
                        `,children:e.jsx("span",{children:a.label})},a.id))})]},s.id))})}),e.jsxs("main",{className:"max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:pl-72",children:[e.jsxs("section",{id:"getting-started","data-section":"getting-started",className:"mb-16",children:[e.jsxs("h1",{className:"text-3xl sm:text-4xl font-bold mb-4",children:["Sphere SDK",e.jsxs("a",{href:`https://www.npmjs.com/package/@unicitylabs/sphere-sdk/v/${x}`,target:"_blank",rel:"noopener noreferrer",className:"ml-3 text-sm font-normal text-neutral-500 hover:text-orange-500 transition align-middle",children:["v",x]})]}),e.jsx("p",{className:"text-lg text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl",children:"Build marketplaces where humans and AI agents trade anything. Payments, messaging, identity, and market intents in one SDK."}),e.jsxs("div",{id:"installation","data-section":"installation",className:"scroll-mt-24 mb-12",children:[e.jsx("h2",{className:"text-2xl font-bold mb-4",children:"Installation"}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"Install the Sphere SDK using npm or yarn:"}),e.jsx(t,{code:"npm install @unicitylabs/sphere-sdk",filename:"terminal"}),e.jsx(t,{code:"yarn add @unicitylabs/sphere-sdk",filename:"terminal"})]}),e.jsxs("div",{id:"quick-start","data-section":"quick-start",className:"scroll-mt-24 mb-12",children:[e.jsx("h2",{className:"text-2xl font-bold mb-4",children:"Quick Start"}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"Initialize a wallet and send your first payment:"}),e.jsx(t,{filename:"app.ts",code:`import { Sphere } from '@unicitylabs/sphere-sdk';
import { createBrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';
import { createWalletApiProviders } from '@unicitylabs/sphere-sdk/impl/shared/wallet-api';

const NETWORK = 'testnet2'; // 'mainnet' | 'testnet2'

// 1. Base providers for your target network
const base = createBrowserProviders({ network: NETWORK });

// 2. Attach the wallet-api composition. Assets move only through this
//    vertical: Sphere.init throws INVALID_CONFIG without a walletApi
//    config, and walletApi.network must equal the Sphere network.
const providers = createWalletApiProviders(base, {
  baseUrl: import.meta.env.VITE_WALLET_API_URL, // deployment-specific
  network: NETWORK,
});

// 3. Initialize (auto-loads existing wallet or creates new one).
//    Pass network here too — it selects the token registry.
const { sphere, created, generatedMnemonic } = await Sphere.init({
  ...providers,
  network: NETWORK,
  autoGenerate: true, // auto-generate mnemonic if no wallet exists
});

if (generatedMnemonic) {
  console.log('Save this mnemonic:', generatedMnemonic);
}

// 4. Check your identity
console.log('Nametag:', sphere.getNametag());
console.log('Identity:', sphere.identity);

// 5. Send tokens
await sphere.payments.send({
  coinId: '0x...',
  amount: '100000000',
  recipient: '@alice',
});

// 6. Listen for incoming transfers
sphere.on('transfer:incoming', (transfer) => {
  console.log('Received tokens:', transfer.tokens);
});`})]}),e.jsxs("div",{id:"browser-setup","data-section":"browser-setup",className:"scroll-mt-24 mb-12",children:[e.jsx("h2",{className:"text-2xl font-bold mb-4",children:"Browser Setup"}),e.jsxs("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:["The SDK uses a provider-based architecture, composed in two steps.",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:" createBrowserProviders()"})," builds the platform providers (IndexedDB storage, Nostr transport, aggregator oracle), and",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:" createWalletApiProviders()"})," attaches the wallet-api transport config the payments vertical is built from."]}),e.jsx(t,{filename:"setup.ts",code:`import { createBrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';
import { createWalletApiProviders } from '@unicitylabs/sphere-sdk/impl/shared/wallet-api';

const NETWORK = 'testnet2'; // 'mainnet' | 'testnet2'

const base = createBrowserProviders({
  network: NETWORK,
  price: {
    platform: 'coingecko',      // fiat price provider
    cacheTtlMs: 5 * 60_000,    // cache prices for 5 minutes
  },
  groupChat: true,              // enable NIP-29 group chat
  market: true,                 // enable intent bulletin board
});

// base contains: storage, transport, oracle, groupChat, market

const providers = createWalletApiProviders(base, {
  baseUrl: import.meta.env.VITE_WALLET_API_URL,
  network: NETWORK,             // must equal the Sphere network
});

// providers adds: walletApi`}),e.jsxs("p",{className:"text-neutral-600 dark:text-neutral-400 mt-4",children:["The providers object is spread into ",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"Sphere.init()"}),", together with the same ",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"network"})," value."]}),e.jsx("div",{className:"my-4 p-4 rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10",children:e.jsxs("p",{className:"text-sm text-neutral-700 dark:text-neutral-300",children:[e.jsx("strong",{children:"The wallet-api composition is mandatory."})," Assets move only through that vertical; there is no local-custody fallback. ",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"Sphere.init()"})," throws",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:" INVALID_CONFIG"})," when",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:" walletApi"})," is missing, when",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:" network"})," is missing, or when",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:" walletApi.network"})," does not match it. The base URL is deployment-specific — take it from your own configuration rather than hard-coding one."]})}),e.jsx("h3",{className:"text-lg font-semibold mt-8 mb-3",children:"What belongs in your .env"}),e.jsxs("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:["Only non-secret, deployment-specific values. Vite inlines every",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:" VITE_"}),"-prefixed variable into the client bundle, so anything you put there is served verbatim to every visitor."]}),e.jsx(t,{filename:".env",code:`# Deployment-specific, and public by design — these ship in the bundle.
VITE_WALLET_API_URL=https://wallet-api.example.unicity.network

# NEVER a seed phrase, a private key or an API secret. A VITE_ variable is not
# configuration the browser keeps to itself: it is compiled into app.js and
# downloaded by anyone who opens the page. A mnemonic put here is published.
# Wallets come from the user at runtime (an import prompt) or from
# autoGenerate; server-only secrets stay in a server-side process.`}),e.jsxs("p",{className:"text-neutral-600 dark:text-neutral-400 mt-4",children:["The legacy ",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"'testnet'"})," key still resolves to the same configuration as ",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"'testnet2'"}),", but new code should not use it. It is deliberately absent from ",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"SPHERE_NETWORKS"}),", which is what a dApp sends in a Connect handshake — and, more sharply, the init guard compares",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:" walletApi.network"})," with",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:" options.network"})," as raw strings. Passing",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:" 'testnet'"})," to one and",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:" 'testnet2'"})," to the other throws",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:" INVALID_CONFIG"})," even though both name the same network. Use one literal — the ",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"NETWORK"})," constant in the samples above exists for exactly that reason."]})]})]}),e.jsxs("section",{id:"core-concepts","data-section":"core-concepts",className:"mb-16",children:[e.jsx("h2",{className:"text-2xl font-bold mb-6 pb-2 border-b border-neutral-200 dark:border-neutral-700",children:"Core Concepts"}),e.jsxs("div",{id:"identity","data-section":"identity",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:"Identity & Keys"}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"Sphere uses cryptographic identity based on BIP39 mnemonics. Your mnemonic seed generates a hierarchical deterministic (HD) wallet with multiple addresses."}),e.jsxs("ul",{className:"list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-2 mb-4",children:[e.jsx("li",{children:"No registration or API keys needed"}),e.jsxs("li",{children:["BIP32 HD wallet with derivation path ",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"m/44'/0'/0'"})]}),e.jsx("li",{children:"Multiple addresses from a single seed"}),e.jsx("li",{children:"Identity includes chain pubkey, direct address, and optional nametag"})]}),e.jsx(t,{code:`// Access identity after initialization
console.log(sphere.identity);
// {
//   chainPubkey: '02abc...',
//   directAddress: 'DIRECT://...',
//   nametag: '@alice'
// }`})]}),e.jsxs("div",{id:"addresses","data-section":"addresses",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:"Addresses"}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"Each identity has several address types:"}),e.jsxs("ul",{className:"list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-2 mb-4",children:[e.jsxs("li",{children:[e.jsx("strong",{children:"DIRECT address"})," (",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"DIRECT://..."}),") - Used for L3 token transfers"]}),e.jsxs("li",{children:[e.jsx("strong",{children:"PROXY address"})," (",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"PROXY://..."}),") - Derived from nametag, used when direct address is unknown"]})]}),e.jsx(t,{code:`// Derive additional addresses
const addr = sphere.deriveAddress(1); // second address
console.log(addr.publicKey);  // chain pubkey (hex)

// Switch active address
await sphere.switchToAddress(1);

// List all tracked addresses
const addresses = sphere.getActiveAddresses();`})]}),e.jsxs("div",{id:"nametags","data-section":"nametags",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:"Nametags (@username)"}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"Nametags are human-readable aliases registered on Nostr. Use them instead of addresses:"}),e.jsx(t,{filename:"nametags.ts",code:`// Register a nametag (during wallet creation or later)
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
console.log(peer?.directAddress);`})]}),e.jsxs("div",{id:"token-model","data-section":"token-model",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:"Token Model"}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"Tokens on Layer 3 are individual cryptographic objects with unique IDs, tracked by the aggregator."}),e.jsxs("ul",{className:"list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-2 mb-4",children:[e.jsxs("li",{children:[e.jsx("strong",{children:"Token"})," - An individual token object with ID, coin type, amount, and state history"]}),e.jsxs("li",{children:[e.jsx("strong",{children:"Asset"})," - Aggregated balance for a coin type (sum of all tokens with same coinId)"]}),e.jsxs("li",{children:[e.jsx("strong",{children:"coinId"})," - Hex identifier for the token type (e.g., ",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"0x..."}),")"]}),e.jsx("li",{children:"Amounts are strings in smallest units (like satoshis)"})]}),e.jsx(t,{code:`// Get individual tokens
const tokens = sphere.payments.tokens();
tokens.forEach(t => {
  console.log(t.id, t.coinId, t.amount, t.status);
});

// Get aggregated balance per coin type
const assets = await sphere.payments.assets();
assets.forEach(a => {
  console.log(a.symbol, a.totalAmount, a.tokenCount);
});`})]}),e.jsxs("div",{id:"events-system","data-section":"events-system",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:"Events System"}),e.jsxs("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:["Subscribe to SDK events using ",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"sphere.on(eventType, handler)"}),". Returns an unsubscribe function."]}),e.jsx(t,{code:`// Transfer events
sphere.on('transfer:incoming', (data) => { /* incoming transfer */ });
sphere.on('transfer:updated', (data) => { /* outgoing transfer updated */ });

// Message events
sphere.on('message:dm', (msg) => { /* direct message received */ });

// Payment request events
sphere.on('payment_request:incoming', (req) => { /* payment request */ });

// Unsubscribe
const unsub = sphere.on('transfer:incoming', handler);
unsub(); // stop listening`})]})]}),e.jsxs("section",{id:"api-sphere","data-section":"api-sphere",className:"mb-16",children:[e.jsx("h2",{className:"text-2xl font-bold mb-6 pb-2 border-b border-neutral-200 dark:border-neutral-700",children:"API Reference — Sphere (Static)"}),e.jsxs("div",{id:"api-sphere-init","data-section":"api-sphere-init",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"Sphere.init(options)"})}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"Unified initialization: auto-loads an existing wallet or creates a new one."}),e.jsx("h4",{className:"font-medium text-lg mt-6 mb-3",children:"Signature"}),e.jsx(t,{code:"static async init(options: SphereInitOptions): Promise<SphereInitResult>"}),e.jsx("h4",{className:"font-medium text-lg mt-6 mb-3",children:"Parameters"}),e.jsx(p,{params:[{name:"storage",type:"StorageProvider",description:"Storage provider (IndexedDB in browser)",required:!0},{name:"transport",type:"TransportProvider",description:"Transport provider (Nostr in browser)",required:!0},{name:"oracle",type:"OracleProvider",description:"Aggregator oracle provider",required:!0},{name:"walletApi",type:"WalletApiTransportConfig",description:"Wallet-api transport config from createWalletApiProviders(). Missing it throws INVALID_CONFIG",required:!0},{name:"network",type:"'mainnet' | 'testnet2'",description:"Network this wallet runs on. Must equal walletApi.network; missing it throws INVALID_CONFIG",required:!0},{name:"mnemonic",type:"string",description:"BIP39 mnemonic to create wallet from (if no wallet exists)"},{name:"autoGenerate",type:"boolean",description:"Auto-generate mnemonic if wallet does not exist"},{name:"nametag",type:"string",description:"Register nametag on creation"},{name:"groupChat",type:"boolean | config",description:"Enable NIP-29 group chat module"},{name:"market",type:"boolean | config",description:"Enable market intent module"},{name:"password",type:"string",description:"Encrypt wallet with password"}]}),e.jsx("h4",{className:"font-medium text-lg mt-6 mb-3",children:"Returns"}),e.jsx(t,{code:`interface SphereInitResult {
  sphere: Sphere;              // The initialized instance
  created: boolean;            // Whether wallet was newly created
  generatedMnemonic?: string;  // Only if autoGenerate was used
}`}),e.jsx("h4",{className:"font-medium text-lg mt-6 mb-3",children:"Example"}),e.jsx(t,{filename:"init.ts",code:`import { Sphere } from '@unicitylabs/sphere-sdk';
import { createBrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';
import { createWalletApiProviders } from '@unicitylabs/sphere-sdk/impl/shared/wallet-api';

const NETWORK = 'testnet2';

const providers = createWalletApiProviders(
  createBrowserProviders({ network: NETWORK }),
  { baseUrl: import.meta.env.VITE_WALLET_API_URL, network: NETWORK },
);

// Auto-create with generated mnemonic
const { sphere, generatedMnemonic } = await Sphere.init({
  ...providers,
  network: NETWORK,
  autoGenerate: true,
  nametag: 'myagent',
});

// Or import with known mnemonic
const { sphere: imported } = await Sphere.init({
  ...providers,
  network: NETWORK,
  mnemonic: 'abandon badge cable drama ...',
});`})]}),e.jsxs("div",{id:"api-sphere-exists","data-section":"api-sphere-exists",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"Sphere.exists(storage)"})}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"Checks whether a wallet already exists in the given storage."}),e.jsx(t,{code:"static async exists(storage: StorageProvider): Promise<boolean>"}),e.jsx(t,{filename:"example.ts",code:`const NETWORK = 'testnet2';
const providers = createWalletApiProviders(
  createBrowserProviders({ network: NETWORK }),
  { baseUrl: import.meta.env.VITE_WALLET_API_URL, network: NETWORK },
);

const hasWallet = await Sphere.exists(providers.storage);

if (hasWallet) {
  const { sphere } = await Sphere.init({ ...providers, network: NETWORK });
} else {
  // Show onboarding flow
}`})]}),e.jsxs("div",{id:"api-sphere-mnemonic","data-section":"api-sphere-mnemonic",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"Mnemonic Utilities"})}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"Static helpers for generating and validating BIP39 mnemonics."}),e.jsx(t,{code:`// Generate a 12-word mnemonic (128-bit entropy)
const mnemonic12 = Sphere.generateMnemonic();

// Generate a 24-word mnemonic (256-bit entropy)
const mnemonic24 = Sphere.generateMnemonic(256);

// Validate a mnemonic
const isValid = Sphere.validateMnemonic('abandon badge cable ...');
console.log(isValid); // true or false`})]})]}),e.jsxs("section",{id:"api-instance","data-section":"api-instance",className:"mb-16",children:[e.jsx("h2",{className:"text-2xl font-bold mb-6 pb-2 border-b border-neutral-200 dark:border-neutral-700",children:"API Reference — Sphere (Instance)"}),e.jsxs("div",{id:"api-instance-identity","data-section":"api-instance-identity",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"sphere.identity"})}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"The current wallet identity. Available after initialization."}),e.jsx(t,{code:`interface Identity {
  chainPubkey: string;     // secp256k1 public key (hex)
  directAddress: string;   // DIRECT:// address for L3
  nametag?: string;        // registered @nametag
}

console.log(sphere.identity?.chainPubkey);
console.log(sphere.identity?.directAddress);
console.log(sphere.identity?.nametag); // '@alice'`})]}),e.jsxs("div",{id:"api-instance-nametag","data-section":"api-instance-nametag",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"Nametag Methods"})}),e.jsx(t,{code:`// Get current nametag
sphere.getNametag(); // '@alice' | undefined

// Check if nametag is registered
sphere.hasNametag(); // boolean

// Register a new nametag (publishes to Nostr)
await sphere.registerNametag('alice');

// Mint nametag as on-chain token
const result = await sphere.mintNametag('alice');

// Check availability
const available = await sphere.isNametagAvailable('bob'); // boolean`})]}),e.jsxs("div",{id:"api-instance-resolve","data-section":"api-instance-resolve",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"sphere.resolve(identifier)"})}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"Resolves a @nametag, DIRECT:// address, PROXY:// address, or pubkey to full peer info."}),e.jsx(t,{code:"async resolve(identifier: string): Promise<PeerInfo | null>"}),e.jsx(t,{filename:"resolve.ts",code:`const peer = await sphere.resolve('@alice');
if (peer) {
  console.log(peer.directAddress);  // DIRECT://...
  console.log(peer.transportPubkey);
}`})]}),e.jsxs("div",{id:"api-instance-events","data-section":"api-instance-events",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"sphere.on(type, handler)"})}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"Subscribe to SDK events. Returns an unsubscribe function."}),e.jsx(t,{code:"on<T>(type: SphereEventType, handler: (data: T) => void): () => void"}),e.jsx("h4",{className:"font-medium text-lg mt-6 mb-3",children:"Event Types"}),e.jsx(p,{params:[{name:"transfer:incoming",type:"IncomingTransfer",description:"New incoming token transfer detected"},{name:"transfer:updated",type:"TransferResult",description:"Outgoing transfer updated (confirmed, delivery pending or failed)"},{name:"message:dm",type:"DirectMessage",description:"Direct message received"},{name:"payment_request:incoming",type:"IncomingPaymentRequest",description:"Payment request received"}]}),e.jsx(t,{filename:"events.ts",code:`// Subscribe to incoming transfers
const unsub = sphere.on('transfer:incoming', (transfer) => {
  console.log('Tokens received:', transfer.tokens);
});

// Unsubscribe later
unsub();

// Remove a specific handler
sphere.off('transfer:incoming', myHandler);`})]}),e.jsxs("div",{id:"api-instance-wallet","data-section":"api-instance-wallet",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"Wallet Management"})}),e.jsx(t,{code:`// Get backup mnemonic
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
await sphere.destroy();`})]})]}),e.jsxs("section",{id:"api-payments","data-section":"api-payments",className:"mb-16",children:[e.jsx("h2",{className:"text-2xl font-bold mb-6 pb-2 border-b border-neutral-200 dark:border-neutral-700",children:"API Reference — Payments (L3)"}),e.jsxs("p",{className:"text-neutral-600 dark:text-neutral-400 mb-8",children:["All L3 payment operations are accessed via ",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"sphere.payments"})," — available on every wallet initialized with ",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"Sphere.init"}),"."]}),e.jsxs("div",{id:"api-payments-send","data-section":"api-payments-send",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"sphere.payments.send(request)"})}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"Sends tokens to a recipient. Supports @nametags and direct addresses."}),e.jsx("h4",{className:"font-medium text-lg mt-6 mb-3",children:"Signature"}),e.jsx(t,{code:"async send(request: SendRequest): Promise<TransferResult>"}),e.jsx("h4",{className:"font-medium text-lg mt-6 mb-3",children:"Parameters"}),e.jsx(p,{params:[{name:"coinId",type:"string",description:"Token type ID (hex)",required:!0},{name:"amount",type:"string",description:"Amount in smallest units",required:!0},{name:"recipient",type:"string",description:"@nametag or DIRECT:// address",required:!0},{name:"memo",type:"string",description:"Optional memo"}]}),e.jsx("h4",{className:"font-medium text-lg mt-6 mb-3",children:"Returns"}),e.jsx(t,{code:`interface TransferResult {
  id: string;                    // Transfer ID
  status: TransferStatus;        // 'pending' | 'submitted' | 'confirmed' | ...
  tokens: Token[];               // Resulting tokens
  tokenTransfers: TokenTransferDetail[];
}`}),e.jsx("h4",{className:"font-medium text-lg mt-6 mb-3",children:"Example"}),e.jsx(t,{filename:"send.ts",code:`const result = await sphere.payments.send({
  coinId: '0x...',
  amount: '100000000',
  recipient: '@merchant',
  memo: 'Payment for order #123',
});

console.log('Transfer ID:', result.id);
console.log('Status:', result.status);`})]}),e.jsxs("div",{id:"api-payments-getbalance","data-section":"api-payments-getbalance",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"sphere.payments.assets(coinId?)"})}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"Returns aggregated balance per coin type, with fiat prices from the price provider. Async."}),e.jsx(t,{code:"async assets(coinId?: string): Promise<Asset[]>"}),e.jsx(t,{code:`interface Asset {
  coinId: string;
  symbol: string;
  totalAmount: string;     // in smallest units
  tokenCount: number;
  decimals: number;
  priceUsd: number | null;
  fiatValueUsd: number | null;
}`}),e.jsx(t,{filename:"balance.ts",code:`// All assets
const assets = await sphere.payments.assets();
assets.forEach(a => console.log(\`\${a.symbol}: \${a.totalAmount} ($\${a.fiatValueUsd})\`));

// Specific coin
const [asset] = await sphere.payments.assets('0x...');
console.log('Balance:', asset?.totalAmount);`})]}),e.jsxs("div",{id:"api-payments-getassets","data-section":"api-payments-getassets",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"sphere.payments.mint(coinId, amount)"})}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"Self-mints fungible tokens to this wallet (testnet top-up — no faucet)."}),e.jsx(t,{code:"async mint(coinId: string, amount: bigint): Promise<MintResult>"}),e.jsx(t,{filename:"mint.ts",code:`const result = await sphere.payments.mint('0x...', 100000000n);
if (result.success) {
  console.log('Minted token:', result.tokenId);
}`})]}),e.jsxs("div",{id:"api-payments-gettokens","data-section":"api-payments-gettokens",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"sphere.payments.tokens(filter?)"})}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"Returns individual token objects. Optionally filter by coin ID. Synchronous."}),e.jsx(t,{code:"tokens(filter?: { coinId?: string }): Token[]"}),e.jsx(t,{filename:"tokens.ts",code:`// All tokens
const tokens = sphere.payments.tokens();

// Only tokens for a specific coin
const filtered = sphere.payments.tokens({ coinId: '0x...' });

tokens.forEach(t => {
  console.log(t.id, t.coinId, t.amount, t.status);
});`})]}),e.jsxs("div",{id:"api-payments-gethistory","data-section":"api-payments-gethistory",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"sphere.payments.history(page?)"})}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"Returns the L3 transaction history, newest-first, in cursor pages."}),e.jsx(t,{code:"async history(page?: { before?: string; limit?: number }): Promise<HistoryPage>"}),e.jsx(t,{filename:"history.ts",code:`const { entries, more, cursor } = await sphere.payments.history({ limit: 50 });
entries.forEach(tx => {
  console.log(tx.type, tx.amount, tx.timestamp); // timestamp: epoch ms
  // type: 'SENT' | 'RECEIVED' | 'MINT'
});

// Older entries
if (more && cursor) {
  const nextPage = await sphere.payments.history({ before: cursor, limit: 50 });
}`})]}),e.jsxs("div",{id:"api-payments-receive","data-section":"api-payments-receive",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"sphere.payments.receive()"})}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"Explicitly checks for and processes incoming token transfers."}),e.jsx(t,{code:"async receive(): Promise<{ transfers: IncomingTransfer[] }>"}),e.jsx(t,{filename:"receive.ts",code:`// Check for incoming transfers
const { transfers } = await sphere.payments.receive();
console.log('Received:', transfers.length, 'transfers');
transfers.forEach(transfer => {
  console.log('Incoming:', transfer.tokens);
});`})]}),e.jsxs("div",{id:"api-payments-request","data-section":"api-payments-request",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"Payment Requests"})}),e.jsxs("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:["Request payments from others and manage incoming requests via ",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"sphere.payments.requests"}),"."]}),e.jsx(t,{filename:"payment-requests.ts",code:`// Send a payment request to someone
await sphere.payments.requests.create('@buyer', {
  amount: '50000000',
  coinId: '0x...',
  memo: 'Invoice #456',
});

// Handle incoming payment requests
sphere.on('payment_request:incoming', (request) => {
  console.log(\`\${request.senderNametag} requests \${request.amount}\`);
});

// List requests (filter by status as needed)
const pending = sphere.payments.requests.list()
  .filter(r => r.status === 'pending');

// Pay a request
await sphere.payments.requests.pay(requestId);

// Or decline
await sphere.payments.requests.decline(requestId);

// Clear processed (paid/declined/expired) requests from the list
sphere.payments.requests.dismissProcessed();`})]})]}),e.jsxs("section",{id:"api-comms","data-section":"api-comms",className:"mb-16",children:[e.jsx("h2",{className:"text-2xl font-bold mb-6 pb-2 border-b border-neutral-200 dark:border-neutral-700",children:"API Reference — Communications"}),e.jsxs("p",{className:"text-neutral-600 dark:text-neutral-400 mb-8",children:["End-to-end encrypted messaging via Nostr, accessed via ",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"sphere.communications"}),"."]}),e.jsxs("div",{id:"api-comms-senddm","data-section":"api-comms-senddm",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"sphere.communications.sendDM(recipient, content)"})}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"Sends an encrypted direct message to a peer."}),e.jsx(t,{code:"async sendDM(recipient: string, content: string): Promise<DirectMessage>"}),e.jsx(p,{params:[{name:"recipient",type:"string",description:"@nametag or transport pubkey",required:!0},{name:"content",type:"string",description:"Message content (plain text or JSON string)",required:!0}]}),e.jsx(t,{filename:"send-dm.ts",code:`// Simple text message
const msg = await sphere.communications.sendDM('@alice', 'Hello!');
console.log('Message ID:', msg.id);

// Structured data (serialize as JSON)
await sphere.communications.sendDM('@alice', JSON.stringify({
  type: 'offer',
  item: 'PSA-10 Charizard',
  price: 12000,
}));`})]}),e.jsxs("div",{id:"api-comms-ondm","data-section":"api-comms-ondm",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"sphere.communications.onDirectMessage(handler)"})}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"Subscribes to incoming direct messages. Returns an unsubscribe function."}),e.jsx(t,{code:"onDirectMessage(handler: (message: DirectMessage) => void): () => void"}),e.jsx(t,{filename:"on-dm.ts",code:`const unsub = sphere.communications.onDirectMessage((msg) => {
  console.log(\`From \${msg.senderNametag ?? msg.senderPubkey}\`);
  console.log('Content:', msg.content);
  console.log('Time:', new Date(msg.timestamp * 1000));
});

// Later: unsub();`})]}),e.jsxs("div",{id:"api-comms-conversations","data-section":"api-comms-conversations",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"Conversations"})}),e.jsx(t,{code:`// Get all conversations (grouped by peer)
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
const unread = sphere.communications.getUnreadCount();`})]}),e.jsxs("div",{id:"api-comms-broadcast","data-section":"api-comms-broadcast",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"Broadcasts"})}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"Send public messages to topics. Anyone subscribed to those tags will see them."}),e.jsx(t,{code:`// Broadcast a message with tags
await sphere.communications.broadcast('New item listed!', ['marketplace', 'collectibles']);

// Subscribe to broadcasts on specific tags
const unsub = sphere.communications.subscribeToBroadcasts(['marketplace']);

// Listen for incoming broadcasts
sphere.communications.onBroadcast((msg) => {
  console.log(\`\${msg.content} [tags: \${msg.tags}]\`);
});

// Get recent broadcasts
const recent = sphere.communications.getBroadcasts(50);`})]})]}),e.jsxs("section",{id:"api-groupchat","data-section":"api-groupchat",className:"mb-16",children:[e.jsx("h2",{className:"text-2xl font-bold mb-6 pb-2 border-b border-neutral-200 dark:border-neutral-700",children:"API Reference — Group Chat (NIP-29)"}),e.jsxs("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:["NIP-29 group messaging via ",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"sphere.groupChat"}),". Requires ",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"groupChat: true"})," in initialization."]}),e.jsx(t,{filename:"group-chat.ts",code:`// Connect to NIP-29 relay
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
await sphere.groupChat.leaveGroup('group-id');`})]}),e.jsxs("section",{id:"api-market","data-section":"api-market",className:"mb-16",children:[e.jsx("h2",{className:"text-2xl font-bold mb-6 pb-2 border-b border-neutral-200 dark:border-neutral-700",children:"API Reference — Market"}),e.jsxs("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:["Intent bulletin board via ",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"sphere.market"}),". Requires ",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"market: true"})," in initialization."]}),e.jsx(t,{filename:"market.ts",code:`// Post a sell intent
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
const recent = await sphere.market.getRecentListings();`})]}),e.jsxs("section",{id:"connect","data-section":"connect",className:"mb-16",children:[e.jsx("h2",{className:"text-2xl font-bold mb-6 pb-2 border-b border-neutral-200 dark:border-neutral-700",children:"Sphere Connect"}),e.jsxs("div",{id:"connect-overview","data-section":"connect-overview",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:"Overview"}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-300 mb-4",children:"Sphere Connect is a protocol that lets external dApps interact with the Sphere wallet. Instead of managing private keys directly, your app connects to the user's wallet and requests actions through a secure, permission-based interface."}),e.jsxs("p",{className:"text-neutral-600 dark:text-neutral-300 mb-4",children:["The protocol follows a ",e.jsx("strong",{children:"Host / Client"})," architecture:"]}),e.jsxs("ul",{className:"list-disc ml-6 text-neutral-600 dark:text-neutral-300 space-y-2 mb-4",children:[e.jsxs("li",{children:[e.jsx("strong",{children:"Host"})," — the Sphere wallet web app. Manages keys, signs transactions, controls permissions."]}),e.jsxs("li",{children:[e.jsx("strong",{children:"Client"})," — your dApp. Sends queries and intents to the wallet via a transport layer."]})]}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-300 mb-4",children:"The SDK ships three transports. Only one of them reaches the hosted Sphere wallet:"}),e.jsxs("ul",{className:"list-disc ml-6 text-neutral-600 dark:text-neutral-300 space-y-2",children:[e.jsxs("li",{children:[e.jsx("strong",{children:"PostMessageTransport"})," — ",e.jsx("span",{className:"text-xs px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 font-medium",children:"Supported"})," the browser path, and the only transport the hosted wallet implements. In the supported arrangement your dApp runs ",e.jsx("em",{children:"inside"})," Sphere, in an iframe, and talks to the wallet page that frames it; the popup fallback below rides the same transport against the wallet’s ",e.jsx("code",{children:"/connect"})," page."]}),e.jsxs("li",{children:[e.jsx("strong",{children:"WebSocketTransport"})," — for a wallet host you run yourself. Its server mode expects the ",e.jsx("em",{children:"wallet"})," to listen on a WebSocket port, which a browser page cannot do, so the hosted wallet at sphere.unicity.network never sits behind it. Use it for Node.js / CLI setups where you supply both ends."]}),e.jsxs("li",{children:[e.jsx("strong",{children:"ExtensionTransport"})," — ",e.jsx("span",{className:"text-xs px-1.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 font-medium",children:"Deprecated"})," the SDK still exports it, but there is no supported wallet behind it. The Sphere browser extension is discontinued — do not build against this transport."]})]})]}),e.jsxs("div",{id:"connect-how-it-works","data-section":"connect-how-it-works",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:"How It Works"}),e.jsxs("div",{className:"flex flex-col sm:flex-row items-center justify-center gap-4 my-8",children:[e.jsxs("div",{className:"flex flex-col items-center px-6 py-4 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 min-w-[140px]",children:[e.jsx("span",{className:"text-xs text-neutral-500 dark:text-neutral-400 mb-1",children:"Your App"}),e.jsx("span",{className:"font-semibold text-sm",children:"ConnectClient"})]}),e.jsx("div",{className:"text-neutral-400 dark:text-neutral-500 text-2xl sm:rotate-0 rotate-90",children:"↔"}),e.jsxs("div",{className:"flex flex-col items-center px-6 py-4 border border-orange-300 dark:border-orange-600/50 rounded-xl bg-orange-50 dark:bg-orange-500/10 min-w-[140px]",children:[e.jsx("span",{className:"text-xs text-neutral-500 dark:text-neutral-400 mb-1",children:"Channel"}),e.jsx("span",{className:"font-semibold text-sm",children:"Transport"})]}),e.jsx("div",{className:"text-neutral-400 dark:text-neutral-500 text-2xl sm:rotate-0 rotate-90",children:"↔"}),e.jsxs("div",{className:"flex flex-col items-center px-6 py-4 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 min-w-[140px]",children:[e.jsx("span",{className:"text-xs text-neutral-500 dark:text-neutral-400 mb-1",children:"Wallet"}),e.jsx("span",{className:"font-semibold text-sm",children:"ConnectHost"})]})]}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-300 mb-3",children:"Your app communicates with the wallet through three types of messages:"}),e.jsxs("ul",{className:"list-disc ml-6 text-neutral-600 dark:text-neutral-300 space-y-2",children:[e.jsxs("li",{children:[e.jsx("strong",{children:"Queries"})," — read-only requests (get balance, identity, assets, transaction history)"]}),e.jsxs("li",{children:[e.jsx("strong",{children:"Intents"})," — actions that require user confirmation (send tokens, sign messages, send DMs)"]}),e.jsxs("li",{children:[e.jsx("strong",{children:"Events"})," — real-time push notifications from the wallet (incoming transfers, identity changes)"]})]})]}),e.jsxs("div",{id:"connect-autoconnect","data-section":"connect-autoconnect",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:"autoConnect()"}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-300 mb-4",children:"The recommended way to connect from a browser app. It detects the environment and picks a transport, in this order:"}),e.jsx("div",{className:"overflow-x-auto my-4",children:e.jsxs("table",{className:"w-full text-sm",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"text-left text-neutral-500 border-b border-neutral-200 dark:border-neutral-700",children:[e.jsx("th",{className:"pb-2 pr-4",children:"Priority"}),e.jsx("th",{className:"pb-2 pr-4",children:"Mode"}),e.jsx("th",{className:"pb-2",children:"When"})]})}),e.jsxs("tbody",{children:[e.jsxs("tr",{className:"border-b border-neutral-100 dark:border-neutral-800",children:[e.jsx("td",{className:"py-2 pr-4 font-mono text-amber-600 dark:text-amber-400",children:"P1"}),e.jsxs("td",{className:"py-2 pr-4",children:["Iframe ",e.jsx("span",{className:"text-xs px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 font-medium",children:"Supported"})]}),e.jsx("td",{className:"py-2 text-neutral-600 dark:text-neutral-400",children:"Your app is loaded inside Sphere as an agent. This is the path to build for."})]}),e.jsxs("tr",{className:"border-b border-neutral-100 dark:border-neutral-800",children:[e.jsx("td",{className:"py-2 pr-4 font-mono text-amber-600 dark:text-amber-400",children:"P2"}),e.jsxs("td",{className:"py-2 pr-4",children:["Extension ",e.jsx("span",{className:"text-xs px-1.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 font-medium",children:"Deprecated"})]}),e.jsxs("td",{className:"py-2 text-neutral-600 dark:text-neutral-400",children:["Never selected in practice: the Sphere browser extension is discontinued, so nothing installs the ",e.jsx("code",{children:"window.sphere"})," bridge this probes for."]})]}),e.jsxs("tr",{className:"border-b border-neutral-100 dark:border-neutral-800",children:[e.jsx("td",{className:"py-2 pr-4 font-mono text-amber-600 dark:text-amber-400",children:"P3"}),e.jsxs("td",{className:"py-2 pr-4",children:["Popup ",e.jsx("span",{className:"text-xs px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium",children:"Fallback"})]}),e.jsxs("td",{className:"py-2 text-neutral-600 dark:text-neutral-400",children:["Last resort when the page is not framed: needs ",e.jsx("code",{children:"walletUrl"}),", a popup the browser does not block, and your own session persistence to survive a reload. Not the arrangement to design for, but it is the usable one against a wallet you run yourself (a local Sphere dev server on ",e.jsx("code",{children:"localhost:5173"}),")."]})]})]})]})}),e.jsxs("div",{className:"my-6 p-4 rounded-xl border border-orange-300 dark:border-orange-500/40 bg-orange-50 dark:bg-orange-500/10",children:[e.jsx("p",{className:"text-sm font-semibold mb-2",children:"Running your dApp against the wallet"}),e.jsxs("p",{className:"text-sm text-neutral-700 dark:text-neutral-300 mb-3",children:["The supported arrangement is your dApp running ",e.jsx("em",{children:"inside"})," Sphere. To try a build you host yourself, open it as a custom agent:"]}),e.jsx(t,{filename:"open in Sphere",code:"https://sphere.unicity.network/agents/custom?url=<your https url>"}),e.jsxs("p",{className:"text-sm text-neutral-700 dark:text-neutral-300 mb-3",children:[e.jsx("strong",{children:"The URL must be https."})," Sphere only frames a custom tab whose URL parses with an",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:" https:"})," protocol; anything else falls through to the “Load Custom URL” prompt and never loads. The check is protocol-only, and it is not the only gate — see below."]}),e.jsxs("p",{className:"text-sm text-neutral-700 dark:text-neutral-300 mb-3",children:[e.jsx("strong",{children:"A localhost URL will not get that far."})," The CDN in front of",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:" sphere.unicity.network"})," rejects any request whose query string contains ",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"localhost"})," or",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:" 127.0.0.1"})," with a",e.jsx("strong",{children:" 403"})," and its own error page, before the request reaches the wallet at all. Measured with",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:" curl"})," on 2026-09-17: the same routes return",e.jsx("strong",{children:" 200"})," without those substrings (",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"/connect"}),",",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:" /connect?origin=…"})," and",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:" /agents/custom?url=…"})," all answered 200), and 403 with them, on every route tried and regardless of request headers. It is a rule about local URLs in the query, not something specific to Connect or to the popup path."]}),e.jsxs("p",{className:"text-sm text-neutral-700 dark:text-neutral-300",children:["So to try a local build against the ",e.jsx("em",{children:"hosted"})," wallet, put it on a publicly reachable https origin — an https tunnel in front of your dev server is enough — and pass that URL. Plain http would not be framed anyway. (Typing an https URL into the wallet’s own “Load Custom URL” prompt never sends that query string to the CDN, so it should clear the 403 and only face the https gate; that path has not been verified end to end.) Against a wallet you run yourself — this repo’s dev server on",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:" localhost:5173"})," — no CDN is in the way at all, so the popup path over plain ",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:"http://localhost"})," is fine. The https rule above is the wallet’s own, so it still applies to anything Sphere frames as a custom tab, local or not."]})]}),e.jsx(t,{filename:"connect-example.ts",code:`import { autoConnect } from '@unicitylabs/sphere-sdk/connect/browser';
import { SPHERE_NETWORKS, WALLET_EVENTS } from '@unicitylabs/sphere-sdk/connect';
import type { WalletUnlockedPayload } from '@unicitylabs/sphere-sdk/connect';

// Connect to the wallet. In the supported arrangement this page is already
// framed by Sphere, so autoConnect picks the iframe transport by itself.
const { client, connection, disconnect } = await autoConnect({
  dapp: {
    name: 'My App',
    url: location.origin,
    icon: location.origin + '/icon.svg',  // shown in wallet approval dialog
  },

  // REQUIRED. The wallet's compatibility gate treats a missing or mismatched
  // network as INCOMPATIBLE_NETWORK (4008) and refuses the handshake before any
  // UI appears. Use the SPHERE_NETWORKS table so the id cannot drift.
  network: SPHERE_NETWORKS.testnet2,   // or SPHERE_NETWORKS.mainnet

  // Ask for exactly what this file uses. Every query, intent and event
  // subscription below maps to one of these scopes:
  //   identity:read    -> sphere_getIdentity
  //   balance:read     -> sphere_getBalance
  //   transfer:request -> the 'send' intent  (without it: PERMISSION_DENIED 4002)
  //   events:subscribe -> client.on('transfer:incoming', ...) — the subscribe RPC
  //                       fails silently, so without it the handler never fires
  permissions: ['identity:read', 'balance:read', 'transfer:request', 'events:subscribe'],

  // Only used by the popup fallback (P3): autoConnect opens
  // <walletUrl>/connect?origin=<your origin>. Harmless to pass, but it is NOT
  // what makes the iframe path work — that needs Sphere to frame your page.
  walletUrl: 'https://sphere.unicity.network',
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
//
// ConnectEventHandler is (data: unknown) => void, so destructuring the payload
// directly does not compile under strict TypeScript. Narrow it with the exported
// payload type instead:
client.on(WALLET_EVENTS.UNLOCKED, (payload) => {
  const { identity } = (payload ?? {}) as WalletUnlockedPayload;
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

// Listen for real-time events. Unlike the wallet:* events above, this one is NOT
// auto-pushed: it goes through sphere_subscribe, which needs 'events:subscribe'.
// Without that scope the subscribe is refused and swallowed — no throw, no error,
// the handler simply never fires.
client.on('transfer:incoming', (transfer) => {
  console.log('Received:', transfer);
});

// Disconnect when done
disconnect();

// TIP: in the popup fallback, save connection.sessionId to sessionStorage and
// pass resumeSessionId to autoConnect() so a page refresh does not re-handshake.
// See the full guide:
// github.com/unicity-sphere/sphere-sdk/blob/main/docs/CONNECT.md`})]}),e.jsxs("div",{id:"connect-resources","data-section":"connect-resources",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:"Resources & Links"}),e.jsxs("div",{className:"grid gap-4 sm:grid-cols-2 lg:grid-cols-3",children:[e.jsxs("a",{href:"https://github.com/unicity-sphere/sphere-sdk-connect-example",target:"_blank",rel:"noopener noreferrer",className:"group flex flex-col gap-2 p-5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-orange-400 dark:hover:border-orange-500 transition bg-white/50 dark:bg-neutral-800/30",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("span",{className:"font-semibold text-sm group-hover:text-orange-500 transition",children:"Connect Example Repository"}),e.jsx("svg",{className:"w-4 h-4 text-neutral-400 group-hover:text-orange-500 transition",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"})})]}),e.jsx("p",{className:"text-xs text-neutral-500 dark:text-neutral-400",children:"Working examples for browser and Node.js integration"})]}),e.jsxs("a",{href:"https://github.com/unicity-sphere/sphere-sdk/blob/main/docs/CONNECT.md",target:"_blank",rel:"noopener noreferrer",className:"group flex flex-col gap-2 p-5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-orange-400 dark:hover:border-orange-500 transition bg-white/50 dark:bg-neutral-800/30",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("span",{className:"font-semibold text-sm group-hover:text-orange-500 transition",children:"Full Connect Documentation"}),e.jsx("svg",{className:"w-4 h-4 text-neutral-400 group-hover:text-orange-500 transition",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"})})]}),e.jsx("p",{className:"text-xs text-neutral-500 dark:text-neutral-400",children:"Complete protocol spec — RPC methods, intents, events, permissions"})]}),e.jsxs("a",{href:"https://github.com/unicity-sphere/unicity-claude-marketplace",target:"_blank",rel:"noopener noreferrer",className:"group flex flex-col gap-2 p-5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-orange-400 dark:hover:border-orange-500 transition bg-white/50 dark:bg-neutral-800/30",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("span",{className:"font-semibold text-sm group-hover:text-orange-500 transition",children:"Claude Code Plugin Marketplace"}),e.jsx("svg",{className:"w-4 h-4 text-neutral-400 group-hover:text-orange-500 transition",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"})})]}),e.jsx("p",{className:"text-xs text-neutral-500 dark:text-neutral-400",children:"Sphere Connect plugin for Claude Code — auto-generates integration code"})]})]})]})]}),e.jsxs("section",{id:"guides","data-section":"guides",className:"mb-16",children:[e.jsx("h2",{className:"text-2xl font-bold mb-6 pb-2 border-b border-neutral-200 dark:border-neutral-700",children:"Guides"}),e.jsxs("div",{id:"guide-marketplace","data-section":"guide-marketplace",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:"Building a P2P Marketplace"}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"Build a complete peer-to-peer marketplace using the Market, Communications, and Payments modules."}),e.jsx("h4",{className:"font-medium text-lg mt-6 mb-3",children:"Step 1: Initialize"}),e.jsx(t,{filename:"marketplace.ts",code:`import { Sphere } from '@unicitylabs/sphere-sdk';
import { createBrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';
import { createWalletApiProviders } from '@unicitylabs/sphere-sdk/impl/shared/wallet-api';

const NETWORK = 'testnet2';

const providers = createWalletApiProviders(
  createBrowserProviders({ network: NETWORK, market: true }),
  { baseUrl: import.meta.env.VITE_WALLET_API_URL, network: NETWORK },
);

// NEVER put a seed phrase in a build-time variable. Anything prefixed VITE_ is
// inlined into the bundle and served to every visitor — that is publishing the
// wallet, not configuring it. init() loads the wallet already in this browser's
// storage; autoGenerate only fires when there is none, and hands the phrase to
// the user to write down.
const { sphere, created, generatedMnemonic } = await Sphere.init({
  ...providers,
  network: NETWORK,
  autoGenerate: true,
});

if (created && generatedMnemonic) {
  showBackupPrompt(generatedMnemonic); // your UI — the user saves it, you never store it
}`}),e.jsxs("p",{className:"text-neutral-600 dark:text-neutral-400 mt-4",children:["To let a user bring an existing wallet, take the phrase from an input they fill in and pass it as",e.jsx("code",{className:"text-amber-600 dark:text-amber-400",children:" mnemonic"})," — see",e.jsx("a",{href:"#guide-wallet-backup",className:"text-orange-500 hover:underline",children:" Wallet Backup & Recovery"}),". A seed that comes from your configuration rather than from the user is a seed you have distributed."]}),e.jsx("h4",{className:"font-medium text-lg mt-6 mb-3",children:"Step 2: Post Listings"}),e.jsx(t,{code:`// Post items for sale
await sphere.market.postIntent({
  description: 'Vintage Rolex Submariner - Excellent condition',
  intentType: 'sell',
  category: 'watches',
  price: 15000,
  currency: 'UCT',
});`}),e.jsx("h4",{className:"font-medium text-lg mt-6 mb-3",children:"Step 3: Search & Negotiate"}),e.jsx(t,{code:`// Search for items
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
});`}),e.jsx("h4",{className:"font-medium text-lg mt-6 mb-3",children:"Step 4: Handle Payments"}),e.jsx(t,{code:`// As a seller - listen for incoming payments
sphere.on('transfer:incoming', async (transfer) => {
  console.log('Payment received:', transfer.tokens);

  // Send confirmation to buyer
  await sphere.communications.sendDM(transfer.senderPubkey, JSON.stringify({
    type: 'payment_confirmed',
    amount: transfer.tokens[0]?.amount,
  }));
});`})]}),e.jsxs("div",{id:"guide-wallet-backup","data-section":"guide-wallet-backup",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:"Wallet Backup & Recovery"}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"How to back up and recover wallets using mnemonics and JSON export."}),e.jsx("h4",{className:"font-medium text-lg mt-6 mb-3",children:"Backup"}),e.jsx(t,{code:`// Get the mnemonic (most important backup)
const mnemonic = sphere.getMnemonic();
// Store this securely - it can recover the entire wallet

// Export as JSON (includes addresses and metadata)
const json = sphere.exportToJSON({
  includeMnemonic: true,
  password: 'optional-encryption-password',
  addressCount: 5,
});

// Export as plain text
const txt = sphere.exportToTxt();`}),e.jsx("h4",{className:"font-medium text-lg mt-6 mb-3",children:"Recovery"}),e.jsx(t,{code:`// \`providers\` below is the composed bundle from Browser Setup —
// createBrowserProviders(...) wrapped in createWalletApiProviders(...).
// Every entry point needs the same \`network\` as walletApi.network.
const NETWORK = 'testnet2';

// Recover from a mnemonic the USER supplies at runtime — a textarea they paste
// into, a hardware prompt, whatever your UI is. Never a build-time constant and
// never import.meta.env: a VITE_ variable is inlined into the bundle and served
// to every visitor, so a seed put there is a published seed.
const phrase = mnemonicInput.value.trim();
const { sphere } = await Sphere.init({
  ...providers,
  network: NETWORK,
  mnemonic: phrase,
});

// Import from JSON file. Since 0.17.4 an import over a storage that already holds
// a wallet is REFUSED with ALREADY_INITIALIZED and that wallet is left untouched —
// importFromJSON returns { success: false, error }, the other paths reject. Pass
// overwrite: true only after the user has confirmed the replacement; the old wallet
// is erased before the new one is brought up and is not restored if that fails.
const fromJson = await Sphere.importFromJSON({
  ...providers,
  network: NETWORK,
  jsonContent: '{"version":...}',
});

// Import from a legacy wallet file (.txt / JSON backups; .dat was removed)
const fromLegacy = await Sphere.importFromLegacyFile({
  ...providers,
  network: NETWORK,
  fileContent: fileData,
  fileName: 'wallet.txt',
  password: 'if-encrypted',
  overwrite: userConfirmedReplacement, // omit it to keep an existing wallet safe
});`})]})]}),e.jsxs("section",{id:"examples","data-section":"examples",className:"mb-16",children:[e.jsx("h2",{className:"text-2xl font-bold mb-6 pb-2 border-b border-neutral-200 dark:border-neutral-700",children:"Examples"}),e.jsxs("div",{id:"example-payment","data-section":"example-payment",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:"Simple Payment"}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"A minimal example: initialize, check balance, send tokens, listen for incoming transfers."}),e.jsx(t,{filename:"simple-payment.ts",code:`import { Sphere } from '@unicitylabs/sphere-sdk';
import { createBrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';
import { createWalletApiProviders } from '@unicitylabs/sphere-sdk/impl/shared/wallet-api';

const NETWORK = 'testnet2';

async function main() {
  const providers = createWalletApiProviders(
    createBrowserProviders({ network: NETWORK }),
    { baseUrl: import.meta.env.VITE_WALLET_API_URL, network: NETWORK },
  );
  // Loads the wallet already in this browser's storage. autoGenerate only fires
  // when there is none — a throwaway wallet whose phrase is handed straight to
  // the user. A seed never comes from import.meta.env: VITE_ variables are
  // inlined into the bundle and served to every visitor.
  const { sphere, created, generatedMnemonic } = await Sphere.init({
    ...providers,
    network: NETWORK,
    autoGenerate: true,
  });
  if (created && generatedMnemonic) {
    console.log('New wallet — save this phrase:', generatedMnemonic);
  }

  // Check balance
  const assets = await sphere.payments.assets();
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

main();`})]}),e.jsxs("div",{id:"example-marketplace","data-section":"example-marketplace",className:"scroll-mt-24 mb-12",children:[e.jsx("h3",{className:"text-xl font-semibold mb-4",children:"P2P Marketplace"}),e.jsx("p",{className:"text-neutral-600 dark:text-neutral-400 mb-4",children:"A peer-to-peer marketplace with intents, negotiation via DM, and payment settlement."}),e.jsx(t,{filename:"p2p-marketplace.ts",code:`import { Sphere } from '@unicitylabs/sphere-sdk';
import { createBrowserProviders } from '@unicitylabs/sphere-sdk/impl/browser';
import { createWalletApiProviders } from '@unicitylabs/sphere-sdk/impl/shared/wallet-api';

const NETWORK = 'testnet2';

async function main() {
  const providers = createWalletApiProviders(
    createBrowserProviders({ network: NETWORK, market: true }),
    { baseUrl: import.meta.env.VITE_WALLET_API_URL, network: NETWORK },
  );
  // Existing wallet in this browser, or a throwaway one whose phrase goes to the
  // user. Never a seed from import.meta.env — VITE_ variables ship in the bundle.
  const { sphere, created, generatedMnemonic } = await Sphere.init({
    ...providers,
    network: NETWORK,
    autoGenerate: true,
  });
  if (created && generatedMnemonic) {
    console.log('New wallet — save this phrase:', generatedMnemonic);
  }

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

main();`})]})]}),e.jsxs("footer",{className:"border-t border-neutral-200 dark:border-neutral-700 pt-8 mt-16",children:[e.jsxs("div",{className:"flex flex-wrap gap-6 text-sm text-neutral-600 dark:text-neutral-400 mb-6",children:[e.jsx("a",{href:"https://discord.com/invite/PGzNZT5uVp",target:"_blank",rel:"noopener noreferrer",className:"hover:text-orange-500 transition",children:"Discord"}),e.jsx("a",{href:"https://github.com/unicity-sphere/sphere",target:"_blank",rel:"noopener noreferrer",className:"hover:text-orange-500 transition",children:"GitHub"}),e.jsx("a",{href:f,target:"_blank",rel:"noopener noreferrer",className:"hover:text-orange-500 transition",children:"Developer Portal"})]}),e.jsx("p",{className:"text-sm text-neutral-500",children:"AgentSphere by Unicity Labs"})]})]})]})}export{j as DocsPage};
