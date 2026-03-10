"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  const prevRouteRef = useRef(screenContext.route);

  // Reset nudge when navigating to a new page
  useEffect(() => {
    if (prevRouteRef.current !== screenContext.route) {
      prevRouteRef.current = screenContext.route;
      setNudgeDismissed(false);
    }
  }, [screenContext.route]);

  // Show floating character + nudge when panel is closed and no messages yet
  const showFloating = !isExpanded;
  const showNudge = showFloating && messages.length === 0 && !nudgeDismissed;

  // Animate nudge in after a short delay
  useEffect(() => {
    if (showNudge) {
      const timer = setTimeout(() => setNudgeVisible(true), 800);
      return () => clearTimeout(timer);
    }
    setNudgeVisible(false);
  }, [showNudge]);

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

  const openPanel = () => {
    setNudgeDismissed(true);
    setIsExpanded(true);
  };

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
      {/* ===== Floating character FAB + nudge bubble ===== */}
      {showFloating && (
        <div className="fixed bottom-6 right-6 z-[var(--z-banner)] flex flex-col items-end gap-2">
          {/* Nudge speech bubble */}
          <div
            className={cn(
              "max-w-[240px] transition-all duration-[var(--duration-slow)] ease-[var(--ease-default)]",
              showNudge && nudgeVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2 pointer-events-none"
            )}
          >
            <div
              className="relative bg-[var(--surface-primary)] border border-[var(--border-secondary)] rounded-2xl shadow-lg px-3.5 py-2.5 cursor-pointer"
              onClick={openPanel}
            >
              <div className="flex items-start gap-2">
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                  궁금한 것이 있다면 저와 대화해봐요!
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setNudgeDismissed(true);
                  }}
                  className="flex-shrink-0 p-0.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                  aria-label="닫기"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Speech bubble tail pointing down-right toward the avatar */}
              <div className="absolute -bottom-1.5 right-5 w-3 h-3 bg-[var(--surface-primary)] border-r border-b border-[var(--border-secondary)] rotate-45" />
            </div>
          </div>

          {/* Character avatar FAB */}
          <button
            onClick={openPanel}
            className={cn(
              "rounded-full shadow-lg",
              "ring-2 ring-[var(--border-secondary)] hover:ring-[var(--accent-primary)]",
              "transition-all duration-[var(--duration-normal)]",
              "hover:scale-110 active:scale-95",
              "cursor-pointer"
            )}
            aria-label="Open DAO Companion"
          >
            <CharacterAvatar size="md" />
          </button>
        </div>
      )}

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
