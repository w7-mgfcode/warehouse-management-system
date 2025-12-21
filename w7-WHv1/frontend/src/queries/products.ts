import { queryOptions, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Product, PaginatedResponse } from "@/types";

export interface ProductFilters {
  search?: string;
  category?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export interface ProductCreate {
  name: string;
  sku?: string;
  category?: string;
  default_unit: string;
  description?: string;
  is_active?: boolean;
}

export type ProductUpdate = Partial<ProductCreate>;

// Query keys factory
export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (filters: ProductFilters) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

// Query options
export const productsQueryOptions = (filters: ProductFilters = {}) =>
  queryOptions({
    queryKey: productKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Product>>(
        "/products",
        { params: filters }
      );
      return data;
    },
  });

export const productQueryOptions = (id: string) =>
  queryOptions({
    queryKey: productKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Product>(`/products/${id}`);
      return data;
    },
    enabled: !!id,
  });

// Mutations
export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (product: ProductCreate) => {
      const { data } = await apiClient.post<Product>("/products", product);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (product: ProductUpdate) => {
      const { data } = await apiClient.put<Product>(`/products/${id}`, product);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

// Hook for easy list fetching
export function useProducts(filters: ProductFilters = {}) {
  return useQuery(productsQueryOptions(filters));
}
