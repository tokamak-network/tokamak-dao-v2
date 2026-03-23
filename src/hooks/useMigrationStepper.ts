"use client";

import { useCallback, useMemo, useReducer } from "react";

import {
  MIGRATION_STEPS,
  TOTAL_STEPS,
  buildPhasesFromStepResults,
  buildContractsFromStepResults,
} from "@/lib/migration-steps";
import type {
  ContractInfo,
  MigrationPhase,
  MigrationStepDef,
  StepExecutionResult,
} from "@/types/migration";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StepResultEntry {
  txHash?: string;
  contractAddress?: string;
  executedAt: number;
}

interface MigrationStepperState {
  nextStepIndex: number;
  results: Map<number, StepResultEntry>;
  addresses: Record<string, string>;
  isExecuting: boolean;
  error: string | null;
  isComplete: boolean;
}

export interface UseMigrationStepperReturn {
  // State
  nextStepIndex: number;
  isExecuting: boolean;
  error: string | null;
  isComplete: boolean;

  // Current step info
  currentStep: MigrationStepDef | null;

  // Derived visualization data (compatible with existing components)
  phases: MigrationPhase[];
  contracts: { v1: ContractInfo[]; v2: ContractInfo[] };
  currentPhase: number;
  progress: { completed: number; total: number };

  // Last completed step info (for highlighting)
  lastDeployedContract: string | null;

  // Actions
  executeNextStep: () => Promise<void>;
  retry: () => Promise<void>;
  reset: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type Action =
  | { type: "EXECUTE_START" }
  | { type: "EXECUTE_SUCCESS"; result: StepExecutionResult }
  | { type: "EXECUTE_FAILURE"; error: string }
  | { type: "RESET" };

const initialState: MigrationStepperState = {
  nextStepIndex: 0,
  results: new Map(),
  addresses: {},
  isExecuting: false,
  error: null,
  isComplete: false,
};

function reducer(
  state: MigrationStepperState,
  action: Action,
): MigrationStepperState {
  switch (action.type) {
    case "EXECUTE_START": {
      return {
        ...state,
        isExecuting: true,
        error: null,
      };
    }

    case "EXECUTE_SUCCESS": {
      const { result } = action;
      const newResults = new Map(state.results);
      newResults.set(result.stepIndex, {
        txHash: result.txHash,
        contractAddress: result.contractAddress,
        executedAt: Date.now(),
      });

      // Update addresses if this step produces an address
      const stepDef = MIGRATION_STEPS[result.stepIndex];
      const newAddresses = { ...state.addresses };
      if (stepDef?.produces && result.contractAddress) {
        newAddresses[stepDef.produces] = result.contractAddress;
      }

      const nextIndex = state.nextStepIndex + 1;

      return {
        ...state,
        results: newResults,
        addresses: newAddresses,
        nextStepIndex: nextIndex,
        isExecuting: false,
        error: null,
        isComplete: nextIndex >= TOTAL_STEPS,
      };
    }

    case "EXECUTE_FAILURE": {
      return {
        ...state,
        isExecuting: false,
        error: action.error,
      };
    }

    case "RESET": {
      return {
        ...initialState,
        results: new Map(),
        addresses: {},
      };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMigrationStepper(): UseMigrationStepperReturn {
  const [state, dispatch] = useReducer(reducer, initialState);

  // -- Actions ---------------------------------------------------------------

  const executeNextStep = useCallback(async () => {
    if (state.isExecuting || state.nextStepIndex >= TOTAL_STEPS) return;

    dispatch({ type: "EXECUTE_START" });

    try {
      const response = await fetch("/api/migration/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepIndex: state.nextStepIndex,
          addresses: state.addresses,
        }),
      });

      const data: StepExecutionResult = await response.json();

      if (!data.success) {
        dispatch({
          type: "EXECUTE_FAILURE",
          error: data.error ?? "Step execution failed",
        });
        return;
      }

      dispatch({ type: "EXECUTE_SUCCESS", result: data });
    } catch (err) {
      dispatch({
        type: "EXECUTE_FAILURE",
        error: err instanceof Error ? err.message : "Network error",
      });
    }
  }, [state.isExecuting, state.nextStepIndex, state.addresses]);

  const retry = useCallback(async () => {
    await executeNextStep();
  }, [executeNextStep]);

  const reset = useCallback(async () => {
    try {
      await fetch("/api/migration/step/reset", { method: "POST" });
    } catch {
      // ignore reset errors
    }
    dispatch({ type: "RESET" });
  }, []);

  // -- Derived values --------------------------------------------------------

  const phases = useMemo(
    () =>
      buildPhasesFromStepResults(
        state.results,
        state.isExecuting ? state.nextStepIndex : undefined,
      ),
    [state.results, state.isExecuting, state.nextStepIndex],
  );

  const contracts = useMemo(
    () => buildContractsFromStepResults(state.results),
    [state.results],
  );

  const currentStep = useMemo(
    () =>
      state.nextStepIndex < TOTAL_STEPS
        ? MIGRATION_STEPS[state.nextStepIndex]
        : null,
    [state.nextStepIndex],
  );

  const currentPhase = useMemo(
    () => MIGRATION_STEPS[state.nextStepIndex]?.phase ?? 4,
    [state.nextStepIndex],
  );

  const progress = useMemo(
    () => ({ completed: state.nextStepIndex, total: TOTAL_STEPS }),
    [state.nextStepIndex],
  );

  const isComplete = state.nextStepIndex >= TOTAL_STEPS;

  const lastDeployedContract = useMemo(() => {
    let lastDeploy: string | null = null;
    for (let i = state.nextStepIndex - 1; i >= 0; i--) {
      if (state.results.has(i)) {
        const stepDef = MIGRATION_STEPS[i];
        if (stepDef?.type === "deploy" && stepDef.contractName) {
          lastDeploy = stepDef.contractName;
          break;
        }
      }
    }
    return lastDeploy;
  }, [state.nextStepIndex, state.results]);

  return {
    nextStepIndex: state.nextStepIndex,
    isExecuting: state.isExecuting,
    error: state.error,
    isComplete,
    currentStep,
    phases,
    contracts,
    currentPhase,
    progress,
    lastDeployedContract,
    executeNextStep,
    retry,
    reset,
  };
}
