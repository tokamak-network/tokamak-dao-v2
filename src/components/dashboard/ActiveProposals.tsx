"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ProposalCard } from "@/components/ui/proposal-card";
import { Badge } from "@/components/ui/badge";
import { useProposalCount } from "@/hooks/contracts/useDAOGovernor";
import type { ProposalStatus } from "@/types/governance";

// Mock active proposals for display
const MOCK_PROPOSALS: {
  id: string;
  title: string;
  status: ProposalStatus;
  date: Date;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  totalVoters: number;
}[] = [];

/**
 * Active Proposals Section
 * Shows currently active proposals with voting status
 */
export function ActiveProposals() {
  const { isDeployed } = useProposalCount();

  // In production, we'd fetch active proposals from the contract
  // For now, use mock data
  const proposals = MOCK_PROPOSALS;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          Active Proposals
          <Badge variant="info" size="sm">
            {proposals.length}
          </Badge>
        </CardTitle>
        <Link
          href="/proposals"
          className="text-sm text-[var(--text-brand)] hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isDeployed && (
          <div className="text-center py-4 text-[var(--text-tertiary)]">
            <p className="text-sm">Contracts not deployed</p>
            <p className="text-xs mt-1">
              No proposals available
            </p>
          </div>
        )}
        {isDeployed && proposals.length === 0 && (
          <div className="text-center py-4 text-[var(--text-tertiary)]">
            <p className="text-sm">No active proposals</p>
            <p className="text-xs mt-1">
              Create a new proposal to get started
            </p>
          </div>
        )}
        {proposals.map((proposal) => (
          <ProposalCard
            key={proposal.id}
            id={proposal.id}
            title={proposal.title}
            status={proposal.status}
            date={proposal.date}
            forVotes={proposal.forVotes}
            againstVotes={proposal.againstVotes}
            abstainVotes={proposal.abstainVotes}
            totalVoters={proposal.totalVoters}
          />
        ))}
      </CardContent>
    </Card>
  );
}
