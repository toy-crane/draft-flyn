import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Conversation, Scenario } from "@/types/scenario";

export type ScenarioWithConversation = Scenario & {
  in_progress_conversation_id: string | null;
};

export type RecentHistoryItem = {
  conversation_id: string;
  scenario_id: string;
  scenario_summary: string;
  scenario_situation: string;
  completed_at: string;
};

const HISTORY_SIDEBAR_LIMIT = 30;

/**
 * Returns the current user's scenarios with a flag for any in_progress
 * conversation, ordered by most recently updated first.
 *
 * Splits into two queries because the hand-written Database type does not
 * model PostgREST relationship embedding; we'll swap to nested select once
 * `supabase gen types --linked` is wired in.
 */
export async function getScenariosForSidebar(): Promise<
  ScenarioWithConversation[]
> {
  const supabase = await createClient();
  const { data: scenarios, error } = await supabase
    .from("scenarios")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error || !scenarios) return [];

  const scenarioIds = scenarios.map((s: Scenario) => s.id);
  const inProgressByScenario = new Map<string, string>();

  if (scenarioIds.length > 0) {
    const { data: inProgress } = await supabase
      .from("conversations")
      .select("id, scenario_id")
      .in("scenario_id", scenarioIds)
      .eq("status", "in_progress");
    for (const conv of inProgress ?? []) {
      inProgressByScenario.set(conv.scenario_id, conv.id);
    }
  }

  return scenarios.map((s: Scenario) => ({
    ...s,
    in_progress_conversation_id: inProgressByScenario.get(s.id) ?? null,
  }));
}

/**
 * Returns the most recent completed conversations to render in the sidebar
 * history section. Returns up to 30 items; the /history page lists the rest.
 */
export async function getRecentHistory(): Promise<RecentHistoryItem[]> {
  const supabase = await createClient();
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(HISTORY_SIDEBAR_LIMIT);

  if (error || !conversations || conversations.length === 0) return [];

  const scenarioIds = Array.from(
    new Set(conversations.map((c: Conversation) => c.scenario_id)),
  );
  const { data: scenarios } = await supabase
    .from("scenarios")
    .select("id, summary, situation")
    .in("id", scenarioIds);

  const scenarioById = new Map(
    (scenarios ?? []).map((s) => [s.id, s] as const),
  );

  return conversations
    .filter(
      (c: Conversation): c is Conversation & { completed_at: string } =>
        c.completed_at !== null,
    )
    .map((c) => {
      const scenario = scenarioById.get(c.scenario_id);
      return {
        conversation_id: c.id,
        scenario_id: c.scenario_id,
        scenario_summary: scenario?.summary ?? "",
        scenario_situation: scenario?.situation ?? "",
        completed_at: c.completed_at,
      };
    });
}
