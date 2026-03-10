"use client";

import { useEffect, useCallback } from "react";
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
  } = useCompanion();

  // ESC key to close panel
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) {
        setIsExpanded(false);
      }
    },
    [isExpanded, setIsExpanded]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Panel header (expanded)
  const panelHeader = (
    <div className="flex items-center gap-3 px-4 h-[var(--companion-bar-height)] min-h-[var(--companion-bar-height)] border-b border-[var(--companion-border)]">
      <CharacterAvatar size="sm" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-[var(--text-primary)] truncate block">
          DAO Companion
        </span>
        <span className="text-xs text-[var(--text-tertiary)] truncate block">
          {screenContext.pageTitle}
        </span>
      </div>

      {/* Clear button */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => clearMessages()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") clearMessages();
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

      {/* Close button */}
      <button
        onClick={() => setIsExpanded(false)}
        className={cn(
          "p-1.5 rounded-md text-[var(--text-tertiary)]",
          "hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-secondary)]",
          "transition-colors duration-[var(--duration-fast)]"
        )}
        aria-label="Close panel"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );

  // Expanded content (messages + input)
  const expandedContent = (
    <div className="flex flex-col flex-1 min-h-0">
      {error && (
        <div className="px-4 py-2 bg-[var(--status-error-bg)] text-[var(--status-error-fg)] text-xs">
          {error}
        </div>
      )}
      <MessageList messages={messages} isStreaming={isStreaming} />
      <CompanionInput
        onSend={sendMessage}
        disabled={isStreaming}
        suggestedQuestions={screenContext.suggestedQuestions}
        showSuggestions={messages.length === 0}
      />
    </div>
  );

  return (
    <>
      {/* ===== MOBILE (< lg): Bottom expansion ===== */}

      {/* Mobile backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/40 z-[calc(var(--z-banner)-1)] lg:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Mobile bottom panel */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[var(--z-banner)] lg:hidden",
          "bg-[var(--companion-bg)] border-t border-[var(--companion-border)]",
          "rounded-t-[var(--radius-2xl)] shadow-xl",
          "transition-all duration-[var(--duration-slow)] ease-[var(--ease-default)]",
          "flex flex-col overflow-hidden",
          isExpanded
            ? "h-[var(--companion-expanded-height-mobile)]"
            : "h-0"
        )}
      >
        {panelHeader}
        <div className={cn("flex flex-col flex-1 min-h-0", !isExpanded && "invisible")}>
          {expandedContent}
        </div>
      </div>

      {/* ===== DESKTOP (lg+): Right side panel ===== */}
      <div
        className={cn(
          "fixed top-0 right-0 bottom-0 z-[var(--z-banner)] hidden lg:flex flex-col",
          "w-[var(--companion-panel-width)]",
          "bg-[var(--companion-bg)] border-l border-[var(--companion-border)]",
          "shadow-xl",
          "transition-transform duration-[var(--duration-slow)] ease-[var(--ease-default)]",
          isExpanded ? "translate-x-0" : "translate-x-full"
        )}
      >
        {panelHeader}
        {expandedContent}
      </div>
    </>
  );
}
