"use client";

import * as React from "react";
import { isAddress } from "viem";
import { useChainId } from "wagmi";
import { Input, Label, HelperText } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useActionBuilder } from "@tokamak-ecosystem/dao-action-builder/hooks";
import { predefinedMethodRegistry } from "@tokamak-ecosystem/dao-action-builder";

export interface BuiltAction {
  target: string;
  value: string;
  calldata: string;
  isValid: boolean;
}

export interface ActionBuilderProps {
  index: number;
  value: BuiltAction;
  onChange: (action: BuiltAction) => void;
  onRemove?: () => void;
  showRemove?: boolean;
}

/** Network key mapping for predefined method addresses (localhost excluded) */
const NETWORK_KEY_MAP: Record<number, 'mainnet' | 'sepolia' | null> = {
  1: 'mainnet',
  11155111: 'sepolia',
  1337: null,    // localhost - no auto-fill
  31337: null,   // localhost - no auto-fill
};

const PLACEHOLDER_MAP: Record<string, string> = {
  address: "0x...",
  bool: "true or false",
};

function getPlaceholder(type: string): string {
  if (PLACEHOLDER_MAP[type]) return PLACEHOLDER_MAP[type];
  if (type.startsWith("uint") || type.startsWith("int")) return "0";
  if (type.startsWith("bytes")) return "0x...";
  if (type.endsWith("[]")) return "value1, value2, ...";
  return "";
}

/**
 * ActionBuilder component for building DAO proposal actions.
 * Uses predefined Tokamak contract methods.
 */
export function ActionBuilder({
  index,
  value,
  onChange,
  onRemove,
  showRemove = true,
}: ActionBuilderProps) {
  const chainId = useChainId();

  // State
  const [selectedPredefinedMethod, setSelectedPredefinedMethod] = React.useState("");

  // Get Tokamak predefined methods only
  const tokamakMethods = React.useMemo(() => {
    const all = predefinedMethodRegistry.getAll();
    return all.filter((m) => m.name.toLowerCase().includes("tokamak"));
  }, []);

  // Current ABI based on selected method
  const currentAbi = React.useMemo(() => {
    if (selectedPredefinedMethod) {
      return predefinedMethodRegistry.getAbi(selectedPredefinedMethod);
    }
    return [];
  }, [selectedPredefinedMethod]);

  // Action builder hook
  const actionBuilder = useActionBuilder({
    abi: currentAbi,
    initialAddress: value.target,
  });

  // Refs
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  // Sync state with parent
  React.useEffect(() => {
    const calldata = actionBuilder.calldata || "0x";
    const isValidAction =
      isAddress(actionBuilder.address) &&
      actionBuilder.selectedFunction !== null &&
      actionBuilder.isParametersValid &&
      calldata !== "0x";

    onChangeRef.current({
      target: actionBuilder.address,
      value: value.value,
      calldata,
      isValid: isValidAction,
    });
  }, [
    actionBuilder.address,
    actionBuilder.calldata,
    actionBuilder.selectedFunction,
    actionBuilder.isParametersValid,
    value.value,
  ]);

  // Handlers
  const handlePredefinedMethodChange = (methodId: string) => {
    setSelectedPredefinedMethod(methodId);

    // Auto-fill address for mainnet/sepolia (not localhost)
    const networkKey = NETWORK_KEY_MAP[chainId];
    if (networkKey && methodId) {
      const method = predefinedMethodRegistry.get(methodId);
      const address = method?.addresses?.[networkKey];
      if (address) {
        actionBuilder.setAddress(address);
        return; // Keep address, skip reset
      }
    }

    actionBuilder.reset();
  };

  const selectedMethod = tokamakMethods.find(
    (m) => m.id === selectedPredefinedMethod
  );

  return (
    <div className="p-4 rounded-lg border border-[var(--border-default)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          Action {index + 1}
        </span>
        {showRemove && onRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>

      {/* Contract Type */}
      <div className="space-y-2">
        <Label htmlFor={`predefined-${index}`}>Contract Type</Label>
        <Select
          id={`predefined-${index}`}
          value={selectedPredefinedMethod}
          onChange={(e) => handlePredefinedMethodChange(e.target.value)}
          placeholder="Select contract type"
        >
          {tokamakMethods.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name.replace(/^Tokamak\s+/i, "")}
            </option>
          ))}
        </Select>
        {selectedMethod?.description && (
          <HelperText>{selectedMethod.description}</HelperText>
        )}
      </div>

      {/* Target Address */}
      <div className="space-y-2">
        <Label htmlFor={`target-${index}`}>Target Address</Label>
        <Input
          id={`target-${index}`}
          placeholder="0x..."
          value={actionBuilder.address}
          onChange={(e) => actionBuilder.setAddress(e.target.value)}
          error={actionBuilder.address.length > 0 && !isAddress(actionBuilder.address)}
        />
      </div>

      {/* Function Selection */}
      {currentAbi.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor={`function-${index}`}>Function</Label>
          <Select
            id={`function-${index}`}
            value={actionBuilder.selectedFunctionSignature}
            onChange={(e) => actionBuilder.setSelectedFunction(e.target.value)}
            placeholder="Select a function"
          >
            {actionBuilder.availableFunctions.map((fn) => {
              const sig = `${fn.name}(${fn.inputs.map((i) => i.type).join(",")})`;
              return (
                <option key={sig} value={sig}>
                  {fn.name}({fn.inputs.map((i) => i.type).join(", ")})
                </option>
              );
            })}
          </Select>
        </div>
      )}

      {/* Parameters */}
      {actionBuilder.selectedFunction && actionBuilder.selectedFunction.inputs.length > 0 && (
        <div className="space-y-3 pl-4 border-l-2 border-[var(--border-subtle)]">
          <Label className="text-xs text-[var(--text-tertiary)]">Parameters</Label>
          {actionBuilder.selectedFunction.inputs.map((input) => {
            const state = actionBuilder.parameterStates[input.name];
            return (
              <div key={input.name} className="space-y-1">
                <Label htmlFor={`param-${index}-${input.name}`} className="text-xs">
                  {input.name}{" "}
                  <span className="text-[var(--text-tertiary)]">({input.type})</span>
                </Label>
                <Input
                  id={`param-${index}-${input.name}`}
                  size="sm"
                  placeholder={getPlaceholder(input.type)}
                  value={actionBuilder.parameterValues[input.name] || ""}
                  onChange={(e) => actionBuilder.setParameterValue(input.name, e.target.value)}
                  error={state?.isDirty && !state?.isValid}
                />
                {state?.isDirty && state?.error && (
                  <HelperText error className="text-xs">{state.error}</HelperText>
                )}
              </div>
            );
          })}
          {actionBuilder.calldataError && (
            <HelperText error>{actionBuilder.calldataError.message}</HelperText>
          )}
        </div>
      )}

      {/* Calldata Preview */}
      {actionBuilder.calldata && actionBuilder.calldata !== "0x" && (
        <div className="space-y-2">
          <Label className="text-xs text-[var(--text-tertiary)]">Encoded Calldata</Label>
          <div className={cn(
            "p-2 rounded bg-[var(--bg-tertiary)] text-xs font-mono break-all",
            "text-[var(--text-secondary)]"
          )}>
            {actionBuilder.calldata}
          </div>
        </div>
      )}
    </div>
  );
}
