import { useNavigate } from "react-router-dom";
import { Package, AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { HU } from "@/lib/i18n";

export default function ReportsIndexPage() {
  const navigate = useNavigate();

  const reports = [
    {
      path: "/reports/stock-levels",
      title: "Készletszint riport",
      description: "Aktuális készletszintek raktáronként és termékenként",
      icon: Package,
    },
    {
      path: "/reports/expiry",
      title: "Lejárati riport",
      description: "Lejárati figyelmeztetések sürgősség szerint csoportosítva",
      icon: AlertTriangle,
    },
    {
      path: "/reports/movements",
      title: "Mozgási riport",
      description: "Készletmozgások időszak és típus szerint szűrve",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{HU.nav.reports}</h1>

      <div className="grid md:grid-cols-3 gap-4">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Card
              key={report.path}
              className="cursor-pointer hover:bg-secondary/50 transition-colors"
              onClick={() => navigate(report.path)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  {report.title}
                </CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
