import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { warehouseSchema, type WarehouseFormData } from "@/schemas/warehouse";
import { useCreateWarehouse, useUpdateWarehouse } from "@/queries/warehouses";
import type { Warehouse } from "@/types";
import { HU, interpolate } from "@/lib/i18n";

interface WarehouseFormProps {
  warehouse?: Warehouse;
  onSuccess?: () => void;
}

export function WarehouseForm({ warehouse, onSuccess }: WarehouseFormProps) {
  const isEdit = !!warehouse;
  const createMutation = useCreateWarehouse();
  const updateMutation = useUpdateWarehouse(warehouse?.id || "");

  const form = useForm({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: warehouse?.name || "",
      code: warehouse?.code || "",
      address: warehouse?.address || "",
      is_active: warehouse?.is_active ?? true,
    },
  });

  const { register, handleSubmit, formState: { errors } } = form;

  const onSubmit = handleSubmit((data) => {
    const submitData = data as WarehouseFormData;

    if (isEdit) {
      updateMutation.mutate(submitData, {
        onSuccess: () => {
          toast.success(interpolate(HU.success.updated, { entity: "Raktár" }));
          onSuccess?.();
        },
        onError: (error: any) => {
          toast.error(error.response?.data?.detail || HU.errors.generic);
        },
      });
    } else {
      createMutation.mutate(submitData, {
        onSuccess: () => {
          toast.success(interpolate(HU.success.created, { entity: "Raktár" }));
          onSuccess?.();
        },
        onError: (error: any) => {
          toast.error(error.response?.data?.detail || HU.errors.generic);
        },
      });
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">
          Raktár neve <span className="text-error">*</span>
        </Label>
        <Input
          id="name"
          placeholder="pl. Budapest Központi Raktár"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-error">{errors.name.message as string}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="code">
          Raktárkód <span className="text-error">*</span>
        </Label>
        <Input
          id="code"
          placeholder="pl. BP_CENTRAL"
          {...register("code")}
        />
        {errors.code && (
          <p className="text-sm text-error">{errors.code.message as string}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Nagybetűk, számok, _ és - karakterek használhatók
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Cím</Label>
        <Input
          id="address"
          placeholder="1234 Budapest, Raktár utca 12."
          {...register("address")}
        />
        {errors.address && (
          <p className="text-sm text-error">{errors.address.message as string}</p>
        )}
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
          {isPending ? "Mentés..." : isEdit ? HU.actions.save : HU.actions.create}
        </Button>
        {onSuccess && (
          <Button type="button" variant="outline" onClick={onSuccess} disabled={isPending}>
            {HU.actions.cancel}
          </Button>
        )}
      </div>
    </form>
  );
}
