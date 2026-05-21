# Flyn 구현 계획

> 기반: `spec.md` (28 시나리오, 4 불변 규칙) + `wireframe.html` (8 화면) + `decisions.md`
> 작성일: 2026-05-21

## 아키텍처 결정

| 결정 | 선택 | 이유 |
|---|---|---|
| Framework | Next.js 16 App Router (이미 설치, React 19, RSC, proxy = v16 미들웨어 이름) | 이미 부트스트랩 완료. RSC로 사이드바·시나리오 목록을 서버 컴포넌트로 그려 클라이언트 번들 축소 |
| DB / Auth | Supabase (`@supabase/ssr`) + Google OAuth provider | 한 서비스로 DB·Auth·RLS 일괄. 새 키 체계(`sb_publishable_...` / `sb_secret_...`) 사용 |
| 데이터 격리 | RLS (Row Level Security) — `auth.uid()` 기반 정책 | 불변 규칙 §보안/프라이버시 — 미들웨어 우회·URL 직접 접근에도 DB 단에서 차단 |
| LLM 게이트웨이 | Vercel AI SDK + Gateway provider (단일 `AI_GATEWAY_API_KEY`) | Anthropic·OpenAI·Google 멀티 제공자를 키 하나로. SDK 기본 global provider |
| 채팅 모델 | `anthropic/claude-haiku-4.5` (스트리밍, 빠른 첫 토큰) | decisions §13. 1-2문장 대화체에 충분, latency 우선 |
| 분석 모델 | `anthropic/claude-sonnet-4.6` (`generateText` + `Output.object(schema)`) | 교정·번역·목표 평가의 정확도가 핵심. structured JSON 안정성 |
| 분석/채팅 호출 | **병렬** (`Promise.all` 두 라우트 호출, 분석은 채팅 응답을 기다리지 않음) | 불변 규칙 §응답 속도 |
| Chat client | `@ai-sdk/react` `useChat` + `DefaultChatTransport`, input state 수동 관리 | AI SDK 최신 API — `handleInputChange/handleSubmit` 사용 안 함 |
| 분석 출력 | `useChat` 스트림과 분리된 별도 `/api/analysis` POST → `Output.object` schema | `goals_achieved`, `correction` 두 필드를 같은 호출에서 받음. 메시지 갱신용 메시지 메타데이터로 클라이언트에 반환 |
| 한→영 변환 | 별도 `/api/translate` (디바운스 500ms) — `generateText` + `Output.object({en: string})` | 입력 도중 호출이라 스트리밍 불필요 |
| 더 알아보기 호출 | 별도 `/api/coach` (시스템 프롬프트 = 한국어 코치) — `streamText` + `toUIMessageStreamResponse` | 격리 불변 규칙 — 메인 채팅과 다른 useChat 세션 |
| UI 키트 | shadcn `radix-nova` (이미 init, base = radix, Tailwind v4) | 현재 프로젝트 설정 그대로 |
| 라벨드 섹션 UI | shadcn `Collapsible` (✱/💡/🌐 공통) | spec §9 Option B — 같은 포맷, 아이콘으로만 구분 |
| 더 알아보기 패널 | shadcn `Sheet side="right"` (≥md) / `Drawer` (모바일) — Tailwind 브레이크포인트로 분기 | decisions §11. shadcn 컴포넌트 정확히 일치 |
| 사이드바 | shadcn `Sidebar` 컴포넌트 (모바일 자동 변환 내장) | decisions §3. 햄버거·접기·반응형 다 처리 |
| 채팅 UI 프리미티브 | `@ai-elements` 레지스트리 (`Message`, `PromptInput`, `Conversation`) | AI SDK 공식 UI, useChat과 정합. 직접 markup 작성보다 적은 코드 |
| 마이그레이션 | Supabase CLI + `supabase/migrations/*.sql` | 결정됨. 재현성 + 버전 관리 |
| 패키지 매니저 | `bun` | CLAUDE.md |
| 테스트 | Vitest (단위·통합) colocated `*.test.tsx` + Playwright (`e2e/*.spec.ts`) | CLAUDE.md |

## 인프라 리소스

| 리소스 | 유형 | 선언 위치 | 생성 Task |
|---|---|---|---|
| Supabase 프로젝트 | DB + Auth | (사용자 셋업) | 셋업 완료 후 Task 1 |
| Google OAuth Client | OAuth provider | Google Cloud Console + Supabase Dashboard | 셋업 완료 후 Task 2 |
| Vercel AI Gateway | LLM 게이트웨이 API 키 | (사용자 셋업) `.env.local` | 셋업 완료 후 Task 1 |
| DB: `scenarios`, `conversations`, `messages` 테이블 | Postgres tables + RLS policies | `supabase/migrations/0001_init.sql` | Task 1 |
| Supabase RLS policies | DB security | 같은 마이그레이션 | Task 1 |
| Next.js proxy (middleware) | Auth refresh + 보호 라우트 가드 | `proxy.ts` (Next.js 16 이름) | Task 2 |
| Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `AI_GATEWAY_API_KEY` | Env vars | `.env.local` (gitignored) + `.env.example` | Task 1 |

## 데이터 모델

### `users` (Supabase 내장 `auth.users` 사용 — 별도 테이블 X)

### `scenarios`
- `id` uuid PK
- `user_id` uuid FK → `auth.users` (RLS 기준)
- `situation` text — "카페에서"
- `their_role` text — "바리스타"
- `my_role` text — "손님"
- `memo` text nullable
- `summary` text — AI 생성 1줄 요약 ("Bluebird Coffee에서…")
- `goals` jsonb — `[{id: number, en: string, ko: string}]` 길이 3
- `created_at`, `updated_at` timestamptz

### `conversations`
- `id` uuid PK
- `scenario_id` uuid FK → `scenarios`
- `user_id` uuid FK → `auth.users` (RLS denormalize — JOIN 없이 정책 평가)
- `status` text CHECK ∈ {`in_progress`, `completed`} default `in_progress`
- `goals_achieved` jsonb — `number[]` (goal index)
- `created_at` timestamptz
- `completed_at` timestamptz nullable

### `messages`
- `id` uuid PK
- `conversation_id` uuid FK → `conversations`
- `user_id` uuid FK (RLS denormalize)
- `role` text CHECK ∈ {`user`, `assistant`}
- `original_text` text — 사용자 친 원본 (한글일 수 있음)
- `english_text` text nullable — 한→영 변환 결과 또는 영어 원본
- `correction` jsonb nullable — `{status: "ok"|"needs_correction"|"alternative", icon, corrected_text?, explanation?}`
- `goals_achieved` jsonb — 이 메시지로 달성된 목표 index 배열
- `created_at` timestamptz

