import { useState } from "react";
import { Download, ArrowLeft, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MovementHistory } from "@/components/inventory/movement-history";
import { MovementStats } from "@/components/reports/movement-stats";
import { MovementFiltersBar } from "@/components/reports/movement-filters-bar";
import { useMovements } from "@/queries/movements";
import type { MovementType } from "@/types";
import { exportToCSV } from "@/lib/export";
import { toast } from "sonner";

export default function MovementsReportPage() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];
  const [filters, setFilters] = useState<{
    movement_type?: MovementType;
    start_date?: string;
    end_date?: string;
  }>({
    start_date: today,
    end_date: today,
  });

  // Fetch data with current filters for stats and export
  const { data, isLoading } = useMovements({
    ...filters,
    page: 1,
    page_size: 500,
  });

  const handleFiltersChange = (newFilters: {
    movement_type?: MovementType;
    start_date?: string;
    end_date?: string;
  }) => {
    setFilters(newFilters);
  };

  const handleExport = () => {
    if (!data || data.items.length === 0) {
      toast.error("Nincs exportálható adat");
      return;
    }

    const timestamp = new Date().toISOString().split("T")[0];
    exportToCSV(data.items, `mozgasi_riport_${timestamp}`, {
      created_at: "Dátum",
      movement_type: "Típus",
      product_name: "Termék",
      sku: "SKU",
      bin_code: "Tárolóhely",
      batch_number: "Sarzs",
      quantity: "Mennyiség",
      unit: "Egység",
      quantity_before: "Készlet előtte",
      quantity_after: "Készlet utána",
      created_by: "Felhasználó",
      reason: "Indok",
      notes: "Megjegyzések",
    });

    toast.success(`Riport exportálva: ${data.items.length} mozgás`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/reports")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Mozgási riport
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Készletmozgások részletes áttekintése és elemzése
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handlePrint}
            variant="outline"
            className="hidden md:flex print:hidden"
          >
            <FileText className="h-4 w-4 mr-2" />
            Nyomtatás
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            className="print:hidden"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportálás CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="print:hidden">
        <MovementFiltersBar onFiltersChange={handleFiltersChange} />
      </div>

      {/* Statistics Dashboard */}
      <MovementStats movements={data?.items || []} isLoading={isLoading} />

      {/* Movement History Table */}
      <MovementHistory data={data} isLoading={isLoading} />
    </div>
  );
}
