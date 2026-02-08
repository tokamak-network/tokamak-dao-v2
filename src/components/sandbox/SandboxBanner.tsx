"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSandbox } from "@/hooks/useSandbox";
import { TimeTravelModal } from "./TimeTravelModal";

export function SandboxBanner() {
  const { isActive, stopSandbox } = useSandbox();
  const [timeTravelOpen, setTimeTravelOpen] = useState(false);

  if (!isActive) return null;

  return (
    <>
      <div className="bg-[var(--bg-brand-subtle)] border-b border-[var(--border-primary)]">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between py-2 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Badge variant="success" size="sm">
                Sandbox
              </Badge>
              <span className="text-sm text-[var(--text-secondary)] truncate">
                Temporary cloud environment
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="xs"
                onClick={() => setTimeTravelOpen(true)}
              >
                Time Travel
              </Button>
              <Button variant="ghost" size="xs" onClick={stopSandbox}>
                Stop
              </Button>
            </div>
          </div>
        </div>
      </div>
      <TimeTravelModal
        open={timeTravelOpen}
        onClose={() => setTimeTravelOpen(false)}
      />
    </>
  );
}
