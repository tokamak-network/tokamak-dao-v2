"use client";

import Link from "next/link";
import { formatAddress, formatVTON } from "@/lib/utils";
import { AddressAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export interface DelegateDetailCardProps {
  address: `0x${string}`;
  ensName?: string;
  avatarUrl?: string;
  votingPower: bigint | string | number;
  tokenSymbol?: string;
  isActive?: boolean;
  isCurrentDelegate?: boolean;
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
  isCurrentDelegate,
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
    </tr>
  );
}
