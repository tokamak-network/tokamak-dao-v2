import type { AgentTraits, TraitKey } from "@/types/agent-profile";

const TRAIT_KEYS: TraitKey[] = [
  "treasury_philosophy",
  "inflation_tolerance",
  "governance_accessibility",
  "security_priority",
  "expansion_stance",
  "skin_in_game",
  "delegation_style",
];

/**
 * Apply trait deltas with clamping (0~1) and max change (±0.1).
 */
export function applyTraitDeltas(
  traits: AgentTraits,
  deltas: Partial<AgentTraits>
): AgentTraits {
  const updated = { ...traits };
  for (const key of TRAIT_KEYS) {
    if (key in deltas && deltas[key] !== undefined) {
      const delta = Math.max(-0.1, Math.min(0.1, deltas[key]!));
      updated[key] = Math.max(0, Math.min(1, traits[key] + delta));
    }
  }
  return updated;
}

/**
 * Parse trait deltas from Claude's JSON response.
 * Returns { deltas, response } or null if parsing fails.
 */
export function extractTraitDeltas(
  llmOutput: string
): { deltas: Partial<AgentTraits>; response: string } | null {
  try {
    // Extract JSON from response (handle potential surrounding text)
    const jsonMatch = llmOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.response) return null;

    const deltas: Partial<AgentTraits> = {};
    if (parsed.deltas && typeof parsed.deltas === "object") {
      for (const key of TRAIT_KEYS) {
        if (key in parsed.deltas && typeof parsed.deltas[key] === "number") {
          deltas[key] = parsed.deltas[key];
        }
      }
    }

    return { deltas, response: parsed.response };
  } catch {
    return null;
  }
}
