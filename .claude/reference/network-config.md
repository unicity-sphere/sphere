# Network Configuration

> **Purpose:** Endpoint configuration for Unicity Network environments.

## Environments

| Environment | Purpose | Stability |
|------------|---------|-----------|
| **mainnet** | Production network | Stable |
| **testnet** | Testing and staging | Stable |
| **devnet** | Local development | Ephemeral |

## Endpoints

### Mainnet
| Service | Endpoint |
|---------|----------|
| Aggregator (L3) | `https://aggregator.unicity.network` |
| BFT (L2) | `https://bft.unicity.network` |
| Alpha RPC (L1) | `https://alpha.unicity.network` |
| Nostr Relays | `wss://relay.unicity.network` |
| IPFS Gateway | `https://ipfs.unicity.network` |

### Testnet
| Service | Endpoint |
|---------|----------|
| Aggregator (L3) | `https://aggregator.testnet.unicity.network` |
| BFT (L2) | `https://bft.testnet.unicity.network` |
| Alpha RPC (L1) | `https://alpha.testnet.unicity.network` |
| Nostr Relays | `wss://nostr-relay.testnet.unicity.network` |

### Devnet (Local)
| Service | Endpoint |
|---------|----------|
| Aggregator (L3) | `http://localhost:8080` |
| BFT (L2) | `http://localhost:8081` |
| Alpha RPC (L1) | `http://localhost:18332` |
| Nostr Relay | `ws://localhost:7777` |

## SDK Configuration

```typescript
const sphere = new Sphere({
  network: 'testnet',  // or 'mainnet', 'devnet'
  // Overrides:
  aggregatorUrl: 'https://custom-aggregator.example.com',
  nostrRelays: ['wss://relay1.example.com', 'wss://relay2.example.com'],
});
```

## Notes

- Endpoints may change — always check official documentation
- Devnet endpoints are for local docker-compose setups
- Multiple Nostr relays should be configured for redundancy
