/**
 * Bin Color Logic for Warehouse Map
 *
 * Priority layers (highest to lowest):
 * 1. Expired (red) - always visible
 * 2. Critical (<3 days) - red
 * 3. High (3-7 days) - orange
 * 4. Medium (7-14 days) - yellow
 * 5. Base Status - green (empty), blue (occupied), purple (reserved), gray (inactive)
 */

import type { BinWithContent, ExpiryUrgency } from "@/types";

export interface BinColorConfig {
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

/**
 * Get the highest priority urgency from bin contents
 * Only considers contents with quantity > 0
 */
function getHighestUrgency(bin: BinWithContent): ExpiryUrgency | null {
  if (!bin.contents || bin.contents.length === 0) {
    return null;
  }

  // Only consider contents with quantity > 0
  const urgencies = bin.contents
    .filter((c) => c.quantity > 0)
    .map((c) => c.urgency)
    .filter((u): u is ExpiryUrgency => u !== null);

  if (urgencies.length === 0) {
    return null;
  }

  // Priority order: expired > critical > high > medium > low
  if (urgencies.includes("expired")) return "expired";
  if (urgencies.includes("critical")) return "critical";
  if (urgencies.includes("high")) return "high";
  if (urgencies.includes("medium")) return "medium";
  return "low";
}

/**
 * Get bin color based on status and expiry urgency
 *
 * Tailwind CSS color classes (mapped to HSL variables):
 * - Expired/Critical: red-500 (hsl(0 72% 51%))
 * - High: orange-500 (hsl(25 95% 53%))
 * - Medium: yellow-500 (hsl(45 93% 47%))
 * - Empty: green-500 (hsl(142 71% 45%))
 * - Occupied: blue-500 (hsl(217 91% 60%))
 * - Reserved: purple-500 (hsl(271 91% 65%))
 * - Inactive: gray-400 (hsl(214 32% 59%))
 */
export function getBinColor(bin: BinWithContent): BinColorConfig {
  // Inactive bins are always gray
  if (!bin.is_active) {
    return {
      fill: "hsl(214 32% 59%)", // gray-400
      stroke: "hsl(214 32% 49%)", // gray-500
      strokeWidth: 1,
    };
  }

  // Check for expiry urgency (highest priority)
  const urgency = getHighestUrgency(bin);

  if (urgency === "expired" || urgency === "critical") {
    return {
      fill: "hsl(0 72% 51%)", // red-500
      stroke: "hsl(0 72% 41%)", // red-600 (darker stroke for emphasis)
      strokeWidth: 2,
    };
  }

  if (urgency === "high") {
    return {
      fill: "hsl(25 95% 53%)", // orange-500
      stroke: "hsl(25 95% 43%)", // orange-600
      strokeWidth: 2,
    };
  }

  if (urgency === "medium") {
    return {
      fill: "hsl(45 93% 47%)", // yellow-500
      stroke: "hsl(45 93% 37%)", // yellow-600
      strokeWidth: 1,
    };
  }

  // Base status colors (no urgent expiry)
  switch (bin.status) {
    case "empty":
      return {
        fill: "hsl(142 71% 45%)", // green-500
        stroke: "hsl(142 71% 35%)", // green-600
        strokeWidth: 1,
      };
    case "occupied":
      return {
        fill: "hsl(217 91% 60%)", // blue-500
        stroke: "hsl(217 91% 50%)", // blue-600
        strokeWidth: 1,
      };
    case "reserved":
      return {
        fill: "hsl(271 91% 65%)", // purple-500
        stroke: "hsl(271 91% 55%)", // purple-600
        strokeWidth: 1,
      };
    case "inactive":
      return {
        fill: "hsl(214 32% 59%)", // gray-400
        stroke: "hsl(214 32% 49%)", // gray-500
        strokeWidth: 1,
      };
    default:
      return {
        fill: "hsl(214 32% 59%)", // gray-400 (fallback)
        stroke: "hsl(214 32% 49%)",
        strokeWidth: 1,
      };
  }
}

/**
 * Get urgency badge color class
 */
export function getUrgencyBadgeColor(urgency: ExpiryUrgency | null): string {
  if (!urgency) return "bg-gray-500";

  switch (urgency) {
    case "expired":
    case "critical":
      return "bg-red-500";
    case "high":
      return "bg-orange-500";
    case "medium":
      return "bg-yellow-500";
    case "low":
      return "bg-green-500";
    default:
      return "bg-gray-500";
  }
}

/**
 * Get status badge color class
 */
export function getStatusBadgeColor(status: string): string {
  switch (status) {
    case "empty":
      return "bg-green-500";
    case "occupied":
      return "bg-blue-500";
    case "reserved":
      return "bg-purple-500";
    case "inactive":
      return "bg-gray-400";
    default:
      return "bg-gray-500";
  }
}
