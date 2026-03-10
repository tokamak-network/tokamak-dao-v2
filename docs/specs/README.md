## Governance Specification

The vTON DAO Governance Model specification documents are available in the `docs/specs/` directory.

| Version | Date | Diff |
|---------|----------|--------|
| [0.1.4](./0.1.4/spec.md) | 2026-03-06 | |
| [0.1.3](./0.1.3/spec.md) | 2026-03-03 | [View](https://www.diffchecker.com/W83j3k91/) |
| [0.1.2](./0.1.2/spec.md) | 2026-02-11 | [View](https://www.diffchecker.com/l6VTe6Mj/) |
| [0.1.1](./0.1.1/spec.md) | 2026-02-03 | [View](https://www.diffchecker.com/QtLCN05H/) |
| [0.1.0](./0.1.0/spec.md) | 2026-01-30 |  |

## Changelog

### 0.1.4 (2026-03-06)

**Changed:**
- Security Council 권한 모델: Veto(제안 취소) + Pause(일시정지) 전용으로 축소. Direct Execution(임의 트랜잭션 실행, 긴급 업그레이드) 권한 제거
- SC의 제안 취소는 반드시 DAOGovernor.cancel()을 경유하도록 제한. Timelock 직접 cancelTransaction() 권한 제거
- 자기방어 제한을 온체인 강제로 명시: SC는 자기 자신을 대상으로 하는 제안을 취소할 수 없음

**Added:**
- SC 권한 유효기간(12개월) 및 permissionless 만료 메커니즘 (Compound/ENS 패턴)
- Veto-Only 원칙의 근거: 침해 시 피해 범위, SC 규모 비례 권한, 프로토콜 특성, 선례

**Removed:**
- 긴급 업그레이드 권한 (non-upgradeable 컨트랙트이므로 불필요)
- Custom emergency action (임의 실행 권한)
- Timelock 직접 취소 권한

### 0.1.3 (2026-03-03)

**Removed:**
- Proportional Burn mechanism (Section 2.5): Removed the optional burn rate feature that allowed proposers to set a vTON burn rate (0–100%) when creating proposals

### 0.1.2 (2026-02-11)

**Changed:**
- Issuance model: Replaced infinite issuance with max supply cap (100M vTON) and epoch-based halving mechanism (25% decay per 5M vTON epoch)
- Emission ratio parameter renamed to `emissionRatio`, now applies independently of halving ratio (actual issuance = requested amount × halvingRatio × emissionRatio)

**Added:**
- Halving constants: MAX_SUPPLY (100M), EPOCH_SIZE (5M), DECAY_RATE (0.75), INITIAL_HALVING_RATE (1.0), MAX_EPOCHS (20)
- Issuance formula with epoch calculation and boundary handling rules

### 0.1.1 (2026-02-03)

**Added:**
- Proportional burn mechanism: Proposer can optionally set burn rate (0-100%) when creating proposals

**Changed:**
- Proposal threshold: Now includes delegated vTON (balance + delegated >= 0.25% of total supply)

### 0.1.0 (2026-01-30)

**Added:**
- Initial implementation
