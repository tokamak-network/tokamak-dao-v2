"use client";

import * as React from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProposalState, type ProposalStatus } from "@/types/governance";
import {
  useQueueProposal,
  useExecuteProposal,
  useCancelProposal,
} from "@/hooks/contracts/useDAOGovernor";

export interface ProposalActionsProps {
  className?: string;
  proposalId: bigint;
  status: ProposalStatus;
  proposer: `0x${string}`;
  canExecute?: boolean;
  onSuccess?: () => void;
}

export function ProposalActions({
  className,
  proposalId,
  status,
  proposer,
  canExecute = false,
  onSuccess,
}: ProposalActionsProps) {
  const { address } = useAccount();
  const isProposer = address?.toLowerCase() === proposer.toLowerCase();

  const { queue, isPending: isQueuePending } = useQueueProposal();
  const { execute, isPending: isExecutePending } = useExecuteProposal();
  const { cancel, isPending: isCancelPending } = useCancelProposal();

  const handleQueue = () => {
    queue(proposalId);
    onSuccess?.();
  };

  const handleExecute = () => {
    execute(proposalId);
    onSuccess?.();
  };

  const handleCancel = () => {
    cancel(proposalId);
    onSuccess?.();
  };

  // Map status to contract state for comparison
  const getContractState = (uiStatus: ProposalStatus): ProposalState | null => {
    switch (uiStatus) {
      case "active":
        return ProposalState.Active;
      case "pending":
        return ProposalState.Pending;
      case "executed":
        return ProposalState.Executed;
      case "defeated":
        return ProposalState.Defeated;
      case "canceled":
        return ProposalState.Canceled;
      case "queued":
        return ProposalState.Queued;
      default:
        return null;
    }
  };

  const contractState = getContractState(status);

  // Show Queue button if proposal succeeded (status might show as "queued" for Succeeded)
  const showQueueButton = contractState === ProposalState.Queued && status !== "executed";

  // Show Execute button if proposal is queued and can be executed
  const showExecuteButton = status === "queued" && canExecute;

  // Show Cancel button for proposer on pending/active proposals
  const showCancelButton =
    isProposer && (status === "pending" || status === "active");

  if (!showQueueButton && !showExecuteButton && !showCancelButton) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {showQueueButton && (
        <Button
          variant="secondary"
          onClick={handleQueue}
          loading={isQueuePending}
          disabled={!address}
        >
          Queue for Execution
        </Button>
      )}

      {showExecuteButton && (
        <Button
          variant="success"
          onClick={handleExecute}
          loading={isExecutePending}
          disabled={!address}
        >
          Execute Proposal
        </Button>
      )}

      {showCancelButton && (
        <Button
          variant="destructive"
          onClick={handleCancel}
          loading={isCancelPending}
        >
          Cancel Proposal
        </Button>
      )}
    </div>
  );
}
