import { useState, Suspense } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { bulkBinSchema, parseAisles, type BulkBinFormData } from "@/schemas/bin";
import { useBulkCreateBins } from "@/queries/bins";
import { warehousesQueryOptions } from "@/queries/warehouses";
import { useSuspenseQuery } from "@tanstack/react-query";
import { HU } from "@/lib/i18n";
import { formatNumber } from "@/lib/number";
import type { APIError } from "@/types/api";

interface BinPreview {
  code: string;
  aisle: string;
  rack: string;
  level: string;
  position: string;
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
            {warehouse.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function generatePreview(data: BulkBinFormData): BinPreview[] {
  const aisles = parseAisles(data.aisles);
  const preview: BinPreview[] = [];

  for (const aisle of aisles) {
    for (let rack = data.rack_start; rack <= data.rack_end; rack++) {
      for (let level = data.level_start; level <= data.level_end; level++) {
        for (let position = data.position_start; position <= data.position_end; position++) {
          const rackStr = String(rack).padStart(2, "0");
          const levelStr = String(level).padStart(2, "0");
          const positionStr = String(position).padStart(2, "0");
          const code = `${aisle}-${rackStr}-${levelStr}-${positionStr}`;

          preview.push({
            code,
            aisle,
            rack: rackStr,
            level: levelStr,
            position: positionStr,
          });
        }
      }
    }
  }

  return preview;
}

interface BinBulkFormProps {
  onSuccess?: () => void;
}

export function BinBulkForm({ onSuccess }: BinBulkFormProps) {
  const [preview, setPreview] = useState<BinPreview[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const bulkMutation = useBulkCreateBins();

  const form = useForm({
    resolver: zodResolver(bulkBinSchema),
    defaultValues: {
      warehouse_id: "",
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

  const { register, handleSubmit, control, formState: { errors }, getValues } = form;

  const handlePreview = () => {
    const values = getValues();
    try {
      const previewData = generatePreview(values as BulkBinFormData);
      setPreview(previewData);
      setShowPreview(true);
      toast.info(`${previewData.length} tárolóhely lesz létrehozva`);
    } catch {
      toast.error("Hiba az előnézet generálásakor");
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
        toast.success(`${(result as { created?: number }).created || preview.length} tárolóhely sikeresen létrehozva`);
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

        <div className="space-y-2">
          <Label htmlFor="aisles">
            Sorok <span className="text-error">*</span>
          </Label>
          <Input
            id="aisles"
            placeholder="A,B,C vagy A-C"
            {...register("aisles")}
          />
          {errors.aisles && (
            <p className="text-sm text-error">{errors.aisles.message as string}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Lista formátum: A,B,C vagy tartomány: A-C
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-4">
            <Label>Állványok</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="rack_start" className="text-xs">Kezdő</Label>
                <Input
                  id="rack_start"
                  type="number"
                  {...register("rack_start", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rack_end" className="text-xs">Vég</Label>
                <Input
                  id="rack_end"
                  type="number"
                  {...register("rack_end", { valueAsNumber: true })}
                />
              </div>
            </div>
            {errors.rack_end && (
              <p className="text-sm text-error">{errors.rack_end.message as string}</p>
            )}
          </div>

          <div className="space-y-4">
            <Label>Szintek</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="level_start" className="text-xs">Kezdő</Label>
                <Input
                  id="level_start"
                  type="number"
                  {...register("level_start", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level_end" className="text-xs">Vég</Label>
                <Input
                  id="level_end"
                  type="number"
                  {...register("level_end", { valueAsNumber: true })}
                />
              </div>
            </div>
            {errors.level_end && (
              <p className="text-sm text-error">{errors.level_end.message as string}</p>
            )}
          </div>

          <div className="space-y-4">
            <Label>Pozíciók</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="position_start" className="text-xs">Kezdő</Label>
                <Input
                  id="position_start"
                  type="number"
                  {...register("position_start", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position_end" className="text-xs">Vég</Label>
                <Input
                  id="position_end"
                  type="number"
                  {...register("position_end", { valueAsNumber: true })}
                />
              </div>
            </div>
            {errors.position_end && (
              <p className="text-sm text-error">{errors.position_end.message as string}</p>
            )}
          </div>
        </div>

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
          <Button type="submit" disabled={bulkMutation.isPending || !showPreview}>
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

      {showPreview && preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Előnézet: {formatNumber(preview.length, 0)} tárolóhely lesz létrehozva
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kód</TableHead>
                    <TableHead>Sor</TableHead>
                    <TableHead>Állvány</TableHead>
                    <TableHead>Szint</TableHead>
                    <TableHead>Pozíció</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.slice(0, 20).map((bin, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{bin.code}</TableCell>
                      <TableCell className="font-mono">{bin.aisle}</TableCell>
                      <TableCell className="font-mono">{bin.rack}</TableCell>
                      <TableCell className="font-mono">{bin.level}</TableCell>
                      <TableCell className="font-mono">{bin.position}</TableCell>
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
