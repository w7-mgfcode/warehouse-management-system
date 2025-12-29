import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Grid3x3 } from "lucide-react";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/shared/search-input";
import { BinList } from "@/components/bins/bin-list";
import { WarehouseSelect } from "@/components/warehouses/warehouse-select";
import { useBins, useDeleteBin } from "@/queries/bins";
import type { APIError } from "@/types/api";
import { HU } from "@/lib/i18n";
import { toast } from "sonner";

export default function BinsIndexPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [warehouseId, setWarehouseId] = useState<string | undefined>(
    searchParams.get("warehouse") || undefined
  );

  // Sync warehouse filter with URL
  useEffect(() => {
    if (warehouseId) {
      setSearchParams({ warehouse: warehouseId });
    } else {
      setSearchParams({});
    }
  }, [warehouseId, setSearchParams]);

  const { data, isLoading } = useBins({
    search,
    warehouse_id: warehouseId,
    page: 1,
    page_size: 100,
  });
  const deleteMutation = useDeleteBin();

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Tárolóhely törölve");
      },
      onError: (error) => {
        const axiosError = error as AxiosError<APIError>;
        const message = axiosError.response?.data?.detail;
        toast.error(typeof message === "string" ? message : HU.errors.generic);
      },
    });
  };

  const handleBulkDelete = async (ids: string[]) => {
    let successCount = 0;
    let errorCount = 0;

    for (const id of ids) {
      try {
        await deleteMutation.mutateAsync(id);
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} tárolóhely törölve`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} tárolóhely törlése sikertelen`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{HU.nav.bins}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/bins/bulk")}>
            <Grid3x3 className="h-4 w-4 mr-2" />
            Tömeges létrehozás
          </Button>
          <Button onClick={() => navigate("/bins/new")}>
            <Plus className="h-4 w-4 mr-2" />
            {HU.actions.create}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:w-64">
              <WarehouseSelect
                value={warehouseId}
                onChange={setWarehouseId}
                placeholder="Összes raktár"
                allowClear
              />
            </div>
            <div className="flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Keresés kód alapján..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <BinList
        bins={data?.items || []}
        isLoading={isLoading}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
