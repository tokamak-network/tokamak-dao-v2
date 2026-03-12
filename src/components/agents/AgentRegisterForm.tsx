"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useAccount,
  useBalance,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
  useChainId,
} from "wagmi";
import { decodeEventLog, formatEther } from "viem";
import { sepolia } from "viem/chains";
import {
  identityRegistryAbi,
  getRegistryAddress,
} from "@/constants/erc8004";
import {
  buildAgentMetadata,
  buildDataURI,
  estimateCalldataGas,
} from "@/lib/agent-metadata";
import { useIsRegisteredDelegate } from "@/hooks/contracts/useDelegateRegistry";
import { useHasAgent } from "@/hooks/contracts/useAgentRegistry";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";

// ─── Types ───────────────────────────────────────────────

interface ServiceEntry {
  name: string;
  endpoint: string;
  version: string;
}

interface FormData {
  name: string;
  description: string;
  image: string;
  services: ServiceEntry[];
  skills: string[];
  customSkills: string[];
  customSkillInput: string;
  domains: string[];
  customDomains: string[];
  customDomainInput: string;
  supportedTrust: string[];
  tags: string[];
  tagInput: string;
  active: boolean;
  storageMethod: "onchain" | "ipfs";
  x402Support: boolean;
  website: string;
  twitter: string;
  github: string;
  discord: string;
  email: string;
}

const INITIAL_FORM: FormData = {
  name: "",
  description: "",
  image: "",
  services: [
    { name: "MCP", endpoint: "", version: "" },
    { name: "A2A", endpoint: "", version: "" },
  ],
  skills: [],
  customSkills: [],
  customSkillInput: "",
  domains: [],
  customDomains: [],
  customDomainInput: "",
  supportedTrust: [],
  tags: [],
  tagInput: "",
  active: false,
  storageMethod: "onchain",
  x402Support: false,
  website: "",
  twitter: "",
  github: "",
  discord: "",
  email: "",
};

const STEPS = [
  { id: 1, title: "Basic Info" },
  { id: 2, title: "Endpoints" },
  { id: 3, title: "Capabilities" },
  { id: 4, title: "Advanced" },
  { id: 5, title: "Storage" },
  { id: 6, title: "Review" },
];

const DEFAULT_CHAIN = sepolia;

const TRUST_OPTIONS = [
  { value: "reputation", label: "Reputation", desc: "On-chain feedback from clients" },
  { value: "crypto-economic", label: "Crypto-Economic", desc: "Stake-based validation" },
  { value: "tee-attestation", label: "TEE Attestation", desc: "Hardware-level verification" },
];

// ─── OASF Taxonomy ──────────────────────────────────────

const OASF_SKILLS: { category: string; items: string[] }[] = [
  { category: "NATURAL LANGUAGE PROCESSING", items: ["Natural Language Processing", "Summarization", "Question Answering", "Sentiment Analysis", "Translation", "Named Entity Recognition", "Storytelling"] },
  { category: "IMAGES / COMPUTER VISION", items: ["Computer Vision", "Image Generation", "Image Classification", "Object Detection"] },
  { category: "MULTI MODAL", items: ["Speech Recognition", "Text-to-Speech", "Text to Image", "Image to Text"] },
  { category: "ANALYTICAL SKILLS", items: ["Code Generation", "Code Optimization", "Math Problem Solving"] },
];

const OASF_DOMAINS: { category: string; items: string[] }[] = [
  { category: "TECHNOLOGY", items: ["Technology", "Software Engineering", "DevOps", "Data Science", "Blockchain", "DeFi", "Cybersecurity", "Cloud Computing"] },
  { category: "FINANCE AND BUSINESS", items: ["Finance & Business", "Finance", "Banking"] },
  { category: "HEALTHCARE", items: ["Healthcare", "Telemedicine", "Healthcare Informatics"] },
  { category: "EDUCATION", items: ["Education", "E-Learning"] },
  { category: "LEGAL", items: ["Legal", "Regulatory Compliance", "Contract Law"] },
];

// ─── Shared UI ───────────────────────────────────────────

function FormLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
      {children}
      {required && <span className="text-[var(--status-error-fg)]"> *</span>}
    </label>
  );
}

function SkillChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius-lg)] border px-3 py-1.5 text-sm transition ${
        selected
          ? "border-[var(--color-primary-500)] bg-[var(--color-primary-500)]/10 text-[var(--text-brand)]"
          : "border-[var(--border-secondary)] text-[var(--text-secondary)] hover:border-[var(--color-primary-400)] hover:bg-[var(--color-primary-500)]/5"
      }`}
    >
      {selected && (
        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {label}
    </button>
  );
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative h-6 w-11 rounded-full transition ${
        enabled ? "bg-[var(--color-primary-500)]" : "bg-[var(--border-primary)]"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
          enabled ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

// ─── Step Components ─────────────────────────────────────

function Step1({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const [imageError, setImageError] = useState(false);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(false);
    setForm({ ...form, image: e.target.value });
  }, [form, setForm]);

  return (
    <div className="space-y-5">
      <div>
        <FormLabel required>Agent Name</FormLabel>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="My AI Agent"
          maxLength={200}
        />
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
          A concise, memorable name shown in search results and profiles.
        </p>
      </div>
      <div>
        <FormLabel required>Description</FormLabel>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Describe what your agent does, who it's for, and what makes it unique..."
          rows={4}
          maxLength={500}
        />
        <p className={`mt-1 text-xs ${form.description.trim().length > 0 && form.description.trim().length < 50 ? "text-[var(--status-error-fg)]" : "text-[var(--text-tertiary)]"}`}>
          {form.description.length}/500 characters
          {form.description.trim().length > 0 && form.description.trim().length < 50 && ` (minimum 50 characters, ${50 - form.description.trim().length} more needed)`}
        </p>
      </div>
      <div>
        <FormLabel>Image URL (Optional)</FormLabel>
        <Input
          value={form.image}
          onChange={handleImageChange}
          placeholder="https://example.com/logo.png or ipfs://..."
        />
        {imageError && (
          <p className="mt-1 text-xs text-[var(--status-error-fg)]">
            Failed to load image. Please check the URL and try again.
          </p>
        )}
        {form.image && !imageError && (
          <img
            src={form.image}
            alt=""
            className="hidden"
            onError={() => setImageError(true)}
          />
        )}
      </div>
    </div>
  );
}

function Step2({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const updateEndpoint = (name: string, endpoint: string) => {
    const updated = form.services.map((s) =>
      s.name === name ? { ...s, endpoint } : s
    );
    setForm({ ...form, services: updated });
  };

  const mcpService = form.services.find((s) => s.name === "MCP");
  const a2aService = form.services.find((s) => s.name === "A2A");

  return (
    <div className="space-y-5">
      <div>
        <FormLabel>MCP Endpoint</FormLabel>
        <Input
          value={mcpService?.endpoint ?? ""}
          onChange={(e) => updateEndpoint("MCP", e.target.value)}
          placeholder="https://api.example.com/mcp"
        />
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
          Model Context Protocol endpoint for agent communication
        </p>
      </div>
      <div>
        <FormLabel>A2A Endpoint</FormLabel>
        <Input
          value={a2aService?.endpoint ?? ""}
          onChange={(e) => updateEndpoint("A2A", e.target.value)}
          placeholder="https://agent.example/.well-known/agent-card.json"
        />
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
          Agent-to-Agent protocol endpoint for inter-agent messaging
        </p>
      </div>
    </div>
  );
}

function Step3({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const [skillSearch, setSkillSearch] = useState("");
  const [domainSearch, setDomainSearch] = useState("");

  const toggleSkill = (skill: string) => {
    setForm({
      ...form,
      skills: form.skills.includes(skill)
        ? form.skills.filter((s) => s !== skill)
        : [...form.skills, skill],
    });
  };

  const toggleDomain = (domain: string) => {
    setForm({
      ...form,
      domains: form.domains.includes(domain)
        ? form.domains.filter((d) => d !== domain)
        : [...form.domains, domain],
    });
  };

  const addCustomSkill = () => {
    const skill = form.customSkillInput.trim();
    if (skill && !form.customSkills.includes(skill) && !form.skills.includes(skill)) {
      setForm({ ...form, customSkills: [...form.customSkills, skill], customSkillInput: "" });
    }
  };

  const removeCustomSkill = (skill: string) =>
    setForm({ ...form, customSkills: form.customSkills.filter((s) => s !== skill) });

  const addCustomDomain = () => {
    const domain = form.customDomainInput.trim();
    if (domain && !form.customDomains.includes(domain) && !form.domains.includes(domain)) {
      setForm({ ...form, customDomains: [...form.customDomains, domain], customDomainInput: "" });
    }
  };

  const removeCustomDomain = (domain: string) =>
    setForm({ ...form, customDomains: form.customDomains.filter((d) => d !== domain) });

  const filteredSkills = OASF_SKILLS.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) =>
      item.toLowerCase().includes(skillSearch.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  const filteredDomains = OASF_DOMAINS.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) =>
      item.toLowerCase().includes(domainSearch.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  return (
    <div className="space-y-8">
      {/* Agent Skills (OASF) */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Agent Skills (OASF)
          </h3>
          {(form.skills.length + form.customSkills.length) > 0 && (
            <span className="rounded-full bg-[var(--color-primary-500)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--text-brand)]">
              {form.skills.length + form.customSkills.length} selected
            </span>
          )}
        </div>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          Select the capabilities your agent provides. Skills are mapped to OASF v0.8.0 taxonomy.
        </p>

        <div className="mb-4">
          <Input
            value={skillSearch}
            onChange={(e) => setSkillSearch(e.target.value)}
            placeholder="Search skills..."
          />
        </div>

        <div className="space-y-4">
          {filteredSkills.length > 0 ? (
            filteredSkills.map((cat) => (
              <div key={cat.category}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                  {cat.category}
                </p>
                <div className="flex flex-wrap gap-2">
                  {cat.items.map((skill) => (
                    <SkillChip
                      key={skill}
                      label={skill}
                      selected={form.skills.includes(skill)}
                      onClick={() => toggleSkill(skill)}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="py-3 text-center text-sm text-[var(--text-tertiary)]">
              No skills matching &ldquo;{skillSearch}&rdquo;
            </p>
          )}
        </div>

        {/* Custom Skills */}
        <div className="mt-5 border-t border-[var(--border-primary)] pt-4">
          <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">Custom Skills</p>
          <div className="flex gap-2">
            <Input
              value={form.customSkillInput}
              onChange={(e) => setForm({ ...form, customSkillInput: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSkill())}
              placeholder="Add custom skill..."
            />
            <Button variant="secondary" onClick={addCustomSkill} size="sm">Add</Button>
          </div>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            Saved as <span className="font-mono">custom/</span> prefix in OASF format
          </p>
          {form.customSkills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {form.customSkills.map((skill) => (
                <span
                  key={skill}
                  className="flex items-center gap-1 rounded-[var(--radius-lg)] border border-[var(--color-primary-500)]/30 bg-[var(--color-primary-500)]/10 px-3 py-1.5 text-sm text-[var(--text-brand)]"
                >
                  custom/{skill}
                  <button onClick={() => removeCustomSkill(skill)} className="ml-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Application Domains (OASF) */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Application Domains (OASF)
          </h3>
          {(form.domains.length + form.customDomains.length) > 0 && (
            <span className="rounded-full bg-[var(--color-primary-500)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--text-brand)]">
              {form.domains.length + form.customDomains.length} selected
            </span>
          )}
        </div>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          Choose the industries or areas where your agent operates. Domains are mapped to OASF v0.8.0 taxonomy.
        </p>

        <div className="mb-4">
          <Input
            value={domainSearch}
            onChange={(e) => setDomainSearch(e.target.value)}
            placeholder="Search domains..."
          />
        </div>

        <div className="space-y-4">
          {filteredDomains.length > 0 ? (
            filteredDomains.map((cat) => (
              <div key={cat.category}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                  {cat.category}
                </p>
                <div className="flex flex-wrap gap-2">
                  {cat.items.map((domain) => (
                    <SkillChip
                      key={domain}
                      label={domain}
                      selected={form.domains.includes(domain)}
                      onClick={() => toggleDomain(domain)}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="py-3 text-center text-sm text-[var(--text-tertiary)]">
              No domains matching &ldquo;{domainSearch}&rdquo;
            </p>
          )}
        </div>

        {/* Custom Domains */}
        <div className="mt-5 border-t border-[var(--border-primary)] pt-4">
          <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">Custom Domains</p>
          <div className="flex gap-2">
            <Input
              value={form.customDomainInput}
              onChange={(e) => setForm({ ...form, customDomainInput: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomDomain())}
              placeholder="Add custom domain..."
            />
            <Button variant="secondary" onClick={addCustomDomain} size="sm">Add</Button>
          </div>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            Saved as <span className="font-mono">custom/</span> prefix in OASF format
          </p>
          {form.customDomains.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {form.customDomains.map((domain) => (
                <span
                  key={domain}
                  className="flex items-center gap-1 rounded-[var(--radius-lg)] border border-[var(--color-primary-500)]/30 bg-[var(--color-primary-500)]/10 px-3 py-1.5 text-sm text-[var(--text-brand)]"
                >
                  custom/{domain}
                  <button onClick={() => removeCustomDomain(domain)} className="ml-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Step4({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const toggleTrust = (value: string) => {
    setForm({
      ...form,
      supportedTrust: form.supportedTrust.includes(value)
        ? form.supportedTrust.filter((t) => t !== value)
        : [...form.supportedTrust, value],
    });
  };

  const addTag = () => {
    const tag = form.tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      setForm({ ...form, tags: [...form.tags, tag], tagInput: "" });
    }
  };

  const removeTag = (tag: string) =>
    setForm({ ...form, tags: form.tags.filter((t) => t !== tag) });

  return (
    <div className="space-y-6">
      {/* Trust Models */}
      <div>
        <FormLabel>Supported Trust Models</FormLabel>
        <p className="mb-3 text-xs text-[var(--text-tertiary)]">
          Select the trust mechanisms your agent supports.
        </p>
        <div className="space-y-2">
          {TRUST_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleTrust(opt.value)}
              className={`flex w-full items-center gap-3 rounded-[var(--radius-lg)] border p-3 text-left transition ${
                form.supportedTrust.includes(opt.value)
                  ? "border-[var(--color-primary-500)] bg-[var(--color-primary-500)]/10"
                  : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]"
              }`}
            >
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  form.supportedTrust.includes(opt.value)
                    ? "border-[var(--color-primary-500)] bg-[var(--color-primary-500)]"
                    : "border-[var(--border-secondary)]"
                }`}
              >
                {form.supportedTrust.includes(opt.value) && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{opt.label}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <FormLabel>Search Tags</FormLabel>
        <p className="mb-2 text-xs text-[var(--text-tertiary)]">
          Add tags to help others discover your agent (e.g., defi, analytics, trading).
        </p>
        <div className="flex gap-2">
          <Input
            value={form.tagInput}
            onChange={(e) => setForm({ ...form, tagInput: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            placeholder="Add a tag..."
          />
          <Button variant="secondary" onClick={addTag} size="sm">Add</Button>
        </div>
        {form.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {form.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full bg-[var(--surface-secondary)] px-3 py-1 text-xs text-[var(--text-secondary)]"
              >
                {tag}
                <button onClick={() => removeTag(tag)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Status & Payment */}
      <div className="space-y-3">
        <FormLabel>Agent Settings</FormLabel>
        <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--border-primary)] p-3">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Active</p>
            <p className="text-xs text-[var(--text-tertiary)]">Mark as production-ready</p>
          </div>
          <Toggle enabled={form.active} onToggle={() => setForm({ ...form, active: !form.active })} />
        </div>
        <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--border-primary)] p-3">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">x402 Payment Support</p>
            <p className="text-xs text-[var(--text-tertiary)]">Accept HTTP 402 micropayments</p>
          </div>
          <Toggle enabled={form.x402Support} onToggle={() => setForm({ ...form, x402Support: !form.x402Support })} />
        </div>
      </div>

      {/* Social Links */}
      <div className="space-y-3">
        <FormLabel>Social & Contact</FormLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-[var(--text-tertiary)]">Website</label>
            <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://myagent.com" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-tertiary)]">Twitter / X</label>
            <Input value={form.twitter} onChange={(e) => setForm({ ...form, twitter: e.target.value })} placeholder="@myagent" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-tertiary)]">GitHub</label>
            <Input value={form.github} onChange={(e) => setForm({ ...form, github: e.target.value })} placeholder="https://github.com/..." />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-tertiary)]">Discord</label>
            <Input value={form.discord} onChange={(e) => setForm({ ...form, discord: e.target.value })} placeholder="https://discord.gg/..." />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--text-tertiary)]">Contact Email</label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="agent@example.com" />
        </div>
      </div>

    </div>
  );
}


