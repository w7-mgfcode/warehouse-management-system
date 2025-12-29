import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Warehouse, AlertTriangle, Calendar } from "lucide-react";
import { formatNumber, formatWeight } from "@/lib/number";
import { getExpiryUrgency } from "@/lib/date";
import type { StockLevel } from "@/queries/inventory";

interface StockSummaryStatsProps {
  data: StockLevel[];
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: "default" | "warning" | "critical";
}

function StatCard({ label, value, icon, color = "default" }: StatCardProps) {
  const colorClasses = {
    default: "text-primary bg-primary/10",
    warning: "text-orange-500 bg-orange-500/10",
    critical: "text-red-500 bg-red-500/10",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StockSummaryStats({ data }: StockSummaryStatsProps) {
  const stats = useMemo(() => {
    const totalItems = data.length;
    const totalWeight = data.reduce((sum, item) => sum + Number(item.weight_kg || 0), 0);
    const uniqueProducts = new Set(data.map(item => item.product_id)).size;

    // Count items by expiry urgency
    const criticalCount = data.filter(item => {
      const urgency = getExpiryUrgency(item.use_by_date);
      return urgency === "expired" || urgency === "critical";
    }).length;

    const warningCount = data.filter(item => {
      const urgency = getExpiryUrgency(item.use_by_date);
      return urgency === "high";
    }).length;

    return {
      totalItems,
      totalWeight,
      uniqueProducts,
      criticalCount,
      warningCount,
    };
  }, [data]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Összes tétel"
        value={formatNumber(stats.totalItems, 0)}
        icon={<Package className="h-5 w-5" />}
      />
      <StatCard
        label="Összes súly"
        value={formatWeight(stats.totalWeight)}
        icon={<Warehouse className="h-5 w-5" />}
      />
      <StatCard
        label="Egyedi termékek"
        value={formatNumber(stats.uniqueProducts, 0)}
        icon={<Package className="h-5 w-5" />}
      />
      {stats.criticalCount > 0 ? (
        <StatCard
          label="Kritikus lejárat"
          value={formatNumber(stats.criticalCount, 0)}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="critical"
        />
      ) : stats.warningCount > 0 ? (
        <StatCard
          label="Figyelmeztetés"
          value={formatNumber(stats.warningCount, 0)}
          icon={<Calendar className="h-5 w-5" />}
          color="warning"
        />
      ) : (
        <StatCard
          label="Figyelmeztetések"
          value="0"
          icon={<Calendar className="h-5 w-5" />}
        />
      )}
    </div>
  );
}
