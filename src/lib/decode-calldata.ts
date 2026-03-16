/**
 * Decode proposal calldatas into human-readable format
 * using @tokamak-ecosystem/dao-action-builder.
 */
import {
  tryDecodeCalldata,
  formatDecodedParameters,
  tokamakMethods,
  erc20Methods,
  erc721Methods,
  ownableMethods,
  accessControlMethods,
  pausableMethods,
  governorMethods,
  uupsMethods,
  type AbiFunction,
} from "@tokamak-ecosystem/dao-action-builder";

// Collect all known ABIs for decoding
const ALL_ABIS: AbiFunction[][] = [
  ...tokamakMethods.map((m) => m.abi),
  erc20Methods.abi,
  erc721Methods.abi,
  ownableMethods.abi,
  accessControlMethods.abi,
  pausableMethods.abi,
  governorMethods.abi,
  uupsMethods.abi,
];

export interface DecodedAction {
  target: string;
  value: string;
  functionName: string;
  parameters: string;
  raw: string;
}

/**
 * Decode an array of proposal actions into human-readable descriptions.
 */
export function decodeProposalActions(
  targets: string[],
  calldatas: string[],
  values: string[]
): DecodedAction[] {
  return targets.map((target, i) => {
    const calldata = calldatas[i] || "0x";
    const value = values[i] || "0";

    if (!calldata || calldata === "0x") {
      return {
        target,
        value,
        functionName: "transfer",
        parameters: `${value} wei to ${target}`,
        raw: calldata,
      };
    }

    const result = tryDecodeCalldata(calldata, ALL_ABIS);

    if (result.success) {
      return {
        target,
        value,
        functionName: result.data.functionName,
        parameters: formatDecodedParameters(result.data),
        raw: calldata,
      };
    }

    // Fallback: show selector
    const selector = calldata.slice(0, 10);
    return {
      target,
      value,
      functionName: `unknown(${selector})`,
      parameters: "Could not decode parameters",
      raw: calldata,
    };
  });
}

/**
 * Format decoded actions into a human-readable summary string.
 */
export function formatActionsForLLM(actions: DecodedAction[]): string {
  if (actions.length === 0) return "No on-chain actions.";

  return actions
    .map((a, i) => {
      const lines = [`Action ${i + 1}:`];
      lines.push(`  Target: ${a.target}`);
      lines.push(`  Function: ${a.functionName}`);
      lines.push(`  Parameters: ${a.parameters}`);
      if (a.value !== "0") {
        lines.push(`  Value: ${a.value} wei`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}
