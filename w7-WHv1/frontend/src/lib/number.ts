/**
 * Number formatting utilities with Hungarian locale
 * Format: comma decimal separator, space thousands separator
 * Example: 1234.56 → "1 234,56"
 */

/**
 * Format number with Hungarian locale
 * Manual implementation to ensure consistent formatting across environments
 */
export function formatNumber(value: number | string, decimals = 2): string {
  // Convert string to number if needed (handles backend Decimal serialization)
  const numValue = typeof value === "string" ? parseFloat(value) : value;

  // Handle invalid numbers
  if (isNaN(numValue)) {
    return "0";
  }

  const fixed = numValue.toFixed(decimals);
  const [integerPart, decimalPart] = fixed.split(".");

  // Add space thousands separator
  const withSeparator = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  // Use comma as decimal separator
  return decimalPart ? `${withSeparator},${decimalPart}` : withSeparator;
}

/**
 * Format weight in kilograms
 */
export function formatWeight(kg: number | string): string {
  return `${formatNumber(kg)} kg`;
}

/**
 * Format quantity with unit label
 */
export function formatQuantity(value: number | string, unit: string): string {
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
export function formatPercentage(value: number | string, decimals = 1): string {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return `${formatNumber(numValue * 100, decimals)}%`;
}

/**
 * Format currency in Hungarian Forint
 * Manual implementation to ensure consistent formatting across environments
 */
export function formatCurrency(value: number | string): string {
  // Convert string to number if needed
  const numValue = typeof value === "string" ? parseFloat(value) : value;

  // HUF doesn't use decimals, so round to integer
  const rounded = Math.round(numValue);
  const integerStr = String(rounded);

  // Add space thousands separator
  const withSeparator = integerStr.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  return `${withSeparator} Ft`;
}

/**
 * Parse Hungarian formatted number back to JavaScript number
 */
export function parseHungarianNumber(value: string): number {
  // Replace space thousands separator and comma decimal
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  return parseFloat(normalized);
}
