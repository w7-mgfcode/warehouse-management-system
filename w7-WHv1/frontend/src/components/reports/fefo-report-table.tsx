import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/date";
import { formatQuantity } from "@/lib/number";
import type { ExpiryWarning } from "@/types";

interface FEFOReportTableProps {
  data: ExpiryWarning[];
}

/**
 * FEFO Report Table Component
 *
 * Displays products sorted by expiry date (FEFO - First Expired, First Out).
 * Shows priority, bin location, product details, and urgency status.
 */
export function FEFOReportTable({ data }: FEFOReportTableProps) {
  const getUrgencyBadge = (daysUntilExpiry: number) => {
    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive" className="bg-black">Lejárt</Badge>;
    }
    if (daysUntilExpiry < 7) {
      return <Badge variant="destructive">Kritikus</Badge>;
    }
    if (daysUntilExpiry < 14) {
      return <Badge variant="destructive" className="bg-orange-600">Magas</Badge>;
    }
    if (daysUntilExpiry < 30) {
      return <Badge variant="default" className="bg-yellow-600">Közepes</Badge>;
    }
    return <Badge variant="default" className="bg-green-600">Alacsony</Badge>;
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nincs megjeleníthető adat
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Prioritás</TableHead>
            <TableHead>Tárolóhely</TableHead>
            <TableHead>Raktár</TableHead>
            <TableHead>Termék</TableHead>
            <TableHead>Batch</TableHead>
            <TableHead>Lejárat</TableHead>
            <TableHead className="text-right">Napok</TableHead>
            <TableHead className="text-right">Mennyiség</TableHead>
            <TableHead>Állapot</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={item.bin_content_id}>
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell className="font-mono">{item.bin_code}</TableCell>
              <TableCell>{item.warehouse_name}</TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{item.product_name}</div>
                  {(item as any).sku && (
                    <div className="text-sm text-muted-foreground font-mono">
                      {(item as any).sku}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-mono text-sm">{item.batch_number}</TableCell>
              <TableCell>{formatDate(item.use_by_date)}</TableCell>
              <TableCell className="text-right font-mono">
                {item.days_until_expiry}
              </TableCell>
              <TableCell className="text-right">
                {formatQuantity(item.quantity, (item as any).unit || "kg")}
              </TableCell>
              <TableCell>{getUrgencyBadge(item.days_until_expiry)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
