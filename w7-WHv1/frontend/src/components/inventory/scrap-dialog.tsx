import { useForm, Controller } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useScrapGoods } from "@/queries/inventory";
import type { StockLevel } from "@/queries/inventory";
import type { APIError } from "@/types/api";
import { HU } from "@/lib/i18n";

const scrapSchema = z.object({
  quantity: z.number().positive("Mennyiség nagyobb kell legyen mint 0"),
  reason: z.string().min(1, "Selejtezés oka kötelező"),
  notes: z.string().optional(),
});

type ScrapFormData = z.infer<typeof scrapSchema>;

// Scrap reasons
const SCRAP_REASONS = [
  { value: "expired", label: "Lejárt" },
  { value: "damaged", label: "Sérült" },
  { value: "contaminated", label: "Szennyezett" },
  { value: "quality_issue", label: "Minőségi probléma" },
  { value: "recall", label: "Visszahívás" },
  { value: "other", label: "Egyéb" },
] as const;

interface ScrapDialogProps {
  stock: StockLevel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScrapDialog({ stock, open, onOpenChange }: ScrapDialogProps) {
  const scrapMutation = useScrapGoods();

  const form = useForm<ScrapFormData>({
    resolver: zodResolver(scrapSchema),
    defaultValues: {
      quantity: stock?.quantity || 0,
      reason: "",
      notes: "",
    },
  });

  const { register, handleSubmit, control, formState: { errors }, reset } = form;

  const onSubmit = handleSubmit((data) => {
    if (!stock) return;

    scrapMutation.mutate(
      {
        bin_content_id: stock.bin_content_id,
        quantity: data.quantity,
        reason: data.reason,
        notes: data.notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Készlet sikeresen selejtezve");
          reset();
          onOpenChange(false);
        },
        onError: (error) => {
          const axiosError = error as AxiosError<APIError>;
          const message = axiosError.response?.data?.detail;
          toast.error(typeof message === "string" ? message : "Hiba a selejtezés során");
        },
      }
    );
  });

  if (!stock) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selejtezés</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{stock.product_name}</span>
            {stock.sku && <span className="text-muted-foreground ml-2">({stock.sku})</span>}
            <br />
            Tárolóhely: <span className="font-mono text-foreground">{stock.bin_code}</span>
            {" • "}
            Sarzs: <span className="text-foreground">{stock.batch_number}</span>
            {" • "}
            Elérhető mennyiség: <span className="text-foreground">{stock.quantity} {stock.unit}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 mt-4">
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
            <Label htmlFor="reason">
              Selejtezés oka <span className="text-error">*</span>
            </Label>
            <Controller
              name="reason"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="reason">
                    <SelectValue placeholder="Válasszon okot..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SCRAP_REASONS.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.reason && (
              <p className="text-sm text-error">{errors.reason.message}</p>
            )}
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
            <Button type="submit" disabled={scrapMutation.isPending} variant="destructive">
              {scrapMutation.isPending ? "Selejtezés..." : "Selejtezés"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={scrapMutation.isPending}
            >
              {HU.actions.cancel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
