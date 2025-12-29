/**
 * WarehouseMapLegend Component
 *
 * Color legend for warehouse map showing:
 * - Status colors (empty, occupied, reserved, inactive)
 * - Expiry urgency colors (expired, critical, high, medium, low)
 */

interface LegendItemProps {
  color: string;
  label: string;
  description?: string;
}

function LegendItem({ color, label, description }: LegendItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-5 w-5 rounded border-2 border-border shadow-sm"
        style={{ backgroundColor: color }}
      />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-card-foreground">{label}</span>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>
    </div>
  );
}

export function WarehouseMapLegend() {
  return (
    <div className="warehouse-map-legend rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-card-foreground">Jelmagyarázat</h3>

      <div className="space-y-4">
        {/* Status section */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">
            Állapot
          </p>
          <div className="grid grid-cols-2 gap-2">
            <LegendItem color="hsl(142 71% 45%)" label="Üres" />
            <LegendItem color="hsl(217 91% 60%)" label="Foglalt" />
            <LegendItem color="hsl(271 91% 65%)" label="Fenntartva" />
            <LegendItem color="hsl(214 32% 59%)" label="Inaktív" />
          </div>
        </div>

        {/* Expiry urgency section */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">
            Lejárati sürgősség
          </p>
          <div className="space-y-2">
            <LegendItem
              color="hsl(0 72% 51%)"
              label="Lejárt / Kritikus"
              description="< 3 nap"
            />
            <LegendItem
              color="hsl(25 95% 53%)"
              label="Magas"
              description="3-7 nap"
            />
            <LegendItem
              color="hsl(45 93% 47%)"
              label="Közepes"
              description="7-14 nap"
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
