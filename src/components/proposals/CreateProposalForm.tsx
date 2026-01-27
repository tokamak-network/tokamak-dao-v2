"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, HelperText } from "@/components/ui/input";
import { cn, formatVTON } from "@/lib/utils";
import { usePropose, useGovernanceParams } from "@/hooks/contracts/useDAOGovernor";
import { useTONAllowance, useApproveTON, useTONBalance } from "@/hooks/contracts/useTON";
import { getContractAddresses, DAO_GOVERNOR_ABI } from "@/constants/contracts";
import { parseEventLogs } from "viem";

interface ActionInput {
  target: string;
  value: string;
  calldata: string;
}

export interface CreateProposalFormProps {
  className?: string;
}

export function CreateProposalForm({ className }: CreateProposalFormProps) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const addresses = getContractAddresses(chainId);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [actions, setActions] = React.useState<ActionInput[]>([
    { target: "", value: "0", calldata: "0x" },
  ]);

  const { proposeAsync } = usePropose();
  const { proposalCreationCost } = useGovernanceParams();

  // TON approval state
  const { data: tonBalance } = useTONBalance(address);
  const { data: tonAllowance, refetch: refetchAllowance } = useTONAllowance(
    address,
    addresses.daoGovernor
  );
  const { approveAsync } = useApproveTON();

  const formattedCost = proposalCreationCost
    ? formatVTON(proposalCreationCost)
    : "100";

  const requiredAmount = proposalCreationCost ?? BigInt(100 * 10 ** 18);
  const hasEnoughTON = tonBalance >= requiredAmount;
  const hasEnoughAllowance = tonAllowance >= requiredAmount;

  // Form validation
  const isFormValid =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    isConnected &&
    hasEnoughTON;

  const handleAddAction = () => {
    setActions([...actions, { target: "", value: "0", calldata: "0x" }]);
  };

  const handleRemoveAction = (index: number) => {
    if (actions.length > 1) {
      setActions(actions.filter((_, i) => i !== index));
    }
  };

  const handleActionChange = (
    index: number,
    field: keyof ActionInput,
    value: string
  ) => {
    const newActions = [...actions];
    newActions[index][field] = value;
    setActions(newActions);
  };

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitStep, setSubmitStep] = React.useState<"idle" | "approving" | "waitingApproval" | "proposing" | "waitingProposal">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid || !publicClient) return;

    setIsSubmitting(true);

    try {
      // Step 1: Approve if needed
      if (!hasEnoughAllowance) {
        setSubmitStep("approving");
        const approveHash = await approveAsync(addresses.daoGovernor);
        // Wait for the approval transaction to be confirmed
        setSubmitStep("waitingApproval");
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        await refetchAllowance();
      }

      // Step 2: Create proposal
      setSubmitStep("proposing");
      const fullDescription = `# ${title}\n\n${description}`;

      // Prepare action arrays
      const targets = actions.map((a) => (a.target || "0x0000000000000000000000000000000000000000") as `0x${string}`);
      const values = actions.map((a) => BigInt(a.value || "0"));
      const calldatas = actions.map((a) => (a.calldata || "0x") as `0x${string}`);

      setSubmitStep("waitingProposal");
      const proposalHash = await proposeAsync(targets, values, calldatas, fullDescription);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: proposalHash });

      // Parse ProposalCreated event to get the proposal ID
      const logs = parseEventLogs({
        abi: DAO_GOVERNOR_ABI,
        logs: receipt.logs,
        eventName: "ProposalCreated",
      });

      if (logs.length > 0 && logs[0].args.proposalId) {
        const proposalId = logs[0].args.proposalId.toString();
        router.push(`/proposals/${proposalId}`);
      } else {
        router.push("/proposals");
      }
    } catch (error) {
      console.error("Failed to create proposal:", error);
    } finally {
      setIsSubmitting(false);
      setSubmitStep("idle");
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      {/* Requirements Card */}
      <Card>
        <CardHeader>
          <CardTitle>Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-lg bg-[var(--bg-tertiary)]">
              <p className="text-sm text-[var(--text-secondary)]">
                Proposal Creation Cost
              </p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {formattedCost} TON
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                This amount will be burned
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[var(--bg-tertiary)]">
              <p className="text-sm text-[var(--text-secondary)]">
                Your TON Balance
              </p>
              <p className={cn(
                "text-lg font-semibold",
                hasEnoughTON ? "text-[var(--text-primary)]" : "text-[var(--status-error-text)]"
              )}>
                {formatVTON(tonBalance)} TON
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                {hasEnoughAllowance ? "Approved" : hasEnoughTON ? "Approval needed" : ""}
              </p>
            </div>
          </div>

          {!isConnected && (
            <div className="mt-4 p-3 rounded-lg bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] text-sm">
              Please connect your wallet to create a proposal.
            </div>
          )}

          {isConnected && !hasEnoughTON && (
            <div className="mt-4 p-3 rounded-lg bg-[var(--status-error-bg)] text-[var(--status-error-text)] text-sm">
              Insufficient TON balance. You need {formattedCost} TON to create a proposal.{" "}
              <a href="/faucet" className="underline font-medium">
                Get TON from faucet
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proposal Details */}
      <Card>
        <CardHeader>
          <CardTitle>Proposal Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" required>
              Title
            </Label>
            <Input
              id="title"
              placeholder="TIP-XXX: Short, descriptive title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={title.length > 0 && title.length < 10}
            />
            <HelperText error={title.length > 0 && title.length < 10}>
              {title.length > 0 && title.length < 10
                ? "Title should be at least 10 characters"
                : "Use a clear, concise title that describes the proposal"}
            </HelperText>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" required>
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Provide a detailed description of your proposal. You can use Markdown for formatting.

## Summary
Brief overview of the proposal

## Motivation
Why is this proposal needed?

## Specification
Technical details of the changes

## Risks
Potential risks and mitigations"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={12}
              error={description.length > 0 && description.length < 50}
            />
            <HelperText error={description.length > 0 && description.length < 50}>
              {description.length > 0 && description.length < 50
                ? "Description should be at least 50 characters"
                : "Markdown formatting is supported"}
            </HelperText>
          </div>
        </CardContent>
      </Card>

      {/* Advanced: Actions */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setShowAdvanced(!showAdvanced)}>
          <div className="flex items-center justify-between">
            <CardTitle>Actions (Advanced)</CardTitle>
            <svg
              className={cn(
                "size-5 text-[var(--text-tertiary)] transition-transform",
                showAdvanced && "rotate-180"
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </CardHeader>

        {showAdvanced && (
          <CardContent className="space-y-4">
            <HelperText>
              Specify the on-chain actions to execute if this proposal passes.
              Leave empty for signaling proposals.
            </HelperText>

            {actions.map((action, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border border-[var(--border-default)] space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    Action {index + 1}
                  </span>
                  {actions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAction(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`target-${index}`}>Target Address</Label>
                  <Input
                    id={`target-${index}`}
                    placeholder="0x..."
                    value={action.target}
                    onChange={(e) =>
                      handleActionChange(index, "target", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`value-${index}`}>Value (wei)</Label>
                  <Input
                    id={`value-${index}`}
                    placeholder="0"
                    value={action.value}
                    onChange={(e) =>
                      handleActionChange(index, "value", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`calldata-${index}`}>Calldata</Label>
                  <Input
                    id={`calldata-${index}`}
                    placeholder="0x"
                    value={action.calldata}
                    onChange={(e) =>
                      handleActionChange(index, "calldata", e.target.value)
                    }
                  />
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="secondary"
              onClick={handleAddAction}
              className="w-full"
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
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Add Action
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Submit */}
      <div className="flex items-center justify-between gap-4 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          loading={isSubmitting}
        >
          {isSubmitting
            ? submitStep === "approving"
              ? "Approve in Wallet..."
              : submitStep === "waitingApproval"
              ? "Approving TON..."
              : submitStep === "proposing"
              ? "Confirm in Wallet..."
              : submitStep === "waitingProposal"
              ? "Creating Proposal..."
              : "Processing..."
            : hasEnoughAllowance
            ? "Create Proposal"
            : "Approve & Create Proposal"}
        </Button>
      </div>
    </form>
  );
}
