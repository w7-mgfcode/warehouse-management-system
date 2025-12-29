import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AxiosError } from "axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateTransfer } from "@/queries/transfers";
import { useBins } from "@/queries/bins";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StockLevel } from "@/queries/inventory";
import type { APIError } from "@/types/api";
import { HU } from "@/lib/i18n";

const transferSchema = z.object({
  target_bin_id: z.string().min(1, "Cél tárolóhely kötelező"),
  quantity: z.number().positive("Mennyiség nagyobb kell legyen mint 0"),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

type TransferFormData = z.infer<typeof transferSchema>;

interface TransferDialogProps {
  stock: StockLevel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferDialog({ stock, open, onOpenChange }: TransferDialogProps) {
  const transferMutation = useCreateTransfer();
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");

  // Fetch empty bins for target selection (only when dialog is open)
  const { data: binsData, isLoading: binsLoading } = useBins({
    warehouse_id: selectedWarehouse || stock?.warehouse_id,
    status: "empty",
    page_size: 100,
  });

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      target_bin_id: "",
      quantity: 0,
      reason: "",
      notes: "",
    },
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = form;
  const targetBinId = watch("target_bin_id");

  // Update quantity when stock changes
  useEffect(() => {
    if (stock && open) {
      setValue("quantity", stock.quantity);
    }
  }, [stock, open, setValue]);

  const onSubmit = handleSubmit((data) => {
    if (!stock) return;

    transferMutation.mutate(
      {
        source_bin_content_id: stock.bin_content_id,
        target_bin_id: data.target_bin_id,
        quantity: data.quantity,
        reason: data.reason || undefined,
        notes: data.notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Áthelyezés sikeresen létrehozva");
          reset();
          onOpenChange(false);
        },
        onError: (error) => {
          const axiosError = error as AxiosError<APIError>;
          const message = axiosError.response?.data?.detail;
          toast.error(typeof message === "string" ? message : "Hiba az áthelyezés során");
        },
      }
    );
  });

  if (!stock) return null;

  const emptyBins = binsData?.items || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Áthelyezés</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{stock.product_name}</span>
            {stock.sku && <span className="text-muted-foreground ml-2">({stock.sku})</span>}
            <br />
            Jelenlegi tárolóhely: <span className="font-mono text-foreground">{stock.bin_code}</span>
            {" • "}
            Elérhető mennyiség: <span className="text-foreground">{stock.quantity} {stock.unit}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="target_bin_id">
              Cél tárolóhely <span className="text-error">*</span>
            </Label>
            <Select
              value={targetBinId}
              onValueChange={(value) => setValue("target_bin_id", value)}
              disabled={binsLoading || emptyBins.length === 0}
            >
              <SelectTrigger id="target_bin_id">
                <SelectValue
                  placeholder={
                    binsLoading
                      ? "Betöltés..."
                      : emptyBins.length === 0
                      ? "Nincs elérhető üres tárolóhely"
                      : "Válasszon üres tárolóhelyet..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {emptyBins.map((bin) => (
                  <SelectItem key={bin.id} value={bin.id}>
                    {bin.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {emptyBins.length === 0 && !binsLoading && (
              <p className="text-sm text-warning">
                Nincs elérhető üres tárolóhely ebben a raktárban.
              </p>
            )}
            {errors.target_bin_id && (
              <p className="text-sm text-error">{errors.target_bin_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">
              Mennyiség ({stock.unit}) <span className="text-error">*</span>
            </Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              max={stock.quantity}
              placeholder="100"
              {...register("quantity", { valueAsNumber: true })}
            />
            {errors.quantity && (
              <p className="text-sm text-error">{errors.quantity.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Indok (opcionális)</Label>
            <Input
              id="reason"
              placeholder="Pl.: Újrarendezés, optimalizálás"
              {...register("reason")}
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
            <Button type="submit" disabled={transferMutation.isPending}>
              {transferMutation.isPending ? "Áthelyezés..." : "Áthelyezés"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={transferMutation.isPending}
            >
              {HU.actions.cancel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
