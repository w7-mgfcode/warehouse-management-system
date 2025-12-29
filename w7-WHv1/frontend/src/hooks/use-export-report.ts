import { useCallback } from "react";
import { toast } from "sonner";
import {
  exportToExcel,
  exportFEFOToExcel,
  exportSupplierStatsToExcel,
  type ExcelExportOptions,
} from "@/lib/export-excel";
import {
  exportToPDF,
  exportFEFOToPDF,
  exportSupplierStatsToPDF,
  exportBinStatusToPDF,
  type PDFExportOptions,
} from "@/lib/export-pdf";
import { exportToCSV } from "@/lib/export";
// import { HU } from "@/lib/i18n";

export type ReportType = "fefo" | "supplier-stats" | "bin-status" | "stock-levels" | "movements" | "generic";

export interface UseExportReportReturn {
  exportToExcel: (data: any[], reportType: ReportType, options?: Partial<ExcelExportOptions>) => Promise<void>;
  exportToPDF: (data: any[], reportType: ReportType, options?: Partial<PDFExportOptions>) => void;
  exportToCSV: (data: any[], filename: string) => void;
  isExporting: boolean;
}

/**
 * Hook for exporting reports in different formats (Excel, PDF, CSV)
 */
export function useExportReport(): UseExportReportReturn {
  const handleExportToExcel = useCallback(async (
    data: any[],
    reportType: ReportType,
    options?: Partial<ExcelExportOptions>
  ): Promise<void> => {
    try {
      toast.loading("Excel exportálás folyamatban...");

      switch (reportType) {
        case "fefo":
          await exportFEFOToExcel(data, options?.filename);
          break;
        case "supplier-stats":
          await exportSupplierStatsToExcel(data, options?.filename);
          break;
        case "generic":
          if (!options?.columns) {
            throw new Error("Columns required for generic export");
          }
          await exportToExcel({
            filename: options.filename || "riport.xlsx",
            sheetName: options.sheetName || "Riport",
            columns: options.columns,
            data,
            conditionalFormatting: options.conditionalFormatting,
          });
          break;
        default:
          throw new Error(`Unsupported report type: ${reportType}`);
      }

      toast.dismiss();
      toast.success("Excel fájl sikeresen letöltve");
    } catch (error) {
      toast.dismiss();
      console.error("Excel export error:", error);
      toast.error("Excel exportálás sikertelen");
      throw error;
    }
  }, []);

  const handleExportToPDF = useCallback((
    data: any[],
    reportType: ReportType,
    options?: Partial<PDFExportOptions>
  ): void => {
    try {
      toast.loading("PDF exportálás folyamatban...");

      switch (reportType) {
        case "fefo":
          exportFEFOToPDF(data, options?.filename);
          break;
        case "supplier-stats":
          exportSupplierStatsToPDF(data, options?.filename);
          break;
        case "bin-status":
          exportBinStatusToPDF(data, options?.filename);
          break;
        case "generic":
          if (!options?.columns || !options?.title) {
            throw new Error("Columns and title required for generic export");
          }
          exportToPDF({
            filename: options.filename || "riport.pdf",
            title: options.title,
            columns: options.columns,
            data,
            orientation: options.orientation,
            conditionalFormatting: options.conditionalFormatting,
          });
          break;
        default:
          throw new Error(`Unsupported report type: ${reportType}`);
      }

      toast.dismiss();
      toast.success("PDF fájl sikeresen letöltve");
    } catch (error) {
      toast.dismiss();
      console.error("PDF export error:", error);
      toast.error("PDF exportálás sikertelen");
      throw error;
    }
  }, []);

  const handleExportToCSV = useCallback((data: any[], filename: string): void => {
    try {
      toast.loading("CSV exportálás folyamatban...");
      exportToCSV(data, filename);
      toast.dismiss();
      toast.success("CSV fájl sikeresen letöltve");
    } catch (error) {
      toast.dismiss();
      console.error("CSV export error:", error);
      toast.error("CSV exportálás sikertelen");
      throw error;
    }
  }, []);

  return {
    exportToExcel: handleExportToExcel,
    exportToPDF: handleExportToPDF,
    exportToCSV: handleExportToCSV,
    isExporting: false,
  };
}
