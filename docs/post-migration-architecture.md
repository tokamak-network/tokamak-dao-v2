# Post-Migration Contract Architecture

> V1 → V2 마이그레이션 완료 후 전체 컨트랙트 구조

---

## 1. 마이그레이션 전후 전체 비교

```
┌─ 마이그레이션 전 (V1 단독) ────────────────────────────────────────────┐
│                                                                        │
│   Gnosis Safe (2/3)                                                    │
│        │                                                               │
│        ▼                                                               │
│   DAOCommitteeProxy ──▶ DAOCommitteeProxy2 (selector router)          │
│        │                  ├─▶ DAOCommittee_V1 (Impl A, default)       │
│        │                  └─▶ DAOCommitteeOwner (Impl B, 4 selectors) │
│        │                                                               │
│        ├──▶ DAOAgendaManager (의제 관리)                                │
│        ├──▶ DAOVault (재무, TON/WTON 보관)                              │
│        ├──▶ CandidateFactory ──▶ Candidate[] (L2 운영자 프록시)         │
│        ├──▶ SeigManager (시뇨리지)                                      │
│        └──▶ Layer2Registry (L2 등록)                                    │
│                                                                        │
│   TON ─── 의제 생성 비용 (10 TON burn)                                  │
│   WTON ── 스테이킹 입금                                                 │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘


┌─ 마이그레이션 후 (V2 + V1 잔존) ──────────────────────────────────────┐
│                                                                        │
│   ┌─ V2 거버넌스 (신규) ────────────────────────────────────────────┐  │
│   │                                                                  │  │
│   │   SecurityCouncil (2/3) ──┬── Governor.cancel()  [veto]        │  │
│   │                           └── Governor.pause()   [pause]       │  │
│   │                                                                  │  │
│   │   DelegateRegistry ◀── vTON 위임                                │  │
│   │        │                                                         │  │
│   │        ▼                                                         │  │
│   │   DAOGovernor ── propose/vote/queue/execute                     │  │
│   │        │                                                         │  │
│   │        ▼                                                         │  │
│   │   Timelock (admin=self) ─── 7일 지연 실행                        │  │
│   │        │                                                         │  │
│   │        ├── owns vTON                                             │  │
│   │        ├── owns DelegateRegistry                                 │  │
│   │        └── owns DAOGovernor                                      │  │
│   │                                                                  │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│   ┌─ V1 잔존 컨트랙트 ──────────────────────────────────────────────┐  │
│   │                                                                  │  │
│   │   TON ──── 제안 생성 비용 (10 TON burn, V2에서 계속 사용)        │  │
│   │   WTON ─── 스테이킹 레이어 (독립 운영)                           │  │
│   │   SeigManager ─── 시뇨리지 + vTON 민터                          │  │
│   │   Layer2Registry ── L2 운영자 정보 (참조용)                      │  │
│   │   DAOVault ──── 재무 (TON/WTON 보관, owner: Timelock)           │  │
│   │                                                                  │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│   ┌─ V1 비활성화 (Phase 4) ─────────────────────────────────────────┐  │
│   │                                                                  │  │
│   │   DAOCommitteeProxy ──── pauseProxy = true (정지됨)             │  │
│   │   DAOAgendaManager ───── 사용 안 함                              │  │
│   │   CandidateFactory ───── 사용 안 함                              │  │
│   │   Candidate[] ────────── 사용 안 함                              │  │
│   │                                                                  │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 컨트랙트별 상태 변화

### 2.1 V2 신규 컨트랙트

| 컨트랙트 | Owner/Admin | 업그레이드 | 역할 |
|---------|-------------|-----------|------|
| vTON | Timelock | 불가 | 거버넌스 토큰 (ERC20Votes + Ownable2Step) |
| DelegateRegistry | Timelock | 불가 | 위임자 등록 및 위임 관리 |
| DAOGovernor | Timelock | 불가 | 제안·투표·실행 + Pausable |
| Timelock | self | 불가 | 실행 지연 (7일) |
| SecurityCouncil | DAO (거버넌스 제안) | 불가 | Veto + Pause (2/3 승인) |

### 2.2 V1 유지 컨트랙트

| 컨트랙트 | 마이그레이션 전 관리자 | 마이그레이션 후 관리자 | 역할 변화 |
|---------|------------------|------------------|----------|
| TON | 독립 | 독립 (변경 없음) | V2 제안 비용 (10 TON burn) |
| WTON | 스테이킹 레이어 | 변경 없음 | 스테이킹 입금/출금 |
| SeigManager | DAOCommitteeProxy | 변경 없음 | 시뇨리지 + **vTON 민터** |
| Layer2Registry | DAOCommitteeProxy | 변경 없음 | L2 운영자 정보 참조 |
| DAOVault | DAOCommitteeProxy | Timelock | 재무 관리 (TON/WTON 보관, 거버넌스 제안으로 인출) |

### 2.3 V1 비활성화 컨트랙트

| 컨트랙트 | 최종 상태 | V2 대체 |
|---------|----------|---------|
| DAOCommitteeProxy | pauseProxy = true | DAOGovernor |
| DAOCommitteeProxy2 | 프록시 정지로 접근 불가 | — |
| DAOCommittee_V1 | 구현체, 호출 불가 | — |
| DAOCommitteeOwner | 구현체, 호출 불가 | — |
| DAOAgendaManager | 사용 안 함 | DAOGovernor 내 제안 관리 |
| CandidateFactory | 사용 안 함 | DelegateRegistry |
| Candidate[] | 사용 안 함 | DelegateRegistry |

---

## 3. 소유권·권한 구조

### 3.1 마이그레이션 전 (V1)

```
Gnosis Safe (2/3 multisig)
  │
  ├── DEFAULT_ADMIN_ROLE ──▶ DAOCommitteeProxy
  │                            ├── upgradeTo() 가능
  │                            ├── pauseProxy 설정 가능
  │                            ├── DAOAgendaManager 관리
  │                            ├── DAOVault 자금 인출 (의제 실행)
  │                            ├── CandidateFactory 관리
  │                            ├── SeigManager 파라미터 변경 (의제 실행)
  │                            └── Layer2Registry 관리 (의제 실행)
  │
  └── 직접 제어
       └── 긴급 시 pauseProxy = true

