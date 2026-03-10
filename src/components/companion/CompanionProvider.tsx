"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from "react";
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
