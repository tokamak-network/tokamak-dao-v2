import {
  predefinedMethodRegistry,
  filterStateChangingFunctions,
  getFunctionSignature,
} from "@tokamak-ecosystem/dao-action-builder";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GovernancePath = "veto-only" | "direct-execution";

export interface ClassifiedFunction {
  contractId: string;
  contractName: string;
  functionName: string;
  signature: string;
  parameters: Array<{ name: string; type: string }>;
  path: GovernancePath;
  isOverridden?: boolean;
}

export interface SupabaseOverride {
  id: number;
  contract_id: string;
  contract_name: string;
  function_signature: string;
  function_name: string;
  path: GovernancePath;
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
        path: "veto-only",
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