### RLS 정책 (모든 테이블)
- SELECT/INSERT/UPDATE/DELETE: `user_id = auth.uid()` 만 허용

## 필요 스킬

| 스킬 | 적용 Task | 용도 |
|---|---|---|
| `ai-sdk` | 1, 4, 5, 6, 8, 9, 10, 12 | `gateway` provider, `streamText`, `generateText` + `Output.object`, `useChat` 최신 API, model IDs |
| `shadcn` | 3, 4, 7, 8, 9, 11, 12, 13 | 컴포넌트 추가, 폼은 `FieldGroup`+`Field`, 라벨드 섹션은 `Collapsible`, 사이드 패널은 `Sheet`/`Drawer` |
| `next-best-practices` | 모든 Task | App Router 컨벤션, RSC 경계, `proxy.ts` (구 middleware), async `cookies()` |
| `vercel-react-best-practices` | 7, 8, 9, 12 | 채팅·스트리밍 컴포넌트 성능 (서버 컴포넌트 우선, 메시지 리스트 메모이제이션) |

## 영향 받는 파일

| 파일 경로 | 변경 유형 | 관련 Task |
|---|---|---|
| `package.json`, `bun.lock` | Modify (deps 추가) | 1 |
| `.env.example`, `.env.local` | New | 1 |
| `supabase/migrations/0001_init.sql` | New | 1 |
| `supabase/config.toml` | New (Supabase CLI 초기화) | 1 |
| `types/database.ts` | New (Supabase 자동 생성 타입) | 1 |
| `types/scenario.ts`, `types/message.ts` | New | 1, 8 |
| `lib/supabase/client.ts`, `lib/supabase/server.ts` | New | 1 |
| `lib/ai/gateway.ts` | New (model 상수 + Output 스키마 export) | 1 |
| `lib/ai/scenarios.ts` | New (목표 생성·요약·필드 자동 채움) | 4, 5 |
| `lib/ai/chat.ts`, `lib/ai/analysis.ts`, `lib/ai/translate.ts`, `lib/ai/coach.ts` | New | 8, 9, 12 |
| `proxy.ts` (Next 16) | New (auth refresh + redirect) | 2 |
| `app/layout.tsx` | Modify (Providers, sidebar shell) | 3 |
| `app/page.tsx` | Modify (empty state or scenario landing) | 3 |
| `app/login/page.tsx`, `app/login/login-button.tsx` | New | 2 |
| `app/auth/callback/route.ts` | New (Supabase OAuth exchange) | 2 |
| `app/scenarios/new/page.tsx` | New | 4 |
| `app/scenarios/[id]/page.tsx` | New (resume/new choice or direct chat) | 11 |
| `app/scenarios/[id]/edit/page.tsx` | New | 13 |
| `app/conversations/[id]/page.tsx` | New (chat) | 7, 8, 9, 10, 12 |
| `app/conversations/[id]/history/page.tsx` | New (read-only) | 11 |
| `app/history/page.tsx` | New (전체 히스토리) | 14 |
| `app/api/chat/route.ts` | New (`streamText` + `toUIMessageStreamResponse`) | 7, 8 |
| `app/api/analysis/route.ts` | New (`generateText` + `Output.object`) | 8 |
| `app/api/translate/route.ts` | New | 9 |
| `app/api/coach/route.ts` | New | 12 |
| `app/scenarios/actions.ts` | New (server actions — create, delete, update) | 4, 13 |
| `components/sidebar/app-sidebar.tsx` | New | 3 |
| `components/scenarios/scenario-form.tsx` | New | 4, 5, 13 |
| `components/scenarios/scenario-preview.tsx` | New | 4 |
| `components/scenarios/scenario-card.tsx`, `scenario-actions.tsx` (호버 메뉴) | New | 11, 13 |
| `components/scenarios/sparkle-button.tsx`, `recommendation-chips.tsx` | New | 5 |
| `components/chat/chat-view.tsx`, `message-list.tsx`, `message-bubble.tsx`, `labeled-section.tsx`, `goal-bar.tsx`, `prompt-input.tsx` | New | 7, 8, 9, 10 |
| `components/chat/translation-preview.tsx` | New | 9 |
| `components/chat/learn-more-panel.tsx` | New | 12 |
| `components/empty-state.tsx` | New | 3 |
| `e2e/auth.spec.ts`, `scenarios.spec.ts`, `chat.spec.ts` | New | 2, 4, 8 |

## Tasks

### Task 1: 인프라 부트스트랩 — DB 스키마 · RLS · Supabase/AI 클라이언트

- **담당 시나리오**: 없음 (foundational — 모든 후속 Task가 의존). 불변 규칙 §보안/프라이버시 검증의 기반.
- **크기**: M (~6 파일)
- **의존성**: None (사용자 셋업 — Supabase 프로젝트, AI Gateway 키, `.env.local` 값 채움 — 선행)
- **참조**:
  - `ai-sdk` — `gateway` provider, model ID fetch, `Output.object`
  - `next-best-practices` — async `cookies()`, App Router 환경 변수
  - https://supabase.com/docs/guides/auth/server-side/nextjs — `createBrowserClient`, `createServerClient`
- **구현 대상**:
  - `.env.example` (4개 키 명세)
  - `supabase/migrations/0001_init.sql` (3 테이블 + RLS)
  - `lib/supabase/client.ts`, `lib/supabase/server.ts`
  - `lib/ai/gateway.ts` (`CHAT_MODEL`, `ANALYSIS_MODEL` 상수 + `analysisSchema` zod)
  - `types/database.ts` (`supabase gen types typescript` 결과)
  - `types/scenario.ts`, `types/message.ts`
  - `lib/supabase/server.test.ts` (env var 누락 시 throw)
- **수용 기준**:
  - [ ] `bun run build` 통과 (타입 에러 없음)
  - [ ] 마이그레이션 적용 후 `scenarios`, `conversations`, `messages` 세 테이블이 존재한다
  - [ ] 각 테이블에 RLS 활성화 + 정책 4개(SELECT/INSERT/UPDATE/DELETE)가 적용되어 있다
  - [ ] User A로 `scenarios` insert → User B 세션으로 SELECT 시 0행 (격리 검증)
