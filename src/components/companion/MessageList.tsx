"use client";

import { useEffect, useRef } from "react";
import type { CompanionMessage } from "@/lib/companion/types";
import { MessageBubble } from "./MessageBubble";

interface MessageListProps {
  messages: CompanionMessage[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="text-[var(--text-tertiary)] text-sm">
          <p className="mb-1 font-medium text-[var(--text-secondary)]">
            Ask me anything about Tokamak DAO
          </p>
          <p>I can help you understand proposals, delegates, and governance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isStreaming && (
        <div className="flex items-center gap-1 pl-12 text-[var(--text-tertiary)]">
          <span className="animate-pulse text-xs">Thinking...</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
