# Flyn — execute-plan learnings

> Compound Engineering 메모. 약한 신호는 여기 누적되어 `/compound`가 회고로 분석한다.

---

## Task 3 — `vitest`가 `e2e/*.spec.ts`를 잡음

---
category: tooling
applied: not-yet
---
## vitest exclude 패턴에 `e2e/**` 추가 필요

**상황**: Task 3 첫 `bun run test` 시 9 vitest 파일 중 1개 실패 — `e2e/*.spec.ts`가 Playwright 스펙인데 vitest이 jsdom으로 잡아 실행했다.
**판단**: `vitest.config.ts`의 exclude에 `"e2e/**"` 추가. 기본 exclude는 `node_modules` 뿐이라 Playwright 스펙이 잡힌다.
**다시 마주칠 가능성**: 높음 — Vitest + Playwright 공존 setup에서 매 신규 프로젝트 반복.

## Task 7 — `convertToModelMessages` 비동기, AI SDK 6.x

---
category: tooling
applied: not-yet
---
## `convertToModelMessages`는 Promise 반환

**상황**: Task 7 `/api/chat` 빌드 시 type error — `Type 'Promise<ModelMessage[]>' is missing properties from 'ModelMessage[]'`.
**판단**: `ai@6.x`에서 `convertToModelMessages`가 async. `await` 필수. 메모리 속 v5 API 패턴(동기)은 잘못된 가정.
**다시 마주칠 가능성**: 높음 — 새 AI SDK 채택 시 메모로 가진 API 시그너처가 그대로 유효한지 항상 검증.

## Task 7 — `sendMessage`에 id 직접 못 줌

---
category: tooling
applied: not-yet
---
## `useChat.sendMessage`로 id를 통제하려면 명시적 `CreateUIMessage` 형식 사용

**상황**: 분석 호출과 메시지 id를 매칭하려면 client가 messageId 통제해야 했다. `sendMessage({id, text})`는 type error.
**판단**: `sendMessage`의 두 시그너처 중 shorthand는 `{text}` 또는 `{files}`만 허용. id 부여하려면 `{id, role, parts: [{type:"text", text}]}` 형식 사용.
**다시 마주칠 가능성**: 중간 — useChat으로 client-server id 매칭이 필요한 모든 케이스에서 재발.

## Task 3 — hand-written `Database` type이 PostgREST embedding 못 추론

---
category: tooling
applied: not-yet
---
## supabase 클라이언트 nested select 타입은 `Relationships`가 필요

**상황**: `from("conversations").select("*, scenarios(...)")` 시 nested 결과가 `never[]`로 추론. Relationships가 비어 있어서.
**판단**: 두 query로 분리(JOIN을 application code에서). 본격 해결은 `supabase gen types typescript --linked`로 자동 생성된 타입 사용.
**다시 마주칠 가능성**: 높음 — Supabase 프로젝트 셋업 직후 hand-written 타입 단계에서 항상 발생. 권장: link 직후 첫 마이그레이션 적용 후 즉시 `supabase gen types` 실행.

## Task 10 — setState 안에서 다른 setState 호출 금지

---
category: code-review
applied: rule
---
## state updater 콜백 안에서는 다른 컴포넌트의 setter 호출하지 않는다

**상황**: Task 10 구현 시 `setAchievedGoalIds(prev => { ...; setCompletionPromptOpen(true); return arr })` 패턴을 썼다. advisor가 지적: React StrictMode·concurrent rendering에서 unsafe.
**판단**: updater는 순수 함수여야 한다. derived 트리거는 `useEffect`로 옮긴다. fix 후 `bun run build` 통과. `.claude/rules/react-state-updates.md`로 즉시 승격됨.
**다시 마주칠 가능성**: 높음 — React 진영의 흔한 함정. 모든 프로젝트에 적용되는 일반 규칙.

## Final — code-reviewer Critical/Important 결과

---
category: code-review
applied: not-yet
---
## 14-Task 한 세션 구현이 머지 가능한 수준이지만 머지 전 추가 가드 필요

**상황**: 모든 Task 완료 후 code-reviewer 호출. 결과:
- **Critical 2** (즉시 fix함):
  - `/api/chat` `onFinish` 멱등성 — retry 시 assistant 메시지 중복. 사전 생성한 id로 `existing` 체크 추가.
  - `/api/analysis` UPDATE 소유권 — `eq("conversation_id", conversationId)` 추가.