- **검증**:
  - `bun run test -- lib/supabase`
  - `bun run build`
  - Supabase SQL Editor: `SELECT tablename, policyname FROM pg_policies WHERE schemaname='public';` — 12개 행
  - 격리 테스트: psql 또는 Supabase Dashboard "Authentication" → 두 테스트 유저로 데이터 분리 확인

---

### Task 2: Google 로그인 + 인증 가드

- **담당 시나리오**: Scenario 1 (full)
- **크기**: M (~5 파일)
- **의존성**: Task 1 (Supabase 클라이언트). 사용자가 Supabase Dashboard에서 Google provider 활성화 + Google Cloud Console에서 OAuth Client 생성 완료
- **참조**:
  - https://supabase.com/docs/guides/auth/social-login/auth-google#using-the-google-provider
  - `next-best-practices` — `proxy.ts` (v16), `redirect()`, async server functions
- **구현 대상**:
  - `app/login/page.tsx` (로고 + 카피 + "Continue with Google" 버튼)
  - `app/login/login-button.tsx` (`"use client"`, `supabase.auth.signInWithOAuth`)
  - `app/auth/callback/route.ts` (`exchangeCodeForSession`)
  - `proxy.ts` (비로그인 + 보호 경로 → `/login` 리다이렉트, 로그인 + `/login` 접근 → `/` 리다이렉트)
  - `app/login/login-button.test.tsx` (mock된 `supabase.auth.signInWithOAuth` 호출 검증)
  - `e2e/auth.spec.ts` (Scenario 1 시나리오)
- **수용 기준**:
  - [ ] 비로그인 상태로 `/`, `/scenarios/new`, `/conversations/123` 접근 → `/login`으로 리다이렉트
  - [ ] `/login` 화면에 "Continue with Google" 외의 인증 버튼이 보이지 않는다
  - [ ] OAuth 콜백 성공 → `/`로 이동
  - [ ] OAuth 콜백 에러(`?error=…`) → `/login`에 머문다 (에러 메시지 표시는 미결정 §15)
- **검증**:
  - `bun run test -- app/login`
  - `bun run test:e2e -- auth.spec.ts` (Playwright Google OAuth는 외부 — `?next` 흐름 mocking 또는 수동)
  - Browser MCP — 실제 Google OAuth로 로그인 1회 검증, 증거 `artifacts/flyn/evidence/task-2-login.png`

---

### Task 3: 사이드바 + 빈 상태 + 반응형 토글

- **담당 시나리오**: Scenario 2 (full), 26 (desktop sidebar toggle, full), 27 (mobile hamburger, full)
- **크기**: M (~5 파일)
- **의존성**: Task 2 (로그인된 사용자 컨텍스트)
- **참조**:
  - `shadcn` — `Sidebar` (모바일 변환 내장), `Empty` 컴포넌트, `Button`
  - 와이어프레임 screen-1 (빈 상태) — "+ 새 시나리오" 버튼 + 메인 큰 CTA + 예시 칩 5개
- **구현 대상**:
  - shadcn 추가: `bunx --bun shadcn@latest add sidebar empty tooltip sonner`
  - `components/sidebar/app-sidebar.tsx` (RSC — 시나리오 0건/일부 분기)
  - `components/empty-state.tsx`
  - `app/layout.tsx` (SidebarProvider 래핑)
  - `app/page.tsx` (RSC — 시나리오 fetch → 0개면 EmptyState)
  - `components/empty-state.test.tsx`
- **수용 기준**:
  - [x] 시나리오 0개 상태에서 사이드바의 "내 시나리오" / "히스토리" 섹션 헤더가 보이지 않는다
  - [x] 메인 영역에 "첫 시나리오를 만들어보세요" CTA가 보인다
  - [x] CTA 아래에 예시 칩 3-5개가 표시된다 ("카페 주문", "면접 연습", "공항 환승", "병원 예약", "마트 장보기")
  - [x] "첫 시나리오 만들기" CTA 또는 "+ 새 시나리오" 클릭 → `/scenarios/new`로 이동 (router push)
  - [x] 시나리오에 진행 중 인스턴스가 있으면 사이드바 항목 우측에 ▸ 인디케이터가 표시된다 (없으면 표시 안 됨)
  - [x] 데스크탑 폭(≥768px)에서 사이드바 접기 버튼 클릭 → 사이드바 폭이 줄거나 사라진다 (shadcn Sidebar `collapsible=icon`)
  - [x] 사이드바 접힘/펼침 상태가 페이지 이동 후에도 세션 내 유지된다 (`sidebar_state` cookie, 7일)
  - [x] 모바일 폭(<768px)에서는 햄버거 아이콘이 보이고, 클릭 시 사이드바가 오버레이로 나타난다 (Sheet)
  - [x] 모바일 오버레이 바깥 탭 → 사이드바가 닫힌다 (Sheet 기본 동작)
  - [x] 모바일 폭에서 사이드바 안의 시나리오/히스토리 항목 클릭 → 사이드바가 자동으로 닫히고 메인 영역이 해당 화면으로 전환된다 (Sidebar 컴포넌트 내장)
- **검증**:
  - `bun run test -- components/empty-state`
  - `bun run test:e2e -- responsive.spec.ts` (Playwright viewport 토글)
  - Browser MCP — desktop/mobile 둘 다 사이드바 토글 인터랙션 확인, 증거 `artifacts/flyn/evidence/task-3-sidebar-{desktop,mobile}.png`

---

### Checkpoint: Tasks 1-3 이후
- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] **end-to-end 동작**: 처음 방문 → 로그인 → 시나리오 0개의 빈 상태 화면 + 사이드바가 정상 렌더된다

---

### Task 4: 시나리오 폼 (수동 입력) → AI 목표 생성 → 미리보기

- **담당 시나리오**: Scenario 3 (full)
- **크기**: M (5 파일)
- **의존성**: Tasks 1·3
- **참조**:
  - `shadcn` — `FieldGroup`+`Field`+`InputGroup`, `Card` (목표 카드), `Button`, validation states (`data-invalid`)
  - `ai-sdk` — `generateText` + `Output.object({ summary: string, goals: array of {en, ko} })`
  - 와이어프레임 screen-2 (default), screen-3 (목표 미리보기)
- **구현 대상**:
  - `app/scenarios/new/page.tsx` (RSC + Client form)
  - `components/scenarios/scenario-form.tsx` (`"use client"`)
  - `components/scenarios/scenario-preview.tsx`
  - `lib/ai/scenarios.ts` — `generateScenarioGoals({ situation, theirRole, myRole, memo })` returns `{ summary, goals: [{id, en, ko}, …] }`
  - `app/scenarios/actions.ts` — `createScenario` (preview "시작하기" 클릭 시 실제 DB insert + conversation 인스턴스 생성)
  - `components/scenarios/scenario-form.test.tsx`, `scenario-preview.test.tsx`
