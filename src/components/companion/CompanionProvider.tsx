"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { CompanionMessage, ScreenContext } from "@/lib/companion/types";
import type { ExtractedProposal } from "@/lib/companion/proposal-data";
import { useScreenContext } from "./useScreenContext";
import { useCompanionChat } from "./useCompanionChat";

interface CompanionContextValue {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  messages: CompanionMessage[];
  isStreaming: boolean;
  error: string | null;
  screenContext: ScreenContext;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  abort: () => void;
  lastAssistantMessage: string | null;
  applyProposal: (data: ExtractedProposal) => void;
  registerApplyProposal: (handler: (data: ExtractedProposal) => void) => void;
}

const CompanionContext = createContext<CompanionContextValue | null>(null);

export function useCompanion() {
  const ctx = useContext(CompanionContext);
  if (!ctx) throw new Error("useCompanion must be used within CompanionProvider");
  return ctx;
}

export function CompanionProvider({ children }: { children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const applyProposalRef = useRef<((data: ExtractedProposal) => void) | null>(null);
  const screenContext = useScreenContext();
  const { messages, isStreaming, error, sendMessage: rawSendMessage, clearMessages, abort } =
    useCompanionChat();
  const prevRouteRef = useRef<string | null>(null);
  const greetedRoutesRef = useRef<Set<string>>(new Set());
  const isGreetingRef = useRef(false);

  const lastAssistantMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant" && messages[i].content) {
        return messages[i].content;
      }
    }
    return null;
  }, [messages]);

  const sendMessage = useCallback(
    async (content: string) => {
      await rawSendMessage(content, screenContext);
    },
    [rawSendMessage, screenContext]
  );

  const applyProposal = useCallback((data: ExtractedProposal) => {
    applyProposalRef.current?.(data);
  }, []);

  const registerApplyProposal = useCallback((handler: (data: ExtractedProposal) => void) => {
    applyProposalRef.current = handler;
  }, []);

  // Auto-greet on route change (first visit only)
  useEffect(() => {
    const currentRoute = screenContext.route;

    if (prevRouteRef.current === null) {
      prevRouteRef.current = currentRoute;
      return;
    }

    if (prevRouteRef.current === currentRoute || isGreetingRef.current) {
      return;
    }

    prevRouteRef.current = currentRoute;

    // Skip auto-greet for pages with specialized mode (e.g. forum_proposal) —
    // they have dedicated suggested questions that are more useful than a generic greeting
    if (!greetedRoutesRef.current.has(currentRoute) && currentRoute !== "/" && !screenContext.mode) {
      greetedRoutesRef.current.add(currentRoute);
      isGreetingRef.current = true;
      rawSendMessage(
        `I just navigated to the ${screenContext.pageTitle} page. Give me a brief overview of what I can do here.`,
        screenContext
      ).finally(() => {
        isGreetingRef.current = false;
      });
    }
  }, [screenContext, rawSendMessage]);

  return (
    <CompanionContext.Provider
      value={{
        isExpanded,
        setIsExpanded,
        messages,
        isStreaming,
        error,
        screenContext,
        sendMessage,
        clearMessages,
        abort,
        lastAssistantMessage,
        applyProposal,
        registerApplyProposal,
      }}
    >
      {children}
    </CompanionContext.Provider>
  );
}
