import type { StakerData } from "./subgraph";

export type StakeMetric = "totalDeposited" | "netStaked";

export interface AirdropParams {
  totalBudget: number; // total airdrop amount (vTON)
  stakeMetric: StakeMetric;
  periodFrom: number; // unix seconds
  periodTo: number; // unix seconds
  minStakeThreshold: number; // minimum stake (TON)
}

export interface StakerAllocation {
  address: string;
  totalDeposited: number;
  netStaked: number;
  durationDays: number;
  score: number;
  allocation: number;
  percentage: number;
}

export interface AirdropSummary {
  eligibleCount: number;
  totalScore: number;
  meanAllocation: number;
  medianAllocation: number;
  maxAllocation: number;
  top10Concentration: number; // % of total budget going to top 10
}

export interface AirdropResult {
  allocations: StakerAllocation[];
  summary: AirdropSummary;
}

export function calculateAirdrop(
  stakers: StakerData[],
  params: AirdropParams
): AirdropResult {
  const { totalBudget, stakeMetric, periodFrom, periodTo, minStakeThreshold } = params;
  const now = Math.floor(Date.now() / 1000);
  const effectiveTo = Math.min(periodTo, now);

  // Calculate scores for each staker
  const scored: StakerAllocation[] = [];

  for (const staker of stakers) {
    // Filter: must have staked before periodTo
    if (staker.firstStakedAt > periodTo) continue;

    // Get stake amount based on metric
    let stakeAmount: number;
    if (stakeMetric === "totalDeposited") {
      stakeAmount = staker.totalDeposited;
    } else {
      stakeAmount = Math.max(staker.netStaked, 0);
      // netStaked metric: skip stakers with no current stake
      if (stakeAmount <= 0) continue;
    }

    // Min stake threshold
    if (stakeAmount < minStakeThreshold) continue;

    // Duration: clamp to [periodFrom, effectiveTo]
    const start = Math.max(periodFrom, staker.firstStakedAt);
    const durationDays = Math.max(0, (effectiveTo - start) / 86400);

    if (durationDays <= 0) continue;

    const score = stakeAmount * durationDays;

    scored.push({
      address: staker.address,
      totalDeposited: staker.totalDeposited,
      netStaked: staker.netStaked,
      durationDays,
      score,
      allocation: 0,
      percentage: 0,
    });
  }

  // Calculate total score
  const totalScore = scored.reduce((sum, s) => sum + s.score, 0);

  // Allocate proportionally
  if (totalScore > 0) {
    for (const s of scored) {
      s.percentage = (s.score / totalScore) * 100;
      s.allocation = (s.score / totalScore) * totalBudget;
    }
  }

  // Sort by allocation descending
  scored.sort((a, b) => b.allocation - a.allocation);

  // Summary statistics
  const allocations = scored.map((s) => s.allocation);
  const eligibleCount = scored.length;

  const meanAllocation = eligibleCount > 0 ? totalBudget / eligibleCount : 0;

  const sortedAllocs = [...allocations].sort((a, b) => a - b);
  const medianAllocation =
    eligibleCount > 0
      ? eligibleCount % 2 === 1
        ? sortedAllocs[Math.floor(eligibleCount / 2)]
        : (sortedAllocs[eligibleCount / 2 - 1] + sortedAllocs[eligibleCount / 2]) / 2
      : 0;

  const maxAllocation = eligibleCount > 0 ? allocations[0] : 0;

  const top10Sum = scored.slice(0, 10).reduce((sum, s) => sum + s.allocation, 0);
  const top10Concentration = totalBudget > 0 ? (top10Sum / totalBudget) * 100 : 0;

  return {
    allocations: scored,
    summary: {
      eligibleCount,
      totalScore,
      meanAllocation,
      medianAllocation,
      maxAllocation,
      top10Concentration,
    },
  };
}
