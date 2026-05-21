import { notFound } from "next/navigation";

import { EditScenarioFlow } from "@/components/scenarios/edit-scenario-flow";
import { createClient } from "@/lib/supabase/server";

export default async function EditScenarioPage({
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

  return (
    <main className="flex flex-1 items-start justify-center px-6 py-10">
      <EditScenarioFlow
        scenarioId={scenario.id}
        initialFields={{
          situation: scenario.situation,
          theirRole: scenario.their_role,
          myRole: scenario.my_role,
          memo: scenario.memo,
        }}
      />
    </main>
  );
}
