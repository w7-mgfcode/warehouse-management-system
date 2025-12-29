import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { warehouseSchema, type WarehouseFormData } from "@/schemas/warehouse";
import { useCreateWarehouse, useUpdateWarehouse } from "@/queries/warehouses";
import type { Warehouse, BinStructureTemplate } from "@/types";
import type { APIError } from "@/types/api";
import { HU, interpolate } from "@/lib/i18n";
import { BinStructureTemplateEditor } from "./bin-structure/bin-structure-template-editor";

interface WarehouseFormProps {
  warehouse?: Warehouse;
  onSuccess?: () => void;
}

const DEFAULT_TEMPLATE: BinStructureTemplate = {
  fields: [
    { name: "aisle", label: "Sor", required: true, order: 1 },
    { name: "rack", label: "Állvány", required: true, order: 2 },
    { name: "level", label: "Szint", required: true, order: 3 },
    { name: "position", label: "Pozíció", required: true, order: 4 },
  ],
  code_format: "{aisle}-{rack}-{level}-{position}",
  separator: "-",
  auto_uppercase: true,
  zero_padding: true,
};

export function WarehouseForm({ warehouse, onSuccess }: WarehouseFormProps) {
  const isEdit = !!warehouse;
  const createMutation = useCreateWarehouse();
  const updateMutation = useUpdateWarehouse(warehouse?.id || "");

  const form = useForm({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: warehouse?.name || "",
      location: warehouse?.location || "",
      description: warehouse?.description || "",
      bin_structure_template: warehouse?.bin_structure_template || DEFAULT_TEMPLATE,
      is_active: warehouse?.is_active ?? true,
    },
  });

  const { register, handleSubmit, control, formState: { errors } } = form;

  const onSubmit = handleSubmit((data) => {
    const submitData = data as WarehouseFormData;

    if (isEdit) {
      updateMutation.mutate(submitData, {
        onSuccess: () => {
          toast.success(interpolate(HU.success.updated, { entity: "Raktár" }));
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
          toast.success(interpolate(HU.success.created, { entity: "Raktár" }));
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
    <form onSubmit={onSubmit} className="space-y-6 w-full">
      <Tabs defaultValue="basic-info" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic-info">Alapadatok</TabsTrigger>
          <TabsTrigger value="bin-template">Tárolóhely Sablon</TabsTrigger>
        </TabsList>

        <TabsContent value="basic-info" className="space-y-4 mt-4 w-full">
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
            <Label htmlFor="location">Cím</Label>
            <Input
              id="location"
              placeholder="1234 Budapest, Raktár utca 12."
              {...register("location")}
            />
            {errors.location && (
              <p className="text-sm text-error">{errors.location.message as string}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Leírás</Label>
            <Input
              id="description"
              placeholder="További információk..."
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-error">{errors.description.message as string}</p>
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
        </TabsContent>

        <TabsContent value="bin-template" className="mt-4 w-full">
          <Controller
            name="bin_structure_template"
            control={control}
            render={({ field }) => (
              <BinStructureTemplateEditor
                value={field.value as BinStructureTemplate}
                onChange={field.onChange}
              />
            )}
          />
          {errors.bin_structure_template && (
            <p className="text-sm text-error mt-2">
              {errors.bin_structure_template.message as string}
            </p>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t">
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
          {isPending ? "Mentés..." : isEdit ? HU.actions.save : HU.actions.create}
        </Button>
        {onSuccess && (
          <Button type="button" variant="outline" onClick={onSuccess} disabled={isPending} className="w-full sm:w-auto">
            {HU.actions.cancel}
          </Button>
        )}
      </div>
    </form>
  );
}
