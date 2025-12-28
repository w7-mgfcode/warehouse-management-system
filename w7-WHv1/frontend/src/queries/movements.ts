import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { BinMovement, PaginatedResponse, MovementType } from "@/types";

export interface MovementFilters {
  product_id?: string;
  bin_id?: string;
  movement_type?: MovementType;
  start_date?: string;
  end_date?: string;
  created_by?: string;
  page?: number;
  page_size?: number;
}

// Query keys
export const movementKeys = {
  all: ["movements"] as const,
  lists: () => [...movementKeys.all, "list"] as const,
  list: (filters: MovementFilters) => [...movementKeys.lists(), filters] as const,
  details: () => [...movementKeys.all, "detail"] as const,
  detail: (id: string) => [...movementKeys.details(), id] as const,
};

// Query options
export const movementsQueryOptions = (filters: MovementFilters = {}) =>
  queryOptions({
    queryKey: movementKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<BinMovement>>(
        "/movements",
        { params: filters }
      );
      return data;
    },
  });

export const movementQueryOptions = (id: string) =>
  queryOptions({
    queryKey: movementKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<BinMovement>(`/movements/${id}`);
      return data;
    },
    enabled: !!id,
  });

// Hook for easy fetching
export function useMovements(filters: MovementFilters = {}) {
  return useQuery(movementsQueryOptions(filters));
}
