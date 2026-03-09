# Tokamak DAO v2 - Design Specification

## Overview

Tally.xyz 거버넌스 플랫폼에서 영감을 받은 디자인 시스템. 3계층 디자인 토큰 체계와 CVA 기반 컴포넌트 패턴을 사용한다.

## Tech Stack

- **Tailwind CSS v4** (`@theme inline` 방식)
- **CSS Variables** (디자인 토큰)
- **class-variance-authority (CVA)** (컴포넌트 variant 관리)
- **Font**: DM Sans (본문), Source Code Pro (코드)

## Design Token Architecture

토큰 파일: `src/styles/design-tokens.css`

### Layer 1: Primitive Tokens (원시값)

| Category | Prefix | Example |
|----------|--------|---------|
| Primary Color | `--color-primary-{50-950}` | `--color-primary-500: #3376f7` (브랜드 컬러) |
| Gray | `--color-gray-{0-950}` | `--color-gray-900: #101828` |
| Success | `--color-success-{50-900}` | `--color-success-500: #10b981` |
| Warning | `--color-warning-{50-900}` | `--color-warning-500: #f59e0b` |
| Error | `--color-error-{50-900}` | `--color-error-500: #ef4444` |
| Voting | `--color-vote-{for,against,abstain}` | `--color-vote-for: #10b981` |
| Font Size | `--font-size-{xs-6xl}` | `--font-size-base: 1rem` |
| Font Weight | `--font-weight-{normal,medium,semibold,bold}` | `400, 500, 600, 700` |
| Spacing | `--space-{0-24}` | 4px 기본 단위 |
| Border Radius | `--radius-{none-full}` | `--radius-xl: 0.75rem` |
| Shadow | `--shadow-{xs-3xl}` | Tally 스타일 elevation |
| Transition | `--duration-{fast,normal,slow,slower}` | `150ms, 200ms, 300ms, 400ms` |
| Z-Index | `--z-{hide-tooltip}` | `--z-modal: 1400` |
| Container | `--container-{sm-2xl}` | `--container-xl: 1280px` |

### Layer 2: Semantic Tokens (의미 기반)

Light/Dark 테마 자동 전환. `.dark` 클래스 또는 `data-theme="dark"`, `prefers-color-scheme: dark` 지원.

| Category | Tokens | Usage |
|----------|--------|-------|
| Background | `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-brand` | 페이지/섹션 배경 |
| Surface | `--surface-primary`, `--surface-secondary`, `--surface-overlay` | 카드, 모달 등 |
| Text | `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-brand` | 텍스트 색상 |
| Border | `--border-primary`, `--border-secondary`, `--border-brand` | 테두리 |
| Foreground | `--fg-brand-primary`, `--fg-success-primary`, `--fg-error-primary` | 아이콘, 인터랙티브 요소 |
| Button | `--button-{primary,secondary,tertiary}-{bg,fg,border}` | 버튼 스타일 |
| Status | `--status-{success,warning,error,info}-{fg,bg,border}` | 상태 표시 |
| Focus | `--focus-ring` | 포커스 링 |

### Layer 3: Component Tokens

| Component | Tokens |
|-----------|--------|
| Card | `--card-{bg,border,radius,padding,shadow}` |
| Input | `--input-{bg,border,border-hover,border-focus,text,placeholder,radius,shadow-focus,padding-x,padding-y}` |
| Badge | `--badge-radius` |
| Navigation | `--nav-{bg,border,height}` (height: 4rem) |
| Sidebar | `--sidebar-{bg,border,width}` (width: 320px) |
| Modal | `--modal-{bg,border,radius,shadow,backdrop}` |
| Tooltip | `--tooltip-{bg,text,radius}` |
| Progress | `--progress-{bg,radius,height}` |
| Avatar | `--avatar-{border,radius}` |
| Table | `--table-{header-bg,row-bg,row-bg-hover,border}` |

## UI Components

경로: `src/components/ui/`
인덱스: `src/components/ui/index.ts`

### Component List

