"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useMemo, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import type { Message as DbMessage, Correction } from "@/types/message";
import type { Scenario } from "@/types/scenario";

import { GoalBar } from "./goal-bar";
import { MessageBubble } from "./message-bubble";
import { PromptInput } from "./prompt-input";

export type ChatViewProps = {
  conversationId: string;
  scenario: Scenario;
  initialMessages: DbMessage[];
  initialAchievedGoalIds: number[];
};

type MessageMeta = {
  correction: Correction | null;
  translation: string | null;
};

function toUIMessage(dbMessage: DbMessage): UIMessage {
  return {
    id: dbMessage.id,
    role: dbMessage.role,
    parts: [{ type: "text", text: dbMessage.original_text }],
  };
}

function generateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function ChatView({
  conversationId,
  scenario,
  initialMessages,
  initialAchievedGoalIds,
}: ChatViewProps) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, id }) => ({
          body: { conversationId: id, messages },
        }),
      }),
    [],
  );

  const initialMeta = useMemo(() => {
    const map: Record<string, MessageMeta> = {};
    for (const m of initialMessages) {
      if (m.role !== "user") continue;
      map[m.id] = {
        correction: m.correction ?? null,
        translation:
          m.english_text && m.english_text !== m.original_text
            ? m.english_text
            : null,
      };
    }
    return map;
  }, [initialMessages]);

  const [messageMeta, setMessageMeta] =
    useState<Record<string, MessageMeta>>(initialMeta);
  const [analyzing, setAnalyzing] = useState<Set<string>>(new Set());
  const [achievedGoalIds, setAchievedGoalIds] = useState<number[]>(
    initialAchievedGoalIds,
  );

  const { messages, sendMessage, status, error } = useChat({
    id: conversationId,
    messages: initialMessages.map(toUIMessage),
    transport,
  });

  const isStreaming = status === "submitted" || status === "streaming";

  const runAnalysis = useCallback(
    async (messageId: string, text: string) => {
      setAnalyzing((prev) => {
        const next = new Set(prev);
        next.add(messageId);
        return next;
      });
      try {
        const res = await fetch("/api/analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, messageId, text }),
        });
        if (!res.ok) return;
        const data: { correction: Correction; goals_achieved: number[] } =
          await res.json();
        setMessageMeta((prev) => ({
          ...prev,
          [messageId]: {
            correction: data.correction,
            translation: prev[messageId]?.translation ?? null,
          },
        }));
        if (data.goals_achieved.length > 0) {
          setAchievedGoalIds((prev) => {
            const next = new Set(prev);
            for (const id of data.goals_achieved) next.add(id);
            return Array.from(next);
          });
        }
      } catch {
        // Analysis failure is a silent fallback (spec scenario 25);
        // the bubble simply renders without a mark.
      } finally {
        setAnalyzing((prev) => {
          const next = new Set(prev);
          next.delete(messageId);
          return next;
        });
      }
    },
    [conversationId],
  );

  const handleSubmit = useCallback(
    (text: string) => {
      const id = generateId();
      // Fire in parallel: chat stream + analysis. The chat call does not
      // wait for analysis (invariant: 응답 속도 / 동시성).
      void sendMessage({
        id,
        role: "user",
        parts: [{ type: "text", text }],
      });
      void runAnalysis(id, text);
    },
    [sendMessage, runAnalysis],
  );

  return (
    <div className="flex h-full flex-col">
      <GoalBar goals={scenario.goals} achieved={achievedGoalIds} />

      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-2xl px-4 py-4">
          {messages.map((message) => {
            const text =
              message.parts
                ?.filter((p) => p.type === "text")
                .map((p) => p.text)
                .join("") ?? "";
            const meta =
              message.role === "user" ? messageMeta[message.id] : undefined;
            return (
              <MessageBubble
                key={message.id}
                messageId={message.id}
                role={message.role === "assistant" ? "assistant" : "user"}
                text={text}
                correction={meta?.correction}
                translation={meta?.translation}
                analyzing={analyzing.has(message.id)}
              />
            );
          })}
          {error && (
            <p className="text-destructive px-2 py-1 text-xs">
              {error.message ?? "오류가 발생했어요. 다시 시도해 주세요."}
            </p>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput disabled={isStreaming} onSubmit={handleSubmit} />
    </div>
  );
}
