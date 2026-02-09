# Sandbox Architecture

## 1. 개요

Sandbox는 사용자가 DAO 거버넌스 기능을 실제 테스트넷/메인넷 없이도 체험할 수 있도록 클라우드 기반의 임시 블록체인 환경을 제공하는 시스템이다.

### 기술 스택

| 구성 요소 | 기술 | 역할 |
|-----------|------|------|
| 블록체인 노드 | Anvil (Foundry) | 로컬 EVM 체인 에뮬레이션 |
| 클라우드 인프라 | Fly.io Machines | 온디맨드 컨테이너 실행 |
| 백엔드 API | Next.js API Routes | 머신 관리, RPC 프록시 |
| 프론트엔드 | React Context + Wagmi | 세션 관리, 체인 연결 |
| 지갑 연동 | MetaMask (`wallet_addEthereumChain`) | 트랜잭션 서명 |

### 핵심 설계 원칙

- **일회용 환경**: 각 세션은 독립적인 Fly.io Machine에서 실행되며, 종료 시 완전히 파괴된다.
- **사전 배포**: 모든 DAO 컨트랙트가 `deploy-data.json`의 트랜잭션을 리플레이하여 자동 배포된다.
- **단일 프록시 구조**: Wagmi(읽기)와 MetaMask(쓰기) 모두 동일한 `/api/sandbox/rpc` Vercel 프록시를 사용한다 (상세 내용은 5절 참조).

---

## 2. 전체 라이프사이클

```
사용자가 "Launch Sandbox" 클릭
           │
           ▼
┌─────────────────────────────┐
│  POST /api/sandbox/session  │  (SSE 스트리밍 응답)
└─────────────────────────────┘
           │
           ▼
   ① 기존 머신 전부 파괴 (destroyAllMachines)
           │
           ▼
   ② Fly.io Machine 생성 (createMachine)
      - 이미지: ghcr.io/foundry-rs/foundry:latest
      - 명령: timeout 7200 anvil --host 0.0.0.0 --chain-id 13374
      - 리전: nrt (도쿄)
      - 스펙: shared CPU 1코어, 256MB RAM
           │
           ▼
   ③ 머신 준비 대기 (waitForMachine)
      - Fly Machine state === "started" 확인
      - eth_blockNumber RPC 호출로 Anvil 응답 확인
      - 최대 30초 타임아웃
           │
           ▼
   ④ 컨트랙트 배포 (deployContracts)
      - deploy-data.json의 트랜잭션을 순차 실행
      - 각 트랜잭션마다 waitForReceipt로 완료 확인
      - 배포되는 컨트랙트: TON, vTON, DelegateRegistry,
        DAOGovernor, SecurityCouncil, Timelock, Faucet, TonFaucet
           │
           ▼
   ⑤ 지갑 펀딩 (fundWallet)
      - ETH: anvil_setBalance로 100 ETH 설정
      - TON: deployer 주소에서 mint 호출 (10,000 TON)
      - vTON: deployer 주소에서 mint 호출 (10,000 vTON)
      - 각 민트 트랜잭션 후 waitForReceipt 호출
           │
           ▼
   ⑥ 프론트엔드 세션 활성화
      - setSandboxRpcUrl() 호출 (Wagmi 커스텀 전송용)
      - setSandboxAddresses() 호출 (컨트랙트 주소 오버라이드)
      - wallet_addEthereumChain으로 MetaMask에 샌드박스 체인 등록
           │
           ▼
   ⑦ 사용 단계
      - 거버넌스 기능 테스트 (제안, 투표, 위임 등)
      - 시간 이동 (time-travel)으로 투표/타임락 기간 건너뛰기
      - 추가 펀딩 가능
           │
           ▼
   ⑧ 종료
      - 사용자가 "Stop Sandbox" 클릭
      - DELETE /api/sandbox/session/[machineId] 호출
      - 오버라이드 초기화
      - 또는 2시간 후 자동 만료 (timeout 7200 + auto_destroy)
```

