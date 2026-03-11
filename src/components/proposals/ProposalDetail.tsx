"use client";

import * as React from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { VotingProgress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProposalTimeline } from "./ProposalTimeline";
import { ProposalActions } from "./ProposalActions";
import { VotingModal } from "./VotingModal";
import { cn, formatAddress, formatNumber, formatDate, formatVTON } from "@/lib/utils";
import type { ProposalStatus } from "@/types/governance";
import { useHasVoted } from "@/hooks/contracts/useDAOGovernor";
import { useTotalDelegated } from "@/hooks/contracts/useDelegateRegistry";
import { useCompanion, CharacterAvatar } from "@/components/companion";

export interface ProposalDetailData {
  id: string;
  title: string;
  description: string;
  status: ProposalStatus;
  proposer: `0x${string}`;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  totalVoters: number;
  createdAt: Date;
  votingStartsAt: Date;
  votingEndsAt: Date;
  executedAt?: Date;
  queuedAt?: Date;
  eta?: Date; // timelock expiry - when queued proposal becomes executable
  burnRate?: number; // basis points (0-10000 = 0-100%)
  targets?: string[]; // contract addresses to call
  values?: string[]; // ETH values per call (as string to avoid bigint serialization)
  calldatas?: string[]; // encoded function call data
}

export interface ProposalDetailProps {
  className?: string;
  proposal: ProposalDetailData;
  onVoteSuccess?: () => void;
}

