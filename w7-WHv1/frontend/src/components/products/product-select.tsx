import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
  const { data } = useSuspenseQuery(
    productsQueryOptions({ is_active: true, page_size: 1000 })
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
    </div>
  );
}
