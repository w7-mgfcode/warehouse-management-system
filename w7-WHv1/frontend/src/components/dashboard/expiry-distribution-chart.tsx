import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { useSuspenseQuery } from "@tanstack/react-query";
import { dashboardStatsQueryOptions } from "@/queries/dashboard";
import { formatNumber } from "@/lib/number";

interface ExpiryDistributionChartProps {
  warehouseId?: string;
}

/**
 * Bar chart showing distribution of products by expiry urgency.
 *
 * Colors:
 * - Black: Expired
 * - Red: Critical (<7 days)
 * - Orange: High (7-14 days)
 * - Yellow: Medium (15-30 days)
 * - Green: Low (>30 days)
 */
export function ExpiryDistributionChart({ warehouseId }: ExpiryDistributionChartProps) {
  const { data: stats } = useSuspenseQuery(dashboardStatsQueryOptions(warehouseId));

  const chartData = [
    { name: "Lejárt", value: stats.expiry_warnings.expired || 0, color: "#000000" },
    { name: "Kritikus (<7 nap)", value: stats.expiry_warnings.critical || 0, color: "#dc2626" },
    { name: "Magas (7-14 nap)", value: stats.expiry_warnings.high || 0, color: "#ea580c" },
    { name: "Közepes (15-30 nap)", value: stats.expiry_warnings.medium || 0, color: "#ca8a04" },
    { name: "Alacsony (>30 nap)", value: stats.expiry_warnings.low || 0, color: "#16a34a" },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="name"
          className="text-xs fill-muted-foreground"
          tick={{ fontSize: 12 }}
        />
        <YAxis
          label={{ value: "Termékek (db)", angle: -90, position: "insideLeft" }}
          className="text-xs fill-muted-foreground"
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(value) => formatNumber(value as number)}
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
          }}
          labelStyle={{ color: "hsl(var(--popover-foreground))" }}
        />
        <Bar dataKey="value" name="Termékek">
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
