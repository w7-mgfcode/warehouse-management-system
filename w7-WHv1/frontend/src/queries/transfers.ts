import { queryOptions, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { WarehouseTransfer, PaginatedResponse } from "@/types";

export interface TransferCreate {
  source_bin_content_id: string;
  target_bin_id: string;
  quantity: number;
  reason?: string;
  notes?: string;
}

export interface CrossWarehouseTransferCreate {
  source_bin_content_id: string;
  target_warehouse_id: string;
  target_bin_id?: string;
  quantity: number;
  transport_reference?: string;
  notes?: string;
}

export interface TransferConfirm {
  target_bin_id: string;
  received_quantity: number;
  condition_on_receipt?: string;
  notes?: string;
}

export interface TransferFilters {
  status?: "pending" | "dispatched" | "completed" | "cancelled";
  warehouse_id?: string;
  page?: number;
  page_size?: number;
}

// Query keys
export const transferKeys = {
  all: ["transfers"] as const,
  lists: () => [...transferKeys.all, "list"] as const,
  list: (filters: TransferFilters) => [...transferKeys.lists(), filters] as const,
  pending: () => [...transferKeys.all, "pending"] as const,
  details: () => [...transferKeys.all, "detail"] as const,
  detail: (id: string) => [...transferKeys.details(), id] as const,
};

// Queries
export const transfersQueryOptions = (filters: TransferFilters = {}) =>
  queryOptions({
    queryKey: transferKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<WarehouseTransfer>>(
        "/transfers",
        { params: filters }
      );
      return data;
    },
  });

export const pendingTransfersQueryOptions = () =>
  queryOptions({
    queryKey: transferKeys.pending(),
    queryFn: async () => {
      const { data } = await apiClient.get<WarehouseTransfer[]>("/transfers/pending");
      return data;
    },
  });

export const transferQueryOptions = (id: string) =>
  queryOptions({
    queryKey: transferKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<WarehouseTransfer>(`/transfers/${id}`);
      return data;
    },
    enabled: !!id,
  });

// Mutations
export function useCreateTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (transfer: TransferCreate) => {
      const { data } = await apiClient.post("/transfers/", transfer);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.all });
      queryClient.invalidateQueries({ queryKey: ["bins"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useCreateCrossWarehouseTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (transfer: CrossWarehouseTransferCreate) => {
      const { data } = await apiClient.post("/transfers/cross-warehouse", transfer);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.all });
    },
  });
}

export function useConfirmTransfer(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TransferConfirm) => {
      const response = await apiClient.post(`/transfers/${id}/confirm`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.all });
      queryClient.invalidateQueries({ queryKey: ["bins"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useCancelTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post(`/transfers/${id}/cancel`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.all });
    },
  });
}

// Hooks
export function useTransfers(filters: TransferFilters = {}) {
  return useQuery(transfersQueryOptions(filters));
}

export function usePendingTransfers() {
  return useQuery(pendingTransfersQueryOptions());
}
