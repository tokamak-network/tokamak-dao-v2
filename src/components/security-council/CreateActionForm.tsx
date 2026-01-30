"use client";

import * as React from "react";
import { useChainId } from "wagmi";
import { encodeFunctionData } from "viem";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, HelperText } from "@/components/ui/input";
import {
  useProposeEmergencyAction,
  ActionType,
} from "@/hooks/contracts/useSecurityCouncil";
import { useCancelableProposals } from "@/hooks/contracts/useDAOGovernor";
import type { ProposalListItem } from "@/hooks/contracts/useDAOGovernor";
import { getContractAddresses, DAO_GOVERNOR_ABI } from "@/constants/contracts";
import { ProposalSelectList } from "./ProposalSelectList";
import { ProposalPreviewCard } from "./ProposalPreviewCard";

const ACTION_TYPE_OPTIONS = [
  { value: ActionType.CancelProposal, label: "Cancel Proposal" },
  { value: ActionType.PauseProtocol, label: "Pause Protocol" },
  { value: ActionType.UnpauseProtocol, label: "Unpause Protocol" },
  { value: ActionType.EmergencyUpgrade, label: "Emergency Upgrade" },
  { value: ActionType.Custom, label: "Custom" },
];

export interface CreateActionFormProps {
  isMember: boolean;
}

/**
 * Form for creating a new emergency action
 */
