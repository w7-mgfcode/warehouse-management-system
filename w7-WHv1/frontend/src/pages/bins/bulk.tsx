import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BinBulkForm } from "@/components/bins/bin-bulk-form";

export default function BinsBulkPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const warehouseId = searchParams.get("warehouse") || undefined;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/bins")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold text-foreground">
          Tömeges tárolóhely létrehozás
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tartomány specifikáció</CardTitle>
        </CardHeader>
        <CardContent>
          <BinBulkForm
            preselectedWarehouseId={warehouseId}
            onSuccess={() =>
              navigate(warehouseId ? `/bins?warehouse=${warehouseId}` : "/bins")
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
