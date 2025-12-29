/**
 * BinCell Component
 *
 * Individual bin cell in the SVG warehouse grid
 * - Rendered as an SVG <rect> element
 * - Color-coded by status and expiry urgency
 * - Clickable to show bin details
 * - Hover tooltip with bin info
 */

import { memo } from "react";
import type { BinWithContent } from "@/types";
import { getBinColor } from "@/lib/warehouse-map/bin-colors";

interface BinCellProps {
  bin: BinWithContent;
  x: number;
  y: number;
  size: number;
  onClick: (bin: BinWithContent) => void;
}

export const BinCell = memo(function BinCell({
  bin,
  x,
  y,
  size,
  onClick,
}: BinCellProps) {
  const colorConfig = getBinColor(bin);

  // Generate tooltip content
  const getTooltipContent = () => {
    const parts = [bin.code];

    if (bin.status === "occupied" && bin.contents && bin.contents.length > 0) {
      const content = bin.contents[0];
      parts.push(content.product_name);
      parts.push(`${content.quantity} ${content.unit}`);

      if (content.days_until_expiry !== null) {
        parts.push(`${content.days_until_expiry} nap lejáratig`);
      }
    } else {
      parts.push(
        bin.status === "empty"
          ? "Üres"
          : bin.status === "reserved"
            ? "Foglalt"
            : "Inaktív"
      );
    }

    return parts.join(" • ");
  };

  return (
    <g className="bin-cell" onClick={() => onClick(bin)}>
      {/* Bin rectangle with enhanced borders */}
      <rect
        x={x + 1}
        y={y + 1}
        width={size - 2}
        height={size - 2}
        fill={colorConfig.fill}
        stroke={colorConfig.stroke}
        strokeWidth={colorConfig.strokeWidth || 2}
        className="cursor-pointer transition-all hover:opacity-80 hover:stroke-[3]"
        rx={4} // Rounded corners for modern look
      />

      {/* Bin code label (only visible at larger zoom levels) */}
      {size >= 60 && (
        <text
          x={x + size / 2}
          y={y + size / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="pointer-events-none select-none text-xs font-medium"
          style={{
            fontSize: Math.max(8, size / 8),
            fill: 'white',
            textShadow: '0 1px 2px rgba(0,0,0,0.8)'
          }}
        >
          {bin.code}
        </text>
      )}

      {/* Tooltip title (SVG title element for native browser tooltip) */}
      <title>{getTooltipContent()}</title>
    </g>
  );
});
