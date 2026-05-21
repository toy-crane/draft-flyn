import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { MessageBubble } from "@/components/chat/message-bubble";

describe("MessageBubble — mark + section selection", () => {
  it("user + ok correction → ✓ mark, no labeled section", () => {
    render(
      <MessageBubble
        messageId="m1"
        role="user"
        text="Hi, can I order a latte?"
        correction={{
          status: "ok",
          corrected_text: null,
          explanation: null,
        }}
      />,
    );
    expect(screen.getByLabelText("정상")).toBeInTheDocument();
    expect(screen.queryByText(/교정/)).not.toBeInTheDocument();
    expect(screen.queryByText(/대안/)).not.toBeInTheDocument();
  });

  it("needs_correction → ✱ mark + 교정 section with corrected text", () => {
    render(
      <MessageBubble
        messageId="m2"
        role="user"
        text="I go to school yesterday"
        correction={{
          status: "needs_correction",
          corrected_text: "I went to school yesterday",
          explanation: "과거형 went이 더 자연스러워요",
        }}
      />,
    );
    expect(screen.getByLabelText("교정")).toBeInTheDocument();
    expect(screen.getByText(/✱ 교정/)).toBeInTheDocument();
    expect(screen.getByText("I went to school yesterday")).toBeInTheDocument();
  });

  it("alternative → 💡 mark + 대안 section, no ✱", () => {
    render(
      <MessageBubble
        messageId="m3"
        role="user"
        text="I would like to purchase coffee, please"
        correction={{
          status: "alternative",
          corrected_text: "Can I get a coffee?",
          explanation: "더 자연스러운 표현이에요",
        }}
      />,
    );
    expect(screen.getByLabelText("대안")).toBeInTheDocument();
    expect(screen.queryByText(/✱ 교정/)).not.toBeInTheDocument();
    expect(screen.getByText(/💡 대안/)).toBeInTheDocument();
  });

  it("translation present → 🌐 mark, no ✱/💡 even if correction exists", () => {
    render(
      <MessageBubble
        messageId="m4"
        role="user"
        text="학교 갔어"
        translation="I went to school"
        correction={{
          status: "needs_correction",
          corrected_text: "ignored",
          explanation: "ignored",
        }}
      />,
    );
    expect(screen.getByLabelText("번역")).toBeInTheDocument();
    expect(screen.getByText("I went to school")).toBeInTheDocument();
    expect(screen.queryByText(/✱ 교정/)).not.toBeInTheDocument();
  });

  it("assistant role never gets a mark", () => {
    render(
      <MessageBubble
        messageId="m5"
        role="assistant"
        text="Sure, one latte coming up."
      />,
    );
    expect(screen.queryByLabelText(/교정|대안|정상|번역/)).not.toBeInTheDocument();
  });

  it("user message text is preserved verbatim (data consistency invariant)", () => {
    render(
      <MessageBubble
        messageId="m6"
        role="user"
        text="I go to school yesterday"
        correction={{
          status: "needs_correction",
          corrected_text: "I went to school yesterday",
          explanation: "tense",
        }}
      />,
    );
    expect(
      screen.getByText("I go to school yesterday"),
    ).toBeInTheDocument();
  });
});
