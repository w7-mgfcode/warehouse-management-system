import { useState } from "react";
import { Download, ArrowLeft, X, Search, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/shared/search-input";
import { StockTable } from "@/components/inventory/stock-table";
import { StockSummaryStats } from "@/components/inventory/stock-summary-stats";
import { useStockLevels } from "@/queries/inventory";
import { exportToCSV } from "@/lib/export";
import { toast } from "sonner";

export default function StockLevelsReportPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  // Fetch data with search filter - used by both summary and table
  const { data, isLoading } = useStockLevels({ search });

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

  const handleClearSearch = () => {
    setSearch("");
  };

  // Helper: Check if search is active
  const hasActiveSearch = search.trim().length > 0;

  // Helper: Get result count message
  const getResultMessage = () => {
    if (!hasActiveSearch) return null;
    if (isLoading) return "Keresés...";
    if (!data || data.length === 0) return "Nincs találat";
    return `${data.length} találat`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">Készletszint riport</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Részletes készletáttekintés tárolóhelyenként és sarzsokként
          </p>
        </div>
      </div>

      {/* Summary Statistics */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <StockSummaryStats data={data} />
      ) : null}

      {/* Search and Export Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search Input Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Keresés termék, tárolóhely, sarzs szerint..."
                />
                {hasActiveSearch && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={handleClearSearch}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button onClick={handleExport} variant="outline" className="sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Exportálás CSV
              </Button>
            </div>

            {/* Search Info and Result Count */}
            {hasActiveSearch && (
              <div className="flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Search className="h-4 w-4" />
                  <span>Keresés:</span>
                  <Badge variant="secondary" className="font-mono">
                    {search}
                  </Badge>
                </div>
                {getResultMessage() && (
                  <Badge variant={data && data.length > 0 ? "default" : "destructive"}>
                    {getResultMessage()}
                  </Badge>
                )}
              </div>
            )}

            {/* Search Help Info */}
            {!hasActiveSearch && (
              <Alert className="bg-muted/50">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Keresési tippek:</strong> Kereshetsz termék névben, tárolóhely kódban
                  vagy sarzs számban. Például: "filé", "A-01", "BATCH-2025"
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legend Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/50" />
              <span className="text-muted-foreground">Kritikus (&lt;7 nap)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500/20 border border-orange-500/50" />
              <span className="text-muted-foreground">Magas (7-14 nap)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500/20 border border-yellow-500/50" />
              <span className="text-muted-foreground">Közepes (14-30 nap)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-muted border border-border" />
              <span className="text-muted-foreground">Alacsony (&gt;30 nap)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Table with all Phase 1 features */}
      <StockTable data={data} isLoading={isLoading} />
    </div>
  );
}
