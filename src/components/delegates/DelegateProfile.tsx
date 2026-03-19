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
import { VotingProgress } from "@/components/ui/progress";
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
  const displayName = profile?.display_name || delegateInfo?.profile || formatAddress(address);
  const avatarUrl = profile?.avatar_url || undefined;
  const votingPhilosophy =
    profile?.voting_philosophy || delegateInfo?.votingPhilosophy || null;
  const whyDelegate = delegateInfo?.interests || null;
  const interests = profile?.interests
    ? profile.interests
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
        <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
          <div className="h-[480px] bg-[var(--bg-tertiary)] rounded-lg animate-pulse" />
          <div className="space-y-6">
            <div className="h-32 bg-[var(--bg-tertiary)] rounded-lg animate-pulse" />
            <div className="h-96 bg-[var(--bg-tertiary)] rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/voters"
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

      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        {/* ===== Left Panel: Delegate Info ===== */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card padding="none">
            {/* Section 1: Profile Header */}
            <div className="p-6">
              <div className="flex items-start gap-4">
                <AddressAvatar address={address} src={avatarUrl} size="2xl" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg font-bold text-[var(--text-primary)] truncate">
                      {displayName}
                    </h1>
                    <Badge variant={isActive ? "success" : "default"} size="sm">
                      {isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-xs font-mono text-[var(--text-tertiary)]">
                    {formatAddress(address, 6)}
                  </p>

                  {/* Social Links */}
                  {(profile?.twitter || profile?.discord || profile?.github || profile?.website) && (
                    <div className="flex items-center gap-1.5">
                      {profile?.twitter && (
                        <a
                          href={profile.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center size-7 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                          aria-label="Twitter"
                        >
                          <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                        </a>
                      )}
                      {profile?.github && (
                        <a
                          href={profile.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center size-7 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                          aria-label="GitHub"
                        >
                          <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                          </svg>
                        </a>
                      )}
                      {profile?.discord && (
                        <span
                          className="inline-flex items-center justify-center h-7 px-2 rounded-md bg-[var(--bg-tertiary)] text-[10px] text-[var(--text-tertiary)]"
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
                          className="inline-flex items-center justify-center size-7 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                          aria-label="Website"
                        >
                          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 003 12c0-1.605.42-3.113 1.157-4.418" />
                          </svg>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Interest Badges */}
                  {interests.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {interests.map((interest: string) => (
                        <Badge key={interest} variant="outline" size="sm">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Stats Row */}
            <div className="border-t border-[var(--border-primary)]">
              <div className="grid grid-cols-2">
                <div className="p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                    Voting Power
                  </p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {formatVTON(votingPower ?? BigInt(0), { compact: true })}
                    <span className="text-xs font-normal text-[var(--text-tertiary)] ml-1">vTON</span>
                  </p>
                </div>
                <div className="p-4 text-center border-l border-[var(--border-primary)]">
                  <p className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                    Registered
                  </p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {registeredAt
                      ? registeredAt.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3: About / Statement */}
            {(votingPhilosophy || whyDelegate) && (
              <div className="border-t border-[var(--border-primary)] p-6 space-y-5">
                {votingPhilosophy && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-2">
                      About
                    </p>
                    <div className="text-sm leading-relaxed text-[var(--text-secondary)] prose-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {votingPhilosophy}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
                {whyDelegate && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-2">
                      Why Delegate to Me
                    </p>
                    <div className="text-sm leading-relaxed text-[var(--text-secondary)] prose-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {whyDelegate}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Section 4: Delegate CTA */}
            <div className="border-t border-[var(--border-primary)] p-4">
              <Button
                fullWidth
                size="lg"
                disabled={hasNoVTON}
                title={hasNoVTON ? "You need vTON to delegate" : undefined}
                onClick={() => setDelegationModalOpen(true)}
              >
                Delegate to {displayName}
              </Button>
            </div>
          </Card>
        </div>

        {/* ===== Right Panel: Voting Content ===== */}
        <div className="space-y-6">
          {/* Voting Activity Summary */}
          {stats.totalVotes > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Voting Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <VotingProgress
                  forVotes={stats.forCount}
                  againstVotes={stats.againstCount}
                  abstainVotes={stats.abstainCount}
                />
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-lg bg-[var(--bg-secondary)] p-3 text-center">
                    <p className="text-lg font-bold text-[var(--text-primary)]">{stats.totalVotes}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Total</p>
                  </div>
                  <div className="rounded-lg bg-[var(--bg-secondary)] p-3 text-center">
                    <p className="text-lg font-bold text-[var(--color-vote-for)]">{stats.forCount}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">For</p>
                  </div>
                  <div className="rounded-lg bg-[var(--bg-secondary)] p-3 text-center">
                    <p className="text-lg font-bold text-[var(--color-vote-against)]">{stats.againstCount}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Against</p>
                  </div>
                  <div className="rounded-lg bg-[var(--bg-secondary)] p-3 text-center">
                    <p className="text-lg font-bold text-[var(--color-vote-abstain)]">{stats.abstainCount}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Abstain</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Past Votes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Past Votes{" "}
                <span className="text-[var(--text-tertiary)] font-normal">
                  ({votes.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {votesLoading ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-14 bg-[var(--bg-tertiary)] rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              ) : votes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <svg
                    className="size-10 text-[var(--text-tertiary)] mb-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-[var(--text-secondary)]">
                    No voting history yet
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    This delegate hasn&apos;t voted on any proposals
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {votes.map((vote) => {
                    const support = SUPPORT_LABELS[vote.support] ?? {
                      label: "Unknown",
                      color: "var(--text-tertiary)",
                    };
                    return (
                      <Link
                        key={vote.transactionHash}
                        href={`/proposals/${vote.proposalId.toString()}`}
                        className="group flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                      >
                        {/* Color dot */}
                        <span
                          className="size-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: support.color }}
                        />

                        {/* Proposal info */}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            Proposal #{vote.proposalId.toString().slice(0, 8)}...
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-[var(--text-tertiary)]">
                              {formatVTON(vote.weight, { compact: true })} vTON
                            </span>
                            {vote.reason && (
                              <>
                                <span className="text-[var(--text-tertiary)]" aria-hidden="true">·</span>
                                <span className="text-xs text-[var(--text-tertiary)] truncate">
                                  {vote.reason}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Vote badge */}
                        <span
                          className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{
                            color: support.color,
                            backgroundColor: `color-mix(in srgb, ${support.color} 15%, transparent)`,
                          }}
                        >
                          {support.label}
                        </span>

                        {/* Chevron */}
                        <svg
                          className="size-4 shrink-0 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
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
