# Tokamak DAO v2 컨트랙트 명세

## 아키텍처 개요

```
┌─────────────┐     ┌──────────────────┐     ┌───────────┐
│    vTON     │────▶│  DelegateRegistry │────▶│DAOGovernor│
│  (토큰)     │     │  (위임 관리)      │     │ (거버넌스) │
└─────────────┘     └──────────────────┘     └─────┬─────┘
                                                   │
                    ┌──────────────────┐     ┌─────▼─────┐
                    │ SecurityCouncil  │────▶│  Timelock │
                    │ (비상 대응)       │     │ (실행 지연)│
                    └──────────────────┘     └───────────┘
```

---

## 컨트랙트별 상세 명세

### vTON (`token/vTON.sol`)

**역할**: 거버넌스 투표 토큰

**특징**:
- 무한 발행 가능
- 거래 가능
- 투표 시 소각 안됨

**주요 상태**:
| 변수 | 타입 | 설명 |
|------|------|------|
| `emissionRatio` | `uint256` | 발행 비율 (1e18 = 100%) |
| `_minters` | `mapping(address => bool)` | 승인된 민터 매핑 |

**주요 함수**:
| 함수 | 파라미터 | 반환값 | 설명 |
|------|----------|--------|------|
| `mint` | `to: address, amount: uint256` | - | vTON 발행 |
| `setEmissionRatio` | `ratio: uint256` | - | 발행 비율 설정 (owner only) |
| `getVotes` | `account: address` | `uint256` | 투표권 조회 |
| `getPastVotes` | `account: address, blockNumber: uint256` | `uint256` | 과거 투표권 조회 |

**이벤트**:
```solidity
event Minted(address indexed to, uint256 amount);
event EmissionRatioUpdated(uint256 oldRatio, uint256 newRatio);
event MinterUpdated(address indexed minter, bool allowed);
```

---

### DelegateRegistry (`governance/DelegateRegistry.sol`)

**역할**: 위임자 등록 및 vTON 위임 관리

**핵심 규칙**:
- vTON 홀더는 직접 투표 불가, 반드시 위임 필요

**주요 상태**:
| 변수 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `autoExpiryPeriod` | `uint256` | `0` | 자동 만료 기간 (0 = 만료 없음) |
| `governor` | `address` | - | DAOGovernor 주소 (burn 권한) |

**주요 함수**:
| 함수 | 파라미터 | 반환값 | 설명 |
|------|----------|--------|------|
| `registerDelegator` | `profile: string, philosophy: string, interests: string[]` | - | 위임자 등록 |
| `delegate` | `delegator: address, amount: uint256` | - | vTON 위임 |
| `undelegate` | `delegator: address, amount: uint256` | - | 위임 해제 |
| `redelegate` | `from: address, to: address, amount: uint256` | - | 위임 이전 |
| `getVotingPower` | `delegator: address, blockNumber: uint256, snapshotBlock: uint256` | `uint256` | 투표력 조회 |
| `getDelegatorInfo` | `delegator: address` | `DelegatorInfo` | 위임자 정보 조회 |
| `getAllDelegators` | - | `address[]` | 전체 위임자 목록 |
| `setGovernor` | `governor_: address` | - | Governor 주소 설정 (owner only) |
| `burnFromDelegate` | `delegateAddr: address, amount: uint256` | - | 위임자 vTON 소각 (governor only) |

**이벤트**:
```solidity
event DelegatorRegistered(address indexed delegator, string profile, string philosophy, string[] interests);
event Delegated(address indexed owner, address indexed delegator, uint256 amount, uint256 expiresAt);
event Undelegated(address indexed owner, address indexed delegator, uint256 amount);
event DelegateVTONBurned(address indexed delegate, uint256 amount);
```

---

### DAOGovernor (`governance/DAOGovernor.sol`)

**역할**: 제안 생성, 투표, 실행

**핵심 규칙**:
- 제안 생성 비용: 10 TON (소각)
- 제안 생성 조건: vTON 보유량 + 위임받은 vTON의 합이 총 공급량의 0.25% 이상 필요 (스팸 방지)
- 투표 기간: 7일 (~50,400 블록)
- 정족수: 총 위임된 vTON의 4%
- 통과 조건: 단순 과반수 (찬성 > 반대)
- 타임락: 7일
- 투표 소각: 제안자가 설정한 비율만큼 투표 시 vTON 소각 (0-100%)

