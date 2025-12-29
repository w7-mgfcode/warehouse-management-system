/**
 * BinDetailsDialog Component
 *
 * Modal dialog showing detailed information about a selected bin:
 * - Bin metadata (code, status, capacity)
 * - Contents table (products, quantities, expiry dates)
 * - Action buttons (view product, close)
 */

import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { Package, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BinWithContent } from "@/types";
import {
  getUrgencyBadgeColor,
  getStatusBadgeColor,
} from "@/lib/warehouse-map/bin-colors";

interface BinDetailsDialogProps {
  bin: BinWithContent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BinDetailsDialog({
  bin,
  open,
  onOpenChange,
}: BinDetailsDialogProps) {
  if (!bin) return null;

  // Filter out contents with zero quantity
  const activeContents =
    bin.contents?.filter((content) => content.quantity > 0) || [];
  const hasContents = activeContents.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Tárolóhely: {bin.code}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bin metadata */}
          <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/50 p-4">
            <div>
              <p className="text-sm text-muted-foreground">Állapot</p>
              <Badge className={`${getStatusBadgeColor(bin.status)} mt-1`}>
                {bin.status === "empty"
                  ? "Üres"
                  : bin.status === "occupied"
                  ? "Foglalt"
                  : bin.status === "reserved"
                  ? "Fenntartva"
                  : "Inaktív"}
              </Badge>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Aktív</p>
              <p className="mt-1 font-medium">
                {bin.is_active ? "Igen" : "Nem"}
              </p>
            </div>

            {bin.max_weight && (
              <div>
                <p className="text-sm text-muted-foreground">Max. súly</p>
                <p className="mt-1 font-medium">{bin.max_weight} kg</p>
              </div>
            )}

            {bin.max_height && (
              <div>
                <p className="text-sm text-muted-foreground">Max. magasság</p>
                <p className="mt-1 font-medium">{bin.max_height} cm</p>
              </div>
            )}

            {bin.accessibility && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">
                  Megközelíthetőség
                </p>
                <p className="mt-1 font-medium">{bin.accessibility}</p>
              </div>
            )}

            {bin.notes && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Megjegyzések</p>
                <p className="mt-1 text-sm">{bin.notes}</p>
              </div>
            )}
          </div>

          {/* Contents table */}
          {hasContents ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Tartalom</h3>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Termék</TableHead>
                      <TableHead>Beszállító</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Mennyiség</TableHead>
                      <TableHead>Lejárat</TableHead>
                      <TableHead>Sürgősség</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeContents.map((content) => (
                      <TableRow key={content.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {content.product_name}
                            </p>
                            {content.product_sku && (
                              <p className="text-xs text-muted-foreground">
                                SKU: {content.product_sku}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {content.supplier_name || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {content.batch_number}
                        </TableCell>
                        <TableCell>
                          {content.quantity} {content.unit}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>
                              {format(
                                new Date(content.use_by_date),
                                "yyyy. MM. dd.",
                                { locale: hu }
                              )}
                            </p>
                            {content.days_until_expiry !== null && (
                              <p className="text-xs text-muted-foreground">
                                {content.days_until_expiry} nap
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {content.urgency ? (
                            <Badge
                              className={getUrgencyBadgeColor(content.urgency)}
                            >
                              {content.urgency === "expired"
                                ? "Lejárt"
                                : content.urgency === "critical"
                                ? "Kritikus"
                                : content.urgency === "high"
                                ? "Magas"
                                : content.urgency === "medium"
                                ? "Közepes"
                                : "Alacsony"}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Warning for expired/critical items */}
              {activeContents.some(
                (c) => c.urgency === "expired" || c.urgency === "critical"
              ) && (
                <div className="mt-2 flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>
                    Figyelem! Ez a tárolóhely lejárt vagy kritikus lejáratú
                    termékeket tartalmaz. FEFO elvnek megfelelően ezeket kell
                    először kiadni.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/50 p-8 text-center text-muted-foreground">
              Ez a tárolóhely jelenleg üres
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
