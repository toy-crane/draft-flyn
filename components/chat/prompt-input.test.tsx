import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fireEvent } from "@testing-library/react";

import { PromptInput } from "@/components/chat/prompt-input";

describe("PromptInput", () => {
  it("autofocuses the textarea on mount", () => {
    render(<PromptInput onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("메시지 입력")).toHaveFocus();
  });

  it("send button is disabled when empty, enabled when filled", async () => {
    render(<PromptInput onSubmit={vi.fn()} />);
    const button = screen.getByRole("button", { name: "보내기" });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText("메시지 입력"), "Hi");
    expect(button).toBeEnabled();
  });

  it("Enter submits trimmed text", async () => {
    const onSubmit = vi.fn();
    render(<PromptInput onSubmit={onSubmit} />);
    const textarea = screen.getByLabelText("메시지 입력");
    await userEvent.type(textarea, "Hello{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("Hello");
  });

  it("Shift+Enter inserts a newline, does NOT submit", async () => {
    const onSubmit = vi.fn();
    render(<PromptInput onSubmit={onSubmit} />);
    const textarea = screen.getByLabelText("메시지 입력");
    await userEvent.type(textarea, "line1{Shift>}{Enter}{/Shift}line2");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(textarea).toHaveValue("line1\nline2");
  });

  it("Enter during IME composition does NOT submit", () => {
    const onSubmit = vi.fn();
    render(<PromptInput onSubmit={onSubmit} />);
    const textarea = screen.getByLabelText("메시지 입력") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "안녕" } });
    fireEvent.compositionStart(textarea);
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.compositionEnd(textarea);
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("안녕");
  });

  it("disables submit while parent indicates streaming", async () => {
    render(<PromptInput onSubmit={vi.fn()} disabled />);
    await userEvent.type(screen.getByLabelText("메시지 입력"), "x");
    expect(screen.getByRole("button", { name: "보내기" })).toBeDisabled();
  });

  it("Enter is ignored when disabled, even with text present", async () => {
    const onSubmit = vi.fn();
    const { rerender } = render(
      <PromptInput onSubmit={onSubmit} disabled={false} />,
    );
    const textarea = screen.getByLabelText("메시지 입력");
    await userEvent.type(textarea, "Hi");
    rerender(<PromptInput onSubmit={onSubmit} disabled />);
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
