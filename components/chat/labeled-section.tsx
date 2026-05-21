"use client";

import * as React from "react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type LabeledSectionKind = "correction" | "alternative" | "translation";

const META: Record<
  LabeledSectionKind,
  { icon: string; label: string; cls: string }
> = {
  correction: {
    icon: "✱",
    label: "교정",
    cls: "text-amber-600 dark:text-amber-400",
  },
  alternative: {
    icon: "💡",
    label: "대안",
    cls: "text-sky-600 dark:text-sky-400",
  },
  translation: {
    icon: "🌐",
    label: "번역",
    cls: "text-emerald-600 dark:text-emerald-400",
  },
};

export type LabeledSectionProps = {
  kind: LabeledSectionKind;
  /** Storage key — typically `${messageId}:${kind}` so each bubble
   *  remembers its own collapse state across renders. */
  storageKey?: string;
  /** Optional bottom-right action; e.g. "더 알아보기" button. */
  action?: React.ReactNode;
  children: React.ReactNode;
};

function readInitialOpen(storageKey: string | undefined): boolean {
  if (!storageKey) return true;
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(`labeled-section:${storageKey}`);
  if (stored === null) return true;
  return stored === "1";
}

export function LabeledSection({
  kind,
  storageKey,
  action,
  children,
}: LabeledSectionProps) {
  const [open, setOpen] = React.useState(() => readInitialOpen(storageKey));

  React.useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    window.localStorage.setItem(
      `labeled-section:${storageKey}`,
      open ? "1" : "0",
    );
  }, [open, storageKey]);

  const meta = META[kind];

  return (
    <div className="border-border/60 mt-2 rounded-md border p-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <span className={cn("text-xs font-medium", meta.cls)}>
          {meta.icon} {meta.label}
        </span>
        {open ? (
          <ChevronUpIcon className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2 text-sm">
          {children}
          {action && (
            <div className="flex justify-end">{action}</div>
          )}
        </div>
      )}
    </div>
  );
}

export function LabeledSectionContent({
  primary,
  secondary,
}: {
  primary: string;
  secondary?: string | null;
}) {
  return (
    <>
      <p className="font-medium">{primary}</p>
      {secondary && (
        <p className="text-muted-foreground text-xs leading-relaxed">
          {secondary}
        </p>
      )}
    </>
  );
}
