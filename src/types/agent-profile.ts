export interface AgentTraits {
  treasury_philosophy: number; // 0=conservative, 1=aggressive spending
  inflation_tolerance: number; // 0=deflationary, 1=inflationary ok
  governance_accessibility: number; // 0=high barriers, 1=low barriers
  security_priority: number; // 0=minimal oversight, 1=maximum security
  expansion_stance: number; // 0=cautious, 1=rapid expansion
  skin_in_game: number; // 0=no cost to vote, 1=high cost to vote
  delegation_style: number; // 0=manual control, 1=full autonomy
}

export const DEFAULT_TRAITS: AgentTraits = {
  treasury_philosophy: 0.5,
  inflation_tolerance: 0.5,
  governance_accessibility: 0.5,
  security_priority: 0.5,
  expansion_stance: 0.5,
  skin_in_game: 0.5,
  delegation_style: 0.5,
};

export type TraitKey = keyof AgentTraits;

export const TRAIT_LABELS: Record<TraitKey, { name: string; low: string; high: string }> = {
  treasury_philosophy: { name: "Treasury Philosophy", low: "Conservative", high: "Aggressive" },
  inflation_tolerance: { name: "Inflation Tolerance", low: "Deflationary", high: "Inflationary" },
  governance_accessibility: { name: "Governance Accessibility", low: "High Barriers", high: "Low Barriers" },
  security_priority: { name: "Security Priority", low: "Minimal Oversight", high: "Maximum Security" },
  expansion_stance: { name: "Expansion Stance", low: "Cautious", high: "Rapid Expansion" },
  skin_in_game: { name: "Skin in the Game", low: "No Cost", high: "High Cost" },
  delegation_style: { name: "Delegation Style", low: "Manual Control", high: "Full Autonomy" },
};

export interface AgentProfile {
  agent_id: number;
  traits: AgentTraits;
  updated_at: string;
}

export interface ConversationRecord {
  id: string;
  agent_id: number;
  context_type: "proposal_analysis";
  context_id: string | null; // proposal_id
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  trait_deltas: Partial<AgentTraits> | null;
  created_at: string;
  updated_at: string;
}
