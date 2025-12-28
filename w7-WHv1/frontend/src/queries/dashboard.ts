import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { ExpiryWarning } from "@/types";

// Dashboard statistics interface
export interface DashboardStats {
  total_stock_kg: number;
  total_products: number;
  total_batches: number;
  occupancy_rate: number;
  occupied_bins: number;
  total_bins: number;
  expiry_warnings: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  today_movements: number;
  today_receipts: number;
  today_issues: number;
}

/**
 * Query for dashboard statistics
 * Aggregates data from multiple endpoints
 */
export const dashboardStatsQueryOptions = () =>
  queryOptions({
    queryKey: ["dashboard", "stats"],
    queryFn: async (): Promise<DashboardStats> => {
      // For now, return mock data
      // In production, this would aggregate from:
      // - GET /reports/inventory-summary
      // - GET /bins (count)
      // - GET /inventory/expiry-warnings
      // - GET /movements (filter by today)

      return {
        total_stock_kg: 0,
        total_products: 0,
        total_batches: 0,
        occupancy_rate: 0,
        occupied_bins: 0,
        total_bins: 0,
        expiry_warnings: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        today_movements: 0,
        today_receipts: 0,
        today_issues: 0,
      };
    },
  });

/**
 * Query for expiry warnings list
 */
export const expiryWarningsQueryOptions = (limit = 10) =>
  queryOptions({
    queryKey: ["expiry-warnings", limit],
    queryFn: async () => {
      const { data } = await apiClient.get<ExpiryWarning[]>(
        "/inventory/expiry-warnings",
        {
          params: { limit },
        }
      );
      return data;
    },
  });
