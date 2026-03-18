import type { AgentTraits } from "@/types/agent-profile";
import { callClaude } from "./agent-llm";
import { proposalAnalysisPrompt, traitUpdatePrompt } from "./agent-prompts";
import { extractTraitDeltas, applyTraitDeltas } from "./agent-traits";
import { agentSupabase } from "./agent-supabase";

interface ProposalData {
  proposalId: string;
  title: string;
  proposer: string;
  description?: string;
}

/**
 * Analyze a proposal for a specific agent based on their traits.
 * Returns formatted analysis text for Telegram.
 */
export async function analyzeProposalForAgent(
  traits: AgentTraits,
  proposal: ProposalData
): Promise<string> {
  const proposalInfo = [
    `Title: ${proposal.title}`,
    `Proposer: ${proposal.proposer}`,
    proposal.description ? `Description: ${proposal.description}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const analysis = await callClaude({
    system: proposalAnalysisPrompt(traits),
    messages: [
      { role: "user", content: `Please analyze the following proposal:\n\n${proposalInfo}` },
    ],
    maxTokens: 1024,
  });

  return analysis;
}

/**
 * Handle a user's reply to a proposal analysis.
 * Continues the conversation and updates traits if stance shift is detected.
 */
export async function handleProposalDiscussion(
  agentId: number,
  proposalId: string,
  botToken: string,
  chatId: number,
  userMessage: string
): Promise<string> {
  // 1. Fetch current profile
  const { data: profile } = await agentSupabase
    .from("agent_profiles")
    .select("traits")
    .eq("agent_id", agentId)
    .single();

  if (!profile) {
    return "Profile not found. Please complete profiling first.";
  }

  const traits = profile.traits as AgentTraits;

  // 2. Fetch conversation history for this proposal
  const { data: convData } = await agentSupabase
    .from("agent_conversations")
    .select("messages")
    .eq("agent_id", agentId)
    .eq("context_type", "proposal_analysis")
    .eq("context_id", proposalId)
    .order("created_at", { ascending: true });

  const previousMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (convData) {
    for (const conv of convData) {
      previousMessages.push(
        ...(conv.messages as Array<{ role: "user" | "assistant"; content: string }>)
      );
    }
  }

  // 3. Call Claude with trait update prompt
  const messages = [
    ...previousMessages,
    { role: "user" as const, content: userMessage },
  ];

  const llmOutput = await callClaude({
    system: traitUpdatePrompt(traits),
    messages,
    maxTokens: 1024,
  });

  // 4. Extract deltas and response
  const result = extractTraitDeltas(llmOutput);
  const response = result?.response || llmOutput;
  const deltas = result?.deltas || {};

  // 5. Apply trait deltas if any
  if (Object.keys(deltas).length > 0) {
    const updatedTraits = applyTraitDeltas(traits, deltas);
    await agentSupabase
      .from("agent_profiles")
      .update({
        traits: updatedTraits,
        updated_at: new Date().toISOString(),
      })
      .eq("agent_id", agentId);
  }

  // 6. Save conversation
  await agentSupabase.from("agent_conversations").insert({
    agent_id: agentId,
    context_type: "proposal_analysis",
    context_id: proposalId,
    messages: [
      { role: "user", content: userMessage },
      { role: "assistant", content: response },
    ],
    trait_deltas: Object.keys(deltas).length > 0 ? deltas : null,
  });

  return response;
}
