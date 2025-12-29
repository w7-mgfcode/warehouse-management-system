import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReceiptForm } from "@/components/inventory/receipt-form";

export default function InventoryReceiptPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/inventory")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold text-foreground">Bevételezés</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Új áru beérkeztetése</CardTitle>
        </CardHeader>
        <CardContent>
          <ReceiptForm onSuccess={() => navigate("/inventory")} />
        </CardContent>
      </Card>
    </div>
  );
}
