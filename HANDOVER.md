# Tokamak DAO v2 — 인수인계 문서 (Handover)

> **작성일**: 2026-07-06
> **목적**: 사업 종료에 따른 프로젝트 인수인계. 이 문서는 저장소 전체의 **진입점(인덱스)**입니다.
> 상세 내용은 각 링크된 문서에 있으며, 여기서는 "무엇을, 어떤 순서로 봐야 하는지"를 안내합니다.
>
> ⚠️ **2026-07-06 저장소 슬림화**: 인수인계 결정에 따라 Next.js 웹앱(`src/`, `public/`),
> The Graph 서브그래프(`subgraph/`), Supabase 스키마(`sql/`) 등 웹 서비스 코드를 모두 제거하고
> **스마트 컨트랙트(`contracts/`)와 문서(`docs/`)만 남겼습니다**. 제거된 코드는 git 히스토리에서
> 복구할 수 있습니다 (`git log --oneline -- src/` 등). 이 문서의 6절(외부 서비스)은 과거 운영
> 기록으로 남겨둡니다.

---

## 1. 프로젝트 한 줄 요약

Tokamak Network의 DAO 거버넌스를 **V1(Committee 기반, 3인 고정 위원회)**에서
**V2(Delegation 기반, vTON 토큰 위임 투표)**로 전환하는 프로젝트입니다.

- **스마트 컨트랙트**: Foundry 프로젝트 (`contracts/`) — vTON, DelegateRegistry, DAOGovernor, SecurityCouncil, Timelock (+ VoteRelayFund, V1 목 컨트랙트)
- ~~**웹앱**: Next.js 15 + React 18 + Wagmi/Viem~~ — 2026-07 제거, git 히스토리에 보존
- ~~**인덱싱**: The Graph 서브그래프~~ — 2026-07 제거, git 히스토리에 보존

## 2. V1 → V2 핵심 변경 요약

| 항목 | V1 | V2 |
|------|----|----|
| 거버넌스 모델 | Committee (3인 고정) | Delegation (무제한 위임) |
| 투표 단위 | 1인 1표 | 위임된 vTON 비례 |
| 투표 토큰 | 없음 (스테이킹 기반 자격) | vTON (100M 상한 + 에폭 반감기) |
| 투표력 산정 | 첫 투표 시점 고정 | **투표 시점 라이브 위임량** (스냅샷 없음) |
| 정족수 | 2/3 (멤버 기준) | 4% (제안 생성 시점 총 위임량 기준으로 고정) |
| Timelock | 없음 | 7일 지연 + 14일 유예 |
| 비상 대응 | Gnosis Safe 멀티시그 | SecurityCouncil (Veto+Pause 전용, 12개월 유효기간) |

> 상세: [docs/migration-v1-to-v2.md](docs/migration-v1-to-v2.md) (컨트랙트 매핑, 실행 계획, 보안 체크리스트, 롤백 전략 포함)

## 3. 문서 지도 (권장 읽기 순서)

| 순서 | 문서 | 내용 |
|------|------|------|
| 1 | 이 문서 (HANDOVER.md) | 전체 개요와 진입점 |
| 2 | [docs/v1-architecture.md](docs/v1-architecture.md) | V1 구조 전체 (프록시, Agenda 생명주기, 메인넷 주소, V2 관점 의존성/리스크) |
| 3 | [docs/v2-contracts-guide.md](docs/v2-contracts-guide.md) | **V2 컨트랙트 입문 가이드** (비유 중심 — 처음이라면 여기부터) |
| 4 | [contracts/contract-spec.md](contracts/contract-spec.md) | **V2 컨트랙트 명세** (함수/이벤트/파라미터 — 웹앱 연동 기준 문서) |
| 5 | [docs/migration-v1-to-v2.md](docs/migration-v1-to-v2.md) | **V1→V2 마이그레이션 가이드** (Phase 1~4 실행 계획, 보안, 테스트, 롤백) |
| 6 | [docs/post-migration-architecture.md](docs/post-migration-architecture.md) | 마이그레이션 후 소유권·자금 흐름·V1↔V2 연결점 |
| 7 | [docs/specs/README.md](docs/specs/README.md) | 거버넌스 스펙 (최신 0.1.4) + 버전별 변경 이력 |
| 8 | [docs/protocol-parameters.md](docs/protocol-parameters.md) | 프로토콜 파라미터 정리 |
| 9 | docs/research/ | 설계 근거 리서치 (SC 개입 모델, vTON 초기 배분/발행 제어) |

**시각 자료 (브라우저로 열기):**
- [docs/v1-vs-v2-architecture.html](docs/v1-vs-v2-architecture.html) — V1/V2 아키텍처 비교
- [docs/migration-presentation.html](docs/migration-presentation.html) — 마이그레이션 발표 슬라이드

**기능별 문서:**
- [docs/vote-relay-fund.md](docs/vote-relay-fund.md) — AI 에이전트 투표 릴레이 구조와 개선안 (백엔드/프론트는 제거됨, VoteRelayFund 컨트랙트 설명은 유효)

> 프론트엔드 전용 문서(design-spec.md, telegram-notifications.md)는 웹앱 제거와 함께 삭제되었습니다 (git 히스토리 참고).

## 4. 개발 환경

Foundry만 있으면 됩니다 (`foundryup`으로 설치). Node.js 불필요.

```bash
cd contracts && forge build && forge test
```

### 로컬 체인 (Chain ID 1337)

```bash
./contracts/scripts/start-anvil.sh          # 터미널 1: 로컬 체인
./contracts/scripts/faucet-local.sh <주소>   # 테스트 TON/ETH 지급
./contracts/scripts/deploy-local.sh          # V2 컨트랙트 배포
./contracts/scripts/time-travel.sh 1h        # 시간+블록 스킵 (pending/voting/timelock 프리셋 지원)
```