// ─── Step 5: Storage ─────────────────────────────────────

const STORAGE_OPTIONS: {
  value: FormData["storageMethod"];
  label: string;
  desc: string;
  pros: string;
  cons: string;
}[] = [
  {
    value: "ipfs",
    label: "IPFS (via Pinata)",
    desc: "Metadata is automatically uploaded to IPFS. Only the content-addressed CID is stored on-chain.",
    pros: "Low gas cost, content-addressed (immutable), decentralized",
    cons: "Depends on IPFS pinning service for availability",
  },
  {
    value: "onchain",
    label: "On-Chain (Data URI)",
    desc: "Metadata is fully encoded and stored on-chain as a base64 data URI.",
    pros: "Fully decentralized, always available, no external dependency",
    cons: "Higher gas cost proportional to metadata size",
  },
];

function Step5({
  form,
  setForm,
  dataUri,
  estimatedGas,
  metadata,
}: {
  form: FormData;
  setForm: (f: FormData) => void;
  dataUri: string;
  estimatedGas: number;
  metadata: ReturnType<typeof buildAgentMetadata>;
}) {
  const onchainSize = new TextEncoder().encode(dataUri).length;
  const ipfsUriExample = "ipfs://QmXyz...48chars";
  const ipfsGas = (() => {
    const bytes = new TextEncoder().encode(ipfsUriExample);
    let gas = 0;
    for (const b of bytes) gas += b === 0 ? 4 : 16;
    return gas + 21_000;
  })();

  return (
    <div className="space-y-5">
      <p className="text-sm text-[var(--text-secondary)]">
        Choose how your agent metadata will be stored. The agentURI is recorded on-chain per ERC-8004.
      </p>

      <div className="space-y-3">
        {STORAGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setForm({ ...form, storageMethod: opt.value })}
            className={`flex w-full items-start gap-3 rounded-[var(--radius-lg)] border p-4 text-left transition ${
              form.storageMethod === opt.value
                ? "border-[var(--color-primary-500)] bg-[var(--color-primary-500)]/10"
                : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]"
            }`}
          >
            <div
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                form.storageMethod === opt.value
                  ? "border-[var(--color-primary-500)]"
                  : "border-[var(--border-secondary)]"
              }`}
            >
              {form.storageMethod === opt.value && (
                <div className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary-500)]" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)]">{opt.label}</p>
              <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{opt.desc}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span className="text-[var(--status-success-fg)]">+ {opt.pros}</span>
                <span className="text-[var(--status-error-fg)]/60">- {opt.cons}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* IPFS Info */}
      {form.storageMethod === "ipfs" && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-primary-500)]/30 bg-[var(--color-primary-500)]/5 p-4 text-sm text-[var(--text-secondary)]">
          <p className="mb-1 font-medium text-[var(--text-brand)]">Automatic IPFS Upload</p>
          <p className="text-xs">
            When you click &quot;Register Agent&quot;, your metadata will be automatically uploaded to IPFS via Pinata.
            The returned CID will be used as the on-chain agentURI (<span className="font-mono text-[var(--text-primary)]">ipfs://&#123;CID&#125;</span>).
          </p>
        </div>
      )}

      {/* Storage Details */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-primary)] p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">Storage Details</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--text-tertiary)]">Network</dt>
            <dd className="text-[var(--text-primary)]">{DEFAULT_CHAIN.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--text-tertiary)]">Storage Method</dt>
            <dd className="text-[var(--text-primary)]">
              {STORAGE_OPTIONS.find((o) => o.value === form.storageMethod)?.label}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--text-tertiary)]">On-Chain Data Size</dt>
            <dd className="font-mono text-[var(--text-primary)]">
              {form.storageMethod === "onchain"
                ? `${onchainSize} bytes`
                : `~${new TextEncoder().encode("ipfs://QmXyz...48chars").length} bytes`}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--text-tertiary)]">Estimated Gas</dt>
            <dd className="font-mono text-[var(--text-primary)]">
              ~{form.storageMethod === "onchain"
                ? estimatedGas.toLocaleString()
                : ipfsGas.toLocaleString()}
            </dd>
          </div>
          {form.storageMethod === "onchain" && (
            <div className="flex justify-between border-t border-[var(--border-primary)] pt-2">
              <dt className="text-[var(--text-tertiary)]">Gas Savings with IPFS</dt>
              <dd className="font-mono text-[var(--status-success-fg)]">
                ~{(estimatedGas - ipfsGas).toLocaleString()} ({Math.round(((estimatedGas - ipfsGas) / estimatedGas) * 100)}%)
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Raw Data Preview */}
      <details className="rounded-[var(--radius-lg)] border border-[var(--border-primary)]">
        <summary className="cursor-pointer px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          {form.storageMethod === "onchain" ? "View Raw Data URI" : "View Metadata JSON"}
        </summary>
        <pre className="max-h-48 overflow-auto border-t border-[var(--border-primary)] p-4 text-xs text-[var(--text-secondary)] break-all whitespace-pre-wrap">
          {form.storageMethod === "onchain" ? dataUri : JSON.stringify(metadata, null, 2)}
        </pre>
      </details>
    </div>
  );
}

// ─── Step 6: Review ──────────────────────────────────────

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-primary)] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">{title}</h3>
      {children}
    </div>
  );
}

function Step6({ form, metadata, walletAddress }: {
  form: FormData;
  metadata: ReturnType<typeof buildAgentMetadata>;
  walletAddress?: string;
}) {
  const filledServices = form.services.filter((s) => s.endpoint);
  const previewUrl = form.image || (walletAddress ? `https://api.dicebear.com/9.x/bottts/svg?seed=${walletAddress.toLowerCase()}` : undefined);
  const allSkills = [...form.skills, ...form.customSkills.map((s) => `custom/${s}`)];
  const allDomains = [...form.domains, ...form.customDomains.map((d) => `custom/${d}`)];

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-secondary)]">
        Review all information before submitting. The metadata will be recorded on-chain.
      </p>

      <ReviewSection title="Basic Info">
        <div className="flex items-start gap-4">
          {previewUrl ? (
            <img src={previewUrl} alt="" className="h-14 w-14 rounded-[var(--radius-xl)] object-cover bg-[var(--surface-secondary)]" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-xl)] bg-[var(--surface-secondary)] text-xl font-bold text-[var(--text-tertiary)]">
              {(form.name || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-lg font-semibold text-[var(--text-primary)]">{form.name || "Unnamed Agent"}</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{form.description || "No description"}</p>
          </div>
        </div>
      </ReviewSection>

      <ReviewSection title="Endpoints">
        {filledServices.length > 0 ? (
          <div className="space-y-2">
            {filledServices.map((svc, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="rounded-full bg-[var(--color-primary-500)]/20 px-2.5 py-0.5 text-xs font-medium text-[var(--text-brand)]">{svc.name}</span>
                <span className="font-mono text-xs text-[var(--text-secondary)]">{svc.endpoint}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-tertiary)]">No endpoints configured</p>
        )}
      </ReviewSection>

      <ReviewSection title="Capabilities (OASF)">
        <div className="space-y-3">
          {allSkills.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-[var(--text-tertiary)]">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {allSkills.map((s) => (
                  <span key={s} className="rounded-full bg-[var(--color-primary-500)]/20 px-2.5 py-0.5 text-xs text-[var(--text-brand)]">{s}</span>
                ))}
              </div>
            </div>
          )}
          {allDomains.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-[var(--text-tertiary)]">Domains</p>
              <div className="flex flex-wrap gap-1.5">
                {allDomains.map((d) => (
                  <span key={d} className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs text-purple-400">{d}</span>
                ))}
              </div>
            </div>
          )}
          {allSkills.length === 0 && allDomains.length === 0 && (
            <span className="text-sm text-[var(--text-tertiary)]">No skills or domains selected</span>
          )}
        </div>
      </ReviewSection>

      <ReviewSection title="Trust & Tags">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {form.supportedTrust.length > 0 ? (
              form.supportedTrust.map((t) => (
                <span key={t} className="rounded-full bg-[var(--status-success-bg)] px-2.5 py-0.5 text-xs text-[var(--status-success-fg)]">{t}</span>
              ))
            ) : (
              <span className="text-sm text-[var(--text-tertiary)]">No trust models selected</span>
            )}
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {form.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-[var(--surface-secondary)] px-2.5 py-0.5 text-xs text-[var(--text-secondary)]">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </ReviewSection>

      <ReviewSection title="Advanced">
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--text-tertiary)]">Status</dt>
            <dd>{form.active ? <span className="text-[var(--status-success-fg)]">Active</span> : <span className="text-[var(--text-tertiary)]">Inactive</span>}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--text-tertiary)]">x402 Payment</dt>
            <dd className="text-[var(--text-primary)]">{form.x402Support ? "Enabled" : "Disabled"}</dd>
          </div>
          {form.website && <div className="flex justify-between"><dt className="text-[var(--text-tertiary)]">Website</dt><dd className="text-xs text-[var(--text-primary)]">{form.website}</dd></div>}
          {form.twitter && <div className="flex justify-between"><dt className="text-[var(--text-tertiary)]">Twitter</dt><dd className="text-xs text-[var(--text-primary)]">{form.twitter}</dd></div>}
          {form.github && <div className="flex justify-between"><dt className="text-[var(--text-tertiary)]">GitHub</dt><dd className="text-xs text-[var(--text-primary)]">{form.github}</dd></div>}
          {form.email && <div className="flex justify-between"><dt className="text-[var(--text-tertiary)]">Email</dt><dd className="text-xs text-[var(--text-primary)]">{form.email}</dd></div>}
        </dl>
      </ReviewSection>

      <details className="rounded-[var(--radius-lg)] border border-[var(--border-primary)]">
        <summary className="cursor-pointer px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          View Raw Metadata JSON
        </summary>
        <pre className="max-h-48 overflow-auto border-t border-[var(--border-primary)] p-4 text-xs text-[var(--text-secondary)]">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      </details>
    </div>
  );
}

