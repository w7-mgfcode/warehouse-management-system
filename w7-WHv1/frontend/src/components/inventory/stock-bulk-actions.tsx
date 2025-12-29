import { Download, BookmarkPlus, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { StockLevel } from "@/queries/inventory";

interface StockBulkActionsProps {
  selectedItems: StockLevel[];
  onReserveBulk: () => void;
  onTransferBulk: () => void;
  onExportBulk: () => void;
  onClearSelection: () => void;
}

export function StockBulkActions({
  selectedItems,
  onReserveBulk,
  onTransferBulk,
  onExportBulk,
  onClearSelection,
}: StockBulkActionsProps) {
  const count = selectedItems.length;

  if (count === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:bottom-6 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg border border-primary/20 px-3 py-2 md:px-4 md:py-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3">
          {/* Count badge and clear button - top row on mobile */}
          <div className="flex items-center justify-between md:justify-start gap-2">
            <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground">
              {count} kiválasztva
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="text-primary-foreground hover:bg-primary-foreground/10 md:hidden"
            >
              Törlés
            </Button>
          </div>

          <div className="hidden md:block h-6 w-px bg-primary-foreground/20" />

          {/* Action buttons - stacked on mobile, horizontal on desktop */}
          <div className="grid grid-cols-3 md:flex md:items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onReserveBulk}
              className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground justify-center"
            >
              <BookmarkPlus className="h-4 w-4 md:mr-1" />
              <span className="hidden md:inline">Foglalás</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={onTransferBulk}
              className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground justify-center"
            >
              <ArrowRightLeft className="h-4 w-4 md:mr-1" />
              <span className="hidden md:inline">Áthelyezés</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={onExportBulk}
              className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground justify-center"
            >
              <Download className="h-4 w-4 md:mr-1" />
              <span className="hidden md:inline">Exportálás</span>
            </Button>
          </div>

          <div className="hidden md:block h-6 w-px bg-primary-foreground/20" />

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-primary-foreground hover:bg-primary-foreground/10 hidden md:inline-flex"
          >
            Törlés
          </Button>
        </div>
      </div>
    </div>
  );
}
