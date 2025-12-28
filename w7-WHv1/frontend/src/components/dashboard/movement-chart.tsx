import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatNumber } from "@/lib/number";

interface MovementData {
  date: string;
  receipts: number;
  issues: number;
}

interface MovementChartProps {
  data?: MovementData[];
}

export function MovementChart({ data = [] }: MovementChartProps) {
  // Mock data if none provided (last 7 days)
  const chartData = data.length > 0 ? data : [
    { date: "12. 15.", receipts: 45, issues: 38 },
    { date: "12. 16.", receipts: 52, issues: 41 },
    { date: "12. 17.", receipts: 38, issues: 35 },
    { date: "12. 18.", receipts: 61, issues: 48 },
    { date: "12. 19.", receipts: 55, issues: 52 },
    { date: "12. 20.", receipts: 48, issues: 45 },
    { date: "12. 21.", receipts: 42, issues: 39 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mozgások (utolsó 7 nap)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: "currentColor" }}
            />
            <YAxis
              tickFormatter={(value) => formatNumber(value, 0)}
              className="text-xs"
              tick={{ fill: "currentColor" }}
            />
            <Tooltip
              formatter={(value) => (value !== undefined ? formatNumber(value as number, 0) : "")}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "1rem" }}
              formatter={(value) => {
                const labels: Record<string, string> = {
                  receipts: "Bevételezés",
                  issues: "Kiadás",
                };
                return labels[value] || value;
              }}
            />
            <Line
              type="monotone"
              dataKey="receipts"
              stroke="hsl(142, 76%, 36%)"
              strokeWidth={2}
              dot={{ fill: "hsl(142, 76%, 36%)" }}
            />
            <Line
              type="monotone"
              dataKey="issues"
              stroke="hsl(0, 84%, 60%)"
              strokeWidth={2}
              dot={{ fill: "hsl(0, 84%, 60%)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
