"use client";

import { SendHorizonalIcon } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 500;
const WARNING_THRESHOLD = 450;

export type PromptInputHandle = {
  focus: () => void;
  clear: () => void;
  setValue: (text: string) => void;
};

export type PromptInputProps = {
  placeholder?: string;
  disabled?: boolean;
  onSubmit: (text: string) => void;
  onChange?: (text: string) => void;
};

export const PromptInput = forwardRef<PromptInputHandle, PromptInputProps>(
  function PromptInput(
    {
      placeholder = "영어로 메시지 입력... (막히면 한국어로 써도 돼요)",
      disabled,
      onSubmit,
      onChange,
    },
    ref,
  ) {
    const [value, setValue] = useState("");
    const [isComposing, setIsComposing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => textareaRef.current?.focus(),
        clear: () => setValue(""),
        setValue: (text: string) => setValue(text),
      }),
      [],
    );

    // Auto-grow textarea up to 5 rows.
    useEffect(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = "auto";
      const lineHeight = 24;
      const max = lineHeight * 5;
      el.style.height = `${Math.min(el.scrollHeight, max)}px`;
    }, [value]);

    // Autofocus on mount.
    useEffect(() => {
      textareaRef.current?.focus();
    }, []);

    function send() {
      const trimmed = value.trim();
      if (!trimmed || disabled) return;
      onSubmit(trimmed);
      setValue("");
      onChange?.("");
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
      if (e.key !== "Enter") return;
      if (e.shiftKey) return; // newline
      if (isComposing || e.nativeEvent.isComposing) return; // IME safety
      e.preventDefault();
      send();
    }

    const empty = value.trim().length === 0;
    const overLimit = value.length >= MAX_LENGTH;
    const nearLimit = value.length >= WARNING_THRESHOLD;

    return (
      <div className="bg-background sticky bottom-0 border-t p-3">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              const next = e.target.value.slice(0, MAX_LENGTH);
              setValue(next);
              onChange?.(next);
            }}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="min-h-[2.5rem] flex-1 resize-none"
            aria-label="메시지 입력"
          />
          <div className="flex flex-col items-end gap-1">
            <Button
              type="button"
              size="icon"
              onClick={send}
              disabled={empty || disabled || overLimit}
              aria-label="보내기"
            >
              <SendHorizonalIcon />
            </Button>
            {nearLimit && (
              <span
                className={cn(
                  "text-xs",
                  overLimit ? "text-destructive" : "text-muted-foreground",
                )}
                aria-live="polite"
              >
                {value.length}/{MAX_LENGTH}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  },
);
