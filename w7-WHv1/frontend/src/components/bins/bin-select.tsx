import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { binsQueryOptions } from "@/queries/bins";
import { BinStatusBadge } from "./bin-status-badge";
import { HU } from "@/lib/i18n";
import type { BinStatus } from "@/types";

interface BinSelectProps {
  warehouseId?: string;
  value?: string;
  onValueChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  statusFilter?: BinStatus;
}

function BinSelectContent({
  warehouseId,
  value,
  onValueChange,
  statusFilter,
  disabled,
}: Omit<BinSelectProps, "label" | "required">) {
  // CONSTRAINT: Hard limit of 500 bins for dropdown performance.
  // Bins are warehouse-specific, so 500 per warehouse is more reasonable than 1000.
  // If more than 500 bins exist, results will be truncated and a warning displayed.
  // TODO: Consider implementing Combobox with search for better UX with large bin counts.
  const { data } = useSuspenseQuery(
    binsQueryOptions({
      warehouse_id: warehouseId,
      status: statusFilter,
      page_size: 500,
    })
  );

  const isTruncated = data.total > 500;

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Válasszon tárolóhelyet" />
        </SelectTrigger>
        <SelectContent>
          {data.items.map((bin: any) => (
            <SelectItem key={bin.id} value={bin.id}>
              <div className="flex items-center gap-2">
                <span className="font-mono">{bin.code}</span>
                <BinStatusBadge status={bin.status} />
              </div>
            </SelectItem>
          ))}
          {data.items.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {HU.empty.binsAvailable}
            </div>
          )}
        </SelectContent>
      </Select>
      {isTruncated && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Figyelem! {data.total} tárolóhelyből csak az első 500 jelenik meg.
            Használja a tárolóhelyek listát részletesebb kereséséhez.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export function BinSelect({
  warehouseId,
  value,
  onValueChange,
  label = "Tárolóhely",
  required = false,
  disabled = false,
  statusFilter,
}: BinSelectProps) {
  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label} {required && <span className="text-error">*</span>}
        </Label>
      )}
      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <BinSelectContent
          warehouseId={warehouseId}
          value={value}
          onValueChange={onValueChange}
          statusFilter={statusFilter}
          disabled={disabled}
        />
      </Suspense>
    </div>
  );
}
