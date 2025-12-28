/**
 * CSV export utility for reports
 */

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  headers?: Partial<Record<keyof T, string>>
) {
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Get headers from first object or use provided headers
  const keys = Object.keys(data[0]) as Array<keyof T>;
  const headerRow = headers
    ? keys.map((key) => headers[key] || String(key)).join(",")
    : keys.join(",");

  // Convert data rows
  const dataRows = data.map((row) =>
    keys
      .map((key) => {
        const value = row[key];
        // Escape commas and quotes
        if (value === null || value === undefined) return "";
        const stringValue = String(value);
        if (stringValue.includes(",") || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(",")
  );

  // Combine header and data
  const csvContent = [headerRow, ...dataRows].join("\n");

  // Create blob and download
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `${filename}_${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