---

## 3. Backend API

### 3.1 `POST /api/sandbox/session` — 세션 생성

**파일**: `src/app/api/sandbox/session/route.ts`

SSE(Server-Sent Events) 스트리밍으로 세션 생성 과정을 실시간 전달한다.

**요청**:
```json
{ "address": "0x..." }
```

**유효성 검사**: 주소가 `0x` + 40자 hex 패턴에 맞는지 정규식으로 검증한다.

**SSE 이벤트 순서**:

| step | message | 설명 |
|------|---------|------|
| `creating` | "Creating sandbox..." | Fly.io 머신 생성 시작 |
| `starting` | "Starting Anvil..." | 머신 부팅 및 Anvil 준비 대기 |
| `deploying` | "Deploying contracts..." | 컨트랙트 배포 (progress: 50) |
| `funding` | "Funding wallet..." | 지갑 펀딩 (progress: 80) |
| `done` | — | 완료. `machineId`, `rpcUrl`, `addresses` 포함 |
| `error` | 에러 메시지 | 실패 시 |

**완료 응답 (`step: "done"`)의 필드**:
- `machineId`: Fly.io Machine ID
- `rpcUrl`: RPC 프록시 경로 (`"/api/sandbox/rpc"`)
- `addresses`: 배포된 컨트랙트 주소 객체

### 3.2 `GET /api/sandbox/session?machineId=...` — 머신 상태 조회

**파일**: `src/app/api/sandbox/session/route.ts`

쿼리 파라미터로 `machineId`를 받아 Fly.io API를 통해 머신 상태를 반환한다.

**응답**:
```json
{ "machineId": "...", "state": "started" }
```

### 3.3 `GET /api/sandbox/session/[machineId]` — 헬스 체크

**파일**: `src/app/api/sandbox/session/[machineId]/route.ts`

머신의 생존 여부를 확인한다. 프론트엔드에서 세션 복원 시 사용한다.

**응답**:
```json
{ "alive": true, "state": "started" }
```

Fly API 오류 시에도 500이 아닌 `{ "alive": false, "state": "unknown" }`을 반환하여, 프론트엔드가 안전하게 세션을 정리할 수 있도록 한다.

### 3.4 `DELETE /api/sandbox/session/[machineId]` — 머신 종료

**파일**: `src/app/api/sandbox/session/[machineId]/route.ts`

Fly.io Machine을 `force=true`로 강제 삭제한다. 이미 삭제된 머신(404)은 정상 처리한다.

**응답**:
```json
{ "success": true }
```

### 3.5 `POST /api/sandbox/session/[machineId]/fund` — 지갑 펀딩

**파일**: `src/app/api/sandbox/session/[machineId]/fund/route.ts`

런타임 중 추가 펀딩이 필요할 때 사용한다. 초기 세션 생성 시에도 동일한 `fundWallet` 함수를 호출한다.

**요청**:
```json
{ "address": "0x..." }
```

**동작**: 100 ETH 설정 + 10,000 TON 민트 + 10,000 vTON 민트

### 3.6 `POST /api/sandbox/session/[machineId]/time-travel` — 시간 이동

**파일**: `src/app/api/sandbox/session/[machineId]/time-travel/route.ts`

거버넌스 컨트랙트가 `block.number` 기반으로 `votingDelay`/`votingPeriod`를 체크하기 때문에, 단순히 타임스탬프만 변경하는 것이 아니라 블록도 함께 전진시켜야 한다.

**요청**:
```json
{ "seconds": 86400 }
```

**동작**:
- 이더리움 메인넷 블록 간격(12초)에 맞춰 블록 수 계산: `blocks = ceil(seconds / 12)`
- `anvil_mine(blocks, 12)` 호출로 블록 번호와 타임스탬프를 동시에 전진

**응답**:
```json
{ "success": true, "blocks": 7200 }
```

### 3.7 `POST /api/sandbox/rpc` — RPC 프록시

