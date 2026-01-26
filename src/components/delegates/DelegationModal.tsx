"use client";

import * as React from "react";
import { useAccount } from "wagmi";
import { parseEther, formatEther } from "viem";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, HelperText } from "@/components/ui/input";
import { AddressAvatar } from "@/components/ui/avatar";
import { formatAddress, formatVTON } from "@/lib/utils";
import { useVTONBalance } from "@/hooks/contracts/useVTON";
import { useDelegate, useUndelegate } from "@/hooks/contracts/useDelegateRegistry";

export interface DelegationModalProps {
  open: boolean;
  onClose: () => void;
  delegatee: `0x${string}`;
  delegateeName?: string;
  mode: "delegate" | "undelegate";
  currentDelegatedAmount?: bigint;
}

/**
 * Modal for delegating or undelegating vTON
 */
export function DelegationModal({
  open,
  onClose,
  delegatee,
  delegateeName,
  mode,
  currentDelegatedAmount = BigInt(0),
}: DelegationModalProps) {
  const { address } = useAccount();
  const { data: vtonBalance } = useVTONBalance(address);

  const [amount, setAmount] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const {
    delegate,
    isPending: isDelegatePending,
    isConfirming: isDelegateConfirming,
    isConfirmed: isDelegateConfirmed,
    error: delegateError,
    reset: resetDelegate,
  } = useDelegate();

  const {
    undelegate,
    isPending: isUndelegatePending,
    isConfirming: isUndelegateConfirming,
    isConfirmed: isUndelegateConfirmed,
    error: undelegateError,
    reset: resetUndelegate,
  } = useUndelegate();

  const isPending = mode === "delegate" ? isDelegatePending : isUndelegatePending;
  const isConfirming = mode === "delegate" ? isDelegateConfirming : isUndelegateConfirming;
  const isConfirmed = mode === "delegate" ? isDelegateConfirmed : isUndelegateConfirmed;
  const txError = mode === "delegate" ? delegateError : undelegateError;

  const maxAmount =
    mode === "delegate"
      ? vtonBalance ?? BigInt(0)
      : currentDelegatedAmount;

  const displayName = delegateeName || formatAddress(delegatee);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setAmount("");
      setError(null);
      resetDelegate();
      resetUndelegate();
    }
  }, [open, resetDelegate, resetUndelegate]);

  // Close modal on successful transaction
  React.useEffect(() => {
    if (isConfirmed) {
      const timeout = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isConfirmed, onClose]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);
    setError(null);

    if (value) {
      try {
        const parsedAmount = parseEther(value);
        if (parsedAmount > maxAmount) {
          setError(
            mode === "delegate"
              ? "Amount exceeds your vTON balance"
              : "Amount exceeds your delegated amount"
          );
        } else if (parsedAmount <= BigInt(0)) {
          setError("Amount must be greater than 0");
        }
      } catch {
        setError("Invalid amount");
      }
    }
  };

  const handleMax = () => {
    setAmount(formatEther(maxAmount));
    setError(null);
  };

  const handleSubmit = () => {
    if (!amount || error) return;

    try {
      const parsedAmount = parseEther(amount);
      if (mode === "delegate") {
        delegate(delegatee, parsedAmount);
      } else {
        undelegate(delegatee, parsedAmount);
      }
    } catch {
      setError("Invalid amount");
    }
  };

  const getButtonText = () => {
    if (isConfirmed) return "Success!";
    if (isConfirming) return "Confirming...";
    if (isPending) return "Confirm in Wallet...";
    return mode === "delegate" ? "Delegate" : "Undelegate";
  };

  const isDisabled = !amount || !!error || isPending || isConfirming || isConfirmed;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "delegate" ? "Delegate vTON" : "Undelegate vTON"}
      description={
        mode === "delegate"
          ? "Delegate your vTON to a delegatee to participate in governance"
          : "Remove your delegation from this delegatee"
      }
      size="sm"
    >
      <ModalBody className="space-y-4">
        {/* Delegatee Info */}
        <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg">
          <AddressAvatar address={delegatee} size="md" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {displayName}
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">
              {delegatee}
            </span>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="amount">Amount</Label>
            <span className="text-xs text-[var(--text-tertiary)]">
              {mode === "delegate" ? "Balance" : "Delegated"}:{" "}
              {formatVTON(maxAmount)} vTON
            </span>
          </div>
          <div className="relative">
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={amount}
              onChange={handleAmountChange}
              error={!!error}
              className="pr-16"
            />
            <Button
              variant="ghost"
              size="xs"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6"
              onClick={handleMax}
            >
              MAX
            </Button>
          </div>
          {error && <HelperText error>{error}</HelperText>}
          {txError && (
            <HelperText error>
              Transaction failed: {txError.message.slice(0, 50)}...
            </HelperText>
          )}
        </div>

        {/* Info */}
        {mode === "delegate" && (
          <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg text-xs text-[var(--text-secondary)] space-y-1">
            <p>
              Minimum delegation period: <strong>7 days</strong>
            </p>
            <p>
              Your voting power will be transferred to the delegatee
            </p>
          </div>
        )}

        {/* Success Message */}
        {isConfirmed && (
          <div className="p-3 bg-[var(--color-success-50)] border border-[var(--color-success-200)] rounded-lg text-center">
            <p className="text-sm text-[var(--color-success-700)] font-medium">
              {mode === "delegate"
                ? "Delegation successful!"
                : "Undelegation successful!"}
            </p>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isPending || isConfirming}>
          Cancel
        </Button>
        <Button
          variant={mode === "delegate" ? "primary" : "destructive"}
          onClick={handleSubmit}
          disabled={isDisabled}
          loading={isPending || isConfirming}
        >
          {getButtonText()}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