**주요 상태**:
| 변수 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `proposalCreationCost` | `uint256` | `10 TON` | 제안 생성 비용 |
| `proposalThreshold` | `uint256` | `25` | 제안 생성 최소 투표력 (보유 + 위임받은 vTON, basis points, 25 = 0.25%) |
| `quorum` | `uint256` | `400` | 정족수 (basis points, 400 = 4%) |
| `votingDelay` | `uint256` | `86400` | 투표 시작 지연 (초, 1일) |
| `votingPeriod` | `uint256` | `50400` | 투표 기간 (블록, ~7일) |
| `timelockDelay` | `uint256` | `7 days` | 타임락 지연 (초) |
| `gracePeriod` | `uint256` | `14 days` | 유예 기간 (초) |
| `passRate` | `uint256` | `5000` | 통과율 (basis points, 5000 = 50%, >50% 필요) |
| `MAX_BURN_RATE` | `uint16` | `10000` | 최대 소각률 (basis points, 10000 = 100%) |

**Enums**:
```solidity
enum ProposalState {
    Pending,    // 0: 투표 시작 대기
    Active,     // 1: 투표 진행중
    Canceled,   // 2: 취소됨
    Defeated,   // 3: 부결
    Succeeded,  // 4: 가결
    Queued,     // 5: 타임락 대기
    Expired,    // 6: 만료됨
    Executed    // 7: 실행됨
}

enum VoteType {
    For,        // 0: 찬성
    Against,    // 1: 반대
    Abstain     // 2: 기권
}
```

**주요 함수**:
| 함수 | 파라미터 | 반환값 | 설명 |
|------|----------|--------|------|
| `propose` | `targets: address[], values: uint256[], calldatas: bytes[], description: string, burnRate: uint16` | `uint256` | 제안 생성 (burnRate: 0-10000 basis points) |
| `castVote` | `proposalId: uint256, support: uint8` | `uint256` | 투표 (burnRate만큼 vTON 소각) |
| `castVoteWithReason` | `proposalId: uint256, support: uint8, reason: string` | `uint256` | 사유 포함 투표 |
| `queue` | `proposalId: uint256` | - | 타임락 큐에 추가 |
| `execute` | `proposalId: uint256` | - | 제안 실행 |
| `cancel` | `proposalId: uint256` | - | 제안 취소 (제안자만) |
| `state` | `proposalId: uint256` | `ProposalState` | 제안 상태 조회 |
| `getProposal` | `proposalId: uint256` | `Proposal` | 제안 상세 조회 |
| `hasVoted` | `proposalId: uint256, account: address` | `bool` | 투표 여부 확인 |
| `proposalThreshold` | - | `uint256` | 제안 생성 최소 투표력 (basis points) 조회 |
| `setProposalThreshold` | `newThreshold: uint256` | - | 제안 생성 최소 투표력 설정 (owner only) |
| `setTimelockDelay` | `newDelay: uint256` | - | 타임락 지연 설정 (owner only) |
| `setGracePeriod` | `newPeriod: uint256` | - | 유예 기간 설정 (owner only) |
| `setPassRate` | `newRate: uint256` | - | 통과율 설정 (owner only, basis points) |

**이벤트**:
```solidity
event ProposalCreated(
    uint256 id,
    address proposer,
    address[] targets,
    uint256[] values,
    bytes[] calldatas,
    string description,
    uint256 snapshot,
    uint256 voteStart,
    uint256 voteEnd,
    uint16 burnRate
);
event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason);
event VoteBurn(address indexed voter, uint256 indexed proposalId, uint256 burnAmount);
event ProposalQueued(uint256 proposalId, uint256 eta);
event ProposalExecuted(uint256 proposalId);
event ProposalCanceled(uint256 proposalId);
event ProposalThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
```

---

### SecurityCouncil (`governance/SecurityCouncil.sol`)

