"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { AgentList } from "@/components/agents/AgentList";
import { useHasAgent } from "@/hooks/contracts/useAgentRegistry";
import { useAgentSetupStatus } from "@/hooks/useAgentSetupStatus";
import { CreateAgentWizard } from "@/components/agents/CreateAgentWizard";

function CreateAgentButton() {
  const { isConnected, address } = useAccount();
  const { hasAgent, agentId, isLoading } = useHasAgent(address);
  const setupStatus = useAgentSetupStatus(address);
  const [wizardOpen, setWizardOpen] = useState(false);
  const router = useRouter();

  if (!isConnected) {
    return (
      <Button disabled>
        Connect Wallet
      </Button>
    );
  }

  if (isLoading) {
    return (
      <Button disabled>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </Button>
    );
  }

  // No agent → show Create button immediately (don't wait for setupStatus)
  if (!hasAgent) {
    return (
      <>
        <Button onClick={() => setWizardOpen(true)}>
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create My Agent
        </Button>
        <CreateAgentWizard
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          onComplete={(id) => {
            setWizardOpen(false);
            router.push(`/agents/${id}`);
          }}
        />
      </>
    );
  }

  // Agent exists — need setupStatus to determine complete vs incomplete
  if (setupStatus.isLoading) {
    return (
      <Button disabled>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </Button>
    );
  }

  // Agent exists and setup complete → link to detail page
  if (setupStatus.firstIncompleteStep === "complete") {
    const agentHref = agentId != null ? `/agents/${agentId}` : "/agents";
    return (
      <Button variant="secondary" asChild>
        <Link href={agentHref}>My Agent</Link>
      </Button>
    );
  }

  // Agent exists but setup incomplete → "Continue Setup"
  return (
    <>
      <Button onClick={() => setWizardOpen(true)}>
        Continue Setup
      </Button>
      <CreateAgentWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={(id) => {
          setWizardOpen(false);
          router.push(`/agents/${id}`);
        }}
      />
    </>
  );
}

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 py-4">
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-2">
            Agents
          </h1>
          <p className="text-base text-[var(--text-secondary)] max-w-lg">
            Create an AI agent that votes on your behalf via Telegram
          </p>
        </div>
        <CreateAgentButton />
      </section>

      {/* Agent List */}
      <section>
        <AgentList />
      </section>
    </div>
  );
}
