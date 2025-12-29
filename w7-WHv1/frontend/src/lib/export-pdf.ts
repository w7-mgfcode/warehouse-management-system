import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "@/lib/date";
import { formatNumber } from "@/lib/number";

export interface PDFColumn {
  header: string;
  dataKey: string;
}

export interface PDFExportOptions {
  filename: string;
  title: string;
  columns: PDFColumn[];
  data: any[];
  orientation?: "portrait" | "landscape";
  conditionalFormatting?: (data: any, rowIndex: number) => {
    fillColor?: number[];
    textColor?: number[];
  };
}

/**
 * Export data to PDF with table formatting
 */
export function exportToPDF(options: PDFExportOptions): void {
  const {
    filename,
    title,
    columns,
    data,
    orientation = "landscape",
    conditionalFormatting,
  } = options;

  // Create PDF document
  const doc = new jsPDF(orientation, "pt", "a4");

  // Add title
  doc.setFontSize(18);
  doc.text(title, 40, 40);

  // Add timestamp
  doc.setFontSize(10);
  doc.setTextColor(100);
  const timestamp = `Generálva: ${formatDate(new Date(), "yyyy. MM. dd. HH:mm")}`;
  doc.text(timestamp, 40, 60);

  // Prepare table data
  const tableData = data.map((item) =>
    columns.map((col) => {
      const value = item[col.dataKey];
      if (value === null || value === undefined) return "-";
      if (typeof value === "number") return formatNumber(value);
      return String(value);
    })
  );

  // Generate table
  autoTable(doc, {
    head: [columns.map((col) => col.header)],
    body: tableData,
    startY: 75,
    styles: {
      fontSize: 9,
      cellPadding: 5,
      overflow: "linebreak",
      cellWidth: "wrap",
    },
    headStyles: {
      fillColor: [33, 150, 243],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    didParseCell: (hookData) => {
      // Apply conditional formatting
      if (hookData.section === "body" && conditionalFormatting) {
        const rowIndex = hookData.row.index;
        const item = data[rowIndex];
        const formatting = conditionalFormatting(item, rowIndex);

        if (formatting.fillColor) {
          hookData.cell.styles.fillColor = formatting.fillColor;
        }
        if (formatting.textColor) {
          hookData.cell.styles.textColor = formatting.textColor;
        }
      }
    },
    margin: { top: 75, right: 40, bottom: 40, left: 40 },
  });

  // Save PDF
  doc.save(filename);
}

/**
 * Export FEFO report to PDF with urgency-based coloring
 */
export function exportFEFOToPDF(
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
  filename: string = `fefo_riport_${new Date().toISOString().split("T")[0]}.pdf`
): void {
  exportToPDF({
    filename,
    title: "FEFO Riport",
    orientation: "landscape",
    columns: [
      { header: "Prioritás", dataKey: "priority" },
      { header: "Tárolóhely", dataKey: "bin_code" },
      { header: "Termék", dataKey: "product_name" },
      { header: "Beszállító", dataKey: "supplier_name" },
      { header: "Lejárat", dataKey: "use_by_date" },
      { header: "Napok", dataKey: "days_until_expiry" },
      { header: "Súly (kg)", dataKey: "weight_kg" },
      { header: "Sarzs", dataKey: "batch_number" },
    ],
    data: data.map((item) => ({
      ...item,
      use_by_date: formatDate(new Date(item.use_by_date), "yyyy. MM. dd."),
      weight_kg: formatNumber(item.weight_kg),
      supplier_name: item.supplier_name || "-",
    })),
    conditionalFormatting: (item) => {
      switch (item.urgency) {
        case "expired":
          return {
            fillColor: [0, 0, 0],
            textColor: [255, 255, 255],
          };
        case "critical":
          return {
            fillColor: [244, 67, 54],
            textColor: [255, 255, 255],
          };
        case "high":
          return {
            fillColor: [255, 152, 0],
            textColor: [0, 0, 0],
          };
        case "medium":
          return {
            fillColor: [255, 193, 7],
            textColor: [0, 0, 0],
          };
        case "low":
          return {
            fillColor: [76, 175, 80],
            textColor: [255, 255, 255],
          };
        default:
          return {};
      }
    },
  });
}

/**
 * Export supplier statistics to PDF
 */
export function exportSupplierStatsToPDF(
  data: Array<{
    supplier_name: string;
    products_count: number;
    total_stock_kg: number;
    avg_shelf_life_days: number;
    warehouse_count: number;
  }>,
  filename: string = `beszallitoi_statisztika_${new Date().toISOString().split("T")[0]}.pdf`
): void {
  exportToPDF({
    filename,
    title: "Beszállítói statisztika",
    orientation: "landscape",
    columns: [
      { header: "Beszállító", dataKey: "supplier_name" },
      { header: "Termékek száma", dataKey: "products_count" },
      { header: "Összes készlet (kg)", dataKey: "total_stock_kg" },
      { header: "Átl. eltarthatóság (nap)", dataKey: "avg_shelf_life_days" },
      { header: "Raktárak száma", dataKey: "warehouse_count" },
    ],
    data: data.map((item) => ({
      ...item,
      total_stock_kg: formatNumber(item.total_stock_kg),
      avg_shelf_life_days: formatNumber(item.avg_shelf_life_days, 0),
    })),
  });
}

/**
 * Export bin status report to PDF
 */
export function exportBinStatusToPDF(
  data: Array<{
    warehouse_name: string;
    total_bins: number;
    empty_bins: number;
    occupied_bins: number;
    reserved_bins: number;
    utilization_rate: number;
  }>,
  filename: string = `tarolohely_allapot_${new Date().toISOString().split("T")[0]}.pdf`
): void {
  exportToPDF({
    filename,
    title: "Tárolóhely állapot riport",
    orientation: "landscape",
    columns: [
      { header: "Raktár", dataKey: "warehouse_name" },
      { header: "Összes", dataKey: "total_bins" },
      { header: "Üres", dataKey: "empty_bins" },
      { header: "Foglalt", dataKey: "occupied_bins" },
      { header: "Lefoglalt", dataKey: "reserved_bins" },
      { header: "Kihasználtság (%)", dataKey: "utilization_rate" },
    ],
    data: data.map((item) => ({
      ...item,
      utilization_rate: formatNumber(item.utilization_rate) + "%",
    })),
  });
}
