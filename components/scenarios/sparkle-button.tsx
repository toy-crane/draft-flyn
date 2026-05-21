"use client";

import { Loader2Icon, SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SparkleButton({
  onClick,
  loading,
  label = "AI로 채우기",
  variant = "ghost",
  size = "icon",
}: {
  onClick: () => void;
  loading: boolean;
  label?: string;
  variant?: "ghost" | "outline" | "secondary";
  size?: "icon" | "sm" | "default";
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={loading}
      aria-label={label}
    >
      {loading ? (
        <Loader2Icon className="animate-spin" data-icon="inline-start" />
      ) : (
        <SparklesIcon data-icon="inline-start" />
      )}
      {size !== "icon" && <span>{label}</span>}
    </Button>
  );
}
