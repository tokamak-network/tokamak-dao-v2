"use client";

import { useState } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { COUNTER_ABI, COUNTER_ADDRESS } from "@/contracts/counter";

export function Counter() {
  const [newNumber, setNewNumber] = useState("");

  const {
    data: currentNumber,
    isLoading: isReadLoading,
    refetch,
  } = useReadContract({
    address: COUNTER_ADDRESS,
    abi: COUNTER_ABI,
    functionName: "number",
    query: {
      enabled: !!COUNTER_ADDRESS,
    },
  });

  const {
    writeContract,
    data: txHash,
    isPending: isWritePending,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });

  const handleIncrement = () => {
    writeContract({
      address: COUNTER_ADDRESS,
      abi: COUNTER_ABI,
      functionName: "increment",
    });
  };

  const handleSetNumber = (e: React.FormEvent) => {
    e.preventDefault();
    const value = BigInt(newNumber);
    writeContract({
      address: COUNTER_ADDRESS,
      abi: COUNTER_ABI,
      functionName: "setNumber",
      args: [value],
    });
    setNewNumber("");
  };

  // Refetch after transaction is confirmed
  if (isConfirmed) {
    refetch();
  }

  const isLoading = isWritePending || isConfirming;

  if (!COUNTER_ADDRESS) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Counter Contract</CardTitle>
          <CardDescription className="text-[var(--status-error)]">
            Contract address not configured. Set NEXT_PUBLIC_COUNTER_ADDRESS in your .env.local file.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Counter Contract</CardTitle>
        <CardDescription>
          Interact with the Counter smart contract
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-sm text-[var(--text-secondary)] mb-2">
            Current Value
          </p>
          <p className="text-4xl font-bold text-[var(--text-primary)]">
            {isReadLoading ? "..." : currentNumber?.toString() ?? "0"}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleIncrement}
            disabled={isLoading}
            loading={isLoading}
            fullWidth
          >
            Increment
          </Button>
          <Button
            variant="secondary"
            onClick={() => refetch()}
            disabled={isReadLoading}
          >
            Refresh
          </Button>
        </div>

        <form onSubmit={handleSetNumber} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="newNumber">Set New Value</Label>
            <Input
              id="newNumber"
              type="number"
              min="0"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              placeholder="Enter a number"
              disabled={isLoading}
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            disabled={!newNumber || isLoading}
            loading={isLoading}
            fullWidth
          >
            Set Number
          </Button>
        </form>

        {txHash && (
          <div className="text-sm">
            <p className="text-[var(--text-secondary)]">
              {isConfirming ? "Confirming..." : isConfirmed ? "Confirmed!" : "Pending..."}
            </p>
            <p className="text-[var(--text-tertiary)] truncate text-xs mt-1">
              Tx: {txHash}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
