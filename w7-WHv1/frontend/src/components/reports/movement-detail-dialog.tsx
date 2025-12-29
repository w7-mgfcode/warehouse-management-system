import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { BinMovement } from "@/types";
import { HU } from "@/lib/i18n";
import { formatDateTime } from "@/lib/date";
import { formatNumber } from "@/lib/number";
import {
  Package,
  MapPin,
  Hash,
  Calendar,
  User,
  FileText,
  AlertCircle,
  CheckCircle,
  Scale,
  ArrowRight,
} from "lucide-react";

interface MovementDetailDialogProps {
  movement: BinMovement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MovementDetailDialog({
  movement,
  open,
  onOpenChange,
}: MovementDetailDialogProps) {
  if (!movement) return null;

  const isTransfer = movement.movement_type === "transfer";
  const isPositive = movement.quantity > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader className="space-y-2 pr-8 sm:pr-0">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-base sm:text-lg">
            <span>Mozgás részletei</span>
            <Badge variant="outline" className="w-fit text-xs">
              {HU.movementTypes[movement.movement_type]}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {formatDateTime(movement.created_at)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Product Information */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase">
              Termék információk
            </h3>
            <div className="grid gap-2 sm:gap-3">
              <div className="flex items-start gap-2 sm:gap-3">
                <Package className="h-3 w-3 sm:h-4 sm:w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Termék
                  </div>
                  <div className="font-medium text-sm sm:text-base truncate text-foreground">
                    {movement.product_name}
                  </div>
                  {movement.sku && (
                    <div className="text-xs text-muted-foreground">
                      SKU: {movement.sku}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3">
                <Hash className="h-3 w-3 sm:h-4 sm:w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Sarzs szám
                  </div>
                  <div className="font-mono font-medium text-sm sm:text-base break-all text-foreground">
                    {movement.batch_number}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Lejárati dátum
                  </div>
                  <div className="font-medium text-sm sm:text-base text-foreground">
                    {new Date(movement.use_by_date).toLocaleDateString("hu-HU")}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3">
                <Scale className="h-3 w-3 sm:h-4 sm:w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Tömeg
                  </div>
                  <div className="font-medium text-sm sm:text-base text-foreground">
                    {formatNumber(movement.weight_kg, 2)} kg
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Location Information */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase">
              Tárolóhely információk
            </h3>
            <div className="grid gap-2 sm:gap-3">
              <div className="flex items-start gap-2 sm:gap-3">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {isTransfer ? "Aktuális tárolóhely" : "Tárolóhely"}
                  </div>
                  <div className="font-mono font-medium text-sm sm:text-base text-foreground">
                    {movement.bin_code}
                  </div>
                </div>
              </div>

              {isTransfer && movement.from_bin_id && movement.to_bin_id && (
                <div className="flex items-center gap-2 p-2 sm:p-3 bg-muted/50 rounded-md">
                  <Badge variant="outline" className="font-mono text-xs">
                    {isPositive ? "From" : "To"}
                  </Badge>
                  <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    Áthelyezés része
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Quantity Information */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase">
              Mennyiségi adatok
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="text-center p-2 sm:p-3 bg-muted/50 rounded-md">
                <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">
                  Előtte
                </div>
                <div className="text-base sm:text-lg font-semibold text-foreground">
                  {formatNumber(movement.quantity_before, 2)}
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">
                  {movement.unit}
                </div>
              </div>

              <div
                className={`text-center p-2 sm:p-3 rounded-md ${
                  isPositive ? "bg-success/10" : "bg-destructive/10"
                }`}
              >
                <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">
                  Változás
                </div>
                <div
                  className={`text-base sm:text-lg font-semibold ${
                    isPositive ? "text-success" : "text-destructive"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {formatNumber(movement.quantity, 2)}
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">
                  {movement.unit}
                </div>
              </div>

              <div className="text-center p-2 sm:p-3 bg-muted/50 rounded-md">
                <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">
                  Utána
                </div>
                <div className="text-base sm:text-lg font-semibold text-foreground">
                  {formatNumber(movement.quantity_after, 2)}
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">
                  {movement.unit}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Movement Details */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase">
              Mozgás részletei
            </h3>
            <div className="grid gap-2 sm:gap-3">
              <div className="flex items-start gap-2 sm:gap-3">
                <User className="h-3 w-3 sm:h-4 sm:w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Felhasználó
                  </div>
                  <div className="font-medium text-sm sm:text-base text-foreground">
                    {movement.created_by}
                  </div>
                </div>
              </div>

              {movement.reason && (
                <div className="flex items-start gap-2 sm:gap-3">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Indok
                    </div>
                    <div className="font-medium text-sm sm:text-base text-foreground">
                      {movement.reason}
                    </div>
                  </div>
                </div>
              )}

              {movement.notes && (
                <div className="flex items-start gap-2 sm:gap-3">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Megjegyzések
                    </div>
                    <div className="text-xs sm:text-sm break-words text-foreground">
                      {movement.notes}
                    </div>
                  </div>
                </div>
              )}

              {movement.reference_number && (
                <div className="flex items-start gap-2 sm:gap-3">
                  <Hash className="h-3 w-3 sm:h-4 sm:w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Hivatkozási szám
                    </div>
                    <div className="font-mono font-medium text-sm sm:text-base break-all text-foreground">
                      {movement.reference_number}
                    </div>
                  </div>
                </div>
              )}

              {/* FEFO Compliance */}
              {movement.fefo_compliant !== undefined && (
                <div className="flex items-start gap-2 sm:gap-3">
                  {movement.fefo_compliant ? (
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mt-0.5 text-success shrink-0" />
                  ) : (
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mt-0.5 text-warning shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      FEFO megfelelés
                    </div>
                    <div
                      className={`font-medium text-sm sm:text-base ${
                        movement.fefo_compliant
                          ? "text-success"
                          : "text-warning"
                      }`}
                    >
                      {movement.fefo_compliant ? "Megfelelő" : "Nem megfelelő"}
                    </div>
                    {movement.force_override && movement.override_reason && (
                      <div className="mt-2 p-2 bg-warning/10 rounded-md">
                        <div className="text-[10px] sm:text-xs font-medium text-warning mb-1">
                          Felülbírálva
                        </div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground break-words">
                          {movement.override_reason}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