**파일**: `src/app/api/sandbox/rpc/route.ts`

Wagmi 커스텀 전송 계층과 MetaMask 모두에서 사용하는 단일 RPC 프록시이다.

**동작**:
1. 요청 본문 파싱 실패 시 JSON-RPC 파싱 에러 (`-32700`) 반환.
2. `proxyRpc(null, body)` 호출 — `machineId`는 항상 `null`이며, Fly.io의 자동 라우팅에 맡긴다.
3. `createMachine()`이 항상 `destroyAllMachines()`를 먼저 호출하므로, Fly.io 앱에는 항상 하나의 머신만 존재한다. 따라서 `fly-force-instance-id` 헤더 없이도 Fly.io가 올바른 머신으로 자동 라우팅한다.
4. 타임아웃(30초) 발생 시 "Sandbox RPC timeout" 메시지와 함께 504 반환.

---

## 4. Core Library (`fly.ts`)

**파일**: `src/app/api/sandbox/lib/fly.ts`

Fly.io Machines API와 Anvil RPC를 래핑하는 핵심 라이브러리이다.

### 주요 상수

| 상수 | 값 | 설명 |
|------|---|------|
| `FLY_API_URL` | `https://api.machines.dev/v1` | Fly.io Machines REST API 베이스 URL |
| `FLY_API_TOKEN` | 환경변수 | Fly.io 인증 토큰 (FlyV1 macaroon 또는 레거시 Bearer) |
| `FLY_APP_NAME` | 환경변수 | Fly 앱 이름 (`tokamak-dao-demo`) |
| `DEPLOYER_ADDRESS` | `0xf39Fd6...b92266` | Anvil 기본 계정 #0 (컨트랙트 배포 및 민트 호출용) |

### 함수 목록

#### `flyHeaders(): Record<string, string>`
Fly.io API 인증 헤더를 생성한다. `FlyV1` 접두어가 있는 macaroon 토큰은 그대로 사용하고, 레거시 `fo1_` 토큰은 `Bearer` 접두어를 추가한다.

#### `listMachines(): Promise<{ id: string; state: string }[]>`
현재 앱의 모든 머신 목록을 조회한다. API 오류 시 빈 배열을 반환한다.

#### `destroyAllMachines(): Promise<void>`
`state`가 `"destroyed"`가 아닌 모든 머신을 병렬로 삭제한다. `createMachine()`에서 항상 먼저 호출되므로, Fly.io 앱에는 동시에 하나의 머신만 존재하게 된다. 이 단일 머신 보장이 쿠키/헤더 없는 자동 라우팅의 핵심이다.

#### `createMachine(): Promise<string>`
새 Fly.io Machine을 생성한다.

**머신 설정**:
- 리전: `nrt` (도쿄)
- 이미지: `ghcr.io/foundry-rs/foundry:latest`
- 스펙: shared CPU 1코어, 256MB RAM
- 초기 명령: `timeout 7200 anvil --host 0.0.0.0 --chain-id 13374`
- `auto_destroy: true` — 프로세스 종료 시 머신 자동 파괴
- `restart.policy: "no"` — 크래시 시 재시작하지 않음
- 포트: 443(TLS+HTTP)/80(HTTP) -> 내부 8545

**반환**: Machine ID (문자열)

#### `waitForMachine(machineId: string): Promise<void>`
머신이 완전히 준비될 때까지 대기한다 (최대 30초).
1. Fly Machine state가 `"started"`가 될 때까지 1초 간격으로 폴링
2. `eth_blockNumber` RPC가 응답할 때까지 1초 간격으로 폴링

#### `destroyMachine(machineId: string): Promise<void>`
특정 머신을 `force=true`로 강제 삭제한다. 이미 삭제된 머신(404)은 무시한다.

#### `getMachine(machineId: string): Promise<{ state: string }>`
특정 머신의 상태를 조회한다.

