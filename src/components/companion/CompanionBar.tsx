"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useCompanion } from "./CompanionProvider";
import { CharacterAvatar } from "./CharacterAvatar";
import { MessageList } from "./MessageList";
import { CompanionInput } from "./CompanionInput";

export function CompanionBar() {
  const {
    isExpanded,
    setIsExpanded,
    messages,
    isStreaming,
    error,
    screenContext,
    sendMessage,
    clearMessages,
    lastAssistantMessage,
  } = useCompanion();

  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [nudgeVisible, setNudgeVisible] = useState(false);

  const showNudge =
    screenContext.mode === "forum_proposal" &&
    !isExpanded &&
    messages.length === 0 &&
    !nudgeDismissed;

  // Animate in after a short delay
  useEffect(() => {
    if (showNudge) {
      const timer = setTimeout(() => setNudgeVisible(true), 500);
      return () => clearTimeout(timer);
    }
    setNudgeVisible(false);
  }, [showNudge]);

  return (
    <>
      {/* Mobile backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/40 z-[calc(var(--z-banner)-1)] lg:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Nudge speech bubble */}
      {showNudge && (
        <div
          className={cn(
            "fixed bottom-[calc(var(--companion-bar-height)+8px)] left-4 lg:left-8 lg:max-w-sm z-[var(--z-banner)]",
            "transition-all duration-[var(--duration-slow)] ease-[var(--ease-default)]",
            nudgeVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2"
          )}
        >
          <div
            className="relative bg-[var(--surface-primary)] border border-[var(--border-secondary)] rounded-2xl shadow-lg px-4 py-3 cursor-pointer"
            onClick={() => {
              setNudgeDismissed(true);
              setIsExpanded(true);
            }}
          >
            <div className="flex items-start gap-3">
              <CharacterAvatar size="sm" className="mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                어젠더를 작성하는데 필요한 것이 있나요? 무엇이든 도와드릴게요!
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setNudgeDismissed(true);
                }}
                className="flex-shrink-0 p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                aria-label="닫기"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Speech bubble tail */}
            <div className="absolute -bottom-2 left-8 w-4 h-4 bg-[var(--surface-primary)] border-r border-b border-[var(--border-secondary)] rotate-45" />
          </div>
        </div>
      )}

      {/* Bottom bar container */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[var(--z-banner)]",
          "bg-[var(--companion-bg)] border-t border-[var(--companion-border)]",
          "rounded-t-[var(--radius-2xl)] shadow-xl",
          "transition-all duration-[var(--duration-slow)] ease-[var(--ease-default)]",
          "flex flex-col overflow-hidden",
          isExpanded
            ? "h-[var(--companion-expanded-height-mobile)] lg:h-[var(--companion-expanded-height)]"
            : "h-[var(--companion-bar-height)]"
        )}
      >
        {/* Collapsed bar / Header — always visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "flex items-center gap-3 px-4 w-full text-left",
            "h-[var(--companion-bar-height)] min-h-[var(--companion-bar-height)]",
            "hover:bg-[var(--bg-secondary)]",
            "transition-colors duration-[var(--duration-fast)]",
            "cursor-pointer select-none"
          )}
        >
          <CharacterAvatar size="sm" />

          <div className="flex-1 min-w-0">
            {isExpanded ? (
              <>
                <span className="text-sm font-semibold text-[var(--text-primary)] truncate block">
                  DAO Companion
                </span>
                <span className="text-xs text-[var(--text-tertiary)] truncate block">
                  {screenContext.pageTitle}
                </span>
              </>
            ) : (
              <span className="text-sm text-[var(--text-secondary)] truncate block">
                {lastAssistantMessage || "Ask about DAO..."}
              </span>
            )}
          </div>

          {/* Clear button — expanded only */}
          {isExpanded && (
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                clearMessages();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  clearMessages();
                }
              }}
              className={cn(
                "p-1.5 rounded-md text-[var(--text-tertiary)]",
                "hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-secondary)]",
                "transition-colors duration-[var(--duration-fast)]"
              )}
              aria-label="Clear messages"
              title="Clear messages"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          )}

          {/* Chevron */}
          <svg
            className={cn(
              "w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0",
              "transition-transform duration-[var(--duration-normal)]",
              isExpanded && "rotate-180"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {/* Expanded content */}
        <div
          className={cn(
            "flex flex-col flex-1 min-h-0",
            !isExpanded && "invisible"
          )}
        >
          {/* Error banner */}
          {error && (
            <div className="px-4 py-2 bg-[var(--status-error-bg)] text-[var(--status-error-fg)] text-xs">
              {error}
            </div>
          )}

          {/* Messages */}
          <MessageList messages={messages} isStreaming={isStreaming} />

          {/* Input with suggested questions */}
          <CompanionInput
            onSend={sendMessage}
            disabled={isStreaming}
            suggestedQuestions={screenContext.suggestedQuestions}
            showSuggestions={messages.length === 0}
          />
        </div>
      </div>
    </>
  );
}
