import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  PackageCheck,
  X,
  Calendar,
  User,
  Package,
  MapPin,
  Clock,
} from "lucide-react";
import { reservationQueryOptions } from "@/queries/reservations";
import { formatDateTime } from "@/lib/date";
import { formatNumber } from "@/lib/number";
import { HU } from "@/lib/i18n";

interface ReservationDetailDialogProps {
  reservationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFulfill?: (reservation: { id: string; order_reference: string }) => void;
  onCancel?: (reservation: { id: string; order_reference: string }) => void;
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

export function ReservationDetailDialog({
  reservationId,
  open,
  onOpenChange,
  onFulfill,
  onCancel,
}: ReservationDetailDialogProps) {
  const { data: reservation, isLoading } = useQuery({
    ...reservationQueryOptions(reservationId || ""),
    enabled: !!reservationId && open,
  });

  const isActionable = reservation?.status === "active";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Foglalás részletei
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : reservation ? (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">
                  Rendelés hivatkozás
                </div>
                <div className="font-semibold text-lg">
                  {reservation.order_reference}
                </div>
              </div>
              <div className="flex items-center justify-end">
                <Badge
                  variant="outline"
                  className={statusColors[reservation.status]}
                >
                  {statusLabels[reservation.status] || reservation.status}
                </Badge>
              </div>
            </div>

            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <div className="text-sm text-muted-foreground">Vevő</div>
                  <div className="font-medium">
                    {reservation.customer_name || "—"}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Package className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <div className="text-sm text-muted-foreground">Termék</div>
                  <div className="font-medium">{reservation.product_name}</div>
                  {reservation.sku && (
                    <div className="text-xs text-muted-foreground">
                      {reservation.sku}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <PackageCheck className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <div className="text-sm text-muted-foreground">
                    Foglalt mennyiség
                  </div>
                  <div className="font-medium">
                    {formatNumber(reservation.total_quantity, 0)} kg
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <div className="text-sm text-muted-foreground">
                    Foglalás lejárata
                  </div>
                  <div className="font-medium">
                    {formatDateTime(reservation.reserved_until)}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <div className="text-sm text-muted-foreground">
                    Létrehozva
                  </div>
                  <div className="font-medium">
                    {formatDateTime(reservation.created_at)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Létrehozta: {reservation.created_by}
                  </div>
                </div>
              </div>

              {reservation.fulfilled_at && (
                <div className="flex items-start gap-2">
                  <PackageCheck className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Teljesítve
                    </div>
                    <div className="font-medium">
                      {formatDateTime(reservation.fulfilled_at)}
                    </div>
                  </div>
                </div>
              )}

              {reservation.cancelled_at && (
                <div className="flex items-start gap-2">
                  <X className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <div className="text-sm text-muted-foreground">Törölve</div>
                    <div className="font-medium">
                      {formatDateTime(reservation.cancelled_at)}
                    </div>
                    {reservation.cancellation_reason && (
                      <div className="text-xs text-muted-foreground">
                        Indok: {reservation.cancellation_reason}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {reservation.notes && (
              <div>
                <div className="text-sm font-medium mb-2">Megjegyzések</div>
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  {reservation.notes}
                </div>
              </div>
            )}

            <Separator />

            {/* Allocated Items */}
            <div>
              <div className="text-sm font-medium mb-3">
                Foglalt készletek ({reservation.items?.length || 0} tétel)
              </div>
              <div className="space-y-2">
                {reservation.items?.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground">
                            Rekesz
                          </div>
                          <div className="font-medium">{item.bin_code}</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">
                          Tételszám
                        </div>
                        <div className="font-mono text-sm">
                          {item.batch_number}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">
                          Mennyiség
                        </div>
                        <div className="font-medium">
                          {formatNumber(item.quantity_reserved, 0)} kg
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">
                          Lejárat
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {item.use_by_date}
                          </span>
                          {item.days_until_expiry <= 7 && (
                            <Badge variant="destructive" className="text-xs">
                              {item.days_until_expiry} nap
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            {isActionable && (onFulfill || onCancel) && (
              <>
                <Separator />
                <div className="flex items-center justify-end gap-2">
                  {onCancel && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        onCancel({
                          id: reservation.id,
                          order_reference: reservation.order_reference,
                        });
                        onOpenChange(false);
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Foglalás törlése
                    </Button>
                  )}
                  {onFulfill && (
                    <Button
                      onClick={() => {
                        onFulfill({
                          id: reservation.id,
                          order_reference: reservation.order_reference,
                        });
                        onOpenChange(false);
                      }}
                    >
                      <PackageCheck className="mr-2 h-4 w-4" />
                      Foglalás teljesítése
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Nem található foglalás
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
