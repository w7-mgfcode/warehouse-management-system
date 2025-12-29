import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WarehouseForm } from "@/components/warehouses/warehouse-form";

export default function WarehousesNewPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto px-4 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/warehouses")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold text-foreground">Új raktár</h1>
      </div>

      <Card className="overflow-visible">
        <CardContent className="pt-6 overflow-visible">
          <WarehouseForm onSuccess={() => navigate("/warehouses")} />
        </CardContent>
      </Card>
    </div>
  );
}
