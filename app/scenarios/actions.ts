"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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

  revalidatePath("/", "layout");
  redirect(`/conversations/${conversation.id}`);
}
