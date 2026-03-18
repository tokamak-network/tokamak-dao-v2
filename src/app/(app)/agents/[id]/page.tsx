"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount, useConfig, useWriteContract, useWaitForTransactionReceipt, useBalance, useSendTransaction } from "wagmi";
import { waitForTransactionReceipt as wagmiWaitForReceipt } from "@wagmi/core";
import { parseEther, formatEther } from "viem";
import { SEPOLIA_CHAIN_ID } from "@/constants/erc8004";
import { DELEGATE_REGISTRY_ABI, CONTRACT_ADDRESSES, VTON_ABI } from "@/constants/contracts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";

const CHAIN_ID = SEPOLIA_CHAIN_ID;

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ─── Section helpers ─────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-6">
      <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
      {children}
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-[var(--text-tertiary)]">{label}</dt>
      <dd className="truncate text-[var(--text-primary)]">{children}</dd>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/agents"
      className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Agents
    </Link>
  );
}

// ─── Tabs ────────────────────────────────────────────────

type TabId = "overview" | "settings";

// ─── Page ────────────────────────────────────────────────

interface AgentData {
  id: number;
  owner: string;
  telegramConnected: boolean;
  agentWalletAddress: string | null;
  smartAccountAddress: string | null;
  createdAt: string;
}

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { address } = useAccount();
  const [tab, setTab] = useState<TabId>("overview");
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAgent = useCallback(() => {
    setIsLoading(true);
    fetch(`/api/agents?agentId=${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.id) {
          setAgent({
            id: data.id,
            owner: data.owner,
            telegramConnected: !!data.telegramConnected,
            agentWalletAddress: data.agentWalletAddress || null,
            smartAccountAddress: data.smartAccountAddress || null,
            createdAt: data.createdAt,
          });
        } else {
          setAgent(null);
        }
      })
      .catch(() => setAgent(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => { fetchAgent(); }, [fetchAgent]);

  const isOwner = !!(address && agent?.owner && address.toLowerCase() === agent.owner.toLowerCase());

  const tabs = useMemo(() => {
    const base: { id: TabId; label: string }[] = [
      { id: "overview", label: "Overview" },
    ];
    if (isOwner) base.push({ id: "settings", label: "Settings" });
    return base;
  }, [isOwner]);

  const explorerBase = "https://sepolia.etherscan.io";

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <BackLink />
        <div className="animate-pulse space-y-6">
          <div className="flex items-start gap-6">
            <div className="h-20 w-20 rounded-[var(--radius-xl)] bg-[var(--bg-tertiary)]" />
            <div className="flex-1 space-y-3">
              <div className="h-8 w-1/3 rounded bg-[var(--bg-tertiary)]" />
              <div className="h-4 w-2/3 rounded bg-[var(--bg-tertiary)]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not found
  if (!agent) {
    return (
      <div className="space-y-6">
        <BackLink />
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-lg text-[var(--text-secondary)]">Agent #{id} not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const name = `Agent #${id}`;

  return (
    <div className="space-y-6">
      <BackLink />

      {/* Header */}
      <div className="flex items-start gap-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://api.dicebear.com/9.x/bottts/svg?seed=${agent.owner.toLowerCase()}`}
          alt={name}
          className="h-20 w-20 rounded-[var(--radius-xl)] object-cover bg-[var(--surface-secondary)]"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">{name}</h1>
            {agent.telegramConnected && (
              <Badge variant="info" size="sm">Telegram</Badge>
            )}
          </div>
          <p className="mt-2 text-[var(--text-secondary)]">
            Personal voting agent for {shortenAddress(agent.owner)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border-primary)]">
        <nav className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                tab === t.id
                  ? "border-[var(--color-primary-500)] text-[var(--text-primary)]"
                  : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="space-y-6">
          <Section title="Identity">
            <dl className="space-y-3 text-sm">
              <InfoRow label="Agent ID">
                <span className="font-mono">{id}</span>
              </InfoRow>
              <InfoRow label="Owner">
                <a
                  href={`${explorerBase}/address/${agent.owner}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[var(--text-brand)] hover:underline"
                >
                  {shortenAddress(agent.owner)}
                </a>
              </InfoRow>
              {agent.agentWalletAddress && (
                <InfoRow label="Agent Wallet">
                  <a
                    href={`${explorerBase}/address/${agent.agentWalletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[var(--text-brand)] hover:underline"
                  >
                    {shortenAddress(agent.agentWalletAddress)}
                  </a>
                </InfoRow>
              )}
              {agent.smartAccountAddress && (
                <InfoRow label="Smart Account">
                  <a
                    href={`${explorerBase}/address/${agent.smartAccountAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[var(--text-brand)] hover:underline"
                  >
                    {shortenAddress(agent.smartAccountAddress)}
                  </a>
                </InfoRow>
              )}
              <InfoRow label="Chain">Sepolia</InfoRow>
              <InfoRow label="Created">
                {new Date(agent.createdAt).toLocaleDateString()}
              </InfoRow>
            </dl>
          </Section>
        </div>
      )}

      {/* Settings Tab (owner only) */}
      {tab === "settings" && isOwner && (
        <div className="space-y-6">
          {agent.agentWalletAddress && (
            <AgentWalletSection walletAddress={agent.agentWalletAddress} agentId={id} />
          )}
          {agent.agentWalletAddress && (
            <GasDepositSection walletAddress={agent.agentWalletAddress} />
          )}
          <TelegramSettings agentId={id} owner={agent.owner} connected={agent.telegramConnected} onSaved={fetchAgent} />
          <AgentProfileSection agentId={id} />
        </div>
      )}
    </div>
  );
}

// ─── Agent Wallet Section ─────────────────────────────────

function AgentWalletSection({ walletAddress, agentId }: { walletAddress: string; agentId: string }) {
  const [copied, setCopied] = useState(false);
  const [delegateAmount, setDelegateAmount] = useState("");
  const sepoliaAddresses = CONTRACT_ADDRESSES[SEPOLIA_CHAIN_ID];
  const config = useConfig();

  const waitForReceipt = (hash: `0x${string}`) =>
    wagmiWaitForReceipt(config, { hash, chainId: SEPOLIA_CHAIN_ID });

  const [delegateStep, setDelegateStep] = useState<"idle" | "approving" | "delegating">("idle");

  const { writeContract, writeContractAsync, data: txHash, isPending, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelegate = async () => {
    if (!delegateAmount || parseFloat(delegateAmount) <= 0) return;
    const amount = parseEther(delegateAmount);

    try {
      // Step 1: Approve vTON to DelegateRegistry
      setDelegateStep("approving");
      resetWrite();
      const approveTx = await writeContractAsync({
        address: sepoliaAddresses.vton as `0x${string}`,
        abi: VTON_ABI,
        functionName: "approve",
        args: [sepoliaAddresses.delegateRegistry as `0x${string}`, amount],
        chainId: SEPOLIA_CHAIN_ID,
      });

      await waitForReceipt(approveTx);

      // Step 2: Delegate
      setDelegateStep("delegating");
      writeContract({
        address: sepoliaAddresses.delegateRegistry as `0x${string}`,
        abi: DELEGATE_REGISTRY_ABI,
        functionName: "delegate",
        args: [walletAddress as `0x${string}`, amount],
        chainId: SEPOLIA_CHAIN_ID,
      });
    } catch {
      setDelegateStep("idle");
    }
  };

  useEffect(() => {
    if (isSuccess || writeError) setDelegateStep("idle");
  }, [isSuccess, writeError]);

  return (
    <>
      <Section title="Agent Wallet (On-Chain Voting)">
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            This is the Agent&apos;s dedicated wallet. Delegate vTON to let the Agent vote on your behalf via Telegram.
          </p>

          <div className="space-y-2">
            <label className="block text-xs text-[var(--text-tertiary)]">Agent Wallet Address</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm font-mono text-[var(--text-primary)] break-all">
                {walletAddress}
              </code>
              <Button variant="secondary" size="sm" onClick={handleCopy}>
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <a
              href={`https://sepolia.etherscan.io/address/${walletAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-[var(--text-brand)] hover:underline"
            >
              View on Etherscan →
            </a>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--border-primary)] p-4 space-y-3">
            <label className="block text-xs font-medium text-[var(--text-primary)]">Delegate vTON</label>
            <p className="text-xs text-[var(--text-tertiary)]">
              Enter the amount of vTON to delegate. The Agent will vote on your behalf using the delegated voting power.
            </p>
            <div className="flex gap-2">
              <Input
                type="number"
                value={delegateAmount}
                onChange={(e) => setDelegateAmount(e.target.value)}
                placeholder="e.g. 100"
                min="0"
                step="any"
              />
              <Button
                onClick={handleDelegate}
                disabled={!delegateAmount || parseFloat(delegateAmount) <= 0 || isPending || isConfirming || delegateStep !== "idle"}
              >
                {delegateStep === "approving" ? "Approving vTON..." :
                 delegateStep === "delegating" ? "Delegating..." :
                 isPending ? "Signing..." : isConfirming ? "Confirming..." : "Delegate"}
              </Button>
            </div>
          </div>

          {writeError && (
            <div className="rounded-[var(--radius-md)] px-3 py-2 text-xs bg-[var(--status-error-bg)] text-[var(--status-error-fg)]">
              {writeError.message.includes("user rejected")
                ? "Transaction was rejected."
                : `Error: ${writeError.message.slice(0, 100)}`}
            </div>
          )}

          {isSuccess && (
            <div className="rounded-[var(--radius-md)] px-3 py-2 text-xs bg-[var(--status-success-bg)] text-[var(--status-success-fg)]">
              Transaction complete!
            </div>
          )}
        </div>
      </Section>
    </>
  );
}

// ─── Gas Deposit Section ─────────────────────────────────

function GasDepositSection({ walletAddress }: { walletAddress: string }) {
  const [amount, setAmount] = useState("0.01");
  const [copied, setCopied] = useState(false);

  const { data: balance } = useBalance({
    address: walletAddress as `0x${string}`,
    chainId: CHAIN_ID,
  });

  const { sendTransaction, data: txHash, isPending, error: sendError } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeposit = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    sendTransaction({
      to: walletAddress as `0x${string}`,
      value: parseEther(amount),
      chainId: CHAIN_ID,
    });
  };

  const currentBalance = balance ? formatEther(balance.value) : "0";

  return (
    <Section title="Gas Deposit">
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          The agent pays gas from its wallet&apos;s ETH balance. Deposit ETH here to fund voting transactions.
        </p>

        <div className="space-y-2">
          <label className="block text-xs text-[var(--text-tertiary)]">Agent Wallet Address</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm font-mono text-[var(--text-primary)] break-all">
              {walletAddress}
            </code>
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <a
            href={`https://sepolia.etherscan.io/address/${walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-[var(--text-brand)] hover:underline"
          >
            View on Etherscan →
          </a>
        </div>

        <div className="flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] px-3 py-2">
          <span className="text-xs text-[var(--text-tertiary)]">Current Balance</span>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {parseFloat(currentBalance).toFixed(6)} ETH
          </span>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--border-primary)] p-4 space-y-3">
          <label className="block text-xs font-medium text-[var(--text-primary)]">Deposit ETH</label>
          <p className="text-xs text-[var(--text-tertiary)]">
            Send ETH to the Smart Account to cover gas costs for voting transactions.
          </p>
          <div className="flex gap-2">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.01"
              min="0"
              step="any"
            />
            <Button
              onClick={handleDeposit}
              disabled={!amount || parseFloat(amount) <= 0 || isPending || isConfirming}
            >
              {isPending ? "Signing..." : isConfirming ? "Confirming..." : "Deposit"}
            </Button>
          </div>
        </div>

        {sendError && (
          <div className="rounded-[var(--radius-md)] px-3 py-2 text-xs bg-[var(--status-error-bg)] text-[var(--status-error-fg)]">
            {sendError.message.includes("user rejected")
              ? "Transaction was rejected."
              : `Error: ${sendError.message.slice(0, 100)}`}
          </div>
        )}

        {isSuccess && (
          <div className="rounded-[var(--radius-md)] px-3 py-2 text-xs bg-[var(--status-success-bg)] text-[var(--status-success-fg)]">
            Deposit successful!
          </div>
        )}
      </div>
    </Section>
  );
}

// ─── Agent Profile Tab ───────────────────────────────────

interface ProfileData {
  agent_id: number;
  traits: Record<string, number>;
}

const TRAIT_CONFIG: { key: string; name: string; low: string; high: string }[] = [
  { key: "treasury_philosophy", name: "Treasury Philosophy", low: "Conservative", high: "Aggressive" },
  { key: "inflation_tolerance", name: "Inflation Tolerance", low: "Deflationary", high: "Inflationary" },
  { key: "governance_accessibility", name: "Governance Accessibility", low: "High Barriers", high: "Low Barriers" },
  { key: "security_priority", name: "Security Priority", low: "Minimal Oversight", high: "Maximum Security" },
  { key: "expansion_stance", name: "Expansion Stance", low: "Cautious", high: "Rapid Expansion" },
  { key: "skin_in_game", name: "Skin in the Game", low: "No Cost", high: "High Cost" },
  { key: "delegation_style", name: "Delegation Style", low: "Manual Control", high: "Full Autonomy" },
];

function TraitBar({ name, value, low, high }: { name: string; value: number; low: string; high: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-[var(--text-primary)] font-medium">{name}</span>
        <span className="text-[var(--text-tertiary)] tabular-nums">{pct}%</span>
      </div>
      <div className="relative h-2 rounded-full bg-[var(--bg-tertiary)]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-primary-500)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-[var(--text-tertiary)]">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

function AgentProfileSection({
  agentId,
}: {
  agentId: string;
}) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(() => {
    setLoading(true);
    fetch(`/api/agents/telegram/profile?agentId=${agentId}`)
      .then((res) => res.json())
      .then((data) => {
        setProfile(data.profile || null);
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [agentId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)]" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <Section title="Governance Profile">
          <p className="text-sm text-[var(--text-tertiary)]">
            No profile data yet. When new proposals are created, the Agent will provide analysis via Telegram, and the governance profile will form automatically through conversations.
          </p>
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Section title="Governance Profile">
        <div className="space-y-5">
          {TRAIT_CONFIG.map(({ key, name, low, high }) => (
            <TraitBar
              key={key}
              name={name}
              value={profile.traits[key] ?? 0.5}
              low={low}
              high={high}
            />
          ))}
        </div>
        <p className="mt-4 text-xs text-[var(--text-tertiary)]">
          This profile is automatically updated through proposal analysis conversations.
        </p>
      </Section>
    </div>
  );
}

// ─── Telegram Settings ──────────────────────────────────

function TelegramSettings({
  agentId,
  owner,
  connected,
  onSaved,
}: {
  agentId: string;
  owner: string;
  connected: boolean;
  onSaved: () => void;
}) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ ok: boolean; botName?: string; error?: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; chatTitle?: string; error?: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);

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
      setVerifyResult(await res.json());
    } catch {
      setVerifyResult({ ok: false, error: "Network error" });
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch("/api/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, owner, telegramBotToken: token }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToken("");
        setVerifyResult(null);
        setSaveResult({ ok: true });
        onSaved();
      } else {
        setSaveResult({ ok: false, error: data.error || "Failed to save" });
      }
    } catch {
      setSaveResult({ ok: false, error: "Network error" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/agents/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      setTestResult(await res.json());
    } catch {
      setTestResult({ ok: false, error: "Network error" });
    } finally {
      setTesting(false);
    }
  };

  const [showChangeToken, setShowChangeToken] = useState(false);

  return (
    <Section title="Telegram Integration">
      <div className="space-y-4">
        {connected ? (
          <>
            <div className="rounded-[var(--radius-md)] bg-[var(--status-success-bg)] px-3 py-2 text-sm text-[var(--status-success-fg)]">
              Telegram bot is connected
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={handleTest}
                disabled={testing}
              >
                {testing ? "Sending..." : "Send Test Message"}
              </Button>
              <button
                type="button"
                onClick={() => setShowChangeToken(!showChangeToken)}
                className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
              >
                {showChangeToken ? "Cancel" : "Change Bot Token"}
              </button>
            </div>

            {testResult && (
              <div className={`rounded-[var(--radius-md)] px-3 py-2 text-xs ${
                testResult.ok
                  ? "bg-[var(--status-success-bg)] text-[var(--status-success-fg)]"
                  : "bg-[var(--status-error-bg)] text-[var(--status-error-fg)]"
              }`}>
                {testResult.ok
                  ? `Test message sent to "${testResult.chatTitle}"`
                  : testResult.error || "Failed to send test message"}
              </div>
            )}

            {showChangeToken && (
              <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--border-primary)] p-4">
                <div className="space-y-2">
                  <label className="mb-1 block text-xs text-[var(--text-tertiary)]">New Bot Token</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showToken ? "text" : "password"}
                        value={token}
                        onChange={(e) => {
                          setToken(e.target.value);
                          setVerifyResult(null);
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
                      {verifying ? "Verifying..." : "Verify"}
                    </Button>
                  </div>

                  {verifyResult && (
                    <div className={`rounded-[var(--radius-md)] px-3 py-2 text-xs ${
                      verifyResult.ok
                        ? "bg-[var(--status-success-bg)] text-[var(--status-success-fg)]"
                        : "bg-[var(--status-error-bg)] text-[var(--status-error-fg)]"
                    }`}>
                      {verifyResult.ok
                        ? `Verified: @${verifyResult.botName}`
                        : verifyResult.error || "Verification failed"}
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleSave}
                  disabled={!verifyResult?.ok || saving}
                >
                  {saving ? "Saving..." : "Update Bot Token"}
                </Button>

                {saveResult && (
                  <div className={`rounded-[var(--radius-md)] px-3 py-2 text-xs ${
                    saveResult.ok
                      ? "bg-[var(--status-success-bg)] text-[var(--status-success-fg)]"
                      : "bg-[var(--status-error-bg)] text-[var(--status-error-fg)]"
                  }`}>
                    {saveResult.ok
                      ? "Bot token saved successfully"
                      : saveResult.error || "Failed to save"}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-[var(--text-tertiary)]">
              Connect a Telegram bot to enable community engagement through Telegram.
            </p>

            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className="flex items-center gap-2 text-sm text-[var(--text-brand)] hover:underline"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How to create a Telegram Bot
            </button>

            <Modal
              open={showGuide}
              onClose={() => setShowGuide(false)}
              title="How to Create a Telegram Bot"
              description="Follow these steps to create a bot and connect it to your DAO agent."
              size="md"
            >
              <ModalBody className="space-y-5">
                {[
                  {
                    step: 1,
                    title: "Open BotFather",
                    content: (
                      <>
                        Open Telegram and search for{" "}
                        <a
                          href="https://t.me/BotFather"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[var(--text-brand)] hover:underline"
                        >
                          @BotFather
                        </a>
                        . This is the official Telegram bot for creating and managing bots.
                      </>
                    ),
                  },
                  {
                    step: 2,
                    title: "Create a new bot",
                    content: (
                      <>
                        Send the command{" "}
                        <code className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-xs">/newbot</code>{" "}
                        to BotFather. It will ask you to choose a display name (e.g. &quot;Tokamak DAO Agent&quot;) and a
                        username ending in <code className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-xs">_bot</code>{" "}
                        (e.g. &quot;tokamak_dao_bot&quot;).
                      </>
                    ),
                  },
                  {
                    step: 3,
                    title: "Copy the bot token",
                    content: (
                      <>
                        BotFather will send you a token that looks like{" "}
                        <code className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-xs break-all">
                          123456789:ABCdefGHIjklMNO...
                        </code>
                        . Copy this token and paste it in the Bot Token field below.
                      </>
                    ),
                  },
                  {
                    step: 4,
                    title: "Start a chat with your bot",
                    content: (
                      <>
                        Find your new bot on Telegram and send{" "}
                        <code className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-xs">/start</code>
                        . This is required so the bot knows where to send notifications. You can also add the bot to a group chat.
                      </>
                    ),
                  },
                  {
                    step: 5,
                    title: "Verify & send a test message",
                    content:
                      "After saving the token, click \"Send Test Message\" to confirm everything is connected. You should receive a message from your bot in Telegram.",
                  },
                ].map(({ step, title: stepTitle, content }) => (
                  <div key={step} className="flex gap-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] text-xs font-bold text-white">
                      {step}
                    </div>
                    <div className="space-y-1 pt-0.5">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{stepTitle}</p>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{content}</p>
                    </div>
                  </div>
                ))}
              </ModalBody>
              <ModalFooter>
                <Button variant="secondary" size="sm" onClick={() => setShowGuide(false)}>
                  Close
                </Button>
              </ModalFooter>
            </Modal>

            <div className="space-y-2">
              <label className="mb-1 block text-xs text-[var(--text-tertiary)]">Bot Token</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showToken ? "text" : "password"}
                    value={token}
                    onChange={(e) => {
                      setToken(e.target.value);
                      setVerifyResult(null);
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
                  {verifying ? "Verifying..." : "Verify"}
                </Button>
              </div>

              {verifyResult && (
                <div className={`rounded-[var(--radius-md)] px-3 py-2 text-xs ${
                  verifyResult.ok
                    ? "bg-[var(--status-success-bg)] text-[var(--status-success-fg)]"
                    : "bg-[var(--status-error-bg)] text-[var(--status-error-fg)]"
                }`}>
                  {verifyResult.ok
                    ? `Verified: @${verifyResult.botName}`
                    : verifyResult.error || "Verification failed"}
                </div>
              )}
            </div>

            <Button
              onClick={handleSave}
              disabled={!verifyResult?.ok || saving}
            >
              {saving ? "Saving..." : "Save Bot Token"}
            </Button>

            {saveResult && (
              <div className={`rounded-[var(--radius-md)] px-3 py-2 text-xs ${
                saveResult.ok
                  ? "bg-[var(--status-success-bg)] text-[var(--status-success-fg)]"
                  : "bg-[var(--status-error-bg)] text-[var(--status-error-fg)]"
              }`}>
                {saveResult.ok
                  ? "Bot token saved successfully"
                  : saveResult.error || "Failed to save"}
              </div>
            )}
          </>
        )}
      </div>
    </Section>
  );
}
