import { useAuthStore } from "@/stores/auth-store";
import type { RoleType } from "@/types";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: RoleType[];
  fallback?: React.ReactNode;
}

/**
 * Component to conditionally render UI elements based on user role.
 *
 * Usage:
 * <RoleGuard allowedRoles={["admin", "manager"]}>
 *   <Button>Törlés</Button>
 * </RoleGuard>
 */
export function RoleGuard({
  children,
  allowedRoles,
  fallback = null,
}: RoleGuardProps) {
  const { user } = useAuthStore();

  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