**역할**: 긴급 상황 대응 멀티시그

**구성**:
- 총 3명 (재단 1명 + 외부 2명)
- 임계값: 2/3 (67%)

**권한**:
- 제안 취소
- 프로토콜 일시정지
- 긴급 업그레이드

**Enums**:
```solidity
enum ActionType {
    CancelProposal,    // 0: 제안 취소
    PauseProtocol,     // 1: 프로토콜 일시정지
    UnpauseProtocol,   // 2: 프로토콜 재개
    EmergencyUpgrade,  // 3: 긴급 업그레이드
    Custom             // 4: 커스텀 액션
}
```

**주요 함수**:
| 함수 | 파라미터 | 반환값 | 설명 |
|------|----------|--------|------|
| `proposeEmergencyAction` | `type: ActionType, target: address, data: bytes, reason: string` | `uint256` | 긴급 액션 제안 |
| `approveEmergencyAction` | `actionId: uint256` | - | 승인 |
| `executeEmergencyAction` | `actionId: uint256` | - | 실행 |
| `cancelProposal` | `proposalId: uint256` | - | 제안 취소 요청 |
| `pauseProtocol` | `reason: string` | - | 프로토콜 일시정지 요청 |
| `getMembers` | - | `address[]` | 멤버 목록 조회 |
| `getPendingActions` | - | `uint256[]` | 대기중 액션 조회 |

**이벤트**:
```solidity
event EmergencyActionProposed(uint256 actionId, ActionType actionType, address target, bytes data, string reason, address proposer);
event EmergencyActionApproved(uint256 actionId, address approver);
event EmergencyActionExecuted(uint256 actionId, address executor);
event MemberAdded(address member, bool isFoundation);
event MemberRemoved(address member);
```

---

### Timelock (`governance/Timelock.sol`)

**역할**: 실행 지연을 통한 안전장치

**상수**:
| 상수 | 값 | 설명 |
|------|-----|------|
| `MINIMUM_DELAY` | `1 days` | 최소 지연 시간 |
| `MAXIMUM_DELAY` | `30 days` | 최대 지연 시간 |
| `GRACE_PERIOD` | `14 days` | 유예 기간 |

**주요 함수**:
| 함수 | 파라미터 | 반환값 | 설명 |
|------|----------|--------|------|
| `queueTransaction` | `target: address, value: uint256, data: bytes` | `bytes32` | 트랜잭션 큐잉 |
| `executeTransaction` | `target: address, value: uint256, data: bytes, eta: uint256` | - | 트랜잭션 실행 |
| `cancelTransaction` | `target: address, value: uint256, data: bytes, eta: uint256` | - | 취소 (Security Council) |
| `isQueued` | `txHash: bytes32` | `bool` | 큐 상태 확인 |
| `isReady` | `txHash: bytes32` | `bool` | 실행 가능 여부 확인 |

**이벤트**:
```solidity
event TransactionQueued(bytes32 indexed txHash, address indexed target, uint256 value, bytes data, uint256 eta);
event TransactionExecuted(bytes32 indexed txHash, address indexed target, uint256 value, bytes data);
event TransactionCanceled(bytes32 indexed txHash);
```

---

## 웹앱 연동 가이드

### 읽기 전용 함수 (view/pure)
Call로 조회 가능, 가스 비용 없음:
- `vTON.getVotes(account)`
- `DelegateRegistry.getDelegatorInfo(delegator)`
- `DAOGovernor.state(proposalId)`
- `DAOGovernor.getProposal(proposalId)`

### 상태 변경 함수
트랜잭션 필요, 가스 비용 발생:
- `DelegateRegistry.delegate(delegator, amount)`
- `DAOGovernor.propose(...)`
- `DAOGovernor.castVote(proposalId, support)`

### 이벤트 구독
실시간 업데이트를 위한 이벤트 리스닝:
```typescript
// 예시: 새 제안 모니터링
governor.on("ProposalCreated", (id, proposer, ...) => {
  // 새 제안 처리
});

// 예시: 투표 모니터링
governor.on("VoteCast", (voter, proposalId, support, weight, reason) => {
  // 투표 결과 업데이트
});
```
