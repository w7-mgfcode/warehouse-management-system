import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  TrendingUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/number";
import type { BinMovement } from "@/types";
import { HU } from "@/lib/i18n";

interface MovementStatsProps {
  movements: BinMovement[];
  isLoading?: boolean;
}

export function MovementStats({ movements, isLoading }: MovementStatsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate statistics
  const totalMovements = movements.length;

  const inboundMovements = movements.filter(
    (m) => m.movement_type === "receipt" || m.quantity > 0
  );
  const outboundMovements = movements.filter(
    (m) =>
      m.movement_type === "issue" ||
      (m.movement_type === "transfer" && m.quantity < 0)
  );

  const totalIn = inboundMovements.reduce(
    (sum, m) => sum + Math.abs(m.quantity),
    0
  );
  const totalOut = outboundMovements.reduce(
    (sum, m) => sum + Math.abs(m.quantity),
    0
  );
  const netChange = totalIn - totalOut;

  // Movement type breakdown
  const typeBreakdown = movements.reduce((acc, m) => {
    acc[m.movement_type] = (acc[m.movement_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Top products by movement volume
  const productVolumes = movements.reduce((acc, m) => {
    const key = m.product_name;
    if (!acc[key]) {
      acc[key] = { name: key, volume: 0, count: 0, unit: m.unit };
    }
    acc[key].volume += Math.abs(m.quantity);
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, { name: string; volume: number; count: number; unit: string }>);

  const topProducts = Object.values(productVolumes)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 md:px-6 pt-4 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium">
              Összes mozgás
            </CardTitle>
            <Activity className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
            <div className="text-xl md:text-2xl font-bold">
              {formatNumber(totalMovements, 0)}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              {movements.length > 0 ? "Szűrt időszak" : "Nincs adat"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 md:px-6 pt-4 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium">
              Beérkezett
            </CardTitle>
            <ArrowUpRight className="h-3 w-3 md:h-4 md:w-4 text-green-600 shrink-0" />
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
            <div className="text-xl md:text-2xl font-bold text-green-600">
              +{formatNumber(totalIn, 2)}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              {inboundMovements.length} mozgás
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 md:px-6 pt-4 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium">
              Kibocsátott
            </CardTitle>
            <ArrowDownRight className="h-3 w-3 md:h-4 md:w-4 text-red-600 shrink-0" />
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
            <div className="text-xl md:text-2xl font-bold text-red-600">
              -{formatNumber(totalOut, 2)}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              {outboundMovements.length} mozgás
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 md:px-6 pt-4 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium">
              Nettó változás
            </CardTitle>
            <TrendingUp
              className={`h-3 w-3 md:h-4 md:w-4 shrink-0 ${
                netChange >= 0 ? "text-green-600" : "text-red-600"
              }`}
            />
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
            <div
              className={`text-xl md:text-2xl font-bold ${
                netChange >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {netChange >= 0 ? "+" : ""}
              {formatNumber(netChange, 2)}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              Készletváltozás
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Movement Type Breakdown & Top Products */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="text-sm md:text-base">
              Mozgástípus megoszlás
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            {Object.entries(typeBreakdown).length > 0 ? (
              <div className="space-y-2 md:space-y-3">
                {Object.entries(typeBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => {
                    const percentage = (count / totalMovements) * 100;
                    return (
                      <div key={type} className="space-y-1">
                        <div className="flex items-center justify-between text-xs md:text-sm">
                          <span className="font-medium truncate mr-2">
                            {HU.movementTypes[
                              type as keyof typeof HU.movementTypes
                            ] || type}
                          </span>
                          <span className="text-muted-foreground shrink-0">
                            {count} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-1.5 md:h-2 rounded-full bg-secondary">
                          <div
                            className="h-1.5 md:h-2 rounded-full bg-primary transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nincs adat</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="text-sm md:text-base">
              Top 5 termék mozgás szerint
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            {topProducts.length > 0 ? (
              <div className="space-y-2 md:space-y-3">
                {topProducts.map((product, index) => (
                  <div
                    key={product.name}
                    className="flex items-center gap-2 md:gap-3"
                  >
                    <span className="flex h-5 w-5 md:h-6 md:w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] md:text-xs font-medium">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs md:text-sm font-medium truncate">
                        {product.name}
                      </div>
                      <div className="text-[10px] md:text-xs text-muted-foreground">
                        {formatNumber(product.volume, 2)} {product.unit} ·{" "}
                        {product.count} mozgás
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs md:text-sm text-muted-foreground">
                Nincs adat
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
