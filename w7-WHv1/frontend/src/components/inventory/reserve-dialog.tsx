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
import { useCreateReservation } from "@/queries/reservations";
import type { StockLevel } from "@/queries/inventory";
import type { APIError } from "@/types/api";
import { HU } from "@/lib/i18n";

const reserveSchema = z.object({
  quantity: z.number().positive("Mennyiség nagyobb kell legyen mint 0"),
  order_reference: z.string().min(1, "Megrendelés szám kötelező"),
  customer_name: z.string().optional(),
  reserved_until: z.string().optional(),
  notes: z.string().optional(),
});

type ReserveFormData = z.infer<typeof reserveSchema>;

interface ReserveDialogProps {
  stock: StockLevel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReserveDialog({ stock, open, onOpenChange }: ReserveDialogProps) {
  const reserveMutation = useCreateReservation();

  const form = useForm<ReserveFormData>({
    resolver: zodResolver(reserveSchema),
    defaultValues: {
      quantity: stock?.quantity || 0,
      order_reference: "",
      customer_name: "",
      reserved_until: "",
      notes: "",
    },
  });

  const { register, handleSubmit, formState: { errors }, reset } = form;

  const onSubmit = handleSubmit((data) => {
    if (!stock) return;

    // Convert datetime-local string to ISO datetime format
    const reservedUntilISO = data.reserved_until
      ? new Date(data.reserved_until).toISOString()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Default: 7 days from now

    reserveMutation.mutate(
      {
        product_id: stock.product_id,
        quantity: data.quantity,
        order_reference: data.order_reference,
        customer_name: data.customer_name || undefined,
        reserved_until: reservedUntilISO,
        notes: data.notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Foglalás sikeresen létrehozva");
          reset();
          onOpenChange(false);
        },
        onError: (error) => {
          const axiosError = error as AxiosError<APIError>;
          const message = axiosError.response?.data?.detail;
          toast.error(typeof message === "string" ? message : "Hiba a foglalás során");
        },
      }
    );
  });

  if (!stock) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Készlet foglalása</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{stock.product_name}</span>
            {stock.sku && <span className="text-muted-foreground ml-2">({stock.sku})</span>}
            <br />
            Tárolóhely: <span className="font-mono text-foreground">{stock.bin_code}</span>
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
            <Label htmlFor="order_reference">
              Megrendelés szám <span className="text-error">*</span>
            </Label>
            <Input
              id="order_reference"
              placeholder="SO-2025-001"
              {...register("order_reference")}
            />
            {errors.order_reference && (
              <p className="text-sm text-error">{errors.order_reference.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer_name">Ügyfél neve (opcionális)</Label>
            <Input
              id="customer_name"
              placeholder="ABC Kft."
              {...register("customer_name")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reserved_until">
              Foglalás lejárata (opcionális - alapértelmezett: 7 nap)
            </Label>
            <Input
              id="reserved_until"
              type="datetime-local"
              {...register("reserved_until")}
            />
            {errors.reserved_until && (
              <p className="text-sm text-error">{errors.reserved_until.message}</p>
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
            <Button type="submit" disabled={reserveMutation.isPending}>
              {reserveMutation.isPending ? "Foglalás..." : "Foglalás"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={reserveMutation.isPending}
            >
              {HU.actions.cancel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
