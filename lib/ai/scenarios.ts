import "server-only";

import { generateObject } from "ai";
import { z } from "zod";

import {
  ANALYSIS_MODEL,
  goalSchema,
  scenarioGenerationSchema,
  type Goal,
  type ScenarioGeneration,
} from "@/lib/ai/gateway";

export type ScenarioFields = {
  situation: string;
  theirRole: string;
  myRole: string;
  memo?: string | null;
};

const SYSTEM_PROMPT = `당신은 한국어 학습자(A2-B1 레벨)를 위한 영어 1:1 대화 시뮬레이션 디자이너입니다. 한국 학습자가 영어로 짧게 대화할 수 있는 시나리오에 대해 1줄 요약과 학습 목표 3개를 만듭니다.

학습 목표는 짧고(3-6단어 영어 행동), 구체적이고, 대화 안에서 관찰 가능해야 합니다. 영어 행동의 한국어 부연은 명령형이 아니라 명사형 구로 작성합니다.`;

function userPrompt(input: ScenarioFields): string {
  const memo = input.memo ? `\nMemo: ${input.memo}` : "";
  return `Situation: ${input.situation}
Their role: ${input.theirRole}
My role: ${input.myRole}${memo}

위 시나리오에 맞춰 한국어 1줄 요약("summary")과 학습 목표 3개("goals")를 만들어 주세요.
각 목표는 짧은 영어 행동("en")과 한국어 부연("ko") 한 쌍입니다.
JSON으로 반환합니다.`;
}

/**
 * Generate the 1-line summary + 3 learning goals from the form fields.
 * Called when the user clicks "다음" on the new-scenario form.
 */
export async function generateScenarioContent(
  input: ScenarioFields,
): Promise<ScenarioGeneration> {
  const { object } = await generateObject({
    model: ANALYSIS_MODEL,
    schema: scenarioGenerationSchema,
    system: SYSTEM_PROMPT,
    prompt: userPrompt(input),
  });

  return {
    summary: object.summary,
    goals: object.goals.map((g, i) => ({ id: i, en: g.en, ko: g.ko })),
  };
}

const singleGoalSchema = z.object({
  en: z.string(),
  ko: z.string(),
});

/**
 * Regenerate a single goal while keeping the other two locked. Used by the
 * ↻ button on each goal card in the preview.
 */
export async function regenerateGoal(input: {
  fields: ScenarioFields;
  existingGoals: Goal[];
  targetGoalId: number;
}): Promise<Goal> {
  const others = input.existingGoals.filter(
    (g) => g.id !== input.targetGoalId,
  );
  const othersText = others
    .map((g) => `- ${g.en} (${g.ko})`)
    .join("\n");

  const { object } = await generateObject({
    model: ANALYSIS_MODEL,
    schema: singleGoalSchema,
    system: SYSTEM_PROMPT,
    prompt: `${userPrompt(input.fields)}

이미 정의된 두 목표(중복하지 마세요):
${othersText}

위 두 목표와 겹치지 않는 새 학습 목표 하나(en + ko)를 만들어 주세요. JSON으로 반환합니다.`,
  });

  // Validate against the goal schema and reinject the original id.
  const goal = goalSchema.parse({
    id: input.targetGoalId,
    en: object.en,
    ko: object.ko,
  });
  return goal;
}

// =====================================================================
// Task 5 — field auto-fill + recommendation chips.
// =====================================================================

const filledFieldSchema = z.object({ value: z.string() });

/**
 * Fill a single form field given context from the already-filled fields.
 * Used by the ✨ button next to each field.
 */
export async function fillScenarioField(input: {
  field: "situation" | "their_role" | "my_role" | "memo";
  context: Partial<ScenarioFields>;
}): Promise<string> {
  const ctxLines = [
    input.context.situation && `Situation: ${input.context.situation}`,
    input.context.theirRole && `Their role: ${input.context.theirRole}`,
    input.context.myRole && `My role: ${input.context.myRole}`,
    input.context.memo && `Memo: ${input.context.memo}`,
  ]
    .filter(Boolean)
    .join("\n");

  const fieldKo = {
    situation: "상황 (예: 카페에서)",
    their_role: "상대방 역할 (예: 바리스타)",
    my_role: "내 역할 (예: 손님)",
    memo: "추가 메모 (자유 메모 1-2줄)",
  }[input.field];

  const { object } = await generateObject({
    model: ANALYSIS_MODEL,
    schema: filledFieldSchema,
    system:
      "한국 학습자를 위한 영어 회화 시나리오 폼의 한 필드를 자연스럽게 한 줄로 채워주세요. 한국어로 짧고 구체적으로 작성합니다.",
    prompt: `${ctxLines ? `현재 입력된 컨텍스트:\n${ctxLines}\n\n` : ""}이번에 채울 필드: ${fieldKo}

가장 자연스럽고 흔한 한 가지를 1줄로 작성해 주세요. JSON으로 반환합니다.`,
  });

  return object.value.trim();
}

const chipsSchema = z.object({
  chips: z.array(z.string()).min(5).max(7),
});

/**
 * Recommendation chips for a single field, based on the values of the
 * preceding fields. Empty list when there is no upstream context.
 */
export async function suggestFieldChips(input: {
  field: "their_role" | "my_role";
  context: Partial<ScenarioFields>;
}): Promise<string[]> {
  const ctxLines = [
    input.context.situation && `Situation: ${input.context.situation}`,
    input.context.theirRole && `Their role: ${input.context.theirRole}`,
  ]
    .filter(Boolean)
    .join("\n");

  if (!ctxLines) return [];

  const fieldKo = {
    their_role: "상대방 역할",
    my_role: "내 역할",
  }[input.field];

  const { object } = await generateObject({
    model: ANALYSIS_MODEL,
    schema: chipsSchema,
    system:
      "한국 학습자를 위한 영어 회화 시나리오 폼의 추천 칩을 만듭니다. 위 필드의 컨텍스트에 맞는 자연스러운 옵션 5-7개를 짧은 한국어 명사구로 제시합니다.",
    prompt: `컨텍스트:
${ctxLines}

이번에 추천할 필드: ${fieldKo}

위 컨텍스트에 강하게 맞는 5-7개의 짧은 한국어 옵션을 JSON으로 반환합니다. 무관한 직군(엔지니어, 교수 등)은 절대 포함하지 마세요.`,
  });

  return object.chips
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 30)
    .slice(0, 7);
}

const situationChipsSchema = chipsSchema;

/**
 * Default recommendation chips for the very first "situation" field —
 * static list, no LLM call needed.
 */
export const SITUATION_DEFAULT_CHIPS = [
  "카페에서",
  "면접",
  "공항 환승",
  "병원 예약",
  "마트 장보기",
  "호텔 체크인",
  "택시 안",
] as const;
export { situationChipsSchema };
