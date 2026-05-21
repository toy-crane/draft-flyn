import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { buildCoachSystemPrompt } from "@/lib/ai/coach";
import { CHAT_MODEL } from "@/lib/ai/gateway";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

type CoachRequest = {
  contextLabel: string;
  userOriginal: string;
  correctionText: string;
  explanation: string | null;
  messages: UIMessage[];
};

export async function POST(req: Request) {
  const body = (await req.json()) as CoachRequest;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const system = buildCoachSystemPrompt({
    contextLabel: body.contextLabel,
    userOriginal: body.userOriginal,
    correctionText: body.correctionText,
    explanation: body.explanation,
  });

  const modelMessages = await convertToModelMessages(body.messages);
  const result = streamText({
    model: CHAT_MODEL,
    system,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
