"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import type { Message as DbMessage, Correction } from "@/types/message";
import type { Scenario } from "@/types/scenario";

import { GoalBar } from "./goal-bar";
import { MessageBubble } from "./message-bubble";
import { PromptInput, type PromptInputHandle } from "./prompt-input";
import { TranslationPreview } from "./translation-preview";

export type ChatViewProps = {
  conversationId: string;
  scenario: Scenario;
  initialMessages: DbMessage[];
  initialAchievedGoalIds: number[];
};

type MessageMeta = {
  correction: Correction | null;
  /** English text shown in the 🌐 section (only for Korean-input messages) */
  translation: string | null;
  /** Korean original used as the bubble's primary text (only for Korean input) */
  koreanOriginal: string | null;
};

const KOREAN_REGEX = /[가-힯ᄀ-ᇿ㄰-㆏]/;

function toUIMessage(dbMessage: DbMessage): UIMessage {
  // AI must always see English. For Korean-input messages, english_text
  // holds the translated value; otherwise it equals original_text.
  const text = dbMessage.english_text ?? dbMessage.original_text;
  return {
    id: dbMessage.id,
    role: dbMessage.role,
    parts: [{ type: "text", text }],
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
  const koreanOriginalsRef = useRef<Record<string, string>>({});

  const initialMeta = useMemo(() => {
    const map: Record<string, MessageMeta> = {};
    for (const m of initialMessages) {
      if (m.role !== "user") continue;
      const isTranslated =
        !!m.english_text && m.english_text !== m.original_text;
      if (isTranslated) {
        koreanOriginalsRef.current[m.id] = m.original_text;
      }
      map[m.id] = {
        correction: m.correction ?? null,
        translation: isTranslated ? m.english_text! : null,
        koreanOriginal: isTranslated ? m.original_text : null,
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

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, id }) => ({
          body: {
            conversationId: id,
            messages,
            koreanOriginals: koreanOriginalsRef.current,
          },
        }),
      }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: conversationId,
    messages: initialMessages.map(toUIMessage),
    transport,
  });

  const isStreaming = status === "submitted" || status === "streaming";

  // Translation preview state — driven by typing in the prompt input.
  const [draft, setDraft] = useState("");
  const [translation, setTranslation] = useState<{
    forText: string;
    english: string | null;
  }>({ forText: "", english: null });
  const [translating, setTranslating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<PromptInputHandle | null>(null);

  // Debounced Korean → English fetch.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!KOREAN_REGEX.test(draft)) {
      setTranslation({ forText: "", english: null });
      setTranslating(false);
      return;
    }
    setTranslating(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: draft }),
        });
        if (!res.ok) return;
        const data: { en: string } = await res.json();
        setTranslation({ forText: draft, english: data.en });
      } catch {
        setTranslation({ forText: "", english: null });
      } finally {
        setTranslating(false);
      }
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draft]);

  const runAnalysis = useCallback(
    async (messageId: string, englishText: string) => {
      setAnalyzing((prev) => {
        const next = new Set(prev);
        next.add(messageId);
        return next;
      });
      try {
        const res = await fetch("/api/analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            messageId,
            text: englishText,
          }),
        });
        if (!res.ok) return;
        const data: { correction: Correction; goals_achieved: number[] } =
          await res.json();
        setMessageMeta((prev) => ({
          ...prev,
          [messageId]: {
            correction: data.correction,
            translation: prev[messageId]?.translation ?? null,
            koreanOriginal: prev[messageId]?.koreanOriginal ?? null,
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
        // silent fallback (spec scenario 25)
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

  const submitTurn = useCallback(
    (englishText: string, koreanOriginal: string | null) => {
      const id = generateId();
      if (koreanOriginal) {
        koreanOriginalsRef.current[id] = koreanOriginal;
        setMessageMeta((prev) => ({
          ...prev,
          [id]: {
            correction: null,
            translation: englishText,
            koreanOriginal,
          },
        }));
      }
      void sendMessage({
        id,
        role: "user",
        parts: [{ type: "text", text: englishText }],
      });
      void runAnalysis(id, englishText);
    },
    [sendMessage, runAnalysis],
  );

  const handleSubmit = useCallback(
    (text: string) => {
      // If the text matches a translated draft, send English and attach
      // the Korean original as the visible bubble text + 🌐 section.
      if (
        translation.english &&
        translation.forText === text &&
        KOREAN_REGEX.test(text)
      ) {
        submitTurn(translation.english, text);
      } else {
        submitTurn(text, null);
      }
      setDraft("");
      setTranslation({ forText: "", english: null });
    },
    [submitTurn, translation],
  );

  const handleSendTranslationCard = useCallback(() => {
    if (!translation.english) return;
    submitTurn(translation.english, translation.forText);
    setDraft("");
    setTranslation({ forText: "", english: null });
    inputRef.current?.clear();
  }, [submitTurn, translation]);

  return (
    <div className="flex h-full flex-col">
      <GoalBar goals={scenario.goals} achieved={achievedGoalIds} />

      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-2xl px-4 py-4">
          {messages.map((message) => {
            const englishText =
              message.parts
                ?.filter((p) => p.type === "text")
                .map((p) => p.text)
                .join("") ?? "";
            const meta =
              message.role === "user" ? messageMeta[message.id] : undefined;
            const text =
              message.role === "user" && meta?.koreanOriginal
                ? meta.koreanOriginal
                : englishText;
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

      <div className="flex flex-col px-3">
        <TranslationPreview
          english={translation.english}
          loading={translating}
          onSend={handleSendTranslationCard}
        />
      </div>

      <PromptInput
        ref={inputRef}
        disabled={isStreaming}
        onSubmit={handleSubmit}
        onChange={setDraft}
      />
    </div>
  );
}