Committee 멤버 (3명)
  └── castVote, executeAgenda (의제 실행)
```

### 3.2 마이그레이션 후 (V2)

```
Timelock (admin = self)
  │
  ├── owner ──▶ vTON
  │              ├── setMinter()
  │              └── setEmissionRatio()
  │
  ├── owner ──▶ DelegateRegistry
  │              ├── setAutoExpiryPeriod()
  │              └── setGovernor()
  │
  ├── owner ──▶ DAOGovernor
  │              ├── setQuorum(), setPassRate() ...
  │              ├── setProposalGuardian()
  │              ├── setPauseGuardian()
  │              └── pause() / unpause()
  │
  └── owner ──▶ DAOVault
               ├── claimTON() / claimWTON() / claimERC20()
               └── 재무 관리 (거버넌스 제안으로 인출)

SecurityCouncil (3명, 2/3 승인)
  │
  ├── proposalGuardian ──▶ DAOGovernor.cancel()
  │                         (자기방어 제한 적용)
  │
  └── pauseGuardian ──▶ DAOGovernor.pause() / unpause()
                         (직접 호출, Timelock 불필요)

Gnosis Safe (V1 잔존)
  └── DAOCommitteeProxy pauseProxy 제어 (V1 비상 복구용)
```

---

## 4. V1 ↔ V2 연결점

마이그레이션 후 V1과 V2는 거의 독립적으로 운영되지만, 두 가지 연결점이 존재한다.

### 4.1 TON Token (제안 비용)

```
V1: TON ── approveAndCall(10 TON) ──▶ DAOCommitteeProxy (의제 생성, burn)
V2: TON ── transferFrom(10 TON)   ──▶ DAOGovernor (제안 생성, burn to 0xdead)
```

V1과 V2 모두 동일한 TON 토큰을 제안 비용으로 사용한다. TON 자체는 어느 거버넌스 시스템에도 종속되지 않는 독립 토큰이다.

### 4.2 SeigManager → vTON 민터

```
SeigManager (V1 스테이킹 레이어)
     │
     │ 시뇨리지 발생 시
     │
     ▼
vTON.mint() ── L2 Operator, Validator에게 vTON 발행
     │
     │ halvingRatio × emissionRatio 적용
     │
     ▼
