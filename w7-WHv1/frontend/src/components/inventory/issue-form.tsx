import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { issueSchema, type IssueFormData } from "@/schemas/inventory";
import { useIssueGoods } from "@/queries/inventory";
import { ProductSelect } from "@/components/products/product-select";
import { FEFORecommendation } from "./fefo-recommendation";
import { RoleGuard } from "@/components/auth/role-guard";
import { HU } from "@/lib/i18n";
import type { APIError } from "@/types/api";

interface IssueFormProps {
  onSuccess?: () => void;
}

export function IssueForm({ onSuccess }: IssueFormProps) {
  const [selectedProduct, setSelectedProduct] = useState("");
  const [requestedQuantity, setRequestedQuantity] = useState<number>(0);
  const [showFEFO, setShowFEFO] = useState(false);
  const issueMutation = useIssueGoods();

  const form = useForm({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      bin_content_id: "",
      quantity: 0,
      reason: "",
      reference_number: "",
      force_non_fefo: false,
      override_reason: "",
      notes: "",
    },
  });

  const { register, handleSubmit, watch, formState: { errors } } = form;
  const forceNonFEFO = watch("force_non_fefo");

  const handleShowFEFO = () => {
    if (!selectedProduct || requestedQuantity <= 0) {
      toast.error("Kérem válasszon terméket és adjon meg mennyiséget");
      return;
    }
    setShowFEFO(true);
  };

  const onSubmit = handleSubmit((data) => {
    const submitData = data as IssueFormData;

    issueMutation.mutate(submitData, {
      onSuccess: (response) => {
        toast.success((response as { message?: string }).message || HU.success.issued);
        form.reset();
        setShowFEFO(false);
        setSelectedProduct("");
        setRequestedQuantity(0);
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
      {/* Product and Quantity Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <ProductSelect
            value={selectedProduct}
            onValueChange={setSelectedProduct}
            label="Termék"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="requested_quantity">
            Kért mennyiség <span className="text-error">*</span>
          </Label>
          <Input
            id="requested_quantity"
            type="number"
            step="0.01"
            placeholder="100"
            value={requestedQuantity || ""}
            onChange={(e) => setRequestedQuantity(Number(e.target.value))}
          />
        </div>
      </div>

      {/* FEFO Recommendation Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleShowFEFO}
        disabled={!selectedProduct || requestedQuantity <= 0}
        className="w-full"
      >
        FEFO Javaslat megjelenítése
      </Button>

      {/* Show FEFO Recommendation */}
      {showFEFO && selectedProduct && requestedQuantity > 0 && (
        <FEFORecommendation
          productId={selectedProduct}
          requestedQuantity={requestedQuantity}
        />
      )}

      {/* Issue Form */}
      <form onSubmit={onSubmit} className="space-y-4 pt-4 border-t">
        <div className="space-y-2">
          <Label htmlFor="bin_content_id">
            Tárolóhely / Sarzs kiválasztása <span className="text-error">*</span>
          </Label>
          <Input
            id="bin_content_id"
            placeholder="A FEFO javaslatból válasszon"
            {...register("bin_content_id")}
          />
          {errors.bin_content_id && (
            <p className="text-sm text-error">{errors.bin_content_id.message as string}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Használja a FEFO javaslat bin_content_id értékét
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">
            Kiadandó mennyiség <span className="text-error">*</span>
          </Label>
          <Input
            id="quantity"
            type="number"
            step="0.01"
            placeholder="100"
            {...register("quantity", { valueAsNumber: true })}
          />
          {errors.quantity && (
            <p className="text-sm text-error">{errors.quantity.message as string}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">
            Kiadás oka <span className="text-error">*</span>
          </Label>
          <Input
            id="reason"
            placeholder="Vevői megrendelés"
            {...register("reason")}
          />
          {errors.reason && (
            <p className="text-sm text-error">{errors.reason.message as string}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reference_number">Hivatkozási szám (opcionális)</Label>
          <Input
            id="reference_number"
            placeholder="SO-2025-001"
            {...register("reference_number")}
          />
        </div>

        {/* Manager override (RBAC: manager+ only) */}
        <RoleGuard allowedRoles={["admin", "manager"]}>
          <div className="space-y-4 p-4 border rounded-lg bg-warning/5">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="force_non_fefo"
                {...register("force_non_fefo")}
                className="h-4 w-4"
              />
              <Label htmlFor="force_non_fefo" className="font-normal">
                FEFO szabály felülbírálása (csak vezető)
              </Label>
            </div>

            {forceNonFEFO && (
              <div className="space-y-2">
                <Label htmlFor="override_reason">
                  Felülbírálás indoka <span className="text-error">*</span>
                </Label>
                <Input
                  id="override_reason"
                  placeholder="Vevői kérés, sürgős rendelés"
                  {...register("override_reason")}
                />
                {errors.override_reason && (
                  <p className="text-sm text-error">
                    {errors.override_reason.message as string}
                  </p>
                )}
              </div>
            )}
          </div>
        </RoleGuard>

        <div className="space-y-2">
          <Label htmlFor="notes">Megjegyzések (opcionális)</Label>
          <Input
            id="notes"
            placeholder="További információk"
            {...register("notes")}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={issueMutation.isPending}>
            {issueMutation.isPending ? "Kiadás..." : "Kiadás"}
          </Button>
          {onSuccess && (
            <Button
              type="button"
              variant="outline"
              onClick={onSuccess}
              disabled={issueMutation.isPending}
            >
              {HU.actions.cancel}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
