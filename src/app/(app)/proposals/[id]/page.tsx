"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { ProposalDetail, type ProposalDetailData } from "@/components/proposals/ProposalDetail";
import type { ProposalStatus } from "@/types/governance";

// Mock data for development
const MOCK_PROPOSALS: Record<string, ProposalDetailData> = {
  "1": {
    id: "1",
    title: "TIP-001: Increase staking rewards by 5%",
    description: `## Summary
This proposal aims to increase the staking rewards for vTON holders by 5% to incentivize long-term participation in the Tokamak Network governance.

## Motivation
Current staking rewards may not be competitive enough compared to other DeFi protocols. By increasing the rewards, we can:
- Attract more participants to the governance process
- Reduce selling pressure on TON
- Strengthen the security of the network through increased staking

## Specification
- Increase emission ratio from 80% to 85%
- Apply changes immediately upon execution
- No changes to other parameters

## Risks
- Slightly higher inflation rate
- Potential impact on treasury reserves`,
    status: "active" as ProposalStatus,
    proposer: "0x1234567890123456789012345678901234567890",
    forVotes: 1250000,
    againstVotes: 320000,
    abstainVotes: 45000,
    totalVoters: 156,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    votingStartsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    votingEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  },
  "2": {
    id: "2",
    title: "TIP-002: Add new liquidity pool for TON/ETH",
    description: `## Summary
Proposal to add a new liquidity pool for TON/ETH pair on the Tokamak DEX.

## Details
- Initial liquidity: 100,000 TON + equivalent ETH
- Fee tier: 0.3%
- Trading rewards: 10% of fees distributed to LPs`,
    status: "pending" as ProposalStatus,
    proposer: "0x2345678901234567890123456789012345678901",
    forVotes: 890000,
    againstVotes: 210000,
    abstainVotes: 30000,
    totalVoters: 98,
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    votingStartsAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    votingEndsAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  "3": {
    id: "3",
    title: "TIP-003: Update governance parameters",
    description: `## Summary
Update various governance parameters to optimize the decision-making process.

## Changes
- Reduce voting delay from 2 days to 1 day
- Increase quorum from 4% to 5%
- Reduce proposal cost from 100 TON to 75 TON`,
    status: "executed" as ProposalStatus,
    proposer: "0x3456789012345678901234567890123456789012",
    forVotes: 2100000,
    againstVotes: 150000,
    abstainVotes: 80000,
    totalVoters: 234,
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    votingStartsAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    votingEndsAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
    queuedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    executedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  "4": {
    id: "4",
    title: "TIP-004: Treasury allocation for ecosystem grants",
    description: `## Summary
Allocate 500,000 TON from the treasury for ecosystem development grants.

## Allocation
- Developer grants: 300,000 TON
- Community initiatives: 150,000 TON
- Marketing: 50,000 TON`,
    status: "queued" as ProposalStatus,
    proposer: "0x4567890123456789012345678901234567890123",
    forVotes: 1800000,
    againstVotes: 420000,
    abstainVotes: 60000,
    totalVoters: 189,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    votingStartsAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    votingEndsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    queuedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
  },
  "5": {
    id: "5",
    title: "TIP-005: Reduce proposal creation cost to 50 TON",
    description: `## Summary
Reduce the cost of creating proposals from 100 TON to 50 TON.

## Rationale
Lower barrier to entry for community members to participate in governance.`,
    status: "failed" as ProposalStatus,
    proposer: "0x5678901234567890123456789012345678901234",
    forVotes: 450000,
    againstVotes: 890000,
    abstainVotes: 120000,
    totalVoters: 145,
    createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
    votingStartsAt: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000),
    votingEndsAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  },
  "6": {
    id: "6",
    title: "TIP-006: Emergency security patch implementation",
    description: `## Summary
Emergency security patch for a vulnerability discovered in the staking contract.

## Note
This proposal was canceled after the vulnerability was patched through the Security Council.`,
    status: "canceled" as ProposalStatus,
    proposer: "0x6789012345678901234567890123456789012345",
    forVotes: 50000,
    againstVotes: 10000,
    abstainVotes: 5000,
    totalVoters: 23,
    createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
    votingStartsAt: new Date(Date.now() - 34 * 24 * 60 * 60 * 1000),
    votingEndsAt: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000),
  },
};

interface ProposalPageProps {
  params: Promise<{ id: string }>;
}

export default function ProposalPage({ params }: ProposalPageProps) {
  const { id } = use(params);
  const proposal = MOCK_PROPOSALS[id];

  if (!proposal) {
    notFound();
  }

  return <ProposalDetail proposal={proposal} />;
}
