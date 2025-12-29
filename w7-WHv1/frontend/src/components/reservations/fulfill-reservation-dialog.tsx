import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PackageCheck } from "lucide-react";
import { useFulfillReservation } from "@/queries/reservations";
import { toast } from "sonner";

const fulfillSchema = z.object({
  notes: z.string().optional(),
});

type FulfillFormData = z.infer<typeof fulfillSchema>;

interface FulfillReservationDialogProps {
  reservationId: string | null;
  orderReference?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FulfillReservationDialog({
  reservationId,
  orderReference,
  open,
  onOpenChange,
}: FulfillReservationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fulfillMutation = useFulfillReservation(reservationId || "");

  const form = useForm<FulfillFormData>({
    resolver: zodResolver(fulfillSchema),
    defaultValues: {
      notes: "",
    },
  });

  const onSubmit = async (data: FulfillFormData) => {
    if (!reservationId) return;

    setIsSubmitting(true);
    try {
      await fulfillMutation.mutateAsync(data);
      toast.success("Foglalás teljesítve", {
        description:
          "A foglalás sikeresen teljesítve lett és a kiadási mozgások létrejöttek.",
      });
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error("Hiba történt", {
        description:
          error.response?.data?.detail || "A foglalás teljesítése sikertelen.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Foglalás teljesítése
          </DialogTitle>
          <DialogDescription>
            A foglalás teljesítésével kiadási mozgások jönnek létre a foglalt
            készletekből.
            {orderReference && (
              <span className="block mt-2 font-medium">
                Rendelés: {orderReference}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Megjegyzések (opcionális)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Pl. Kiszállítási információk, különleges utasítások..."
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    Ezek a megjegyzések megjelennek a kiadási mozgásoknál.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Mégse
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Teljesítés..." : "Foglalás teljesítése"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
