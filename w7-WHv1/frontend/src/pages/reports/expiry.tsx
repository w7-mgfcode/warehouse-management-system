import { Download, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ExpiryWarningsList } from "@/components/dashboard/expiry-warnings-list";
import { expiryWarningsQueryOptions } from "@/queries/dashboard";
import { useQuery } from "@tanstack/react-query";
import { exportToCSV } from "@/lib/export";
import { toast } from "sonner";

export default function ExpiryReportPage() {
  const navigate = useNavigate();
  const { data: warnings } = useQuery(expiryWarningsQueryOptions(1000));

  const handleExport = () => {
    if (!warnings || warnings.length === 0) {
      toast.error("Nincs exportálható adat");
      return;
    }

    exportToCSV(
      warnings,
      "lejarati_riport",
      {
        product_name: "Termék",
        warehouse_name: "Raktár",
        bin_code: "Tárolóhely",
        batch_number: "Sarzs",
        quantity: "Mennyiség",
        weight_kg: "Súly (kg)",
        use_by_date: "Lejárat",
        days_until_expiry: "Napok lejáratig",
        urgency: "Sürgősség",
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
          <h1 className="text-3xl font-bold text-foreground">Lejárati figyelmeztetések riport</h1>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportálás CSV
        </Button>
      </div>

      <ExpiryWarningsList />
    </div>
  );
}