// ─── Main Wizard ─────────────────────────────────────────

export function AgentRegisterForm() {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync, isPending } = useWriteContract();

  // Delegate-only gating
  const { data: isDelegate, isLoading: isDelegateLoading } = useIsRegisteredDelegate(address);
  const { hasAgent, agentId, isLoading: isHasAgentLoading } = useHasAgent(address);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({ ...INITIAL_FORM, storageMethod: "ipfs" });
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  const isWrongChain = chainId !== DEFAULT_CHAIN.id;

  const { data: balanceData } = useBalance({
    address,
    chainId: DEFAULT_CHAIN.id,
    query: { enabled: !!address },
  });

  const hasBalance = balanceData ? balanceData.value > 0n : true;

  // Build metadata from form
  const allSkills = [
    ...form.skills,
    ...form.customSkills.map((s) => `custom/${s}`),
  ];
  const allDomains = [
    ...form.domains,
    ...form.customDomains.map((d) => `custom/${d}`),
  ];

  const metadata = buildAgentMetadata({
    name: form.name || "Unnamed Agent",
    description: form.description || "No description",
    image: form.image || (address ? `https://api.dicebear.com/9.x/bottts/svg?seed=${address.toLowerCase()}` : undefined),
    services: form.services
      .filter((s) => s.endpoint)
      .map((s) => ({
        name: s.name,
        endpoint: s.endpoint,
        version: s.version || undefined,
        skills: allSkills.length > 0 ? allSkills : undefined,
        domains: allDomains.length > 0 ? allDomains : undefined,
      })),
    skills: allSkills.length > 0 ? allSkills : undefined,
    domains: allDomains.length > 0 ? allDomains : undefined,
    active: form.active,
    supportedTrust: form.supportedTrust,
    tags: form.tags,
    x402Support: form.x402Support,
    socials: {
      website: form.website,
      twitter: form.twitter,
      github: form.github,
      discord: form.discord,
      email: form.email,
    },
  });
  const dataUri = buildDataURI(metadata);
  const estimatedGas = estimateCalldataGas(dataUri);

  const canProceed = (s: number) => {
    if (s === 1) return form.name.trim().length > 0 && form.description.trim().length >= 50;
    return true;
  };

  const handleRegister = async () => {
    setError(null);
    setTxHash(undefined);

    // Pre-flight: re-verify delegate eligibility
    if (!isDelegate) {
      setError("Only registered delegates can create agents.");
      return;
    }
    if (hasAgent) {
      setError("You already have a registered agent. Each delegate can only register one.");
      return;
    }

    try {
      let agentUri = dataUri;

      // Upload to IPFS if selected
      if (form.storageMethod === "ipfs") {
        setIsUploading(true);
        try {
          const res = await fetch("/api/pinata", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(metadata),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Failed to upload to IPFS");
          }

          const { cid } = await res.json();
          agentUri = `ipfs://${cid}`;
        } catch (err) {
          setError(err instanceof Error ? err.message : "IPFS upload failed");
          return;
        } finally {
          setIsUploading(false);
        }
      }

      const registryAddress = getRegistryAddress(DEFAULT_CHAIN.id);

      // Use inline ABI to avoid ambiguity with register() overloads
      const hash = await writeContractAsync({
        address: registryAddress,
        abi: [
          {
            type: "function" as const,
            name: "register" as const,
            inputs: [{ name: "agentURI", type: "string" }] as const,
            outputs: [{ name: "agentId", type: "uint256" }] as const,
            stateMutability: "nonpayable" as const,
          },
        ],
        functionName: "register",
        args: [agentUri],
        chainId: DEFAULT_CHAIN.id,
      });

      setTxHash(hash);

      const { createPublicClient, http } = await import("viem");
      const client = createPublicClient({ chain: DEFAULT_CHAIN, transport: http() });
      const receipt = await client.waitForTransactionReceipt({ hash });

      let newAgentId: string | null = null;
      let ownerAddr: string = address ?? "";

      for (const log of receipt.logs) {
        try {
          const event = decodeEventLog({
            abi: identityRegistryAbi,
            data: log.data,
            topics: log.topics,
          });
          if (event.eventName === "Registered") {
            const args = event.args as { agentId: bigint; owner: string };
            newAgentId = args.agentId.toString();
            ownerAddr = args.owner;
            break;
          }
          if (!newAgentId && event.eventName === "Transfer") {
            const args = event.args as { from: string; to: string; tokenId: bigint };
            newAgentId = args.tokenId.toString();
            ownerAddr = args.to;
          }
        } catch {
          // Not a matching event
        }
      }

      if (newAgentId) {
        // Save to Supabase (shared with tokamak-agent-scan)
        await fetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: newAgentId,
            owner: ownerAddr,
            chainId: DEFAULT_CHAIN.id,
          }),
        }).catch(() => {});

        router.push(`/agents/${newAgentId}`);
        return;
      }

      // Fallback: event parsing failed but tx succeeded
      router.push("/agents");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      if (message.includes("User rejected") || message.includes("denied")) {
        setError("Transaction was rejected.");
      } else {
        setError(message.slice(0, 200));
      }
    }
  };

  // Not connected
  if (!isConnected) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-lg text-[var(--text-secondary)]">Connect your wallet to register an agent.</p>
        </CardContent>
      </Card>
    );
  }

  // Loading delegate status
  if (isDelegateLoading || isHasAgentLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--border-primary)] border-t-[var(--color-primary-500)]" />
          <p className="mt-3 text-sm text-[var(--text-secondary)]">Checking eligibility...</p>
        </CardContent>
      </Card>
    );
  }

  // Not a delegate
  if (!isDelegate) {
    return (
      <Card>
        <CardContent className="p-12 text-center space-y-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--status-warning-bg)]">
            <svg className="h-7 w-7 text-[var(--status-warning-fg)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-[var(--text-primary)]">Delegates Only</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Only registered delegates can create agents. Register as a delegate first to get started.
            </p>
          </div>
          <Button asChild>
            <a href="/delegates">Go to Delegates</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Already has an agent
  if (hasAgent) {
    return (
      <Card>
        <CardContent className="p-12 text-center space-y-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--status-info-bg)]">
            <svg className="h-7 w-7 text-[var(--status-info-fg)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-[var(--text-primary)]">Agent Already Registered</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Each delegate can only register one agent. You already have an agent registered.
            </p>
          </div>
          <Button asChild>
            <a href={agentId != null ? `/agents/${agentId}` : "/agents"}>View My Agent</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Wizard
  return (
    <div>
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-start">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex flex-1 items-start last:flex-none">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => s.id !== step && setStep(s.id)}
                  className={`relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-sm font-semibold transition-all ${
                    s.id === step
                      ? "bg-[var(--color-primary-500)] text-white shadow-lg shadow-[var(--color-primary-500)]/30"
                      : s.id < step
                        ? "bg-[var(--color-primary-500)] text-white hover:bg-[var(--color-primary-600)]"
                        : "border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-tertiary)] hover:border-[var(--border-secondary)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  {s.id < step ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    s.id
                  )}
                </button>
                <p
                  className={`mt-2 text-xs leading-tight text-center whitespace-nowrap ${
                    s.id === step
                      ? "font-medium text-[var(--text-primary)]"
                      : s.id < step
                        ? "text-[var(--text-brand)]"
                        : "text-[var(--text-tertiary)]"
                  }`}
                >
                  {s.title}
                </p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="relative mx-1 mt-5 h-0.5 flex-1">
                  <div className="absolute inset-0 rounded-full bg-[var(--border-primary)]" />
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${
                      s.id < step ? "w-full bg-[var(--color-primary-500)]" : "w-0"
                    }`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6 sm:p-8">
          <h2 className="mb-6 text-lg font-semibold text-[var(--text-primary)]">
            Step {step}: {STEPS[step - 1].title}
          </h2>

          {step === 1 && <Step1 form={form} setForm={setForm} />}
          {step === 2 && <Step2 form={form} setForm={setForm} />}
          {step === 3 && <Step3 form={form} setForm={setForm} />}
          {step === 4 && <Step4 form={form} setForm={setForm} />}
          {step === 5 && <Step5 form={form} setForm={setForm} dataUri={dataUri} estimatedGas={estimatedGas} metadata={metadata} />}
          {step === 6 && <Step6 form={form} metadata={metadata} walletAddress={address} />}
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-4 text-sm text-[var(--status-error-fg)]">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
          className={step === 1 ? "invisible" : ""}
        >
          Back
        </Button>

        {step < 6 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed(step)}
          >
            Next
          </Button>
        ) : isWrongChain ? (
          <Button
            variant="secondary"
            onClick={() => switchChain({ chainId: DEFAULT_CHAIN.id })}
          >
            Switch to {DEFAULT_CHAIN.name}
          </Button>
        ) : !hasBalance ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--status-error-fg)]">Insufficient balance</span>
            <Button disabled>Register Agent</Button>
          </div>
        ) : (
          <Button
            onClick={handleRegister}
            disabled={isUploading || isPending || isConfirming}
            loading={isUploading || isPending || isConfirming}
          >
            {isUploading ? "Uploading to IPFS..." : isPending ? "Confirm in Wallet..." : isConfirming ? "Confirming..." : "Register Agent"}
          </Button>
        )}
      </div>

      {/* Insufficient Balance Warning */}
      {step === 6 && !isWrongChain && !hasBalance && (
        <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-4">
          <p className="text-sm font-medium text-[var(--status-warning-fg)]">
            No {DEFAULT_CHAIN.nativeCurrency.symbol} balance on {DEFAULT_CHAIN.name}
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            You need {DEFAULT_CHAIN.nativeCurrency.symbol} to pay for gas fees.
            Get testnet {DEFAULT_CHAIN.nativeCurrency.symbol} from a{" "}
            <a
              href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-brand)] underline hover:text-[var(--color-primary-400)]"
            >
              faucet
            </a>.
          </p>
          {balanceData && (
            <p className="mt-2 text-xs text-[var(--text-tertiary)]">
              Current balance: <span className="font-mono">{formatEther(balanceData.value)} {DEFAULT_CHAIN.nativeCurrency.symbol}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
