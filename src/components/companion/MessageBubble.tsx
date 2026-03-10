"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { CompanionMessage } from "@/lib/companion/types";
import {
  extractProposal,
  removeProposalBlocks,
  normalizeArgs,
  type ExtractedProposal,
} from "@/lib/companion/proposal-data";
import { CharacterAvatar } from "./CharacterAvatar";
import { ToolCallBlock } from "./ToolCallBlock";
import { useCompanion } from "./CompanionProvider";

interface MessageBubbleProps {
  message: CompanionMessage;
}

function ProposalCard({
  proposal,
  onApply,
}: {
  proposal: ExtractedProposal;
  onApply: () => void;
}) {
  const [applied, setApplied] = useState(false);
  const { calldata } = proposal;

  return (
    <div className="mt-2 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--border-primary)] bg-[var(--surface-secondary)]">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            {proposal.title || "Proposal"}
          </p>
          {calldata.atomicExecute && (
            <span className="text-[10px] font-medium text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">
              ATOMIC
            </span>
          )}
        </div>
      </div>
      <div className="px-3 py-2 space-y-2">
        {calldata.decodedCalls.map((call, i) => (
          <div key={i} className="text-xs space-y-0.5">
            <p className="font-medium text-[var(--text-primary)]">
              {call.targetName}.{call.functionName}()
            </p>
            <p className="text-[var(--text-tertiary)] font-mono truncate">
              Target: {call.target}
            </p>
            {call.args.length > 0 && (
              <div className="pl-2 border-l-2 border-[var(--border-primary)]">
                {normalizeArgs(call.args).map((arg, j) => (
                  <p key={j} className="text-[var(--text-secondary)]">
                    {arg.name}: <span className="font-mono">{arg.value}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="px-3 py-2 border-t border-[var(--border-primary)]">
        <button
          onClick={() => {
            onApply();
            setApplied(true);
          }}
          disabled={applied}
          className={cn(
            "w-full rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            applied
              ? "bg-[var(--color-success-100)] text-[var(--color-success-700)] cursor-default"
              : "bg-[var(--bg-brand)] text-[var(--text-white)] hover:opacity-90"
          )}
        >
          {applied ? "Applied to Form" : "Apply to Form"}
        </button>
      </div>
    </div>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const { applyProposal } = useCompanion();

  const proposal = useMemo(
    () => (!isUser ? extractProposal(message.content) : null),
    [isUser, message.content]
  );

  const displayContent = useMemo(
    () => (proposal ? removeProposalBlocks(message.content) : message.content),
    [proposal, message.content]
  );

  return (
    <div className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && <CharacterAvatar size="sm" className="mt-1" />}

      <div className={cn("flex flex-col gap-1 max-w-[85%]", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-sm leading-relaxed",
            isUser
              ? "bg-[var(--bg-brand)] text-[var(--text-white)] rounded-br-md"
              : "bg-[var(--surface-secondary)] text-[var(--text-primary)] rounded-bl-md"
          )}
        >
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <div className="prose-companion">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {displayContent || "\u200B"}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {proposal && (
          <ProposalCard
            proposal={proposal}
            onApply={() => applyProposal(proposal)}
          />
        )}

        {message.toolCalls?.map((tc) => (
          <ToolCallBlock key={tc.id} toolCall={tc} />
        ))}
      </div>
    </div>
  );
}
