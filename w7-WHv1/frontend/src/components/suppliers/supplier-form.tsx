import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supplierSchema, type SupplierFormData } from "@/schemas/supplier";
import { useCreateSupplier, useUpdateSupplier } from "@/queries/suppliers";
import type { Supplier } from "@/types";
import { HU, interpolate } from "@/lib/i18n";

interface SupplierFormProps {
  supplier?: Supplier;
  onSuccess?: () => void;
}

export function SupplierForm({ supplier, onSuccess }: SupplierFormProps) {
  const isEdit = !!supplier;
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier(supplier?.id || "");

  const form = useForm({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      company_name: supplier?.company_name || "",
      contact_person: supplier?.contact_person || "",
      email: supplier?.email || "",
      phone: supplier?.phone || "",
      address: supplier?.address || "",
      tax_number: supplier?.tax_number || "",
      is_active: supplier?.is_active ?? true,
    },
  });

  const { register, handleSubmit, formState: { errors } } = form;

  const onSubmit = handleSubmit((data) => {
    const submitData = data as SupplierFormData;

    if (isEdit) {
      updateMutation.mutate(submitData, {
        onSuccess: () => {
          toast.success(interpolate(HU.success.updated, { entity: "Beszállító" }));
          onSuccess?.();
        },
        onError: (error: any) => {
          toast.error(error.response?.data?.detail || HU.errors.generic);
        },
      });
    } else {
      createMutation.mutate(submitData, {
        onSuccess: () => {
          toast.success(interpolate(HU.success.created, { entity: "Beszállító" }));
          onSuccess?.();
        },
        onError: (error: any) => {
          toast.error(error.response?.data?.detail || HU.errors.generic);
        },
      });
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="company_name">
          Cégnév <span className="text-error">*</span>
        </Label>
        <Input
          id="company_name"
          placeholder="pl. Magyar Húsipari Kft."
          {...register("company_name")}
        />
        {errors.company_name && (
          <p className="text-sm text-error">{errors.company_name.message as string}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tax_number">Adószám</Label>
        <Input
          id="tax_number"
          placeholder="12345678-2-42"
          {...register("tax_number")}
        />
        {errors.tax_number && (
          <p className="text-sm text-error">{errors.tax_number.message as string}</p>
        )}
        <p className="text-xs text-muted-foreground">Formátum: 12345678-2-42</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact_person">Kapcsolattartó</Label>
        <Input
          id="contact_person"
          placeholder="Kapcsolattartó neve"
          {...register("contact_person")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="info@ceg.hu"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-error">{errors.email.message as string}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            placeholder="+36 1 234 5678"
            {...register("phone")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Cím</Label>
        <Input
          id="address"
          placeholder="1234 Budapest, Utca 12."
          {...register("address")}
        />
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
          {isPending ? "Mentés..." : isEdit ? HU.actions.save : HU.actions.create}
        </Button>
        {onSuccess && (
          <Button type="button" variant="outline" onClick={onSuccess} disabled={isPending}>
            {HU.actions.cancel}
          </Button>
        )}
      </div>
    </form>
  );
}
