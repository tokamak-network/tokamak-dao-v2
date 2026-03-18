"use client";

import Link from "next/link";
import { formatAddress, formatVTON } from "@/lib/utils";
import { AddressAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface DelegateDetailCardProps {
  address: `0x${string}`;
  ensName?: string;
  avatarUrl?: string;
  votingPower: bigint | string | number;
  tokenSymbol?: string;
  isActive?: boolean;
  onDelegate?: () => void;
  isCurrentDelegate?: boolean;
  delegateDisabled?: boolean;
  delegatedTo?: { address: `0x${string}`; agentName?: string } | null;
}

/**
 * Delegate table row component — Agora-style table layout
 */
export function DelegateDetailCard({
  address,
  ensName,
  avatarUrl,
  votingPower,
  tokenSymbol = "vTON",
  isActive,
  onDelegate,
  isCurrentDelegate,
  delegateDisabled,
  delegatedTo,
}: DelegateDetailCardProps) {
  const displayName = ensName || formatAddress(address);
  const formattedVotingPower =
    typeof votingPower === "bigint"
      ? formatVTON(votingPower, { compact: true })
      : formatVTON(BigInt(votingPower || 0), { compact: true });

  return (
    <tr className="border-b border-[var(--border-default)] hover:bg-[var(--bg-secondary)] transition-colors">
      {/* Name */}
      <td className="py-4 px-4">
        <Link
          href={`/delegates/${address}`}
          className="flex items-center gap-3 min-w-0"
        >
          <AddressAvatar address={address} src={avatarUrl} size="md" />
          <span className="text-sm font-medium text-[var(--text-primary)] truncate">
            {displayName}
          </span>
        </Link>
      </td>

      {/* Voting Power */}
      <td className="py-4 px-4">
        <span className="text-sm text-[var(--text-primary)]">
          {formattedVotingPower} {tokenSymbol}
        </span>
      </td>

      {/* Status */}
      <td className="py-4 px-4">
        {isActive ? (
          <Badge variant="success" size="sm">Active</Badge>
        ) : (
          <Badge variant="default" size="sm">Inactive</Badge>
        )}
      </td>

      {/* Delegated To */}
      <td className="py-4 px-4">
        {delegatedTo ? (
          <Link
            href={`/delegates/${delegatedTo.address}`}
            className="flex items-center gap-2"
          >
            <AddressAvatar address={delegatedTo.address} size="sm" />
            <span className="text-sm text-[var(--text-brand)]">
              {delegatedTo.agentName || formatAddress(delegatedTo.address)}
            </span>
          </Link>
        ) : (
          <span className="text-sm text-[var(--text-tertiary)]">—</span>
        )}
      </td>

      {/* Action */}
      <td className="py-4 px-4 text-right">
        {isCurrentDelegate ? (
          <span className="text-xs text-[var(--text-brand)] font-medium px-2 py-1 bg-[var(--bg-brand-subtle)] rounded">
            Your Delegate
          </span>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            disabled={delegateDisabled}
            title={delegateDisabled ? "You need vTON to delegate" : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onDelegate?.();
            }}
          >
            Delegate
          </Button>
        )}
      </td>
    </tr>
  );
}
