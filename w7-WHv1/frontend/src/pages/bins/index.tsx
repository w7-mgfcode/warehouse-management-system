import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/shared/search-input";
import { BinList } from "@/components/bins/bin-list";
import { useBins, useDeleteBin } from "@/queries/bins";
import { HU } from "@/lib/i18n";
import { toast } from "sonner";

export default function BinsIndexPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useBins({ search, page: 1, page_size: 100 });
  const deleteMutation = useDeleteBin();

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Tárolóhely törölve");
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.detail || HU.errors.generic);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{HU.nav.bins}</h1>
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
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Keresés kód alapján..."
          />
        </CardContent>
      </Card>

      <BinList
        bins={data?.items || []}
        isLoading={isLoading}
        onDelete={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
