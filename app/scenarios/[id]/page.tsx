import { notFound, redirect } from "next/navigation";

import { ResumeOrNew } from "@/components/scenarios/resume-or-new";
import { createClient } from "@/lib/supabase/server";
import { startNewConversationForScenarioAction } from "@/app/scenarios/actions";

export default async function ScenarioLandingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: scenario } = await supabase
    .from("scenarios")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!scenario) notFound();

  const { data: inProgress } = await supabase
    .from("conversations")
    .select("id")
    .eq("scenario_id", id)
    .eq("status", "in_progress")
    .maybeSingle();

  if (inProgress) {
    return (
      <main className="flex flex-1">
        <ResumeOrNew
          scenarioId={scenario.id}
          scenarioSummary={scenario.summary || scenario.situation}
          inProgressConversationId={inProgress.id}
        />
      </main>
    );
  }

  // No in_progress instance — start a fresh one and redirect.
  await startNewConversationForScenarioAction(id);
  // startNewConversationForScenarioAction redirect()s; this is unreachable.
  redirect("/");
}
