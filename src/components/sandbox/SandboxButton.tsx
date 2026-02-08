"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { useSandbox } from "@/hooks/useSandbox";
import { SandboxModal } from "./SandboxModal";

export function SandboxButton() {
  const { isConnected } = useWalletConnection();
  const { isActive, status } = useSandbox();
  const [modalOpen, setModalOpen] = useState(false);

  if (isActive) {
    return (
      <>
        <Badge
          variant="success"
          size="md"
          className="cursor-pointer"
          onClick={() => setModalOpen(true)}
        >
          Sandbox
        </Badge>
        <SandboxModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setModalOpen(true)}
        disabled={!isConnected || status === "creating"}
        loading={status === "creating"}
      >
        Try Sandbox
      </Button>
      <SandboxModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
