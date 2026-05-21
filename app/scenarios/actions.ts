"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { generateFirstAssistantMessage } from "@/lib/ai/chat";
import {
  fillScenarioField,
  generateScenarioContent,
  regenerateGoal,
  suggestFieldChips,
  type ScenarioFields,
} from "@/lib/ai/scenarios";
import { createClient } from "@/lib/supabase/server";
import type { Goal, ScenarioGeneration } from "@/lib/ai/gateway";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export async function previewScenarioAction(
  fields: ScenarioFields,
): Promise<ScenarioGeneration> {
  await requireUserId();
  return generateScenarioContent(fields);
}

export async function regenerateGoalAction(input: {
  fields: ScenarioFields;
  existingGoals: Goal[];
  targetGoalId: number;
}): Promise<Goal> {
  await requireUserId();
  return regenerateGoal(input);
}

export async function fillFieldAction(input: {
  field: "situation" | "their_role" | "my_role" | "memo";
  context: Partial<ScenarioFields>;
}): Promise<string> {
  await requireUserId();
  return fillScenarioField(input);
}

export async function suggestChipsAction(input: {
  field: "their_role" | "my_role";
  context: Partial<ScenarioFields>;
}): Promise<string[]> {
  await requireUserId();
  return suggestFieldChips(input);
}

export async function createScenarioAction(input: {
  fields: ScenarioFields;
  summary: string;
  goals: Goal[];
}): Promise<never> {
  const { supabase, userId } = await requireUserId();

  const { data: scenario, error: scenarioErr } = await supabase
    .from("scenarios")
    .insert({
      user_id: userId,
      situation: input.fields.situation,
      their_role: input.fields.theirRole,
      my_role: input.fields.myRole,
      memo: input.fields.memo ?? null,
      summary: input.summary,
      goals: input.goals,
    })
    .select()
    .single();
  if (scenarioErr || !scenario) {
    throw new Error(scenarioErr?.message ?? "Failed to create scenario");
  }

  const { data: conversation, error: convErr } = await supabase
    .from("conversations")
    .insert({
      scenario_id: scenario.id,
      user_id: userId,
    })
    .select()
    .single();
  if (convErr || !conversation) {
    throw new Error(convErr?.message ?? "Failed to create conversation");
  }

  // Generate the opening AI line so the chat page lands with a bubble
  // already present (spec scenario 6).
  try {
    const firstLine = await generateFirstAssistantMessage(scenario);
    if (firstLine.length > 0) {
      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        user_id: userId,
        role: "assistant",
        original_text: firstLine,
        english_text: firstLine,
      });
    }
  } catch {
    // If the opener fails, the chat still works — user just sees an
    // empty bubble list and can start typing.
  }

  revalidatePath("/", "layout");
  redirect(`/conversations/${conversation.id}`);
}

export async function startNewConversationForScenarioAction(
  scenarioId: string,
): Promise<never> {
  const { supabase, userId } = await requireUserId();

  const { data: scenario } = await supabase
    .from("scenarios")
    .select("*")
    .eq("id", scenarioId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!scenario) throw new Error("Scenario not found");

  // Auto-complete any existing in_progress conversation (plan decision §18).
  await supabase
    .from("conversations")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("scenario_id", scenarioId)
    .eq("user_id", userId)
    .eq("status", "in_progress");

  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({ scenario_id: scenarioId, user_id: userId })
    .select()
    .single();
  if (error || !conversation) {
    throw new Error(error?.message ?? "Failed to create conversation");
  }

  try {
    const firstLine = await generateFirstAssistantMessage(scenario);
    if (firstLine.length > 0) {
      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        user_id: userId,
        role: "assistant",
        original_text: firstLine,
        english_text: firstLine,
      });
    }
  } catch {
    // Empty open is acceptable.
  }

  revalidatePath("/", "layout");
  redirect(`/conversations/${conversation.id}`);
}

export async function completeConversationAction(
  conversationId: string,
): Promise<void> {
  const { supabase, userId } = await requireUserId();

  const { error } = await supabase
    .from("conversations")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/", "layout");
}
