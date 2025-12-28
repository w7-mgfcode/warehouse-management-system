import { queryOptions, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Bin, PaginatedResponse, BinStatus } from "@/types";

export interface BinFilters {
  warehouse_id?: string;
  status?: BinStatus;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface BinCreate {
  warehouse_id: string;
  code: string;
  aisle: string;
  rack: string;
  level: string;
  position: string;
  capacity_kg?: number;
  is_active?: boolean;
}

export type BinUpdate = Partial<Omit<BinCreate, "warehouse_id">>;

export interface BulkBinCreate {
  warehouse_id: string;
  aisles: string[];
  rack_start: number;
  rack_end: number;
  level_start: number;
  level_end: number;
  position_start: number;
  position_end: number;
  capacity_kg?: number;
}

// Query keys factory
export const binKeys = {
  all: ["bins"] as const,
  lists: () => [...binKeys.all, "list"] as const,
  list: (filters: BinFilters) => [...binKeys.lists(), filters] as const,
  details: () => [...binKeys.all, "detail"] as const,
  detail: (id: string) => [...binKeys.details(), id] as const,
};

// Query options
export const binsQueryOptions = (filters: BinFilters = {}) =>
  queryOptions({
    queryKey: binKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Bin>>("/bins", {
        params: filters,
      });
      return data;
    },
  });

export const binQueryOptions = (id: string) =>
  queryOptions({
    queryKey: binKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Bin>(`/bins/${id}`);
      return data;
    },
    enabled: !!id,
  });

// Mutations
export function useCreateBin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bin: BinCreate) => {
      const { data } = await apiClient.post<Bin>("/bins", bin);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: binKeys.all });
    },
  });
}

export function useUpdateBin(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bin: BinUpdate) => {
      const { data } = await apiClient.put<Bin>(`/bins/${id}`, bin);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: binKeys.all });
      queryClient.invalidateQueries({ queryKey: binKeys.detail(id) });
    },
  });
}

export function useDeleteBin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/bins/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: binKeys.all });
    },
  });
}

export function useBulkCreateBins() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bulkData: BulkBinCreate) => {
      const { data } = await apiClient.post("/bins/bulk", bulkData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: binKeys.all });
    },
  });
}

// Hook for easy list fetching
export function useBins(filters: BinFilters = {}) {
  return useQuery(binsQueryOptions(filters));
}
