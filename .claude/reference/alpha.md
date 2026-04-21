# alpha

> **Purpose:** C++ implementation of the Unicity Proof of Work layer (L1) — RandomX mining with UTXO model, 2-minute blocks, and ASERT difficulty adjustment.

## Build & Test

```bash
mkdir -p build && cd build && cmake .. && make   # Build
cd build && ctest                                  # Run tests
cppcheck --enable=all src/                         # Static analysis
```

## Public API

### Core Components
- **`Block`** — PoW block with RandomX proof, UTXO transactions, and Merkle root.
- **`Transaction`** — UTXO transaction: inputs (references to previous outputs) and outputs (amount + locking script).
- **`UTXO`** — Unspent Transaction Output — the fundamental unit of value.
- **`MiningEngine`** — RandomX PoW miner with difficulty targeting.

### Consensus
- **`DifficultyAdjustment`** — ASERT (Absolutely Scheduled Exponentially Rising Targets) algorithm. Adjusts every block.
- **`BlockValidator`** — Validates block structure, PoW proof, and transaction validity.

### Network
- **P2P** block and transaction propagation
- **RPC** interface for querying chain state

## Dependencies

- RandomX library (external) for PoW algorithm
- No internal Unicity ecosystem dependencies (L1 is the base layer)

## Depended On By

- `bft-core` — Anchors L2 blocks to L1 chain
- `sphere-sdk` — L1 payment operations (UTXO transfers)

## Key Patterns

- **UTXO model**: Transactions consume UTXOs and create new ones. No account balances.
- **2-minute target block time** with ASERT difficulty adjustment every block.
- **RandomX PoW**: CPU-friendly mining algorithm resistant to ASIC/GPU advantage.

## Constraints

- Block size limits enforced at validation
- Transaction validity requires all input UTXOs to exist and be unspent
- PoW difficulty must match ASERT target
- No unsafe memory operations — use RAII and smart pointers
- Build must compile with `-Wall -Werror`

## Status

Core mining, UTXO management, and block validation are production-ready. P2P networking is operational. RPC interface is stable.