로컬 거버넌스 파라미터: Voting Delay **1시간**(300블록), Voting Period **1일**(7,200블록 = `MIN_VOTING_PERIOD`),
Timelock Delay **7일**(`MINIMUM_DELAY`). 컨트랙트가 강제하는 최소값 때문에 이보다 짧게 설정할 수 없습니다.

- 마이그레이션 전체 시뮬레이션: `contracts/script/MigrationSimulation.s.sol` (V1 목 컨트랙트 → V2 전환 생명주기 재현)
- V1 목 컨트랙트: `contracts/src/migration/`
- Sepolia 배포: `./contracts/scripts/deploy-sepolia.sh`

> 과거에 운영하던 웹앱 개발환경(Next.js)과 샌드박스 데모(Fly.io Machines + Anvil, Chain ID 13374)는
> 코드와 함께 제거되었습니다. 구현이 필요하면 git 히스토리의 `src/app/api/sandbox/`를 참고하세요.

## 5. 배포 현황

- **Sepolia 테스트넷**: [contracts/deployments.md](contracts/deployments.md) — vTON, DelegateRegistry, Timelock, DAOGovernor, SecurityCouncil 주소
- **메인넷**: V2 미배포. V1 메인넷 주소는 [docs/migration-v1-to-v2.md 9.1절](docs/migration-v1-to-v2.md) 및 [docs/v1-architecture.md](docs/v1-architecture.md) 참고
- ~~**웹앱**: Vercel 배포~~ / ~~**서브그래프**: The Graph Studio `tokamak-dao-v-2-sepolia`~~ — 코드 제거됨, 배포·서비스는 해지 대상 (6절 참고)

## 6. 외부 서비스 (과거 운영 기록 — 해지/정리 대상)

웹 서비스 코드가 제거되었으므로 아래 서비스들은 **해지하거나 소유권을 정리**해야 합니다.
스키마·구현은 git 히스토리에서 확인할 수 있습니다.

| 서비스 | 과거 용도 | 위치/식별자 | 조치 |
|--------|----------|------------|------|
| Vercel | 웹앱 호스팅 | 이 저장소 연결 프로젝트 | 프로젝트 삭제 또는 연결 해제 |
| Fly.io | 샌드박스 Anvil 머신 | 앱 `tokamak-dao-demo` | 앱 삭제 (머신은 2시간 자동 파괴형) |
| Supabase | AI 에이전트 데이터 | 스키마: git 히스토리의 `sql/` | 프로젝트 정리/백업 |
| The Graph Studio | 이벤트 인덱싱 | `tokamak-dao-v-2-sepolia` | 서브그래프 정리 |
| Pinata | IPFS 업로드 | API 키 | 키 폐기 |
| Telegram Bot | 제안 알림 | git 히스토리의 `docs/telegram-notifications.md` | 봇 비활성화 |
| Sepolia deployer | 테스트넷 배포 계정 (**유지**) | `0x488f3660FCD32099F2A250633822a6fbF6Eb771B` | 키 인수인계 필요 |

## 7. 알아둘 것 / 잔여 이슈

1. **라이브 투표력의 잔여 위험**: 2026-03에 스냅샷 투표와 maturityPeriod를 제거하고 투표 시점 위임량을 그대로 가중치로 쓰는 방식으로 전환했습니다. vTON 차입(대여) 시장이 형성되면 flash-loan성 투표 조작 위험이 다시 생기므로, 메인넷 진행 시 재검토가 필요합니다 (migration 가이드 6.3절 참고).
2. **burnRate는 ABI 호환용 잔재**: `DAOGovernor.propose`의 `burnRate` 파라미터는 기능이 제거되어 0 이외 값은 revert합니다 (스펙 0.1.3).
3. **SecurityCouncil은 Veto+Pause 전용**: 임의 실행/긴급 업그레이드 권한 없음. 권한 유효기간 12개월, 만료 시 누구나 `expireCouncil()` 호출 가능 (스펙 0.1.4).
4. **문서-코드 동기화**: 코드가 진실의 원천입니다. `contract-spec.md`와 마이그레이션 가이드는 2026-07-06 기준 코드와 일치하도록 갱신되었습니다.
5. **테스트 현황**: 2026-07-06 기준 `forge test` 358개 전체 통과. 스펙 0.1.4 이전에 작성되어 자기방어 제한과 모순되던 가디언 취소 테스트 2개를 스펙에 맞게 수정했습니다.

## 8. 저장소 구조

```
├── HANDOVER.md              ← 이 문서
├── README.md                ← V1/V2 비교 + 시작 가이드
├── CLAUDE.md                ← AI 어시스턴트용 프로젝트 규칙
├── contracts/               ← Foundry 프로젝트
│   ├── contract-spec.md     ← V2 컨트랙트 명세 (필독)
│   ├── deployments.md       ← 배포 주소 (Sepolia)
│   ├── src/                 ← V2 컨트랙트 + migration/ (V1 목)
│   ├── script/              ← 배포·마이그레이션 시뮬레이션 스크립트 (.s.sol)
│   ├── scripts/             ← 셸 헬퍼 (anvil, deploy, faucet, time-travel)
│   └── test/                ← Foundry 테스트 (358개)
└── docs/                    ← 문서 (3절 문서 지도 참고)
```

> 과거 구조(웹앱 `src/`, `subgraph/`, `sql/`, 루트 `scripts/`)는 git 히스토리에서 확인:
> `git log --oneline -- src/` 후 `git show <커밋>:<경로>`
