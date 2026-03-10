import { NextRequest } from "next/server";

const AGENT_URL = "https://tokamak-dao-agent.fly.dev/api/chat";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { messages, screenContext } = body;

  // Build system message with screen context
  let systemMessage = screenContext
    ? `You are a helpful companion for the Tokamak DAO governance platform. The user is currently viewing: "${screenContext.pageTitle}" (${screenContext.route}). ${screenContext.description}. Help them understand and interact with the DAO.`
    : "You are a helpful companion for the Tokamak DAO governance platform. Help users understand and interact with the DAO.";

  // Enrich with proposal data if available
  if (screenContext?.proposalData) {
    const pd = screenContext.proposalData;
    systemMessage += `\n\n## Current Proposal Data`;
    systemMessage += `\n- **ID**: ${pd.id}`;
    systemMessage += `\n- **Title**: ${pd.title}`;
    systemMessage += `\n- **Status**: ${pd.status}`;
    systemMessage += `\n- **Proposer**: ${pd.proposer}`;
    systemMessage += `\n- **Votes**: For=${pd.forVotes}, Against=${pd.againstVotes}, Abstain=${pd.abstainVotes} (${pd.totalVoters} voters)`;
    if (pd.burnRate !== undefined) {
      systemMessage += `\n- **Vote Burn Rate**: ${(pd.burnRate / 100).toFixed(1)}%`;
    }
    if (pd.targets?.length) {
      systemMessage += `\n\n### On-chain Actions (${pd.targets.length} call(s)):`;
      for (let i = 0; i < pd.targets.length; i++) {
        systemMessage += `\n**Action ${i + 1}**:`;
        systemMessage += `\n  - Target: ${pd.targets[i]}`;
        systemMessage += `\n  - Value: ${pd.values?.[i] ?? "0"} wei`;
        systemMessage += `\n  - Calldata: ${pd.calldatas?.[i]}`;
      }
      systemMessage += `\n\nDecode the calldatas to explain what each action does. Use known Tokamak contract ABIs (DAOGovernor, vTON, SeigManager, DelegateRegistry, etc.) to identify function names and parameters.`;
    }
    systemMessage += `\n\n### Full Description:\n${pd.description}`;
  }

  const forwardBody: Record<string, unknown> = {
    messages: [{ role: "system", content: systemMessage }, ...messages],
  };
  if (screenContext?.mode) {
    forwardBody.mode = screenContext.mode;
  }

  const response = await fetch(AGENT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(forwardBody),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    return new Response(
      JSON.stringify({ error: `Agent responded with ${response.status}` }),
      { status: response.status, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!response.body) {
    return new Response(
      JSON.stringify({ error: "No response body from agent" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // SSE passthrough — no buffering
  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
