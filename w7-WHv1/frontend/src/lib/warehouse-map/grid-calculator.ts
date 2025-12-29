/**
 * Grid Calculator for Warehouse Map Visualization
 *
 * Calculates 2D grid dimensions from dynamic bin structure templates
 * using a 50/50 field split algorithm:
 * - First half of fields → Row keys
 * - Second half of fields → Column keys
 */

import type {
  BinWithContent,
  BinStructureTemplate,
  // BinStructureField, // unused
} from "@/types";

export interface GridPosition {
  row: number;
  col: number;
}

export interface GridDimensions {
  rows: number;
  cols: number;
  rowKeys: string[];
  colKeys: string[];
  binPositions: Map<string, GridPosition>; // bin.id -> {row, col}
}

/**
 * Generate a field key from structure data values
 * Example: { aisle: "A", rack: "01" } with separator "-" → "A-01"
 */
function generateFieldKey(
  structureData: Record<string, string>,
  fieldNames: string[],
  separator: string
): string {
  return fieldNames.map((name) => structureData[name] || "").join(separator);
}

/**
 * Calculate grid dimensions from bins and template
 *
 * Universal Algorithm (works with any template structure):
 * 1. Sort template fields by order
 * 2. Split fields 50/50 (first half = rows, second half = columns)
 * 3. Generate unique row keys from bin structure_data
 * 4. Generate unique column keys from bin structure_data
 * 5. Map each bin to grid coordinates (row, col)
 *
 * Note: Level filtering is handled by the parent component.
 * When a specific level is selected (e.g., "Szint 01"), only bins
 * from that level are passed to this function, preventing overlaps.
 *
 * Example with 4 fields [sor, állvány, szint, pozíció]:
 * - Row fields: [sor, állvány] → "A-01", "A-02", "B-01"
 * - Col fields: [szint, pozíció] → "01-Pos01", "01-Pos02"
 * - When filtered to Szint 01, all col keys start with "01-"
 *
 * Example with 2 fields [zone, position]:
 * - Row fields: [zone] → "FRISS", "HUTO"
 * - Col fields: [position] → "01", "02", "03"
 */
export function calculateGridDimensions(
  bins: BinWithContent[],
  template: BinStructureTemplate
): GridDimensions {
  if (bins.length === 0) {
    return {
      rows: 0,
      cols: 0,
      rowKeys: [],
      colKeys: [],
      binPositions: new Map(),
    };
  }

  // Sort fields by order
  const sortedFields = [...template.fields].sort(
    (a, b) => a.order - b.order
  );
  const fieldNames = sortedFields.map((f) => f.name);

  // Split fields 50/50 (first half = rows, second half = columns)
  const splitPoint = Math.ceil(fieldNames.length / 2);
  const rowFieldNames = fieldNames.slice(0, splitPoint);
  const colFieldNames = fieldNames.slice(splitPoint);

  // Generate unique row and column keys
  const rowKeysSet = new Set<string>();
  const colKeysSet = new Set<string>();
  const binPositions = new Map<string, GridPosition>();

  for (const bin of bins) {
    const rowKey = generateFieldKey(
      bin.structure_data,
      rowFieldNames,
      template.separator
    );
    const colKey = generateFieldKey(
      bin.structure_data,
      colFieldNames,
      template.separator
    );

    rowKeysSet.add(rowKey);
    colKeysSet.add(colKey);
  }

  // Sort keys for consistent ordering (alphanumeric sort)
  const rowKeys = Array.from(rowKeysSet).sort((a, b) =>
    a.localeCompare(b, "hu", { numeric: true })
  );
  const colKeys = Array.from(colKeysSet).sort((a, b) =>
    a.localeCompare(b, "hu", { numeric: true })
  );

  // Map bins to grid positions
  for (const bin of bins) {
    const rowKey = generateFieldKey(
      bin.structure_data,
      rowFieldNames,
      template.separator
    );
    const colKey = generateFieldKey(
      bin.structure_data,
      colFieldNames,
      template.separator
    );

    const row = rowKeys.indexOf(rowKey);
    const col = colKeys.indexOf(colKey);

    if (row !== -1 && col !== -1) {
      binPositions.set(bin.id, { row, col });
    }
  }

  return {
    rows: rowKeys.length,
    cols: colKeys.length,
    rowKeys,
    colKeys,
    binPositions,
  };
}

/**
 * Get bin at specific grid position
 */
export function getBinAtPosition(
  bins: BinWithContent[],
  binPositions: Map<string, GridPosition>,
  row: number,
  col: number
): BinWithContent | null {
  for (const bin of bins) {
    const pos = binPositions.get(bin.id);
    if (pos && pos.row === row && pos.col === col) {
      return bin;
    }
  }
  return null;
}
