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
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Összes mozgás</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(totalMovements, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {movements.length > 0 ? "Szűrt időszakban" : "Nincs adat"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beérkezett</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              +{formatNumber(totalIn, 2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {inboundMovements.length} mozgás
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kibocsátott</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              -{formatNumber(totalOut, 2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {outboundMovements.length} mozgás
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Nettó változás
            </CardTitle>
            <TrendingUp
              className={`h-4 w-4 ${
                netChange >= 0 ? "text-success" : "text-destructive"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                netChange >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {netChange >= 0 ? "+" : ""}
              {formatNumber(netChange, 2)}
            </div>
            <p className="text-xs text-muted-foreground">Készletváltozás</p>
          </CardContent>
        </Card>
      </div>

      {/* Movement Type Breakdown & Top Products */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mozgástípus megoszlás</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(typeBreakdown).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(typeBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => {
                    const percentage = (count / totalMovements) * 100;
                    return (
                      <div key={type} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">
                            {HU.movementTypes[
                              type as keyof typeof HU.movementTypes
                            ] || type}
                          </span>
                          <span className="text-muted-foreground">
                            {count} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary">
                          <div
                            className="h-2 rounded-full bg-primary transition-all"
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
          <CardHeader>
            <CardTitle className="text-base">
              Top 5 termék mozgás szerint
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div
                    key={product.name}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium line-clamp-1">
                        {product.name}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatNumber(product.volume, 2)} {product.unit}
                      <span className="ml-2 text-xs">
                        ({product.count} mozgás)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nincs adat</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
