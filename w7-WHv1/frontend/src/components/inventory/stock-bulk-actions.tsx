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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg border border-primary/20 px-4 py-3 flex items-center gap-3">
        <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground">
          {count} kiválasztva
        </Badge>

        <div className="h-6 w-px bg-primary-foreground/20" />

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onReserveBulk}
            className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground"
          >
            <BookmarkPlus className="h-4 w-4 mr-1" />
            Foglalás
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onTransferBulk}
            className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground"
          >
            <ArrowRightLeft className="h-4 w-4 mr-1" />
            Áthelyezés
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onExportBulk}
            className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground"
          >
            <Download className="h-4 w-4 mr-1" />
            Exportálás
          </Button>
        </div>

        <div className="h-6 w-px bg-primary-foreground/20" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="text-primary-foreground hover:bg-primary-foreground/10"
        >
          Törlés
        </Button>
      </div>
    </div>
  );
}
