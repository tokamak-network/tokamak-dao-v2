import {
  predefinedMethodRegistry,
  filterStateChangingFunctions,
  getFunctionSignature,
} from "@tokamak-ecosystem/dao-action-builder";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GovernancePath = "veto-only" | "direct-execution";

export type CriteriaTag =
  | "Emergency Safety"
  | "Token Operations"
  | "Governance Participation"
  | "Ownership / Admin"
  | "Proxy Upgrades"
  | "Protocol Parameters"
  | "Treasury Operations"
  | "Registry / Address"
  | "Governance Control";

export interface ClassifiedFunction {
  contractId: string;
  contractName: string;
  functionName: string;
  signature: string;
  parameters: Array<{ name: string; type: string }>;
  path: GovernancePath;
  criteria: CriteriaTag;
  isOverridden?: boolean;
}

export interface SupabaseOverride {
  id: number;
  contract_id: string;
  contract_name: string;
  function_signature: string;
  function_name: string;
  path: GovernancePath;
  network: number;
  updated_at: string;
  updated_by: string | null;
}

// ---------------------------------------------------------------------------
// Contract display names (id → human-readable)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Contract display names (registry id → human-readable)
// ---------------------------------------------------------------------------

const CONTRACT_NAMES: Record<string, string> = {
  "tokamak-ton": "TON",
  "tokamak-wton": "WTON",
  "tokamak-deposit-manager": "DepositManager",
  "tokamak-l1-bridge-registry": "L1BridgeRegistry",
  "tokamak-layer2-manager": "Layer2Manager",
  "tokamak-dao-committee": "DAOCommittee",
  "tokamak-dao-agenda-manager": "DAOAgendaManager",
  "tokamak-dao-vault": "DAOVault",
  "tokamak-layer2-registry": "Layer2Registry",
  "tokamak-seig-manager": "SeigManager",
  "tokamak-candidate-factory": "CandidateFactory",
  "erc20": "ERC20",
  "erc721": "ERC721",
  "erc1155": "ERC1155",
  "ownable": "Ownable",
  "access-control": "AccessControl",
  "pausable": "Pausable",
  "governor": "Governor",
  "uups": "UUPS Proxy",
};

// ---------------------------------------------------------------------------
// AI-based default classification rules
// Functions explicitly listed here get "direct-execution" path.
// Everything else defaults to "veto-only" (safe default).
// ---------------------------------------------------------------------------

type DirectRule = { functions: Set<string>; criteria: CriteriaTag };

const DIRECT_EXECUTION_RULES: Record<string, DirectRule> = {
  // Category 1: Emergency Safety — exploit response needs immediate action
  "pausable": { criteria: "Emergency Safety", functions: new Set(["pause", "unpause"]) },

  // Category 2: Token Operations — no protocol parameter changes
  "tokamak-ton": { criteria: "Token Operations", functions: new Set(["approve", "approveAndCall", "transfer", "transferFrom"]) },
  "tokamak-wton": { criteria: "Token Operations", functions: new Set([
    "swapToTON", "swapFromTON", "swapToTONAndTransfer", "swapFromTONAndTransfer",
    "approve", "approveAndCall", "transfer", "transferFrom",
    "increaseAllowance", "decreaseAllowance",
  ]) },
  "erc20": { criteria: "Token Operations", functions: new Set(["approve", "transfer", "transferFrom", "increaseAllowance", "decreaseAllowance"]) },
  "erc721": { criteria: "Token Operations", functions: new Set(["approve", "setApprovalForAll", "transferFrom", "safeTransferFrom"]) },
  "erc1155": { criteria: "Token Operations", functions: new Set(["setApprovalForAll", "safeTransferFrom", "safeBatchTransferFrom"]) },

  // Category 3: Governance Participation — SC *participates* in governance (not controls it)
  "governor": { criteria: "Governance Participation", functions: new Set(["propose", "castVote", "castVoteWithReason", "castVoteBySig", "queue", "execute", "cancel"]) },
};

// Veto-only criteria: function-level overrides (contractId::functionName → tag)
const VETO_CRITERIA_OVERRIDES: Record<string, CriteriaTag> = {
  "tokamak-dao-vault::setTON": "Registry / Address",
  "tokamak-dao-vault::setWTON": "Registry / Address",
};

// Veto-only criteria: mapped by contract ID
const VETO_CRITERIA_BY_CONTRACT: Record<string, CriteriaTag> = {
  "ownable": "Ownership / Admin",
  "access-control": "Ownership / Admin",
  "uups": "Proxy Upgrades",
  "tokamak-dao-vault": "Treasury Operations",
  "tokamak-seig-manager": "Protocol Parameters",
  "tokamak-dao-agenda-manager": "Protocol Parameters",
  "tokamak-deposit-manager": "Protocol Parameters",
  "tokamak-layer2-manager": "Protocol Parameters",
  "tokamak-l1-bridge-registry": "Registry / Address",
  "tokamak-layer2-registry": "Registry / Address",
  "tokamak-candidate-factory": "Registry / Address",
  "tokamak-dao-committee": "Governance Control",
};

// ---------------------------------------------------------------------------
// Build classifications from dao-action-builder registry only
// ---------------------------------------------------------------------------

function getRegistryFunctions(): ClassifiedFunction[] {
  const allMethods = predefinedMethodRegistry.getAll();
  const result: ClassifiedFunction[] = [];

  for (const method of allMethods) {
    const stateChanging = filterStateChangingFunctions(method.abi);
    for (const fn of stateChanging) {
      const sig = getFunctionSignature(fn);
      result.push({
        contractId: method.id,
        contractName: CONTRACT_NAMES[method.id] ?? method.name,
        functionName: fn.name,
        signature: sig,
        parameters: (fn.inputs ?? []).map((p: { name: string; type: string }) => ({
          name: p.name || "unnamed",
          type: p.type,
        })),
        path: DIRECT_EXECUTION_RULES[method.id]?.functions.has(fn.name)
          ? "direct-execution"
          : "veto-only",
        criteria: DIRECT_EXECUTION_RULES[method.id]?.functions.has(fn.name)
          ? DIRECT_EXECUTION_RULES[method.id].criteria
          : (VETO_CRITERIA_OVERRIDES[`${method.id}::${fn.name}`]
            ?? VETO_CRITERIA_BY_CONTRACT[method.id]
            ?? "Protocol Parameters"),
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getDefaultClassification(): ClassifiedFunction[] {
  return getRegistryFunctions();
}

export function mergeWithOverrides(
  defaults: ClassifiedFunction[],
  overrides: SupabaseOverride[]
): ClassifiedFunction[] {
  const overrideMap = new Map(
    overrides.map((o) => [`${o.contract_id}::${o.function_signature}`, o])
  );

  return defaults.map((fn) => {
    const key = `${fn.contractId}::${fn.signature}`;
    const override = overrideMap.get(key);
    if (override) {
      return { ...fn, path: override.path, isOverridden: true };
    }
    return fn;
  });
}

export function groupByContract(
  fns: ClassifiedFunction[]
): Record<string, ClassifiedFunction[]> {
  const groups: Record<string, ClassifiedFunction[]> = {};
  for (const fn of fns) {
    const key = fn.contractId;
    if (!groups[key]) groups[key] = [];
    groups[key].push(fn);
  }
  return groups;
}