- **수용 기준**:
  - [ ] 상황·상대방 역할·내 역할 중 하나라도 비어 있으면 "다음" 버튼은 비활성화 (`data-disabled`)
  - [ ] 4개 필드 채우고 "다음" → 로딩 상태(`Spinner`) → 미리보기 화면으로 전환
  - [ ] 미리보기에 시나리오 1줄 요약 텍스트가 보인다
  - [ ] 미리보기에 목표 카드 3개가 보이고, 각 카드는 영어 행동 + 한국어 부연 형식이다
  - [ ] 각 목표 카드 우측에 ↻ 재생성 버튼이 있고, 카드에 텍스트 편집 input은 없다
  - [ ] ↻ 클릭 → 해당 목표만 새 텍스트로 갱신된다 (나머지 2개는 그대로)
  - [ ] 미리보기 "시작하기" 클릭 → DB에 scenario + conversation insert + `/conversations/{id}`로 이동
- **검증**:
  - `bun run test -- components/scenarios`
  - `bun run build`
  - Browser MCP — 폼 → 미리보기 → DB row 확인, 증거 `artifacts/flyn/evidence/task-4-preview.png`

---

### Task 5: ✨ AI 자동 채움 (필드별·전체) + 맥락 기반 추천 칩

- **담당 시나리오**: Scenario 4 (full)
- **크기**: M (3 파일)
- **의존성**: Task 4 (폼이 존재해야)
- **참조**:
  - `ai-sdk` — `generateText` + `Output.object` (필드별 단일 텍스트) / `Output.array` (5-7개 칩)
  - 와이어프레임 screen-2 (scenario-4 토글)
- **구현 대상**:
  - `components/scenarios/sparkle-button.tsx` (✨ — 필드 옆 + 헤더 "AI에게 전부 맡기기")
  - `components/scenarios/recommendation-chips.tsx` (디바운스 갱신 + 가로 스크롤)
  - `lib/ai/scenarios.ts` 확장 — `fillField({ field, context })`, `suggestChips({ field, context })`
  - `app/api/scenarios/suggest/route.ts` (필드 채움·칩 생성 통합 endpoint)
  - 기존 테스트 확장
- **수용 기준**:
  - [ ] 다른 필드가 비어 있어도 필드 옆 ✨ 버튼은 활성 (클릭 가능)
  - [ ] 필드 옆 ✨ 클릭 → 해당 필드만 채워지고 다른 필드는 그대로
  - [ ] 폼 헤더의 "AI에게 전부 맡기기" 클릭 → 상황·상대방 역할·내 역할 3 필수 필드가 모두 채워진다
  - [ ] 추천 칩은 윗 필드 값을 컨텍스트로 — 상황="카페에서"일 때 상대방 역할 칩에 "바리스타", "매니저", "단골 손님" 등이 보이고 "엔지니어", "교수" 같은 무관 텍스트는 보이지 않는다
  - [ ] 윗 필드가 비어 있는 동안 그 아래 필드의 칩 영역이 표시되지 않는다
  - [ ] 첫 필드(상황)에는 추천 칩이 표시되지 않는다 (윗 필드가 없음)
  - [ ] 윗 필드 값이 바뀌면 아래 필드 칩이 디바운스 후 갱신된다
  - [ ] 채워진 칩 영역은 가로 스크롤 가능하고 5-7개 칩이 보인다 (`overflow-x-auto`)
  - [ ] 칩에 "AI 생성"·"맞춤 추천" 같은 별도 라벨이 붙지 않는다 (칩 텍스트만 표시)
  - [ ] 칩 클릭 → 해당 텍스트가 필드 input에 입력된다
  - [ ] 메모 필드에 추천 칩이 없다
- **검증**:
  - `bun run test -- scenarios` (mock된 `/api/scenarios/suggest`)
  - Browser MCP — 상황 칩 변경 → 아래 칩 갱신 흐름 확인, 증거 `artifacts/flyn/evidence/task-5-chips.png`

---

### Task 6: 시나리오 생성 취소

- **담당 시나리오**: Scenario 5 (full)
- **크기**: S (2 파일)
- **의존성**: Task 4
- **참조**:
  - `shadcn` — `AlertDialog`
  - Next.js — `beforeunload` 핸들러는 SPA 네비게이션에서는 동작 X — 라우터 이벤트 가로채기 필요
- **구현 대상**:
  - `components/scenarios/unsaved-changes-guard.tsx`
  - `components/scenarios/scenario-form.tsx` 확장 (dirty 상태 추적)
- **수용 기준**:
  - [ ] 폼에 1개라도 입력 후 사이드바 항목 클릭 → "이 시나리오를 저장하지 않을까요?" AlertDialog
  - [ ] "저장 안 함" → 입력 폐기 + 사이드바 이동 라우트로 진입
  - [ ] "계속 작성" → 모달 닫힘, 폼이 그대로 유지된다 (입력값 보존)
- **검증**:
  - `bun run test -- unsaved-changes-guard`
  - Playwright `e2e/scenarios.spec.ts` — 입력 → 사이드바 클릭 → 모달 확인

---

### Checkpoint: Tasks 4-6 이후
- [ ] 모든 테스트 통과 + 빌드
- [ ] **end-to-end 동작**: 로그인 → 빈 상태 → "+ 새 시나리오" → 폼 작성 (AI 자동 채움 가능) → 미리보기 → 시작 → 채팅 라우트로 도착 (다음 Task에서 실 화면 구성). 이탈 시 확인 모달.

---

### Task 7: 시나리오 시작 → AI 첫 발화 → 채팅 입력 동작

- **담당 시나리오**: Scenario 6 (full), Scenario 23 (full)
- **크기**: M (5 파일)
- **의존성**: Tasks 1, 3 (사이드바 shell 안에서 렌더), 4 (conversation row 존재)
- **참조**:
  - `ai-sdk` — `streamText`, `toUIMessageStreamResponse`, `useChat` 최신 API (`transport: DefaultChatTransport`, input state 수동, `sendMessage`)
  - `shadcn` — `@ai-elements` 레지스트리 `prompt-input`, `conversation`, `message`
  - 와이어프레임 screen-4 (채팅)
