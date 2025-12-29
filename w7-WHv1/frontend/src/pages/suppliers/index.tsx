import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/shared/search-input";
import { SupplierList } from "@/components/suppliers/supplier-list";
import { useSuppliers, useDeleteSupplier } from "@/queries/suppliers";
import type { APIError } from "@/types/api";
import { HU } from "@/lib/i18n";
import { toast } from "sonner";

export default function SuppliersIndexPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useSuppliers({ search, page: 1, page_size: 50 });
  const deleteMutation = useDeleteSupplier();

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Beszállító törölve");
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
        <h1 className="text-3xl font-bold text-foreground">{HU.nav.suppliers}</h1>
        <Button onClick={() => navigate("/suppliers/new")}>
          <Plus className="h-4 w-4 mr-2" />
          {HU.actions.create}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Keresés cégnév vagy adószám alapján..."
          />
        </CardContent>
      </Card>

      <SupplierList
        suppliers={data?.items || []}
        isLoading={isLoading}
        onDelete={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
