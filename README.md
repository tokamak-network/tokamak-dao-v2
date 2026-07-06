# Tokamak DAO v2

Tokamak Network DAO governance contracts.

## V1 vs V2 Architecture

V2 replaces the fixed-committee governance of V1 with a token-delegation model.

```
V1: Committee-based                      V2: Delegation-based
─────────────────────                    ─────────────────────
TON staking                              vTON (governance token)
  └─ Candidate (L2 operator)               └─ delegate to a registered Delegate
       └─ 3-member Committee                    └─ Delegate votes with delegated weight
            └─ castVote (1 person = 1 vote)          └─ DAOGovernor (token-weighted)
DAOCommitteeProxy + DAOAgendaManager     DAOGovernor + DelegateRegistry
No execution delay                       Timelock (7-day delay + 14-day grace)
Gnosis Safe multisig admin               SecurityCouncil (2/3, veto + pause only)
```

| | V1 | V2 |
|---|---|---|
| Governance model | Committee (3 fixed members) | Delegation (unlimited delegates) |
| Voting unit | 1 member = 1 vote | Delegated vTON weight |
| Voting eligibility | L2 operators (Candidate) | Registered delegates |
| Governance token | None (staking-based) | vTON (100M cap, epoch halving) |
| Voting power | Fixed at first vote | Live delegation at vote time |
| Quorum | 2 of 3 members | 4% of delegated vTON (fixed at proposal creation) |
| Execution delay | None | 7-day Timelock + 14-day grace period |
| Emergency body | Gnosis Safe multisig | SecurityCouncil (2/3 multisig, 12-month validity) |

For details, see [docs/v2-contracts-guide.md](./docs/v2-contracts-guide.md) (contract-by-contract intro),
[docs/migration-v1-to-v2.md](./docs/migration-v1-to-v2.md) (migration plan), and
[contracts/contract-spec.md](./contracts/contract-spec.md) (full spec).

## Repository Layout

```
├── contracts/            Foundry project
│   ├── src/              V2 contracts + V1 mocks (src/migration/)
│   ├── test/             Foundry tests
│   ├── script/           Deploy & migration simulation scripts (.s.sol)
│   ├── scripts/          Shell helpers (anvil, deploy, faucet, time travel)
│   ├── contract-spec.md  Contract specification
│   └── deployments.md    Deployed addresses (Sepolia)
├── docs/                 Architecture, migration, and spec documents
└── HANDOVER.md           Hand-over guide (start here)
```

## Getting Started

Requires [Foundry](https://book.getfoundry.sh/getting-started/installation) (`foundryup`).

```bash
cd contracts
forge build
forge test
```

## Local Development

```bash
# Terminal 1: start a local chain (Chain ID 1337)
./contracts/scripts/start-anvil.sh

# Terminal 2: fund an account and deploy contracts
./contracts/scripts/faucet-local.sh <address>
./contracts/scripts/deploy-local.sh
```

### Testing Proposals (Time Travel)

Local governance parameters (bounded by contract-enforced minimums):
Voting Delay **1 hour** (300 blocks), Voting Period **1 day** (7,200 blocks, `MIN_VOTING_PERIOD`),
Timelock Delay **7 days** (`MINIMUM_DELAY`).

1. Create a proposal, then skip the Voting Delay to begin voting:

    ```bash
    ./contracts/scripts/time-travel.sh 1h        # or: time-travel.sh pending
    ```

2. Cast votes, then skip the Voting Period to close voting:

    ```bash
    ./contracts/scripts/time-travel.sh 1d        # or: time-travel.sh voting
    ```

3. Queue the proposal, skip the Timelock Delay, then execute:

    ```bash
    ./contracts/scripts/time-travel.sh 7d        # or: time-travel.sh timelock
    ```

## Deployments

See [contracts/deployments.md](./contracts/deployments.md) for Sepolia addresses.

## Specification

You can find the governance specification [here](./docs/specs/README.md).
