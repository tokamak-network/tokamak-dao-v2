# Tokamak DAO v2 — 인수인계 문서 (Handover)

> **작성일**: 2026-07-06
> **목적**: 사업 종료에 따른 프로젝트 인수인계. 이 문서는 저장소 전체의 **진입점(인덱스)**입니다.
> 상세 내용은 각 링크된 문서에 있으며, 여기서는 "무엇을, 어떤 순서로 봐야 하는지"를 안내합니다.

---

## 1. 프로젝트 한 줄 요약

Tokamak Network의 DAO 거버넌스를 **V1(Committee 기반, 3인 고정 위원회)**에서
**V2(Delegation 기반, vTON 토큰 위임 투표)**로 전환하는 프로젝트입니다.

- **스마트 컨트랙트**: Foundry 프로젝트 (`contracts/`) — vTON, DelegateRegistry, DAOGovernor, SecurityCouncil, Timelock
- **웹앱**: Next.js 15 + React 18 + Wagmi/Viem (`src/`) — 제안 생성/투표/위임 UI, AI 에이전트, 샌드박스 데모
- **인덱싱**: The Graph 서브그래프 (`subgraph/`)

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
- [docs/design-spec.md](docs/design-spec.md) — 프론트엔드 디자인 시스템 (프론트 작업 시 필독)
- [docs/vote-relay-fund.md](docs/vote-relay-fund.md) — AI 에이전트 투표 릴레이 구조와 개선안
- [docs/telegram-notifications.md](docs/telegram-notifications.md) — 제안 생성 시 Telegram 알림 기능

## 4. 개발 환경

### 로컬 (Chain ID 1337)

```bash
npm install
npm run anvil                      # 터미널 1: 로컬 체인
npm run faucet -- <주소>            # 테스트 TON/ETH 지급
npm run contracts:deploy:local     # V2 컨트랙트 배포
npm run dev                        # 터미널 2: 웹앱 (localhost:3000)
npm run time-travel -- 1h          # 투표 기간 등 시간 스킵
```

로컬에서는 Voting Delay / Voting Period / Timelock Delay가 각 **1시간**으로 단축되어 있습니다.

### 컨트랙트

```bash
cd contracts && forge build && forge test
```

- 마이그레이션 전체 시뮬레이션: `contracts/script/MigrationSimulation.s.sol` (V1 목 컨트랙트 → V2 전환 생명주기 재현)
- V1 목 컨트랙트: `contracts/src/migration/`

### 샌드박스 데모 (Fly.io, Chain ID 13374)

체험용 임시 체인. Fly.io Machines에서 Anvil을 띄우고, 웹앱의 `/api/sandbox/rpc` 프록시를 통해 접근합니다.

- 백엔드: `src/app/api/sandbox/lib/fly.ts`
- Fly 앱: `tokamak-dao-demo` (도쿄 `nrt`), 머신은 2시간 후 자동 파괴
- Wagmi 읽기와 MetaMask 쓰기 모두 단일 프록시(`/api/sandbox/rpc`) 경유
- deploy-data 재생성: `scripts/setup-sandbox-deploy-data.sh`
- **주의**: MetaMask는 등록된 체인의 RPC URL을 갱신하지 않음 → RPC URL이 바뀌면 체인 ID를 올려야 함 (13371→13374 이력)

## 5. 배포 현황

- **Sepolia 테스트넷**: [contracts/deployments.md](contracts/deployments.md) — vTON, DelegateRegistry, Timelock, DAOGovernor, SecurityCouncil 주소
- **메인넷**: V2 미배포. V1 메인넷 주소는 [docs/migration-v1-to-v2.md 9.1절](docs/migration-v1-to-v2.md) 및 [docs/v1-architecture.md](docs/v1-architecture.md) 참고
- **웹앱**: Vercel 배포 (Next.js)
- **서브그래프**: The Graph Studio `tokamak-dao-v-2-sepolia` (`npm run subgraph:deploy`)

## 6. 외부 서비스 / 인수인계 시 필요한 접근 권한

| 서비스 | 용도 | 위치/식별자 |
|--------|------|------------|
| Vercel | 웹앱 호스팅 | 이 저장소 연결 프로젝트 |
| Fly.io | 샌드박스 Anvil 머신 | 앱 `tokamak-dao-demo` (API 토큰 필요) |
| Supabase | AI 에이전트 데이터 (agents, agent_profiles 등) | 스키마: `sql/` 디렉토리 |
| The Graph Studio | 이벤트 인덱싱 | `tokamak-dao-v-2-sepolia` |
| Pinata | IPFS 업로드 (`src/app/api/pinata`) | API 키 필요 |
| Telegram Bot | 제안 알림 | [docs/telegram-notifications.md](docs/telegram-notifications.md) |
| Sepolia deployer | 테스트넷 배포 계정 | `0x488f3660FCD32099F2A250633822a6fbF6Eb771B` |

환경변수는 Vercel 프로젝트 설정 및 `.env.local`(비공개)에 있습니다. 인수인계 시 각 서비스의 소유권 이전 또는 키 재발급이 필요합니다.

## 7. 알아둘 것 / 잔여 이슈

1. **라이브 투표력의 잔여 위험**: 2026-03에 스냅샷 투표와 maturityPeriod를 제거하고 투표 시점 위임량을 그대로 가중치로 쓰는 방식으로 전환했습니다. vTON 차입(대여) 시장이 형성되면 flash-loan성 투표 조작 위험이 다시 생기므로, 메인넷 진행 시 재검토가 필요합니다 (migration 가이드 6.3절 참고).
2. **burnRate는 ABI 호환용 잔재**: `DAOGovernor.propose`의 `burnRate` 파라미터는 기능이 제거되어 0 이외 값은 revert합니다 (스펙 0.1.3).
3. **SecurityCouncil은 Veto+Pause 전용**: 임의 실행/긴급 업그레이드 권한 없음. 권한 유효기간 12개월, 만료 시 누구나 `expireCouncil()` 호출 가능 (스펙 0.1.4).
4. **문서-코드 동기화**: 코드가 진실의 원천입니다. `contract-spec.md`와 마이그레이션 가이드는 2026-07-06 기준 코드와 일치하도록 갱신되었습니다.
5. **`@tokamak-ecosystem/dao-action-builder`**: DAO 제안 액션 빌더 패키지 의존성 — 버전 확인 후 사용 (CLAUDE.md 참고).

## 8. 저장소 구조

```
├── HANDOVER.md              ← 이 문서
├── CLAUDE.md                ← AI 어시스턴트용 프로젝트 규칙
├── contracts/               ← Foundry 프로젝트
│   ├── contract-spec.md     ← V2 컨트랙트 명세 (필독)
│   ├── deployments.md       ← 배포 주소
│   ├── src/                 ← V2 컨트랙트 + migration/ (V1 목)
│   ├── script/              ← 배포·마이그레이션 시뮬레이션 스크립트
│   └── test/                ← Foundry 테스트
├── src/                     ← Next.js 웹앱 (App Router)
│   └── app/api/             ← sandbox(Fly.io), agents(AI), migration, pinata 등
├── subgraph/                ← The Graph 서브그래프
├── sql/                     ← Supabase 스키마/마이그레이션
├── docs/                    ← 문서 (3절 문서 지도 참고)
└── scripts/                 ← 유틸리티 스크립트
```
