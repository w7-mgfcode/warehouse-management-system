import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { Plus } from "lucide-react";
import type { APIError } from "@/types/api";

// Simplified supplier schema for quick create
const quickSupplierSchema = z.object({
  name: z.string().min(1, "Beszállító név kötelező").max(200),
  contact_person: z.string().max(100).optional().or(z.literal("")),
  email: z.string().email("Érvénytelen email cím").optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
});

type QuickSupplierFormData = z.infer<typeof quickSupplierSchema>;

interface SupplierQuickCreateProps {
  onSuccess?: (supplierId: string) => void;
  trigger?: React.ReactNode;
}

/**
 * Quick supplier creation dialog for inline use in forms.
 *
 * Features:
 * - Minimal required fields (name only)
 * - Auto-invalidates supplier queries
 * - Returns created supplier ID to parent
 * - Can be triggered from custom button
 */
export function SupplierQuickCreate({ onSuccess, trigger }: SupplierQuickCreateProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<QuickSupplierFormData>({
    resolver: zodResolver(quickSupplierSchema),
    defaultValues: {
      name: "",
      contact_person: "",
      email: "",
      phone: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: QuickSupplierFormData) => {
      const response = await apiClient.post("/suppliers", {
        ...data,
        is_active: true,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success("Beszállító sikeresen létrehozva");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      form.reset();
      setOpen(false);
      onSuccess?.(data.id);
    },
    onError: (error: AxiosError<APIError>) => {
      const message = error.response?.data?.detail;
      toast.error(
        typeof message === "string" ? message : "Hiba történt a beszállító létrehozásakor"
      );
    },
  });

  const { register, handleSubmit, formState: { errors } } = form;

  const onSubmit = handleSubmit((data) => {
    createMutation.mutate(data);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button type="button" variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Új beszállító
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Új beszállító gyorslétrehozás</DialogTitle>
          <DialogDescription>
            Adja meg a beszállító alapvető adatait. További részleteket később módosíthat.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Beszállító neve <span className="text-error">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Gyümölcs Kft."
              {...register("name")}
              autoFocus
            />
            {errors.name && (
              <p className="text-sm text-error">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_person">Kapcsolattartó (opcionális)</Label>
            <Input
              id="contact_person"
              placeholder="Kovács János"
              {...register("contact_person")}
            />
            {errors.contact_person && (
              <p className="text-sm text-error">{errors.contact_person.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (opcionális)</Label>
            <Input
              id="email"
              type="email"
              placeholder="info@gyumolcs.hu"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-error">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefon (opcionális)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+36 1 234 5678"
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-sm text-error">{errors.phone.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createMutation.isPending}
            >
              Mégse
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Létrehozás..." : "Létrehoz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
