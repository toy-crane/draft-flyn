import "server-only";

import { generateText } from "ai";

import { CHAT_MODEL } from "@/lib/ai/gateway";
import type { Scenario } from "@/types/scenario";

export function buildChatSystemPrompt(scenario: Scenario): string {
  const memoLine = scenario.memo ? `\nContext: ${scenario.memo}` : "";
  return `You are playing the role of "${scenario.their_role}" in this situation: "${scenario.situation}". The user is playing the role of "${scenario.my_role}".${memoLine}

Rules:
- Respond in English only.
- Keep replies short (1-2 sentences, like a text message).
- Stay in character. No narration, no "[smiles]" or "*nods*", no stage directions, no thoughts in brackets.
- Do not correct the user's grammar. Respond to the meaning of what they wrote.
- If the user writes in Korean, treat it as if they wrote the natural English equivalent and respond in character in English.
- Be a real human in this situation: brief, natural, conversational.`;
}

/**
 * Generate the very first assistant turn for a new conversation.
 * Called from the create-scenario flow so the chat page lands with the
 * first bubble already present.
 */
export async function generateFirstAssistantMessage(
  scenario: Scenario,
): Promise<string> {
  const { text } = await generateText({
    model: CHAT_MODEL,
    system: buildChatSystemPrompt(scenario),
    prompt: `Open the conversation. Greet the user (the "${scenario.my_role}") with a single short line as the "${scenario.their_role}". One sentence, natural and in character.`,
  });
  return text.trim();
}
