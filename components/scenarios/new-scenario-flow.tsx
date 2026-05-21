"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { ScenarioGeneration } from "@/lib/ai/gateway";
import type { ScenarioFields } from "@/lib/ai/scenarios";
import {
  createScenarioAction,
  fillFieldAction,
  previewScenarioAction,
  regenerateGoalAction,
  suggestChipsAction,
} from "@/app/scenarios/actions";

import { ScenarioForm } from "./scenario-form";
import { ScenarioPreview } from "./scenario-preview";

export function NewScenarioFlow({ prefill }: { prefill?: string | null }) {
  const [phase, setPhase] = useState<"form" | "preview">("form");
  const [fields, setFields] = useState<ScenarioFields>({
    situation: prefill ?? "",
    theirRole: "",
    myRole: "",
    memo: null,
  });
  const [preview, setPreview] = useState<ScenarioGeneration | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);

  async function generatePreview(next: ScenarioFields) {
    setSubmitting(true);
    try {
      const result = await previewScenarioAction(next);
      setFields(next);
      setPreview(result);
      setPhase("preview");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "목표 생성에 실패했어요");
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === "preview" && preview) {
    return (
      <ScenarioPreview
        fields={fields}
        preview={preview}
        starting={starting}
        onBack={() => setPhase("form")}
        onRegenerateGoal={(goalId) =>
          regenerateGoalAction({
            fields,
            existingGoals: preview.goals,
            targetGoalId: goalId,
          })
        }
        onStart={async (final) => {
          setStarting(true);
          try {
            await createScenarioAction({
              fields,
              summary: final.summary,
              goals: final.goals,
            });
          } catch (err) {
            // redirect() throws a NEXT_REDIRECT — let it bubble up
            // so Next.js can perform the navigation.
            if (
              err instanceof Error &&
              "digest" in err &&
              String((err as { digest?: string }).digest).startsWith(
                "NEXT_REDIRECT",
              )
            ) {
              throw err;
            }
            toast.error(
              err instanceof Error ? err.message : "시작에 실패했어요",
            );
            setStarting(false);
          }
        }}
      />
    );
  }

  return (
    <ScenarioForm
      initialFields={fields}
      submitting={submitting}
      onSubmit={generatePreview}
      fillField={(field, context) => fillFieldAction({ field, context })}
      suggestChips={(field, context) => suggestChipsAction({ field, context })}
    />
  );
}
