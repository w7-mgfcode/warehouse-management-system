import {
  queryOptions,
  useMutation,
  useQueryClient,
  useQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  StockReservation,
  ReservationDetail,
  PaginatedResponse,
} from "@/types";

export interface ReservationCreate {
  product_id: string;
  quantity: number;
  order_reference: string;
  customer_name?: string;
  reserved_until: string;
  notes?: string;
}

export interface ReservationFulfill {
  notes?: string;
}

export interface ReservationFilters {
  status?: "active" | "fulfilled" | "cancelled" | "expired";
  product_id?: string;
  order_reference?: string;
  page?: number;
  page_size?: number;
}

// Query keys
export const reservationKeys = {
  all: ["reservations"] as const,
  lists: () => [...reservationKeys.all, "list"] as const,
  list: (filters: ReservationFilters) =>
    [...reservationKeys.lists(), filters] as const,
  expiring: () => [...reservationKeys.all, "expiring"] as const,
  details: () => [...reservationKeys.all, "detail"] as const,
  detail: (id: string) => [...reservationKeys.details(), id] as const,
};

// Queries
export const reservationsQueryOptions = (filters: ReservationFilters = {}) =>
  queryOptions({
    queryKey: reservationKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<StockReservation>>(
        "/reservations/",
        { params: filters }
      );
      return data;
    },
  });

export const reservationQueryOptions = (id: string) =>
  queryOptions({
    queryKey: reservationKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ReservationDetail>(
        `/reservations/${id}/`
      );
      return data;
    },
    enabled: !!id,
  });

export const expiringReservationsQueryOptions = () =>
  queryOptions({
    queryKey: reservationKeys.expiring(),
    queryFn: async () => {
      const { data } = await apiClient.get<StockReservation[]>(
        "/reservations/expiring/"
      );
      return data;
    },
  });

// Mutations
export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reservation: ReservationCreate) => {
      const { data } = await apiClient.post("/reservations/", reservation);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.all });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useFulfillReservation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ReservationFulfill) => {
      const response = await apiClient.post(
        `/reservations/${id}/fulfill`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.all });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
    },
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      reason,
      notes,
    }: {
      id: string;
      reason: string;
      notes?: string;
    }) => {
      const { data } = await apiClient.delete(`/reservations/${id}`, {
        data: { reason, notes },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.all });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

// Hooks
export function useReservations(filters: ReservationFilters = {}) {
  return useQuery(reservationsQueryOptions(filters));
}

export function useExpiringReservations() {
  return useQuery(expiringReservationsQueryOptions());
}
