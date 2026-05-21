"use client";

import { Button } from "@/components/ui/button";

export function RecommendationChips({
  chips,
  onPick,
  loading,
}: {
  chips: readonly string[];
  onPick: (chip: string) => void;
  loading?: boolean;
}) {
  if (chips.length === 0 && !loading) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {loading ? (
        <div className="text-muted-foreground text-xs">추천 만드는 중…</div>
      ) : (
        chips.map((chip) => (
          <Button
            key={chip}
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => onPick(chip)}
          >
            {chip}
          </Button>
        ))
      )}
    </div>
  );
}
