import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KPICard } from "@/components/dashboard/kpi-card";
import { ExpiryWarningsList } from "@/components/dashboard/expiry-warnings-list";
import { OccupancyChart } from "@/components/dashboard/occupancy-chart";
import { MovementChart } from "@/components/dashboard/movement-chart";
import { ExpiryDistributionChart } from "@/components/dashboard/expiry-distribution-chart";
import { OccupancyTrendChart } from "@/components/dashboard/occupancy-trend-chart";
import { ProductSupplierPieChart } from "@/components/dashboard/product-supplier-pie-chart";
import { dashboardStatsQueryOptions } from "@/queries/dashboard";
import { formatNumber, formatPercentage } from "@/lib/number";
import { format, parseISO } from "date-fns";

function DashboardContent() {
  const { data: stats } = useSuspenseQuery(dashboardStatsQueryOptions());

  // Format movement history dates for chart
  const formattedMovementHistory = stats.movement_history?.map((item) => ({
    ...item,
    date: format(parseISO(item.date), "MM. dd."),
  })) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Irányítópult</h1>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Összes készlet"
          value={`${formatNumber(stats.total_stock_kg, 0)} kg`}
          subtitle={`${stats.total_products} termék, ${stats.total_batches} sarzs`}
          icon={Package}
        />

        <KPICard
          title="Raktár kihasználtság"
          value={formatPercentage(stats.occupancy_rate)}
          subtitle={`${stats.occupied_bins} / ${stats.total_bins} tárolóhely`}
          icon={Warehouse}
        />

        <KPICard
          title="Lejárati figyelmeztetések"
          value={stats.expiry_warnings.critical + stats.expiry_warnings.high}
          subtitle={`${stats.expiry_warnings.critical} kritikus, ${stats.expiry_warnings.high} magas`}
          icon={AlertTriangle}
        />

        <KPICard
          title="Mai mozgások"
          value={stats.today_movements}
          subtitle={`${stats.today_receipts} bevételezés, ${stats.today_issues} kiadás`}
          icon={TrendingUp}
        />
      </div>

      {/* Charts Row 1 - Current Status */}
      <div className="grid gap-4 md:grid-cols-2">
        <OccupancyChart data={stats.warehouse_occupancy ?? []} />
        <MovementChart data={formattedMovementHistory} />
      </div>

      {/* Charts Row 2 - Trends and Analysis */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Kihasználtsági trend</h3>
            <p className="text-sm text-muted-foreground">30 napos előzmény</p>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
              <OccupancyTrendChart days={30} />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Termékek beszállítónként</h3>
            <p className="text-sm text-muted-foreground">Top 10 beszállító</p>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
              <ProductSupplierPieChart />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Lejárati eloszlás</h3>
            <p className="text-sm text-muted-foreground">Termékek sürgősség szerint</p>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
              <ExpiryDistributionChart />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      {/* Expiry Warnings */}
      <ExpiryWarningsList />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-48" />

      {/* KPI Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Skeleton Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Skeleton Row 2 */}
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-24 mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Expiry Warnings Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
