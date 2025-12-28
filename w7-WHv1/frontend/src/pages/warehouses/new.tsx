import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WarehouseForm } from "@/components/warehouses/warehouse-form";

export default function WarehousesNewPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/warehouses")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Új raktár</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <WarehouseForm onSuccess={() => navigate("/warehouses")} />
        </CardContent>
      </Card>
    </div>
  );
}
