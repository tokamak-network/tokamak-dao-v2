"use client";

import * as React from "react";
import { isAddress } from "viem";
import { useChainId } from "wagmi";
import { Input, Label, HelperText } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useActionBuilder } from "@shinthom/dao-action-builder/hooks";
import {
  predefinedMethodRegistry,
  filterStateChangingFunctions,
  type AbiFunction,
} from "@shinthom/dao-action-builder";

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

type LoadingState = "idle" | "loading" | "success" | "error";
type Mode = "auto" | "predefined" | "manual";

/** Chain-specific Etherscan configuration */
interface EtherscanConfig {
  apiUrl: string;
  apiKey?: string;
}

const ETHERSCAN_CONFIGS: Record<number, EtherscanConfig | null> = {
  1: { apiUrl: "https://api.etherscan.io/api", apiKey: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY },
  11155111: { apiUrl: "https://api-sepolia.etherscan.io/api", apiKey: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY },
  1337: null,
  31337: null,
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

/** Fetches ABI from Etherscan with proxy detection */
async function fetchAbiFromEtherscan(
  address: string,
  config: EtherscanConfig
): Promise<AbiFunction[] | null> {
  try {
    // Check for proxy implementation
    const proxyParams = new URLSearchParams({
      module: "contract",
      action: "getsourcecode",
      address,
      ...(config.apiKey && { apikey: config.apiKey }),
    });
    const proxyResponse = await fetch(`${config.apiUrl}?${proxyParams}`);
    const proxyData = await proxyResponse.json();

    const targetAddress = proxyData.status === "1" && proxyData.result?.[0]?.Implementation
      ? proxyData.result[0].Implementation
      : address;

    // Fetch ABI
    const abiParams = new URLSearchParams({
      module: "contract",
      action: "getabi",
      address: targetAddress,
      ...(config.apiKey && { apikey: config.apiKey }),
    });
    const abiResponse = await fetch(`${config.apiUrl}?${abiParams}`);
    const abiData = await abiResponse.json();

    if (abiData.status === "1" && abiData.result) {
      return filterStateChangingFunctions(JSON.parse(abiData.result));
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch ABI:", error);
    return null;
  }
}

/**
 * ActionBuilder component for building DAO proposal actions.
 * Supports three modes: Auto ABI (Etherscan), Predefined methods, and Manual calldata.
 */
export function ActionBuilder({
  index,
  value,
  onChange,
  onRemove,
  showRemove = true,
}: ActionBuilderProps) {
  const chainId = useChainId();
  const etherscanConfig = ETHERSCAN_CONFIGS[chainId] ?? null;
  const supportsEtherscan = etherscanConfig !== null;

  // State
  const [mode, setMode] = React.useState<Mode>(supportsEtherscan ? "auto" : "predefined");
  const [loadingState, setLoadingState] = React.useState<LoadingState>("idle");
  const [loadedAbi, setLoadedAbi] = React.useState<AbiFunction[]>([]);
  const [selectedPredefinedMethod, setSelectedPredefinedMethod] = React.useState("");

  // Group predefined methods by category
  const { standardMethods, tokamakMethods } = React.useMemo(() => {
    const all = predefinedMethodRegistry.getAll();
    return {
      standardMethods: all.filter((m) => !m.name.toLowerCase().includes("tokamak")),
      tokamakMethods: all.filter((m) => m.name.toLowerCase().includes("tokamak")),
    };
  }, []);

  // Current ABI based on mode
  const currentAbi = React.useMemo(() => {
    if (mode === "auto") return loadedAbi;
    if (mode === "predefined" && selectedPredefinedMethod) {
      return predefinedMethodRegistry.getAbi(selectedPredefinedMethod);
    }
    return [];
  }, [mode, loadedAbi, selectedPredefinedMethod]);

  // Action builder hook
  const actionBuilder = useActionBuilder({
    abi: currentAbi,
    initialAddress: value.target,
  });

  // Refs
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  // Effects
  React.useEffect(() => {
    if (!supportsEtherscan && mode === "auto") {
      setMode("predefined");
    }
  }, [supportsEtherscan, mode]);

  // ABI loading (debounced)
  React.useEffect(() => {
    if (mode !== "auto" || !etherscanConfig) return;

    const address = actionBuilder.address;
    if (!address || !isAddress(address)) {
      setLoadedAbi([]);
      setLoadingState("idle");
      return;
    }

    setLoadingState("loading");
    const timeoutId = setTimeout(async () => {
      const fetchedAbi = await fetchAbiFromEtherscan(address, etherscanConfig);
      if (fetchedAbi?.length) {
        setLoadedAbi(fetchedAbi);
        setLoadingState("success");
      } else {
        setLoadedAbi([]);
        setLoadingState("error");
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [actionBuilder.address, mode, etherscanConfig]);

  // Sync state with parent
  React.useEffect(() => {
    if (mode === "manual") return;

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
    mode,
    value.value,
  ]);

  // Handlers
  const handleAddressChange = (newAddress: string) => {
    if (mode === "manual") {
      onChange({
        ...value,
        target: newAddress,
        isValid: isAddress(newAddress) && value.calldata.startsWith("0x"),
      });
    } else {
      actionBuilder.setAddress(newAddress);
    }
  };

  const handleValueChange = (newValue: string) => {
    onChange({ ...value, value: newValue });
  };

  const handleManualCalldataChange = (newCalldata: string) => {
    onChange({
      ...value,
      calldata: newCalldata,
      isValid: isAddress(value.target) && newCalldata.startsWith("0x"),
    });
  };

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setLoadedAbi([]);
    setLoadingState("idle");
    setSelectedPredefinedMethod("");
    actionBuilder.reset();
  };

  const handlePredefinedMethodChange = (methodId: string) => {
    setSelectedPredefinedMethod(methodId);
    actionBuilder.reset();
  };

  const currentAddress = mode === "manual" ? value.target : actionBuilder.address;
  const selectedMethod = [...standardMethods, ...tokamakMethods].find(
    (m) => m.id === selectedPredefinedMethod
  );

  return (
    <div className="p-4 rounded-lg border border-[var(--border-default)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          Action {index + 1}
        </span>
        <div className="flex items-center gap-2">
          <Select
            value={mode}
            onChange={(e) => handleModeChange(e.target.value as Mode)}
            size="sm"
            className="w-36"
          >
            {supportsEtherscan && <option value="auto">Auto ABI</option>}
            <option value="predefined">Predefined</option>
            <option value="manual">Manual</option>
          </Select>
          {showRemove && onRemove && (
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
              Remove
            </Button>
          )}
        </div>
      </div>

      {/* Contract Type (predefined mode) */}
      {mode === "predefined" && (
        <div className="space-y-2">
          <Label htmlFor={`predefined-${index}`}>Contract Type</Label>
          <Select
            id={`predefined-${index}`}
            value={selectedPredefinedMethod}
            onChange={(e) => handlePredefinedMethodChange(e.target.value)}
            placeholder="Select contract type"
          >
            <optgroup label="Standard Contracts">
              {standardMethods.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </optgroup>
            <optgroup label="Tokamak Network">
              {tokamakMethods.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </optgroup>
          </Select>
          {selectedMethod?.description && (
            <HelperText>{selectedMethod.description}</HelperText>
          )}
        </div>
      )}

      {/* Target Address */}
      <div className="space-y-2">
        <Label htmlFor={`target-${index}`}>Target Address</Label>
        <Input
          id={`target-${index}`}
          placeholder="0x..."
          value={currentAddress}
          onChange={(e) => handleAddressChange(e.target.value)}
          error={currentAddress.length > 0 && !isAddress(currentAddress)}
        />
        {mode === "auto" && loadingState === "loading" && (
          <HelperText>Loading contract ABI...</HelperText>
        )}
        {mode === "auto" && loadingState === "error" && (
          <HelperText error>
            Could not load ABI. Contract may not be verified.{" "}
            <button type="button" className="underline" onClick={() => handleModeChange("predefined")}>
              Try predefined methods
            </button>
          </HelperText>
        )}
        {mode === "auto" && loadingState === "success" && (
          <HelperText>ABI loaded successfully</HelperText>
        )}
      </div>

      {/* Function Selection */}
      {mode !== "manual" && currentAbi.length > 0 && (
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
      {mode !== "manual" && actionBuilder.selectedFunction && actionBuilder.selectedFunction.inputs.length > 0 && (
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

      {/* Value (wei) */}
      <div className="space-y-2">
        <Label htmlFor={`value-${index}`}>Value (wei)</Label>
        <Input
          id={`value-${index}`}
          placeholder="0"
          value={value.value}
          onChange={(e) => handleValueChange(e.target.value)}
        />
      </div>

      {/* Manual Calldata */}
      {mode === "manual" && (
        <div className="space-y-2">
          <Label htmlFor={`calldata-${index}`}>Calldata</Label>
          <Input
            id={`calldata-${index}`}
            placeholder="0x"
            value={value.calldata}
            onChange={(e) => handleManualCalldataChange(e.target.value)}
            error={value.calldata.length > 0 && !value.calldata.startsWith("0x")}
          />
        </div>
      )}

      {/* Calldata Preview */}
      {mode !== "manual" && actionBuilder.calldata && actionBuilder.calldata !== "0x" && (
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
