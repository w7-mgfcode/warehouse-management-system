import { queryOptions, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Warehouse, PaginatedResponse } from "@/types";

export interface WarehouseFilters {
  search?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export interface WarehouseCreate {
  name: string;
  code: string;
  address?: string;
  is_active?: boolean;
}

export type WarehouseUpdate = Partial<WarehouseCreate>;

// Query keys factory
export const warehouseKeys = {
  all: ["warehouses"] as const,
  lists: () => [...warehouseKeys.all, "list"] as const,
  list: (filters: WarehouseFilters) => [...warehouseKeys.lists(), filters] as const,
  details: () => [...warehouseKeys.all, "detail"] as const,
  detail: (id: string) => [...warehouseKeys.details(), id] as const,
};

// Query options
export const warehousesQueryOptions = (filters: WarehouseFilters = {}) =>
  queryOptions({
    queryKey: warehouseKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Warehouse>>(
        "/warehouses",
        { params: filters }
      );
      return data;
    },
  });

export const warehouseQueryOptions = (id: string) =>
  queryOptions({
    queryKey: warehouseKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Warehouse>(`/warehouses/${id}`);
      return data;
    },
    enabled: !!id,
  });

// Mutations
export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (warehouse: WarehouseCreate) => {
      const { data } = await apiClient.post<Warehouse>("/warehouses", warehouse);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.all });
    },
  });
}

export function useUpdateWarehouse(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (warehouse: WarehouseUpdate) => {
      const { data } = await apiClient.put<Warehouse>(`/warehouses/${id}`, warehouse);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.all });
      queryClient.invalidateQueries({ queryKey: warehouseKeys.detail(id) });
    },
  });
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/warehouses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.all });
    },
  });
}

// Hook for easy list fetching
export function useWarehouses(filters: WarehouseFilters = {}) {
  return useQuery(warehousesQueryOptions(filters));
}
