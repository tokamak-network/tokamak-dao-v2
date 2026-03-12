# Telegram Notifications

Proposal 생성 시 연결된 Telegram 봇에게 자동 알림을 전송하는 기능.

## 구조

```
Proposal 생성 (CreateProposalForm)
  → ProposalCreated 이벤트 파싱
  → POST /api/agents/telegram/notify (fire-and-forget)
  → Supabase에서 연결된 에이전트 조회
  → 각 에이전트의 Telegram 봇으로 메시지 전송
```

## Supabase `agents` 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `telegram_bot_token` | text | Telegram Bot API 토큰 |
| `telegram_chat_id` | bigint | 알림 대상 채팅 ID (테스트 메시지 성공 시 자동 저장) |

## API

### `POST /api/agents/telegram/test`

테스트 메시지를 전송하고 `telegram_chat_id`를 Supabase에 저장한다.

- Request: `{ agentId }`
- `getUpdates`로 최신 chat_id를 동적 조회 → 메시지 전송 → chat_id 저장

### `POST /api/agents/telegram/notify`

모든 연결된 에이전트에게 새 proposal 알림을 전송한다.

- Request: `{ proposalId, title, proposer, origin }`
- `telegram_bot_token`과 `telegram_chat_id`가 모두 있는 에이전트만 대상
- Telegram Markdown 포맷 사용 (볼드 제목, monospace 주소, 클릭 가능한 링크)
- 실패한 에이전트가 있어도 나머지는 정상 전송 (`Promise.allSettled`)

## 주요 파일

- `src/app/api/agents/telegram/test/route.ts` — 테스트 메시지 + chat_id 저장
- `src/app/api/agents/telegram/notify/route.ts` — 알림 전송
- `src/components/proposals/CreateProposalForm.tsx` — 생성 후 notify 호출

## 주의사항

- 알림은 fire-and-forget으로 실패해도 proposal 생성 흐름을 차단하지 않음
- `telegram_chat_id`는 테스트 메시지를 한 번 이상 보내야 저장됨
