"use client";

import { RefreshCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function RetryBanner({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto my-3 flex w-full max-w-2xl items-center justify-between gap-3 rounded-md border border-destructive/60 bg-destructive/5 px-3 py-2 text-sm">
      <span className="text-destructive-foreground">
        {message ?? "보내는 중 오류가 발생했어요. 다시 시도해 보세요."}
      </span>
      <Button type="button" size="sm" variant="outline" onClick={onRetry}>
        <RefreshCwIcon data-icon="inline-start" />
        다시 시도
      </Button>
    </div>
  );
}
