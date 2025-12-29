/**
 * WarehouseMapGrid Component
 *
 * Renders the full SVG warehouse map grid with:
 * - Row and column labels
 * - Grid lines
 * - Bin cells
 * - Responsive sizing based on zoom level
 */

import { useMemo } from "react";
import type { BinWithContent, BinStructureTemplate } from "@/types";
import {
  calculateGridDimensions,
  getBinAtPosition,
} from "@/lib/warehouse-map/grid-calculator";
import { BinCell } from "./bin-cell";

interface WarehouseMapGridProps {
  bins: BinWithContent[];
  template: BinStructureTemplate;
  cellSize: number;
  onBinClick: (bin: BinWithContent) => void;
}

const LABEL_SIZE = 50; // Space for row/column labels (increased for visibility)
const PADDING = 10;

export function WarehouseMapGrid({
  bins,
  template,
  cellSize,
  onBinClick,
}: WarehouseMapGridProps) {
  // Calculate grid dimensions
  const gridDimensions = useMemo(
    () => calculateGridDimensions(bins, template),
    [bins, template]
  );

  const { rows, cols, rowKeys, colKeys, binPositions } = gridDimensions;

  // Calculate SVG dimensions
  const gridWidth = cols * cellSize;
  const gridHeight = rows * cellSize;
  const svgWidth = gridWidth + LABEL_SIZE + PADDING * 2;
  const svgHeight = gridHeight + LABEL_SIZE + PADDING * 2;

  // Show empty state if no bins
  if (bins.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        Nincs megjeleníthető tárolóhely
      </div>
    );
  }

  return (
    <div className="warehouse-map-grid overflow-auto rounded-lg border bg-background">
      <svg
        width={svgWidth}
        height={svgHeight}
        className="warehouse-map-svg"
        style={{ minWidth: svgWidth, minHeight: svgHeight }}
      >
        {/* Column labels (top) - ÁLLVÁNY */}
        {colKeys.map((colKey, colIndex) => (
          <g key={`col-${colIndex}`}>
            {/* Background rect for better visibility - theme aware */}
            <rect
              x={LABEL_SIZE + PADDING + colIndex * cellSize + 2}
              y={PADDING + 5}
              width={cellSize - 4}
              height={LABEL_SIZE - 15}
              style={{
                fill: 'hsl(var(--muted) / 0.3)',
                stroke: 'hsl(var(--border))'
              }}
              strokeWidth="1"
              rx="4"
            />
            <text
              x={LABEL_SIZE + PADDING + colIndex * cellSize + cellSize / 2}
              y={PADDING + 25}
              textAnchor="middle"
              className="text-sm font-bold text-foreground"
              fill="currentColor"
            >
              {colKey}
            </text>
          </g>
        ))}

        {/* Row labels (left) - SOR */}
        {rowKeys.map((rowKey, rowIndex) => (
          <g key={`row-${rowIndex}`}>
            {/* Background rect for better visibility - theme aware */}
            <rect
              x={PADDING + 5}
              y={LABEL_SIZE + PADDING + rowIndex * cellSize + 2}
              width={LABEL_SIZE - 15}
              height={cellSize - 4}
              style={{
                fill: 'hsl(var(--muted) / 0.3)',
                stroke: 'hsl(var(--border))'
              }}
              strokeWidth="1"
              rx="4"
            />
            <text
              x={PADDING + 25}
              y={LABEL_SIZE + PADDING + rowIndex * cellSize + cellSize / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-sm font-bold text-foreground"
              fill="currentColor"
            >
              {rowKey}
            </text>
          </g>
        ))}

        {/* Grid lines - stronger borders for better visual separation */}
        {cellSize >= 40 && (
          <g className="grid-lines">
            {/* Vertical lines */}
            {Array.from({ length: cols + 1 }, (_, i) => (
              <line
                key={`v-${i}`}
                x1={LABEL_SIZE + PADDING + i * cellSize}
                y1={LABEL_SIZE + PADDING}
                x2={LABEL_SIZE + PADDING + i * cellSize}
                y2={LABEL_SIZE + PADDING + gridHeight}
                style={{ stroke: 'hsl(var(--border))' }}
                strokeWidth={1}
              />
            ))}
            {/* Horizontal lines */}
            {Array.from({ length: rows + 1 }, (_, i) => (
              <line
                key={`h-${i}`}
                x1={LABEL_SIZE + PADDING}
                y1={LABEL_SIZE + PADDING + i * cellSize}
                x2={LABEL_SIZE + PADDING + gridWidth}
                y2={LABEL_SIZE + PADDING + i * cellSize}
                style={{ stroke: 'hsl(var(--border))' }}
                strokeWidth={1}
              />
            ))}
          </g>
        )}

        {/* Bin cells */}
        <g className="bin-cells">
          {Array.from({ length: rows }, (_, row) =>
            Array.from({ length: cols }, (_, col) => {
              const bin = getBinAtPosition(bins, binPositions, row, col);
              if (!bin) return null;

              return (
                <BinCell
                  key={bin.id}
                  bin={bin}
                  x={LABEL_SIZE + PADDING + col * cellSize}
                  y={LABEL_SIZE + PADDING + row * cellSize}
                  size={cellSize}
                  onClick={onBinClick}
                />
              );
            })
          )}
        </g>
      </svg>
    </div>
  );
}
