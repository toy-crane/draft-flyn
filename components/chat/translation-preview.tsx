"use client";

import { ArrowRightIcon, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function TranslationPreview({
  english,
  loading,
  onSend,
}: {
  english: string | null;
  loading: boolean;
  onSend: () => void;
}) {
  if (!loading && !english) return null;

  return (
    <div className="bg-muted/40 mx-auto mb-2 flex w-full max-w-2xl items-center gap-2 rounded-md border px-3 py-2 text-sm">
      <ArrowRightIcon className="text-muted-foreground size-4 shrink-0" />
      {loading ? (
        <span className="text-muted-foreground inline-flex items-center gap-2">
          <Loader2Icon className="size-3 animate-spin" />
          영어로 옮기는 중…
        </span>
      ) : (
        <>
          <span className="flex-1 leading-snug">{english}</span>
          <Button type="button" size="sm" onClick={onSend}>
            이걸로 보내기
          </Button>
        </>
      )}
    </div>
  );
}
