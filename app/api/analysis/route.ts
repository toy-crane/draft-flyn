import { analyzeUserMessage } from "@/lib/ai/analysis";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 10;

type AnalysisRequest = {
  conversationId: string;
  messageId: string;
  text: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as AnalysisRequest;
  const { conversationId, messageId, text } = body;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return new Response("Not found", { status: 404 });

  const { data: scenario } = await supabase
    .from("scenarios")
    .select("*")
    .eq("id", conversation.scenario_id)
    .maybeSingle();
  if (!scenario) return new Response("Not found", { status: 404 });

  const result = await analyzeUserMessage({ scenario, text });

  // Persist correction onto the user message, and accumulate
  // goals_achieved as a union on the conversation row (invariant:
  // a once-achieved goal never regresses).
  await supabase
    .from("messages")
    .update({
      correction: result.correction,
      goals_achieved: result.goals_achieved,
    })
    .eq("id", messageId);

  if (result.goals_achieved.length > 0) {
    const existing = new Set(conversation.goals_achieved ?? []);
    let changed = false;
    for (const id of result.goals_achieved) {
      if (!existing.has(id)) {
        existing.add(id);
        changed = true;
      }
    }
    if (changed) {
      await supabase
        .from("conversations")
        .update({ goals_achieved: Array.from(existing) })
        .eq("id", conversationId);
    }
  }

  return Response.json(result);
}
