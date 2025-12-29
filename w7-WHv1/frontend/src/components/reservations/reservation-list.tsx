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
import { AlertCircle } from "lucide-react";
import type { StockReservation } from "@/types";
import { HU } from "@/lib/i18n";
import { formatDateTime } from "@/lib/date";
import { formatNumber } from "@/lib/number";
import { ReservationRowActions } from "./reservation-row-actions";

interface ReservationListProps {
  reservations: StockReservation[];
  isLoading?: boolean;
  onViewDetails?: (reservation: StockReservation) => void;
  onFulfill?: (reservation: StockReservation) => void;
  onCancel?: (reservation: StockReservation) => void;
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

function isExpiringSoon(reservedUntil: string): boolean {
  const expiryDate = new Date(reservedUntil);
  const now = new Date();
  const hoursUntilExpiry =
    (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilExpiry <= 24 && hoursUntilExpiry > 0;
}

export function ReservationList({
  reservations,
  isLoading,
  onViewDetails,
  onFulfill,
  onCancel,
}: ReservationListProps) {
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
            <TableHead>Létrehozva</TableHead>
            <TableHead>Foglalva eddig</TableHead>
            <TableHead>Státusz</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((reservation) => {
            const expiringSoon =
              reservation.status === "active" &&
              isExpiringSoon(reservation.reserved_until);

            return (
              <TableRow
                key={reservation.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onViewDetails?.(reservation)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {reservation.order_reference}
                    {expiringSoon && (
                      <AlertCircle className="h-4 w-4 text-warning" />
                    )}
                  </div>
                </TableCell>
                <TableCell>{reservation.customer_name || "—"}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {reservation.product_name}
                    </div>
                    {reservation.sku && (
                      <div className="text-xs text-muted-foreground">
                        {reservation.sku}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {formatNumber(reservation.total_quantity, 0)} kg
                </TableCell>
                <TableCell>{formatDateTime(reservation.created_at)}</TableCell>
                <TableCell className="text-sm">
                  <div
                    className={expiringSoon ? "text-warning font-medium" : ""}
                  >
                    {formatDateTime(reservation.reserved_until)}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={statusColors[reservation.status]}
                  >
                    {statusLabels[reservation.status] || reservation.status}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <ReservationRowActions
                    reservation={reservation}
                    onViewDetails={onViewDetails}
                    onFulfill={onFulfill}
                    onCancel={onCancel}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
