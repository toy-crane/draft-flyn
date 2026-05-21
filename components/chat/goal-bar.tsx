"use client";

import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Goal } from "@/types/scenario";

export function GoalBar({
  goals,
  achieved,
}: {
  goals: Goal[];
  achieved: number[];
}) {
  return (
    <div className="bg-background/60 sticky top-0 z-10 flex flex-col gap-2 border-b px-4 py-3 backdrop-blur md:flex-row md:items-center md:gap-4">
      {goals.map((goal, idx) => {
        const isDone = achieved.includes(goal.id);
        return (
          <div
            key={goal.id}
            className={cn(
              "flex items-start gap-2 text-sm transition-colors",
              isDone ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span
              data-achieved={isDone}
              className={cn(
                "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border transition-all",
                isDone
                  ? "border-primary bg-primary text-primary-foreground animate-in zoom-in-95 duration-200"
                  : "border-muted-foreground/40",
              )}
              aria-label={isDone ? "달성됨" : "미달성"}
            >
              {isDone ? <CheckIcon className="size-3" /> : null}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-medium">
                {idx + 1}. {goal.en}
              </span>
              <span className="text-muted-foreground text-xs">{goal.ko}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
