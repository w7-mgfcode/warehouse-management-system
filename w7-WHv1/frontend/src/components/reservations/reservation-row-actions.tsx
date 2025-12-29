import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Eye, PackageCheck, X } from "lucide-react";
import type { StockReservation } from "@/types";

interface ReservationRowActionsProps {
  reservation: StockReservation;
  onViewDetails?: (reservation: StockReservation) => void;
  onFulfill?: (reservation: StockReservation) => void;
  onCancel?: (reservation: StockReservation) => void;
}

export function ReservationRowActions({
  reservation,
  onViewDetails,
  onFulfill,
  onCancel,
}: ReservationRowActionsProps) {
  const [open, setOpen] = useState(false);
  const isActive = reservation.status === "active";

  const handleAction = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0 data-[state=open]:bg-muted"
          aria-label="Műveletek"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {onViewDetails && (
          <DropdownMenuItem
            onClick={() => handleAction(() => onViewDetails(reservation))}
          >
            <Eye className="mr-2 h-4 w-4" />
            <span>Részletek</span>
          </DropdownMenuItem>
        )}

        {isActive && (
          <>
            <DropdownMenuSeparator />

            {onFulfill && (
              <DropdownMenuItem
                onClick={() => handleAction(() => onFulfill(reservation))}
                className="text-success"
              >
                <PackageCheck className="mr-2 h-4 w-4" />
                <span>Teljesítés</span>
              </DropdownMenuItem>
            )}

            {onCancel && (
              <DropdownMenuItem
                onClick={() => handleAction(() => onCancel(reservation))}
                className="text-destructive focus:text-destructive"
              >
                <X className="mr-2 h-4 w-4" />
                <span>Törlés</span>
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
