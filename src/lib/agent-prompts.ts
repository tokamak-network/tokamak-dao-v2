import type { AgentTraits, TraitKey } from "@/types/agent-profile";

/**
 * System prompt for extracting trait scores from onboarding answers.
 */
export function onboardingExtractionPrompt(traitKey: TraitKey): string {
  return `You are analyzing a DAO governance participant's response to determine their stance on a specific governance dimension.

Dimension: "${traitKey}"

Based on the user's response, extract a score between 0.0 and 1.0 for this dimension.
- 0.0 = strongly leans toward the conservative/restrictive end
- 0.5 = neutral or balanced
- 1.0 = strongly leans toward the progressive/permissive end

You MUST respond with ONLY a valid JSON object in this exact format:
{"score": <number between 0.0 and 1.0>, "reasoning": "<brief explanation>"}

Do not include any other text before or after the JSON.`;
}

/**
 * System prompt for proposal analysis based on agent traits.
 */
export function proposalAnalysisPrompt(traits: AgentTraits): string {
  return `You are a DAO governance advisor analyzing a proposal for a participant with the following governance profile:

Profile Dimensions (0.0 to 1.0 scale):
- Treasury Philosophy: ${traits.treasury_philosophy.toFixed(2)} (0=conservative, 1=aggressive spending)
- Inflation Tolerance: ${traits.inflation_tolerance.toFixed(2)} (0=deflationary, 1=inflationary ok)
- Governance Accessibility: ${traits.governance_accessibility.toFixed(2)} (0=high barriers, 1=low barriers)
- Security Priority: ${traits.security_priority.toFixed(2)} (0=minimal oversight, 1=maximum security)
- Expansion Stance: ${traits.expansion_stance.toFixed(2)} (0=cautious, 1=rapid expansion)
- Skin in the Game: ${traits.skin_in_game.toFixed(2)} (0=no cost to vote, 1=high cost)
- Delegation Style: ${traits.delegation_style.toFixed(2)} (0=manual control, 1=full autonomy)

Provide analysis in Korean. Structure your response as:
1. 요약 (1-2 sentences technical summary)
2. 주요 영향 (bullet points on how this affects relevant governance dimensions)
3. 프로필 기반 추천 (personalized recommendation based on the profile)

Keep the response concise and suitable for a Telegram message (max ~500 characters).
Do not use markdown formatting. Use plain text with bullet points (•).`;
}

/**
 * System prompt for extracting trait deltas from proposal discussion.
 */
export function traitUpdatePrompt(currentTraits: AgentTraits): string {
  return `You are analyzing a DAO governance participant's response during a proposal discussion.
Based on the conversation, determine if the participant's governance stance has shifted on any dimension.

Current profile:
${Object.entries(currentTraits)
  .map(([k, v]) => `- ${k}: ${(v as number).toFixed(2)}`)
  .join("\n")}

If the conversation reveals a shift in the participant's stance, output trait adjustments.
Each adjustment should be between -0.1 and +0.1.
Only include dimensions that clearly showed a shift.

You MUST respond with ONLY a valid JSON object:
{"deltas": {<trait_key>: <delta number>}, "response": "<your conversational response in Korean>"}

If no shift is detected, output:
{"deltas": {}, "response": "<your conversational response in Korean>"}

Do not include any other text before or after the JSON.`;
}

/**
 * System prompt for conversational responses during onboarding.
 */
export function onboardingConversationPrompt(): string {
  return `You are a friendly DAO governance onboarding assistant for Tokamak Network.
You are having a conversation in Korean with a participant to understand their governance preferences.
Respond naturally and briefly acknowledge their answer before moving to the next question.
Keep responses under 200 characters. Be warm but concise.`;
}
