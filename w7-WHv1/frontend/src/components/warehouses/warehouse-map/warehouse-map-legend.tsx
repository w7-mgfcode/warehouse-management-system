/**
 * WarehouseMapLegend Component
 *
 * Color legend for warehouse map showing:
 * - Status colors (empty, occupied, reserved, inactive)
 * - Expiry urgency colors (expired, critical, high, medium, low)
 * - Dynamic counts based on filtered bins
 */

import type { BinWithContent } from "@/types";

interface LegendItemProps {
  color: string;
  label: string;
  description?: string;
  count?: number;
}

function LegendItem({ color, label, description, count }: LegendItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-5 w-5 rounded border-2 border-border shadow-sm"
        style={{ backgroundColor: color }}
      />
      <div className="flex flex-col flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-card-foreground">
            {label}
          </span>
          {count !== undefined && (
            <span className="text-xs font-semibold text-muted-foreground">
              ({count})
            </span>
          )}
        </div>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>
    </div>
  );
}

interface WarehouseMapLegendProps {
  bins?: BinWithContent[];
}

export function WarehouseMapLegend({ bins = [] }: WarehouseMapLegendProps) {
  // Calculate status counts
  const statusCounts = {
    empty: bins.filter((b) => b.status === "empty").length,
    occupied: bins.filter((b) => b.status === "occupied").length,
    reserved: bins.filter((b) => b.status === "reserved").length,
    inactive: bins.filter((b) => b.status === "inactive").length,
  };

  // Calculate urgency counts (only from bins with content)
  const urgencyCounts = {
    expired: 0,
    critical: 0,
    high: 0,
    medium: 0,
  };

  bins.forEach((bin) => {
    if (bin.contents && bin.contents.length > 0) {
      bin.contents.forEach((content) => {
        // Only count contents with quantity > 0
        if (content.quantity > 0 && content.urgency) {
          if (content.urgency === "expired") urgencyCounts.expired++;
          else if (content.urgency === "critical") urgencyCounts.critical++;
          else if (content.urgency === "high") urgencyCounts.high++;
          else if (content.urgency === "medium") urgencyCounts.medium++;
        }
      });
    }
  });
  return (
    <div className="warehouse-map-legend rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-card-foreground">
        Jelmagyarázat
      </h3>

      <div className="space-y-4">
        {/* Status section */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">
            Állapot
          </p>
          <div className="grid grid-cols-2 gap-2">
            <LegendItem
              color="hsl(142 71% 45%)"
              label="Üres"
              count={statusCounts.empty}
            />
            <LegendItem
              color="hsl(217 91% 60%)"
              label="Foglalt"
              count={statusCounts.occupied}
            />
            <LegendItem
              color="hsl(271 91% 65%)"
              label="Fenntartva"
              count={statusCounts.reserved}
            />
            <LegendItem
              color="hsl(214 32% 59%)"
              label="Inaktív"
              count={statusCounts.inactive}
            />
          </div>
        </div>

        {/* Expiry urgency section */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">
            Lejárati sürgősség (termékek)
          </p>
          <div className="space-y-2">
            <LegendItem
              color="hsl(0 72% 51%)"
              label="Lejárt / Kritikus"
              description="< 7 nap"
              count={urgencyCounts.expired + urgencyCounts.critical}
            />
            <LegendItem
              color="hsl(25 95% 53%)"
              label="Magas"
              description="7-14 nap"
              count={urgencyCounts.high}
            />
            <LegendItem
              color="hsl(45 93% 47%)"
              label="Közepes"
              description="14-30 nap"
              count={urgencyCounts.medium}
            />
          </div>
        </div>

        {/* Info note */}
        <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
          A lejárati sürgősség színei felülírják az állapot színeit a FEFO
          megfelelőség érdekében.
        </div>
      </div>
    </div>
  );
}
