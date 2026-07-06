# VoteRelayFund — 에이전트 투표 시스템 구조와 개선안

> **대상**: AI 에이전트(Agent)가 위임자로서 자동 투표하는 시스템의 구조, 알려진 문제점, 간소화 방안 정리.
> 관련 컨트랙트: `contracts/src/governance/VoteRelayFund.sol`, DelegateRegistry, DAOGovernor(`castVoteBySig`)
>
> ⚠️ **히스토리 문서**: 여기 나오는 백엔드(Supabase `agents`/`pending_ballots`, Telegram 알림)와
> 프론트엔드는 2026-07 저장소 슬림화로 제거되었습니다 (git 히스토리의 `sql/`, `src/app/api/` 참고).
> VoteRelayFund **컨트랙트** 자체는 `contracts/src/governance/`에 그대로 있습니다.

## 등장 인물

| 역할 | 설명 |
|------|------|
| Delegate (유저) | 프론트엔드에서 Agent를 만들고 vTON을 위임하는 사람 |
| Agent (서버 지갑) | 서버가 생성·보관하는 지갑. 위임자로 등록되어 EIP-712 서명으로 투표 |
| Relayer (서버) | Agent의 서명을 받아 온체인에 트랜잭션을 대신 제출 |
| VoteRelayFund | 릴레이 가스비를 환급해주는 예치 금고 컨트랙트 |
| Supabase | Agent 지갑(암호화 저장), 대기 투표(`pending_ballots`) 보관 |
| Telegram | 유저에게 투표 요청/알림 전달 |

## 초기 셋업 흐름 (한 번만, 현재 6단계)

1. **Delegate (프론트엔드)**: Agent 생성 (ERC-8004 NFT mint)
2. **Server (API)**: Agent 지갑 생성 + Supabase 저장 — `generatePrivateKey()` → encrypt → DB 저장
3. **Agent Wallet**: `registerDelegate()` 호출 — ⚠️ **Agent 지갑에 Sepolia ETH 필요! 현재 자동 등록을 시도하지만 ETH가 없으면 실패**
4. **Delegate (프론트엔드)**: vTON Faucet Claim
5. **Delegate (프론트엔드)**: `approve()` → `delegate()` — Agent에게 vTON 위임 (트랜잭션 2번)
6. **Delegate (프론트엔드)**: VoteRelayFund에 ETH 입금 (선택) — 없으면 Flow B(수동 제출)로 동작

> ⚠️ **핵심 문제: Agent 지갑에 ETH가 없음**
> `registerDelegate()`는 온체인 tx이므로 Agent 지갑에 가스비가 필요합니다. 하지만 Agent 지갑은 서버에서 생성된 빈 지갑입니다. 유저가 직접 ETH를 보내거나 별도 faucet이 필요합니다.

## Flow A — 자동 릴레이 (Gas Deposit 있음)

```
Telegram ──vote 클릭──▶ Agent ──sig(v,r,s)──▶ Relayer ──relay──▶ VoteRelayFund ──vote──▶ DAOGovernor
(유저 버튼)            (EIP-712 서명)        (TX 제출)          relayVote()            castVoteBySig()
                                               ▲                    │
                                               └── 가스비 환급(ETH) ──┘
```

## Flow B — 수동 제출 (Gas Deposit 없음)

```
Telegram ──vote 클릭──▶ Agent ──sig 저장──▶ Supabase ──Submit 클릭──▶ Delegate ──직접 제출──▶ DAOGovernor
(유저 버튼)            (EIP-712 서명)      pending_ballots          (프론트엔드)             castVoteBySig()
     ▲                                        │
     └── "가스비 부족 — 프론트엔드에서 제출하세요" 알림 ──┘
```

## 현재 문제점

| # | 문제 | 원인 | 영향 |
|---|------|------|------|
| 1 | **Agent 지갑에 ETH가 없음** | `registerDelegate()`는 온체인 tx → 가스비 필요 | Agent가 delegate로 등록 불가 → 위임/투표 전체 불가 |
| 2 | **유저가 6단계 셋업 필요** | Faucet → Approve → Delegate → ETH Deposit 모두 수동 | UX 복잡, 이탈률 높음 |
| 3 | **registerDelegate를 누가 호출?** | Agent 지갑(서버)이 호출해야 하지만 ETH 없음 | Relayer가 대신 호출하거나, 컨트랙트 수정 필요 |

## 간소화 방안

### 방안 A: Relayer가 registerDelegate도 대행 — 최소 변경 ✅ (추천)

- Agent 지갑 생성 시, **Relayer 지갑**이 `registerDelegate()`를 대신 호출
- DelegateRegistry에 `registerDelegateFor(address agent, ...)` 함수 추가 필요, 또는 Relayer가 Agent의 서명을 받아 meta-tx로 등록
- 💡 Agent 지갑에 ETH 불필요. Relayer가 가스비 부담. 컨트랙트 1개만 수정.

### 방안 B: Delegate가 프론트엔드에서 한번에 처리 — UX 최적

1. 유저가 "Activate Agent" 버튼 클릭
2. 서버 API가 Relayer로 `registerDelegate()` 호출 (Agent 지갑 ETH 불필요)
3. 프론트엔드가 자동으로 `approve` → `delegate` 순차 실행 (MetaMask 서명 2번, 이미 구현됨)
4. (선택) ETH deposit → 자동 릴레이 활성화

유저 입장에서는 버튼 1번 → MetaMask 2~3회 서명으로 끝.

### 방안 C: 컨트랙트 수정 — registerDelegate 조건 완화

- `DelegateRegistry.delegate()`가 미등록 delegate를 자동 등록
- 유저 입장에서는 approve → delegate만 하면 끝
- ⚠️ 컨트랙트 수정 + 재배포 필요. Timelock이 owner라 governance proposal을 거쳐야 함.

## 결론 (추천)

**방안 A (Relayer 대행)** 추천:
- Agent 지갑 생성 시 Relayer가 `registerDelegate()` 대행
- 컨트랙트 변경 없음 (Relayer 서버 코드만 수정, meta-tx 방식 사용 시)
- Agent 지갑에 ETH 불필요
- 프론트엔드의 approve → delegate 플로우는 이미 구현 완료
