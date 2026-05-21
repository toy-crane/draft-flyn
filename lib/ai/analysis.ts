import "server-only";

import { generateObject } from "ai";

import {
  ANALYSIS_MODEL,
  analysisSchema,
  type AnalysisResult,
} from "@/lib/ai/gateway";
import type { Goal, Scenario } from "@/types/scenario";

export function buildAnalysisSystemPrompt(scenario: Scenario): string {
  const goalsText = (scenario.goals as Goal[])
    .map((g, i) => `${i}. id=${g.id} — ${g.en} (${g.ko})`)
    .join("\n");

  const memoLine = scenario.memo ? `\nContext: ${scenario.memo}` : "";

  return `You are an English-conversation analyst for a Korean A2-B1 learner.
The learner is practicing this scenario:
- Situation: ${scenario.situation}
- Their (NPC) role: ${scenario.their_role}
- My (learner) role: ${scenario.my_role}${memoLine}

Active learning goals (ids you may reference in goals_achieved):
${goalsText}

For each user message, return JSON with two fields:

1. correction.status — one of:
   - "ok"               : message is fine. Native speakers would not flinch.
                          Minor typos and missing punctuation count as ok.
   - "needs_correction" : message has a real grammar / lexical error that
                          a native speaker would actually notice.
   - "alternative"      : meaning is clear, but there is a noticeably more
                          natural / less textbook-y phrasing.

   When status is "ok": corrected_text=null, explanation=null.
   When status is "needs_correction" or "alternative":
     - corrected_text: the rewritten English sentence.
     - explanation: ONE Korean sentence explaining why, in friendly tone.

   NEVER pick both "needs_correction" and "alternative" for the same
   message. If the error is significant, prefer "needs_correction".

2. goals_achieved — array of goal ids that this single message visibly
   satisfies for the first time. Empty array when nothing new is achieved.
   Reference only ids from the list above.

Be strict on "ok" — small typos like "coffe", missing capitalization, or
omitted final punctuation should pass. Only flag mistakes a learner would
benefit from seeing.`;
}

export async function analyzeUserMessage(input: {
  scenario: Scenario;
  text: string;
}): Promise<AnalysisResult> {
  const { object } = await generateObject({
    model: ANALYSIS_MODEL,
    schema: analysisSchema,
    system: buildAnalysisSystemPrompt(input.scenario),
    prompt: `User message to analyze:\n"${input.text}"\n\nReturn JSON only.`,
  });

  return {
    correction: object.correction,
    goals_achieved: Array.from(new Set(object.goals_achieved)),
  };
}
