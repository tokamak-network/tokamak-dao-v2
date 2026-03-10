"use client";

import { useEffect, useRef } from "react";
import type { CompanionMessage, ScreenContext } from "@/lib/companion/types";
import { MessageBubble } from "./MessageBubble";

interface MessageListProps {
  messages: CompanionMessage[];
  isStreaming: boolean;
  screenContext?: ScreenContext;
}

export function MessageList({ messages, isStreaming, screenContext }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    const isProposalMode = screenContext?.mode === "forum_proposal" || screenContext?.mode === "make_proposal";
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="text-[var(--text-tertiary)] text-sm">
          <p className="mb-1 font-medium text-[var(--text-secondary)]">
            {isProposalMode
              ? "What agenda would you like to create?"
              : "Ask me anything about Tokamak DAO"}
          </p>
          <p>
            {isProposalMode
              ? "Tell me what you want to change and I'll help you from contract research to calldata generation."
              : "I can help you understand proposals, delegates, and governance."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {/* Typing indicator is now shown inside the message bubble itself */}
      <div ref={bottomRef} />
    </div>
  );
}
