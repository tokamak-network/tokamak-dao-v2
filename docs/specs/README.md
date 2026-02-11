## Governance Specification

The vTON DAO Governance Model specification documents are available in the `docs/specs/` directory.

| Version | Date | Diff |
|---------|----------|--------|
| [0.1.2](./0.1.2/spec.md) | 2026-02-11 | [View](https://www.diffchecker.com/l6VTe6Mj/) |
| [0.1.1](./0.1.1/spec.md) | 2026-02-03 | [View](https://www.diffchecker.com/QtLCN05H/) |
| [0.1.0](./0.1.0/spec.md) | 2026-01-30 |  |

## Changelog

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
