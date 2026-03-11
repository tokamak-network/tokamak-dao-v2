"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useReadContracts } from "wagmi";
import { identityRegistryAbi, getRegistryAddress, SEPOLIA_CHAIN_ID } from "@/constants/erc8004";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddressAvatar } from "@/components/ui/avatar";
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

const TABS = [
  { id: "overview" as const, label: "Overview" },
  { id: "capabilities" as const, label: "Capabilities" },
];

type TabId = "overview" | "capabilities";

// ─── Page ────────────────────────────────────────────────

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const agentId = BigInt(id);
  const [tab, setTab] = useState<TabId>("overview");

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
  const meta = useMemo(() => (agentURI ? parseAgentURI(agentURI) : null), [agentURI]);

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
        {meta?.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={resolveImage(meta.image)}
            alt={name}
            className="h-20 w-20 rounded-[var(--radius-xl)] object-cover bg-[var(--surface-secondary)]"
          />
        ) : (
          <AddressAvatar address={owner} size="2xl" />
        )}

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
          </div>
          <p className="mt-2 text-[var(--text-secondary)]">
            {meta?.description || "No description available"}
          </p>
        </div>
      </div>

      {/* ═══ Tabs ═══ */}
      <div className="border-b border-[var(--border-primary)]">
        <nav className="flex gap-6">
          {TABS.map((t) => (
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
    </div>
  );
}
