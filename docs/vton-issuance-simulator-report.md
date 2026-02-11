# vTON Issuance Simulator — 설계 및 구현 보고서

## 1. 배경 및 목적

### 1.1 반감기 메커니즘 도입 배경

vTON은 Tokamak DAO의 거버넌스 투표 토큰이다. 기존에는 무제한 발행이 가능하여 `emissionRatio`를 수동으로 조정하는 방식으로만 공급량을 관리했다. 이는 거버넌스 토큰의 희소성을 보장하지 못하는 구조적 한계가 있었다.

이를 해결하기 위해 **비트코인 반감기 방식의 자동 감소 메커니즘**을 vTON 컨트랙트에 도입했다. TON 대비 vTON 발행 비율이 에폭마다 자동으로 감소하여 거버넌스 토큰의 장기적 희소성을 확보한다.

### 1.2 시뮬레이터 제작 목적

반감기 메커니즘이 컨트랙트에 구현된 이후, **이해관계자들이 메커니즘의 동작을 직관적으로 이해할 수 있는 인터랙티브 도구**의 필요성이 제기되었다. 시뮬레이터는 다음 목적을 충족한다:

- 반감기에 따른 발행량 변화를 실시간으로 체험
- 에폭별 발행 효율 감소를 시각적으로 확인
- emissionRatio 변경에 따른 영향을 즉시 시뮬레이션
- 온체인 트랜잭션 없이 순수 클라이언트 사이드로 동작 (지갑 연결 불필요)

---

## 2. 반감기 메커니즘 확정 설계

시뮬레이터의 기반이 되는 반감기 메커니즘의 확정 파라미터는 다음과 같다.

### 2.1 핵심 상수

| 상수 | 값 | 설명 |
|------|-----|------|
| `MAX_SUPPLY` | 100,000,000 vTON | 최대 총 공급량 |
| `EPOCH_SIZE` | 5,000,000 vTON | 에폭 크기 |
| `DECAY_RATE` | 0.75 (25% 감소) | 에폭당 감소율 |
| `INITIAL_RATE` | 1.0 | 초기 발행 비율 (1 TON = 1 vTON) |
| `MAX_EPOCHS` | 20 | 최대 에폭 수 (100M / 5M) |

### 2.2 발행 공식

```
실제 발행량 = 요청량 × halvingRatio × emissionRatio
halvingRatio = INITIAL_RATE × DECAY_RATE^epoch
epoch = totalSupply / EPOCH_SIZE
```

### 2.3 설계 결정 사항

| 결정 사항 | 채택 내용 | 근거 |
|-----------|-----------|------|
| 에폭 경계 처리 | 비트코인 방식 (민팅 시점의 totalSupply로 에폭 결정, 경계 분할 없음) | 구현 단순성 및 예측 가능성 |
| 이중 비율 적용 | halvingRatio × emissionRatio 이중 적용 | 기존 emissionRatio를 별도 제어 수단으로 보존 |
| 공급량 상한 도달 시 | 남은 양만 발행, `MaxSupplyReached` 에러는 totalSupply ≥ MAX_SUPPLY 시 발생 | 부분 발행 허용으로 사용자 경험 보호 |

---

## 3. 논의 과정

### 3.1 Phase 1 — 반감기 컨트랙트 구현

반감기 메커니즘의 스펙은 사전에 확정된 상태로 제공되었다. 구현 범위:

- **컨트랙트**: `vTON.sol`에 반감기 상수, `mint()` 함수 수정, `getCurrentEpoch()`, `getHalvingRatio()` 함수 추가
- **인터페이스**: `IvTON.sol`에 `EpochTransitioned` 이벤트 및 view 함수 시그니처 추가
- **테스트**: 13개 반감기 테스트 케이스 추가 (에폭 전환, 감소율 계산, 공급 상한, 이중 비율 적용 등)
- **프론트엔드**: 대시보드에 vTON Supply, Halving Ratio, Current Epoch 메트릭 카드 추가

