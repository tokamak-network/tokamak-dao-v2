"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  simulateMint,
  getEpoch,
  getHalvingRatio,
  MAX_SUPPLY,
} from "@/lib/halving";
import { SupplyProgressBar } from "./SupplyProgressBar";

export interface MintHistoryEntry {
  id: number;
  rawAmount: number;
  actualMinted: number;
  epoch: number;
  halvingRatio: number;
  cumulativeSupply: number;
  cumulativeRaw: number;
}

interface MintSimulatorProps {
  history: MintHistoryEntry[];
  totalSupply: number;
  onMint: (entry: MintHistoryEntry) => void;
  onReset: () => void;
}

export function MintSimulator({
  history,
  totalSupply,
  onMint,
  onReset,
}: MintSimulatorProps) {
  const [rawAmount, setRawAmount] = useState<string>("1000000");
  const [emissionRatio, setEmissionRatio] = useState<number>(100);

  const currentEpoch = getEpoch(totalSupply);
  const currentRatio = getHalvingRatio(currentEpoch);
  const remainingSupply = MAX_SUPPLY - totalSupply;

  const handleMint = useCallback(() => {
    const amount = Number(rawAmount);
    if (isNaN(amount) || amount <= 0) return;

    const result = simulateMint(totalSupply, amount, emissionRatio / 100);
    const cumulativeRaw =
      (history.length > 0 ? history[history.length - 1].cumulativeRaw : 0) +
      amount;

    onMint({
      id: history.length + 1,
      rawAmount: amount,
      actualMinted: result.actualMinted,
      epoch: result.epoch,
      halvingRatio: result.ratio,
      cumulativeSupply: result.newSupply,
      cumulativeRaw,
    });
  }, [rawAmount, emissionRatio, totalSupply, history, onMint]);

  return (
    <div className="space-y-6">
      {/* Current State */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="Current Epoch" value={String(currentEpoch)} />
        <StatBox
          label="Halving Ratio"
          value={`${(currentRatio * 100).toFixed(2)}%`}
        />
        <StatBox label="Total Supply" value={formatNumber(totalSupply)} />
        <StatBox label="Remaining" value={formatNumber(remainingSupply)} />
      </div>

      {/* Progress Bar */}
      <SupplyProgressBar totalSupply={totalSupply} currentEpoch={currentEpoch} />

      {/* Controls */}
      <Card variant="outlined" padding="md">
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="rawAmount">TON Amount</Label>
              <Input
                id="rawAmount"
                type="number"
                value={rawAmount}
                onChange={(e) => setRawAmount(e.target.value)}
                min={0}
                placeholder="1,000,000"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label htmlFor="emissionRatio">Emission Ratio</Label>
                <span className="text-sm font-mono text-[var(--text-secondary)]">
                  {emissionRatio}%
                </span>
              </div>
              <input
                id="emissionRatio"
                type="range"
                min={0}
                max={100}
                value={emissionRatio}
                onChange={(e) => setEmissionRatio(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-[var(--bg-tertiary)] accent-[var(--fg-brand-primary)]"
              />
            </div>
            <Button
              variant="primary"
              onClick={handleMint}
              disabled={totalSupply >= MAX_SUPPLY}
            >
              Mint
            </Button>
            <Button variant="secondary" onClick={onReset}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mint History Table */}
      {history.length > 0 && (
        <Card variant="outlined" padding="none">
          <CardHeader className="px-4 pt-4">
            <CardTitle className="text-base">Mint History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-primary)]">
                    <th className="text-left py-2 px-3 text-[var(--text-secondary)] font-medium">
                      #
                    </th>
                    <th className="text-right py-2 px-3 text-[var(--text-secondary)] font-medium">
                      TON Minted
                    </th>
                    <th className="text-right py-2 px-3 text-[var(--text-secondary)] font-medium">
                      vTON Minted
                    </th>
                    <th className="text-right py-2 px-3 text-[var(--text-secondary)] font-medium">
                      Epoch
                    </th>
                    <th className="text-right py-2 px-3 text-[var(--text-secondary)] font-medium">
                      Ratio
                    </th>
                    <th className="text-right py-2 px-3 text-[var(--text-secondary)] font-medium">
                      Cumulative
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-[var(--border-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <td className="py-2 px-3 text-[var(--text-primary)]">
                        {entry.id}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[var(--text-primary)]">
                        {formatNumber(entry.rawAmount)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[var(--text-primary)]">
                        {formatNumber(entry.actualMinted)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Badge variant="primary" size="sm">
                          {entry.epoch}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[var(--text-primary)]">
                        {(entry.halvingRatio * 100).toFixed(2)}%
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[var(--text-primary)]">
                        {formatNumber(entry.cumulativeSupply)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3">
      <div className="text-xs text-[var(--text-tertiary)] mb-1">{label}</div>
      <div className="text-lg font-semibold font-mono text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}
