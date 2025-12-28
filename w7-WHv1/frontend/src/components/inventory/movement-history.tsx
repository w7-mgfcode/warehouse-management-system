import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMovements } from "@/queries/movements";
import type { MovementFilters } from "@/queries/movements";
import { HU } from "@/lib/i18n";
import { formatDateTime } from "@/lib/date";
import { formatNumber } from "@/lib/number";

interface MovementHistoryProps {
  filters?: MovementFilters;
}

export function MovementHistory({ filters = {} }: MovementHistoryProps) {
  const { data, isLoading } = useMovements(filters);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {HU.empty.movements}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dátum</TableHead>
            <TableHead>Típus</TableHead>
            <TableHead>Termék</TableHead>
            <TableHead>Tárolóhely</TableHead>
            <TableHead>Sarzs</TableHead>
            <TableHead>Mennyiség</TableHead>
            <TableHead>Készlet előtte</TableHead>
            <TableHead>Készlet utána</TableHead>
            <TableHead>Felhasználó</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((movement) => (
            <TableRow key={movement.id}>
              <TableCell className="text-sm">
                {formatDateTime(movement.created_at)}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {HU.movementTypes[movement.movement_type]}
                </Badge>
              </TableCell>
              <TableCell>
                {movement.product_name}
                {movement.sku && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ({movement.sku})
                  </span>
                )}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {movement.bin_code}
              </TableCell>
              <TableCell className="text-sm">{movement.batch_number}</TableCell>
              <TableCell>
                {formatNumber(movement.quantity, 2)} {movement.unit}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatNumber(movement.quantity_before, 2)}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatNumber(movement.quantity_after, 2)}
              </TableCell>
              <TableCell className="text-sm">{movement.created_by}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
