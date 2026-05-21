# Flyn — execute-plan learnings

> Compound Engineering 메모. 약한 신호는 여기 누적되어 `/compound`가 회고로 분석한다.

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
