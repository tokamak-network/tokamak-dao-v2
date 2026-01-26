"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSecurityCouncil } from "@/hooks/contracts/useSecurityCouncil";

/**
 * Security Council Status Section
 * Shows Security Council members, threshold, and pending actions
 */
export function SecurityCouncilStatus() {
  const { members, threshold, pendingActionsCount, isDeployed } =
    useSecurityCouncil();

  const memberCount = Array.isArray(members) ? members.length : 0;
  const thresholdNum = Number(threshold);
  const pendingCount = Number(pendingActionsCount);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Security Council
          {pendingCount > 0 && (
            <Badge variant="warning" size="sm">
              {pendingCount} Pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isDeployed && (
          <div className="text-center py-2 mb-4 text-[var(--text-tertiary)]">
            <p className="text-xs">
              Showing default values (contracts not deployed)
            </p>
          </div>
        )}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {memberCount}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">Members</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {thresholdNum}/{memberCount || 1}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">Threshold</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {pendingCount}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              Pending Actions
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
