import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatPercentage } from "@/lib/number";

interface OccupancyData {
  warehouse_name: string;
  occupancy_rate: number;
  occupied_bins: number;
  total_bins: number;
}

interface OccupancyChartProps {
  data?: OccupancyData[];
}

export function OccupancyChart({ data = [] }: OccupancyChartProps) {
  // Mock data if none provided
  const chartData = data.length > 0 ? data : [
    { warehouse_name: "Budapest Központi", occupancy_rate: 0.75, occupied_bins: 450, total_bins: 600 },
    { warehouse_name: "Debrecen", occupancy_rate: 0.60, occupied_bins: 300, total_bins: 500 },
    { warehouse_name: "Szeged", occupancy_rate: 0.85, occupied_bins: 340, total_bins: 400 },
  ];

  // Color based on occupancy rate
  const getColor = (rate: number) => {
    if (rate >= 0.9) return "hsl(0, 84%, 60%)"; // Critical (red)
    if (rate >= 0.75) return "hsl(38, 92%, 50%)"; // Warning (orange)
    return "hsl(210, 100%, 40%)"; // Normal (primary blue)
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Raktár kihasználtság</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="warehouse_name"
              className="text-xs"
              tick={{ fill: "currentColor" }}
            />
            <YAxis
              tickFormatter={(value) => formatPercentage(value, 0)}
              className="text-xs"
              tick={{ fill: "currentColor" }}
            />
            <Tooltip
              formatter={(value) => (value !== undefined ? formatPercentage(value as number) : "")}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
              }}
            />
            <Bar dataKey="occupancy_rate" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.occupancy_rate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
