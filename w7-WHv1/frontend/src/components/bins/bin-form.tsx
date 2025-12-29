import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Suspense } from "react";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { binSchema, type BinFormData } from "@/schemas/bin";
import { useCreateBin, useUpdateBin } from "@/queries/bins";
import { warehousesQueryOptions } from "@/queries/warehouses";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { Bin } from "@/types";
import type { APIError } from "@/types/api";
import { HU, interpolate } from "@/lib/i18n";

interface BinFormProps {
  bin?: Bin;
  onSuccess?: () => void;
}

function WarehouseSelectField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { data } = useSuspenseQuery(warehousesQueryOptions({ is_active: true, page_size: 100 }));

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Válasszon raktárt" />
      </SelectTrigger>
      <SelectContent>
        {data.items.map((warehouse) => (
          <SelectItem key={warehouse.id} value={warehouse.id}>
            {warehouse.name} ({warehouse.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function BinForm({ bin, onSuccess }: BinFormProps) {
  const isEdit = !!bin;
  const createMutation = useCreateBin();
  const updateMutation = useUpdateBin(bin?.id || "");

  const form = useForm({
    resolver: zodResolver(binSchema),
    defaultValues: {
      warehouse_id: bin?.warehouse_id || "",
      code: bin?.code || "",
      aisle: bin?.aisle || "",
      rack: bin?.rack || "",
      level: bin?.level || "",
      position: bin?.position || "",
      capacity_kg: bin?.capacity_kg || undefined,
      is_active: bin?.is_active ?? true,
    },
  });

  const { register, handleSubmit, control, formState: { errors } } = form;

  const onSubmit = handleSubmit((data) => {
    const submitData = data as BinFormData;

    if (isEdit) {
      updateMutation.mutate(submitData, {
        onSuccess: () => {
          toast.success(interpolate(HU.success.updated, { entity: "Tárolóhely" }));
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
          toast.success(interpolate(HU.success.created, { entity: "Tárolóhely" }));
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
        <Label htmlFor="warehouse_id">
          Raktár <span className="text-error">*</span>
        </Label>
        <Controller
          name="warehouse_id"
          control={control}
          render={({ field }) => (
            <Suspense fallback={<Skeleton className="h-10 w-full" />}>
              <WarehouseSelectField value={field.value} onChange={field.onChange} />
            </Suspense>
          )}
        />
        {errors.warehouse_id && (
          <p className="text-sm text-error">{errors.warehouse_id.message as string}</p>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="aisle">Sor *</Label>
          <Input id="aisle" placeholder="A" {...register("aisle")} />
          {errors.aisle && <p className="text-sm text-error">{errors.aisle.message as string}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="rack">Állvány *</Label>
          <Input id="rack" placeholder="01" {...register("rack")} />
          {errors.rack && <p className="text-sm text-error">{errors.rack.message as string}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="level">Szint *</Label>
          <Input id="level" placeholder="02" {...register("level")} />
          {errors.level && <p className="text-sm text-error">{errors.level.message as string}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="position">Pozíció *</Label>
          <Input id="position" placeholder="03" {...register("position")} />
          {errors.position && <p className="text-sm text-error">{errors.position.message as string}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="code">
          Kód <span className="text-error">*</span>
        </Label>
        <Input id="code" placeholder="A-01-02-03" {...register("code")} />
        {errors.code && <p className="text-sm text-error">{errors.code.message as string}</p>}
        <p className="text-xs text-muted-foreground">
          Javasolt formátum: Sor-Állvány-Szint-Pozíció
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="capacity_kg">Kapacitás (kg)</Label>
        <Input
          id="capacity_kg"
          type="number"
          step="0.01"
          placeholder="1000"
          {...register("capacity_kg", { valueAsNumber: true })}
        />
        {errors.capacity_kg && (
          <p className="text-sm text-error">{errors.capacity_kg.message as string}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_active" {...register("is_active")} className="h-4 w-4" />
        <Label htmlFor="is_active" className="font-normal">Aktív</Label>
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
