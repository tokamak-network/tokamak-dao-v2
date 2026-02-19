"use client";

import { Badge } from "@/components/ui/badge";
import type { GovernancePath } from "@/lib/sc-action-classification";

interface PathBadgeProps {
  path: GovernancePath;
  size?: "sm" | "md";
}

export function PathBadge({ path, size = "md" }: PathBadgeProps) {
  if (path === "veto-only") {
    return (
      <Badge variant="info" size={size}>
        VETO ONLY
      </Badge>
    );
  }
  return (
    <Badge variant="warning" size={size}>
      DIRECT EXECUTION
    </Badge>
  );
}
