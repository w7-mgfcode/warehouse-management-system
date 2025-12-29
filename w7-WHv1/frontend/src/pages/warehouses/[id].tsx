import { Suspense } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { WarehouseForm } from "@/components/warehouses/warehouse-form";
import { WarehouseMap } from "@/components/warehouses/warehouse-map";
import { warehouseQueryOptions } from "@/queries/warehouses";

function WarehouseDetailContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: warehouse } = useSuspenseQuery(warehouseQueryOptions(id!));

  const activeTab = searchParams.get("tab") || "details";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/warehouses")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold text-foreground">{warehouse.name}</h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="details">Részletek</TabsTrigger>
          <TabsTrigger value="map">Térkép</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <Card className="overflow-visible">
            <CardContent className="pt-6 overflow-visible">
              <WarehouseForm warehouse={warehouse} onSuccess={() => navigate("/warehouses")} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map" className="mt-6">
          <Suspense
            fallback={
              <div className="flex h-96 items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            }
          >
            <WarehouseMap warehouseId={id!} />
          </Suspense>
        </TabsContent>
      </Tabs>
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
