import { promises as fs } from "fs";
import path from "path";
import type {
  ContractInfo,
  MigrationPhase,
  MigrationResult,
  MigrationStep,
} from "@/types/migration";

// ---------------------------------------------------------------------------
// Phase definitions
// ---------------------------------------------------------------------------

export function buildPhaseDefinitions(): Pick<
  MigrationPhase,
  "phase" | "name" | "description"
>[] {
  return [
    {
      phase: 0,
      name: "V1 Deploy",
      description:
        "Deploy mock V1 contracts (TON, WTON, DepositManager, SeigManager, DAOVault, DAOCommittee) to simulate the existing on-chain state.",
    },
    {
      phase: 1,
      name: "V2 Deploy",
      description:
        "Deploy new V2 governance contracts: vTON, DelegateRegistry, TimelockController, DAOGovernor, and SecurityCouncil.",
    },
    {
      phase: 2,
      name: "Configure",
      description:
        "Wire V2 contracts together — set governor, security council, minter roles, and transfer ownership to Timelock.",
    },
    {
      phase: 3,
      name: "Transition",
      description:
        "Activate V2 by minting initial vTON, delegating votes, and accepting ownership / admin roles through the Timelock.",
    },
    {
      phase: 4,
      name: "Deprecate V1",
      description:
        "Pause the V1 DAO proxy and transfer remaining V1 vault ownership to the V2 Timelock, completing the migration.",
    },
  ];
}

// ---------------------------------------------------------------------------
// Broadcast JSON types (Forge output)
// ---------------------------------------------------------------------------

interface BroadcastTransaction {
  hash: string;
  transactionType: "CREATE" | "CALL";
  contractName: string | null;
  contractAddress: string;
  function: string | null;
  arguments: string[] | null;
  transaction: {
    from: string;
    to: string | null;
    data: string;
  };
}

interface BroadcastJson {
  transactions: BroadcastTransaction[];
}

// ---------------------------------------------------------------------------
// Classification helpers
// ---------------------------------------------------------------------------

const V1_CONTRACT_NAMES = new Set([
  "MockTON",
  "MockWTON",
  "MockDepositManager",
  "MockSeigManager",
  "MockDAOVault",
  "MockDAOCommittee",
  "MockLayer2Registry",
]);

const V2_CONTRACT_NAMES = new Set([
  "vTON",
  "VTON",
  "DelegateRegistry",
  "TimelockController",
  "TimelockControllerUpgradeable",
  "DAOGovernor",
  "SecurityCouncil",
]);

const PHASE2_FUNCTIONS = new Set([
  "setGovernor",
  "setSecurityCouncil",
  "setMinter",
  "transferOwnership",
  "grantRole",
  "revokeRole",
  "setVotingDelay",
  "setVotingPeriod",
  "setProposalThreshold",
]);

const PHASE3_FUNCTIONS = new Set([
  "mint",
  "delegate",
  "acceptOwnership",
  "acceptAdmin",
  "execute",
]);

const PHASE4_FUNCTIONS = new Set(["setPauseProxy"]);

function categorizeName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("ton") || lower.includes("wton") || lower.includes("vton"))
    return "token";
  if (
    lower.includes("governor") ||
    lower.includes("committee") ||
    lower.includes("timelock") ||
    lower.includes("security")
  )
    return "governance";
  if (lower.includes("vault") || lower.includes("treasury")) return "treasury";
  if (
    lower.includes("deposit") ||
    lower.includes("seig") ||
    lower.includes("staking") ||
    lower.includes("layer2") ||
    lower.includes("registry")
  )
    return "staking";
  if (lower.includes("delegate")) return "governance";
  return "other";
}

function classifyPhase(tx: BroadcastTransaction): number {
  if (tx.transactionType === "CREATE") {
    if (tx.contractName && V1_CONTRACT_NAMES.has(tx.contractName)) return 0;
    if (tx.contractName && V2_CONTRACT_NAMES.has(tx.contractName)) return 1;
    // Fallback: unknown CREATE -> phase 1
    return 1;
  }

  // CALL transactions
  const fnName = tx.function?.split("(")[0] ?? "";

  if (PHASE4_FUNCTIONS.has(fnName)) return 4;
  if (PHASE3_FUNCTIONS.has(fnName)) return 3;
  if (PHASE2_FUNCTIONS.has(fnName)) return 2;

  // Last transferOwnership in the broadcast is typically phase 4
  if (fnName === "transferOwnership") return 2;

  // Default: phase 2
  return 2;
}

