import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/shared/search-input";
import { ProductList } from "@/components/products/product-list";
import { useProducts, useDeleteProduct } from "@/queries/products";
import type { APIError } from "@/types/api";
import { HU } from "@/lib/i18n";
import { toast } from "sonner";

export default function ProductsIndexPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useProducts({ search, page: 1, page_size: 50 });
  const deleteMutation = useDeleteProduct();

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Termék törölve");
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{HU.nav.products}</h1>
        <Button onClick={() => navigate("/products/new")}>
          <Plus className="h-4 w-4 mr-2" />
          {HU.actions.create}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Keresés név vagy SKU alapján..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <ProductList
        products={data?.items || []}
        isLoading={isLoading}
        onDelete={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
