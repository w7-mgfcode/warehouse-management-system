import { useSuspenseQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { occupancyHistoryQueryOptions } from "@/queries/dashboard";
import { formatNumber } from "@/lib/number";

interface OccupancyTrendChartProps {
  days?: number;
  warehouseId?: string;
}

/**
 * Occupancy Trend Chart Component
 *
 * Displays a line chart showing occupancy rate trend over time (default 30 days).
 * Shows both occupancy rate percentage and bin counts.
 */
export function OccupancyTrendChart({ days = 30, warehouseId }: OccupancyTrendChartProps) {
  const { data } = useSuspenseQuery(
    occupancyHistoryQueryOptions({ days, warehouse_id: warehouseId })
  );

  // Format data for chart
  const chartData = data.data.map((point) => ({
    date: format(parseISO(point.date), "MM. dd."),
    rate: point.occupancy_rate,
    occupied: point.occupied_bins,
    total: point.total_bins,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          className="text-xs"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          label={{
            value: "Kihasználtság (%)",
            angle: -90,
            position: "insideLeft",
            style: { fill: "hsl(var(--muted-foreground))" },
          }}
          className="text-xs"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
          }}
          labelStyle={{ color: "hsl(var(--foreground))" }}
          formatter={(value: number, name: string) => {
            if (name === "Kihasználtság") {
              return `${formatNumber(value, 1)}%`;
            }
            return formatNumber(value, 0);
          }}
        />
        <Legend
          wrapperStyle={{ color: "hsl(var(--foreground))" }}
          iconType="line"
        />
        <Line
          type="monotone"
          dataKey="rate"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          name="Kihasználtság"
          dot={{ fill: "hsl(var(--primary))" }}
        />
        <Line
          type="monotone"
          dataKey="occupied"
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          name="Foglalt tárolók"
          dot={{ fill: "hsl(var(--chart-1))" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
