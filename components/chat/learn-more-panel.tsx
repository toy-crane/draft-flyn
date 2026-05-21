"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";

const SEED_CHIPS = ["왜 이게 틀려?", "다른 표현은?", "비슷한 예시"];

export type LearnMoreContext = {
  contextLabel: string;
  userOriginal: string;
  correctionText: string;
  explanation: string | null;
};

export function LearnMorePanel({
  open,
  onOpenChange,
  context,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: LearnMoreContext | null;
}) {
  const isMobile = useIsMobile();
  const [draft, setDraft] = useState("");
  const [composing, setComposing] = useState(false);

  // Fresh useChat session each time we open with a new context — closing
  // the panel discards history (decisions §11).
  const sessionId = useMemo(() => {
    if (!open || !context) return null;
    return `${context.userOriginal}::${Date.now()}`;
  }, [open, context]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/coach",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            ...context,
            messages,
          },
        }),
      }),
    [context],
  );

  const { messages, sendMessage, status } = useChat({
    id: sessionId ?? "coach:idle",
    transport,
  } as Parameters<typeof useChat>[0]);

  const isStreaming = status === "submitted" || status === "streaming";
  const messagesArr: UIMessage[] = messages;

  // Clear input when panel closes.
  useEffect(() => {
    if (!open) setDraft("");
  }, [open]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isStreaming || !context) return;
    void sendMessage({
      role: "user",
      parts: [{ type: "text", text: trimmed }],
    });
    setDraft("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey || composing || e.nativeEvent.isComposing)
      return;
    e.preventDefault();
    send(draft);
  }

  if (!context) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className="flex w-full flex-col gap-0 sm:max-w-md"
      >
        <SheetHeader className="border-b">
          <SheetTitle>더 알아보기</SheetTitle>
          <SheetDescription>{context.contextLabel}</SheetDescription>
        </SheetHeader>

        <div className="bg-muted/40 mx-4 mt-4 rounded-md p-3 text-sm">
          <p className="text-muted-foreground text-xs">맥락 중인 교정</p>
          <p className="mt-1 line-clamp-2">{context.userOriginal}</p>
          <p className="text-muted-foreground mt-1 text-xs">↓</p>
          <p className="font-medium">{context.correctionText}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messagesArr.length === 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm">이 교정에 대해 궁금한 점이 있나요?</p>
              <div className="flex flex-wrap gap-2">
                {SEED_CHIPS.map((chip) => (
                  <Button
                    key={chip}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => send(chip)}
                  >
                    {chip}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-4 flex flex-col gap-3">
            {messagesArr.map((m) => {
              const text =
                m.parts
                  ?.filter((p) => p.type === "text")
                  .map((p) => p.text)
                  .join("") ?? "";
              return (
                <div
                  key={m.id}
                  className={`rounded-md px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground self-end"
                      : "bg-muted"
                  }`}
                >
                  {text}
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t p-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
            placeholder="질문을 입력해 보세요"
            rows={2}
            disabled={isStreaming}
            className="resize-none"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
