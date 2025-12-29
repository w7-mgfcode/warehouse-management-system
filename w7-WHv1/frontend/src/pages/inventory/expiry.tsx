import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AlertTriangle, AlertCircle, Clock, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KPICard } from "@/components/dashboard/kpi-card";
import { ExpiryWarningsList } from "@/components/dashboard/expiry-warnings-list";
import { expiryWarningsQueryOptions } from "@/queries/dashboard";

function ExpiryPageContent() {
  const { data: warnings } = useSuspenseQuery(expiryWarningsQueryOptions(100));

  // Calculate summary counts
  const summary = warnings.reduce(
    (acc, w) => {
      if (w.days_until_expiry < 7) acc.critical++;
      else if (w.days_until_expiry < 14) acc.high++;
      else if (w.days_until_expiry < 30) acc.medium++;
      else acc.low++;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0 }
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Lejárati figyelmeztetések</h1>

      {/* Summary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Kritikus (<7 nap)"
          value={summary.critical}
          icon={AlertTriangle}
        />
        <KPICard
          title="Magas (7-14 nap)"
          value={summary.high}
          icon={AlertCircle}
        />
        <KPICard
          title="Közepes (15-30 nap)"
          value={summary.medium}
          icon={Clock}
        />
        <KPICard
          title="Alacsony (>30 nap)"
          value={summary.low}
          icon={Info}
        />
      </div>

      {/* Expiry Warnings List */}
      <ExpiryWarningsList />
    </div>
  );
}

function ExpiryPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <Skeleton className="h-32 w-full" />
          </Card>
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function InventoryExpiryPage() {
  return (
    <Suspense fallback={<ExpiryPageSkeleton />}>
      <ExpiryPageContent />
    </Suspense>
  );
}
