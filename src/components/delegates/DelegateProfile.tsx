"use client";

import * as React from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddressAvatar } from "@/components/ui/avatar";
import { formatAddress, formatVTON } from "@/lib/utils";
import {
  useTotalDelegated,
  useDelegateInfo,
} from "@/hooks/contracts/useDelegateRegistry";
import { useVTONBalance } from "@/hooks/contracts/useVTON";
import { useDelegateProfile } from "@/hooks/useDelegateProfile";
import { useDelegateVotingHistory } from "@/hooks/contracts/useDelegateVotingHistory";
import { DelegationModal } from "./DelegationModal";

const SUPPORT_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "Against", color: "var(--color-vote-against)" },
  1: { label: "For", color: "var(--color-vote-for)" },
  2: { label: "Abstain", color: "var(--color-vote-abstain)" },
};

export function DelegateProfile({ address }: { address: `0x${string}` }) {
  const { address: userAddress } = useAccount();
  const [delegationModalOpen, setDelegationModalOpen] = React.useState(false);

  // Supabase profile (priority)
  const { profile, isLoading: profileLoading } = useDelegateProfile(address);

  // On-chain data (fallback / always used for voting power)
  const { data: delegateInfo, isLoading: infoLoading } = useDelegateInfo(address);
  const { data: votingPower } = useTotalDelegated(address);
  const { data: vtonBalance } = useVTONBalance(userAddress);
  const { votes, stats, isLoading: votesLoading } = useDelegateVotingHistory(address);

  const hasNoVTON = !vtonBalance || vtonBalance === BigInt(0);

  // Determine display data (Supabase > on-chain)
  const displayName = profile?.display_name || formatAddress(address);
  const avatarUrl = profile?.avatar_url || undefined;
  const statement =
    profile?.statement || delegateInfo?.profile || null;
  const votingPhilosophy =
    profile?.voting_philosophy || delegateInfo?.votingPhilosophy || null;
  const interests = profile?.interests
    ? profile.interests
    : delegateInfo?.interests
      ? delegateInfo.interests.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];
  const isActive = delegateInfo?.isActive ?? false;
  const registeredAt = delegateInfo?.registeredAt
    ? new Date(Number(delegateInfo.registeredAt) * 1000)
    : null;

  const isLoading = profileLoading || infoLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-40 bg-[var(--bg-tertiary)] rounded animate-pulse" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-96 bg-[var(--bg-tertiary)] rounded-lg animate-pulse" />
          <div className="lg:col-span-2 h-96 bg-[var(--bg-tertiary)] rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/delegates"
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
        Back to Delegates
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardContent className="py-6">
              <div className="flex flex-col items-center text-center gap-4">
                <AddressAvatar address={address} src={avatarUrl} size="lg" />
                <div className="space-y-1">
                  <h1 className="text-lg font-bold text-[var(--text-primary)]">
                    {displayName}
                  </h1>
                  <p className="text-xs font-mono text-[var(--text-tertiary)]">
                    {formatAddress(address, 6)}
                  </p>
                </div>
                {isActive && (
                  <Badge variant="success" size="sm">Active</Badge>
                )}

                {/* SNS Links */}
                {(profile?.twitter || profile?.discord || profile?.github || profile?.website) && (
                  <div className="flex items-center gap-3">
                    {profile?.twitter && (
                      <a
                        href={profile.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                        aria-label="Twitter"
                      >
                        <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </a>
                    )}
                    {profile?.github && (
                      <a
                        href={profile.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                        aria-label="GitHub"
                      >
                        <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                        </svg>
                      </a>
                    )}
                    {profile?.discord && (
                      <span
                        className="text-xs text-[var(--text-tertiary)]"
                        title="Discord"
                      >
                        {profile.discord}
                      </span>
                    )}
                    {profile?.website && (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                        aria-label="Website"
                      >
                        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 003 12c0-1.605.42-3.113 1.157-4.418" />
                        </svg>
                      </a>
                    )}
                  </div>
                )}

                {/* Interests */}
                {interests.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {interests.map((interest: string) => (
                      <Badge key={interest} variant="default" size="sm">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Voting Power</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {formatVTON(votingPower ?? BigInt(0), { compact: true })} vTON
                </span>
              </div>
              {registeredAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Registered</span>
                  <span className="text-[var(--text-primary)]">
                    {registeredAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Voting Record Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Voting Record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-vote-for)]">For</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {stats.forCount}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-vote-against)]">Against</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {stats.againstCount}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-vote-abstain)]">Abstain</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {stats.abstainCount}
                </span>
              </div>
              <div className="pt-2 border-t border-[var(--border-default)] flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Total</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {stats.totalVotes}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Delegate Button */}
          <Button
            className="w-full"
            disabled={hasNoVTON}
            title={hasNoVTON ? "You need vTON to delegate" : undefined}
            onClick={() => setDelegationModalOpen(true)}
          >
            Delegate
          </Button>
        </div>

        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Delegate Statement */}
          {(statement || votingPhilosophy) && (
            <Card>
              <CardHeader>
                <CardTitle>Delegate Statement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="proposal-prose max-w-none space-y-6">
                  {statement && (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {statement}
                    </ReactMarkdown>
                  )}
                  {votingPhilosophy && (
                    <>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] mt-4">
                        Voting Philosophy
                      </h3>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {votingPhilosophy}
                      </ReactMarkdown>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Past Votes */}
          <Card>
            <CardHeader>
              <CardTitle>Past Votes</CardTitle>
            </CardHeader>
            <CardContent>
              {votesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 bg-[var(--bg-tertiary)] rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              ) : votes.length === 0 ? (
                <p className="text-sm text-[var(--text-tertiary)] text-center py-8">
                  No voting history found
                </p>
              ) : (
                <div className="space-y-3">
                  {votes.map((vote) => {
                    const support = SUPPORT_LABELS[vote.support] ?? {
                      label: "Unknown",
                      color: "var(--text-tertiary)",
                    };
                    return (
                      <Link
                        key={vote.transactionHash}
                        href={`/proposals/${vote.proposalId.toString()}`}
                        className="block p-3 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                              Proposal #{vote.proposalId.toString().slice(0, 8)}...
                            </p>
                            <p className="text-xs text-[var(--text-tertiary)]">
                              {formatVTON(vote.weight, { compact: true })} vTON
                            </p>
                          </div>
                          <span
                            className="text-xs font-medium px-2 py-1 rounded"
                            style={{
                              color: support.color,
                              backgroundColor: `color-mix(in srgb, ${support.color} 15%, transparent)`,
                            }}
                          >
                            {support.label}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delegation Modal */}
      <DelegationModal
        open={delegationModalOpen}
        onClose={() => setDelegationModalOpen(false)}
        delegatee={address}
        mode="delegate"
      />
    </div>
  );
}
