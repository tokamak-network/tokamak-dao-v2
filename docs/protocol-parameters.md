# Protocol Parameters

## 1. vTON Emission Schedule (Seigniorage-Proportional Issuance)

Parameters that determine the vTON issuance ratio relative to TON seigniorage. The prototype starts at a 1:1 ratio (TON:vTON), decaying (halving) with each epoch.

| Variable | Description | Prototype Value | Status |
|----------|-------------|-----------------|--------|
| `MAX_SUPPLY` | Maximum total supply of vTON | 100,000,000 (100M) | ⬜ |
| `EPOCH_SIZE` | vTON supply slot per epoch | 5,000,000 (5M) | ⬜ |
| `MAX_EPOCHS` | Total number of epochs | 20 | ⬜ |
| `DECAY_RATE` | Decay multiplier per epoch (halving ratio) | 0.75 (25% reduction per epoch) | ⬜ |
| `emissionRatio` (initial) | DAO-adjustable issuance ratio, initial value | 100% | ⬜ |

## 2. Governance (Proposal · Voting · Execution)

Parameters applied across the governance lifecycle — from proposal creation through voting to timelock and final execution.

### 2-1. Proposal

| Variable | Description | Prototype Value | Status |
|----------|-------------|-----------------|--------|
| `proposalCreationCost` | Cost to create a proposal (TON, burned) | 10 TON | ⬜ |
| `proposalThreshold` | Minimum vTON holdings required to create a proposal (% of total supply) | 0.25% (25 bp) | ⬜ |

### 2-2. Voting

| Variable | Description | Prototype Value | Status |
|----------|-------------|-----------------|--------|
| `votingDelay` | Delay before voting begins after proposal creation | 7,200 blocks (~1 day) | ⬜ |
| `votingPeriod` | Duration of the voting period | 50,400 blocks (~7 days) | ⬜ |
| `quorum` | Quorum required (% of total delegated vTON) | 4% (400 bp) | ⬜ |
| `passRate` | Pass threshold (% of non-abstain votes) | >50% (5,000 bp) | ⬜ |

### 2-3. Execution (Timelock)

| Variable | Description | Prototype Value | Status |
|----------|-------------|-----------------|--------|
| `timelockDelay` | Delay between vote approval and execution | 7 days | ⬜ |
| `gracePeriod` | Execution window after timelock expires | 14 days | ⬜ |
| `MINIMUM_DELAY` | Minimum allowed timelock delay | 1 hour | ⬜ |
| `MAXIMUM_DELAY` | Maximum allowed timelock delay | 30 days | ⬜ |

## 3. Security Council (Emergency Response)

Parameters for the multi-sig committee that handles emergency actions such as proposal cancellation and protocol pause.

| Variable | Description | Prototype Value | Status |
|----------|-------------|-----------------|--------|
| `MIN_MEMBERS` | Minimum number of members | 2 | ⬜ |
| `threshold` | Approval ratio required for execution | ceil(members × 2/3) | ⬜ |
| Initial composition | Initial council setup | 3 members (1 foundation + 2 external) | ⬜ |

## 4. Delegation

Parameters for the mechanism by which vTON holders delegate voting power to representatives.

| Variable | Description | Prototype Value | Status |
|----------|-------------|-----------------|--------|
| `autoExpiryPeriod` | Auto-expiry period for delegations (0 = no expiry) | 0 (no expiry) | ⬜ |
