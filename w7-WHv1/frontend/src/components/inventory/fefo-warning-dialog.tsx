import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/date";
import { AlertTriangle, Calendar, MapPin, Package } from "lucide-react";

export interface FEFORecommendation {
  bin_code: string;
  bin_content_id: string;
  batch_number: string;
  use_by_date: string;
  days_until_expiry: number;
  available_quantity: number;
}

interface FEFOWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBinCode: string;
  selectedUseByDate: string;
  selectedDaysUntilExpiry: number;
  oldestBin: FEFORecommendation;
  onOverride: (reason: string) => void;
  onCancel: () => void;
  isManager: boolean;
}

/**
 * FEFO warning dialog that appears when user tries to issue from a non-FEFO compliant bin.
 *
 * Features:
 * - Shows comparison between selected bin and FEFO-recommended bin
 * - Requires manager override with written reason
 * - Visual urgency indicators
 */
export function FEFOWarningDialog({
  open,
  onOpenChange,
  selectedBinCode,
  selectedUseByDate,
  selectedDaysUntilExpiry,
  oldestBin,
  onOverride,
  onCancel,
  isManager,
}: FEFOWarningDialogProps) {
  const [overrideReason, setOverrideReason] = useState("");

  const handleOverride = () => {
    if (!overrideReason.trim()) {
      return;
    }
    onOverride(overrideReason);
    setOverrideReason("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setOverrideReason("");
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <DialogTitle>FEFO Figyelmeztetés</DialogTitle>
          </div>
          <DialogDescription>
            A kiválasztott tárolóhely nem követi a FEFO (First Expired, First Out) elvet.
            Létezik régebbi lejáratú termék, amelyet előbb ki kellene adni.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected bin (non-FEFO) */}
          <div className="border-2 border-amber-500 rounded-lg p-4 bg-amber-50 dark:bg-amber-950">
            <h3 className="font-semibold text-sm text-amber-800 dark:text-amber-200 mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Kiválasztott tárolóhely (NEM FEFO)
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Tárolóhely</p>
                <p className="font-semibold">{selectedBinCode}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lejárat</p>
                <p className="font-semibold">
                  {formatDate(new Date(selectedUseByDate), "yyyy. MM. dd.")}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {selectedDaysUntilExpiry} nap múlva
                </p>
              </div>
            </div>
          </div>

          {/* Recommended bin (FEFO) */}
          <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50 dark:bg-green-950">
            <h3 className="font-semibold text-sm text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Javasolt tárolóhely (FEFO)
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Tárolóhely</p>
                <p className="font-semibold">{oldestBin.bin_code}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lejárat</p>
                <p className="font-semibold">
                  {formatDate(new Date(oldestBin.use_by_date), "yyyy. MM. dd.")}
                </p>
                <p
                  className={`text-xs ${
                    oldestBin.days_until_expiry <= 7
                      ? "text-red-600 dark:text-red-400 font-semibold"
                      : "text-green-700 dark:text-green-300"
                  }`}
                >
                  {oldestBin.days_until_expiry} nap múlva{" "}
                  {oldestBin.days_until_expiry <= 7 && "(KRITIKUS!)"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sarzsszám</p>
                <p className="font-semibold text-xs">{oldestBin.batch_number}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Elérhető</p>
                <p className="font-semibold">{oldestBin.available_quantity}</p>
              </div>
            </div>
          </div>

          {/* Difference alert */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  Lejárati különbség: {selectedDaysUntilExpiry - oldestBin.days_until_expiry}{" "}
                  nap
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  A javasolt tárolóhely terméke{" "}
                  <span className="font-semibold">
                    {selectedDaysUntilExpiry - oldestBin.days_until_expiry} nappal hamarabb
                  </span>{" "}
                  jár le, ezért azt kellene először kiadni.
                </p>
              </div>
            </div>
          </div>

          {/* Override reason (manager only) */}
          {isManager && (
            <div className="space-y-2">
              <Label htmlFor="override_reason">
                Felülbírálás indoklása <span className="text-error">*</span>
              </Label>
              <Textarea
                id="override_reason"
                placeholder="Pl: Ügyfél kifejezetten ezt a sarzsot kérte..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Vezetői szintű felülbírálás szükséges a FEFO szabály megkerüléséhez.
              </p>
            </div>
          )}

          {/* Non-manager message */}
          {!isManager && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-200">
                <strong>Csak vezetők</strong> bírálhatják felül a FEFO szabályt. Kérjük, válassza
                a javasolt tárolóhelyet, vagy kérjen segítséget egy vezetőtől.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Mégse
          </Button>
          {isManager ? (
            <Button
              type="button"
              variant="destructive"
              onClick={handleOverride}
              disabled={!overrideReason.trim()}
            >
              Felülbírálás és folytatás
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => {
                // Here you would typically switch to the recommended bin
                handleCancel();
              }}
            >
              Javasolt tárolóhely használata
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
