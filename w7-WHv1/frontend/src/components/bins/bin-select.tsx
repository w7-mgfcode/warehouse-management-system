import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
  const { data } = useSuspenseQuery(
    binsQueryOptions({
      warehouse_id: warehouseId,
      status: statusFilter,
      page_size: 500,
    })
  );

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Válasszon tárolóhelyet" />
      </SelectTrigger>
      <SelectContent>
        {data.items.map((bin) => (
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