export function CreateActionForm({ isMember }: CreateActionFormProps) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);

  // Action type can be null (not selected)
  const [actionType, setActionType] = React.useState<ActionType | null>(null);
  const [target, setTarget] = React.useState("");
  const [calldata, setCalldata] = React.useState("0x");
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  // Cancel Proposal specific state
  const [selectedProposal, setSelectedProposal] =
    React.useState<ProposalListItem | null>(null);

  // Fetch cancelable proposals for Cancel Proposal action
  const { data: cancelableProposals, isLoading: isLoadingProposals } =
    useCancelableProposals();

  const {
    proposeEmergencyAction,
    isPending,
    isConfirming,
    isConfirmed,
    error: txError,
    reset,
  } = useProposeEmergencyAction();

  const isProcessing = isPending || isConfirming;

  // Reset form on success
  React.useEffect(() => {
    if (isConfirmed) {
      setTarget("");
      setCalldata("0x");
      setReason("");
      setActionType(null);
      setSelectedProposal(null);
      setError(null);
      // Reset transaction state after a delay
      const timer = setTimeout(() => reset(), 3000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, reset]);

  // Reset selected proposal when action type changes
  React.useEffect(() => {
    if (actionType !== ActionType.CancelProposal) {
      setSelectedProposal(null);
    }
  }, [actionType]);

  const validateForm = (): boolean => {
    if (actionType === null) {
      setError("Please select an action type");
      return false;
    }

    // Special validation for Cancel Proposal
    if (actionType === ActionType.CancelProposal) {
      if (!selectedProposal) {
        setError("Please select a proposal to cancel");
        return false;
      }
      if (!reason.trim()) {
        setError("Please provide a reason for cancellation");
        return false;
      }
      setError(null);
      return true;
    }

    // Validation for other action types
    if (!target || !target.startsWith("0x") || target.length !== 42) {
      setError("Please enter a valid target address");
      return false;
    }
    if (!calldata.startsWith("0x")) {
      setError("Calldata must start with 0x");
      return false;
    }
    if (!reason.trim()) {
      setError("Please provide a reason for this action");
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Handle Cancel Proposal action
    if (actionType === ActionType.CancelProposal && selectedProposal) {
      const cancelCalldata = encodeFunctionData({
        abi: DAO_GOVERNOR_ABI,
        functionName: "cancel",
        args: [BigInt(selectedProposal.id)],
      });

      proposeEmergencyAction(
        ActionType.CancelProposal,
        addresses.daoGovernor as `0x${string}`,
        cancelCalldata,
        reason
      );
      return;
    }

    // Handle other action types
    proposeEmergencyAction(
      actionType!,
      target as `0x${string}`,
      calldata as `0x${string}`,
      reason
    );
  };

  if (!isMember) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Action</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Action Type */}
          <div className="space-y-2">
            <Label htmlFor="actionType" required>
              Action Type
            </Label>
            <select
              id="actionType"
              value={actionType ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setActionType(value === "" ? null : (Number(value) as ActionType));
              }}
              className="flex w-full h-10 px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-[var(--input-radius)] transition-colors hover:border-[var(--input-border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--input-border-focus)] focus:ring-offset-1"
              disabled={isProcessing}
            >
              <option value="" disabled>
                Select action type...
              </option>
              {ACTION_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Cancel Proposal - Show inline proposal selector */}
          {actionType === ActionType.CancelProposal && (
            <div className="space-y-4">
              {/* Proposal Select List */}
              <div className="space-y-2">
                <Label required>Select Proposal to Cancel</Label>
                <ProposalSelectList
                  proposals={cancelableProposals ?? []}
                  isLoading={isLoadingProposals}
                  selectedProposalId={selectedProposal?.id ?? null}
                  onSelect={setSelectedProposal}
                />
              </div>

              {/* Show selected proposal preview and reason input */}
              {selectedProposal && (
                <>
                  <div className="space-y-2">
                    <Label>Selected Proposal</Label>
                    <ProposalPreviewCard proposal={selectedProposal} compact />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cancel-reason" required>
                      Reason for Cancellation
                    </Label>
                    <Textarea
                      id="cancel-reason"
                      placeholder="Explain why this proposal should be canceled..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      disabled={isProcessing}
                      error={!!error && error.includes("reason")}
                      rows={3}
                    />
                    <HelperText>
                      This reason will be publicly visible and recorded on-chain.
                    </HelperText>
                  </div>

                  {/* Error Message */}
                  {(error || txError) && (
                    <HelperText error>
                      {error || txError?.message || "Transaction failed"}
                    </HelperText>
                  )}

                  {/* Success Message */}
                  {isConfirmed && (
                    <HelperText className="text-[var(--status-success-fg)]">
                      Emergency action proposed successfully!
                    </HelperText>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="destructive"
                    fullWidth
                    loading={isProcessing}
                    disabled={isProcessing || !reason.trim()}
                  >
                    {isPending
                      ? "Confirming..."
                      : isConfirming
                      ? "Processing..."
                      : "Propose Emergency Action"}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Other Action Types - Show target, calldata, reason inputs */}
          {actionType !== null && actionType !== ActionType.CancelProposal && (
            <>
              {/* Target Address */}
              <div className="space-y-2">
                <Label htmlFor="target" required>
                  Target Address
                </Label>
                <Input
                  id="target"
                  placeholder="0x..."
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  disabled={isProcessing}
                  error={!!error && error.includes("target")}
                />
              </div>

              {/* Calldata */}
              <div className="space-y-2">
                <Label htmlFor="calldata">Calldata</Label>
                <Input
                  id="calldata"
                  placeholder="0x"
                  value={calldata}
                  onChange={(e) => setCalldata(e.target.value)}
                  disabled={isProcessing}
                  error={!!error && error.includes("Calldata")}
                />
                <HelperText>
                  Optional encoded function call data. Use 0x for no data.
                </HelperText>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason" required>
                  Reason
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Describe why this emergency action is needed..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isProcessing}
                  error={!!error && error.includes("reason")}
                  rows={3}
                />
              </div>

              {/* Error Message */}
              {(error || txError) && (
                <HelperText error>
                  {error || txError?.message || "Transaction failed"}
                </HelperText>
              )}

              {/* Success Message */}
              {isConfirmed && (
                <HelperText className="text-[var(--status-success-fg)]">
                  Emergency action proposed successfully!
                </HelperText>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="destructive"
                fullWidth
                loading={isProcessing}
                disabled={isProcessing}
              >
                {isPending
                  ? "Confirming..."
                  : isConfirming
                  ? "Processing..."
                  : "Propose Emergency Action"}
              </Button>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