function describeTransaction(tx: BroadcastTransaction): string {
  if (tx.transactionType === "CREATE") {
    return `Deploy ${tx.contractName ?? "unknown contract"}`;
  }
  const fnName = tx.function ?? "unknown function";
  const target = tx.contractName ? ` on ${tx.contractName}` : "";
  return `Call ${fnName}${target}`;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export async function parseBroadcastJson(
  jsonPath: string
): Promise<MigrationResult> {
  const raw = await fs.readFile(jsonPath, "utf-8");
  const broadcast: BroadcastJson = JSON.parse(raw);
  const { transactions } = broadcast;

  const phaseDefs = buildPhaseDefinitions();

  // Bucket transactions into phases
  const phaseBuckets: Map<number, BroadcastTransaction[]> = new Map();
  for (const def of phaseDefs) {
    phaseBuckets.set(def.phase, []);
  }

  // We track the last transferOwnership to re-classify it to phase 4
  let lastTransferOwnershipIdx = -1;
  for (let i = 0; i < transactions.length; i++) {
    const fnName = transactions[i].function?.split("(")[0] ?? "";
    if (fnName === "transferOwnership") {
      lastTransferOwnershipIdx = i;
    }
  }

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    let phase = classifyPhase(tx);

    // The very last transferOwnership belongs to phase 4
    if (
      i === lastTransferOwnershipIdx &&
      tx.function?.startsWith("transferOwnership")
    ) {
      phase = 4;
    }

    const bucket = phaseBuckets.get(phase);
    if (bucket) {
      bucket.push(tx);
    } else {
      phaseBuckets.set(phase, [tx]);
    }
  }

  // Build contracts lists
  const v1Contracts: ContractInfo[] = [];
  const v2Contracts: ContractInfo[] = [];

  // Build phases with steps
  const phases: MigrationPhase[] = phaseDefs.map((def) => {
    const txs = phaseBuckets.get(def.phase) ?? [];
    const steps: MigrationStep[] = txs.map((tx, idx) => {
      const step: MigrationStep = {
        step: idx + 1,
        description: describeTransaction(tx),
        target: tx.contractAddress ?? tx.transaction.to ?? "",
        txHash: tx.hash,
        status: "success",
      };

      if (tx.transactionType === "CREATE" && tx.contractName) {
        step.contractCreated = {
          name: tx.contractName,
          address: tx.contractAddress,
        };

        const info: ContractInfo = {
          name: tx.contractName,
          address: tx.contractAddress,
          version: V1_CONTRACT_NAMES.has(tx.contractName) ? "v1" : "v2",
          category: categorizeName(tx.contractName),
        };

        if (info.version === "v1") {
          v1Contracts.push(info);
        } else {
          v2Contracts.push(info);
        }
      }

      return step;
    });

    return {
      ...def,
      status: steps.length > 0 ? "completed" : "pending",
      steps,
    };
  });

  // Extract final-state addresses (best effort from known contract names)
  const contractByName = (name: string): string => {
    const all = [...v1Contracts, ...v2Contracts];
    return all.find((c) => c.name === name)?.address ?? "";
  };

  const timelockAddress =
    contractByName("TimelockController") ||
    contractByName("TimelockControllerUpgradeable");

  const finalState = {
    pauseProxy: true,
    daoVaultOwner: timelockAddress,
    vtonOwner: timelockAddress,
    timelockAdmin: contractByName("DAOGovernor"),
    governorOwner: timelockAddress,
    delegateRegistryOwner: timelockAddress,
  };

  return {
    success: true,
    phases,
    contracts: { v1: v1Contracts, v2: v2Contracts },
    finalState,
    totalTransactions: transactions.length,
    executionTimeMs: 0, // will be set by the API route
  };
}