- **구현 대상**:
  - `@ai-elements` 추가: `bunx --bun shadcn@latest add @ai-elements/conversation @ai-elements/message @ai-elements/prompt-input`
  - `app/conversations/[id]/page.tsx` (RSC — conversation + scenario fetch → Client `ChatView`로 전달)
  - `components/chat/chat-view.tsx` (`"use client"` — useChat, goal bar, message list, prompt input)
  - `components/chat/goal-bar.tsx` (3 체크박스 헤더)
  - `components/chat/prompt-input.tsx` (`@ai-elements` 래핑 — 5줄 자동 확장, IME, 500자, 비활성화 조건)
  - `app/api/chat/route.ts` — 시스템 프롬프트 = "You are <theirRole> in <situation>… 1-2 sentence reply, no narration"
  - 첫 진입 시 AI 첫 발화 생성: conversation에 첫 assistant 메시지가 없으면 서버에서 미리 생성해 DB에 저장하고 RSC가 함께 fetch
  - `chat-view.test.tsx`, `prompt-input.test.tsx`
- **수용 기준**:
  - [ ] `/conversations/{id}` 진입 시 AI 첫 메시지 버블이 이미 표시되어 있다 (사용자가 입력하기 전)
  - [ ] AI 메시지 버블에 캐릭터 이름 라벨("Barista" 등)이 표시되지 않는다
  - [ ] 채팅 헤더 아래에 ⚪ 체크박스 3개 + 각 옆에 한국어 부연 텍스트가 표시된다
  - [ ] 입력창 placeholder가 "영어로 메시지 입력... (막히면 한국어로 써도 돼요)"이다
  - [ ] 진입 직후 입력창에 키보드 포커스가 들어 있다 (`document.activeElement === textarea`)
  - [ ] Enter 단독 → 전송
  - [ ] Shift+Enter → 줄바꿈 (textarea height 증가)
  - [ ] 한글 IME 조합 중 Enter → 전송 안 됨 (`isComposing` 체크)
  - [ ] 입력창 높이가 1-5줄 범위에서 자동 확장
  - [ ] 입력창 빈 상태 → 종이비행기 버튼 disabled
  - [ ] 500자 근접 시 시각적 경고 (예: 글자수 카운터 색상 변경)
  - [ ] AI 응답 스트리밍 중 전송 버튼 disabled + Enter 무효
  - [ ] 사용자 메시지 전송 → AI 응답이 토큰 단위로 스트리밍 표시된다
  - [ ] AI 응답에 "[smiles]", "*nods*" 등 메타 텍스트가 포함되지 않는다 (프롬프트 룰)
- **검증**:
  - `bun run test -- chat`
  - `bun run test:e2e -- chat.spec.ts` (Playwright — IME, Shift+Enter, 500자 경고)
  - Browser MCP — 첫 진입 + 메시지 전송 1회, 증거 `artifacts/flyn/evidence/task-7-chat-first.png`

---

### Task 8: 분석 호출 (✱/💡) + 라벨드 섹션 + 마이너 오타 통과 + 병렬 진행

- **담당 시나리오**: Scenario 7 (full), 8 (full), 9 (full), 10 (full). 불변 규칙 §데이터 일관성, §응답 속도.
- **크기**: M (5 파일)
- **의존성**: Task 7
- **참조**:
  - `ai-sdk` — `generateText` + `Output.object(analysisSchema)`
  - `shadcn` — `Collapsible` (라벨드 섹션 펼침/접힘)
  - `vercel-react-best-practices` — 메시지 리스트 메모이제이션
- **구현 대상**:
  - `app/api/analysis/route.ts` (`generateText` + `Output.object({ correction: {…}, goals_achieved: number[] })`)
  - `lib/ai/analysis.ts` — `analysisSchema` zod + 시스템 프롬프트 ("이해 가능성 기준, 마이너 오타 무시, ✱와 💡 동시 X — ✱ 우선")
  - `components/chat/message-bubble.tsx` (사용자/AI 분기, 마크 아이콘, correction 섹션 슬롯)
  - `components/chat/labeled-section.tsx` (Collapsible — ✱/💡/🌐 공통, 헤더 + 본문, 기본 펼침, 접기 가능)
  - `components/chat/chat-view.tsx` 확장 — 메시지 전송 시 `/api/chat`와 `/api/analysis`를 **병렬** 호출, 분석 결과를 메시지에 머지
  - DB 업데이트: 분석 결과 도착 시 `messages.correction` 컬럼에 저장
  - `labeled-section.test.tsx`, `analysis.test.ts`
- **수용 기준**:
  - [ ] "Hi, can I order a latte?" 전송 → 분석 완료 후 사용자 버블에 ✓가 붙고, 라벨드 섹션은 표시되지 않는다
  - [ ] "I go to school yesterday" 전송 → 분석 완료 후 같은 버블 안에 "✱ 교정" Collapsible이 펼친 상태로 나타나고, 본문에 교정문과 한국어 설명이 보인다
  - [ ] Collapsible 헤더 우측의 ⌃/⌄ 토글 클릭 → 본문이 접히거나 펼쳐진다
  - [ ] 메시지별 펼침/접힘 상태가 컴포넌트 리렌더링 후에도 유지된다 (`localStorage` 또는 메시지 단위 state)
  - [ ] "I would like to purchase coffee, please" 전송 → "💡 대안" Collapsible이 표시되고, 본문에 자연스러운 대안 + 한국어 설명이 보인다
  - [ ] "I want a coffe"(오타) 전송 → ✓만 표시되고 라벨드 섹션은 없다 (마이너 오타 통과)
  - [ ] 한 버블에 ✱와 💡가 동시에 표시되지 않는다 (✱ 우선)
  - [ ] 사용자 메시지 텍스트는 분석 결과와 무관하게 원본 그대로 표시된다
  - [ ] **불변 규칙**: AI 채팅 응답의 첫 토큰이 분석 결과 도착 전에 화면에 표시될 수 있다 (네트워크 인스펙터 또는 타이밍 로그로 검증)
  - [ ] AI 응답은 원본(교정 전) 텍스트에 대해 답한다 (예: "I go to school yesterday"에 시제 보정 없이 응답)
- **검증**:
  - `bun run test -- analysis labeled-section message-bubble`
  - `bun run test:e2e -- chat-correction.spec.ts` (mock된 `/api/analysis` 응답으로 3가지 status 케이스)
  - Browser MCP — 실제 LLM으로 ✱/💡/마이너 오타 각 1회, 타이밍은 Network 탭에서 chat 응답 시점 < analysis 응답 시점 확인 (스크린샷 + 네트워크 로그 `artifacts/flyn/evidence/task-8-*.png`)

