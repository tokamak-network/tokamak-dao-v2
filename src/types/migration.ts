export interface ContractInfo {
  name: string;
  address: string;
  version: "v1" | "v2";
  category: string; // e.g. "governance", "token", "treasury", "staking"
}

export interface MigrationStep {
  step: number;
  description: string;
  target: string; // contract address
  txHash?: string;
  contractCreated?: { name: string; address: string };
  status: "pending" | "success" | "failed";
}

export interface MigrationPhase {
  phase: number;
  name: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
  steps: MigrationStep[];
}

export interface MigrationResult {
  success: boolean;
  phases: MigrationPhase[];
  contracts: {
    v1: ContractInfo[];
    v2: ContractInfo[];
  };
  finalState: {
    pauseProxy: boolean;
    daoVaultOwner: string;
    vtonOwner: string;
    timelockAdmin: string;
    governorOwner: string;
    delegateRegistryOwner: string;
  };
  totalTransactions: number;
  executionTimeMs: number;
}

// ---------------------------------------------------------------------------
// Step-by-step migration types
// ---------------------------------------------------------------------------

export interface MigrationStepDef {
  globalIndex: number;
  phase: number;
  stepInPhase: number;
  description: string;
  type: "deploy" | "call" | "verify";
  contractName?: string;
  contractVersion?: "v1" | "v2";
  contractCategory?: string;
  /** Address keys this step reads from the registry */
  requires: string[];
  /** Address key this step writes to the registry (deploy steps) */
  produces?: string;
}

export interface StepExecutionResult {
  success: boolean;
  stepIndex: number;
  txHash?: string;
  contractAddress?: string;
  error?: string;
  gasUsed?: string;
  blockNumber?: number;
}