#### `proxyRpc(machineId: string | null, body: unknown): Promise<Response>`
Fly.io 앱 URL(`https://{FLY_APP_NAME}.fly.dev`)로 RPC 요청을 프록시한다.
- `machineId`가 주어지면 `fly-force-instance-id` 헤더로 특정 머신에 라우팅하나, 현재 아키텍처에서는 항상 `null`이 전달된다 (Fly.io가 유일한 머신으로 자동 라우팅).
- `AbortSignal.timeout(30_000)`으로 30초 타임아웃 설정

#### `anvilRpc(machineId: string, method: string, params?: unknown[]): Promise<unknown>`
JSON-RPC 형식으로 Anvil에 요청을 보내고 `result` 필드를 반환한다. `error` 필드가 있으면 예외를 던진다.

#### `waitForReceipt(machineId: string, txHash: string): Promise<void>`
트랜잭션 영수증이 나올 때까지 최대 50회(100ms 간격, 총 ~5초) 폴링한다.

#### `deployContracts(machineId: string): Promise<DeployData["addresses"]>`
`deploy-data.json`의 모든 트랜잭션을 순차적으로 실행한다. 각 트랜잭션마다 `eth_sendTransaction`으로 전송 후 `waitForReceipt`로 완료를 확인한다. 최종적으로 배포된 컨트랙트 주소 객체를 반환한다.

**배포 주소 구조**:
```typescript
{
  ton: string;
  vton: string;
  delegateRegistry: string;
  daoGovernor: string;
  securityCouncil: string;
  timelock: string;
  faucet: string;
  tonFaucet: string;
}
```

#### `fundWallet(machineId: string, address: string): Promise<void>`
사용자 지갑에 테스트 자산을 충전한다.
1. `anvil_setBalance`로 100 ETH (`0x56BC75E2D63100000`) 설정
2. `anvil_mine(1)`로 한 블록 채굴 (MetaMask 잔액 갱신 트리거)
3. `DEPLOYER_ADDRESS`에서 MockTON `mint(address, 10000e18)` 호출 + 영수증 대기
4. `DEPLOYER_ADDRESS`에서 vTON `mint(address, 10000e18)` 호출 + 영수증 대기

---

## 5. 단일 전송 구조 (Single Proxy Architecture)

샌드박스는 Wagmi(읽기)와 MetaMask(쓰기) 모두 동일한 Vercel 프록시 `/api/sandbox/rpc`를 사용하는 단일 전송 구조를 채택하고 있다.

```
┌──────────────────────────────────────────────────────────┐
│  브라우저                                                  │
│                                                          │
│  ┌─────────────┐          ┌──────────────────┐           │
│  │   Wagmi     │          │    MetaMask      │           │
│  │ (읽기)      │          │ (쓰기)            │           │
│  └──────┬──────┘          └────────┬─────────┘           │
│         │                          │                     │
│    custom() transport         서비스 워커                  │
│    (상대 URL)                 (절대 URL)                   │
│         │                          │                     │
│         ▼                          ▼                     │
│         └──────────┬───────────────┘                     │
│                    ▼                                     │
│          /api/sandbox/rpc                                │
│          (단일 Vercel 프록시)                               │
│          쿠키/헤더 불필요                                   │
│                    │                                     │
└────────────────────┼─────────────────────────────────────┘
                     ▼
          https://{FLY_APP_NAME}.fly.dev
          (Fly.io 자동 라우팅 → 유일한 머신)
```

### 단일 프록시가 안전한 이유

`createMachine()` 함수는 새 머신을 생성하기 전에 항상 `destroyAllMachines()`를 호출하여 기존 머신을 모두 파괴한다. 따라서 Fly.io 앱에는 **항상 하나의 머신만 존재**하며, Fly.io의 자동 라우팅이 별도의 식별 헤더(`fly-force-instance-id`) 없이도 해당 머신으로 요청을 전달한다.

### 이전 이중 전송 구조와의 비교

