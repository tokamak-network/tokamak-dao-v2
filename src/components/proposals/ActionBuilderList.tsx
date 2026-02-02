"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ActionBuilder, type BuiltAction } from "./ActionBuilder";

export interface ActionBuilderListProps {
  actions: BuiltAction[];
  onChange: (actions: BuiltAction[]) => void;
}

const DEFAULT_ACTION: BuiltAction = {
  target: "",
  value: "0",
  calldata: "0x",
  isValid: false,
};

/**
 * Multi-action manager component
 * Manages an array of ActionBuilder components with add/remove functionality
 */
export function ActionBuilderList({ actions, onChange }: ActionBuilderListProps) {
  const handleActionChange = React.useCallback(
    (index: number, action: BuiltAction) => {
      const newActions = [...actions];
      newActions[index] = action;
      onChange(newActions);
    },
    [actions, onChange]
  );

  const handleAddAction = React.useCallback(() => {
    onChange([...actions, { ...DEFAULT_ACTION }]);
  }, [actions, onChange]);

  const handleRemoveAction = React.useCallback(
    (index: number) => {
      if (actions.length > 1) {
        onChange(actions.filter((_, i) => i !== index));
      }
    },
    [actions, onChange]
  );

  return (
    <div className="space-y-4">
      {actions.map((action, index) => (
        <ActionBuilder
          key={index}
          index={index}
          value={action}
          onChange={(newAction) => handleActionChange(index, newAction)}
          onRemove={() => handleRemoveAction(index)}
          showRemove={actions.length > 1}
        />
      ))}

      <Button
        type="button"
        variant="secondary"
        onClick={handleAddAction}
        className="w-full"
      >
        <svg
          className="size-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
        Add Action
      </Button>
    </div>
  );
}

export { DEFAULT_ACTION };
