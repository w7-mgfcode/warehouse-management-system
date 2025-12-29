import { useState, Suspense } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Loader2, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  bulkBinSchema,
  parseAisles,
  type BulkBinFormData,
} from "@/schemas/bin";
import { useBulkCreateBins } from "@/queries/bins";
import {
  warehousesQueryOptions,
  warehouseQueryOptions,
} from "@/queries/warehouses";
import { useSuspenseQuery } from "@tanstack/react-query";
import { generateBinCode } from "@/lib/bin-template-utils";
import {
  TEMPLATE_PRESETS,
  PRESET_METADATA,
} from "@/constants/template-presets";
import { isTemplateEqualToPreset } from "@/lib/bin-template-utils";
import type { BinStructureTemplate } from "@/types";
import { HU } from "@/lib/i18n";
import { formatNumber } from "@/lib/number";
import type { APIError } from "@/types/api";

interface BinPreview {
  code: string;
  structure_data: Record<string, string>;
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

/**
 * Detect if a field should use numeric input based on field name.
 * Common numeric fields: rack, level, position, bay, shelf, slot, etc.
 */
function isNumericField(fieldName: string): boolean {
  const numericPatterns =
    /^(rack|level|position|bay|shelf|slot|tier|column|row_number|\d+)$/i;
  return numericPatterns.test(fieldName);
}

/**
 * Generate bin preview using warehouse template.
 * Supports any template structure, not just hardcoded 4-field format.
 */
function generateTemplatePreview(
  template: BinStructureTemplate,
  fieldRanges: Record<
    string,
    { start?: number | string; end?: number | string; text?: string }
  >
): BinPreview[] {
  const preview: BinPreview[] = [];

  // Build ranges for each field based on fieldRanges state
  const ranges: Record<string, string[]> = {};

  template.fields.forEach((field) => {
    const fieldRange = fieldRanges[field.name];

    if (!fieldRange) {
      ranges[field.name] = [];
      return;
    }

    // Handle text input (comma-separated or range like A-C)
    if (fieldRange.text !== undefined) {
      const trimmed = fieldRange.text.trim().toUpperCase();

      // Check if range format (A-C)
      if (/^[A-Z]-[A-Z]$/.test(trimmed)) {
        const [start, end] = trimmed.split("-");
        const startCode = start.charCodeAt(0);
        const endCode = end.charCodeAt(0);
        ranges[field.name] = [];
        for (let i = startCode; i <= endCode; i++) {
          ranges[field.name].push(String.fromCharCode(i));
        }
      } else {
        // Split by comma
        ranges[field.name] = trimmed
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
      }
    }
    // Handle numeric range
    else if (fieldRange.start !== undefined && fieldRange.end !== undefined) {
      const start = Number(fieldRange.start);
      const end = Number(fieldRange.end);

      if (isNaN(start) || isNaN(end) || end < start) {
        ranges[field.name] = [];
        return;
      }

      ranges[field.name] = Array.from({ length: end - start + 1 }, (_, i) => {
        const num = start + i;
        return template.zero_padding
          ? String(num).padStart(2, "0")
          : String(num);
      });
    } else {
      ranges[field.name] = [];
    }
  });

  // Generate combinations based on template field order
  const sortedFields = [...template.fields].sort((a, b) => a.order - b.order);

  function generateRecursive(
    fieldIndex: number,
    currentValues: Record<string, string>
  ) {
    if (fieldIndex >= sortedFields.length) {
      // Apply auto_uppercase if enabled
      const processedValues = { ...currentValues };
      if (template.auto_uppercase) {
        Object.keys(processedValues).forEach((key) => {
          processedValues[key] = processedValues[key].toUpperCase();
        });
      }

      // Generate code using template
      const code = generateBinCode(template.code_format, processedValues);
      preview.push({ code, structure_data: processedValues });
      return;
    }

    const field = sortedFields[fieldIndex];
    const fieldValues = ranges[field.name] || [""];

    for (const value of fieldValues) {
      generateRecursive(fieldIndex + 1, {
        ...currentValues,
        [field.name]: value,
      });
    }
  }

  generateRecursive(0, {});
  return preview;
}

interface BinBulkFormProps {
  preselectedWarehouseId?: string;
  onSuccess?: () => void;
}

export function BinBulkForm({
  preselectedWarehouseId,
  onSuccess,
}: BinBulkFormProps) {
  const [preview, setPreview] = useState<BinPreview[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const bulkMutation = useBulkCreateBins();

  const [fieldRanges, setFieldRanges] = useState<
    Record<
      string,
      { start?: number | string; end?: number | string; text?: string }
    >
  >({});

  const form = useForm({
    resolver: zodResolver(bulkBinSchema),
    defaultValues: {
      warehouse_id: preselectedWarehouseId || "",
      aisles: "",
      rack_start: 1,
      rack_end: 10,
      level_start: 1,
      level_end: 5,
      position_start: 1,
      position_end: 4,
      capacity_kg: undefined,
    },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    getValues,
    watch,
  } = form;

  // Fetch warehouse template when warehouse is selected
  const warehouseId = watch("warehouse_id");
  const { data: warehouse } = useQuery({
    ...warehouseQueryOptions(warehouseId),
    enabled: !!warehouseId,
  });

  const template = warehouse?.bin_structure_template;

  // Detect active preset for display
  const activePreset = template
    ? Object.keys(TEMPLATE_PRESETS).find((key) =>
        isTemplateEqualToPreset(template, TEMPLATE_PRESETS[key])
      )
    : null;

  const handlePreview = () => {
    if (!template) {
      toast.error("Kérem válasszon raktárt először");
      return;
    }

    // Validate that all required fields have ranges
    const missingFields = template.fields
      .filter((field) => field.required)
      .filter((field) => {
        const range = fieldRanges[field.name];
        if (!range) return true;
        if (range.text !== undefined) return !range.text.trim();
        return range.start === undefined || range.end === undefined;
      });

    if (missingFields.length > 0) {
      toast.error(
        `Hiányzó kötelező mezők: ${missingFields
          .map((f) => f.label)
          .join(", ")}`
      );
      return;
    }

    try {
      const previewData = generateTemplatePreview(template, fieldRanges);

      if (previewData.length === 0) {
        toast.error("Nincs létrehozható tárolóhely a megadott tartományokkal");
        return;
      }

      setPreview(previewData);
      setShowPreview(true);
      toast.info(`${previewData.length} tárolóhely lesz létrehozva`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Hiba az előnézet generálásakor"
      );
    }
  };

  const onSubmit = handleSubmit((data) => {
    const formData = data as BulkBinFormData;

    // Parse aisles from string to array for API
    const submitData = {
      ...formData,
      aisles: parseAisles(formData.aisles as unknown as string),
    };

    bulkMutation.mutate(submitData, {
      onSuccess: (result) => {
        toast.success(
          `${
            (result as { created?: number }).created || preview.length
          } tárolóhely sikeresen létrehozva`
        );
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
    <div className="space-y-6">
      {/* Template Preview Card */}
      {warehouse && template && (
        <Card className="bg-blue-50 dark:bg-blue-950">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              📋 Raktár Sablon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Preset Name */}
            {activePreset && (
              <div>
                <p className="text-sm text-muted-foreground">Sablon típus</p>
                <p className="font-medium flex items-center gap-2">
                  <span>
                    {
                      PRESET_METADATA[
                        activePreset as keyof typeof PRESET_METADATA
                      ].icon
                    }
                  </span>
                  {
                    PRESET_METADATA[
                      activePreset as keyof typeof PRESET_METADATA
                    ].name
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  {
                    PRESET_METADATA[
                      activePreset as keyof typeof PRESET_METADATA
                    ].description
                  }
                </p>
              </div>
            )}

            {/* Code Format */}
            <div>
              <p className="text-sm text-muted-foreground">Kód formátum</p>
              <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                {template.code_format}
              </code>
            </div>

            {/* Sample Code */}
            {activePreset && (
              <div>
                <p className="text-sm text-muted-foreground">Példa kód</p>
                <code className="text-sm font-mono font-medium">
                  {
                    PRESET_METADATA[
                      activePreset as keyof typeof PRESET_METADATA
                    ].sampleCode
                  }
                </code>
              </div>
            )}

            {/* Template Settings */}
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Elválasztó: </span>
                <code className="font-mono">{template.separator}</code>
              </div>
              <div>
                <span className="text-muted-foreground">Nagybetűs: </span>
                <span>{template.auto_uppercase ? "✓" : "✗"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Nulla kitöltés: </span>
                <span>{template.zero_padding ? "✓" : "✗"}</span>
              </div>
            </div>

            {/* Fields Table */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Mezők ({template.fields.length})
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {template.fields
                  .sort((a, b) => a.order - b.order)
                  .map((field) => (
                    <div
                      key={field.name}
                      className="flex items-center gap-2 bg-background p-2 rounded"
                    >
                      <code className="font-mono text-xs">{field.name}</code>
                      <span className="text-muted-foreground">→</span>
                      <span>{field.label}</span>
                      {field.required && (
                        <span className="text-error text-xs">*</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Template Warning */}
      {warehouseId && !warehouse && (
        <Card className="bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">Raktár adatok betöltése...</p>
            </div>
          </CardContent>
        </Card>
      )}

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

        {/* Dynamic Field Ranges based on Template */}
        {template && (
          <div className="space-y-4">
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Tartományok megadása</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {template.fields
                  .sort((a, b) => a.order - b.order)
                  .map((field) => {
                    const isNumeric = isNumericField(field.name);

                    return (
                      <div key={field.name} className="space-y-2">
                        <Label>
                          {field.label}
                          {field.required && (
                            <span className="text-error ml-1">*</span>
                          )}
                        </Label>

                        {isNumeric ? (
                          // Numeric range inputs
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">
                                Kezdő
                              </Label>
                              <Input
                                type="number"
                                min={1}
                                placeholder="1"
                                value={fieldRanges[field.name]?.start || ""}
                                onChange={(e) => {
                                  const value = e.target.value
                                    ? Number(e.target.value)
                                    : undefined;
                                  setFieldRanges((prev) => ({
                                    ...prev,
                                    [field.name]: {
                                      ...prev[field.name],
                                      start: value,
                                    },
                                  }));
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">
                                Vég
                              </Label>
                              <Input
                                type="number"
                                min={1}
                                placeholder="10"
                                value={fieldRanges[field.name]?.end || ""}
                                onChange={(e) => {
                                  const value = e.target.value
                                    ? Number(e.target.value)
                                    : undefined;
                                  setFieldRanges((prev) => ({
                                    ...prev,
                                    [field.name]: {
                                      ...prev[field.name],
                                      end: value,
                                    },
                                  }));
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          // Text input for alphanumeric fields
                          <div className="space-y-1">
                            <Input
                              placeholder="A,B,C vagy A-C"
                              value={fieldRanges[field.name]?.text || ""}
                              onChange={(e) => {
                                setFieldRanges((prev) => ({
                                  ...prev,
                                  [field.name]: {
                                    text: e.target.value,
                                  },
                                }));
                              }}
                            />
                            <p className="text-xs text-muted-foreground">
                              Lista: A,B,C vagy tartomány: A-C
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Show message if no warehouse selected */}
        {!template && warehouseId && (
          <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
            <p className="text-sm text-yellow-900 dark:text-yellow-100">
              Raktár betöltése...
            </p>
          </div>
        )}

        {!warehouseId && (
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              Válasszon raktárt a tartományok megadásához
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="capacity_kg">Alapértelmezett kapacitás (kg)</Label>
          <Input
            id="capacity_kg"
            type="number"
            step="0.01"
            placeholder="1000"
            {...register("capacity_kg", { valueAsNumber: true })}
          />
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={handlePreview}>
            Előnézet
          </Button>
          <Button
            type="submit"
            disabled={bulkMutation.isPending || !showPreview}
          >
            {bulkMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Létrehozás...
              </>
            ) : (
              HU.actions.create
            )}
          </Button>
        </div>
      </form>

      {showPreview && preview.length > 0 && template && (
        <Card>
          <CardHeader>
            <CardTitle>
              Előnézet: {formatNumber(preview.length, 0)} tárolóhely lesz
              létrehozva
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kód</TableHead>
                    {template.fields
                      .sort((a, b) => a.order - b.order)
                      .map((field) => (
                        <TableHead key={field.name}>{field.label}</TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.slice(0, 20).map((bin, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono font-medium">
                        {bin.code}
                      </TableCell>
                      {template.fields
                        .sort((a, b) => a.order - b.order)
                        .map((field) => (
                          <TableCell key={field.name} className="font-mono">
                            {bin.structure_data[field.name] || "-"}
                          </TableCell>
                        ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {preview.length > 20 && (
              <p className="text-sm text-muted-foreground mt-2">
                ... és még {formatNumber(preview.length - 20, 0)} tárolóhely
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
