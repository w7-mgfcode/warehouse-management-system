import { useState } from "react";
import { Download, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/shared/search-input";
import { StockTable } from "@/components/inventory/stock-table";
import { useStockLevels } from "@/queries/inventory";
import { exportToCSV } from "@/lib/export";
import { toast } from "sonner";

export default function StockLevelsReportPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data } = useStockLevels({ search });

  const handleExport = () => {
    if (!data || data.length === 0) {
      toast.error("Nincs exportálható adat");
      return;
    }

    exportToCSV(
      data,
      "keszletszint_riport",
      {
        product_name: "Termék",
        warehouse_name: "Raktár",
        bin_code: "Tárolóhely",
        batch_number: "Sarzs",
        quantity: "Mennyiség",
        unit: "Egység",
        weight_kg: "Súly (kg)",
        use_by_date: "Lejárat",
        days_until_expiry: "Napok lejáratig",
      }
    );

    toast.success("Riport exportálva");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold text-foreground">Készletszint riport</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Keresés..."
            />
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportálás CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <StockTable filters={{ search }} />
    </div>
  );
}
