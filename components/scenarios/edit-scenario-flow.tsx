"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  fillFieldAction,
  suggestChipsAction,
  updateScenarioAction,
} from "@/app/scenarios/actions";
import type { ScenarioFields } from "@/lib/ai/scenarios";

import { ScenarioForm } from "./scenario-form";

export function EditScenarioFlow({
  scenarioId,
  initialFields,
}: {
  scenarioId: string;
  initialFields: ScenarioFields;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  return (
    <ScenarioForm
      initialFields={initialFields}
      submitting={saving}
      onSubmit={async (fields) => {
        setSaving(true);
        try {
          await updateScenarioAction(scenarioId, fields);
          toast.success("시나리오를 업데이트했어요");
          router.push("/");
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "저장에 실패했어요",
          );
          setSaving(false);
        }
      }}
      fillField={(field, context) => fillFieldAction({ field, context })}
      suggestChips={(field, context) =>
        suggestChipsAction({ field, context })
      }
    />
  );
}
