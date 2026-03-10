import { NextRequest } from "next/server";

const AGENT_URL = "https://tokamak-dao-agent.fly.dev/api/chat";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { messages, screenContext } = body;

  const mode = screenContext?.mode as string | undefined;

  // For proposal-building modes (forum_proposal, make_proposal), the agent backend
  // has its own comprehensive system prompt. Don't inject a competing one — only pass
  // contextual data (e.g. current proposal being viewed) as a user-context message.
  const isAgentMode = mode === "forum_proposal" || mode === "make_proposal";

  // Build context messages to prepend
  const contextMessages: { role: string; content: string }[] = [];

  if (isAgentMode) {
    // For make_proposal mode, instruct the agent to output agenda-draft format
    // so the frontend can extract title and description for form auto-fill.
    if (mode === "make_proposal") {
      contextMessages.push({
        role: "system",
        content: [
          "[Output Format] When outputting the final proposal, use the `agenda-draft` code block format instead of `proposal-data`.",
          "The `agenda-draft` format includes a human-readable title and a detailed RFC-style description that will auto-fill the proposal form.",
          "",
          "The `content` field MUST follow this RFC template with these exact section headings:",
          "",
          "## Abstract",
          "1-2 sentence summary of what the proposal does.",
          "",
          "## Motivation",
          "Why this change is needed. What problem does it solve? What is the current state and why is it insufficient?",
          "",
          "## Specification",
          "Exact technical details: target contract name and address, function being called, parameter names, current on-chain values, and new values being set. Include unit conversions (e.g., RAY to percentage).",
          "",
          "## Rationale",
          "Why this specific value/approach was chosen. What alternatives were considered?",
          "",
          "## Security Considerations",
          "Potential risks, impact on existing stakers/participants, and any mitigations.",
          "",
          "## Expected Outcomes",
          "Measurable results after execution (e.g., 'DAO seigniorage rate changes from 50% to 40%').",
          "",
          "Example output:",
          "```agenda-draft",
          '{',
          '  "title": "Change DAO Seigniorage Rate to 40%",',
          '  "content": "## Abstract\\nThis proposal changes the DAO seigniorage rate from 50% to 40% via SeigManager.\\n\\n## Motivation\\n...\\n\\n## Specification\\n...\\n\\n## Rationale\\n...\\n\\n## Security Considerations\\n...\\n\\n## Expected Outcomes\\n...",',
          '  "calldata": {',
          '    "description": "Set DAO seigniorage rate to 40%",',
          '    "targets": ["0x..."],',
          '    "functionBytecodes": ["0x..."],',
          '    "atomicExecute": true,',
          '    "decodedCalls": [...]',
          '  }',
          '}',
          "```",
          "",
          "Write the content thoroughly — each section should be substantive, not just one sentence.",
        ].join("\n"),
      });
    }

    // Only pass proposal context data if available (no system-level instructions)
    if (screenContext?.proposalData) {
      const pd = screenContext.proposalData;
      let contextMsg = `[Context] The user is viewing proposal "${pd.title}" (ID: ${pd.id}, Status: ${pd.status}).`;
      contextMsg += ` Votes: For=${pd.forVotes}, Against=${pd.againstVotes}, Abstain=${pd.abstainVotes} (${pd.totalVoters} voters).`;
      if (pd.targets?.length) {
        contextMsg += `\n\nOn-chain Actions (${pd.targets.length} call(s)):`;
        for (let i = 0; i < pd.targets.length; i++) {
          contextMsg += `\nAction ${i + 1}: Target=${pd.targets[i]}, Calldata=${pd.calldatas?.[i]}`;
        }
      }
      contextMsg += `\n\nDescription:\n${pd.description}`;
      contextMessages.push({ role: "system", content: contextMsg });
    }
  } else {
    // Chat / analyze modes: provide companion-style system message
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

    contextMessages.push({ role: "system", content: systemMessage });
  }

  const forwardBody: Record<string, unknown> = {
    messages: [...contextMessages, ...messages],
  };
  if (mode) {
    forwardBody.mode = mode;
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
