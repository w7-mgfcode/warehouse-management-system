import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { WarehouseTransfer } from "@/types";
import { HU } from "@/lib/i18n";
import { formatDateTime } from "@/lib/date";
import { formatNumber } from "@/lib/number";

interface TransferListProps {
  transfers: WarehouseTransfer[];
  isLoading?: boolean;
}

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  dispatched: "bg-info/10 text-info border-info/20",
  completed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-secondary text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  pending: HU.status.pending,
  dispatched: "Feladva",
  completed: HU.status.completed,
  cancelled: HU.status.cancelled,
};

export function TransferList({ transfers, isLoading }: TransferListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (transfers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nincs áthelyezés
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dátum</TableHead>
            <TableHead>Termék</TableHead>
            <TableHead>Mennyiség</TableHead>
            <TableHead>Forrás raktár</TableHead>
            <TableHead>Cél raktár</TableHead>
            <TableHead>Státusz</TableHead>
            <TableHead>Létrehozó</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transfers.map((transfer) => (
            <TableRow key={transfer.id}>
              <TableCell className="text-sm">
                {formatDateTime(transfer.created_at)}
              </TableCell>
              <TableCell className="font-medium">{transfer.product_id}</TableCell>
              <TableCell>{formatNumber(transfer.quantity, 0)} kg</TableCell>
              <TableCell>{transfer.from_warehouse_id}</TableCell>
              <TableCell>{transfer.to_warehouse_id}</TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColors[transfer.status]}>
                  {statusLabels[transfer.status] || transfer.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{transfer.created_by}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
