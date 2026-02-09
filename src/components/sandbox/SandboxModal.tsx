"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSandbox } from "@/hooks/useSandbox";

interface SandboxModalProps {
  open: boolean;
  onClose: () => void;
}

const STEP_PROGRESS: Record<string, number> = {
  creating: 10,
  starting: 30,
  deploying: 60,
  funding: 85,
  done: 100,
};

export function SandboxModal({ open, onClose }: SandboxModalProps) {
  const router = useRouter();
  const { status, progress, error, startSandbox, stopSandbox, isActive } =
    useSandbox();

  const handleLaunch = async () => {
    await startSandbox();
  };

  const [isStopping, setIsStopping] = React.useState(false);

  const handleStop = async () => {
    setIsStopping(true);
    await stopSandbox();
    setIsStopping(false);
    onClose();
  };

  const progressValue = progress ? (STEP_PROGRESS[progress.step] ?? 0) : 0;

  const getTitle = () => {
    if (isActive) return "Sandbox Active";
    if (status === "creating") return "Launching Sandbox";
    if (status === "error") return "Sandbox Error";
    return "Try Sandbox";
  };

  const getDescription = () => {
    if (isActive) return "Your sandbox environment is running";
    if (status === "creating") return "Setting up your cloud environment...";
    if (status === "error") return "Something went wrong";
    return "Launch a temporary cloud environment to test DAO governance";
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={getTitle()}
      description={getDescription()}
      size="md"
    >
      <ModalBody>
        {/* Idle state */}
        {status === "idle" && (
          <div className="space-y-4">
            <div className="space-y-2 text-sm text-[var(--text-secondary)]">
              <p>
                Sandbox creates a temporary Anvil blockchain in the cloud with:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>All DAO contracts pre-deployed</li>
                <li>100 ETH + 10,000 TON + 10,000 vTON funded</li>
                <li>Time travel to skip voting/timelock periods</li>
              </ul>
              <p className="text-xs text-[var(--text-tertiary)]">
                The sandbox is temporary and will be destroyed when you stop it.
              </p>
            </div>
          </div>
        )}

        {/* Creating state */}
        {status === "creating" && progress && (
          <div className="space-y-4">
            <Progress value={progressValue} />
            <p className="text-sm text-[var(--text-secondary)] text-center">
              {progress.message}
            </p>
          </div>
        )}

        {/* Ready state */}
        {isActive && (
          <div className="space-y-4">
            <div className="p-3 rounded-[var(--radius-lg)] border border-[var(--status-success-fg)] bg-[var(--status-success-bg)]">
              <p className="text-sm font-medium text-[var(--status-success-fg)]">
                Sandbox is running! Your wallet is connected to the sandbox
                chain.
              </p>
            </div>
            <div className="text-sm text-[var(--text-secondary)] space-y-1">
              <p>Use the sandbox banner controls to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Time travel to skip periods</li>
                <li>Stop the sandbox</li>
              </ul>
            </div>
          </div>
        )}

        {/* Error state */}
        {status === "error" && error && (
          <div className="space-y-4">
            <div className="p-3 rounded-[var(--radius-lg)] border border-[var(--status-error-fg)] bg-[var(--status-error-bg)]">
              <p className="text-sm text-[var(--status-error-fg)]">{error}</p>
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        {status === "idle" && (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleLaunch}>Launch Sandbox</Button>
          </>
        )}
        {status === "creating" && (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        )}
        {isActive && (
          <>
            <Button variant="destructive" size="sm" onClick={handleStop} loading={isStopping} disabled={isStopping}>
              {isStopping ? "Stopping..." : "Stop Sandbox"}
            </Button>
            <Button
              onClick={() => {
                router.push("/dashboard");
                onClose();
              }}
            >
              Go to Dashboard
            </Button>
          </>
        )}
        {status === "error" && (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleLaunch}>Retry</Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}