export function ProposalDetail({ className, proposal, onVoteSuccess }: ProposalDetailProps) {
  const { address, isConnected } = useAccount();
  const { isExpanded, setIsExpanded, sendMessage, messages, setProposalContext } = useCompanion();
  const [isVotingModalOpen, setIsVotingModalOpen] = React.useState(false);

  // Inject proposal data into companion context
  React.useEffect(() => {
    setProposalContext({
      id: proposal.id,
      title: proposal.title,
      description: proposal.description,
      status: proposal.status,
      proposer: proposal.proposer,
      forVotes: proposal.forVotes,
      againstVotes: proposal.againstVotes,
      abstainVotes: proposal.abstainVotes,
      totalVoters: proposal.totalVoters,
      targets: proposal.targets,
      values: proposal.values,
      calldatas: proposal.calldatas,
      burnRate: proposal.burnRate,
    });
    return () => setProposalContext(null);
  }, [proposal, setProposalContext]);

  // Check if this is a demo proposal (cannot interact with contract)
  const isDemo = proposal.id.startsWith("demo-");
  const proposalIdBigInt = isDemo ? BigInt(0) : BigInt(proposal.id);

  const { data: hasVoted } = useHasVoted(
    proposalIdBigInt,
    isDemo ? undefined : address
  );
  const { data: votingPower } = useTotalDelegated(isDemo ? undefined : address);
  const hasVotingPower = votingPower !== undefined && votingPower > BigInt(0);

  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
  const forPercentage = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (proposal.againstVotes / totalVotes) * 100 : 0;
  const abstainPercentage = totalVotes > 0 ? (proposal.abstainVotes / totalVotes) * 100 : 0;

  const showVoteButton = !isDemo && proposal.status === "active";
  const voteDisabledReason = !isConnected
    ? "Connect your wallet to vote"
    : hasVoted
      ? "You have already voted on this proposal"
      : !hasVotingPower
        ? "You need vTON to vote on proposals"
        : null;

  // Remove title from description if it appears at the beginning
  const descriptionWithoutTitle = React.useMemo(() => {
    const lines = proposal.description.split('\n');
    const firstLine = lines[0]?.trim();

    // Check if first line is a heading that matches the title
    if (firstLine) {
      // Remove markdown heading prefix (# or ##)
      const headingText = firstLine.replace(/^#{1,2}\s*/, '');
      if (headingText === proposal.title) {
        // Remove the first line and any following empty lines
        let startIndex = 1;
        while (startIndex < lines.length && lines[startIndex].trim() === '') {
          startIndex++;
        }
        return lines.slice(startIndex).join('\n');
      }
    }
    return proposal.description;
  }, [proposal.description, proposal.title]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Back link + Companion CTA */}
      <div className="relative">
        <Link
          href="/proposals"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <svg
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Back to Proposals
        </Link>

        {/* Companion CTA — absolute so it doesn't affect layout, hidden when panel is open */}
        {!isExpanded && <button
          onClick={() => {
            setIsExpanded(true);
            if (messages.length === 0) {
              sendMessage(`Explain this proposal: "${proposal.title}"`);
            }
          }}
          className="group absolute right-0 top-0 flex items-start cursor-pointer transition-transform duration-200 hover:scale-[1.03]"
        >
          {/* Speech bubble with tail on bottom-right pointing to avatar */}
          <div className="relative px-5 py-3 rounded-2xl bg-[var(--companion-bg,var(--bg-secondary))] border border-[var(--border-default)] text-base font-medium text-[var(--text-secondary)] group-hover:border-[var(--border-hover)] group-hover:text-[var(--text-primary)] transition-colors shadow-lg mr-2 mt-2">
            Ask me about this proposal!
            {/* Diagonal tail pointing bottom-right toward avatar */}
            <svg className="absolute -right-[10px] -bottom-[6px] w-4 h-4 transition-colors scale-x-[-1]" viewBox="0 0 16 16" fill="none">
              <path d="M16 0 C12 4 4 6 0 16 C2 10 6 6 16 0Z" fill="var(--companion-bg,var(--bg-secondary))" />
              <path d="M16 0 C12 4 4 6 0 16" stroke="var(--border-default)" strokeWidth="1" className="group-hover:[stroke:var(--border-hover)] transition-colors" />
            </svg>
          </div>
          <CharacterAvatar size="lg" className="!w-16 !h-16 !border-[3px] flex-shrink-0" />
        </button>}
      </div>

      {/* Header */}
      <div className="space-y-4">
        <div className="space-y-2">
          <StatusBadge status={proposal.status} size="md" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {proposal.title}
          </h1>
        </div>

        <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
          <span>
            Proposed by{" "}
            <span className="font-mono text-[var(--text-primary)]">
              {formatAddress(proposal.proposer)}
            </span>
          </span>
          <span className="text-[var(--text-tertiary)]">|</span>
          <span>{formatDate(proposal.createdAt)}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* Description */}
          <Card>
            <CardContent className="py-4">
              <div className="proposal-prose max-w-none break-words overflow-hidden">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{descriptionWithoutTitle}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {/* Actions - only for real proposals */}
          {!isDemo && (
            <ProposalActions
              proposalId={proposalIdBigInt}
              status={proposal.status}
              proposer={proposal.proposer}
              canExecute={proposal.status === "queued"}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Voting Results */}
          <Card>
            <CardHeader>
              <CardTitle>Voting Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <VotingProgress
                forVotes={proposal.forVotes}
                againstVotes={proposal.againstVotes}
                abstainVotes={proposal.abstainVotes}
              />

              <div className="space-y-3">
                {/* For */}
                <div className="p-3 rounded-lg bg-[var(--color-vote-for)]/10">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[var(--text-secondary)]">For</p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {forPercentage.toFixed(1)}%
                    </p>
                  </div>
                  <p className="text-lg font-bold text-[var(--color-vote-for)]">
                    {formatNumber(proposal.forVotes, { compact: true })}
                  </p>
                </div>

                {/* Against */}
                <div className="p-3 rounded-lg bg-[var(--color-vote-against)]/10">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[var(--text-secondary)]">Against</p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {againstPercentage.toFixed(1)}%
                    </p>
                  </div>
                  <p className="text-lg font-bold text-[var(--color-vote-against)]">
                    {formatNumber(proposal.againstVotes, { compact: true })}
                  </p>
                </div>

                {/* Abstain */}
                <div className="p-3 rounded-lg bg-[var(--color-vote-abstain)]/10">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[var(--text-secondary)]">Abstain</p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {abstainPercentage.toFixed(1)}%
                    </p>
                  </div>
                  <p className="text-lg font-bold text-[var(--color-vote-abstain)]">
                    {formatNumber(proposal.abstainVotes, { compact: true })}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-default)]">
                <p className="text-sm text-[var(--text-secondary)]">
                  Total Votes:{" "}
                  <span className="font-medium text-[var(--text-primary)]">
                    {formatNumber(totalVotes, { compact: true })}
                  </span>{" "}
                  from{" "}
                  <span className="font-medium text-[var(--text-primary)]">
                    {proposal.totalVoters}
                  </span>{" "}
                  addresses
                </p>
              </div>

              {/* Vote CTA */}
              {showVoteButton && (
                <div className="pt-3 border-t border-[var(--border-default)] space-y-2">
                  {voteDisabledReason ? (
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="w-full inline-block cursor-not-allowed">
                            <Button className="w-full pointer-events-none" disabled>
                              Cast Vote
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>{voteDisabledReason}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <>
                      <Button
                        className="w-full"
                        onClick={() => setIsVotingModalOpen(true)}
                      >
                        Cast Vote
                      </Button>
                      <p className="text-xs text-[var(--text-tertiary)] text-center">
                        {votingPower !== undefined ? formatVTON(votingPower, { compact: true }) : "0"} vTON
                      </p>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardContent>
              <ProposalTimeline
                proposalStatus={proposal.status}
                createdAt={proposal.createdAt}
                votingStartsAt={proposal.votingStartsAt}
                votingEndsAt={proposal.votingEndsAt}
                executedAt={proposal.executedAt}
                queuedAt={proposal.queuedAt}
                eta={proposal.eta}
              />
            </CardContent>
          </Card>

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle>Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Proposer</span>
                <span className="font-mono text-[var(--text-primary)]">
                  {formatAddress(proposal.proposer)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Status</span>
                <StatusBadge status={proposal.status} size="sm" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-[var(--space-1)] text-[var(--text-secondary)]">
                  Vote Burn Rate
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" aria-label="Vote Burn Rate info">
                          <span
                            className="inline-flex items-center justify-center size-[14px] rounded-full border-[1.5px] border-[var(--text-tertiary)] text-[var(--text-tertiary)] hover:border-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors cursor-help text-[10px] font-semibold leading-none"
                            aria-hidden="true"
                          >
                            ?
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>The percentage of voting power consumed when casting a vote. For example, if the burn rate is 3.4% and you vote with 100 voting power, 3.4 will be permanently burned.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </span>
                <span className="text-[var(--text-primary)]">
                  {proposal.burnRate !== undefined ? `${(proposal.burnRate / 100).toFixed(1)}%` : "0%"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Voting Modal - only for real proposals */}
      {!isDemo && (
        <VotingModal
          isOpen={isVotingModalOpen}
          onClose={() => setIsVotingModalOpen(false)}
          proposalId={proposalIdBigInt}
          proposalTitle={proposal.title}
          onVoteSuccess={onVoteSuccess}
          burnRate={proposal.burnRate}
        />
      )}
    </div>
  );
}