---

### Task 9: 한국어 → 영어 변환 미리보기 + 🌐 섹션

- **담당 시나리오**: Scenario 11 (full), 12 (full)
- **크기**: M (3 파일)
- **의존성**: Tasks 7, 8 (labeled-section 재사용)
- **참조**:
  - `ai-sdk` — `generateText` + `Output.object({en: string})`
  - 와이어프레임 screen-4 (Scenario 11/12 토글이 있다면) — 입력창 위 미리보기 카드
- **구현 대상**:
  - `app/api/translate/route.ts`
  - `lib/ai/translate.ts`
  - `components/chat/translation-preview.tsx` (입력창 위 카드 — "→ I went to school" + "이걸로 보내기" 버튼)
  - `components/chat/prompt-input.tsx` 확장 — 한글 감지 + 디바운스 500ms + 미리보기 상태 관리 + Enter 시 영어 전송
  - `components/chat/message-bubble.tsx` 확장 — 한글 원본 + 🌐 섹션 (labeled-section 재사용)
- **수용 기준**:
  - [ ] 입력창에 "학교 갔어" 입력 + 500ms 정지 → 입력창 위에 카드 "→ I went to school" + "이걸로 보내기" 버튼이 보인다
  - [ ] 카드 "보내기" 클릭 → 사용자 버블이 채팅에 추가되고, 메인 텍스트는 한글 원본 "학교 갔어"
  - [ ] 같은 버블 안에 🌐 Collapsible 섹션(펼침)에 영어 번역이 표시된다
  - [ ] 🌐 섹션이 있는 버블에 ✱·💡 마크가 붙지 않는다
  - [ ] AI 응답은 영어 변환 문장 ("I went to school") 의미에 맞춰진다 (외부 관찰: 응답이 학교 맥락에 맞음)
  - [ ] 미리보기가 떠 있는 상태에서 Enter → 영어 변환문이 전송된다 (한글 단독 버블 생성 X)
- **검증**:
  - `bun run test -- translate translation-preview`
  - Browser MCP — 한글 입력 → 미리보기 → 전송 → 버블 검증, 증거 `artifacts/flyn/evidence/task-9-translate.png`

---

### Checkpoint: Tasks 7-9 이후
- [ ] 모든 테스트 통과 + 빌드
- [ ] **end-to-end 동작**: 시나리오 시작 → AI 첫 발화 → 영어 메시지 전송 (✓/✱/💡 분기) → 한글 메시지 전송 (🌐 변환) → AI 응답 정상 — 4가지 마크 모두 살아있고, 채팅이 분석에 블록되지 않는다.

---

### Task 10: 목표 평가 실시간 + 3/3 달성 종료 권유

- **담당 시나리오**: Scenario 13 (full), 14 (full). 불변 규칙 §데이터 일관성 (목표 역행 금지).
- **크기**: S (2 파일)
- **의존성**: Task 8 (`/api/analysis`가 이미 `goals_achieved`를 반환)
- **참조**:
  - `shadcn` — `Dialog` (종료 권유 모달), `Badge`/`Checkbox` 시각화
  - Framer Motion이 없으므로 CSS transition으로 200ms 펄스
- **구현 대상**:
  - `components/chat/goal-bar.tsx` 확장 — ⚪ → ✓ 전환 + 200ms 펄스 클래스
  - `components/chat/completion-prompt-dialog.tsx` (3/3 달성 모달 — "끝내기" / "더 대화")
  - `app/scenarios/actions.ts` 확장 — `completeConversation` (status → completed, completed_at)
  - DB: `conversations.goals_achieved`를 union으로 누적 업데이트
- **수용 기준**:
  - [ ] "Can I get a small latte, please?" 전송 → 분석 완료 시 해당 메시지로 달성된 목표가 ⚪에서 ✓로 전환되고 짧은 펄스 애니메이션이 발동한다
  - [ ] 한 메시지로 여러 목표가 동시에 ✓로 전환될 수 있다
  - [ ] 한 번 ✓로 전환된 목표는 다음 메시지에서 다시 ⚪로 돌아가지 않는다 (`union` 누적)
  - [ ] 3/3 달성 직후 "목표 다 했어요! 끝낼까요?" Dialog가 자동 표시된다 (1회)
  - [ ] "끝내기" → conversation status = completed, 사이드바 진행 중에서 사라지고 히스토리에 나타난다
  - [ ] "더 대화" → 모달 닫힘, 채팅 계속 가능, 목표 3/3 ✓ 유지
  - [ ] 자동으로 입력창이 비활성화되거나 라우트가 바뀌지 않는다
- **검증**:
  - `bun run test -- goal-bar completion-prompt-dialog`
  - Browser MCP — 시나리오 전체를 실제로 클리어해서 모달 표시 + "더 대화" / "끝내기" 분기 확인 (실 LLM 사용), 증거 `artifacts/flyn/evidence/task-10-completion.png`

---

### Task 11: 시나리오 인스턴스 관리 (이어서/새로/중도 종료/히스토리 읽기)

- **담당 시나리오**: Scenario 18 (full), 19 (full), 20 (full)
- **크기**: M (4 파일)
- **의존성**: Tasks 3, 8, 10
- **참조**:
  - `shadcn` — `AlertDialog` (중도 종료 확인), `Button` 큰 변형
  - 와이어프레임 screen-5 (히스토리 읽기), screen-6 (이어서/새로)
- **구현 대상**:
  - `app/scenarios/[id]/page.tsx` (RSC — 시나리오 + 진행 중 인스턴스 조회 → 옵션 화면 또는 자동 이어서)
  - `components/scenarios/resume-or-new.tsx` ("이어서 하기" / "새로 시작" 카드)
  - `app/conversations/[id]/history/page.tsx` (RSC — 읽기 전용 채팅 렌더)
  - `components/chat/chat-end-menu.tsx` (헤더 "종료" 메뉴 + 중도 종료 모달)
  - `app/scenarios/actions.ts` 확장 — `startNewConversation`, `abortInProgress`
