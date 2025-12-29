import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { ExpiryWarning } from "@/types";

// Warehouse occupancy data point for chart
export interface WarehouseOccupancyData {
  warehouse_id: string;
  warehouse_name: string;
  occupied: number;
  empty: number;
  total: number;
  occupancy_rate: number;
}

// Movement history data point for chart
export interface MovementHistoryData {
  date: string;
  receipts: number;
  issues: number;
  total: number;
}

// Supplier distribution data point for pie chart
export interface SupplierDistributionData {
  supplier_id: string | null;
  supplier_name: string;
  product_count: number;
  total_quantity_kg: number;
}

// Occupancy history data point for trend chart
export interface OccupancyHistoryPoint {
  date: string;
  warehouse_id: string | null;
  warehouse_name: string | null;
  total_bins: number;
  occupied_bins: number;
  empty_bins: number;
  occupancy_rate: number;
}

// Occupancy history response
export interface OccupancyHistoryResponse {
  data: OccupancyHistoryPoint[];
  start_date: string;
  end_date: string;
}

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
    expired: number;
  };
  today_movements: number;
  today_receipts: number;
  today_issues: number;
  warehouse_occupancy: WarehouseOccupancyData[];
  movement_history: MovementHistoryData[];
  supplier_distribution: SupplierDistributionData[];
}

/**
 * Query for dashboard statistics
 * Fetches aggregated KPIs and chart data from backend
 */
export const dashboardStatsQueryOptions = (warehouseId?: string) =>
  queryOptions({
    queryKey: ["dashboard", "stats", warehouseId],
    queryFn: async (): Promise<DashboardStats> => {
      const params = warehouseId ? { warehouse_id: warehouseId } : {};
      const response = await apiClient.get<DashboardStats>("/dashboard/stats", { params });
      return response.data;
    },
  });

// API response format for expiry warnings
interface ExpiryWarningResponse {
  items: ExpiryWarning[];
  summary: {
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    total_count: number;
  };
  warehouse_id: string | null;
}

/**
 * Query for expiry warnings list (limited for dashboard)
 */
export const expiryWarningsQueryOptions = (limit = 10) =>
  queryOptions({
    queryKey: ["expiry-warnings", limit],
    queryFn: async () => {
      const { data } = await apiClient.get<ExpiryWarningResponse>(
        "/inventory/expiry-warnings",
        {
          params: { days_threshold: 60 },
        }
      );
      // Return items array, limited to requested count
      return data.items.slice(0, limit);
    },
  });

/**
 * Query for full expiry warnings response (for reports)
 */
export const expiryWarningsFullQueryOptions = (params?: {
  days_threshold?: number;
  warehouse_id?: string;
}) =>
  queryOptions({
    queryKey: ["expiry-warnings-full", params],
    queryFn: async (): Promise<ExpiryWarningResponse> => {
      const { data } = await apiClient.get<ExpiryWarningResponse>(
        "/inventory/expiry-warnings",
        {
          params: {
            days_threshold: params?.days_threshold ?? 60,
            warehouse_id: params?.warehouse_id,
          },
        }
      );
      return data;
    },
  });

/**
 * Query for occupancy history (for trend chart)
 */
export const occupancyHistoryQueryOptions = (params?: {
  days?: number;
  warehouse_id?: string;
}) =>
  queryOptions({
    queryKey: ["reports", "occupancy-history", params],
    queryFn: async (): Promise<OccupancyHistoryResponse> => {
      const { data } = await apiClient.get<OccupancyHistoryResponse>(
        "/reports/occupancy-history",
        {
          params: {
            days: params?.days ?? 30,
            warehouse_id: params?.warehouse_id,
          },
        }
      );
      return data;
    },
  });
