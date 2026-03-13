# vTON DAO Spec 0.1.4 ↔ Contract Implementation Matrix

> Scope: `docs/specs/0.1.4/spec.md` vs current contracts in `contracts/src/*`
>
> Status legend:
> - ✅ Implemented: 스펙 요구사항이 코드로 확인됨
> - ⚠️ Partial: 방향은 맞지만 제약/세부조건이 일부 누락되거나 다름
> - ❌ Missing/Not Aligned: 스펙 요구사항과 현재 코드가 불일치

## 1) Token (vTON)

| Spec item | Target contract/function | Status | Notes |
|---|---|---:|---|
| MAX_SUPPLY 100M cap | `token/vTON.sol::MAX_SUPPLY`, `mint()` | ✅ | 상한 도달 시 cap 적용 |
| Epoch halving (5M epoch, 25% decay) | `vTON.sol::EPOCH_SIZE`, `DECAY_RATE`, `_calculateHalvingRatio()` | ✅ | 스펙과 상수 일치 |
| emissionRatio (0~1) | `vTON.sol::emissionRatio`, `setEmissionRatio()` | ✅ | owner 조정 가능 |
| Tradeable token | `ERC20` 상속 | ✅ | 전송 가능 |
| Delegation via DelegateRegistry (not ERC20Votes direct) | `vTON.sol::delegate()/delegateBySig()` revert | ✅ | 직접 delegate 차단 |

## 2) Delegation & Voting Power

| Spec item | Target contract/function | Status | Notes |
|---|---|---:|---|
| Delegate 등록 프로필(이름/소개/철학) | `governance/DelegateRegistry.sol::registerDelegate()` | ⚠️ | profile/philosophy/interests는 있으나 Address/ENS 별도 필드 없음 |
| vTON holder는 delegate 경유로만 투표 | `DAOGovernor.sol::_getVotingWeight()` + `DelegateRegistry` | ✅ | governor가 registry 기준 투표력 사용 |
| 위임 재설정(undelegate/redelegate) | `DelegateRegistry.sol::undelegate()/redelegate()` | ✅ | 온체인 구현 확인 |
| 위임 즉시/스냅샷 투표력 | `DelegateRegistry` checkpoints + governor snapshot block | ✅ | maturityPeriod 고려 스냅샷 |

## 3) Proposal & Voting Lifecycle

| Spec item | Target contract/function | Status | Notes |
|---|---|---:|---|
| Proposal threshold 0.25% (balance + delegated) | `DAOGovernor.sol::proposalThreshold`, `propose()` | ✅ | BPS(25)로 반영 |
| Proposal creation cost 10 TON burn | `DAOGovernor.sol::proposalCreationCost`, `propose()` | ✅ | `0xdead`로 전송(소각 처리) |
| Voting Delay 1d / Voting Period 7d | `DAOGovernor.sol::DEFAULT_VOTING_DELAY`, `DEFAULT_VOTING_PERIOD` | ✅ | 블록 기반 기본값 반영 |
| Quorum 4% | `DAOGovernor.sol::DEFAULT_QUORUM` | ✅ | snapshot 기준 계산 |
| Pass rate 과반 | `DAOGovernor.sol::passRate`, `state()` | ✅ | `forPercentage > passRate` |
| Timelock delay 7d / grace 14d | `Timelock.sol::MINIMUM_DELAY`, `GRACE_PERIOD`; `DAOGovernor` queue/execute | ✅ | 현재 기본 파라미터 일치 |
| RFC→Snapshot(오프체인)→온체인 단계 | process/doc only | ⚠️ | 온체인 컨트랙트 범위 밖(운영 프로세스 필요) |

## 4) Security Council (0.1.4 핵심)

| Spec item | Target contract/function | Status | Notes |
|---|---|---:|---|
| Veto + Pause only | `SecurityCouncil.sol::cancelProposal()/pauseProtocol()/unpauseProtocol()` | ✅ | 인터페이스/구현 모두 3기능 중심 |
| SC cancel must go through `DAOGovernor.cancel()` | `SecurityCouncil.sol::cancelProposal()` | ✅ | governor call만 생성 |
| Timelock direct cancel 권한 제거 | `Timelock.sol::cancelTransaction()` onlyGovernor | ✅ | SC 직접 취소 불가 |
| SC self-defense restriction (SC 대상 제안 취소 금지) | expected in `DAOGovernor.cancel()` path | ❌ | 현재 target 검증 로직 부재 (제안 타겟에 SC 포함 여부 미검사) |
| SC validity 12 months + permissionless expiry | expected in SC state & checks | ❌ | 만료 타임스탬프/권한 소멸 트리거 없음 |

## 5) Governance Parameter Control

| Spec item | Target contract/function | Status | Notes |
|---|---|---:|---|
| emissionRatio, threshold, quorum, delay, period, passRate tunable | `DAOGovernor` setter + `vTON.setEmissionRatio()` | ✅ | setter 존재 |
| 파라미터 변경은 DAO 거버넌스 경유 | ownership/admin wiring | ⚠️ | 컨트랙트는 `onlyOwner` 기반, 배포 시 owner=Timelock 강제 확인 필요 |

## 6) Spec-change drift check (important)

| Spec 0.1.4 intent | Current code | Status | Notes |
|---|---|---:|---|
| Proportional burn 제거(0.1.3) | `propose(..., burnRate)` + vote 시 `burnFromDelegate` | ❌ | 코드에 burn 메커니즘 잔존 |

## 7) Immediate action items (priority)

1. **P0:** SC self-defense 제한 온체인 강제 추가 (cancel path에서 SC 대상 proposal 차단)
2. **P0:** SC 권한 만료(12개월) + permissionless expiry 함수 추가
3. **P1:** `burnRate`/vote burn 로직 제거 여부를 스펙(0.1.4)과 정합화
4. **P1:** 배포 설정에서 owner/admin이 Timelock으로 귀속되는지 스크립트/문서로 고정
5. **P2:** 오프체인 RFC/Snapshot 단계에 대한 운영 runbook 문서화

---

## Reference files checked

- `contracts/src/token/vTON.sol`
- `contracts/src/governance/DelegateRegistry.sol`
- `contracts/src/governance/DAOGovernor.sol`
- `contracts/src/governance/SecurityCouncil.sol`
- `contracts/src/governance/Timelock.sol`
- `docs/specs/0.1.4/spec.md`
