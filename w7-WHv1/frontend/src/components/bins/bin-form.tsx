import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Suspense, useState, useEffect } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { binSchema, type BinFormData } from "@/schemas/bin";
import { useCreateBin, useUpdateBin } from "@/queries/bins";
import {
  warehousesQueryOptions,
  warehouseQueryOptions,
} from "@/queries/warehouses";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import type { Bin, BinStructureTemplate } from "@/types";
import type { APIError } from "@/types/api";
import { HU, interpolate } from "@/lib/i18n";

// Helper to generate bin code from template and field values
function generateBinCode(
  codeFormat: string,
  values: Record<string, string>
): string {
  let code = codeFormat;
  Object.entries(values).forEach(([key, value]) => {
    code = code.replace(`{${key}}`, value || "");
  });
  return code;
}

// Helper to detect numeric fields (for zero padding)
function isNumericField(fieldName: string): boolean {
  return (
    /^(rack|level|position|number|num)$/i.test(fieldName) ||
    fieldName.includes("number")
  );
}

interface BinFormProps {
  bin?: Bin;
  onSuccess?: () => void;
}

function WarehouseSelectField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { data } = useSuspenseQuery(
    warehousesQueryOptions({ is_active: true, page_size: 100 })
  );

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Válasszon raktárt" />
      </SelectTrigger>
      <SelectContent>
        {data.items.map((warehouse) => (
          <SelectItem key={warehouse.id} value={warehouse.id}>
            {warehouse.name}
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

  // State for template-aware field values
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const form = useForm({
    resolver: zodResolver(binSchema),
    defaultValues: {
      warehouse_id: bin?.warehouse_id || "",
      code: bin?.code || "",
      aisle: (bin as any)?.aisle || "A", // Default to satisfy schema
      rack: (bin as any)?.rack || "01",
      level: (bin as any)?.level || "01",
      position: (bin as any)?.position || "01",
      capacity_kg: (bin as any)?.capacity_kg || undefined,
      is_active: bin?.is_active ?? true,
    },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
  } = form;
  const warehouseId = watch("warehouse_id");

  // Fetch warehouse template
  const { data: warehouse } = useQuery({
    ...warehouseQueryOptions(warehouseId),
    enabled: !!warehouseId,
  });

  const template = warehouse?.bin_structure_template;

  // Initialize fieldValues from existing bin structure_data
  useEffect(() => {
    if (bin?.structure_data && template) {
      const initialValues: Record<string, string> = {};
      template.fields.forEach((field) => {
        initialValues[field.name] = bin.structure_data[field.name] || "";
      });
      setFieldValues(initialValues);
    } else if (template && !isEdit) {
      // Initialize empty values for create mode
      const initialValues: Record<string, string> = {};
      template.fields.forEach((field) => {
        initialValues[field.name] = "";
      });
      setFieldValues(initialValues);
    }
  }, [bin, template, isEdit]);

  // Auto-generate code when field values change
  useEffect(() => {
    if (template && Object.keys(fieldValues).length > 0) {
      // Apply formatting (uppercase, zero padding)
      const formatted: Record<string, string> = {};
      template.fields.forEach((field) => {
        let value = fieldValues[field.name] || "";

        // Apply auto_uppercase
        if (template.auto_uppercase && value && /^[a-zA-Z]+$/.test(value)) {
          value = value.toUpperCase();
        }

        // Apply zero_padding for numeric fields
        if (template.zero_padding && value && /^\d+$/.test(value)) {
          value = value.padStart(2, "0");
        }

        formatted[field.name] = value;
      });

      const generatedCode = generateBinCode(template.code_format, formatted);
      setValue("code", generatedCode);
    }
  }, [fieldValues, template, setValue]);

  const onSubmit = handleSubmit((data) => {
    let submitData: any = { ...data };

    // If template-aware mode, add structure_data
    if (template) {
      submitData.structure_data = fieldValues;
    }

    if (isEdit) {
      updateMutation.mutate(submitData, {
        onSuccess: () => {
          toast.success(
            interpolate(HU.success.updated, { entity: "Tárolóhely" })
          );
          onSuccess?.();
        },
        onError: (error) => {
          const axiosError = error as AxiosError<APIError>;
          const message = axiosError.response?.data?.detail;
          toast.error(
            typeof message === "string" ? message : HU.errors.generic
          );
        },
      });
    } else {
      createMutation.mutate(submitData, {
        onSuccess: () => {
          toast.success(
            interpolate(HU.success.created, { entity: "Tárolóhely" })
          );
          onSuccess?.();
        },
        onError: (error) => {
          const axiosError = error as AxiosError<APIError>;
          const message = axiosError.response?.data?.detail;
          toast.error(
            typeof message === "string" ? message : HU.errors.generic
          );
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
              <WarehouseSelectField
                value={field.value}
                onChange={field.onChange}
              />
            </Suspense>
          )}
        />
        {errors.warehouse_id && (
          <p className="text-sm text-error">
            {errors.warehouse_id.message as string}
          </p>
        )}
      </div>

      {/* Template-aware dynamic fields */}
      {template && template.fields && template.fields.length > 0 ? (
        <Card className="bg-blue-50 dark:bg-blue-950">
          <CardHeader>
            <CardTitle className="text-base">📋 Tárolóhely mezők</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {template.fields
                .sort((a, b) => a.order - b.order)
                .map((field) => (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={field.name}>
                      {field.label}
                      {field.required && <span className="text-error"> *</span>}
                    </Label>
                    <Input
                      id={field.name}
                      value={fieldValues[field.name] || ""}
                      onChange={(e) => {
                        setFieldValues((prev) => ({
                          ...prev,
                          [field.name]: e.target.value,
                        }));
                      }}
                      placeholder={isNumericField(field.name) ? "01" : "A"}
                    />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Fallback to hardcoded fields if no template */
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="aisle">Sor *</Label>
            <Input id="aisle" placeholder="A" {...register("aisle")} />
            {errors.aisle && (
              <p className="text-sm text-error">
                {errors.aisle.message as string}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rack">Állvány *</Label>
            <Input id="rack" placeholder="01" {...register("rack")} />
            {errors.rack && (
              <p className="text-sm text-error">
                {errors.rack.message as string}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="level">Szint *</Label>
            <Input id="level" placeholder="02" {...register("level")} />
            {errors.level && (
              <p className="text-sm text-error">
                {errors.level.message as string}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Pozíció *</Label>
            <Input id="position" placeholder="03" {...register("position")} />
            {errors.position && (
              <p className="text-sm text-error">
                {errors.position.message as string}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="code">
          Kód <span className="text-error">*</span>
        </Label>
        <Input
          id="code"
          placeholder={template ? template.code_format : "A-01-02-03"}
          {...register("code")}
          readOnly={!!template}
          className={template ? "bg-muted" : ""}
        />
        {errors.code && (
          <p className="text-sm text-error">{errors.code.message as string}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {template
            ? "Automatikusan generált a megadott mezőkből"
            : "Javasolt formátum: Sor-Állvány-Szint-Pozíció"}
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
          <p className="text-sm text-error">
            {errors.capacity_kg.message as string}
          </p>
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