구현 중 `MaxSupplyReached` 에러의 정의 위치에 대한 기술적 판단이 있었다. 인터페이스(`IvTON`)에 정의할 경우 테스트에서 참조 경로 불일치가 발생하여, 기존 패턴(`NotMinter`, `InvalidEmissionRatio` 등이 구체 컨트랙트에 정의)을 따라 `vTON.sol`에 직접 정의하는 방식으로 해결했다.

**결과**: 35개 테스트 중 34개 통과 (1개 실패는 반감기와 무관한 기존 ERC5805 이슈).

### 3.2 Phase 2 — 시뮬레이터 기획

반감기 구현 완료 후, 시뮬레이터 웹앱 제작 요청이 이어졌다.

> "위의 로직을 시뮬레이팅 할 수 있는 webapp도 하나 만들어줄 수 있어요?"

기획 단계에서 다음 사항들이 탐색 및 결정되었다:

#### 3.2.1 라우트 명칭

| 안 | 결과 | 사유 |
|------|------|------|
| `/simulation` | 기각 | 범용적이고 어떤 시뮬레이션인지 불명확 |
| `/vton-issuance-simulator` | **채택** | vTON 발행 시뮬레이터임을 명확히 표현 |

라우트 명칭은 직접 피드백을 통해 확정되었다:

> "/vton-issuance-simulator가 나을 것 같아요."

#### 3.2.2 차트 라이브러리

| 선택지 | 결과 | 사유 |
|--------|------|------|
| CSS/SVG 직접 구현 | 기각 | 시뮬레이션 도구에서 차트는 핵심 기능, 직접 구현은 비효율적 |
| recharts | **채택** | React 생태계에서 가장 널리 사용, 다크모드 호환, 반응형 지원 |

프로젝트에 기존 차트 라이브러리가 없었으므로 신규 의존성 추가가 필요했다.

#### 3.2.3 온체인 vs 오프체인

| 접근 방식 | 결과 | 사유 |
|-----------|------|------|
| 온체인 호출 (vTON 컨트랙트 직접 조회) | 기각 | 지갑 연결 필수, 네트워크 의존성, 상태 변경 불가 |
| **순수 클라이언트 사이드 계산** | **채택** | 지갑 연결 불필요, 즉시 체험 가능, 접근성 최대화 |

시뮬레이터는 교육/이해 도구이므로 실제 트랜잭션이 아닌 동일 로직의 JavaScript 재현으로 충분하다고 판단했다.

#### 3.2.4 시뮬레이터 기능 범위

5개 시각화 요소로 구성을 확정했다:

1. **민팅 시뮬레이터** — 인터랙티브 입력 + 상태 표시 + 히스토리 테이블
2. **에폭별 반감기 테이블** — 20개 에폭의 정적 데이터 (현재 에폭 하이라이트)
3. **공급량 진행 바** — MAX_SUPPLY 대비 현재 공급량, 에폭 경계선 마커
4. **공급 곡선 차트** — 누적 raw TON 대비 실제 vTON 공급량 (AreaChart)
5. **반감비율 차트** — 에폭별 계단식 감소 시각화 (LineChart)

### 3.3 Phase 3 — 구현 및 성능 최적화

시뮬레이터 구현 후 Mint 버튼 반응 속도 이슈가 보고되었다.

> "잘 됩니다. 그런데 Mint를 누르면 반응이 좀 느린 것 같네요."

성능 병목 분석 및 2차례 최적화를 수행했다.

#### Round 1 최적화

| 병목 원인 | 해결 방법 |
|-----------|-----------|
| `generateSupplyCurve()` 매 렌더 재계산 | 모듈 레벨 상수로 1회만 계산 (`CURVE_DATA`) |
| `generateEpochTable()` 매 렌더 재계산 | 모듈 레벨 상수로 1회만 계산 (`EPOCH_ROWS`) |
| SupplyChart merge 로직 O(n×m) | O(n+m) 선형 merge로 교체 |
| recharts 애니메이션 매 업데이트 재실행 | `isAnimationActive={false}` 비활성화 |
| `history.map()` 매 렌더 새 배열 참조 | `useMemo`로 참조 안정화 |
| 차트 컴포넌트 불필요 리렌더 | `React.memo` 적용 (3개 컴포넌트) |

