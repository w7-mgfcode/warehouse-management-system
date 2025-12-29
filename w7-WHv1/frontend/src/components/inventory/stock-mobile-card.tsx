import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ExpiryBadge } from "./expiry-badge";
import { BinStatusBadge } from "@/components/bins/bin-status-badge";
import { StockRowActions } from "./stock-row-actions";
import { FEFOWarningIndicator } from "./fefo-warning-indicator";
import type { StockLevel } from "@/queries/inventory";
import type { BinStatus } from "@/types";
import { formatDate, getExpiryUrgency } from "@/lib/date";
import { formatNumber, formatWeight } from "@/lib/number";
import { HU } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface StockMobileCardProps {
  stock: StockLevel;
  selected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  onViewDetails: (stock: StockLevel) => void;
  onTransfer: (stock: StockLevel) => void;
  onIssue: (stock: StockLevel) => void;
  onScrap: (stock: StockLevel) => void;
  onReserve: (stock: StockLevel) => void;
  onViewHistory: (stock: StockLevel) => void;
}

export function StockMobileCard({
  stock,
  selected = false,
  onSelectChange,
  onViewDetails,
  onTransfer,
  onIssue,
  onScrap,
  onReserve,
  onViewHistory,
}: StockMobileCardProps) {
  const urgency = getExpiryUrgency(stock.use_by_date);

  const urgencyClasses = {
    expired: "border-red-500 bg-red-500/5",
    critical: "border-red-500 bg-red-500/5",
    high: "border-orange-500 bg-orange-500/5",
    medium: "border-yellow-500 bg-yellow-500/5",
    low: "border-border bg-card",
  };

  return (
    <Card className={cn("relative", urgencyClasses[urgency])}>
      <CardContent className="p-4 space-y-3">
        {/* Header with checkbox and actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {onSelectChange && (
              <Checkbox
                checked={selected}
                onCheckedChange={onSelectChange}
                aria-label={`Kijelölés: ${stock.product_name}`}
                className="mt-1"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base leading-tight mb-1 break-words">
                {stock.product_name}
              </h3>
              {stock.sku && (
                <p className="text-xs text-muted-foreground">SKU: {stock.sku}</p>
              )}
            </div>
          </div>
          <StockRowActions
            stock={stock}
            onViewDetails={onViewDetails}
            onTransfer={onTransfer}
            onIssue={onIssue}
            onScrap={onScrap}
            onReserve={onReserve}
            onViewHistory={onViewHistory}
          />
        </div>

        {/* Location info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">{HU.table.warehouse}:</span>
            <p className="font-medium">{stock.warehouse_name}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">{HU.table.bin}:</span>
            <div className="flex items-center gap-1">
              <p className="font-mono font-medium">{stock.bin_code}</p>
              <FEFOWarningIndicator
                isCompliant={stock.is_fefo_compliant}
                oldestBinCode={stock.oldest_bin_code}
                oldestUseByDate={stock.oldest_use_by_date}
                oldestDaysUntilExpiry={stock.oldest_days_until_expiry}
              />
            </div>
          </div>
        </div>

        {/* Batch and supplier */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">{HU.table.batch}:</span>
            <p className="font-medium">{stock.batch_number}</p>
          </div>
          {stock.supplier_name && (
            <div>
              <span className="text-xs text-muted-foreground">Beszállító:</span>
              <p className="font-medium text-xs break-words">{stock.supplier_name}</p>
            </div>
          )}
        </div>

        {/* Quantity and weight */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">{HU.table.quantity}:</span>
            <p className="font-semibold text-base">
              {formatNumber(stock.quantity, 0)} {stock.unit}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">{HU.table.weight}:</span>
            <p className="font-medium">{formatWeight(stock.weight_kg)}</p>
          </div>
        </div>

        {/* Expiry and status */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t">
          <div className="flex-1">
            <span className="text-xs text-muted-foreground">{HU.table.useByDate}:</span>
            <p className="text-sm font-medium">{formatDate(stock.use_by_date)}</p>
            <div className="mt-1">
              <ExpiryBadge useByDate={stock.use_by_date} showDays />
            </div>
          </div>
          <div>
            <BinStatusBadge status={stock.status as BinStatus} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