이전 아키텍처에서는 Wagmi와 MetaMask가 서로 다른 경로를 사용했다:
- Wagmi: `/api/sandbox/rpc` (Vercel 프록시, `sandbox-machine-id` 쿠키 기반 라우팅)
- MetaMask: 직접 Fly.io URL (`https://{FLY_APP_NAME}.fly.dev`, `NEXT_PUBLIC_SANDBOX_RPC_URL` 환경변수)

이 이중 경로 구조는 쿠키 동기화 문제, MetaMask RPC URL 캐싱 문제 등으로 간헐적 장애를 유발했다. 단일 프록시 구조에서는:
- **쿠키 기반 라우팅이 불필요**: `fly-force-instance-id` 헤더 없이 Fly.io 자동 라우팅 사용
- **`NEXT_PUBLIC_SANDBOX_RPC_URL` 환경변수 불필요**: 모든 요청이 동일 오리진의 프록시를 경유
- **MetaMask 서비스 워커 호환**: MetaMask는 `wallet_addEthereumChain`에 등록된 절대 HTTPS URL(예: `https://your-domain.com/api/sandbox/rpc`)로 서비스 워커에서 직접 요청 가능

### Wagmi 읽기 경로 (커스텀 전송)

**파일**: `src/config/wagmi.ts` — `createSandboxTransport()`

- Wagmi의 `custom()` 전송으로 구현
- `sandboxRpcUrl` 변수가 가리키는 URL로 `fetch` 호출
- URL은 `{window.location.origin}/api/sandbox/rpc` (Vercel/Next.js 프록시)
- 30초 타임아웃 설정 (`AbortSignal.timeout(30_000)`)
- 타임아웃/네트워크 오류 시 `sandbox-rpc-error` 커스텀 이벤트 발생

### MetaMask 쓰기 경로

- `wallet_addEthereumChain`으로 등록하는 RPC URL이 MetaMask에 저장됨
- 등록 URL: `{window.location.origin}/api/sandbox/rpc` (동일 오리진 절대 URL)
- MetaMask 서비스 워커가 이 절대 HTTPS URL로 직접 RPC 호출을 실행

### Chain ID 13374를 사용하는 이유

MetaMask는 `wallet_addEthereumChain`을 호출할 때 이미 등록된 체인 ID에 대해서는 RPC URL을 업데이트하지 않는다. 따라서:

1. localhost의 Chain ID 1337과 충돌을 피하기 위해 별도의 ID 사용
2. 과거 RPC URL 변경 시마다 MetaMask 캐시를 우회하기 위해 체인 ID를 범프해온 이력이 있음 (13371 -> 13372 -> 13373 -> 13374)
3. 13374는 최종 범프이다 — RPC URL이 안정적인 `/api/sandbox/rpc` 경로로 고정되었으므로 더 이상 URL 변경이 필요 없다
4. `SANDBOX_CHAIN_ID` 상수로 `src/config/wagmi.ts`에 정의되며, Anvil 시작 시 `--chain-id 13374` 플래그로 전달됨

### 전송 등록

```typescript
// src/config/wagmi.ts
transports: {
  [localhost.id]: http(),                    // Chain 1337: 로컬 개발용
  [sandboxChain.id]: createSandboxTransport(), // Chain 13374: 샌드박스 커스텀 전송
  [mainnet.id]: http(...),                   // Chain 1: 이더리움 메인넷
  [sepolia.id]: http(...),                   // Chain 11155111: Sepolia 테스트넷
}
```

---

## 6. 프론트엔드 상태 관리

**파일**: `src/contexts/SandboxContext.tsx`

`SandboxProvider`는 React Context를 통해 전역 샌드박스 상태를 관리한다.

### 상태 타입

```typescript
type SandboxStatus = "idle" | "creating" | "ready" | "error";

interface SandboxSession {
  machineId: string;
  rpcUrl: string;         // "/api/sandbox/rpc"
  addresses: ContractAddresses;
}

interface SandboxProgress {
  step: string;           // "creating" | "starting" | "deploying" | "funding" | "done"
  message: string;
  progress?: number;
}
```

