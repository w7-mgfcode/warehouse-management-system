import {
  queryOptions,
  useMutation,
  useQueryClient,
  useQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  Bin,
  BinWithContent,
  PaginatedResponse,
  BinStatus,
} from "@/types";

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

// Helper to transform backend bin to frontend format
function transformBin(backendBin: any): Bin {
  return {
    ...backendBin,
    warehouse_name:
      backendBin.warehouse?.name || backendBin.warehouse_name || undefined,
    aisle: backendBin.structure_data?.aisle || "",
    rack: backendBin.structure_data?.rack || "",
    level: backendBin.structure_data?.level || "",
    position: backendBin.structure_data?.position || "",
    capacity_kg: backendBin.max_weight || 0,
    current_product_id: null, // Not provided by backend
  };
}

// Query options
export const binsQueryOptions = (filters: BinFilters = {}) =>
  queryOptions({
    queryKey: binKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<any>("/bins", {
        params: filters,
      });
      // Transform backend response to frontend format
      return {
        ...data,
        items: data.items.map(transformBin),
      };
    },
  });

export const binQueryOptions = (id: string) =>
  queryOptions({
    queryKey: binKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<any>(`/bins/${id}`);
      return transformBin(data);
    },
    enabled: !!id,
  });

// Mutations
export function useCreateBin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bin: BinCreate) => {
      // Transform frontend data to match backend schema
      const backendData = {
        warehouse_id: bin.warehouse_id,
        code: bin.code,
        structure_data: {
          aisle: bin.aisle,
          rack: bin.rack,
          level: bin.level,
          position: bin.position,
        },
        status: "empty" as const,
        max_weight: bin.capacity_kg || null,
        is_active: bin.is_active ?? true,
      };
      const { data } = await apiClient.post<any>("/bins", backendData);
      return transformBin(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: binKeys.all });
    },
  });
}

export function useUpdateBin(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bin: BinUpdate) => {
      // Transform frontend data to match backend schema
      const backendData: any = {
        code: bin.code,
        is_active: bin.is_active,
      };

      // Transform structure fields if any are provided
      if (bin.aisle || bin.rack || bin.level || bin.position) {
        backendData.structure_data = {
          aisle: bin.aisle,
          rack: bin.rack,
          level: bin.level,
          position: bin.position,
        };
      }

      // Transform capacity_kg to max_weight
      if (bin.capacity_kg !== undefined) {
        backendData.max_weight = bin.capacity_kg || null;
      }

      const { data } = await apiClient.put<any>(`/bins/${id}`, backendData);
      return transformBin(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: binKeys.all });
      await queryClient.invalidateQueries({ queryKey: binKeys.detail(id) });
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
      // Transform frontend format to backend format
      const backendData = {
        warehouse_id: bulkData.warehouse_id,
        ranges: {
          aisle: bulkData.aisles,
          rack: { start: bulkData.rack_start, end: bulkData.rack_end },
          level: { start: bulkData.level_start, end: bulkData.level_end },
          position: {
            start: bulkData.position_start,
            end: bulkData.position_end,
          },
        },
        defaults: bulkData.capacity_kg
          ? { max_weight: bulkData.capacity_kg }
          : null,
      };
      const { data } = await apiClient.post("/bins/bulk", backendData);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: binKeys.all });
    },
  });
}

// Hook for easy list fetching
export function useBins(filters: BinFilters = {}) {
  return useQuery(binsQueryOptions(filters));
}

// Warehouse Map specific queries
export interface WarehouseMapFilters {
  warehouse_id: string;
  status?: BinStatus;
  search?: string;
  page?: number;
  page_size?: number;
}

/**
 * Query options for warehouse map visualization
 * Fetches bins with content, product/supplier details, and expiry info
 */
export const warehouseMapBinsQueryOptions = (filters: WarehouseMapFilters) =>
  queryOptions({
    queryKey: [...binKeys.all, "map", filters] as const,
    queryFn: async (): Promise<PaginatedResponse<BinWithContent>> => {
      const { data } = await apiClient.get<PaginatedResponse<BinWithContent>>(
        "/bins",
        {
          params: {
            ...filters,
            include_content: true,
            include_expiry_info: true,
          },
        }
      );
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - warehouse map data
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
  });
