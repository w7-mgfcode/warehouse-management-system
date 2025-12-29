import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { receiptSchema, type ReceiptFormData, UNIT_OPTIONS } from "@/schemas/inventory";
import { useReceiveGoods } from "@/queries/inventory";
import { ProductSelect } from "@/components/products/product-select";
import { SupplierSelect } from "@/components/suppliers/supplier-select";
import { BinSelect } from "@/components/bins/bin-select";
import { HU } from "@/lib/i18n";
import type { APIError } from "@/types/api";

interface ReceiptFormProps {
  onSuccess?: () => void;
}

export function ReceiptForm({ onSuccess }: ReceiptFormProps) {
  const receiveMutation = useReceiveGoods();

  // Get tomorrow's date as minimum for use_by_date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  const form = useForm({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      bin_id: "",
      product_id: "",
      supplier_id: "",
      batch_number: "",
      use_by_date: "",
      quantity: 0,
      unit: "kg",
      weight_kg: undefined,
      reference_number: "",
      notes: "",
    },
  });

  const { register, handleSubmit, control, formState: { errors } } = form;

  const onSubmit = handleSubmit((data) => {
    const submitData = data as ReceiptFormData;

    receiveMutation.mutate(submitData, {
      onSuccess: (response) => {
        toast.success((response as { message?: string }).message || HU.success.received);
        form.reset();
        onSuccess?.();
      },
      onError: (error) => {
        const axiosError = error as AxiosError<APIError>;
        const message = axiosError.response?.data?.detail;
        toast.error(typeof message === "string" ? message : HU.errors.generic);
      },
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Controller
          name="bin_id"
          control={control}
          render={({ field }) => (
            <BinSelect
              value={field.value}
              onValueChange={field.onChange}
              label="Tárolóhely"
              required
              statusFilter="empty"
            />
          )}
        />
        {errors.bin_id && (
          <p className="text-sm text-error">{errors.bin_id.message as string}</p>
        )}
      </div>

      <div className="space-y-2">
        <Controller
          name="product_id"
          control={control}
          render={({ field }) => (
            <ProductSelect
              value={field.value}
              onValueChange={field.onChange}
              label="Termék"
              required
            />
          )}
        />
        {errors.product_id && (
          <p className="text-sm text-error">{errors.product_id.message as string}</p>
        )}
      </div>

      <div className="space-y-2">
        <Controller
          name="supplier_id"
          control={control}
          render={({ field }) => (
            <SupplierSelect
              value={field.value}
              onValueChange={field.onChange}
              label="Beszállító (opcionális)"
            />
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="batch_number">
          Sarzsszám <span className="text-error">*</span>
        </Label>
        <Input
          id="batch_number"
          placeholder="BATCH-2025-001"
          {...register("batch_number")}
        />
        {errors.batch_number && (
          <p className="text-sm text-error">{errors.batch_number.message as string}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="use_by_date">
          Lejárati dátum <span className="text-error">*</span>
        </Label>
        <Input
          id="use_by_date"
          type="date"
          min={minDate}
          {...register("use_by_date")}
        />
        {errors.use_by_date && (
          <p className="text-sm text-error">{errors.use_by_date.message as string}</p>
        )}
        <p className="text-xs text-muted-foreground">
          A lejárati dátumnak jövőbeli dátumnak kell lennie
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">
            Mennyiség <span className="text-error">*</span>
          </Label>
          <Input
            id="quantity"
            type="number"
            step="0.01"
            placeholder="100"
            {...register("quantity", { valueAsNumber: true })}
          />
          {errors.quantity && (
            <p className="text-sm text-error">{errors.quantity.message as string}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit">
            Mértékegység <span className="text-error">*</span>
          </Label>
          <Controller
            name="unit"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="weight_kg">Súly (kg) - opcionális</Label>
        <Input
          id="weight_kg"
          type="number"
          step="0.01"
          placeholder="Auto-calculated if empty"
          {...register("weight_kg", { valueAsNumber: true })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reference_number">Hivatkozási szám (opcionális)</Label>
        <Input
          id="reference_number"
          placeholder="PO-2025-001"
          {...register("reference_number")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Megjegyzések (opcionális)</Label>
        <Input
          id="notes"
          placeholder="További információk"
          {...register("notes")}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={receiveMutation.isPending}>
          {receiveMutation.isPending ? "Bevételezés..." : "Bevételezés"}
        </Button>
        {onSuccess && (
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
            disabled={receiveMutation.isPending}
          >
            {HU.actions.cancel}
          </Button>
        )}
      </div>
    </form>
  );
}
