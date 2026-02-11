// vTON halving mechanism simulation utilities
// Pure client-side calculations matching the on-chain vTON contract logic

export const MAX_SUPPLY = 100_000_000;
export const EPOCH_SIZE = 5_000_000;
export const DECAY_RATE = 0.75;
export const INITIAL_HALVING_RATE = 1.0;
export const MAX_EPOCHS = 20;

export function getEpoch(totalSupply: number): number {
  return Math.min(Math.floor(totalSupply / EPOCH_SIZE), MAX_EPOCHS);
}

export function getHalvingRatio(epoch: number): number {
  if (epoch >= MAX_EPOCHS) return Math.pow(DECAY_RATE, MAX_EPOCHS);
  return Math.pow(DECAY_RATE, epoch);
}

export interface MintResult {
  actualMinted: number;
  newSupply: number;
  epoch: number;
  ratio: number;
}

export function simulateMint(
  totalSupply: number,
  rawAmount: number,
  emissionRatio: number
): MintResult {
  if (totalSupply >= MAX_SUPPLY) {
    return {
      actualMinted: 0,
      newSupply: totalSupply,
      epoch: getEpoch(totalSupply),
      ratio: getHalvingRatio(getEpoch(totalSupply)),
    };
  }

  let remaining = rawAmount;
  let supply = totalSupply;
  let totalMinted = 0;

  while (remaining > 0 && supply < MAX_SUPPLY) {
    const currentEpoch = getEpoch(supply);
    const halvingRatio = getHalvingRatio(currentEpoch);
    const effectiveRatio = halvingRatio * emissionRatio;

    // How much raw amount fits in the current epoch?
    const epochCeiling = Math.min((currentEpoch + 1) * EPOCH_SIZE, MAX_SUPPLY);
    const roomInEpoch = epochCeiling - supply;

    // How much raw amount would fill the remaining room in this epoch?
    const rawNeededForRoom =
      effectiveRatio > 0 ? roomInEpoch / effectiveRatio : Infinity;
    const rawToUse = Math.min(remaining, rawNeededForRoom);

    const minted = Math.min(rawToUse * effectiveRatio, MAX_SUPPLY - supply);
    supply += minted;
    totalMinted += minted;
    remaining -= rawToUse;
  }

  const finalEpoch = getEpoch(supply);
  return {
    actualMinted: totalMinted,
    newSupply: supply,
    epoch: finalEpoch,
    ratio: getHalvingRatio(finalEpoch),
  };
}

export interface EpochRow {
  epoch: number;
  halvingRatio: number;
  epochMintable: number;
  cumulativeSupply: number;
}

export function generateEpochTable(): EpochRow[] {
  const rows: EpochRow[] = [];
  let cumulative = 0;

  for (let epoch = 0; epoch < MAX_EPOCHS; epoch++) {
    const ratio = getHalvingRatio(epoch);
    // In each epoch, EPOCH_SIZE worth of vTON is the raw slot,
    // but the actual mintable amount depends on the halving ratio.
    // The epoch boundary is at (epoch+1)*EPOCH_SIZE in totalSupply space,
    // so exactly EPOCH_SIZE of totalSupply is allocated per epoch.
    const epochMintable = EPOCH_SIZE;
    cumulative += epochMintable;

    rows.push({
      epoch,
      halvingRatio: ratio,
      epochMintable,
      cumulativeSupply: Math.min(cumulative, MAX_SUPPLY),
    });
  }

  return rows;
}

export interface EpochTimeEstimate {
  epoch: number;
  rawTonNeeded: number;
  cumulativeRawTon: number;
  days: number;
  cumulativeDays: number;
  formattedTime: string;
}

export function generateEpochTimeEstimates(
  seignioragePerBlock: number,
  blockTimeSec: number
): EpochTimeEstimate[] {
  if (seignioragePerBlock <= 0 || blockTimeSec <= 0) return [];

  const tonPerDay = seignioragePerBlock * (86400 / blockTimeSec);
  const estimates: EpochTimeEstimate[] = [];
  let cumulativeRaw = 0;
  let cumulativeDays = 0;

  for (let epoch = 0; epoch < MAX_EPOCHS; epoch++) {
    const ratio = getHalvingRatio(epoch);
    const rawNeeded = ratio > 0 ? EPOCH_SIZE / ratio : Infinity;
    const days = rawNeeded / tonPerDay;
    cumulativeRaw += rawNeeded;
    cumulativeDays += days;

    estimates.push({
      epoch,
      rawTonNeeded: rawNeeded,
      cumulativeRawTon: cumulativeRaw,
      days,
      cumulativeDays,
      formattedTime: formatDuration(cumulativeDays),
    });
  }

  return estimates;
}

export function formatDuration(totalDays: number): string {
  if (!isFinite(totalDays) || totalDays < 0) return "-";

  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  const days = Math.floor(totalDays % 30);

  if (years > 0 && months > 0) return `${years}y ${months}mo`;
  if (years > 0) return `${years}y`;
  if (months > 0 && days > 0) return `${months}mo ${days}d`;
  if (months > 0) return `${months}mo`;
  if (days > 0) return `${days}d`;
  return "<1d";
}

export interface SupplyCurvePoint {
  rawMinted: number;
  totalSupply: number;
}

export function generateSupplyCurve(): SupplyCurvePoint[] {
  const points: SupplyCurvePoint[] = [{ rawMinted: 0, totalSupply: 0 }];

  // Simulate incremental minting to trace the curve
  let supply = 0;
  let rawCumulative = 0;
  const step = 500_000; // 500K raw per step for smooth curve

  while (supply < MAX_SUPPLY) {
    const epoch = getEpoch(supply);
    const ratio = getHalvingRatio(epoch);

    // With emissionRatio = 1, effectiveRatio = halvingRatio
    const epochCeiling = Math.min((epoch + 1) * EPOCH_SIZE, MAX_SUPPLY);
    const roomInEpoch = epochCeiling - supply;

    // Raw amount needed to fill this epoch
    const rawNeededForEpoch = ratio > 0 ? roomInEpoch / ratio : Infinity;

    if (rawNeededForEpoch <= step) {
      // Fill this epoch completely
      rawCumulative += rawNeededForEpoch;
      supply = epochCeiling;
      points.push({ rawMinted: rawCumulative, totalSupply: supply });
    } else {
      // Partial step within this epoch
      const minted = step * ratio;
      rawCumulative += step;
      supply += minted;
      supply = Math.min(supply, MAX_SUPPLY);
      points.push({ rawMinted: rawCumulative, totalSupply: supply });
    }
  }

  return points;
}
