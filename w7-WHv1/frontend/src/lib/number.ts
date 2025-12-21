/**
 * Number formatting utilities with Hungarian locale
 * Format: comma decimal separator, space thousands separator
 * Example: 1234.56 → "1 234,56"
 */

/**
 * Format number with Hungarian locale
 */
export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("hu-HU", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format weight in kilograms
 */
export function formatWeight(kg: number): string {
  return `${formatNumber(kg)} kg`;
}

/**
 * Format quantity with unit label
 */
export function formatQuantity(value: number, unit: string): string {
  const unitLabels: Record<string, string> = {
    db: "db",
    kg: "kg",
    l: "l",
    m: "m",
    csomag: "cs",
  };
  return `${formatNumber(value, 0)} ${unitLabels[unit] || unit}`;
}

/**
 * Format percentage (0.85 → "85,0%")
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${formatNumber(value * 100, decimals)}%`;
}

/**
 * Format currency in Hungarian Forint
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    minimumFractionDigits: 0,
  }).format(value);
}

/**
 * Parse Hungarian formatted number back to JavaScript number
 */
export function parseHungarianNumber(value: string): number {
  // Replace space thousands separator and comma decimal
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  return parseFloat(normalized);
}
