export interface DecodedCall {
  target: string;
  targetName: string;
  functionName: string;
  args: { name: string; value: string }[] | string[];
  calldata: string;
}

export interface ProposalCalldata {
  description: string;
  targets: string[];
  functionBytecodes: string[];
  atomicExecute: boolean;
  decodedCalls: DecodedCall[];
}

export interface AgendaDraft {
  title?: string;
  content?: string;
  calldata?: ProposalCalldata;
}

/** @deprecated Use AgendaDraft instead */
export type ProposalData = ProposalCalldata;

// --- agenda-draft (forum_proposal mode) ---

export function extractAgendaDraft(text: string): AgendaDraft | null {
  const match = text.match(/```agenda-draft\s*\n([\s\S]*?)\n```/);
  if (!match) return null;
  try {
    const data = JSON.parse(match[1]);
    if (data.title || data.content || data.calldata) {
      return data as AgendaDraft;
    }
  } catch {
    // invalid JSON
  }
  return null;
}

export function removeAgendaDraftBlock(text: string): string {
  return text.replace(/```agenda-draft\s*\n[\s\S]*?\n```/g, "").trim();
}

// --- proposal-data (make_proposal mode, legacy) ---

export function extractProposalData(text: string): ProposalCalldata | null {
  const match = text.match(/```proposal-data\s*\n([\s\S]*?)\n```/);
  if (!match) return null;
  try {
    const data = JSON.parse(match[1]);
    if (data.targets && data.functionBytecodes && data.decodedCalls) {
      return data as ProposalCalldata;
    }
  } catch {
    // invalid JSON
  }
  return null;
}

export function removeProposalDataBlock(text: string): string {
  return text.replace(/```proposal-data\s*\n[\s\S]*?\n```/, "").trim();
}

// --- Unified extraction (tries agenda-draft first, then proposal-data) ---

export interface ExtractedProposal {
  title?: string;
  content?: string;
  calldata: ProposalCalldata;
}

export function extractProposal(text: string): ExtractedProposal | null {
  // Try agenda-draft first (forum_proposal mode)
  const draft = extractAgendaDraft(text);
  if (draft?.calldata) {
    return {
      title: draft.title,
      content: draft.content,
      calldata: draft.calldata,
    };
  }

  // Fallback to proposal-data (make_proposal mode)
  const data = extractProposalData(text);
  if (data) {
    return { calldata: data };
  }

  return null;
}

export function removeProposalBlocks(text: string): string {
  return text
    .replace(/```agenda-draft\s*\n[\s\S]*?\n```/g, "")
    .replace(/```proposal-data\s*\n[\s\S]*?\n```/g, "")
    .replace(/```question\s*\n[\s\S]*?\n```/g, "")
    .trim();
}

/** Normalize args to {name, value}[] format (agent may send string[] or {name, value}[]) */
export function normalizeArgs(
  args: { name: string; value: string }[] | string[]
): { name: string; value: string }[] {
  if (!args || args.length === 0) return [];
  if (typeof args[0] === "string") {
    return (args as string[]).map((v, i) => ({ name: `arg${i}`, value: v }));
  }
  return args as { name: string; value: string }[];
}
