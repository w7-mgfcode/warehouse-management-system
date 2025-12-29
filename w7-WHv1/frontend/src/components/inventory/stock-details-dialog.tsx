import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExpiryBadge } from "./expiry-badge";
import { BinStatusBadge } from "@/components/bins/bin-status-badge";
import { formatDate, getDaysUntilExpiry } from "@/lib/date";
import { formatNumber, formatWeight } from "@/lib/number";
import type { StockLevel } from "@/queries/inventory";
import type { BinStatus } from "@/types";

interface StockDetailsDialogProps {
  stock: StockLevel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockDetailsDialog({
  stock,
  open,
  onOpenChange,
}: StockDetailsDialogProps) {
  if (!stock) return null;

  const daysUntilExpiry = getDaysUntilExpiry(stock.use_by_date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Készlet részletei</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Info */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">
              Termék információ
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Termék név</p>
                <p className="font-medium">{stock.product_name}</p>
              </div>
              {stock.sku && (
                <div>
                  <p className="text-sm text-muted-foreground">SKU</p>
                  <p className="font-mono">{stock.sku}</p>
                </div>
              )}
            </div>
          </div>

          {/* Location Info */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">
              Tárolási információ
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Raktár</p>
                <p className="font-medium">{stock.warehouse_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tárolóhely</p>
                <p className="font-mono font-medium">{stock.bin_code}</p>
              </div>
            </div>
          </div>

          {/* Batch Info */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">
              Sarzs információ
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Sarzs szám</p>
                <p className="font-mono">{stock.batch_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Állapot</p>
                <BinStatusBadge status={stock.status as BinStatus} />
              </div>
            </div>
          </div>

          {/* Quantity Info */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">
              Mennyiségi információ
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Mennyiség</p>
                <p className="text-xl font-bold">
                  {formatNumber(stock.quantity, 0)} {stock.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Súly</p>
                <p className="text-xl font-bold">{formatWeight(stock.weight_kg)}</p>
              </div>
            </div>
          </div>

          {/* Expiry Info */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">
              Lejárati információ
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Lejárat</p>
                <p className="font-medium">{formatDate(stock.use_by_date)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Napok lejáratig</p>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{daysUntilExpiry} nap</p>
                  <ExpiryBadge useByDate={stock.use_by_date} showDays={false} />
                </div>
              </div>
            </div>
          </div>

          {/* ID Info */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">
              Azonosítók
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Készlet azonosító</p>
                <p className="font-mono text-xs">{stock.bin_content_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Raktár azonosító</p>
                <p className="font-mono text-xs">{stock.warehouse_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Termék azonosító</p>
                <p className="font-mono text-xs">{stock.product_id}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