#### Round 2 최적화

| 병목 원인 | 해결 방법 |
|-----------|-----------|
| recharts SVG 재계산이 메인 스레드 블로킹 | `useDeferredValue`로 차트 업데이트를 저우선순위로 분리 |

최종 구조:
- **MintSimulator** (상태, 히스토리, 프로그레스 바) → 즉시 업데이트
- **차트 2개 + 에폭 테이블** → deferred 업데이트 (stale 상태 시 opacity 시각 피드백)

추가 최적화 여지로는 recharts 자체를 visx 등 저수준 라이브러리로 교체하는 방법이 있으나, 현재 체감 성능이 충분하여 추가 작업은 보류했다.

---

## 4. 최종 산출물

### 4.1 파일 구조

```
src/
├── lib/
│   └── halving.ts                              # 순수 계산 유틸리티
├── app/(app)/
│   ├── layout.tsx                              # 네비게이션에 Simulator 항목 추가
│   └── vton-issuance-simulator/
│       └── page.tsx                            # 시뮬레이터 페이지
└── components/simulation/
    ├── MintSimulator.tsx                       # 민팅 시뮬레이터
    ├── EpochTable.tsx                          # 에폭 반감기 테이블
    ├── SupplyChart.tsx                         # 공급 곡선 차트
    ├── HalvingRatioChart.tsx                   # 반감비율 차트
    └── SupplyProgressBar.tsx                   # 공급량 진행 바
```

### 4.2 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | Next.js 15 + React 18 |
| 차트 | recharts |
| 스타일링 | Tailwind CSS + CSS Variables (디자인 토큰) |
| 상태 관리 | React useState + useDeferredValue |
| 타입 | TypeScript strict mode |

### 4.3 추가된 의존성

| 패키지 | 용도 |
|--------|------|
| `recharts` | 공급 곡선 및 반감비율 차트 시각화 |

### 4.4 기존 UI 컴포넌트 재사용

신규 컴포넌트 생성 없이 기존 디자인 시스템을 활용했다:

- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`
- `Button` (primary, secondary variants)
- `Input`, `Label`
- `Badge`

---

## 5. 핵심 결정 요약

| # | 결정 사항 | 결정 주체 | 근거 |
|---|-----------|-----------|------|
| 1 | 반감기 파라미터 (100M, 5M 에폭, 0.75 감소, 20 에폭) | 사전 확정 | 거버넌스 토큰 희소성 확보를 위한 설계 |
| 2 | 비트코인 방식 에폭 경계 (분할 없음) | 사전 확정 | 구현 단순성 및 예측 가능성 |
| 3 | halvingRatio × emissionRatio 이중 적용 | 사전 확정 | 기존 emissionRatio 제어 수단 보존 |
| 4 | 시뮬레이터 순수 클라이언트 사이드 | 설계 단계 | 지갑 불필요, 접근성 최대화 |
| 5 | recharts 채택 | 설계 단계 | React 생태계 표준, 다크모드/반응형 지원 |
| 6 | 라우트 `/vton-issuance-simulator` | 직접 지정 | 명확한 기능 표현 |
| 7 | `useDeferredValue` 성능 최적화 | 구현 단계 | Mint 버튼 즉시 반응, 차트 업데이트 비동기화 |

---

## 6. 검증 결과

| 항목 | 결과 |
|------|------|
| TypeScript 컴파일 | 에러 없음 |
| 개발 서버 페이지 로드 (`/vton-issuance-simulator`) | HTTP 200, 정상 렌더링 |
| 반감기 컨트랙트 테스트 (34/35) | 통과 (1건 기존 이슈) |
| Mint 버튼 반응성 | 즉시 반응 (차트는 deferred 업데이트) |
