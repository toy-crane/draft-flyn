import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { buildChatSystemPrompt } from "@/lib/ai/chat";
import { CHAT_MODEL } from "@/lib/ai/gateway";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

type ChatRequest = {
  conversationId: string;
  messages: UIMessage[];
};

export async function POST(req: Request) {
  const body = (await req.json()) as ChatRequest;
  const { conversationId, messages } = body;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) {
    return new Response("Conversation not found", { status: 404 });
  }

  const { data: scenario } = await supabase
    .from("scenarios")
    .select("*")
    .eq("id", conversation.scenario_id)
    .maybeSingle();
  if (!scenario) {
    return new Response("Scenario not found", { status: 404 });
  }

  // Persist the new user turn before generating the assistant reply.
  // Task 9 will set `english_text` to the translated value when the
  // original input was Korean.
  const lastTurn = messages[messages.length - 1];
  if (lastTurn?.role === "user") {
    const originalText =
      lastTurn.parts
        ?.filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("") ?? "";
    if (originalText.length > 0) {
      const { data: existing } = await supabase
        .from("messages")
        .select("id")
        .eq("id", lastTurn.id)
        .maybeSingle();
      if (!existing) {
        await supabase.from("messages").insert({
          id: lastTurn.id,
          conversation_id: conversationId,
          user_id: user.id,
          role: "user",
          original_text: originalText,
          english_text: originalText,
        });
      }
    }
  }

  const modelMessages = await convertToModelMessages(messages);
  const result = streamText({
    model: CHAT_MODEL,
    system: buildChatSystemPrompt(scenario),
    messages: modelMessages,
    onFinish: async ({ text }) => {
      const assistantText = text.trim();
      if (!assistantText) return;
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: "assistant",
        original_text: assistantText,
        english_text: assistantText,
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
