import { useSuspenseQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { dashboardStatsQueryOptions } from "@/queries/dashboard";
import { formatNumber } from "@/lib/number";

interface ProductSupplierPieChartProps {
  warehouseId?: string;
}

// Chart colors for top 10 suppliers
const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8b5cf6", // Purple
  "#f97316", // Orange
  "#06b6d4", // Cyan
  "#84cc16", // Lime
  "#f43f5e", // Rose
];

/**
 * Product-Supplier Pie Chart Component
 *
 * Displays a pie chart showing product distribution by supplier (top 10).
 * Shows product count and total quantity for each supplier.
 */
export function ProductSupplierPieChart({ warehouseId }: ProductSupplierPieChartProps) {
  const { data: stats } = useSuspenseQuery(dashboardStatsQueryOptions(warehouseId));

  // Format data for chart
  const chartData = stats.supplier_distribution.map((supplier, index) => ({
    name: supplier.supplier_name,
    value: supplier.product_count,
    quantity: supplier.total_quantity_kg,
    color: COLORS[index % COLORS.length],
  }));

  // If no data, show empty state
  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        Nincs megjeleníthető adat
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }: any) => {
            // Only show label if slice is large enough (>5%)
            if (!percent || percent < 0.05) return null;
            return `${name}: ${(percent * 100).toFixed(0)}%`;
          }}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
          }}
          labelStyle={{ color: "hsl(var(--foreground))" }}
          formatter={(value: any, name: any, props: any) => {
            if (name === "value" && value !== undefined) {
              return [
                `${formatNumber(value as number, 0)} termék (${formatNumber(props.payload.quantity, 2)} kg)`,
                "Mennyiség",
              ];
            }
            return [value, name];
          }}
        />
        <Legend
          wrapperStyle={{ color: "hsl(var(--foreground))", fontSize: "12px" }}
          layout="horizontal"
          verticalAlign="bottom"
          align="center"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
