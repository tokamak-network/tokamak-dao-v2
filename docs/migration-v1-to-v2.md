# Tokamak DAO: V1 → V2 마이그레이션 가이드

> **문서 목적**: V1 Committee 기반 거버넌스에서 V2 Delegation 기반 거버넌스로의 마이그레이션 전략, 보안 검토 항목, 테스트 계획을 정의합니다.

---

## 목차

1. [아키텍처 비교 개요](#1-아키텍처-비교-개요)
2. [컨트랙트 매핑](#2-컨트랙트-매핑)
3. [거버넌스 모델 변경](#3-거버넌스-모델-변경)
4. [토큰 마이그레이션](#4-토큰-마이그레이션)
5. [마이그레이션 실행 계획](#5-마이그레이션-실행-계획)
6. [보안 검토 체크리스트](#6-보안-검토-체크리스트)
7. [테스트 계획](#7-테스트-계획)
8. [롤백 전략](#8-롤백-전략)
9. [부록: 주소 및 파라미터](#9-부록-주소-및-파라미터)

---

## 1. 아키텍처 비교 개요

### 1.1 V1 아키텍처 (현행)

```
┌──────────────────────────────────────────────────────────────────────┐
│                        V1: Committee 기반 거버넌스                      │
│                                                                      │
│   ┌─────────┐    approve     ┌───────────────────┐                   │
│   │  TON    │───(10 TON)───▶│ DAOCommitteeProxy  │                   │
│   │  Token  │    burn        │  (Proxy2 Router)   │                   │
│   └─────────┘                └────────┬──────────┘                   │
│                                       │                              │
│                              ┌────────▼──────────┐                   │
│                              │  DAOCommittee_V1   │◀── Impl A        │
│                              │  DAOCommitteeOwner │◀── Impl B        │
│                              └────────┬──────────┘                   │
│                                       │                              │
│          ┌────────────────────────────┼───────────────────┐          │
│          │                            │                   │          │
│   ┌──────▼───────┐   ┌───────────────▼──┐   ┌───────────▼──┐       │
│   │DAOAgendaManager│   │  CandidateFactory │   │   DAOVault   │       │
│   │ (의제 관리)     │   │  → Candidate[]   │   │  (재무 관리)  │       │
│   └──────────────┘   └──────────────────┘   └──────────────┘       │
│                              │                                       │
│                       ┌──────▼──────┐                                │
│                       │  Candidate  │──▶ castVote()                  │
│                       │ (L2 운영자)  │     (1인 1표)                   │
│                       └─────────────┘                                │
│                                                                      │
│   Staking Layer:                                                     │
│   ┌──────┐   deposit   ┌──────────────┐   mint   ┌─────────┐       │
│   │ WTON │───────────▶│ SeigManager  │────────▶│ Coinage │        │
│   └──────┘             └──────────────┘          └─────────┘        │
│                                                                      │
│   Admin: Gnosis Safe 2-of-3 Multisig                                │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.2 V2 아키텍처 (신규)

```
┌──────────────────────────────────────────────────────────────────────┐
│                     V2: Delegation 기반 거버넌스                       │
│                                                                      │
│   ┌─────────┐                          ┌─────────┐                  │
│   │  TON    │──(10 TON burn)─────────▶│   vTON  │                  │
│   │  Token  │                          │  Token  │                  │
│   └─────────┘                          └────┬────┘                  │
│                                              │ delegate              │
│                                        ┌─────▼──────────┐           │
│                                        │DelegateRegistry │           │
│                                        │ (위임 관리)      │           │
│                                        │ · 위임자 등록    │           │
│                                        │ · vTON 위임     │           │
│                                        │ · 투표력 조회    │           │
│                                        └─────┬──────────┘           │
│                                              │ votingPower           │
│                                        ┌─────▼──────────┐           │
│                                        │  DAOGovernor   │           │
│                                        │ (거버넌스 엔진)  │           │
│                                        │ · 제안 생성     │           │
│                                        │ · 투표          │           │
│                                        │ · 큐/실행       │           │
│                                        └─────┬──────────┘           │
│                                              │ queue                 │
│   ┌──────────────────┐               ┌──────▼──────────┐           │
│   │ SecurityCouncil  │──cancel──────▶│    Timelock     │           │
│   │ (비상 대응 위원회) │               │  (7일 실행 지연) │           │
│   │ · 2/3 다중서명    │               │  · 큐잉         │           │
│   │ · 제안 취소       │               │  · 실행         │           │
│   │ · 프로토콜 일시정지│               │  · 14일 유예기간 │           │
│   └──────────────────┘               └────────────────┘           │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.3 핵심 변경 요약

```
┌────────────────────┬──────────────────────┬──────────────────────────┐
│      항목          │        V1            │          V2              │
├────────────────────┼──────────────────────┼──────────────────────────┤
│ 거버넌스 모델       │ Committee (3인 고정)  │ Delegation (무제한 위임)   │
│ 투표 단위          │ 1인 1표              │ 위임된 vTON 비례          │
│ 투표 자격          │ L2 운영자 (Candidate) │ 등록된 Delegate           │
│ 투표 토큰          │ 없음 (스테이킹 기반)   │ vTON (ERC20Votes)        │
│ 제안 비용          │ 10 TON (burn)        │ 10 TON (burn)            │
│ 의결 정족수        │ 2/3 (멤버 기준)       │ 4% (위임된 vTON 기준)     │
│ 통과 기준          │ YES ≥ quorum         │ FOR > 50% (비기권 투표)   │
│ Timelock          │ 없음                 │ 7일 지연                  │
│ 보안 위원회        │ 없음 (Multisig만)     │ SecurityCouncil (2/3)    │
│ 실행 유예기간      │ 7일                  │ 14일                     │
│ 프록시 패턴        │ 커스텀 (non-EIP-1967) │ 직접 배포 (프록시 없음)    │
│ 토큰 공급          │ 무제한              │ 100M 상한 + 반감기         │
│ 스냅샷            │ 첫 투표 시점          │ 제안 생성 - maturityPeriod│
│                  │                     │ (DAOGovernor 소속)       │
│ Flash loan 방어    │ 미흡                │ votingDelay + maturity    │
└────────────────────┴──────────────────────┴──────────────────────────┘
```

---

## 2. 컨트랙트 매핑

### 2.1 V1 → V2 컨트랙트 대응 관계

```
V1 컨트랙트                              V2 컨트랙트
─────────────────────────────────────────────────────────────────

DAOCommitteeProxy ─────────────┐
DAOCommitteeProxy2             │
DAOCommittee_V1                ├──────▶  DAOGovernor
DAOCommitteeOwner              │         (통합 거버넌스 엔진)
DAOAgendaManager ──────────────┘

                                         DelegateRegistry
CandidateFactory ──────────────────────▶ (위임자 등록/관리)
Candidate (개별 프록시)                    · Candidate 대체

DAOVault ──────────────────────────────▶ Timelock
                                         (재무 + 실행 지연 통합)

(없음) ────────────────────────────────▶ SecurityCouncil
                                         (비상 대응 신규)

TON Token ─────────────────────────────▶ TON Token (유지)

WTON / SeigManager ────────────────────▶ vTON
                                         (거버넌스 전용 토큰 신규)

Gnosis Safe Multisig ──────────────────▶ SecurityCouncil
                                         (다중서명 → 스마트 컨트랙트)
```

### 2.2 제거되는 V1 컨트랙트

| 컨트랙트 | 제거 사유 |
|----------|----------|
| `DAOCommitteeProxy` | V2 Governor가 통합 대체 |
| `DAOCommitteeProxy2` | 셀렉터 라우팅 불필요 |
| `DAOCommittee_V1` / `DAOCommitteeOwner` | 구현체 분리 불필요 |
| `DAOAgendaManager` | Governor 내 통합 |
| `CandidateFactory` | DelegateRegistry가 대체 |
| `Candidate` (프록시) | Delegate 등록으로 대체 |

### 2.3 유지되는 컨트랙트

| 컨트랙트 | 비고 |
|----------|------|
| `TON Token` | 제안 비용 지불에 계속 사용 |
| `WTON` | 스테이킹 레이어와의 호환성 유지 |
| `SeigManager` | vTON 발행 트리거로 연동 가능 |
| `Layer2Registry` | L2 운영자 정보 참조용 유지 |

---

## 3. 거버넌스 모델 변경

### 3.1 제안 생명주기 비교

```
V1 제안 생명주기 (Agenda)
═══════════════════════════════════════════════════════════

  생성              알림 기간          투표 기간         실행 기간
  (NOTICE)          (16일 min)        (2일 min)        (7일 max)
───┬──────────────────┬─────────────────┬────────────────┬───
   │                  │   첫 투표 시     │  YES ≥ quorum  │
   │  10 TON burn     │   VOTING 전환    │  ──▶ ACCEPT    │
   │                  │                 │  NO ≥ reject   │
   │                  │                 │  ──▶ REJECT    │
   └──────────────────┴─────────────────┴────────────────┘
   결과: EXECUTED / ENDED / ENDED_EXPIRED


V2 제안 생명주기 (Proposal)
═══════════════════════════════════════════════════════════

  생성       투표 대기     투표 기간      큐잉      Timelock     실행 유예
 (Pending)  (1일 delay)  (7일 period)  (Queue)   (7일 delay)  (14일 grace)
───┬──────────┬───────────┬───────────┬──────────┬───────────┬───
   │          │           │           │          │           │
   │ 10 TON   │ snapshot  │ castVote  │ queue()  │   대기    │ execute()
   │ burn     │ 확정      │           │          │           │
   │          │           │ FOR>50%   │          │ SC가     │
   │ threshold│           │ +quorum≥4%│          │ cancel   │
   │ check    │           │ =Succeed  │          │ 가능     │
   └──────────┴───────────┴───────────┴──────────┴───────────┴───
   결과: Executed / Defeated / Expired / Canceled

                                    ┌──────────────────┐
   SecurityCouncil은                │ SecurityCouncil  │
   Pending~Queued 상태에서  ◀────── │ cancel 가능       │
   제안 취소 가능                    │ (최종 상태 제외)   │
                                    └──────────────────┘
```

### 3.2 투표 메커니즘 변경

```
V1: 직접 투표 (Committee Member)
══════════════════════════════════

  L2 운영자 ──▶ Candidate Contract ──▶ DAOCommitteeProxy.castVote()
                                            │
                                      1인 1표 (YES/NO/ABSTAIN)
                                            │
                                      3명 중 2명 = 통과


V2: 위임 투표 (Delegation Model)
══════════════════════════════════

  vTON 홀더들                    Delegate (위임자)
  ┌─────────┐                   ┌──────────────────┐
  │ 홀더 A  │──(500 vTON)──────▶│                  │
  │ 홀더 B  │──(300 vTON)──────▶│  Delegate X      │──▶ castVote()
  │ 홀더 C  │──(200 vTON)──────▶│  투표력: 1000    │    (1000 vTON 가중)
  └─────────┘                   └──────────────────┘

  ┌─────────┐                   ┌──────────────────┐
  │ 홀더 D  │──(800 vTON)──────▶│  Delegate Y      │──▶ castVote()
  │ 홀더 E  │──(700 vTON)──────▶│  투표력: 1500    │    (1500 vTON 가중)
  └─────────┘                   └──────────────────┘

  정족수 = 위임된 총 vTON × 4%
  통과 = FOR > 50% (기권 제외)

  위임 만료 정책 (autoExpiryPeriod):
  ──────────────────────────────────
  · DelegateRegistry.autoExpiryPeriod (기본값: 0 = 만료 없음)
  · 0이 아닌 값 설정 시 위임 생성 시 expiresAt이 기록됨
  · 온체인 투표력 계산에는 미반영 (만료된 위임도 투표력에 포함)
  · UI/프론트엔드에서 만료 안내 및 재위임 유도 용도
  · DAO 거버넌스 제안으로 설정 변경 가능
```

### 3.3 보안 메커니즘 비교

```
V1 보안 모델                              V2 보안 모델
──────────────                            ──────────────

┌────────────────┐                        ┌────────────────────────┐
│ Gnosis Safe    │                        │   SecurityCouncil      │
│ 2-of-3 Multisig│                        │   2/3 스마트 컨트랙트   │
│                │                        │                        │
│ · 프록시 일시정지│                        │ · 제안 취소 (cancel)    │
│ · 구현체 업그레이드│                      │ · 프로토콜 일시정지      │
│ · 관리 기능     │                        │ · 프로토콜 재개 (unpause)│
│                │                        │ · 긴급 업그레이드       │
│                │                        │ · 7일 TTL 행동 만료    │
│ ※ 실행 권한 有  │                        │ ※ 실행 권한 無 (차단만)  │
└────────────────┘                        └────────────────────────┘
                                                    │
                                          ┌─────────▼────────────┐
                                          │      Timelock        │
                                          │ · 7일 최소 지연       │
                                          │ · 14일 유예 기간      │
                                          │ · 취소된 TX 실행 차단  │
                                          └──────────────────────┘
                                                    │
                                          ┌─────────▼────────────┐
                                          │ Flash Loan 방어       │
                                          │ · votingDelay (1일)   │
                                          │ · maturityPeriod (7일)│
                                          │ · 스냅샷 기반 투표력   │
                                          └──────────────────────┘
```

---

## 4. 토큰 마이그레이션

### 4.1 토큰 모델 변경

```
V1 토큰 구조                              V2 토큰 구조
──────────────                            ──────────────

  TON (경제적 유틸리티)                     TON (경제적 유틸리티)
   └── WTON (스테이킹용)                     │
        └── Coinage (시뇨리지)               │ (유지)
             └── 스테이킹량 = 투표력          │
                                             └── 제안 비용 (10 TON burn)

  ※ 거버넌스 토큰 없음                      vTON (거버넌스 전용)
  ※ 스테이킹 = 투표 자격                      │
                                              ├── 최대 100M 공급
                                              ├── 에폭당 25% 반감기
                                              ├── emissionRatio 조정 가능
                                              ├── ERC20Votes (투표력 스냅샷)
                                              └── 위임 필수 (직접 투표 불가)
```

### 4.2 vTON 반감기 메커니즘

```
발행 비율 = halvingRatio × emissionRatio

  에폭 │  총 공급량 범위      │ halvingRatio │ 100 vTON 발행 요청 시 실제 발행
  ─────┼────────────────────┼──────────────┼──────────────────────────────
    0  │      0 ~  5M vTON  │   1.0000     │  100.00 vTON
    1  │     5M ~ 10M vTON  │   0.7500     │   75.00 vTON
    2  │    10M ~ 15M vTON  │   0.5625     │   56.25 vTON
    3  │    15M ~ 20M vTON  │   0.4219     │   42.19 vTON
    4  │    20M ~ 25M vTON  │   0.3164     │   31.64 vTON
   ...  │       ...          │    ...       │    ...
   19  │    95M ~ 100M vTON │   0.0042     │    0.42 vTON
   20+ │    발행 불가          │   0.0000     │    0.00 vTON (상한 도달)

  ┌────────────────────────────────────────────────────────┐
  │  halvingRatio                                          │
  │  1.0 ■                                                 │
  │      ■                                                 │
  │  0.75 ■                                               │
  │        ■                                               │
  │  0.56   ■                                             │
  │          ■                                             │
  │  0.42    ■                                            │
  │           ■■                                           │
  │  0.31      ■■                                         │
  │              ■■■                                       │
  │  0.10          ■■■■■■                                 │
  │  0.00               ■■■■■■■■■■■■■■■                  │
  │  ──┬───┬───┬───┬───┬───┬───┬───┬───▶ 에폭             │
  │    0   2   4   6   8  10  12  14  16                   │
  └────────────────────────────────────────────────────────┘
```

### 4.3 초기 vTON 배분 전략

```
┌──────────────────────────────────────────────────────────────┐
│                    vTON 초기 배분 채널                         │
│                                                              │
│  Channel A: 소급 에어드롭 (Retroactive Airdrop)               │
│  ─────────────────────────────────────────────────           │
│  대상: TON 스테이커, L2 운영자, 브릿지 사용자, dApp 사용자      │
│  방식: 기간 × 금액 가중 (ENS 모델)                            │
│  조건: 수령 시 위임 필수 (Claim + Delegate)                    │
│                                                              │
│  Channel B: 시뇨리지 연동 발행                                 │
│  ─────────────────────────────────────────────────           │
│  대상: L2 운영자, 밸리데이터                                   │
│  방식: TON 시뇨리지 비례 vTON 발행                             │
│  제어: emissionRatio × halvingRatio                           │
│                                                              │
│  Channel C: 거버넌스 참여 인센티브                              │
│  ─────────────────────────────────────────────────           │
│  대상: 등록 위임자, 활발한 투표 참여자                           │
│  방식: 참여도 기반 보상                                        │
│                                                              │
│  Channel D: 에코시스템 그랜트 풀                               │
│  ─────────────────────────────────────────────────           │
│  대상: DAO 거버넌스 제안 통과 시 지급                           │
│  방식: 분기별 그랜트 라운드, RetroPGF                          │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. 마이그레이션 실행 계획

### 5.1 전체 마이그레이션 타임라인

```
Phase 1              Phase 2              Phase 3              Phase 4
컨트랙트 배포          초기화 & 연동         거버넌스 이전          V1 비활성화
(~1일)                (~2일)               (~30일 전환기간)       (~7일)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│                    │                    │                    │
│  ① vTON 배포       │  ⑤ 민터 설정        │  ⑨ 첫 제안 생성     │  ⑫ V1 pause
│  ② DelegateReg배포 │  ⑥ vTON 초기 배분   │  ⑩ 투표 + 실행 검증  │  ⑬ 관리권한 이전
│  ③ Timelock 배포   │  ⑦ 위임자 등록      │  ⑪ 모니터링         │  ⑭ 문서화
│  ④ Governor 배포   │  ⑧ 가디언 설정      │                    │
│                    │  ⑨ 소유권 이전      │                    │
│  ④' SC 배포        │                    │                    │
│                    │                    │                    │
```

### 5.2 Phase 1: 컨트랙트 배포

```
배포 순서 (의존성 기반)
════════════════════════

  Step 1: vTON 배포
  ─────────────────
  constructor(initialOwner)
  → name/symbol은 하드코딩 ("Tokamak Network Governance Token", "vTON")
  → 소유자 = deployer (임시, Ownable2Step)

          │
          ▼

  Step 2: DelegateRegistry 배포
  ─────────────────────────────
  constructor(vTON_address, initialOwner)
  → 소유자 = deployer (임시)

          │
          ▼

  Step 3: Timelock 배포
  ─────────────────────
  constructor(admin, delay=7days)
  → admin = deployer (임시)

          │
          ▼

  Step 4: DAOGovernor 배포
  ────────────────────────
  constructor(
    ton_address,           ← 기존 TON 토큰
    vton_address,          ← Step 1
    delegateRegistry,      ← Step 2
    timelock_address,      ← Step 3
    initialOwner           ← deployer (임시)
  )

          │
          ▼

  Step 5: SecurityCouncil 배포
  ────────────────────────────
  constructor(
    foundationMember,      ← 재단 멤버 주소
    externalMembers[],     ← 외부 멤버 2명 (배열)
    daoGovernor,           ← Step 4
    timelock,              ← Step 3
    protocolTarget         ← DAOGovernor 주소 (= Step 4)
  )
  → threshold는 자동 계산: ceil(members × 2/3) = 2
  → protocolTarget = DAOGovernor: pause()/unpause()로
    제안·투표·실행을 일시정지/재개 (Pausable 상속)
```

### 5.3 Phase 2: 초기화 및 연동

```
연동 설정 (배포 후)
════════════════════

  ┌─────────────────────────────────────────────────────────┐
  │                    연동 트랜잭션                          │
  │                                                         │
  │  TX1: vTON.setMinter(seigManager, true)                 │
  │       → 시뇨리지 연동 민터 등록                            │
  │                                                         │
  │  TX2: delegateRegistry.setGovernor(governor)             │
  │       → DelegateRegistry에 Governor 주소 설정             │
  │                                                         │
  │  TX3: timelock.setGovernor(governor)                     │
  │       → Timelock에 Governor 주소 설정                    │
  │                                                         │
  │  TX4: timelock.setSecurityCouncil(securityCouncil)       │
  │       → Timelock에 SecurityCouncil 주소 설정             │
  │                                                         │
  │  TX5: governor.setProposalGuardian(securityCouncil)      │
  │       → Governor에 제안 가디언 설정                       │
  │                                                         │
  │  TX6: governor.setPauseGuardian(securityCouncil)         │
  │       → Governor에 일시정지 가디언 설정                    │
  │       ※ SC가 ownership 없이도 pause/unpause 가능         │
  │                                                         │
  │  TX7: delegateRegistry.transferOwnership(timelock)       │
  │       → DelegateRegistry 소유권을 Timelock으로 이전       │
  │                                                         │
  │  TX8: governor.transferOwnership(timelock)               │
  │       → DAOGovernor 소유권을 Timelock으로 이전            │
  │                                                         │
  │  TX9: vTON.transferOwnership(timelock)                   │
  │       → vTON 소유권을 Timelock으로 이전                   │
  │       ※ Ownable2Step: 이 TX는 pending 상태 시작일 뿐     │
  │         Phase 3에서 governance 제안으로 acceptOwnership() │
  │         실행 필요                                         │
  │                                                         │
  │  TX10: timelock.setPendingAdmin(timelock)                │
  │        → Timelock 자체 관리 설정 (자기참조)                │
  │        ※ Phase 3에서 governance 제안으로 acceptAdmin()    │
  │          실행 필요                                        │
  │                                                         │
  └─────────────────────────────────────────────────────────┘

  ⚠️ deployer 잔여 권한 기간 (TX7~TX10 이후 ~ Phase 3 완료 전):
  ═══════════════════════════════════════════════════════════════
  TX7~TX10으로 vTON/DelegateRegistry/DAOGovernor의 소유권은 이전되지만,
  Timelock의 admin은 Phase 3에서 acceptAdmin()이 실행될 때까지
  deployer가 유지됩니다.

  deployer가 이 기간 동안 가능한 작업:
  · timelock.setGovernor() — Governor 주소 변경
  · timelock.setSecurityCouncil() — SC 주소 변경
  · timelock.setDelay() — Timelock 지연 시간 변경

  deployer가 불가능한 작업:
  · timelock.queueTransaction() — Governor만 가능
  · timelock.executeTransaction() — Governor만 가능

  → 이 기간을 최소화하기 위해 Phase 3 첫 주에 acceptAdmin()
    제안을 우선 실행하는 것을 권장합니다.

  ※ 소유권 이전 대상이 Timelock인 이유:
  ═══════════════════════════════════════
  execute()가 Timelock.executeTransaction()을 통해 실행되므로
  target 입장에서 msg.sender = Timelock.
  따라서 vTON, DelegateRegistry, DAOGovernor의 owner가
  Timelock이어야 governance 제안으로 파라미터 변경 가능.

  ※ Ownable2Step 주의:
  ═══════════════════════
  vTON은 Ownable2Step을 사용하므로 transferOwnership()은
  pending 상태를 시작할 뿐, acceptOwnership()이 호출되어야
  소유권 이전이 완료됨. Phase 3에서 governance 제안으로 실행.

  최종 소유권 구조:
  ═════════════════

  ┌───────────┐
  │ Timelock  │──owner──▶ vTON
  │ admin=self│──owner──▶ DelegateRegistry
  │           │──owner──▶ DAOGovernor
  └─────┬─────┘
        │                 ┌───────────────────────┐
        │◀────cancel──────│  SecurityCouncil      │
        │                 │  (proposalGuardian)    │
        │                 │  (pauseGuardian)       │
        │                 └───────────────────────┘
        │                         │
  DAOGovernor ──queue/execute──▶ Timelock
        ▲
        │ pause/unpause (via pauseGuardian)
        └──── SecurityCouncil

  Ownable 모델별 이전 방식:
  ═════════════════════════════

  | 컨트랙트         | Ownable 모델     | 이전 방식                          |
  |-----------------|-----------------|-----------------------------------|
  | vTON            | Ownable2Step    | transferOwnership → acceptOwnership (2-step) |
  | DAOGovernor     | Ownable         | transferOwnership (즉시 이전)       |
  | DelegateRegistry| Ownable         | transferOwnership (즉시 이전)       |
  | Timelock        | 자체 구현        | setPendingAdmin → acceptAdmin      |
```

### 5.4 Phase 3: 거버넌스 전환

```
전환 기간 운영 (30일)
══════════════════════

  Week 1-2: 병행 운영
  ───────────────────
  · V1 거버넌스 유지 (긴급 의제만)
  · V2에서 테스트 제안 생성/투표/실행
  · vTON 에어드롭 및 위임 진행
  · 위임자 등록 촉진

  Week 2: 소유권 이전 완료 (Governance 제안)
  ───────────────────────────────────────────
  · 제안 1: vTON.acceptOwnership() 실행
    → Ownable2Step 소유권 이전 완료
  · 제안 2: Timelock.acceptAdmin() 실행
    → Timelock 자기참조 admin 설정 완료
  · 두 제안 모두 실행 후 deployer 잔여 권한 없음 확인
    - vTON.owner() == timelock ✓
    - DelegateRegistry.owner() == timelock ✓
    - DAOGovernor.owner() == timelock ✓
    - Timelock.admin() == timelock ✓

  Week 3-4: V2 전환
  ───────────────────
  · V2에서 첫 공식 제안 실행
  · V1 신규 의제 생성 중단
  · 커뮤니티 V2 마이그레이션 안내
  · 모니터링 및 버그 바운티
```

### 5.5 Phase 4: V1 비활성화

```
V1 비활성화 절차
═════════════════

  Step 1: V1 DAOCommitteeProxy 일시정지
  ──────────────────────────────────────
  Gnosis Safe → pauseProxy = true
  → 모든 V1 거버넌스 기능 정지

  Step 2: 관리 권한 이전
  ──────────────────────
  V1에서 관리하던 프로토콜 권한을
  V2 Timelock 주소로 변경

  Step 3: DAOVault 자금 마이그레이션
  ─────────────────────────────────
  V1 DAOVault → V2 Timelock
  (V2 거버넌스 제안으로 실행)

  Step 4: 완료 문서화
  ──────────────────
  · 최종 상태 스냅샷
  · 마이그레이션 완료 보고서
  · V1 컨트랙트 아카이브
```

---

## 6. 보안 검토 체크리스트

### 6.1 스마트 컨트랙트 보안

```
┌──────────────────────────────────────────────────────────────────┐
│                    보안 검토 매트릭스                               │
│                                                                  │
│  위험도:  🔴 Critical  🟠 High  🟡 Medium  🟢 Low                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🔴 CR-01: 소유권 이전 원자성                                     │
│  ──────────────────────────────                                  │
│  위험: Phase 2 TX 실패 시 불완전한 소유권 상태                      │
│  검증: 모든 TX를 단일 멀티콜로 실행하거나                           │
│        각 단계 후 상태 검증                                        │
│  주의: vTON은 Ownable2Step 사용 → transferOwnership()은           │
│        pending 상태 시작일 뿐, acceptOwnership()이 governance     │
│        제안으로 실행되어야 소유권 이전 완료                          │
│  테스트: 중간 단계에서 실패 시 롤백 가능 여부                        │
│                                                                  │
│  🔴 CR-02: Timelock 자기참조 admin 설정                           │
│  ──────────────────────────────────────                           │
│  위험: admin이 Timelock 자신이므로, admin 변경 시                  │
│        반드시 Timelock을 통해야 함 → 데드락 가능성                  │
│  검증: Timelock.setDelay(), setPendingAdmin() 등                 │
│        Governor 제안으로 실행 가능 확인                             │
│  주의: setPendingAdmin(timelock) 후 acceptAdmin()이              │
│        governance 제안으로 실행되어야 admin 이전 완료               │
│  테스트: E2E 시나리오로 admin 변경 플로우 검증                      │
│                                                                  │
│  🔴 CR-03: Governor → Timelock 권한 집중                         │
│  ──────────────────────────────────────                           │
│  위험: Governor 취약점 발견 시 Timelock 내 자금 위험                │
│  검증: Governor 업그레이드 경로 확인                               │
│        SecurityCouncil의 cancel 권한 동작 확인                    │
│  테스트: 악의적 제안 시뮬레이션 + SC cancel 검증                    │
│                                                                  │
│  🔴 CR-04: SC 자기방어 우회 경로 (Timelock 직접 취소)              │
│  ──────────────────────────────────────────────                  │
│  위험: DAOGovernor.cancel()의 자기방어 체크                       │
│        ("guardian은 자신을 target으로 하는 제안 취소 불가")가       │
│        Timelock 레벨에서는 적용되지 않음                           │
│  우회 경로:                                                      │
│    ① Timelock.cancelTransaction() 직접 호출                      │
│      → SC가 Timelock의 securityCouncil 역할이므로                │
│        Governor를 거치지 않고 직접 트랜잭션 취소 가능               │
│    ② Timelock.cancelTransactionByHash() 직접 호출                │
│      → txHash만 알면 동일하게 직접 취소 가능                       │
│    ③ Custom emergency action → Timelock.cancelTransaction()      │
│      → SC의 긴급 행동으로 Timelock.cancelTransaction() 호출       │
│  영향: SC 교체/제거 제안이 Timelock에 큐잉된 후,                   │
│        SC가 Timelock 직접 취소로 자기방어 체크를 우회하여           │
│        해당 트랜잭션을 취소할 수 있음                               │
│  해결 방안:                                                      │
│    · Timelock에 transactionTarget 매핑 추가                      │
│      (txHash → target 주소 기록)                                 │
│    · cancelTransaction에 자기방어 체크 추가                       │
│      (caller == SC일 때 target이 SC 자신이면 revert)             │
│  테스트:                                                         │
│    · SC 교체 제안 큐잉 → Timelock 직접 취소 시도 → revert 확인    │
│    · SC 교체 제안 큐잉 → 긴급 행동 경유 취소 시도 → revert 확인    │
│    · 일반 제안에 대한 SC의 Timelock 직접 취소 → 성공 확인          │
│                                                                  │
│  🟠 HI-01: vTON 초기 배분 조작                                   │
│  ────────────────────────────                                    │
│  위험: 에어드롭/민팅 시 불공정 배분                                 │
│  검증: Minter 권한 제한 확인                                      │
│        반감기 메커니즘 에지케이스 (에폭 경계)                        │
│  테스트: 에폭 경계 크로싱 시 정확한 반감기 적용 확인                  │
│                                                                  │
│  🟠 HI-02: 위임 시스템 조작                                      │
│  ────────────────────────                                        │
│  위험: maturityPeriod 우회, 다중 위임 악용                         │
│  검증: 블록 기반 스냅샷 정확성                                     │
│        위임 해제 시 비례 반환 정확성                                │
│  테스트: maturity 직전/직후 위임 → 투표 가능 여부                   │
│                                                                  │
│  🟠 HI-03: (CR-04로 승격됨 — 아래 참조)                          │
│                                                                  │
│  🟡 ME-01: Vote Burn 비례 계산                                   │
│  ────────────────────────────                                    │
│  위험: burn 후 undelegation 시 반환량 계산 오류                    │
│  검증: proportionalReturn 수학적 정확성                            │
│        (totalDelegated / (totalDelegated + totalBurned))          │
│  테스트: 연속 burn → undelegate 시나리오 퍼징                      │
│                                                                  │
│  🟡 ME-02: Quorum 계산 기준 시점                                 │
│  ────────────────────────────                                    │
│  위험: 제안 생성 시점 quorum vs 투표 종료 시점 quorum 불일치        │
│  검증: quorum이 제안 생성 시 스냅샷되는지 확인                      │
│  테스트: 투표 중 대량 위임 해제 → quorum 영향 없음 확인             │
│                                                                  │
│  🟡 ME-03: Grace Period 만료 경계                                │
│  ────────────────────────────                                    │
│  위험: eta + gracePeriod 정확히 경계값에서의 동작                   │
│  검증: block.timestamp == eta + GRACE_PERIOD 시                  │
│        실행 가능/불가 명확히 정의                                   │
│  테스트: 경계값 테스트 (boundary testing)                          │
│                                                                  │
│  🟢 LO-01: 이벤트 일관성                                         │
│  ────────────────────────                                        │
│  검증: 모든 상태 변경에 이벤트가 발행되는지 확인                     │
│  테스트: 프론트엔드 연동에 필요한 이벤트 완전성 확인                  │
│                                                                  │
│  🟢 LO-02: Reentrancy 보호                                      │
│  ────────────────────────                                        │
│  검증: 외부 호출 포함 함수에 ReentrancyGuard 적용 확인             │
│  테스트: 재진입 공격 시뮬레이션                                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 마이그레이션 특화 보안 항목

```
┌──────────────────────────────────────────────────────────────────┐
│                 마이그레이션 보안 체크리스트                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  □ 배포 순서 의존성                                               │
│    └─ 컨트랙트 A가 B의 주소를 필요로 할 때, B가 먼저 배포되는지      │
│                                                                  │
│  □ 초기 상태 검증                                                 │
│    └─ 배포 직후 모든 파라미터가 의도된 값인지                       │
│    └─ proposalThreshold, quorum, votingDelay 등                  │
│                                                                  │
│  □ 소유권 이전 완전성                                             │
│    └─ 모든 컨트랙트의 owner/admin이 최종 목표 주소로 이전되었는지   │
│    └─ 2-step ownership (Ownable2Step) 수락 확인                  │
│                                                                  │
│  □ 권한 분리 검증                                                 │
│    └─ deployer 계정에 잔여 권한이 없는지                           │
│    └─ minter 권한이 의도된 주소에만 부여되었는지                    │
│                                                                  │
│  □ V1/V2 병행 기간 안전성                                         │
│    └─ V1과 V2가 동시에 동일 자금/자원을 제어하지 않는지             │
│    └─ 이중 실행(double execution) 불가능 확인                     │
│                                                                  │
│  □ V1 비활성화 후 복구 불가능 동작 없음                             │
│    └─ pause 후 재개(unpause) 가능 여부                           │
│    └─ 자금 잠금(lock) 시나리오 없음 확인                           │
│                                                                  │
│  □ 프론트엔드 호환성                                              │
│    └─ 이벤트 시그니처 일치                                        │
│    └─ 함수 반환값 형식 호환                                       │
│    └─ 에러 메시지 일관성                                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 6.3 공격 벡터 분석

```
┌──────────────────────────────────────────────────────────────────┐
│                      공격 벡터 및 대응                             │
├────────────────┬───────────────────────┬─────────────────────────┤
│    공격 유형    │       시나리오         │        V2 대응          │
├────────────────┼───────────────────────┼─────────────────────────┤
│ Flash Loan     │ 대량 vTON 차입 →      │ votingDelay (1일)       │
│ 투표 조작       │ 위임 → 투표 → 반환     │ + maturityPeriod (7일)  │
│                │                       │ = 7일 이상 위임 유지 필요 │
├────────────────┼───────────────────────┼─────────────────────────┤
│ Governance     │ 악의적 제안 통과 →     │ Timelock 7일 지연       │
│ Attack         │ 재무 탈취             │ + SC cancel 가능        │
│ (Compound 289) │                       │ + 커뮤니티 대응 시간     │
├────────────────┼───────────────────────┼─────────────────────────┤
│ Whale          │ 소수가 대량 vTON       │ Delegation 필수         │
│ Dominance      │ 보유 → 독재           │ + 위임자 등록 공개       │
│                │                       │ + 4% quorum 분산 요구    │
├────────────────┼───────────────────────┼─────────────────────────┤
│ Sybil          │ 다수 계정으로          │ 위임자 등록 + 프로필 요구 │
│ Attack         │ 위임자 등록 →         │ + proposalThreshold     │
│                │ 투표 분산             │   (0.25% 보유 필요)      │
├────────────────┼───────────────────────┼─────────────────────────┤
│ Griefing       │ 무의미한 제안 남발     │ 10 TON burn 비용       │
│ (Spam)         │ → 네트워크 피로       │ + threshold 요건        │
├────────────────┼───────────────────────┼─────────────────────────┤
│ Time           │ 블록 타임스탬프       │ 블록 넘버 기반 투표 기간  │
│ Manipulation   │ 조작으로 기간 우회     │ + timestamp는 Timelock만 │
├────────────────┼───────────────────────┼─────────────────────────┤
│ Reentrancy     │ execute 중            │ ReentrancyGuard 적용    │
│                │ 재진입 호출           │ (propose, execute 등)    │
└────────────────┴───────────────────────┴─────────────────────────┘
```

---

## 7. 테스트 계획

### 7.1 테스트 범위 개요

```
┌──────────────────────────────────────────────────────────────────┐
│                       테스트 피라미드                              │
│                                                                  │
│                         ╱╲                                       │
│                        ╱  ╲    E2E 테스트                        │
│                       ╱ E2E╲   · 전체 거버넌스 플로우              │
│                      ╱      ╲  · 마이그레이션 시나리오             │
│                     ╱────────╲                                   │
│                    ╱          ╲  통합 테스트                      │
│                   ╱ Integration╲ · 컨트랙트 간 상호작용            │
│                  ╱              ╲· 소유권 이전 플로우              │
│                 ╱────────────────╲                               │
│                ╱                  ╲ 단위 테스트                   │
│               ╱    Unit Tests      ╲· 개별 함수 정확성            │
│              ╱                      ╲· 에지 케이스                │
│             ╱────────────────────────╲· 파라미터 경계값            │
│            ╱                          ╲                          │
│           ╱      Fuzz Testing          ╲ 퍼즈 테스트             │
│          ╱    (Foundry invariant)        ╲· 랜덤 입력 검증        │
│         ╱────────────────────────────────╲                      │
│                                                                  │
│  현재 테스트: 350 tests                                          │
│  목표 커버리지: 95%+                                             │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 단위 테스트 목록

```
vTON 토큰
═════════
□ mint - 정상 발행 (halvingRatio × emissionRatio 적용)
□ mint - 에폭 경계 크로싱 시 올바른 반감기 적용
□ mint - MAX_SUPPLY 초과 시도 → revert
□ mint - 비승인 민터 → revert
□ setEmissionRatio - 0~100% 범위 검증
□ setEmissionRatio - owner가 아닌 호출자 → revert
□ getHalvingRatio - 각 에폭별 정확한 비율 반환
□ getCurrentEpoch - totalSupply 기반 에폭 계산
□ transfer/transferFrom - 표준 ERC20 동작
□ delegate - ERC20Votes 위임 비활성화 확인

DelegateRegistry
════════════════
□ registerDelegate - 신규 위임자 등록
□ registerDelegate - 이미 등록된 위임자 → revert
□ delegate - 정상 위임 (vTON 잔액 차감)
□ delegate - 비활성 위임자에게 위임 → revert
□ delegate - 잔액 부족 → revert
□ undelegate - 정상 해제 (비례 반환 포함)
□ undelegate - burn 후 비례 반환 정확성
□ redelegate - 위임 이전 (원자적 실행)
□ getVotingPower - 스냅샷 블록 기준 정확한 투표력
□ getVotingPower - maturity 미달 위임 → 0 반환
□ burnFromDelegate - governor만 호출 가능
□ deactivateDelegate / reactivateDelegate - 상태 전환

DAOGovernor
═══════════
□ propose - 정상 제안 생성 (TON burn + threshold 확인)
□ propose - threshold 미달 → revert
□ propose - TON 잔액 부족 → revert
□ castVote - FOR/AGAINST/ABSTAIN 투표
□ castVote - 미등록 위임자 → revert
□ castVote - 투표 기간 외 → revert
□ castVote - 이중 투표 → revert
□ state - 정족수 충족 + 통과율 충족 → Succeeded
□ state - 정족수 미달 → Defeated
□ state - 통과율 미달 → Defeated
□ queue - Succeeded 상태에서만 가능
□ execute - Queued 상태 + eta 이후에만 가능
□ execute - gracePeriod 초과 → Expired
□ cancel - proposer: Pending/Active만 취소 가능
□ cancel - guardian: 최종 상태 제외 모두 취소 가능
□ cancel - guardian: 자기 대상 제안 취소 불가
□ 파라미터 업데이트 - owner만 가능
□ 파라미터 업데이트 - 범위 검증

Timelock
════════
□ queueTransaction - governor만 호출 가능
□ queueTransaction - eta = block.timestamp + delay
□ executeTransaction - eta 이전 → revert
□ executeTransaction - eta + GRACE_PERIOD 이후 → revert
□ executeTransaction - 취소된 TX → revert
□ cancelTransaction - securityCouncil만 호출 가능
□ setDelay - MINIMUM_DELAY ~ MAXIMUM_DELAY 범위
□ setPendingAdmin / acceptAdmin - 2-step 이전

SecurityCouncil
═══════════════
□ proposeEmergencyAction - 멤버만 가능
□ approveEmergencyAction - 멤버만 + 미만료 + 미중복
□ executeEmergencyAction - threshold 충족 시 실행
□ executeEmergencyAction - 7일 TTL 만료 → revert
□ cancelEmergencyAction - 제안자만 취소 가능
□ unpauseProtocol - 프로토콜 재개 요청 (멤버만)
□ addMember / removeMember - DAO만 가능
□ removeMember - 마지막 Foundation 멤버 제거 → revert
□ setThreshold - DAO만 가능 + 범위 검증
```

### 7.3 통합 테스트 시나리오

```
┌──────────────────────────────────────────────────────────────────┐
│                    통합 테스트 시나리오                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  IT-01: 전체 거버넌스 플로우                                      │
│  ─────────────────────────                                       │
│  vTON 발행 → 위임자 등록 → 위임 → 제안 생성 → 투표 →             │
│  queue → timelock 대기 → execute                                 │
│                                                                  │
│  IT-02: SecurityCouncil 제안 취소 플로우                          │
│  ─────────────────────────────────────                           │
│  악의적 제안 생성 → 투표 통과 → queue →                            │
│  SC proposeEmergencyAction → SC approve(2/3) →                  │
│  SC executeEmergencyAction → 제안 취소 확인                       │
│                                                                  │
│  IT-03: 위임 해제 후 투표력 반영                                   │
│  ─────────────────────────────                                   │
│  위임 → maturity 경과 → 제안 생성 (스냅샷) →                      │
│  위임 해제 → 투표 → 해제 전 스냅샷 기준 투표력 사용                 │
│                                                                  │
│  IT-04: Vote Burn + Undelegate 정확성                            │
│  ─────────────────────────────────                               │
│  위임(1000) → 투표(burnRate=10%, burn=100) →                     │
│  undelegate(500) → 반환량 = 500×(900/1000) = 450 확인            │
│                                                                  │
│  IT-05: Timelock Grace Period 만료                               │
│  ───────────────────────────────                                 │
│  제안 통과 → queue → timelock 대기 →                              │
│  gracePeriod 초과 → execute → revert (Expired)                   │
│                                                                  │
│  IT-06: Governor 파라미터 변경 제안                                │
│  ─────────────────────────────────                               │
│  quorum 변경 제안 → 투표 → 실행 →                                 │
│  새로운 quorum 적용 확인                                           │
│  (기존 진행 중 제안에는 이전 quorum 적용 확인)                      │
│                                                                  │
│  IT-07: 반감기 에폭 전환 중 발행                                   │
│  ───────────────────────────                                     │
│  에폭 0 끝자락에서 대량 mint →                                    │
│  에폭 경계 크로싱 → 올바른 반감기 적용 확인                         │
│                                                                  │
│  IT-08: SecurityCouncil 멤버 교체 (DAO 거버넌스 통해)              │
│  ───────────────────────────────────────────────                 │
│  SC 멤버 추가/제거 제안 → 투표 → Timelock → 실행 →                │
│  새 멤버 구성 + threshold 재계산 확인                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 7.4 E2E 마이그레이션 테스트

```
┌──────────────────────────────────────────────────────────────────┐
│                E2E 마이그레이션 테스트 시나리오                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  E2E-01: 완전 마이그레이션 시뮬레이션                              │
│  ─────────────────────────────────────                           │
│  Mainnet Fork 위에서:                                            │
│  1. V2 컨트랙트 전체 배포                                        │
│  2. 연동 TX 실행 (TX1~TX10)                                     │
│  3. V1 참여자 → V2 위임자 등록                                   │
│  4. vTON 배분 → 위임 → 제안 → 투표 → 실행                       │
│  5. V1 pause → V2 단독 운영 확인                                │
│                                                                  │
│  E2E-02: 실패 복구 시뮬레이션                                     │
│  ───────────────────────────                                     │
│  Phase 2 TX 중간 실패:                                           │
│  1. TX1~TX3 성공, TX4 실패                                       │
│  2. 불완전 상태에서 V1 정상 동작 확인                              │
│  3. TX4 재실행 후 완전 상태 확인                                  │
│                                                                  │
│  E2E-03: V1/V2 병행 운영                                        │
│  ───────────────────────                                        │
│  1. V2 배포 완료 + V1 활성 상태                                  │
│  2. V1에서 의제 생성/투표/실행 정상 동작                           │
│  3. V2에서 제안 생성/투표/실행 정상 동작                           │
│  4. 동일 자원에 대한 이중 제어 없음 확인                           │
│                                                                  │
│  E2E-04: 긴급 상황 대응                                          │
│  ──────────────────────                                          │
│  1. 악의적 제안 통과 + queue                                     │
│  2. SecurityCouncil 긴급 행동 제안                               │
│  3. 2/3 승인 → 실행 → 제안 취소 성공                             │
│  4. Timelock 내 TX 취소 확인                                     │
│                                                                  │
│  E2E-05: DAOVault 자금 마이그레이션                               │
│  ──────────────────────────────                                  │
│  1. V1 DAOVault 잔액 확인                                        │
│  2. V2 거버넌스 제안으로 자금 이전                                │
│  3. Timelock 통한 실행                                           │
│  4. 잔액 이동 완료 확인                                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 7.5 퍼즈 테스트 (Foundry Invariant)

```
┌──────────────────────────────────────────────────────────────────┐
│                    퍼즈 테스트 불변량 (Invariants)                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FUZZ-01: vTON.totalSupply() ≤ MAX_SUPPLY (100M)                │
│  항상 총 공급량이 상한을 초과하지 않아야 한다                       │
│                                                                  │
│  FUZZ-02: ∑ delegations ≤ vTON.totalSupply()                    │
│  총 위임량이 총 공급량을 초과할 수 없다                             │
│                                                                  │
│  FUZZ-03: votingPower(delegate) ≤ totalDelegated(delegate)       │
│  위임자의 투표력은 위임받은 양을 초과할 수 없다                      │
│                                                                  │
│  FUZZ-04: burn(amount) 후 undelegation 반환량                    │
│  반환량 = undelegateAmount × (remaining / (remaining + burned))  │
│  → 항상 undelegateAmount 이하                                    │
│                                                                  │
│  FUZZ-05: Timelock eta 계산                                      │
│  queueTransaction 후 eta == block.timestamp + delay 항상 성립    │
│                                                                  │
│  FUZZ-06: Proposal state 전이 일관성                              │
│  상태 전이가 항상 유효한 방향으로만 발생                             │
│  (Pending→Active→Succeeded→Queued→Executed)                     │
│  역방향 전이 불가능                                               │
│                                                                  │
│  FUZZ-07: 위임/해제 사이클 후 잔액 보존                            │
│  delegate(X) → undelegate(X) 후 vTON 잔액 ≥ initial - burned    │
│                                                                  │
│  FUZZ-08: SecurityCouncil threshold 불변                         │
│  threshold ≤ members.length 항상 성립                            │
│  threshold ≥ MIN_MEMBERS 항상 성립 (멤버 ≥ 2일 때)               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 7.6 테스트 실행 명령어

```bash
# 전체 테스트
cd contracts && forge test

# 특정 컨트랙트 테스트
forge test --match-contract DAOGovernorTest

# 특정 함수 테스트
forge test --match-test test_propose_succeeds

# 가스 리포트 포함
forge test --gas-report

# 상세 로그
forge test -vvvv

# 퍼즈 테스트 (많은 반복)
forge test --match-test invariant_ --fuzz-runs 10000

# 커버리지 측정
forge coverage

# Mainnet Fork 테스트
forge test --fork-url $ETH_MAINNET_RPC --match-contract E2EMigrationTest
```

---

## 8. 롤백 전략

### 8.1 Phase별 롤백 시나리오

```
┌──────────────────────────────────────────────────────────────────┐
│                       롤백 의사결정 트리                           │
│                                                                  │
│  Phase 1 (배포) 실패?                                            │
│  ├─ YES → 배포된 컨트랙트 폐기, V1 유지                          │
│  │        (배포 비용만 손실, 상태 영향 없음)                       │
│  └─ NO ─▶                                                       │
│                                                                  │
│  Phase 2 (초기화) 실패?                                          │
│  ├─ YES → 미완료 TX 재실행 또는                                   │
│  │        소유권 deployer에 유지 → V1 계속 운영                   │
│  │        (V2 컨트랙트 초기 상태이므로 안전)                       │
│  └─ NO ─▶                                                       │
│                                                                  │
│  Phase 3 (전환) 중 치명적 버그?                                   │
│  ├─ YES → V2 거버넌스로 V2 pause 또는                            │
│  │        SecurityCouncil로 긴급 중단 →                          │
│  │        V1 재활성화 (unpause)                                  │
│  │        ※ V2에 이미 배분된 vTON은 유지                         │
│  └─ NO ─▶                                                       │
│                                                                  │
│  Phase 4 (V1 비활성화) 후 V2 문제?                               │
│  ├─ SecurityCouncil 대응 가능? → 긴급 조치 실행                   │
│  │   (프로토콜 pause, 악의적 제안 취소)                            │
│  ├─ V1 재활성화 필요? → Gnosis Safe로 V1 unpause               │
│  │   (V2 컨트랙트는 별도이므로 V1 상태 무결)                       │
│  └─ 완전 복구 불가? → 새 컨트랙트 배포 + 스냅샷 복원               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 8.2 핵심 안전장치

```
1. V1 즉시 복구 가능
   ─────────────────
   V2 컨트랙트는 V1과 완전히 독립적
   → V1 pause 해제만으로 즉시 V1 복구 가능

2. V2 긴급 중단
   ────────────
   SecurityCouncil → pauseProtocol()
   → 2/3 승인으로 V2 프로토콜 즉시 중단

3. 자금 안전
   ────────
   V1 DAOVault 자금은 Phase 4까지 이동하지 않음
   → V2에 문제 발생해도 V1 자금 안전

4. 점진적 이전
   ──────────
   한 번에 모든 것을 이전하지 않고
   단계적으로 권한과 자금을 V2로 이전
```

---

## 9. 부록: 주소 및 파라미터

### 9.1 V1 Mainnet 주소

| 컨트랙트 | 주소 |
|----------|------|
| DAOCommitteeProxy | `0xDD9f0cCc044B0781289Ee318e5971b0139602C26` |
| DAOCommitteeProxy2 | `0x9e7f54eff4a4d35097e0acb6994a723f1a28368c` |
| DAOCommittee_V1 | `0x9050af1638f379a018737880ad946cdda9101a25` |
| DAOCommitteeOwner | `0xcb9859dc0fbeca68efff2bce289150513fdf7d92` |
| DAOAgendaManager | `0xcD4421d082752f363E1687544a09d5112cD4f484` |
| DAOVault | `0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303` |
| TON Token | `0x2be5e8c109e2197D077D13A82dAead6a9b3433C5` |
| WTON Token | `0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2` |
| SeigManager | `0x0b55a0f463b6defb81c6063973763951712d0e5f` |
| Admin Multisig | `0xE3F72E959834d0A72aFb2ea79F5ec2b4243d2d95` |

### 9.2 V2 거버넌스 파라미터

| 파라미터 | 값 | 최소값 | 비고 |
|----------|-----|--------|------|
| `MAX_SUPPLY` | 100,000,000 vTON | — | 하드 캡 (상수) |
| `EPOCH_SIZE` | 5,000,000 vTON | — | 반감기 단위 (상수) |
| `DECAY_RATE` | 0.75 (75%) | — | 에폭당 감소율 (상수) |
| `emissionRatio` | 100% (초기) | 0% | DAO 조정 가능 |
| `proposalCreationCost` | 10 TON | 0 | burn |
| `proposalThreshold` | 0.25% (25 bp) | 0 (제한 없음) | 제안 최소 요건 |
| `quorum` | 4% (400 bp) | 1 bp | 정족수 |
| `passRate` | >50% (5,000 bp) | 1 bp | 통과 기준 |
| `votingDelay` | 7,200 blocks (~1일) | 1,800 blocks (~6시간) | 투표 대기 |
| `votingPeriod` | 50,400 blocks (~7일) | 7,200 blocks (~1일) | 투표 기간 |
| `maturityPeriod` | 50,400 blocks (~7일) | 7,200 blocks (~1일) 또는 0 | 위임 성숙 기간 (0=비활성) |
| `timelockDelay` | 7 days | 7 days | 실행 지연 |
| `gracePeriod` | 14 days | 1 day | 실행 유예 |
| `MINIMUM_DELAY` | 7 days | — | Timelock 최소 (상수) |
| `MAXIMUM_DELAY` | 30 days | — | Timelock 최대 (상수) |
| `SC threshold` | ceil(members × 2/3) | — | 보안위원회 승인 기준 |
| `ACTION_TTL` | 7 days | — | SC 행동 만료 (상수) |

### 9.3 V1 거버넌스 현황 (마이그레이션 시점 참조)

| 항목 | 값 |
|------|-----|
| Committee 멤버 수 | 3 |
| 최대 멤버 수 | 3 |
| 등록 Candidate 수 | 13 |
| 총 생성 Agenda 수 | 16 |
| Quorum | 2 |
| 알림 기간 | 16일 |
| 투표 기간 | 2일 |
| 실행 기간 | 7일 |
| 의제 생성 비용 | 10 TON |

---

## 변경 이력

| 날짜 | 버전 | 내용 |
|------|------|------|
| 2026-03-04 | 0.1.0 | 초안 작성 |
| 2026-03-04 | 0.2.0 | 생성자 시그니처, 소유권 이전 대상, MINIMUM_DELAY 수정 |
| 2026-03-04 | 0.3.0 | protocolTarget 명시, Ownable 구분표, deployer 잔여 권한, autoExpiryPeriod, 파라미터 최소값 추가 |
| 2026-03-05 | 0.4.0 | pauseGuardian 추가 (SC가 Timelock 경유 없이 즉시 pause/unpause 가능), Phase 2 TX 추가, 소유권 다이어그램 업데이트 |
| 2026-03-05 | 0.1.4 | SC 자기방어 우회 경로 문서화 (Timelock 직접 취소 우회, CR-04 추가) |