### 제공되는 액션

| 함수 | 동작 |
|------|------|
| `startSandbox()` | SSE 스트리밍으로 세션 생성, 완료 시 오버라이드 설정 및 MetaMask 체인 전환 |
| `stopSandbox()` | DELETE API 호출, 오버라이드 초기화, 상태 리셋 |
| `timeTravel(seconds)` | time-travel API 호출 |
| `fundWallet()` | fund API 호출 (현재 연결된 지갑 주소 사용) |

### 세션 자동 복원

1. 컴포넌트 마운트 시 `sessionStorage`에서 이전 세션 정보를 읽는다 (키: `"sandbox-session"`).
2. `GET /api/sandbox/session/{machineId}`로 머신 생존 여부를 확인한다.
3. 머신이 살아 있으면:
   - `setSandboxRpcUrl()` 및 `setSandboxAddresses()` 호출
   - 상태를 `"ready"`로 전환
   - 현재 MetaMask 체인이 13374가 아니면 `wallet_addEthereumChain` 호출 (이미 올바른 체인이면 팝업 생략)
4. 머신이 죽었으면 `sessionStorage`를 정리한다.

### 자동 만료 감지

`sandbox-rpc-error` 커스텀 이벤트를 리스닝한다. 이 이벤트는 `createSandboxTransport()`에서 RPC 호출 실패 시 `window.dispatchEvent(new CustomEvent('sandbox-rpc-error'))`로 발생한다.

이벤트 수신 시:
1. 헬스 체크 API로 머신 생존 여부를 재확인
2. 머신이 죽었으면 오버라이드 초기화, 세션 제거, 에러 상태 전환
3. 중복 체크 방지를 위해 `checking` 플래그 사용

### UI 컴포넌트 (`SandboxModal`)

**파일**: `src/components/sandbox/SandboxModal.tsx`

`useSandbox()` 훅(= `useSandboxContext`의 re-export)을 사용하여 4가지 상태별 UI를 렌더링한다:

| 상태 | UI |
|------|-----|
| `idle` | 샌드박스 설명 + "Launch Sandbox" 버튼 |
| `creating` | 프로그레스 바 + 단계별 메시지 |
| `ready` (isActive) | "Sandbox is running!" 상태 + "Stop Sandbox" / "Go to Dashboard" 버튼 |
| `error` | 에러 메시지 + "Retry" 버튼 |

프로그레스 값은 `STEP_PROGRESS` 매핑을 사용한다:
```typescript
const STEP_PROGRESS = {
  creating: 10,
  starting: 30,
  deploying: 60,
  funding: 85,
  done: 100,
};
```

---

## 7. 컨트랙트 주소 오버라이드

**파일**: `src/constants/contracts.ts`

### 문제

로컬호스트(Chain 1337)와 테스트넷(Sepolia)의 컨트랙트 주소는 빌드 시점에 고정되어 있다. 그러나 샌드박스에서는 매 세션마다 새로운 Anvil 인스턴스에 컨트랙트가 배포되므로, 주소가 동적으로 결정된다.

### 해결: `setSandboxAddresses()` 메커니즘

```typescript
// 모듈 레벨 변수
let sandboxAddressOverride: ContractAddresses | null = null;

export function setSandboxAddresses(addresses: ContractAddresses | null): void {
  sandboxAddressOverride = addresses;
}

export function getContractAddresses(chainId: number): ContractAddresses {
  // 샌드박스 체인이고 오버라이드가 설정된 경우 오버라이드 사용
  if (chainId === SANDBOX_CHAIN_ID && sandboxAddressOverride) {
    return sandboxAddressOverride;
  }
  return CONTRACT_ADDRESSES[chainId] ?? CONTRACT_ADDRESSES[1337];
}
```

### 동작 흐름

