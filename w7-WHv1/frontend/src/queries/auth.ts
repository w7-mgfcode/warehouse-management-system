import { useMutation, queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { Token, User, AuthUser } from "@/types";

interface LoginCredentials {
  username: string;
  password: string;
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      // CRITICAL: Backend uses OAuth2 form data, not JSON!
      const formData = new URLSearchParams();
      formData.append("username", credentials.username);
      formData.append("password", credentials.password);

      const { data } = await apiClient.post<Token>("/auth/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      return data;
    },
    onSuccess: async (data) => {
      const { setAuth, updateAccessToken } = useAuthStore.getState();
      updateAccessToken(data.access_token);

      // Fetch user info
      const { data: user } = await apiClient.get<User>("/auth/me");

      // Convert User to AuthUser (simplified for auth store)
      const authUser: AuthUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
      };

      setAuth(authUser, data.access_token, data.refresh_token);
    },
  });
}

export function useRefreshMutation() {
  return useMutation({
    mutationFn: async (refreshToken: string) => {
      const { data } = await apiClient.post<Token>("/auth/refresh", {
        refresh_token: refreshToken,
      });
      return data;
    },
    onSuccess: (data) => {
      const { updateAccessToken } = useAuthStore.getState();
      updateAccessToken(data.access_token);
    },
  });
}

export const meQueryOptions = () =>
  queryOptions({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const { data } = await apiClient.get<User>("/auth/me");
      return data;
    },
  });

export function useLogoutMutation() {
  return useMutation({
    mutationFn: async () => {
      // Optional: Call backend logout endpoint if it exists
      // await apiClient.post("/auth/logout");
      return true;
    },
    onSuccess: () => {
      const { logout } = useAuthStore.getState();
      logout();
    },
  });
}
