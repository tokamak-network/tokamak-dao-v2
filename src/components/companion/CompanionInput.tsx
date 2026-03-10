"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface CompanionInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  suggestedQuestions: string[];
  showSuggestions: boolean;
}

export function CompanionInput({
  onSend,
  disabled,
  suggestedQuestions,
  showSuggestions,
}: CompanionInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="border-t border-[var(--border-secondary)] p-3">
      {showSuggestions && suggestedQuestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => onSend(q)}
              disabled={disabled}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full",
                "border border-[var(--border-brand)] text-[var(--text-brand)]",
                "hover:bg-[var(--bg-brand-subtle)]",
                "transition-colors duration-[var(--duration-fast)]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Ask about DAO..."
          className={cn(
            "flex-1 h-9 px-3 text-sm rounded-lg",
            "bg-[var(--input-bg)] text-[var(--input-text)]",
            "border border-[var(--input-border)]",
            "placeholder:text-[var(--input-placeholder)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--input-border-focus)] focus:ring-offset-1",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className={cn(
            "h-9 w-9 flex items-center justify-center rounded-lg flex-shrink-0",
            "bg-[var(--button-primary-bg)] text-[var(--button-primary-fg)]",
            "hover:bg-[var(--button-primary-bg-hover)]",
            "transition-colors duration-[var(--duration-fast)]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          aria-label="Send message"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
