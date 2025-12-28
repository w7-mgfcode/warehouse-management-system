import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import type { RoleType } from "@/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: RoleType[];
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { isAuthenticated, user, refreshToken } = useAuthStore();
  const location = useLocation();

  // Allow access if authenticated OR if we have a refresh token (will be refreshed on first API call)
  // This fixes the issue where page reload loses isAuthenticated but keeps refreshToken
  if (!isAuthenticated && !refreshToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
