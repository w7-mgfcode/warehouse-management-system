import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/shared/search-input";
import { WarehouseList } from "@/components/warehouses/warehouse-list";
import { useWarehouses, useDeleteWarehouse } from "@/queries/warehouses";
import type { APIError } from "@/types/api";
import { HU } from "@/lib/i18n";
import { toast } from "sonner";

export default function WarehousesIndexPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useWarehouses({ search, page: 1, page_size: 50 });
  const deleteMutation = useDeleteWarehouse();

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Raktár törölve");
      },
      onError: (error) => {
        const axiosError = error as AxiosError<APIError>;
        const message = axiosError.response?.data?.detail;
        toast.error(typeof message === "string" ? message : HU.errors.generic);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{HU.nav.warehouses}</h1>
        <Button onClick={() => navigate("/warehouses/new")}>
          <Plus className="h-4 w-4 mr-2" />
          {HU.actions.create}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Keresés név vagy kód alapján..."
          />
        </CardContent>
      </Card>

      <WarehouseList
        warehouses={data?.items || []}
        isLoading={isLoading}
        onDelete={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
