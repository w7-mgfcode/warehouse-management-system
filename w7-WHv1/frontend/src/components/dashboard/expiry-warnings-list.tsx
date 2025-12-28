import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { expiryWarningsQueryOptions } from "@/queries/dashboard";
import { formatDate, getExpiryUrgency, formatExpiryWarning, getDaysUntilExpiry } from "@/lib/date";
import { formatWeight } from "@/lib/number";
import { cn } from "@/lib/utils";
import { HU } from "@/lib/i18n";

function ExpiryWarningsContent() {
  const { data: warnings } = useSuspenseQuery(expiryWarningsQueryOptions(10));

  if (warnings.length === 0) {
    return (
      <CardContent>
        <p className="text-sm text-muted-foreground text-center py-4">
          {HU.empty.expiryWarnings}
        </p>
      </CardContent>
    );
  }

  return (
    <CardContent>
      <div className="space-y-3">
        {warnings.map((warning) => {
          const days = getDaysUntilExpiry(warning.use_by_date);
          const urgency = getExpiryUrgency(warning.use_by_date);

          const urgencyClasses = {
            expired: "bg-expiry-critical text-white",
            critical: "bg-expiry-critical text-white",
            high: "bg-expiry-high text-white",
            medium: "bg-expiry-medium text-black",
            low: "bg-expiry-low text-white",
          };

          return (
            <div
              key={warning.bin_content_id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium">{warning.product_name}</p>
                <p className="text-sm text-muted-foreground">
                  {warning.bin_code} • {warning.batch_number}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatWeight(warning.weight_kg)} • {formatDate(warning.use_by_date)}
                </p>
              </div>
              <Badge className={cn(urgencyClasses[urgency])}>
                {formatExpiryWarning(days)}
              </Badge>
            </div>
          );
        })}
      </div>
    </CardContent>
  );
}

function ExpiryWarningsSkeleton() {
  return (
    <CardContent>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    </CardContent>
  );
}

export function ExpiryWarningsList() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Lejárati figyelmeztetések
        </CardTitle>
      </CardHeader>
      <Suspense fallback={<ExpiryWarningsSkeleton />}>
        <ExpiryWarningsContent />
      </Suspense>
    </Card>
  );
}
