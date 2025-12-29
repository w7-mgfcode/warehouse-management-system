import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fefoRecommendationQueryOptions } from "@/queries/inventory";
import { ExpiryBadge } from "./expiry-badge";
import { formatNumber } from "@/lib/number";
import { HU, interpolate } from "@/lib/i18n";

interface FEFORecommendationProps {
  productId: string;
  requestedQuantity: number;
  warehouseId?: string;
}

function FEFOContent({ productId, requestedQuantity, warehouseId }: FEFORecommendationProps) {
  const { data } = useSuspenseQuery(
    fefoRecommendationQueryOptions(productId, requestedQuantity, warehouseId)
  );

  const hasWarnings = data.fefo_warnings.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {hasWarnings ? (
            <AlertTriangle className="h-5 w-5 text-warning" />
          ) : (
            <CheckCircle className="h-5 w-5 text-success" />
          )}
          FEFO Javaslat - {data.product_name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* FEFO Warnings */}
        {hasWarnings && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>FEFO Figyelmeztetés</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4 space-y-1">
                {data.fefo_warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Recommendations (ordered by FEFO) */}
        <div className="space-y-3">
          {data.recommendations.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              {HU.empty.stockAvailable}
            </p>
          ) : (
            data.recommendations.map((rec, index) => (
              <div
                key={rec.bin_content_id}
                data-testid="fefo-item"
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/30 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{rec.bin_code}</span>
                    {index === 0 && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        FEFO első
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Sarzs: {rec.batch_number}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Elérhető: {formatNumber(rec.available_quantity)} kg
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <div className="font-medium">
                    Javaslat: {formatNumber(rec.suggested_quantity)} kg
                  </div>
                  <ExpiryBadge useByDate={rec.use_by_date} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Total Available */}
        <div className="mt-4 pt-4 border-t flex justify-between items-center">
          <span className="text-muted-foreground">Összesen elérhető:</span>
          <span className="font-bold text-lg">
            {formatNumber(data.total_available)} kg
          </span>
        </div>

        {data.total_available < requestedQuantity && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {interpolate(HU.fefo.insufficientStock, {
                available: formatNumber(data.total_available),
                requested: formatNumber(requestedQuantity),
              })}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function FEFOSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function FEFORecommendation(props: FEFORecommendationProps) {
  return (
    <Suspense fallback={<FEFOSkeleton />}>
      <FEFOContent {...props} />
    </Suspense>
  );
}
