import { queryOptions, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Supplier, PaginatedResponse } from "@/types";

export interface SupplierFilters {
  search?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export interface SupplierCreate {
  company_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_number?: string;
  is_active?: boolean;
}

export type SupplierUpdate = Partial<SupplierCreate>;

// Query keys factory
export const supplierKeys = {
  all: ["suppliers"] as const,
  lists: () => [...supplierKeys.all, "list"] as const,
  list: (filters: SupplierFilters) => [...supplierKeys.lists(), filters] as const,
  details: () => [...supplierKeys.all, "detail"] as const,
  detail: (id: string) => [...supplierKeys.details(), id] as const,
};

// Query options
export const suppliersQueryOptions = (filters: SupplierFilters = {}) =>
  queryOptions({
    queryKey: supplierKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Supplier>>(
        "/suppliers",
        { params: filters }
      );
      return data;
    },
  });

export const supplierQueryOptions = (id: string) =>
  queryOptions({
    queryKey: supplierKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Supplier>(`/suppliers/${id}`);
      return data;
    },
    enabled: !!id,
  });

// Mutations
export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (supplier: SupplierCreate) => {
      const { data } = await apiClient.post<Supplier>("/suppliers", supplier);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
    },
  });
}

export function useUpdateSupplier(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (supplier: SupplierUpdate) => {
      const { data } = await apiClient.put<Supplier>(`/suppliers/${id}`, supplier);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
      queryClient.invalidateQueries({ queryKey: supplierKeys.detail(id) });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
    },
  });
}

// Hook for easy list fetching
export function useSuppliers(filters: SupplierFilters = {}) {
  return useQuery(suppliersQueryOptions(filters));
}
