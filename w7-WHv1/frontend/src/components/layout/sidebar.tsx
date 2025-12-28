import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Warehouse,
  Package,
  Truck,
  Grid3x3,
  ClipboardList,
  ArrowRightLeft,
  CalendarCheck,
  FileText,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { HU } from "@/lib/i18n";
import type { RoleType } from "@/types";
import type { LucideIcon } from "lucide-react";

interface MenuItem {
  path: string;
  label: string;
  icon: LucideIcon;
  roles?: RoleType[];
}

const menuItems: MenuItem[] = [
  {
    path: "/dashboard",
    label: HU.nav.dashboard,
    icon: LayoutDashboard,
  },
  {
    path: "/warehouses",
    label: HU.nav.warehouses,
    icon: Warehouse,
  },
  {
    path: "/products",
    label: HU.nav.products,
    icon: Package,
  },
  {
    path: "/suppliers",
    label: HU.nav.suppliers,
    icon: Truck,
  },
  {
    path: "/bins",
    label: HU.nav.bins,
    icon: Grid3x3,
  },
  {
    path: "/inventory",
    label: HU.nav.inventory,
    icon: ClipboardList,
  },
  {
    path: "/transfers",
    label: HU.nav.transfers,
    icon: ArrowRightLeft,
  },
  {
    path: "/reservations",
    label: HU.nav.reservations,
    icon: CalendarCheck,
  },
  {
    path: "/reports",
    label: HU.nav.reports,
    icon: FileText,
  },
  {
    path: "/users",
    label: HU.nav.users,
    icon: Users,
    roles: ["admin"], // Only visible to admin
  },
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuthStore();

  // Filter menu items based on user role
  const visibleItems = menuItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <div className="flex h-full w-60 flex-col border-r bg-background">
      {/* Logo and Title */}
      <div className="flex h-16 items-center border-b px-6">
        <Warehouse className="h-6 w-6 text-primary" />
        <span className="ml-2 text-lg font-semibold">WMS</span>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer with user info */}
      <div className="border-t p-4">
        <div className="text-xs text-muted-foreground">
          <p className="font-medium">{user?.full_name || user?.username}</p>
          <p>{HU.roles[user?.role || "viewer"]}</p>
        </div>
      </div>
    </div>
  );
}
