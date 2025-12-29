import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { warehousesQueryOptions } from "@/queries/warehouses";
import { HU } from "@/lib/i18n";

interface WarehouseSelectProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  onValueChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  allowClear?: boolean;
}

function WarehouseSelectContent({
  value,
  onChange,
  onValueChange,
  disabled,
  placeholder,
  allowClear,
}: Omit<WarehouseSelectProps, "label" | "required">) {
  const { data } = useSuspenseQuery(
    warehousesQueryOptions({
      page_size: 100, // All warehouses (unlikely to exceed 100)
    })
  );

  const handleValueChange = (newValue: string) => {
    if (allowClear && newValue === "__clear__") {
      onChange?.(undefined);
      onValueChange?.("" as any);
    } else {
      onChange?.(newValue);
      onValueChange?.(newValue);
    }
  };

  return (
    <Select
      value={value || ""}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder || "Válasszon raktárat"} />
      </SelectTrigger>
      <SelectContent>
        {allowClear && value && (
          <SelectItem
            value="__clear__"
            className="text-muted-foreground italic"
          >
            Összes raktár
          </SelectItem>
        )}
        {data.items.map((warehouse) => (
          <SelectItem key={warehouse.id} value={warehouse.id}>
            <div className="flex items-center gap-2">
              <span>{warehouse.name}</span>
              {warehouse.location && (
                <span className="text-xs text-muted-foreground">
                  ({warehouse.location})
                </span>
              )}
            </div>
          </SelectItem>
        ))}
        {data.items.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {HU.empty.warehouses}
          </div>
        )}
      </SelectContent>
    </Select>
  );
}

export function WarehouseSelect({
  value,
  onChange,
  onValueChange,
  label = "Raktár",
  placeholder,
  required = false,
  disabled = false,
  allowClear = false,
}: WarehouseSelectProps) {
  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label} {required && <span className="text-error">*</span>}
        </Label>
      )}
      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <WarehouseSelectContent
          value={value}
          onChange={onChange}
          onValueChange={onValueChange}
          disabled={disabled}
          placeholder={placeholder}
          allowClear={allowClear}
        />
      </Suspense>
    </div>
  );
}