| Component | File | Sub-components / Variants |
|-----------|------|---------------------------|
| **Button** | `button.tsx` | `Button`, `IconButton`, `buttonVariants` |
| **Card** | `card.tsx` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `cardVariants` |
| **Badge** | `badge.tsx` | `Badge`, `StatusBadge`, `badgeVariants` |
| **Input** | `input.tsx` | `Input`, `Textarea`, `Label`, `HelperText`, `inputVariants`, `textareaVariants` |
| **Avatar** | `avatar.tsx` | `Avatar`, `AvatarImage`, `AvatarFallback`, `AddressAvatar`, `avatarVariants` |
| **Progress** | `progress.tsx` | `Progress`, `VotingProgress` |
| **Navigation** | `navigation.tsx` | `Navigation`, `NavigationBrand`, `NavigationItems`, `NavigationItem`, `NavigationActions`, `NavigationMenuButton`, `DaoSelector` |
| **Sidebar** | `sidebar.tsx` | `Sidebar`, `SidebarSection`, `SidebarTitle`, `SidebarItem`, `CollapsibleSection` |
| **Modal** | `modal.tsx` | `Modal`, `ModalHeader`, `ModalTitle`, `ModalDescription`, `ModalBody`, `ModalFooter` |
| **MobileNav** | `mobile-nav.tsx` | `MobileNav` |
| **Select** | `select.tsx` | - |
| **Tooltip** | `tooltip.tsx` | - |
| **StatCard** | `stat-card.tsx` | `StatCard`, `statCardVariants` |
| **DelegateCard** | `delegate-card.tsx` | `DelegateCard` |
| **DelegateListItem** | `delegate-list-item.tsx` | - |
| **ProposalCard** | `proposal-card.tsx` | `ProposalCard` |
| **ProposalListItem** | `proposal-list-item.tsx` | - |

### Component Creation Rules

1. TypeScript + `forwardRef` 패턴
2. `class-variance-authority (CVA)`로 variant 정의
3. CSS 변수(디자인 토큰) 사용, 하드코딩 금지
4. JSDoc 주석 추가
5. `src/components/ui/index.ts`에 export 등록

## Global Styles

파일: `src/app/globals.css`

### Tailwind Theme Mapping (`@theme inline`)

CSS 변수를 Tailwind 유틸리티로 매핑:
- `--color-background`, `--color-foreground`, `--color-surface`, `--color-border`
- `--font-sans` (DM Sans), `--font-mono` (Source Code Pro)

### Base Styles

- 기본 border color: `var(--border-secondary)`
- Body: `var(--bg-primary)`, `var(--text-primary)`, DM Sans
- Focus: `var(--focus-ring)` (outline 대신 box-shadow)
- Selection: primary-100/900 기반

### Typography

| Element | Size | Weight |
|---------|------|--------|
| h1 | `--font-size-4xl` (36px) | semibold |
| h2 | `--font-size-3xl` (30px) | semibold |
| h3 | `--font-size-2xl` (24px) | semibold |
| h4 | `--font-size-xl` (20px) | semibold |
| h5 | `--font-size-lg` (18px) | semibold |
| h6 | `--font-size-base` (16px) | semibold |
| p | base | normal, `--text-secondary` |
| small | sm | normal, `--text-tertiary` |

### Layout

- `.layout-container`: sidebar(320px) + content 그리드 (1024px 이하에서 1열)
- `.container`: max-width `--container-xl` (1280px), 반응형 padding
- `.card-grid`: auto-fit 그리드, min 280px

### Animations

| Class | Effect |
|-------|--------|
| `.animate-fade-in` | 페이드 인 |
| `.animate-fade-up` | 아래에서 위로 페이드 |
| `.animate-fade-down` | 위에서 아래로 페이드 |
| `.animate-scale-in` | 스케일 인 |
| `.animate-slide-in-right` | 오른쪽에서 슬라이드 |
| `.animate-pulse-soft` | 부드러운 펄스 |
| `.animate-spin` | 회전 |

### Utility Classes

- `.glass`: 유리 효과 (backdrop-filter blur)
- `.truncate-2`, `.truncate-3`: 멀티라인 말줄임
- `.text-balance`, `.text-pretty`: 텍스트 래핑
- `.proposal-prose`: Proposal 마크다운 렌더링용 prose 스타일

### Accessibility

- `prefers-reduced-motion`: 모든 애니메이션 비활성화
- Custom scrollbar: webkit + Firefox 지원
- Print styles 지원
