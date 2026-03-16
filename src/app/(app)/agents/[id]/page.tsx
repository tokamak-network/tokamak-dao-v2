"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount, useReadContracts } from "wagmi";
import { identityRegistryAbi, getRegistryAddress, SEPOLIA_CHAIN_ID } from "@/constants/erc8004";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";
import type { AgentMetadata } from "@/types/agent";

const CHAIN_ID = SEPOLIA_CHAIN_ID;
const registryAddress = getRegistryAddress(CHAIN_ID);

function resolveImage(url: string) {
  if (url.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${url.slice(7)}`;
  return url;
}

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function parseAgentURI(uri: string): AgentMetadata | null {
  try {
    if (uri.startsWith("data:application/json;base64,")) {
      const base64 = uri.slice("data:application/json;base64,".length);
      const json = decodeURIComponent(escape(atob(base64)));
      return JSON.parse(json);
    }
    if (uri.startsWith("{")) return JSON.parse(uri);
    return null;
  } catch {
    return null;
  }
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

type TabId = "overview" | "capabilities" | "profile" | "settings";

// ─── Page ────────────────────────────────────────────────

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const agentId = BigInt(id);
  const { address } = useAccount();
  const [tab, setTab] = useState<TabId>("overview");
  const [telegramConnected, setTelegramConnected] = useState(false);

  const refreshTelegram = useCallback(() => {
    fetch(`/api/agents?agentId=${id}`)
      .then((res) => res.json())
      .then((data) => setTelegramConnected(!!data.telegramConnected))
      .catch(() => {});
  }, [id]);

  useEffect(() => { refreshTelegram(); }, [refreshTelegram]);

  const { data: results, isLoading } = useReadContracts({
    contracts: [
      {
        address: registryAddress,
        abi: identityRegistryAbi,
        functionName: "ownerOf",
        args: [agentId],
        chainId: CHAIN_ID,
      },
      {
        address: registryAddress,
        abi: identityRegistryAbi,
        functionName: "tokenURI",
        args: [agentId],
        chainId: CHAIN_ID,
      },
    ],
  });

  const owner = results?.[0]?.status === "success" ? (results[0].result as string) : null;
  const agentURI = results?.[1]?.status === "success" ? (results[1].result as string) : null;
  // Resolve metadata: sync for data URIs, async fetch for IPFS
  const syncMeta = useMemo(() => (agentURI ? parseAgentURI(agentURI) : null), [agentURI]);
  const [ipfsMeta, setIpfsMeta] = useState<AgentMetadata | null>(null);

  useEffect(() => {
    if (!agentURI || !agentURI.startsWith("ipfs://")) {
      setIpfsMeta(null);
      return;
    }
    let cancelled = false;
    fetch(resolveImage(agentURI))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (!cancelled) setIpfsMeta(data); })
      .catch(() => { if (!cancelled) setIpfsMeta(null); });
    return () => { cancelled = true; };
  }, [agentURI]);

  const meta = syncMeta ?? ipfsMeta;

  const name = meta?.name || `Agent #${id}`;

  const allSkills = useMemo(() => [
    ...new Set([
      ...(meta?.skills ?? []),
      ...(meta?.services?.flatMap((svc) => svc.skills ?? []) ?? []),
    ]),
  ], [meta]);

  const allDomains = useMemo(() => [
    ...new Set([
      ...(meta?.domains ?? []),
      ...(meta?.services?.flatMap((svc) => svc.domains ?? []) ?? []),
    ]),
  ], [meta]);

  const protocols = useMemo(() => {
    const p: string[] = [];
    meta?.services?.forEach((svc) => {
      const n = svc.name.toUpperCase();
      if (n.includes("MCP")) p.push("MCP");
      if (n.includes("A2A")) p.push("A2A");
    });
    return [...new Set(p)];
  }, [meta]);

  const isOwner = !!(address && owner && address.toLowerCase() === owner.toLowerCase());

  const tabs = useMemo(() => {
    const base: { id: TabId; label: string }[] = [
      { id: "overview", label: "Overview" },
      { id: "capabilities", label: "Capabilities" },
      { id: "profile", label: "Profile" },
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
          <div className="h-64 rounded-[var(--radius-xl)] bg-[var(--bg-tertiary)]" />
        </div>
      </div>
    );
  }

  // Not found
  if (!owner) {
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

  return (
    <div className="space-y-6">
      <BackLink />

      {/* ═══ Header ═══ */}
      <div className="flex items-start gap-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={meta?.image ? resolveImage(meta.image) : `https://api.dicebear.com/9.x/bottts/svg?seed=${owner.toLowerCase()}`}
          alt={name}
          className="h-20 w-20 rounded-[var(--radius-xl)] object-cover bg-[var(--surface-secondary)]"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">{name}</h1>
            {meta?.active !== undefined && (
              <Badge variant={meta.active ? "success" : "error"} size="sm">
                {meta.active ? "Active" : "Inactive"}
              </Badge>
            )}
            {meta?.x402Support && (
              <Badge variant="info" size="sm">x402</Badge>
            )}
            {protocols.map((p) => (
              <Badge key={p} variant="primary" size="sm">{p}</Badge>
            ))}
            {telegramConnected && (
              <Badge variant="info" size="sm">Telegram</Badge>
            )}
          </div>
          <p className="mt-2 text-[var(--text-secondary)]">
            {meta?.description || "No description available"}
          </p>
        </div>
      </div>

      {/* ═══ Tabs ═══ */}
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

      {/* ═══ Overview Tab ═══ */}
      {tab === "overview" && (
        <div className="space-y-6">
          <Section title="Identity">
            <dl className="space-y-3 text-sm">
              <InfoRow label="Token ID">
                <span className="font-mono">{id}</span>
              </InfoRow>
              <InfoRow label="Owner">
                <a
                  href={`${explorerBase}/address/${owner}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[var(--text-brand)] hover:underline"
                >
                  {shortenAddress(owner)}
                </a>
              </InfoRow>
              <InfoRow label="Contract">
                <a
                  href={`${explorerBase}/address/${registryAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-[var(--text-brand)] hover:underline"
                >
                  {shortenAddress(registryAddress)}
                </a>
              </InfoRow>
              <InfoRow label="Chain">Sepolia</InfoRow>
              {meta?.type && (
                <InfoRow label="Type">
                  <span className="font-mono text-xs">{meta.type}</span>
                </InfoRow>
              )}
            </dl>
          </Section>

          {/* Services */}
          {meta?.services && meta.services.length > 0 && (
            <Section title="Services">
              <div className="space-y-3">
                {meta.services.map((svc, i) => (
                  <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--border-primary)] p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-[var(--text-primary)]">{svc.name}</h3>
                      {svc.version && (
                        <span className="text-xs text-[var(--text-tertiary)]">v{svc.version}</span>
                      )}
                    </div>
                    <p className="mt-1 break-all font-mono text-xs text-[var(--text-secondary)]">
                      {svc.endpoint}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Social Links */}
          {meta?.socials && Object.values(meta.socials).some(Boolean) && (
            <Section title="Links">
              <div className="flex flex-wrap gap-3">
                {meta.socials.website && (
                  <a href={meta.socials.website} target="_blank" rel="noopener noreferrer"
                    className="rounded-[var(--radius-lg)] border border-[var(--border-primary)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:border-[var(--border-secondary)] hover:text-[var(--text-primary)]">
                    Website
                  </a>
                )}
                {meta.socials.github && (
                  <a href={meta.socials.github} target="_blank" rel="noopener noreferrer"
                    className="rounded-[var(--radius-lg)] border border-[var(--border-primary)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:border-[var(--border-secondary)] hover:text-[var(--text-primary)]">
                    GitHub
                  </a>
                )}
                {meta.socials.twitter && (
                  <a href={meta.socials.twitter} target="_blank" rel="noopener noreferrer"
                    className="rounded-[var(--radius-lg)] border border-[var(--border-primary)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:border-[var(--border-secondary)] hover:text-[var(--text-primary)]">
                    Twitter
                  </a>
                )}
                {meta.socials.discord && (
                  <a href={meta.socials.discord} target="_blank" rel="noopener noreferrer"
                    className="rounded-[var(--radius-lg)] border border-[var(--border-primary)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:border-[var(--border-secondary)] hover:text-[var(--text-primary)]">
                    Discord
                  </a>
                )}
                {meta.socials.email && (
                  <a href={`mailto:${meta.socials.email}`}
                    className="rounded-[var(--radius-lg)] border border-[var(--border-primary)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:border-[var(--border-secondary)] hover:text-[var(--text-primary)]">
                    Email
                  </a>
                )}
              </div>
            </Section>
          )}

          {/* Agent URI */}
          {agentURI && (
            <details className="rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-secondary)]">
              <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--text-brand)]">
                Agent URI
              </summary>
              <div className="border-t border-[var(--border-primary)] px-6 py-4">
                <p className="break-all font-mono text-xs text-[var(--text-secondary)]">
                  {agentURI.length > 500 ? `${agentURI.slice(0, 500)}...` : agentURI}
                </p>
              </div>
            </details>
          )}
        </div>
      )}

      {/* ═══ Capabilities Tab ═══ */}
      {tab === "capabilities" && (
        <div className="space-y-6">
          <Section title="Skills">
            {allSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {allSkills.map((skill) => (
                  <span key={skill} className="rounded-full bg-[var(--color-primary-500)]/20 px-3 py-1 text-sm text-[var(--text-brand)]">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-tertiary)]">No skills configured</p>
            )}
          </Section>

          <Section title="Domains">
            {allDomains.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {allDomains.map((domain) => (
                  <span key={domain} className="rounded-full bg-purple-500/20 px-3 py-1 text-sm text-purple-400">
                    {domain}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-tertiary)]">No domains configured</p>
            )}
          </Section>

          <Section title="Trust Models">
            {meta?.supportedTrust && meta.supportedTrust.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {meta.supportedTrust.map((trust) => (
                  <span key={trust} className="rounded-full bg-[var(--status-warning-bg)] px-3 py-1 text-sm text-[var(--status-warning-fg)]">
                    {trust}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-tertiary)]">No trust models configured</p>
            )}
          </Section>

          {meta?.tags && meta.tags.length > 0 && (
            <Section title="Search Tags">
              <div className="flex flex-wrap gap-2">
                {meta.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[var(--surface-primary)] border border-[var(--border-primary)] px-3 py-1 text-sm text-[var(--text-secondary)]">
                    {tag}
                  </span>
                ))}
              </div>
            </Section>
          )}

          <Section title="Agent Settings">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-tertiary)]">Status</span>
                <Badge variant={meta?.active ? "success" : "error"} size="sm">
                  {meta?.active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-tertiary)]">x402 Payment Support</span>
                <Badge variant={meta?.x402Support ? "info" : "default"} size="sm">
                  {meta?.x402Support ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ═══ Profile Tab ═══ */}
      {tab === "profile" && (
        <AgentProfileTab agentId={id} />
      )}

      {/* ═══ Settings Tab (owner only) ═══ */}
      {tab === "settings" && isOwner && (
        <div className="space-y-6">
          <TelegramSettings agentId={id} owner={owner} connected={telegramConnected} onSaved={refreshTelegram} />
        </div>
      )}
    </div>
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

function AgentProfileTab({
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
            아직 프로필 데이터가 없습니다. 새로운 안건이 올라오면 Telegram을 통해 분석을 제공하고, 대화를 나누면서 거버넌스 프로필이 자동으로 형성됩니다.
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
          이 프로필은 안건 분석 대화를 통해 자동으로 업데이트됩니다.
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
