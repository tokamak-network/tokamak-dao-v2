"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { CompanionMessage, ScreenContext, ProposalContextData } from "@/lib/companion/types";
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
  setProposalContext: (data: ProposalContextData | null) => void;
  pendingProposal: ExtractedProposal | null;
  clearPendingProposal: () => void;
}

const CompanionContext = createContext<CompanionContextValue | null>(null);

export function useCompanion() {
  const ctx = useContext(CompanionContext);
  if (!ctx) throw new Error("useCompanion must be used within CompanionProvider");
  return ctx;
}

export function CompanionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [proposalContext, setProposalContext] = useState<ProposalContextData | null>(null);
  const [pendingProposal, setPendingProposal] = useState<ExtractedProposal | null>(null);
  const applyProposalRef = useRef<((data: ExtractedProposal) => void) | null>(null);
  const baseScreenContext = useScreenContext();
  const screenContext = useMemo<ScreenContext>(
    () => proposalContext ? { ...baseScreenContext, proposalData: proposalContext } : baseScreenContext,
    [baseScreenContext, proposalContext]
  );

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
      // Auto-detect agenda creation intent and override mode to forum_proposal
      // so the agent backend activates its proposal-building tools
      let ctx = screenContext;
      if (!screenContext.mode) {
        const lower = content.toLowerCase();
        const isAgendaIntent =
          lower.includes("agenda") ||
          lower.includes("안건") ||
          lower.includes("만들고 싶") ||
          lower.includes("생성");
        if (isAgendaIntent) {
          ctx = { ...screenContext, mode: "forum_proposal" };
        }
      }
      await rawSendMessage(content, ctx);
    },
    [rawSendMessage, screenContext]
  );

  const applyProposal = useCallback((data: ExtractedProposal) => {
    if (pathname === "/proposals/create") {
      // Already on create page — apply directly
      applyProposalRef.current?.(data);
    } else {
      // Store data and navigate to create page
      setPendingProposal(data);
      router.push("/proposals/create");
    }
  }, [pathname, router]);

  const clearPendingProposal = useCallback(() => {
    setPendingProposal(null);
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
        setProposalContext,
        pendingProposal,
        clearPendingProposal,
      }}
    >
      {children}
    </CompanionContext.Provider>
  );
}
