import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { BinMovement } from "@/types";
import { HU } from "@/lib/i18n";
import { formatDateTime } from "@/lib/date";
import { formatNumber } from "@/lib/number";
import { ArrowRight } from "lucide-react";

interface TransferListProps {
  movements: BinMovement[];
  isLoading?: boolean;
}

export function TransferList({ movements, isLoading }: TransferListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-2">{HU.empty.transfers}</div>
        <p className="text-sm text-muted-foreground">
          Kattints a <span className="font-semibold">"Új áthelyezés"</span>{" "}
          gombra az első áthelyezés létrehozásához.
        </p>
      </div>
    );
  }

  // Group movements by pairs (same batch_number, same created_at = one transfer with 2 movements)
  const transferPairs = new Map<string, BinMovement[]>();

  movements.forEach((movement) => {
    const key = `${movement.batch_number}-${movement.created_at}`;
    if (!transferPairs.has(key)) {
      transferPairs.set(key, []);
    }
    transferPairs.get(key)!.push(movement);
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dátum</TableHead>
            <TableHead>Termék</TableHead>
            <TableHead>Sarzs</TableHead>
            <TableHead>Mennyiség</TableHead>
            <TableHead>Tárolóhelyek</TableHead>
            <TableHead>Felhasználó</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from(transferPairs.values()).map((pair) => {
            // Find source (negative) and target (positive)
            const source = pair.find((m) => m.quantity < 0);
            const target = pair.find((m) => m.quantity > 0);

            // Use the first movement for common data
            const movement = source || target || pair[0];

            return (
              <TableRow key={movement.id}>
                <TableCell className="text-sm">
                  {formatDateTime(movement.created_at)}
                </TableCell>
                <TableCell className="font-medium">
                  {movement.product_name}
                  {movement.sku && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({movement.sku})
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-sm font-mono">
                  {movement.batch_number}
                </TableCell>
                <TableCell>
                  {formatNumber(Math.abs(movement.quantity), 2)} {movement.unit}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {source && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {source.bin_code}
                      </Badge>
                    )}
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    {target && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {target.bin_code}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {movement.created_by}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
