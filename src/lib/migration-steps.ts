import type {
  MigrationStepDef,
  MigrationPhase,
  MigrationStep,
  ContractInfo,
} from "@/types/migration";
// Phase definitions inlined to avoid importing from migration.ts (which uses 'fs')
const PHASE_DEFS: Pick<MigrationPhase, "phase" | "name" | "description">[] = [
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

// ---------------------------------------------------------------------------
// Step definitions – every migration step as pure metadata (no execution logic)
// ---------------------------------------------------------------------------

export const MIGRATION_STEPS: MigrationStepDef[] = [
  // Phase 0: V1 Deploy
  {
    globalIndex: 0,
    phase: 0,
    stepInPhase: 1,
    description: "Deploy MockTON",
    type: "deploy",
    contractName: "MockTON",
    contractVersion: "v1",
    contractCategory: "token",
    requires: [],
    produces: "ton",
  },
  {
    globalIndex: 1,
    phase: 0,
    stepInPhase: 2,
    description: "Deploy MockDAOVault",
    type: "deploy",
    contractName: "MockDAOVault",
    contractVersion: "v1",
    contractCategory: "treasury",
    requires: ["ton"],
    produces: "daoVault",
  },
  {
    globalIndex: 2,
    phase: 0,
    stepInPhase: 3,
    description: "Deploy MockDAOCommitteeProxy",
    type: "deploy",
    contractName: "MockDAOCommitteeProxy",
    contractVersion: "v1",
    contractCategory: "governance",
    requires: ["daoVault"],
    produces: "daoCommitteeProxy",
  },
  {
    globalIndex: 3,
    phase: 0,
    stepInPhase: 4,
    description: "Deploy MockDAOAgendaManager",
    type: "deploy",
    contractName: "MockDAOAgendaManager",
    contractVersion: "v1",
    contractCategory: "governance",
    requires: ["daoCommitteeProxy"],
    produces: "daoAgendaManager",
  },
  {
    globalIndex: 4,
    phase: 0,
    stepInPhase: 5,
    description: "Deploy MockCandidateFactory",
    type: "deploy",
    contractName: "MockCandidateFactory",
    contractVersion: "v1",
    contractCategory: "staking",
    requires: [],
    produces: "candidateFactory",
  },
  {
    globalIndex: 5,
    phase: 0,
    stepInPhase: 6,
    description: "Deploy MockSeigManager",
    type: "deploy",
    contractName: "MockSeigManager",
    contractVersion: "v1",
    contractCategory: "staking",
    requires: [],
    produces: "seigManager",
  },
  {
    globalIndex: 6,
    phase: 0,
    stepInPhase: 7,
    description: "Mint TON to vault & test accounts",
    type: "call",
    requires: ["ton", "daoVault"],
  },
  {
    globalIndex: 7,
    phase: 0,
    stepInPhase: 8,
    description: "Deploy mock candidates via factory",
    type: "call",
    requires: ["candidateFactory"],
  },

  // Phase 1: V2 Deploy
  {
    globalIndex: 8,
    phase: 1,
    stepInPhase: 1,
    description: "Deploy vTON",
    type: "deploy",
    contractName: "vTON",
    contractVersion: "v2",
    contractCategory: "token",
    requires: [],
    produces: "vton",
  },
  {
    globalIndex: 9,
    phase: 1,
    stepInPhase: 2,
    description: "Deploy DelegateRegistry",
    type: "deploy",
    contractName: "DelegateRegistry",
    contractVersion: "v2",
    contractCategory: "governance",
    requires: ["vton"],
    produces: "delegateRegistry",
  },
  {
    globalIndex: 10,
    phase: 1,
    stepInPhase: 3,
    description: "Deploy Timelock (7 days delay)",
    type: "deploy",
    contractName: "Timelock",
    contractVersion: "v2",
    contractCategory: "governance",
    requires: [],
    produces: "timelock",
  },
  {
    globalIndex: 11,
    phase: 1,
    stepInPhase: 4,
    description: "Deploy DAOGovernor",
    type: "deploy",
    contractName: "DAOGovernor",
    contractVersion: "v2",
    contractCategory: "governance",
    requires: ["ton", "vton", "delegateRegistry", "timelock"],
    produces: "governor",
  },
  {
    globalIndex: 12,
    phase: 1,
    stepInPhase: 5,
    description: "Deploy SecurityCouncil",
    type: "deploy",
    contractName: "SecurityCouncil",
    contractVersion: "v2",
    contractCategory: "governance",
    requires: ["governor", "timelock", "vton"],
    produces: "securityCouncil",
  },

  // Phase 2: Configure
  {
    globalIndex: 13,
    phase: 2,
    stepInPhase: 1,
    description: "Timelock.setGovernor(governor)",
    type: "call",
    requires: ["timelock", "governor"],
  },
  {
    globalIndex: 14,
    phase: 2,
    stepInPhase: 2,
    description: "Timelock.setSecurityCouncil(sc)",
    type: "call",
    requires: ["timelock", "securityCouncil"],
  },
  {
    globalIndex: 15,
    phase: 2,
    stepInPhase: 3,
    description: "DelegateRegistry.setGovernor(governor)",
    type: "call",
    requires: ["delegateRegistry", "governor"],
  },
  {
    globalIndex: 16,
    phase: 2,
    stepInPhase: 4,
    description: "Governor.setProposalGuardian(sc)",
    type: "call",
    requires: ["governor", "securityCouncil"],
  },
  {
    globalIndex: 17,
    phase: 2,
    stepInPhase: 5,
    description: "Governor.setVotingDelay(0)",
    type: "call",
    requires: ["governor"],
  },
  {
    globalIndex: 18,
    phase: 2,
    stepInPhase: 6,
    description: "Governor.setVotingPeriod(7200)",
    type: "call",
    requires: ["governor"],
  },
  {
    globalIndex: 19,
    phase: 2,
    stepInPhase: 7,
    description: "vTON.setMinter(deployer, true)",
    type: "call",
    requires: ["vton"],
  },
  {
    globalIndex: 20,
    phase: 2,
    stepInPhase: 8,
    description: "vTON.setMinter(seigManager, true)",
    type: "call",
    requires: ["vton", "seigManager"],
  },
  {
    globalIndex: 21,
    phase: 2,
    stepInPhase: 9,
    description: "SeigManager.setVTON(vton)",
    type: "call",
    requires: ["seigManager", "vton"],
  },

  // Phase 3: Transition
  {
    globalIndex: 22,
    phase: 3,
    stepInPhase: 1,
    description: "Mint 50K vTON to test accounts (airdrop)",
    type: "call",
    requires: ["vton"],
  },
  {
    globalIndex: 23,
    phase: 3,
    stepInPhase: 2,
    description: "SeigManager.updateSeigniorage(deployer, 1000)",
    type: "call",
    requires: ["seigManager"],
  },
  {
    globalIndex: 24,
    phase: 3,
    stepInPhase: 3,
    description: "DelegateRegistry.transferOwnership -> Timelock",
    type: "call",
    requires: ["delegateRegistry", "timelock"],
  },
  {
    globalIndex: 25,
    phase: 3,
    stepInPhase: 4,
    description: "Governor.transferOwnership -> Timelock",
    type: "call",
    requires: ["governor", "timelock"],
  },
  {
    globalIndex: 26,
    phase: 3,
    stepInPhase: 5,
    description: "vTON.transferOwnership -> Timelock (pending)",
    type: "call",
    requires: ["vton", "timelock"],
  },
  {
    globalIndex: 27,
    phase: 3,
    stepInPhase: 6,
    description: "Timelock.setPendingAdmin(self)",
    type: "call",
    requires: ["timelock"],
  },

  // Phase 4: Deprecate V1
  {
    globalIndex: 28,
    phase: 4,
    stepInPhase: 1,
    description: "DAOVault.transferOwnership -> Timelock",
    type: "call",
    requires: ["daoVault", "timelock"],
  },
  {
    globalIndex: 29,
    phase: 4,
    stepInPhase: 2,
    description: "DAOCommitteeProxy.setPauseProxy(true)",
    type: "call",
    requires: ["daoCommitteeProxy"],
  },
];

export const TOTAL_STEPS = MIGRATION_STEPS.length;

// ---------------------------------------------------------------------------
// Helpers – reconstruct MigrationPhase[] and ContractInfo[] from step results
// ---------------------------------------------------------------------------

/**
 * Build the full phase tree from a map of completed step results.
 * Used by the frontend to render progress without re-fetching everything.
 */
export function buildPhasesFromStepResults(
  completedSteps: Map<number, { txHash?: string; contractAddress?: string }>,
  executingStep?: number,
): MigrationPhase[] {
  const phaseDefs = PHASE_DEFS;

  return phaseDefs.map((def) => {
    const phaseSteps = MIGRATION_STEPS.filter((s) => s.phase === def.phase);

    const steps: MigrationStep[] = phaseSteps.map((stepDef) => {
      const result = completedSteps.get(stepDef.globalIndex);
      const isExecuting = stepDef.globalIndex === executingStep;

      return {
        step: stepDef.stepInPhase,
        description: stepDef.description,
        target: result?.contractAddress ?? "",
        txHash: result?.txHash,
        contractCreated:
          stepDef.type === "deploy" &&
          result?.contractAddress &&
          stepDef.contractName
            ? { name: stepDef.contractName, address: result.contractAddress }
            : undefined,
        status: result ? "success" : isExecuting ? "pending" : "pending",
      };
    });

    const completedCount = steps.filter((s) => s.status === "success").length;
    const hasExecuting = phaseSteps.some(
      (s) => s.globalIndex === executingStep,
    );

    let status: MigrationPhase["status"];
    if (completedCount === steps.length) {
      status = "completed";
    } else if (completedCount > 0 || hasExecuting) {
      status = "running";
    } else {
      status = "pending";
    }

    return { ...def, steps, status };
  });
}

/**
 * Extract deployed contract info from completed step results, split by version.
 */
export function buildContractsFromStepResults(
  completedSteps: Map<number, { contractAddress?: string }>,
): { v1: ContractInfo[]; v2: ContractInfo[] } {
  const v1: ContractInfo[] = [];
  const v2: ContractInfo[] = [];

  for (const stepDef of MIGRATION_STEPS) {
    if (stepDef.type !== "deploy" || !stepDef.contractName) continue;
    const result = completedSteps.get(stepDef.globalIndex);
    if (!result?.contractAddress) continue;

    const info: ContractInfo = {
      name: stepDef.contractName,
      address: result.contractAddress,
      version: stepDef.contractVersion ?? "v2",
      category: stepDef.contractCategory ?? "other",
    };

    if (info.version === "v1") {
      v1.push(info);
    } else {
      v2.push(info);
    }
  }

  return { v1, v2 };
}
