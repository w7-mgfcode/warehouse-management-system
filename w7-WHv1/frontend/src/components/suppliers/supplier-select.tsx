import { useSuspenseQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
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
  // CONSTRAINT: Hard limit of 1000 active suppliers for dropdown performance.
  // If more than 1000 suppliers exist, results will be truncated and a warning displayed.
  // TODO: Consider implementing Combobox with search for better UX with large datasets.
  const { data } = useSuspenseQuery(
    suppliersQueryOptions({ is_active: true, page_size: 1000 })
  );

  const isTruncated = data.total > 1000;

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
      {isTruncated && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Figyelem! {data.total} beszállítóból csak az első 1000 jelenik meg.
            Használja a beszállítók listát részletesebb kereséséhez.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
