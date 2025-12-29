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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useCancelReservation } from "@/queries/reservations";
import { toast } from "sonner";

const cancelSchema = z.object({
  reason: z
    .string()
    .min(1, "Indok megadása kötelező")
    .max(50, "Maximum 50 karakter"),
  notes: z.string().optional(),
});

type CancelFormData = z.infer<typeof cancelSchema>;

interface CancelReservationDialogProps {
  reservationId: string | null;
  orderReference?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelReservationDialog({
  reservationId,
  orderReference,
  open,
  onOpenChange,
}: CancelReservationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cancelMutation = useCancelReservation();

  const form = useForm<CancelFormData>({
    resolver: zodResolver(cancelSchema),
    defaultValues: {
      reason: "",
      notes: "",
    },
  });

  const onSubmit = async (data: CancelFormData) => {
    if (!reservationId) return;

    setIsSubmitting(true);
    try {
      await cancelMutation.mutateAsync({
        id: reservationId,
        reason: data.reason,
        notes: data.notes,
      });
      toast.success("Foglalás törölve", {
        description:
          "A foglalás sikeresen törölve lett és a készlet felszabadult.",
      });
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error("Hiba történt", {
        description:
          error.response?.data?.detail || "A foglalás törlése sikertelen.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Foglalás törlése
          </DialogTitle>
          <DialogDescription>
            A foglalás törlésekor a lefoglalt készlet felszabadul és ismét
            elérhető lesz.
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
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Törlés indoka <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Pl. Vevő lemondta, téves foglalás..."
                      maxLength={50}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum 50 karakter (kötelező)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>További megjegyzések (opcionális)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Részletes indoklás vagy egyéb információk..."
                      rows={3}
                    />
                  </FormControl>
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
              <Button
                type="submit"
                variant="destructive"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Törlés..." : "Foglalás törlése"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