- **Important 1** (즉시 fix함):
  - `proxy.ts`의 `proxyConfig` → `config`. Next 16은 `config`만 인식.
- **Important 미적용** (다음 feature 또는 후속 PR):
  - goals_achieved read-modify-write race. 단기엔 클라이언트 직렬화로 막힘.
  - `/api/translate`, `/api/analysis` input 길이 제한 없음.
  - request body `as` 단언 → zod parse.
**판단**: 한 세션·14 Task·~3500 LOC는 코드리뷰 surface가 너무 크다. 사용자에게 PR로 단계별 review 받기를 권고. Critical은 머지 전 처리됐다.
**다시 마주칠 가능성**: 중간 — 큰 feature를 한 세션에 묶을지 split할지의 의사결정 신호. 다음 feature에서 spec→plan 단계에 review 단위 명시 고려.

## Task 1 — `supabase db query` 기본 local

---
category: tooling
applied: rule
---
## remote 검증엔 `--linked` 명시

(상세는 위 Task 1 섹션. compound 회고 시 같은 카테고리로 묶일 후보.)

---

## Task 1 — 인프라 부트스트랩

---
category: tooling
applied: not-yet
---
## supabase db query는 기본 local — remote 검증엔 `--linked` 필수

**상황**: Task 1 검증 단계. 마이그레이션 `db push` 성공 후 `db query "..."`로 `pg_policies`를 조회했더니 다른 프로젝트(cohorts/projects/profiles)의 결과가 나왔다.
**판단**: `supabase db query`는 별 옵션 없을 때 local Docker DB에 연결한다. remote에 push한 마이그레이션을 검증하려면 `--linked` 플래그 필수. 다시 쿼리해 scenarios/conversations/messages × 4 policies = 12개 정책 확인.
**다시 마주칠 가능성**: 높음 — `db push` 후 검증이 plan의 acceptance 패턴에 반복 등장한다.

---
category: spec-ambiguity
applied: not-yet
---
## RLS isolation 자동 검증은 두 테스트 유저 필요 — 수동 검증으로 분리

**상황**: Task 1 acceptance "User A insert → User B SELECT 0 rows" 검증. 자동 테스트하려면 Supabase에 2개의 인증 사용자를 seed해야 하는데, 이번 단계에선 인증 흐름(Task 2) 자체가 없다.
**판단**: 코드 단 자동화 대신 manual verification 항목으로 분리. Task 2 완료 후 실제 Google 계정 2개로 로그인 → 한 계정으로 시나리오 생성 → 다른 계정으로 `/` 접근 시 빈 상태 확인하는 흐름으로 수동 검증한다. 코드에는 RLS 정책 자체가 `auth.uid() = user_id`로 단순해 우회 경로가 없음을 검증.
**다시 마주칠 가능성**: 중간 — 다중 사용자 격리 시나리오는 multi-tenant 앱에서 반복 등장. 정책 자체가 단순할 때는 manual verify로 충분.

---
category: tooling
applied: not-yet
---
## Next.js 16 + Supabase 새 키 체계 — plan의 가정 모두 일치

**상황**: Task 1 시작 전 advisor 권고로 plan의 framework·env·model 가정을 직접 검증.
**판단**:
- `proxy.ts`(Next 16) ✓ — `next-best-practices/file-conventions.md`에 명시.
- `AI_GATEWAY_API_KEY` env var ✓ — `node_modules/ai/dist/index.mjs`에서 "Unauthenticated. Configure AI_GATEWAY_API_KEY" 에러 메시지로 확인.
- `anthropic/claude-haiku-4.5`, `anthropic/claude-sonnet-4.6` model ID ✓ — `curl https://ai-gateway.vercel.sh/v1/models | jq` 결과에 둘 다 존재.
- `@supabase/ssr` v0.10.x는 새 `sb_publishable_*` 키를 두 번째 인자(anon key 위치)로 받는다. `createBrowserClient<Database>(URL, PUBLISHABLE_KEY)` 형태.

plan 추가 보정 없이 그대로 진행 가능했다. 진행 전 외부 사실 3개를 한 번에 검증한 덕에 코드 작성 후 되돌리는 일이 없었다.
**다시 마주칠 가능성**: 높음 — framework version·env var name·외부 API model ID는 plan 작성 시점과 실행 시점 사이에 자주 변한다. advisor가 권고한 "plan의 외부 사실 검증" 패턴은 모든 신규 feature 시작 시 1회 실행 가치가 있다.
