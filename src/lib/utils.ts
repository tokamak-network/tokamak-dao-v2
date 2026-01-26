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
