import {
  queryOptions,
  useMutation,
  useQueryClient,
  useQuery,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  role: "admin" | "manager" | "warehouse" | "viewer";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaginatedUsers {
  items: User[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface UserFilters {
  page?: number;
  page_size?: number;
}

export interface UserCreate {
  username: string;
  email: string;
  full_name?: string;
  role: "admin" | "manager" | "warehouse" | "viewer";
  password: string;
  is_active?: boolean;
}

export interface UserUpdate {
  username?: string;
  email?: string;
  full_name?: string;
  role?: "admin" | "manager" | "warehouse" | "viewer";
  password?: string;
  is_active?: boolean;
}

// Query keys factory
export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

// Query options
export const usersQueryOptions = (filters: UserFilters = {}) =>
  queryOptions({
    queryKey: userKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedUsers>("/users", {
        params: filters,
      });
      return data;
    },
  });

export const userQueryOptions = (id: string) =>
  queryOptions({
    queryKey: userKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<User>(`/users/${id}`);
      return data;
    },
    enabled: !!id,
  });

// Mutations
export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user: UserCreate) => {
      const { data } = await apiClient.post<User>("/users", user);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user: UserUpdate) => {
      const { data } = await apiClient.put<User>(`/users/${id}`, user);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

// Hook for easy list fetching
export function useUsers(filters: UserFilters = {}) {
  return useQuery(usersQueryOptions(filters));
}

// Hook for single user
export function useUser(id: string) {
  return useQuery(userQueryOptions(id));
}