- **수용 기준**:
  - [ ] 진행 중 인스턴스가 있는 시나리오를 사이드바에서 클릭 → "이어서 하기" / "새로 시작" 두 옵션 화면
  - [ ] "이어서 하기" → 기존 인스턴스의 `/conversations/{id}`로 진입 + 메시지·목표 상태 보존
  - [ ] "새로 시작" → 기존 인스턴스 자동 종료(`status = completed`) + 새 인스턴스 시작
  - [ ] 같은 시나리오에 동시에 진행 중 인스턴스는 최대 1개 (DB 제약 또는 트랜잭션)
  - [ ] 채팅 헤더의 "종료" 메뉴 클릭 → "목표 X/3 달성, 정말 종료할까요?" 확인 모달 (X = 현재 달성 수)
  - [ ] 모달 "취소" → 모달 닫힘, 채팅 계속
  - [ ] 모달 "종료" → conversation은 `in_progress` 그대로 유지 (히스토리로 가지 않음), 사이드바에 ▸ 유지
  - [ ] Task 10의 "끝내기" → conversation status = `completed`, 사이드바 해당 시나리오의 ▸ 인디케이터가 사라진다 (Task 10 흐름과 정합)
  - [ ] 히스토리 항목 클릭 → 과거 채팅이 전체 렌더되고, 입력창이 비활성 또는 미표시
  - [ ] 히스토리 화면에서 ✱/💡/🌐 섹션의 펼침/접힘 토글 가능
  - [ ] 히스토리 화면 상단의 "다시 시작하기" 클릭 → 같은 시나리오의 새 인스턴스 시작 (진행 중이 있으면 옵션 화면)
- **검증**:
  - `bun run test -- resume-or-new chat-end-menu`
  - `bun run test:e2e -- scenario-lifecycle.spec.ts`
  - Browser MCP — 진행 중 → 이어서/새로 분기, 중도 종료 모달, 히스토리 보기

---

### Task 12: 더 알아보기 사이드 패널 (코치 페르소나)

- **담당 시나리오**: Scenario 15 (full), 16 (full), 17 (full). 불변 규칙 §격리.
- **크기**: M (3 파일)
- **의존성**: Task 8 (라벨드 섹션에 트리거 버튼 추가)
- **참조**:
  - `shadcn` — `Sheet side="right"` (데스크탑) / `Drawer` (모바일), `useMediaQuery` 또는 Tailwind 조건부
  - `ai-sdk` — 별도 `useChat` 세션 (격리), `streamText` + `toUIMessageStreamResponse`
- **구현 대상**:
  - `components/chat/learn-more-panel.tsx` (Sheet/Drawer 분기, 시드 메시지, 자주 묻는 질문 칩 3개)
  - `app/api/coach/route.ts` (시스템 프롬프트 = "한국어로 답하는 언어 코치, 영어 예시는 영어 그대로 인용")
  - `components/chat/labeled-section.tsx` 확장 — "더 알아보기 →" 버튼
- **수용 기준**:
  - [ ] 펼친 ✱ 섹션 안의 "더 알아보기 →" 클릭 → 데스크탑 폭에서 우측 Sheet(폭 ~420px)이 슬라이드인
  - [ ] 모바일 폭에서는 Drawer가 하단에서 50-70% 높이로 올라온다
  - [ ] 헤더에 "맥락 중인 교정" 카드(원문 + 교정문 요약)가 표시된다
  - [ ] 시드 영역에 "이 교정에 대해 궁금한 점이 있나요?"와 칩 3개 ("왜 이게 틀려?", "다른 표현은?", "비슷한 예시")가 보인다
  - [ ] 패널 바깥(메인 채팅) 클릭 → 패널이 닫히지 않는다
  - [ ] X 버튼 클릭 → 패널이 닫힌다
  - [ ] Esc 키 → 패널이 닫힌다
  - [ ] 칩 또는 직접 한국어 질문 전송 → 코치 응답이 한국어로 스트리밍된다
  - [ ] 코치 응답 안의 영어 예시 인용은 영어 그대로 표시된다 (한국어로 번역되지 않음)
  - [ ] 패널 내부 대화가 메인 채팅에 새 버블을 추가하지 않는다 (메인 메시지 수 변화 없음)
  - [ ] 패널 내부 대화 중 메인 채팅의 목표 진행 상태가 변하지 않는다
  - [ ] 패널 닫고 같은 ✱의 "더 알아보기"를 다시 열면, 이전 메시지 이력이 보이지 않고 시드 상태부터 시작
- **검증**:
  - `bun run test -- learn-more-panel`
  - `bun run test:e2e -- learn-more.spec.ts` (mock된 coach API 응답)
  - Browser MCP — 데스크탑·모바일 둘 다, 격리 동작 확인, 증거 `artifacts/flyn/evidence/task-12-{desktop,mobile}.png`

---

### Task 13: 시나리오 편집 + 삭제

- **담당 시나리오**: Scenario 21 (full), 22 (full)
- **크기**: M (3 파일)
- **의존성**: Tasks 4, 11
- **참조**:
  - `shadcn` — `DropdownMenu` (호버 메뉴), `AlertDialog` (삭제 확인)
- **구현 대상**:
  - `app/scenarios/[id]/edit/page.tsx` (RSC — 기존 값 prefill해 ScenarioForm 재사용)
  - `components/scenarios/scenario-actions.tsx` (호버 메뉴 — 편집/삭제)
  - `app/scenarios/actions.ts` 확장 — `updateScenario`, `deleteScenario` (cascade)
- **수용 기준**:
  - [ ] 사이드바 시나리오 항목 호버 → ⋯ 메뉴 트리거 표시
  - [ ] 메뉴 "편집" 클릭 → 메인 영역에 생성과 동일한 폼이 열리고 기존 값이 prefill되어 있다
  - [ ] 편집 폼 저장 → 사이드바 표시 텍스트가 갱신되고, 기존 인스턴스 메시지는 보존된다
  - [ ] 메뉴 "삭제" 클릭 → "이 시나리오와 모든 대화 기록을 삭제할까요?" AlertDialog
  - [ ] 확인 → 시나리오 + 관련 conversations + messages가 모두 사라진다 (사이드바 "내 시나리오"와 "히스토리" 양쪽에서)
  - [ ] 진행 중 시나리오와 종료된 시나리오 모두 삭제 메뉴가 보인다
  - [ ] 삭제 후 undo UI(토스트 액션·되돌리기 버튼 등)가 표시되지 않는다 (AlertDialog가 유일한 보호 장치)
- **검증**:
  - `bun run test -- scenario-actions`
  - `bun run test:e2e -- scenario-edit-delete.spec.ts`
  - DB 확인: 삭제 후 `SELECT count(*) FROM conversations WHERE scenario_id = '<deleted>';` → 0

---

