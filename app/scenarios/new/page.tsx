import type { Metadata } from "next";

import { NewScenarioFlow } from "@/components/scenarios/new-scenario-flow";

export const metadata: Metadata = {
  title: "Flyn — 새 시나리오",
};

export default async function NewScenarioPage({
  searchParams,
}: {
  searchParams: Promise<{ prefill?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="flex flex-1 items-start justify-center px-6 py-10">
      <NewScenarioFlow prefill={params.prefill ?? null} />
    </main>
  );
}
