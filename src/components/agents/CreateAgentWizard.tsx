"use client";

import * as React from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSignTypedData, useBalance, useSendTransaction } from "wagmi";
import { parseEther, formatEther } from "viem";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, HelperText } from "@/components/ui/input";
import { useVTONBalance } from "@/hooks/contracts/useVTON";
import { getContractAddresses, DELEGATE_REGISTRY_ABI } from "@/constants/contracts";
import { SEPOLIA_CHAIN_ID } from "@/constants/erc8004";
import { useAgentSetupStatus, type WizardStep } from "@/hooks/useAgentSetupStatus";
import { formatVTON } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────

export interface CreateAgentWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: (agentId: number) => void;
}

const STEPS: { id: WizardStep; label: string }[] = [
  { id: "create", label: "Create" },
  { id: "delegate", label: "Delegate" },
  { id: "deposit", label: "Gas" },
  { id: "telegram", label: "Telegram" },
];

const STEP_INDEX: Record<WizardStep, number> = {
  create: 0,
  delegate: 1,
  deposit: 2,
  telegram: 3,
  complete: 4,
};

// ─── Step Indicator ─────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: WizardStep }) {
  const currentIdx = STEP_INDEX[currentStep];

  return (
    <div className="flex items-center justify-between px-2">
      {STEPS.map((step, idx) => {
        const isComplete = idx < currentIdx;
        const isCurrent = idx === currentIdx;

        return (
          <React.Fragment key={step.id}>
            {idx > 0 && (
              <div
                className={`flex-1 h-0.5 mx-2 transition-colors ${
                  idx <= currentIdx
                    ? "bg-[var(--color-primary-500)]"
                    : "bg-[var(--border-secondary)]"
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  isComplete
                    ? "bg-[var(--color-success-500)] text-white"
                    : isCurrent
                    ? "bg-[var(--color-primary-500)] text-white"
                    : "bg-[var(--border-secondary)] text-[var(--text-tertiary)]"
                }`}
              >
                {isComplete ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`text-[10px] whitespace-nowrap ${
                  isCurrent
                    ? "text-[var(--text-primary)] font-medium"
                    : "text-[var(--text-tertiary)]"
                }`}
              >
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Create Step ────────────────────────────────────────

function CreateStep({
  onCreated,
}: {
  onCreated: (agentId: number, walletAddress: string) => void;
}) {
  const { address } = useAccount();
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleCreate = async () => {
    if (!address) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: address }),
      });
      const data = await res.json();
      if (data.success && data.id) {
        onCreated(data.id, data.agentWalletAddress || "");
      } else {
        setError(data.error || "Failed to create agent");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)] p-4 space-y-2">
        <p className="text-sm text-[var(--text-secondary)]">
          Create a personal AI agent that votes on DAO proposals on your behalf via Telegram.
        </p>
        <ul className="text-xs text-[var(--text-tertiary)] space-y-1 list-disc list-inside">
          <li>A dedicated wallet will be generated for voting</li>
          <li>You will register the agent as a delegate in the next step</li>
          <li>No private keys leave the server</li>
        </ul>
      </div>

      {error && <HelperText error>{error}</HelperText>}

      <Button onClick={handleCreate} disabled={creating} className="w-full">
        {creating ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Creating Agent...
          </>
        ) : (
          "Create My Agent"
        )}
      </Button>
    </div>
  );
}

// ─── Progress Step Row ──────────────────────────────────

function ProgressStepRow({ label, status }: { label: string; status: "pending" | "active" | "done" }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium ${
          status === "active"
            ? "bg-[var(--color-primary-500)] text-white"
            : status === "done"
            ? "bg-[var(--color-success-500)] text-white"
            : "bg-[var(--border-secondary)] text-[var(--text-tertiary)]"
        }`}
      >
        {status === "done" ? "\u2713" : status === "active" ? (
          <div className="w-2.5 h-2.5 animate-spin rounded-full border border-current border-t-transparent" />
        ) : ""}
      </div>
      <span className={status === "active" ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-tertiary)]"}>
        {label}
      </span>
    </div>
  );
}

const DELEGATE_STEP_ORDER = ["signing", "confirming"] as const;

function ProgressSteps({ step, needsRegistration }: { step: string; needsRegistration: boolean }) {
  const stepIdx = DELEGATE_STEP_ORDER.indexOf(step as typeof DELEGATE_STEP_ORDER[number]);

  const getStatus = (s: string): "pending" | "active" | "done" => {
    const idx = DELEGATE_STEP_ORDER.indexOf(s as typeof DELEGATE_STEP_ORDER[number]);
    if (idx < stepIdx) return "done";
    if (idx === stepIdx) return "active";
    return "pending";
  };

  return (
    <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg text-xs space-y-2">
      <ProgressStepRow label="Sign permit" status={getStatus("signing")} />
      <ProgressStepRow label={needsRegistration ? "Register & Delegate" : "Delegate"} status={getStatus("confirming")} />
    </div>
  );
}

// ─── Delegate Step ──────────────────────────────────────

// ERC-2612 Permit constants for vTON
const PERMIT_TYPES = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

const VTON_PERMIT_ABI = [
  {
    name: "nonces",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "DOMAIN_SEPARATOR",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
  },
] as const;

function DelegateStep({
  agentWalletAddress,
  onDelegated,
}: {
  agentWalletAddress: string;
  onDelegated: () => void;
}) {
  const { address } = useAccount();
  const sepoliaAddresses = getContractAddresses(SEPOLIA_CHAIN_ID);
  const { data: vtonBalance } = useVTONBalance(address);

  const [amount, setAmount] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<"idle" | "signing" | "confirming">("idle");
  const [generalError, setGeneralError] = React.useState<string | null>(null);

  const { signTypedDataAsync } = useSignTypedData();
  const { data: txHash, isPending, writeContract, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Check if agent is registered as delegate
  const { data: isRegistered } = useReadContract({
    address: sepoliaAddresses.delegateRegistry,
    abi: DELEGATE_REGISTRY_ABI,
    functionName: "isRegisteredDelegate",
    args: [agentWalletAddress as `0x${string}`],
    chainId: SEPOLIA_CHAIN_ID,
  });

  // Read vTON nonce for permit
  const { data: nonce } = useReadContract({
    address: sepoliaAddresses.vton as `0x${string}`,
    abi: VTON_PERMIT_ABI,
    functionName: "nonces",
    args: address ? [address] : undefined,
    chainId: SEPOLIA_CHAIN_ID,
    query: { enabled: !!address },
  });

  const balance = vtonBalance ?? BigInt(0);

  // After tx confirmed → next step
  React.useEffect(() => {
    if (isSuccess && step === "confirming") {
      const t = setTimeout(onDelegated, 1500);
      return () => clearTimeout(t);
    }
  }, [isSuccess, step, onDelegated]);

  // Reset step on write error
  React.useEffect(() => {
    if (writeError) setStep("idle");
  }, [writeError]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);
    setError(null);
    setGeneralError(null);
    if (value) {
      try {
        const parsed = parseEther(value);
        if (parsed > balance) setError("Amount exceeds your vTON balance");
        else if (parsed < parseEther("1")) setError("Minimum 1 vTON required");
      } catch {
        setError("Invalid amount");
      }
    }
  };

  const handleMax = () => {
    setAmount(formatEther(balance));
    setError(null);
    setGeneralError(null);
  };

  const handleSubmit = async () => {
    if (!amount || error || !address) return;
    const parsedAmount = parseEther(amount);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour

    try {
      resetWrite();
      setGeneralError(null);

      // Step 1: Sign permit (off-chain, no gas)
      setStep("signing");
      const signature = await signTypedDataAsync({
        domain: {
          name: "Tokamak Network Governance Token",
          version: "1",
          chainId: SEPOLIA_CHAIN_ID,
          verifyingContract: sepoliaAddresses.vton as `0x${string}`,
        },
        types: PERMIT_TYPES,
        primaryType: "Permit",
        message: {
          owner: address,
          spender: sepoliaAddresses.delegateRegistry as `0x${string}`,
          value: parsedAmount,
          nonce: nonce ?? BigInt(0),
          deadline,
        },
      });

      // Parse signature into v, r, s
      const r = `0x${signature.slice(2, 66)}` as `0x${string}`;
      const s = `0x${signature.slice(66, 130)}` as `0x${string}`;
      const v = parseInt(signature.slice(130, 132), 16);

      // Step 2: Send single transaction (register + permit + delegate OR permit + delegate)
      setStep("confirming");
      if (!isRegistered) {
        writeContract({
          address: sepoliaAddresses.delegateRegistry as `0x${string}`,
          abi: DELEGATE_REGISTRY_ABI,
          functionName: "registerDelegateForAndDelegateWithPermit",
          args: [
            agentWalletAddress as `0x${string}`,
            "DAO Agent",
            "Automated voting agent",
            "governance",
            parsedAmount,
            deadline,
            v,
            r,
            s,
          ],
          chainId: SEPOLIA_CHAIN_ID,
        });
      } else {
        writeContract({
          address: sepoliaAddresses.delegateRegistry as `0x${string}`,
          abi: DELEGATE_REGISTRY_ABI,
          functionName: "delegateWithPermit",
          args: [
            agentWalletAddress as `0x${string}`,
            parsedAmount,
            deadline,
            v,
            r,
            s,
          ],
          chainId: SEPOLIA_CHAIN_ID,
        });
      }
    } catch (e) {
      setStep("idle");
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("User rejected") || msg.includes("user rejected")) {
        setGeneralError("Signature was rejected by user.");
      }
    }
  };

  const isProcessing = isPending || isConfirming || (step !== "idle" && !writeError && !isSuccess);

  const getButtonText = () => {
    if (isSuccess && step === "confirming") return "Delegated!";
    if (step === "signing") return "Sign Permit in Wallet...";
    if (step === "confirming") {
      if (isConfirming) return "Confirming...";
      if (isPending) return "Confirm in Wallet...";
      return !isRegistered ? "Registering & Delegating..." : "Delegating...";
    }
    return !isRegistered ? "Register & Delegate" : "Sign & Delegate";
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)] p-4">
        <p className="text-sm text-[var(--text-secondary)]">
          {!isRegistered
            ? "Register your agent as a delegate and delegate vTON so it can vote on your behalf. Minimum 1 vTON."
            : "Delegate vTON to your agent so it can vote on your behalf. Minimum 1 vTON."}
        </p>
      </div>

      {balance === BigInt(0) && (
        <div className="rounded-[var(--radius-md)] px-3 py-2 text-xs bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]">
          You have no vTON. Mint vTON from the Faucet first to delegate to your agent.
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="delegate-amount">Amount</Label>
          <span className="text-xs text-[var(--text-tertiary)]">
            Balance: {formatVTON(balance)} vTON
          </span>
        </div>
        <div className="relative">
          <Input
            id="delegate-amount"
            type="text"
            inputMode="decimal"
            placeholder="e.g. 100"
            value={amount}
            onChange={handleAmountChange}
            error={!!error}
            className="pr-16"
          />
          <Button
            variant="ghost"
            size="xs"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)] font-semibold"
            onClick={handleMax}
          >
            MAX
          </Button>
        </div>
        {error && <HelperText error>{error}</HelperText>}
        {writeError && (
          <HelperText error>
            {writeError.message.includes("User rejected") || writeError.message.includes("user rejected")
              ? "Transaction was rejected by user."
              : "Transaction failed. Please try again."}
          </HelperText>
        )}
        {generalError && <HelperText error>{generalError}</HelperText>}
      </div>

      {/* Progress Steps */}
      {step !== "idle" && !isSuccess && (
        <ProgressSteps step={step} needsRegistration={!isRegistered} />
      )}

      {isSuccess && step === "confirming" && (
        <div className="p-3 bg-[var(--status-success-bg)] border border-[var(--status-success-border)] rounded-lg text-center">
          <p className="text-sm text-[var(--status-success-fg)] font-medium">Delegation successful!</p>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!amount || !!error || isProcessing || (isSuccess && step === "confirming") || balance === BigInt(0)}
        loading={isProcessing}
        className="w-full"
      >
        {getButtonText()}
      </Button>
    </div>
  );
}

// ─── Deposit Step ────────────────────────────────────────

function DepositStep({
  agentWalletAddress,
  onDeposited,
}: {
  agentWalletAddress: string;
  onDeposited: () => void;
}) {
  const [amount, setAmount] = React.useState("0.01");
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const { data: balance, isLoading: balanceLoading } = useBalance({
    address: agentWalletAddress as `0x${string}`,
    chainId: SEPOLIA_CHAIN_ID,
    query: { refetchInterval: 5000 },
  });

  const { sendTransaction, data: txHash, isPending, error: sendError } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Auto-advance after successful deposit
  React.useEffect(() => {
    if (isSuccess) {
      const t = setTimeout(onDeposited, 1500);
      return () => clearTimeout(t);
    }
  }, [isSuccess, onDeposited]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
    setError(null);
    if (e.target.value) {
      try {
        const parsed = parseFloat(e.target.value);
        if (parsed <= 0) setError("Amount must be greater than 0");
      } catch {
        setError("Invalid amount");
      }
    }
  };

  const handleDeposit = () => {
    if (!amount || error) return;
    try {
      sendTransaction({
        to: agentWalletAddress as `0x${string}`,
        value: parseEther(amount),
        chainId: SEPOLIA_CHAIN_ID,
      });
    } catch {
      setError("Failed to send transaction");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(agentWalletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSkip = () => {
    if (balance && balance.value > 0n) {
      onDeposited();
    }
  };

  const isProcessing = isPending || isConfirming;
  const currentBalance = balance ? formatEther(balance.value) : "0";
  const hasBalance = balance && balance.value > 0n;

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)] p-4 space-y-2">
        <p className="text-sm text-[var(--text-secondary)]">
          Deposit ETH to your agent&apos;s wallet to fund gas for voting transactions.
        </p>
        <p className="text-xs text-[var(--text-tertiary)]">
          The agent pays gas from this wallet&apos;s ETH balance when casting votes.
        </p>
      </div>

      {/* Agent Wallet Address */}
      <div className="space-y-1.5">
        <label className="block text-xs text-[var(--text-tertiary)]">Agent Wallet Address</label>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] px-3 py-2 text-xs font-mono text-[var(--text-primary)] break-all">
            {agentWalletAddress}
          </code>
          <Button variant="secondary" size="xs" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </div>

      {/* Current Balance */}
      <div className="flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] px-3 py-2">
        <span className="text-xs text-[var(--text-tertiary)]">Current Balance</span>
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {balanceLoading ? (
            <span className="inline-block h-3.5 w-16 animate-pulse rounded bg-[var(--border-secondary)]" />
          ) : (
            <>{currentBalance} ETH</>
          )}
        </span>
      </div>

      {/* Deposit Amount */}
      <div className="space-y-2">
        <Label htmlFor="deposit-amount">Deposit Amount (ETH)</Label>
        <Input
          id="deposit-amount"
          type="text"
          inputMode="decimal"
          placeholder="0.01"
          value={amount}
          onChange={handleAmountChange}
          error={!!error}
        />
        {error && <HelperText error>{error}</HelperText>}
        {sendError && (
          <HelperText error>
            {sendError.message.includes("User rejected") || sendError.message.includes("user rejected")
              ? "Transaction was rejected by user."
              : "Transaction failed. Please try again."}
          </HelperText>
        )}
      </div>

      {isSuccess && (
        <div className="p-3 bg-[var(--status-success-bg)] border border-[var(--status-success-border)] rounded-lg text-center">
          <p className="text-sm text-[var(--status-success-fg)] font-medium">Deposit successful!</p>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleDeposit}
          disabled={!amount || !!error || isProcessing || isSuccess}
          loading={isProcessing}
          className="flex-1"
        >
          {isPending ? "Confirm in Wallet..." : isConfirming ? "Confirming..." : isSuccess ? "Deposited!" : "Deposit ETH"}
        </Button>
        {hasBalance && !isSuccess && (
          <Button variant="secondary" onClick={handleSkip}>
            Skip
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Telegram Step ──────────────────────────────────────

type TelegramSubStep = "token-input" | "token-verified" | "wait-start" | "connected";

function TelegramStep({
  agentId,
  initialTokenSaved,
  initialConnected,
  onConnected,
}: {
  agentId: number;
  initialTokenSaved: boolean;
  initialConnected: boolean;
  onConnected: () => void;
}) {
  const [subStep, setSubStep] = React.useState<TelegramSubStep>(() => {
    if (initialConnected) return "connected";
    if (initialTokenSaved) return "wait-start";
    return "token-input";
  });

  const [token, setToken] = React.useState("");
  const [showToken, setShowToken] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [verifyResult, setVerifyResult] = React.useState<{ ok: boolean; botName?: string; error?: string } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [detecting, setDetecting] = React.useState(false);
  const [detectError, setDetectError] = React.useState<string | null>(null);
  const [showGuide, setShowGuide] = React.useState(false);

  const handleVerify = async () => {
    if (!token.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch("/api/agents/telegram/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      setVerifyResult(data);
      if (data.ok) setSubStep("token-verified");
    } catch {
      setVerifyResult({ ok: false, error: "Network error" });
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, telegramBotToken: token }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubStep("wait-start");
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDetectChat = async () => {
    setDetecting(true);
    setDetectError(null);
    try {
      const res = await fetch("/api/agents/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      const data = await res.json();
      if (data.ok) {
        setSubStep("connected");
        setTimeout(onConnected, 1500);
      } else {
        setDetectError(data.error || "No chat detected. Send /start to your bot first.");
      }
    } catch {
      setDetectError("Network error. Please try again.");
    } finally {
      setDetecting(false);
    }
  };

  if (subStep === "connected") {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-[var(--status-success-bg)] border border-[var(--status-success-border)] rounded-lg text-center space-y-1">
          <p className="text-sm text-[var(--status-success-fg)] font-medium">
            Telegram connected!
          </p>
          <p className="text-xs text-[var(--status-success-fg)]">
            Your agent is ready to vote on proposals via Telegram.
          </p>
        </div>
      </div>
    );
  }

  if (subStep === "wait-start") {
    return (
      <div className="space-y-4">
        <div className="rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[var(--color-primary-500)] flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm text-[var(--text-primary)] font-medium">Bot token saved</span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Now open your bot in Telegram and send <code className="px-1.5 py-0.5 rounded bg-[var(--surface-primary)] text-[var(--text-secondary)] text-xs">/start</code>.
            Then click the button below to detect the chat.
          </p>
        </div>

        {detectError && (
          <div className="rounded-[var(--radius-md)] px-3 py-2 text-xs bg-[var(--status-error-bg)] text-[var(--status-error-fg)]">
            {detectError}
          </div>
        )}

        <Button
          onClick={handleDetectChat}
          disabled={detecting}
          loading={detecting}
          className="w-full"
        >
          {detecting ? "Detecting..." : "Detect Chat & Set Webhook"}
        </Button>
      </div>
    );
  }

  // token-input or token-verified
  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)] p-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Connect a Telegram bot to receive proposal notifications and vote via chat.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setShowGuide(!showGuide)}
        className="flex items-center gap-2 text-sm text-[var(--text-brand)] hover:underline"
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        How to create a Telegram Bot
      </button>

      {showGuide && (
        <div className="rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)] p-4 space-y-3 text-sm">
          {[
            { n: 1, text: <>Open Telegram and search for <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="font-mono text-[var(--text-brand)] hover:underline">@BotFather</a></> },
            { n: 2, text: <>Send <code className="px-1 py-0.5 rounded bg-[var(--surface-primary)] text-xs">/newbot</code> and follow instructions</> },
            { n: 3, text: "Copy the bot token (looks like 123456789:ABCdef...)" },
          ].map(({ n, text }) => (
            <div key={n} className="flex items-start gap-2">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[10px] font-bold text-white mt-0.5">
                {n}
              </div>
              <p className="text-[var(--text-secondary)]">{text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="telegram-token">Bot Token</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="telegram-token"
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setVerifyResult(null);
                if (subStep === "token-verified") setSubStep("token-input");
              }}
              placeholder="123456789:ABCdefGHI..."
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              {showToken ? "Hide" : "Show"}
            </button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleVerify}
            disabled={!token.trim() || verifying}
          >
            {verifying ? "..." : "Verify"}
          </Button>
        </div>

        {verifyResult && (
          <div
            className={`rounded-[var(--radius-md)] px-3 py-2 text-xs ${
              verifyResult.ok
                ? "bg-[var(--status-success-bg)] text-[var(--status-success-fg)]"
                : "bg-[var(--status-error-bg)] text-[var(--status-error-fg)]"
            }`}
          >
            {verifyResult.ok
              ? `Verified: @${verifyResult.botName}`
              : verifyResult.error || "Verification failed"}
          </div>
        )}
      </div>

      <Button
        onClick={handleSave}
        disabled={subStep !== "token-verified" || saving}
        loading={saving}
        className="w-full"
      >
        {saving ? "Saving..." : "Save Bot Token"}
      </Button>
    </div>
  );
}

// ─── Main Wizard ────────────────────────────────────────

export function CreateAgentWizard({ open, onClose, onComplete }: CreateAgentWizardProps) {
  const { address } = useAccount();
  const setupStatus = useAgentSetupStatus(open ? address : undefined);

  // Local state for the wizard session
  const [agentId, setAgentId] = React.useState<number | null>(null);
  const [agentWalletAddress, setAgentWalletAddress] = React.useState<string | null>(null);
  const [currentStep, setCurrentStep] = React.useState<WizardStep>("create");
  const [isClosable, setIsClosable] = React.useState(true);

  // Sync from setupStatus when modal opens
  React.useEffect(() => {
    if (open && !setupStatus.isLoading) {
      setAgentId(setupStatus.agentId);
      setAgentWalletAddress(setupStatus.agentWalletAddress);
      setCurrentStep(setupStatus.firstIncompleteStep);
    }
  }, [open, setupStatus.isLoading, setupStatus.agentId, setupStatus.agentWalletAddress, setupStatus.firstIncompleteStep]);

  // Reset when closed
  React.useEffect(() => {
    if (!open) {
      setIsClosable(true);
    }
  }, [open]);

  const handleClose = () => {
    if (!isClosable) return;
    onClose();
  };

  const handleCreated = (id: number, wallet: string) => {
    setAgentId(id);
    setAgentWalletAddress(wallet);
    setCurrentStep("delegate");
  };

  const handleDelegated = () => {
    setCurrentStep("deposit");
  };

  const handleDeposited = () => {
    setCurrentStep("telegram");
  };

  const handleTelegramConnected = () => {
    setCurrentStep("complete");
    if (agentId) {
      setTimeout(() => onComplete(agentId), 2000);
    }
  };

  const stepTitle = () => {
    switch (currentStep) {
      case "create": return "Create Your Agent";
      case "delegate": return "Delegate vTON";
      case "deposit": return "Fund Gas";
      case "telegram": return "Connect Telegram";
      case "complete": return "Setup Complete";
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={stepTitle()}
      size="md"
    >
      <ModalBody className="space-y-5">
        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} />

        {/* Loading */}
        {setupStatus.isLoading && open ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent" />
          </div>
        ) : currentStep === "create" ? (
          <CreateStep onCreated={handleCreated} />
        ) : currentStep === "delegate" && agentWalletAddress ? (
          <DelegateStep
            agentWalletAddress={agentWalletAddress}
            onDelegated={handleDelegated}
          />
        ) : currentStep === "deposit" && agentWalletAddress ? (
          <DepositStep
            agentWalletAddress={agentWalletAddress}
            onDeposited={handleDeposited}
          />
        ) : currentStep === "telegram" && agentId ? (
          <TelegramStep
            agentId={agentId}
            initialTokenSaved={setupStatus.telegramTokenSaved}
            initialConnected={setupStatus.telegramConnected}
            onConnected={handleTelegramConnected}
          />
        ) : currentStep === "complete" ? (
          <div className="py-4 text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-[var(--color-success-500)] flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--text-primary)]">All set!</p>
              <p className="text-sm text-[var(--text-secondary)]">
                Your agent is ready to vote on proposals via Telegram.
              </p>
            </div>
          </div>
        ) : null}
      </ModalBody>

      <ModalFooter>
        {currentStep === "complete" ? (
          <Button onClick={() => agentId && onComplete(agentId)}>
            Go to My Agent
          </Button>
        ) : (
          <Button variant="secondary" onClick={handleClose} disabled={!isClosable}>
            {currentStep === "create" ? "Cancel" : "Close & Continue Later"}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
