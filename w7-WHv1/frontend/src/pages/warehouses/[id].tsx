import { Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WarehouseForm } from "@/components/warehouses/warehouse-form";
import { warehouseQueryOptions } from "@/queries/warehouses";

function WarehouseDetailContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: warehouse } = useSuspenseQuery(warehouseQueryOptions(id!));

  return (
    <div className="max-w-5xl mx-auto px-4 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/warehouses")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold text-foreground">{warehouse.name}</h1>
      </div>

      <Card className="overflow-visible">
        <CardContent className="pt-6 overflow-visible">
          <WarehouseForm warehouse={warehouse} onSuccess={() => navigate("/warehouses")} />
        </CardContent>
      </Card>
    </div>
  );
}

function WarehouseDetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 space-y-6">
      <Skeleton className="h-9 w-64" />
      <Card className="overflow-visible">
        <CardContent className="pt-6 overflow-visible">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function WarehousesDetailPage() {
  return (
    <Suspense fallback={<WarehouseDetailSkeleton />}>
      <WarehouseDetailContent />
    </Suspense>
  );
}
