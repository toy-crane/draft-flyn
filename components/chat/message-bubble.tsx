"use client";

import { Message, MessageContent } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Correction } from "@/types/message";

import {
  LabeledSection,
  LabeledSectionContent,
} from "./labeled-section";

export type MessageBubbleProps = {
  messageId: string;
  role: "user" | "assistant";
  text: string;
  /** Analysis result for user messages. null/undefined while pending or N/A. */
  correction?: Correction | null;
  /** Translation (🌐) for korean-input messages. */
  translation?: string | null;
  /** Whether the message-level analysis is still pending. */
  analyzing?: boolean;
  /** Called when the user clicks "더 알아보기 →" inside a ✱/💡 section. */
  onLearnMore?: (messageId: string) => void;
};

function MarkChip({ kind }: { kind: "ok" | "correction" | "alternative" | "translation" }) {
  const meta: Record<typeof kind, { glyph: string; label: string; cls: string }> = {
    ok: {
      glyph: "✓",
      label: "정상",
      cls: "text-emerald-600 dark:text-emerald-400",
    },
    correction: {
      glyph: "✱",
      label: "교정",
      cls: "text-amber-600 dark:text-amber-400",
    },
    alternative: {
      glyph: "💡",
      label: "대안",
      cls: "text-sky-600 dark:text-sky-400",
    },
    translation: {
      glyph: "🌐",
      label: "번역",
      cls: "text-emerald-600 dark:text-emerald-400",
    },
  };
  const m = meta[kind];
  return (
    <span
      className={cn("ml-2 inline-flex items-center text-xs font-medium", m.cls)}
      aria-label={m.label}
    >
      {m.glyph}
    </span>
  );
}

function chooseMark(props: MessageBubbleProps):
  | "ok"
  | "correction"
  | "alternative"
  | "translation"
  | null {
  if (props.role !== "user") return null;
  if (props.translation) return "translation";
  if (!props.correction) return null;
  switch (props.correction.status) {
    case "needs_correction":
      return "correction";
    case "alternative":
      return "alternative";
    case "ok":
      return "ok";
  }
}

export function MessageBubble(props: MessageBubbleProps) {
  const mark = chooseMark(props);
  const showCorrectionSection =
    props.role === "user" &&
    !props.translation &&
    props.correction?.status === "needs_correction";
  const showAlternativeSection =
    props.role === "user" &&
    !props.translation &&
    props.correction?.status === "alternative";

  return (
    <Message from={props.role}>
      <MessageContent>
        <div className="flex items-start">
          <span className="whitespace-pre-wrap">{props.text}</span>
          {mark && <MarkChip kind={mark} />}
        </div>

        {props.role === "user" && props.translation && (
          <LabeledSection
            kind="translation"
            storageKey={`${props.messageId}:translation`}
          >
            <LabeledSectionContent primary={props.translation} />
          </LabeledSection>
        )}

        {showCorrectionSection && props.correction && (
          <LabeledSection
            kind="correction"
            storageKey={`${props.messageId}:correction`}
            action={
              props.onLearnMore && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => props.onLearnMore?.(props.messageId)}
                >
                  더 알아보기 →
                </Button>
              )
            }
          >
            <LabeledSectionContent
              primary={props.correction.corrected_text ?? ""}
              secondary={props.correction.explanation}
            />
          </LabeledSection>
        )}

        {showAlternativeSection && props.correction && (
          <LabeledSection
            kind="alternative"
            storageKey={`${props.messageId}:alternative`}
            action={
              props.onLearnMore && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => props.onLearnMore?.(props.messageId)}
                >
                  더 알아보기 →
                </Button>
              )
            }
          >
            <LabeledSectionContent
              primary={props.correction.corrected_text ?? ""}
              secondary={props.correction.explanation}
            />
          </LabeledSection>
        )}
      </MessageContent>
    </Message>
  );
}
