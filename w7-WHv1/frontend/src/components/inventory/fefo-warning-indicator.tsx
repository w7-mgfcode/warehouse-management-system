import { AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDate } from "@/lib/date";

interface FEFOWarningIndicatorProps {
  isCompliant: boolean;
  oldestBinCode?: string;
  oldestUseByDate?: string;
  oldestDaysUntilExpiry?: number;
}

export function FEFOWarningIndicator({
  isCompliant,
  oldestBinCode,
  oldestUseByDate,
  oldestDaysUntilExpiry,
}: FEFOWarningIndicatorProps) {
  // Don't show anything if FEFO compliant
  if (isCompliant) {
    return null;
  }

  // Build warning message
  const warningMessage = oldestBinCode
    ? `FEFO figyelmeztetés: Régebbi tétel elérhető a ${oldestBinCode} tárolóhelyen (lejárat: ${formatDate(oldestUseByDate)} - ${oldestDaysUntilExpiry} nap)`
    : "FEFO figyelmeztetés: Régebbi tétel elérhető";

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <AlertTriangle
            className="h-4 w-4 text-orange-500 dark:text-orange-400 cursor-help inline-block ml-2"
            aria-label="FEFO warning"
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          <div className="space-y-1">
            <p className="font-semibold text-orange-600 dark:text-orange-400">
              ⚠️ FEFO szabály megsértése
            </p>
            <p className="text-sm">{warningMessage}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Kiadás előtt először a régebbi tételt kell felhasználni.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
