import ExcelJS from "exceljs";
import { formatDate } from "@/lib/date";
import { formatNumber } from "@/lib/number";

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExcelExportOptions {
  filename: string;
  sheetName: string;
  columns: ExcelColumn[];
  data: any[];
  title?: string;
  conditionalFormatting?: (row: any, excelRow: ExcelJS.Row) => void;
}

/**
 * Export data to Excel with styling and conditional formatting
 */
export async function exportToExcel(options: ExcelExportOptions): Promise<void> {
  const {
    filename,
    sheetName,
    columns,
    data,
    // title,
    conditionalFormatting,
  } = options;

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Set up columns
  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || 15,
  }));

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2196F3" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "left" };
  headerRow.height = 20;

  // Add data rows
  data.forEach((item) => {
    const row = worksheet.addRow(item);

    // Apply conditional formatting if provided
    if (conditionalFormatting) {
      conditionalFormatting(item, row);
    }
  });

  // Apply autofilter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  // Freeze header row
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  // Add borders to all cells
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE0E0E0" } },
        left: { style: "thin", color: { argb: "FFE0E0E0" } },
        bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
        right: { style: "thin", color: { argb: "FFE0E0E0" } },
      };
    });
  });

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(buffer, filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

/**
 * Export FEFO report with urgency-based conditional formatting
 */
export async function exportFEFOToExcel(
  data: Array<{
    priority: number;
    bin_code: string;
    product_name: string;
    supplier_name?: string;
    use_by_date: string;
    days_until_expiry: number;
    weight_kg: number;
    batch_number: string;
    urgency: "critical" | "high" | "medium" | "low" | "expired";
  }>,
  filename: string = `fefo_riport_${new Date().toISOString().split("T")[0]}.xlsx`
): Promise<void> {
  await exportToExcel({
    filename,
    sheetName: "FEFO Riport",
    columns: [
      { header: "Prioritás", key: "priority", width: 10 },
      { header: "Tárolóhely", key: "bin_code", width: 15 },
      { header: "Termék", key: "product_name", width: 30 },
      { header: "Beszállító", key: "supplier_name", width: 25 },
      { header: "Lejárat", key: "use_by_date", width: 15 },
      { header: "Napok lejáratig", key: "days_until_expiry", width: 15 },
      { header: "Súly (kg)", key: "weight_kg", width: 12 },
      { header: "Sarzs", key: "batch_number", width: 20 },
    ],
    data: data.map((item) => ({
      ...item,
      use_by_date: formatDate(new Date(item.use_by_date)),
      weight_kg: formatNumber(item.weight_kg),
      supplier_name: item.supplier_name || "-",
    })),
    conditionalFormatting: (item, row) => {
      let fillColor: string;
      let textColor: string = "FF000000";

      switch (item.urgency) {
        case "expired":
          fillColor = "FF000000";
          textColor = "FFFFFFFF";
          break;
        case "critical":
          fillColor = "FFFF5722";
          textColor = "FFFFFFFF";
          break;
        case "high":
          fillColor = "FFFF9800";
          textColor = "FF000000";
          break;
        case "medium":
          fillColor = "FFFFC107";
          textColor = "FF000000";
          break;
        case "low":
          fillColor = "FF4CAF50";
          textColor = "FFFFFFFF";
          break;
        default:
          fillColor = "FFFFFFFF";
      }

      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: fillColor },
      };
      row.font = { color: { argb: textColor } };
    },
  });
}

/**
 * Export supplier statistics to Excel
 */
export async function exportSupplierStatsToExcel(
  data: Array<{
    supplier_name: string;
    products_count: number;
    total_stock_kg: number;
    avg_shelf_life_days: number;
    warehouse_count: number;
  }>,
  filename: string = `beszallitoi_statisztika_${new Date().toISOString().split("T")[0]}.xlsx`
): Promise<void> {
  await exportToExcel({
    filename,
    sheetName: "Beszállítói statisztika",
    columns: [
      { header: "Beszállító", key: "supplier_name", width: 30 },
      { header: "Termékek száma", key: "products_count", width: 15 },
      { header: "Összes készlet (kg)", key: "total_stock_kg", width: 20 },
      { header: "Átl. eltarthatóság (nap)", key: "avg_shelf_life_days", width: 25 },
      { header: "Raktárak száma", key: "warehouse_count", width: 18 },
    ],
    data: data.map((item) => ({
      ...item,
      total_stock_kg: formatNumber(item.total_stock_kg),
      avg_shelf_life_days: formatNumber(item.avg_shelf_life_days, 0),
    })),
  });
}

/**
 * Download blob as file
 */
function downloadBlob(buffer: ArrayBuffer, filename: string, mimeType: string): void {
  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
