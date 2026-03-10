"use client";

import { useState, useCallback, useRef } from "react";
import type { CompanionMessage, ToolCall, ScreenContext } from "@/lib/companion/types";
import { parseSSEStream } from "@/lib/companion/sse-parser";

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

export function useCompanionChat() {
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamGenRef = useRef(0);

  const sendMessage = useCallback(
    async (content: string, screenContext: ScreenContext) => {
      // Abort any existing stream before starting a new one
      abortRef.current?.abort();

      const gen = ++streamGenRef.current;

      setError(null);

      const userMessage: CompanionMessage = {
        id: generateId(),
        role: "user",
        content,
        timestamp: Date.now(),
      };

      const assistantMessage: CompanionMessage = {
        id: generateId(),
        role: "assistant",
        content: "",
        toolCalls: [],
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);

      // Build API messages from history
      const apiMessages = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content },
      ];

      abortRef.current = new AbortController();

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages, screenContext }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        for await (const event of parseSSEStream(response.body)) {
          switch (event.type) {
            case "text_delta":
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + event.text,
                  };
                }
                return updated;
              });
              break;

            case "tool_use": {
              const toolCall: ToolCall = {
                id: event.id,
                name: event.name,
                input: event.input,
                status: "running",
              };
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    toolCalls: [...(last.toolCalls || []), toolCall],
                  };
                }
                return updated;
              });
              break;
            }

            case "tool_result":
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "assistant" && last.toolCalls) {
                  const toolCalls = last.toolCalls.map((tc) =>
                    tc.id === event.id
                      ? {
                          ...tc,
                          result: event.result,
                          status: (event.isError ? "error" : "done") as ToolCall["status"],
                        }
                      : tc
                  );
                  updated[updated.length - 1] = { ...last, toolCalls };
                }
                return updated;
              });
              break;

            case "error":
              setError(event.message);
              break;

            case "done":
              break;
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "An error occurred";
        setError(message);
        // Remove empty assistant message on error
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && !last.content && !last.toolCalls?.length) {
            return prev.slice(0, -1);
          }
          return prev;
        });
      } finally {
        // Only update streaming state if this is still the latest stream
        if (streamGenRef.current === gen) {
          setIsStreaming(false);
          abortRef.current = null;
        }
      }
    },
    [messages]
  );

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setIsStreaming(false);
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { messages, isStreaming, error, sendMessage, clearMessages, abort };
}
