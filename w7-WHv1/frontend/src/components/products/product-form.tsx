import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { productSchema, UNIT_OPTIONS, type ProductFormData } from "@/schemas/product";
import { useCreateProduct, useUpdateProduct } from "@/queries/products";
import type { Product } from "@/types";
import type { APIError } from "@/types/api";
import { HU, interpolate } from "@/lib/i18n";

interface ProductFormProps {
  product?: Product;
  onSuccess?: () => void;
}

export function ProductForm({ product, onSuccess }: ProductFormProps) {
  const isEdit = !!product;
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct(product?.id || "");

  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      sku: product?.sku || "",
      category: product?.category || "",
      default_unit: (product?.default_unit || "db") as "db" | "kg" | "l" | "m" | "csomag",
      description: product?.description || "",
      is_active: product?.is_active ?? true,
    },
  });

  const { register, handleSubmit, control, formState: { errors } } = form;

  const onSubmit = handleSubmit((data) => {
    const submitData = data as ProductFormData;

    if (isEdit) {
      updateMutation.mutate(submitData, {
        onSuccess: () => {
          toast.success(interpolate(HU.success.updated, { entity: "Termék" }));
          onSuccess?.();
        },
        onError: (error) => {
          const axiosError = error as AxiosError<APIError>;
          const message = axiosError.response?.data?.detail;
          toast.error(typeof message === "string" ? message : HU.errors.generic);
        },
      });
    } else {
      createMutation.mutate(submitData, {
        onSuccess: () => {
          toast.success(interpolate(HU.success.created, { entity: "Termék" }));
          onSuccess?.();
        },
        onError: (error) => {
          const axiosError = error as AxiosError<APIError>;
          const message = axiosError.response?.data?.detail;
          toast.error(typeof message === "string" ? message : HU.errors.generic);
        },
      });
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">
          Termék neve <span className="text-error">*</span>
        </Label>
        <Input
          id="name"
          placeholder="pl. Csirkemell filé"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-error">{errors.name.message as string}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="sku">SKU (cikkszám)</Label>
        <Input id="sku" placeholder="pl. CSIRKE-001" {...register("sku")} />
        {errors.sku && <p className="text-sm text-error">{errors.sku.message as string}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Kategória</Label>
        <Input
          id="category"
          placeholder="pl. Hús és húskészítmények"
          {...register("category")}
        />
        {errors.category && (
          <p className="text-sm text-error">{errors.category.message as string}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="default_unit">
          Mértékegység <span className="text-error">*</span>
        </Label>
        <Controller
          name="default_unit"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="default_unit">
                <SelectValue placeholder="Válasszon mértékegységet" />
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
        {errors.default_unit && (
          <p className="text-sm text-error">{errors.default_unit.message as string}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Leírás</Label>
        <Input
          id="description"
          placeholder="Opcionális leírás"
          {...register("description")}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          {...register("is_active")}
          className="h-4 w-4"
        />
        <Label htmlFor="is_active" className="font-normal">
          Aktív
        </Label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Mentés..."
            : isEdit
              ? HU.actions.save
              : HU.actions.create}
        </Button>
        {onSuccess && (
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
            disabled={isPending}
          >
            {HU.actions.cancel}
          </Button>
        )}
      </div>
    </form>
  );
}