1. 세션 생성 완료 시 `SandboxContext`에서 `setSandboxAddresses(data.addresses)` 호출
2. 이후 앱 전체에서 `getContractAddresses(chainId)`를 호출하면, `chainId === 13374`일 때 오버라이드된 주소가 반환됨
3. 세션 종료 시 `setSandboxAddresses(null)`로 초기화
4. 세션 복원 시에도 저장된 `addresses`로 오버라이드 재설정

### `deploy-data.json` 구조

`deploy-data.json`은 `scripts/setup-sandbox-deploy-data.sh` 스크립트로 생성되며, Anvil의 결정적 배포 특성(동일 순서 + 동일 nonce = 동일 주소)을 활용하여 매번 같은 주소에 컨트랙트가 배포된다.

```typescript
interface DeployData {
  transactions: DeployTransaction[];  // 배포 트랜잭션 배열
  addresses: {                        // 배포 후 예상 주소
    ton: string;
    vton: string;
    delegateRegistry: string;
    daoGovernor: string;
    securityCouncil: string;
    timelock: string;
    faucet: string;
    tonFaucet: string;
  };
}
```

---

## 8. 에러 처리

### RPC 타임아웃

**클라이언트 측** (`src/config/wagmi.ts` — `createSandboxTransport()`):
- `AbortSignal.timeout(30_000)`으로 30초 타임아웃 설정
- 타임아웃 발생 시 `sandbox-rpc-error` 커스텀 이벤트 디스패치
- 에러 메시지: `"Sandbox connection timed out — the machine may have expired"`

**서버 측** (`src/app/api/sandbox/rpc/route.ts`):
- `proxyRpc()` 내부에서 동일하게 `AbortSignal.timeout(30_000)` 사용
- `DOMException`의 `name === "TimeoutError"`로 타임아웃 판별
- JSON-RPC 에러 코드 `-32603` + HTTP 504 반환
- 에러 메시지: `"Sandbox RPC timeout — the machine may have expired"`

### 머신 만료 감지

1. **커스텀 전송 레벨**: RPC 호출 실패 시 `sandbox-rpc-error` 이벤트 발생
2. **Context 레벨**: 이벤트 수신 시 헬스 체크 API로 재확인
3. **세션 복원 시**: 마운트 시점에 헬스 체크를 수행하여 죽은 세션 정리

### `sandbox-rpc-error` 이벤트 흐름

```
createSandboxTransport()에서 fetch 실패
    │
    ├── 타임아웃 (AbortSignal.timeout)
    ├── 네트워크 에러
    └── HTTP 에러 응답 (!response.ok)
    │
    ▼
window.dispatchEvent(new CustomEvent('sandbox-rpc-error'))
    │
    ▼
SandboxContext의 handleRpcError 리스너
    │
    ▼
GET /api/sandbox/session/{machineId} 헬스 체크
    │
    ├── alive: true → 일시적 오류, 무시
    └── alive: false → 세션 정리
         ├── setSandboxRpcUrl(null)
         ├── setSandboxAddresses(null)
         ├── setSession(null)
         ├── setStatus("error")
         └── setError("Sandbox expired. Please start a new sandbox.")
```

### 요청 본문 파싱 에러

RPC 프록시(`/api/sandbox/rpc`)는 빈 본문 요청(지갑 헬스 체크 등)을 처리할 수 있도록 `request.json()`을 try-catch로 감싸고, 파싱 실패 시 JSON-RPC 파싱 에러(`-32700`)를 반환한다.

### 머신 자동 정리

- `timeout 7200`: Anvil 프로세스가 2시간 후 자동 종료
- `auto_destroy: true`: 프로세스 종료 시 Fly.io 머신 자동 파괴
- `restart.policy: "no"`: 프로세스 종료 후 재시작하지 않음

이 세 가지 설정이 조합되어, 사용자가 명시적으로 종료하지 않아도 최대 2시간 후에는 리소스가 자동으로 정리된다.
