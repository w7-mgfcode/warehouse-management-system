import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { StockReservation } from "@/types";
import { HU } from "@/lib/i18n";
import { formatDateTime } from "@/lib/date";
import { formatNumber } from "@/lib/number";

interface ReservationListProps {
  reservations: StockReservation[];
  isLoading?: boolean;
}

const statusColors: Record<string, string> = {
  active: "bg-info/10 text-info border-info/20",
  fulfilled: "bg-success/10 text-success border-success/20",
  cancelled: "bg-secondary text-muted-foreground",
  expired: "bg-error/10 text-error border-error/20",
};

const statusLabels: Record<string, string> = {
  active: "Aktív",
  fulfilled: HU.status.completed,
  cancelled: HU.status.cancelled,
  expired: HU.status.expired,
};

export function ReservationList({ reservations, isLoading }: ReservationListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {HU.empty.reservations}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rendelés hivatkozás</TableHead>
            <TableHead>Vevő</TableHead>
            <TableHead>Termék</TableHead>
            <TableHead>Mennyiség</TableHead>
            <TableHead>Lefoglalva</TableHead>
            <TableHead>Lejárat</TableHead>
            <TableHead>Státusz</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((reservation) => (
            <TableRow key={reservation.id}>
              <TableCell className="font-medium">
                {reservation.customer_reference}
              </TableCell>
              <TableCell>{reservation.notes || "—"}</TableCell>
              <TableCell>{reservation.product_id}</TableCell>
              <TableCell>
                {formatNumber(reservation.requested_quantity, 0)} kg
              </TableCell>
              <TableCell>
                {formatNumber(reservation.reserved_quantity, 0)} kg
              </TableCell>
              <TableCell className="text-sm">
                {formatDateTime(reservation.expires_at)}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColors[reservation.status]}>
                  {statusLabels[reservation.status] || reservation.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
