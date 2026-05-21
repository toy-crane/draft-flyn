import { gateway } from "ai";
import { z } from "zod";

// Model IDs verified against `curl https://ai-gateway.vercel.sh/v1/models`
// on 2026-05-21. AI Gateway uses AI_GATEWAY_API_KEY env var automatically.

export const CHAT_MODEL = gateway("anthropic/claude-haiku-4.5");

export const ANALYSIS_MODEL = gateway("anthropic/claude-sonnet-4.6");

// =====================================================================
// Analysis schema — used by /api/analysis (Task 8) for ✱/💡 + goals.
// =====================================================================

export const correctionStatusSchema = z.enum([
  "ok",
  "needs_correction",
  "alternative",
]);

export const correctionSchema = z.object({
  status: correctionStatusSchema,
  corrected_text: z.string().nullable(),
  explanation: z.string().nullable(),
});

export const analysisSchema = z.object({
  correction: correctionSchema,
  goals_achieved: z.array(z.number().int().nonnegative()),
});

export type Correction = z.infer<typeof correctionSchema>;
export type AnalysisResult = z.infer<typeof analysisSchema>;

// =====================================================================
// Scenario generation schema — used by lib/ai/scenarios (Task 4).
// =====================================================================

export const goalSchema = z.object({
  id: z.number().int().nonnegative(),
  en: z.string(),
  ko: z.string(),
});

export const scenarioGenerationSchema = z.object({
  summary: z.string(),
  goals: z.array(goalSchema).length(3),
});

export type Goal = z.infer<typeof goalSchema>;
export type ScenarioGeneration = z.infer<typeof scenarioGenerationSchema>;
