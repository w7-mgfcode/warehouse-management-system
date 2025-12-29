import { Suspense, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { FileSpreadsheet, FileText, Sheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FEFOReportTable } from "@/components/reports/fefo-report-table";
import { expiryWarningsFullQueryOptions } from "@/queries/dashboard";
import { useExportReport } from "@/hooks/use-export-report";

function FEFOReportContent() {
  // Use expiry warnings with 60-day threshold to get all expiring products
  const { data: response } = useSuspenseQuery(
    expiryWarningsFullQueryOptions({ days_threshold: 60 })
  );
  const recommendations = response.items;
  const { exportToExcel, exportToPDF, exportToCSV } = useExportReport();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: "excel" | "pdf" | "csv") => {
    setIsExporting(true);
    try {
      switch (format) {
        case "excel":
          await exportToExcel(recommendations, "fefo", {
            filename: "fefo-riport.xlsx",
          });
          break;
        case "pdf":
          exportToPDF(recommendations, "fefo", {
            filename: "fefo-riport.pdf",
          });
          break;
        case "csv":
          exportToCSV(recommendations, "fefo-riport.csv");
          break;
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">FEFO Riport</h1>
          <p className="text-muted-foreground mt-1">
            First Expired, First Out - Lejárat szerinti prioritás
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => handleExport("excel")}
            disabled={isExporting || recommendations.length === 0}
            variant="outline"
            size="sm"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button
            onClick={() => handleExport("pdf")}
            disabled={isExporting || recommendations.length === 0}
            variant="outline"
            size="sm"
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button
            onClick={() => handleExport("csv")}
            disabled={isExporting || recommendations.length === 0}
            variant="outline"
            size="sm"
          >
            <Sheet className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {/* Statistics Card */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Összes termék
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recommendations.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Kritikus (&lt;7 nap)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {recommendations.filter((r) => r.days_until_expiry < 7 && r.days_until_expiry >= 0).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lejárt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">
              {recommendations.filter((r) => r.days_until_expiry < 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FEFO Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lejárat szerinti kiadási sorrend</CardTitle>
          <CardDescription>
            A termékek a lejárati dátum szerint rendezve, a legrégebbi először
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FEFOReportTable data={recommendations} />
        </CardContent>
      </Card>
    </div>
  );
}

function FEFOReportSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function FEFOReportPage() {
  return (
    <Suspense fallback={<FEFOReportSkeleton />}>
      <FEFOReportContent />
    </Suspense>
  );
}
