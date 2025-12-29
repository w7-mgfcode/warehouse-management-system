import { useState } from "react";
import { Download, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MovementHistory } from "@/components/inventory/movement-history";
import { useMovements } from "@/queries/movements";
import { exportToCSV } from "@/lib/export";
import { toast } from "sonner";

export default function MovementsReportPage() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data } = useMovements({
    start_date: startDate,
    end_date: endDate,
    page: 1,
    page_size: 500,
  });

  const handleExport = () => {
    if (!data || data.items.length === 0) {
      toast.error("Nincs exportálható adat");
      return;
    }

    exportToCSV(
      data.items,
      "mozgasi_riport",
      {
        created_at: "Dátum",
        movement_type: "Típus",
        product_name: "Termék",
        bin_code: "Tárolóhely",
        batch_number: "Sarzs",
        quantity: "Mennyiség",
        unit: "Egység",
        quantity_before: "Készlet előtte",
        quantity_after: "Készlet utána",
        created_by: "Felhasználó",
        reason: "Indok",
      }
    );

    toast.success("Riport exportálva");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Mozgási riport</h1>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportálás CSV
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Kezdő dátum</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Záró dátum</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <MovementHistory
        filters={{
          start_date: startDate,
          end_date: endDate,
        }}
      />
    </div>
  );
}
