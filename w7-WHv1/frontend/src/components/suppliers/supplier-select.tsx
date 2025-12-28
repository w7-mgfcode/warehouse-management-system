import { useSuspenseQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { suppliersQueryOptions } from "@/queries/suppliers";

interface SupplierSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export function SupplierSelect({
  value,
  onValueChange,
  label = "Beszállító",
  required = false,
  disabled = false,
}: SupplierSelectProps) {
  const { data } = useSuspenseQuery(
    suppliersQueryOptions({ is_active: true, page_size: 1000 })
  );

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label} {required && <span className="text-error">*</span>}
        </Label>
      )}
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Válasszon beszállítót" />
        </SelectTrigger>
        <SelectContent>
          {data.items.map((supplier) => (
            <SelectItem key={supplier.id} value={supplier.id}>
              {supplier.company_name}
              {supplier.tax_number && ` (${supplier.tax_number})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