vTON 보유자 ── delegate() ──▶ DelegateRegistry ──▶ 투표력
```

이것이 V1 스테이킹 경제와 V2 거버넌스를 잇는 유일한 브릿지이다. SeigManager는 vTON의 승인된 민터로 등록되어, 시뇨리지 비율에 따라 vTON을 발행한다.

---

## 5. 자금 흐름 변화

### 5.1 마이그레이션 전

```
스테이킹 입금:       사용자 ──▶ WTON ──▶ DepositManager ──▶ SeigManager
시뇨리지 수익:       SeigManager ──▶ Coinage (자동 증가)
DAO 재무:           DAOVault (TON/WTON 보관, 의제 실행으로 인출)
의제 생성 비용:      사용자 ──▶ 10 TON ──▶ address(1) (burn)
```

### 5.2 마이그레이션 후

```
스테이킹 입금:       사용자 ──▶ WTON ──▶ DepositManager ──▶ SeigManager (변경 없음)
시뇨리지 수익:       SeigManager ──▶ Coinage (변경 없음)
vTON 발행:          SeigManager ──▶ vTON.mint() (신규)
DAO 재무:           DAOVault (TON/WTON 보관, 거버넌스 제안으로 인출, owner: Timelock)
제안 생성 비용:      사용자 ──▶ 10 TON ──▶ address(0xdead) (burn)
```

---

## 6. 긴급 상황 대응 경로

### 6.1 V2 거버넌스 긴급 상황

| 시나리오 | 대응 | 소요 시간 |
|---------|------|----------|
| 악의적 제안 통과 | SC → Governor.cancel() | 즉시 |
| 거버넌스 공격 진행 중 | SC → Governor.pause() | 즉시 |
| SC 정상 복구 후 | SC → Governor.unpause() | 즉시 |

### 6.2 V1 잔존 컨트랙트 긴급 상황

| 시나리오 | 대응 | 소요 시간 |
|---------|------|----------|
| V2에 치명적 버그 발견 | Gnosis Safe → V1 unpause → V1 복구 | 즉시 |
| V1 재활성화 필요 | Gnosis Safe → pauseProxy = false | 즉시 |

### 6.3 스테이킹 레이어 긴급 상황

| 시나리오 | 대응 | 소요 시간 |
|---------|------|----------|
| SeigManager 버그 (vTON 과다 발행) | 거버넌스 제안: vTON.setMinter(seigManager, false) | 14일+ |
| | + SC → Governor.pause() (추가 피해 방지) | 즉시 |

---

## 7. 거버넌스 제어 범위 비교

### V1에서 의제로 제어 가능했던 것

```
DAOCommitteeProxy.executeAgenda() ──▶ target.call(data)
  │
  ├── SeigManager 파라미터 변경
  ├── Layer2Registry L2 등록/해제
  ├── DAOVault 자금 인출
  ├── DAOCommitteeProxy 업그레이드 (upgradeTo)
  ├── CandidateFactory 업그레이드
  └── 임의 컨트랙트 호출 (target 제한 없음)
```

### V2에서 거버넌스 제안으로 제어 가능한 것

```
Timelock.executeTransaction() ──▶ target.call(data)
  │
  ├── vTON.setMinter() / setEmissionRatio()
  ├── DelegateRegistry.setAutoExpiryPeriod()
  ├── DAOGovernor 파라미터 변경 (quorum, votingPeriod 등)
  ├── DAOGovernor.setProposalGuardian() / setPauseGuardian()
  ├── SecurityCouncil.addMember() / removeMember() / setThreshold()
  ├── Timelock 자체 파라미터 (setDelay, setPendingAdmin)
  └── 임의 컨트랙트 호출 (target 제한 없음)
```

### 핵심 차이

| | V1 | V2 |
|---|---|---|
| 실행 주체 | Committee 멤버 (3명 투표) | Timelock (거버넌스 제안 통과 후) |
| 실행 지연 | 없음 (의제 통과 즉시 실행) | 7일 Timelock |
| 비상 차단 | Gnosis Safe → pauseProxy | SC → Governor.cancel() / pause() |
| 업그레이드 | 가능 (커스텀 프록시) | 불가 (non-upgradeable) |
| 자금 보관 | DAOVault (별도 컨트랙트) | DAOVault (owner: Timelock, 거버넌스 제안으로 인출) |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-03-06 | 초안 작성 |
