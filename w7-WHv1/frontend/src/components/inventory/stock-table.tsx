import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpiryBadge } from "./expiry-badge";
import { BinStatusBadge } from "@/components/bins/bin-status-badge";
import { useStockLevels } from "@/queries/inventory";
import type { StockFilters } from "@/queries/inventory";
import type { BinStatus } from "@/types";
import { HU } from "@/lib/i18n";
import { formatDate } from "@/lib/date";
import { formatNumber, formatWeight } from "@/lib/number";

interface StockTableProps {
  filters?: StockFilters;
}

export function StockTable({ filters = {} }: StockTableProps) {
  const { data, isLoading } = useStockLevels(filters);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {HU.empty.stock}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{HU.table.product}</TableHead>
            <TableHead>{HU.table.warehouse}</TableHead>
            <TableHead>{HU.table.bin}</TableHead>
            <TableHead>{HU.table.batch}</TableHead>
            <TableHead>{HU.table.quantity}</TableHead>
            <TableHead>{HU.table.weight}</TableHead>
            <TableHead>{HU.table.useByDate}</TableHead>
            <TableHead>{HU.table.status}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((stock) => (
            <TableRow key={stock.bin_content_id}>
              <TableCell className="font-medium">
                {stock.product_name}
                {stock.sku && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ({stock.sku})
                  </span>
                )}
              </TableCell>
              <TableCell>{stock.warehouse_name}</TableCell>
              <TableCell className="font-mono text-sm">{stock.bin_code}</TableCell>
              <TableCell className="text-sm">{stock.batch_number}</TableCell>
              <TableCell>
                {formatNumber(stock.quantity, 0)} {stock.unit}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatWeight(stock.weight_kg)}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="text-sm">{formatDate(stock.use_by_date)}</span>
                  <ExpiryBadge useByDate={stock.use_by_date} showDays />
                </div>
              </TableCell>
              <TableCell>
                <BinStatusBadge status={stock.status as BinStatus} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
