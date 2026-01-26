# Tokamak DAO v2

## Design System Rules

웹 컴포넌트 작성 시:
1. 항상 `src/components/ui/`의 기존 컴포넌트를 먼저 확인
2. 기존 컴포넌트가 있으면 반드시 재사용
3. 없는 컴포넌트는 `src/components/ui/`에 새로 생성
4. 컴포넌트 생성 시 기존 패턴(CVA, forwardRef, TypeScript) 따르기

### 기존 컴포넌트 목록
- Button, IconButton
- Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- Input, Textarea, Label, HelperText
- Badge
- Avatar
- Progress
- Navigation, Sidebar
- StatCard, DelegateCard, ProposalCard

### 컴포넌트 생성 규칙
- TypeScript + forwardRef 패턴 사용
- class-variance-authority(CVA)로 variants 정의
- CSS 변수(design tokens) 사용, 하드코딩 금지
- JSDoc 주석 추가

## Code Style
- TypeScript strict mode
- ES modules (import/export)
- Tailwind CSS + CSS 변수

## Commands
- `npm run dev` - 개발 서버
- `npm run build` - 빌드
- `npm run lint` - 린트

## Contracts

- Foundry 프로젝트: `contracts/`
- **컨트랙트 명세**: `contracts/contract-spec.md` 참조 (필수)
- `cd contracts && forge build` - 빌드
- `cd contracts && forge test` - 테스트

### 웹앱 개발 시 주의사항
- 컨트랙트 함수 호출 전 `contract-spec.md`의 파라미터/반환값 확인
- 이벤트 구독 시 이벤트 시그니처 확인
- 상태 변경 함수는 트랜잭션 필요, view 함수는 call로 조회
