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
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import { Plus } from "lucide-react";
import type { APIError } from "@/types/api";

// Simplified product schema for quick create
const quickProductSchema = z.object({
  name: z.string().min(1, "Termék név kötelező").max(200),
  sku: z.string().max(100).optional().or(z.literal("")),
  category: z.string().max(100).optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
});

type QuickProductFormData = z.infer<typeof quickProductSchema>;

interface ProductQuickCreateProps {
  onSuccess?: (productId: string) => void;
  trigger?: React.ReactNode;
}

/**
 * Quick product creation dialog for inline use in forms.
 *
 * Features:
 * - Minimal required fields (name only)
 * - Auto-invalidates product queries
 * - Returns created product ID to parent
 * - Can be triggered from custom button
 */
export function ProductQuickCreate({ onSuccess, trigger }: ProductQuickCreateProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<QuickProductFormData>({
    resolver: zodResolver(quickProductSchema),
    defaultValues: {
      name: "",
      sku: "",
      category: "",
      description: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: QuickProductFormData) => {
      const response = await apiClient.post("/products", {
        ...data,
        is_active: true,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success("Termék sikeresen létrehozva");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      form.reset();
      setOpen(false);
      onSuccess?.(data.id);
    },
    onError: (error: AxiosError<APIError>) => {
      const message = error.response?.data?.detail;
      toast.error(typeof message === "string" ? message : "Hiba történt a termék létrehozásakor");
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
            Új termék
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Új termék gyorslétrehozás</DialogTitle>
          <DialogDescription>
            Adja meg a termék alapvető adatait. További részleteket később módosíthat.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Termék neve <span className="text-error">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Alma Golden"
              {...register("name")}
              autoFocus
            />
            {errors.name && (
              <p className="text-sm text-error">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">Cikkszám (opcionális)</Label>
            <Input
              id="sku"
              placeholder="APPLE-001"
              {...register("sku")}
            />
            {errors.sku && (
              <p className="text-sm text-error">{errors.sku.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Kategória (opcionális)</Label>
            <Input
              id="category"
              placeholder="Gyümölcs"
              {...register("category")}
            />
            {errors.category && (
              <p className="text-sm text-error">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Leírás (opcionális)</Label>
            <Textarea
              id="description"
              placeholder="Friss alma, első osztályú"
              {...register("description")}
              rows={3}
            />
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
