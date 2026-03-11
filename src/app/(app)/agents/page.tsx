"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { AgentList } from "@/components/agents/AgentList";
import { useIsRegisteredDelegate } from "@/hooks/contracts/useDelegateRegistry";
import { useHasAgent } from "@/hooks/contracts/useAgentRegistry";

function RegisterAgentButton() {
  const { isConnected, address } = useAccount();
  const { data: isDelegate, isLoading: isDelegateLoading } = useIsRegisteredDelegate(address);
  const { hasAgent, agentId, isLoading: isHasAgentLoading } = useHasAgent(address);

  // Not connected — show button, form will prompt wallet connection
  if (!isConnected) {
    return (
      <Button asChild>
        <Link href="/agents/register">
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Register Agent
        </Link>
      </Button>
    );
  }

  // Loading
  if (isDelegateLoading || isHasAgentLoading) {
    return (
      <Button disabled>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </Button>
    );
  }

  // Already has agent
  if (hasAgent) {
    const agentHref = agentId != null ? `/agents/${agentId}` : "/agents";
    return (
      <Button variant="secondary" asChild>
        <Link href={agentHref}>My Agent</Link>
      </Button>
    );
  }

  // Not a delegate
  if (!isDelegate) {
    return (
      <Button variant="secondary" disabled title="Only delegates can register agents">
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Register Agent
      </Button>
    );
  }

  // Delegate without agent — can register
  return (
    <Button asChild>
      <Link href="/agents/register">
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Register Agent
      </Link>
    </Button>
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
            Register AI agents that vote on your behalf (ERC-8004)
          </p>
        </div>
        <RegisterAgentButton />
      </section>

      {/* Agent List */}
      <section>
        <AgentList />
      </section>
    </div>
  );
}
