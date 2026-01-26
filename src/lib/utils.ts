import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes with conflict resolution
 * Uses clsx for conditional class composition and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format address for display (0x1234...5678)
 */
export function formatAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format number with commas and optional decimals
 */
export function formatNumber(
  value: number | string,
  options?: {
    decimals?: number;
    compact?: boolean;
  }
): string {
  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num)) return "0";

  if (options?.compact) {
    const formatter = new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: options.decimals ?? 1,
    });
    return formatter.format(num);
  }

  const formatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: options?.decimals ?? 2,
    minimumFractionDigits: 0,
  });
  return formatter.format(num);
}

/**
 * Format date to human readable string
 */
export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  });
}

/**
 * Format vTON amount (18 decimals)
 */
export function formatVTON(
  value: bigint | string | number,
  options?: {
    decimals?: number;
    compact?: boolean;
  }
): string {
  const bigValue = typeof value === "bigint" ? value : BigInt(value || 0);
  const decimals = 18;
  const divisor = BigInt(10 ** decimals);
  const integerPart = bigValue / divisor;
  const fractionalPart = bigValue % divisor;

  // Convert to number for formatting
  const numValue =
    Number(integerPart) + Number(fractionalPart) / Number(divisor);

  return formatNumber(numValue, {
    decimals: options?.decimals ?? 2,
    compact: options?.compact,
  });
}

/**
 * Format basis points to percentage string
 * @param value - Basis points (e.g., 2000 = 20%)
 */
export function formatBasisPoints(value: bigint | number): string {
  const num = typeof value === "bigint" ? Number(value) : value;
  const percentage = num / 100;
  return `${percentage}%`;
}

/**
 * Format 18-decimal percentage to string
 * @param value - Value with 18 decimals (e.g., 1e18 = 100%, 1e17 = 10%)
 */
export function formatPercentage18(value: bigint | number): string {
  const bigValue = typeof value === "bigint" ? value : BigInt(value || 0);
  const divisor = BigInt(10 ** 16); // 1e18 = 100%, so divide by 1e16 to get percentage
  const percentage = Number(bigValue) / Number(divisor);
  return `${formatNumber(percentage, { decimals: 2 })}%`;
}

/**
 * Format duration from seconds to human readable string
 * @param seconds - Duration in seconds
 */
export function formatDuration(seconds: bigint | number): string {
  const secs = typeof seconds === "bigint" ? Number(seconds) : seconds;

  if (secs < 60) {
    return `${secs}s`;
  }

  if (secs < 3600) {
    const mins = Math.floor(secs / 60);
    return `${mins}m`;
  }

  if (secs < 86400) {
    const hours = Math.floor(secs / 3600);
    return `${hours}h`;
  }

  const days = Math.floor(secs / 86400);
  if (days === 1) {
    return "1 day";
  }
  return `${days} days`;
}

/**
 * Truncate string in the middle with ellipsis
 */
export function truncateMiddle(
  str: string,
  startChars: number = 6,
  endChars: number = 4
): string {
  if (str.length <= startChars + endChars) {
    return str;
  }
  return `${str.slice(0, startChars)}...${str.slice(-endChars)}`;
}
