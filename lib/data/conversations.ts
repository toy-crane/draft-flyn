import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Conversation, Scenario } from "@/types/scenario";
import type { Message } from "@/types/message";

export type ConversationBundle = {
  conversation: Conversation;
  scenario: Scenario;
  messages: Message[];
};

export async function getConversationBundle(
  conversationId: string,
): Promise<ConversationBundle | null> {
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return null;

  const [{ data: scenario }, { data: messages }] = await Promise.all([
    supabase
      .from("scenarios")
      .select("*")
      .eq("id", conversation.scenario_id)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true }),
  ]);

  if (!scenario) return null;

  return {
    conversation,
    scenario,
    messages: messages ?? [],
  };
}