### Task 14: 실패 처리 + 히스토리 전체 보기

- **담당 시나리오**: Scenario 24 (full), 25 (full), 28 (full)
- **크기**: M (3 파일)
- **의존성**: Tasks 8, 11
- **참조**:
  - `next-best-practices` — `error.tsx`, `unstable_rethrow`, route handler timeout 패턴
  - `ai-sdk` — `AbortController` + timeout
- **구현 대상**:
  - `components/chat/retry-banner.tsx` (사용자 버블 옆 "다시 시도" 버튼 + 텍스트 보존)
  - `app/api/chat/route.ts`, `app/api/analysis/route.ts` 확장 — 30s / 10s 타임아웃 + 에러 응답
  - `app/history/page.tsx` (전체 히스토리 페이지 + 페이지네이션)
  - `components/sidebar/app-sidebar.tsx` 확장 — 히스토리 30개 초과 시 "전체 보기" 링크
- **수용 기준**:
  - **Scenario 24**: 채팅 호출이 실패하면 사용자 버블이 사라지지 않고, 옆에 "다시 시도" 버튼이 표시된다 (mock 실패로 검증)
  - [ ] "다시 시도" 클릭 → 같은 텍스트로 재전송, 성공 시 정상 진행
  - [ ] 채팅 호출 30초 응답 없음 → 같은 실패 UI 발동
  - [ ] 반복 실패해도 채팅 화면이 무한 로딩에 빠지지 않는다 (input 다시 활성화)
  - **Scenario 25**: 분석 호출만 실패 (10초 타임아웃 또는 에러) → 사용자 버블에 ✱/💡/✓ 어떤 마크도 붙지 않고 채팅은 계속된다
  - [ ] 분석 실패 시 목표 진행 상태가 갱신되지 않는다 (이전 상태 유지)
  - [ ] 분석 실패가 화면 어디에도 큰 에러 메시지로 표시되지 않는다 (조용한 fallback)
  - [ ] 다음 메시지를 정상 전송할 수 있다
  - **Scenario 28**: 히스토리 31개 이상에서 사이드바 히스토리 섹션에 30개만 보이고 하단에 "전체 보기" 링크
  - [ ] "전체 보기" 클릭 → `/history`로 이동, 모든 종료된 인스턴스 목록이 페이지네이션과 함께 표시된다
- **검증**:
  - `bun run test -- retry-banner` (mock된 실패 응답)
  - `bun run test:e2e -- failure-handling.spec.ts` (chat·analysis 실패 mock)
  - Browser MCP — DevTools Network throttling으로 실 실패 1회 검증, 증거 `artifacts/flyn/evidence/task-14-retry.png`

---

### Final Checkpoint: Task 14 이후
- [ ] 모든 테스트 통과: `bun run test`
- [ ] E2E 통과: `bun run test:e2e`
- [ ] 빌드 성공: `bun run build`
- [ ] spec의 28개 시나리오 전체 수용 기준이 plan의 어느 Task에 매핑되어 있다 (커버리지 표 — 아래)
- [ ] 4개 불변 규칙이 명시적으로 검증되었다 (Task 1: 보안/프라이버시, Task 8: 데이터 일관성·응답 속도, Task 12: 격리)

---

## 시나리오 ↔ Task 커버리지

| Scenario | Task | Scenario | Task |
|---|---|---|---|
| 1. 로그인 | 2 | 15. 더 알아보기 열기 | 12 |
| 2. 빈 상태 | 3 | 16. 코치 응답 | 12 |
| 3. 시나리오 폼 (수동) | 4 | 17. 닫으면 소실 | 12 |
| 4. ✨ AI 자동 채움 | 5 | 18. 이어서/새로 | 11 |
| 5. 생성 취소 | 6 | 19. 중도 종료 | 11 |
| 6. AI 첫 발화 | 7 | 20. 히스토리 읽기 | 11 |
| 7. ✓ 정상 | 8 | 21. 시나리오 삭제 | 13 |
| 8. ✱ 교정 | 8 | 22. 시나리오 편집 | 13 |
| 9. 💡 대안 | 8 | 23. 채팅 입력 동작 | 7 |
| 10. 마이너 오타 | 8 | 24. 채팅 실패 | 14 |
| 11. 한→영 미리보기 | 9 | 25. 분석 실패 | 14 |
| 12. 한글 Enter | 9 | 26. 사이드바 토글 (데스크탑) | 3 |
| 13. 목표 평가 | 10 | 27. 사이드바 (모바일) | 3 |
| 14. 3/3 종료 권유 | 10 | 28. 히스토리 전체 보기 | 14 |

## 미결정 항목 (구현 시 결정)

- **에러 상태 UI 카피** (Scenario 14의 §15 Future Work): 토스트 vs 인라인 vs 모달 — Task 14 구현 시 `sonner` 토스트 일관 적용으로 잠정 채택
- **한국어 감지 정밀도** (spec §미결정): "한 글자라도 한글이면 미리보기 시도" 기본 가정 — Task 9 구현 시 IME 조합 끝난 직후 정규식 `/[가-힯ᄀ-ᇿ]/` 사용
- **온보딩**: 큰 CTA + 예시 칩으로 충분 가정 (Task 3) — 추후 사용 데이터 보고 결정
- **로그아웃 메뉴 위치**: 사이드바 하단 사용자 아바타 → `DropdownMenu` (Task 3 구현 시 잠정 배치)
- **AI 시스템 프롬프트 정확한 가이드라인**: 시나리오 페르소나 / 교정 룰북 / 코치 페르소나 — 각 Task의 `lib/ai/*.ts`에서 첫 안 작성 후 사용자 리뷰
- **Scenario 18 "새로 시작" 시 기존 인스턴스 처리**: 자동 종료(`completed`)로 채택 (Task 11) — 사용자 확인 모달 추가 여부는 후속
- **iOS Safari viewport / PWA**: 범위 밖, 추후

## 사전 셋업 체크 (사용자가 Task 1 시작 전 완료해야 함)

- [ ] Supabase 프로젝트 생성 + Google provider 활성화
- [ ] Google Cloud Console에서 OAuth 2.0 Client 생성, 콜백 URL = `https://<ref>.supabase.co/auth/v1/callback`, Site URL 등록
- [ ] Vercel AI Gateway API 키 발급
- [ ] `.env.local`에 4개 키 입력: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `AI_GATEWAY_API_KEY`
- [ ] Supabase CLI 설치 + `supabase login` + `supabase link --project-ref <ref>`
