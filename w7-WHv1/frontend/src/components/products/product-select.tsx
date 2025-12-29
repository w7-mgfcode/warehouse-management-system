import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { productsQueryOptions } from "@/queries/products";

interface ProductSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export function ProductSelect({
  value,
  onValueChange,
  label = "Termék",
  required = false,
  disabled = false,
}: ProductSelectProps) {
  // CONSTRAINT: Backend max page_size is 200.
  // Hard limit of 200 active products for dropdown performance.
  // If more than 200 products exist, results will be truncated and a warning displayed.
  // TODO: Consider implementing Combobox with search for better UX with large datasets.
  const { data } = useSuspenseQuery(
    productsQueryOptions({ is_active: true, page_size: 200 })
  );

  const isTruncated = data.total > 200;

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label} {required && <span className="text-error">*</span>}
        </Label>
      )}
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Válasszon terméket" />
        </SelectTrigger>
        <SelectContent>
          {data.items.map((product) => (
            <SelectItem key={product.id} value={product.id}>
              {product.name}
              {product.sku && ` (${product.sku})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isTruncated && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Figyelem! {data.total} termékből csak az első 200 jelenik meg.
            Használja a termékek listát részletesebb kereséséhez.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
