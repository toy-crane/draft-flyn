"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useMemo } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import type { Message as DbMessage } from "@/types/message";
import type { Scenario } from "@/types/scenario";

import { GoalBar } from "./goal-bar";
import { PromptInput } from "./prompt-input";

export type ChatViewProps = {
  conversationId: string;
  scenario: Scenario;
  initialMessages: DbMessage[];
  initialAchievedGoalIds: number[];
};

function toUIMessage(dbMessage: DbMessage): UIMessage {
  return {
    id: dbMessage.id,
    role: dbMessage.role,
    parts: [{ type: "text", text: dbMessage.original_text }],
  };
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

  const { messages, sendMessage, status, error } = useChat({
    id: conversationId,
    messages: initialMessages.map(toUIMessage),
    transport,
  });

  const isStreaming = status === "submitted" || status === "streaming";

  return (
    <div className="flex h-full flex-col">
      <GoalBar goals={scenario.goals} achieved={initialAchievedGoalIds} />

      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-2xl px-4 py-4">
          {messages.map((message) => {
            const text =
              message.parts
                ?.filter((p) => p.type === "text")
                .map((p) => p.text)
                .join("") ?? "";
            return (
              <Message key={message.id} from={message.role}>
                <MessageContent>{text}</MessageContent>
              </Message>
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

      <PromptInput
        disabled={isStreaming}
        onSubmit={(text) => {
          void sendMessage({ text });
        }}
      />
    </div>
  );
}
