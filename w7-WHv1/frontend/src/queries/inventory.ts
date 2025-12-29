import { queryOptions, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// Types matching backend schemas
export interface ReceiveRequest {
  bin_id: string;
  product_id: string;
  supplier_id?: string;
  batch_number: string;
  use_by_date: string;
  quantity: number;
  unit: string;
  weight_kg?: number;
  reference_number?: string;
  notes?: string;
}

export interface IssueRequest {
  bin_content_id: string;
  quantity: number;
  reason: string;
  reference_number?: string;
  force_non_fefo?: boolean;
  override_reason?: string;
  notes?: string;
}

export interface ScrapRequest {
  bin_content_id: string;
  quantity: number;
  reason: string;
  notes?: string;
}

export interface FEFORecommendation {
  bin_id: string;
  bin_content_id: string;
  bin_code: string;
  batch_number: string;
  use_by_date: string;
  days_until_expiry: number;
  available_quantity: number;
  suggested_quantity: number;
  is_fefo_compliant: boolean;
  warning?: string;
}

export interface FEFORecommendationResponse {
  product_id: string;
  product_name: string;
  sku?: string;
  requested_quantity: number;
  recommendations: FEFORecommendation[];
  total_available: number;
  fefo_warnings: string[];
}

export interface StockLevel {
  bin_content_id: string;
  bin_code: string;
  warehouse_id: string;
  warehouse_name: string;
  product_id: string;
  product_name: string;
  sku?: string;
  batch_number: string;
  quantity: number;
  unit: string;
  weight_kg: number;
  use_by_date: string;
  days_until_expiry: number;
  status: string;
  // Supplier info
  supplier_id?: string;
  supplier_name?: string;
  // FEFO compliance info
  is_fefo_compliant: boolean;
  oldest_bin_code?: string;
  oldest_use_by_date?: string;
  oldest_days_until_expiry?: number;
}

export interface StockFilters {
  product_id?: string;
  warehouse_id?: string;
  search?: string;
}

// Query keys
export const inventoryKeys = {
  all: ["inventory"] as const,
  stock: () => [...inventoryKeys.all, "stock"] as const,
  stockLevels: (filters: StockFilters) => [...inventoryKeys.stock(), filters] as const,
  fefo: () => [...inventoryKeys.all, "fefo"] as const,
  fefoRec: (productId: string, quantity: number, warehouseId?: string) =>
    [...inventoryKeys.fefo(), productId, quantity, warehouseId] as const,
};

// Queries
export const stockLevelsQueryOptions = (filters: StockFilters = {}) =>
  queryOptions({
    queryKey: inventoryKeys.stockLevels(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<StockLevel[]>("/inventory/stock-levels", {
        params: filters,
      });
      return data;
    },
  });

export const fefoRecommendationQueryOptions = (
  productId: string,
  quantity: number,
  warehouseId?: string
) =>
  queryOptions({
    queryKey: inventoryKeys.fefoRec(productId, quantity, warehouseId),
    queryFn: async () => {
      const { data } = await apiClient.get<FEFORecommendationResponse>(
        "/inventory/fefo-recommendation",
        {
          params: { product_id: productId, quantity: quantity },
        }
      );
      return data;
    },
    enabled: !!productId && quantity > 0,
  });

// Mutations
export function useReceiveGoods() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ReceiveRequest) => {
      const response = await apiClient.post("/inventory/receive", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["bins"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useIssueGoods() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: IssueRequest) => {
      const response = await apiClient.post("/inventory/issue", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["bins"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
    },
  });
}

export function useScrapGoods() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ScrapRequest) => {
      const response = await apiClient.post("/inventory/scrap", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["bins"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
    },
  });
}

// Hook for easy stock fetching
export function useStockLevels(filters: StockFilters = {}) {
  return useQuery(stockLevelsQueryOptions(filters));
}
