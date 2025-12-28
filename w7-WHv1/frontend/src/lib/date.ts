import { format, formatDistance, differenceInDays, parseISO } from "date-fns";
import { hu } from "date-fns/locale";
import type { ExpiryUrgency } from "@/types";

/**
 * Format date in Hungarian format: yyyy. MM. dd.
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "yyyy. MM. dd.", { locale: hu });
}

/**
 * Format datetime in Hungarian format: yyyy. MM. dd. HH:mm
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "yyyy. MM. dd. HH:mm", { locale: hu });
}

/**
 * Format relative time in Hungarian (e.g., "2 napja", "3 nap múlva")
 */
export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistance(d, new Date(), { addSuffix: true, locale: hu });
}

/**
 * Calculate days until expiry (negative if expired)
 */
export function getDaysUntilExpiry(useByDate: Date | string): number {
  const d = typeof useByDate === "string" ? parseISO(useByDate) : useByDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDay = new Date(d);
  expiryDay.setHours(0, 0, 0, 0);
  return differenceInDays(expiryDay, today);
}

/**
 * Get expiry urgency level based on days until expiry
 */
export function getExpiryUrgency(
  useByDate: Date | string
): ExpiryUrgency {
  const days = getDaysUntilExpiry(useByDate);
  if (days < 0) return "expired";
  if (days < 7) return "critical";
  if (days < 14) return "high";
  if (days < 30) return "medium";
  return "low";
}

/**
 * Format expiry warning message in Hungarian
 */
export function formatExpiryWarning(days: number): string {
  if (days < 0) return `LEJÁRT (${Math.abs(days)} napja)`;
  if (days === 0) return "MA LEJÁR!";
  if (days === 1) return "Holnap lejár!";
  return `${days} nap múlva lejár`;
}

/**
 * Get CSS class for expiry urgency badge
 */
export function getExpiryBadgeClass(urgency: ExpiryUrgency): string {
  const classes = {
    expired: "bg-expiry-critical text-white",
    critical: "bg-expiry-critical text-white animate-pulse",
    high: "bg-expiry-high text-white",
    medium: "bg-expiry-medium text-black",
    low: "bg-expiry-low text-white",
  };
  return classes[urgency];
}
