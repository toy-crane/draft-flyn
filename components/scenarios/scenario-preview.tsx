"use client";

import { useState } from "react";
import { Loader2Icon, RotateCcwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Goal, ScenarioGeneration } from "@/lib/ai/gateway";
import type { ScenarioFields } from "@/lib/ai/scenarios";

export type ScenarioPreviewProps = {
  fields: ScenarioFields;
  preview: ScenarioGeneration;
  starting: boolean;
  onRegenerateGoal: (goalId: number) => Promise<Goal>;
  onStart: (final: ScenarioGeneration) => void;
  onBack: () => void;
};

export function ScenarioPreview({
  fields,
  preview,
  starting,
  onRegenerateGoal,
  onStart,
  onBack,
}: ScenarioPreviewProps) {
  const [goals, setGoals] = useState<Goal[]>(preview.goals);
  const [regenerating, setRegenerating] = useState<number | null>(null);

  async function handleRegenerate(goalId: number) {
    setRegenerating(goalId);
    try {
      const next = await onRegenerateGoal(goalId);
      setGoals((current) =>
        current.map((g) => (g.id === goalId ? next : g)),
      );
    } finally {
      setRegenerating(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-xs">미리보기</p>
        <h1 className="mt-1 text-xl font-semibold leading-tight">
          {preview.summary}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {fields.situation} · {fields.theirRole} ↔ {fields.myRole}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">학습 목표</p>
        {goals.map((goal) => (
          <Card key={goal.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <CardTitle className="text-base">{goal.en}</CardTitle>
                <CardDescription>{goal.ko}</CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRegenerate(goal.id)}
                disabled={regenerating !== null}
                aria-label="목표 재생성"
              >
                {regenerating === goal.id ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <RotateCcwIcon />
                )}
              </Button>
            </CardHeader>
            <CardContent className="hidden" />
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={starting}
        >
          뒤로
        </Button>
        <Button
          type="button"
          size="lg"
          className="flex-1"
          onClick={() => onStart({ summary: preview.summary, goals })}
          disabled={starting}
        >
          {starting ? "시작 중…" : "시작하기"}
        </Button>
      </div>
    </div>
  );
}
