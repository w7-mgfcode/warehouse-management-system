import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Clock, CheckCircle2 } from "lucide-react";
import { formatNumber } from "@/lib/number";

interface ReservationStatsProps {
  totalActive?: number;
  totalQuantity?: number;
  expiringSoon?: number;
  totalFulfilled?: number;
  isLoading?: boolean;
}

export function ReservationStats({
  totalActive = 0,
  totalQuantity = 0,
  expiringSoon = 0,
  totalFulfilled = 0,
  isLoading,
}: ReservationStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: "Aktív foglalások",
      value: totalActive,
      icon: Package,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      label: "Összes mennyiség",
      value: `${formatNumber(totalQuantity, 0)} kg`,
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Hamarosan lejár",
      value: expiringSoon,
      icon: Clock,
      color: expiringSoon > 0 ? "text-warning" : "text-muted-foreground",
      bgColor: expiringSoon > 0 ? "bg-warning/10" : "bg-muted",
    },
    {
      label: "Teljesítve (ma)",
      value: totalFulfilled,
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
