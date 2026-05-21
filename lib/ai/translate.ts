import "server-only";

import { generateObject } from "ai";
import { z } from "zod";

import { ANALYSIS_MODEL } from "@/lib/ai/gateway";

const translationSchema = z.object({ en: z.string() });

const SYSTEM_PROMPT = `You translate Korean conversational text into natural, casual English.
- Keep the same intent and brevity.
- Match register: casual stays casual, polite stays polite.
- Do not add commentary or quotes — just the English sentence.
Return JSON only.`;

/**
 * Korean → English translation used by the input preview card and the
 * Enter-to-send flow. Uses the high-accuracy model since the result
 * becomes "the user's real message" downstream.
 */
export async function translateKoreanToEnglish(
  text: string,
): Promise<string> {
  const { object } = await generateObject({
    model: ANALYSIS_MODEL,
    schema: translationSchema,
    system: SYSTEM_PROMPT,
    prompt: `Korean: ${text}`,
  });
  return object.en.trim();
}

/** Cheap, browser-safe check for any Korean code points. */
export function containsKorean(text: string): boolean {
  return /[가-힯ᄀ-ᇿ㄰-㆏]/.test(text);
}
