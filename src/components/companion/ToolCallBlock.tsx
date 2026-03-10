"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ToolCall } from "@/lib/companion/types";

interface ToolCallBlockProps {
  toolCall: ToolCall;
}

const statusIcons: Record<ToolCall["status"], string> = {
  pending: "\u23F3",
  running: "\u23F3",
  done: "\u2705",
  error: "\u274C",
};

export function ToolCallBlock({ toolCall }: ToolCallBlockProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border-secondary)] bg-[var(--surface-tertiary)]",
        "text-xs overflow-hidden"
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-2 w-full px-3 py-1.5 text-left",
          "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]",
          "transition-colors duration-[var(--duration-fast)]"
        )}
      >
        <span>{statusIcons[toolCall.status]}</span>
        <span className="font-medium truncate">{toolCall.name}</span>
        <svg
          className={cn(
            "w-3 h-3 ml-auto transition-transform duration-[var(--duration-fast)]",
            expanded && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 py-2 border-t border-[var(--border-secondary)]">
          <div className="mb-1 text-[var(--text-tertiary)]">Input:</div>
          <pre className="text-[var(--text-secondary)] whitespace-pre-wrap break-all">
            {JSON.stringify(toolCall.input, null, 2)}
          </pre>
          {toolCall.result && (
            <>
              <div className="mt-2 mb-1 text-[var(--text-tertiary)]">Result:</div>
              <pre className="text-[var(--text-secondary)] whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                {toolCall.result}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
