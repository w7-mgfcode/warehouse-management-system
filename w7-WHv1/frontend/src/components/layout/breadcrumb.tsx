import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { HU } from "@/lib/i18n";

// Route to Hungarian label mapping
const routeLabels: Record<string, string> = {
  "/dashboard": HU.nav.dashboard,
  "/warehouses": HU.nav.warehouses,
  "/products": HU.nav.products,
  "/suppliers": HU.nav.suppliers,
  "/bins": HU.nav.bins,
  "/inventory": HU.nav.inventory,
  "/inventory/receipt": HU.nav.receipt,
  "/inventory/issue": HU.nav.issue,
  "/inventory/expiry": "Lejárati figyelmeztetések",
  "/transfers": HU.nav.transfers,
  "/reservations": HU.nav.reservations,
  "/reports": HU.nav.reports,
  "/users": HU.nav.users,
  "/settings": HU.nav.settings,
  "/new": "Új",
  "/edit": "Szerkesztés",
};

export function Breadcrumb() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  // If on home/dashboard, show just the icon
  if (pathnames.length === 0 || location.pathname === "/dashboard") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Home className="h-4 w-4" />
        <span className="font-medium">{HU.nav.dashboard}</span>
      </div>
    );
  }

  // Build breadcrumb trail
  return (
    <nav className="flex items-center gap-2 text-sm">
      {/* Home link */}
      <Link
        to="/dashboard"
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>

      {pathnames.map((segment, index) => {
        const path = `/${pathnames.slice(0, index + 1).join("/")}`;
        const isLast = index === pathnames.length - 1;
        const label = routeLabels[path] || routeLabels[`/${segment}`] || segment;

        return (
          <div key={path} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            {isLast ? (
              <span className="font-medium">{label}</span>
            ) : (
              <Link
                to={path}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
