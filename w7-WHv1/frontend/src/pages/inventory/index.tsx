import { Link } from "react-router-dom";
import {
  PackagePlus,
  PackageMinus,
  AlertTriangle,
  ClipboardList,
  TrendingUp,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface QuickActionCard {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  variant: "default" | "success" | "warning" | "info";
}

const quickActions: QuickActionCard[] = [
  {
    title: "Bevételezés",
    description: "Új áru beérkeztetése raktárba",
    icon: PackagePlus,
    href: "/inventory/receipt",
    variant: "success",
  },
  {
    title: "Kiadás",
    description: "Áru kiadása FEFO szabály szerint",
    icon: PackageMinus,
    href: "/inventory/issue",
    variant: "default",
  },
  {
    title: "Lejárati figyelmeztetések",
    description: "Közelgő lejáratú termékek listája",
    icon: AlertTriangle,
    href: "/inventory/expiry",
    variant: "warning",
  },
  {
    title: "FEFO javaslatok",
    description: "Készlet kiadási javaslatok prioritás szerint",
    icon: TrendingUp,
    href: "/reports/fefo",
    variant: "info",
  },
  {
    title: "Készlet áttekintés",
    description: "Aktuális készlet szintek és adatok",
    icon: ClipboardList,
    href: "/reports/stock-levels",
    variant: "info",
  },
  {
    title: "Mozgástörténet",
    description: "Raktári mozgások időrendi naplója",
    icon: Calendar,
    href: "/reports/movements",
    variant: "info",
  },
];

const variantStyles = {
  default: "border-border hover:bg-secondary",
  success: "border-green-500/20 bg-green-500/5 hover:bg-green-500/10",
  warning: "border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10",
  info: "border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10",
};

const iconStyles = {
  default: "text-foreground",
  success: "text-green-600 dark:text-green-400",
  warning: "text-orange-600 dark:text-orange-400",
  info: "text-blue-600 dark:text-blue-400",
};

export default function InventoryIndexPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Készletkezelés</h1>
        <p className="mt-2 text-muted-foreground">
          Raktári műveletek és készlet áttekintés
        </p>
      </div>

      {/* Primary Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/inventory/receipt">
          <Card className="border-green-500/20 bg-green-500/5 hover:bg-green-500/10 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-500/10 p-2">
                  <PackagePlus className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Bevételezés</CardTitle>
                  <CardDescription>Új áru beérkeztetése</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Termékek beérkeztetése beszállítótól, batch és lejárat rögzítése,
                smart bin javaslattal és raklap címke nyomtatással.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/inventory/issue">
          <Card className="border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <PackageMinus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Kiadás</CardTitle>
                  <CardDescription>Áru kiadása raktárból</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                FEFO (First Expired, First Out) szabály szerinti kiadás,
                QR kód beolvasással és lejárati figyelmeztetéssel.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Secondary Actions Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-foreground">Riportok és áttekintés</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.slice(2).map((action) => (
            <Link key={action.href} to={action.href}>
              <Card className={`${variantStyles[action.variant]} transition-colors cursor-pointer h-full`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <action.icon className={`h-5 w-5 ${iconStyles[action.variant]}`} />
                    <CardTitle className="text-base">{action.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Help Section */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Gyors útmutató</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Bevételezés:</strong> Új áru beérkezésekor válaszd ki a terméket, beszállítót,
            add meg a batch számot és lejáratot. A rendszer automatikusan javasol tárolóhelyet.
          </p>
          <p>
            <strong>Kiadás:</strong> FEFO szabály szerint a rendszer automatikusan a legkorábban lejáró
            terméket ajánlja ki. QR kód beolvasással gyorsíthatod a folyamatot.
          </p>
          <p>
            <strong>Figyelmeztetések:</strong> Rendszeresen ellenőrizd a lejárati figyelmeztetéseket,
            hogy időben tudd kezelni a közelgő lejáratú termékeket.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
