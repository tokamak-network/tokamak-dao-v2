# Tokamak DAO v2

Tokamak Network DAO governance system.

## Local Development

```bash
# Install dependencies
npm install

# Terminal 1: Start local blockchain
npm run anvil

# Terminal 2: Deploy contracts & start webapp
npm run contracts:deploy:local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with MetaMask (Chain ID: `1337`).

## Governance Specification

The vTON DAO Governance Model specification documents are available in the `docs/specs/` directory.

| Version | Document | Status |
|---------|----------|--------|
| [0.1.1](docs/specs/0.1.1/spec.md) | vTON DAO Governance Model | Current |
| [0.1.0](docs/specs/0.1.0/spec.md) | vTON DAO Governance Model | Superseded |

### Changelog

#### 0.1.1 (2026-02-03)

**Added:**
- Proportional burn mechanism: Proposer can optionally set burn rate when creating proposals
- Proposal threshold requirement: Must hold 0.25% of total vTON to create proposals

**Changed:**
- Proposal creation cost: 100 TON → 10 TON

**Removed:**
- Delegation cap (20% limit) - not implemented
- Delegation auto-expiration parameter - not implemented
- Delegation activation waiting period (7 days) - not implemented
- Security Council term limit - not implemented
