import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { stockLevelsQueryOptions, type StockLevel } from "@/queries/inventory";
import { ExpiryBadge } from "@/components/inventory/expiry-badge";
import { HU } from "@/lib/i18n";

interface StockPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectStock: (stock: StockLevel) => void;
}

export function StockPickerDialog({ open, onOpenChange, onSelectStock }: StockPickerDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: stockLevels, isLoading } = useQuery({
    ...stockLevelsQueryOptions({ search: searchTerm }),
    enabled: open,
  });

  const handleSelectStock = (stock: StockLevel) => {
    onSelectStock(stock);
    onOpenChange(false);
    setSearchTerm("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Válassz készletet áthelyezéshez</DialogTitle>
          <DialogDescription>
            Keress rá a terméknévre, SKU-ra vagy tárolóhelyre
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Keresés..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Stock List */}
          <div className="flex-1 overflow-y-auto border rounded-md">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : stockLevels && stockLevels.length > 0 ? (
              <div className="divide-y">
                {stockLevels.map((stock) => (
                  <button
                    key={stock.bin_content_id}
                    onClick={() => handleSelectStock(stock)}
                    className="w-full p-4 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="font-medium text-foreground">
                          {stock.product_name}
                          {stock.sku && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({stock.sku})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="font-mono">{stock.bin_code}</span>
                          <span>•</span>
                          <span>{stock.warehouse_name}</span>
                          <span>•</span>
                          <span>
                            {stock.quantity} {stock.unit}
                          </span>
                          <span>•</span>
                          <span>Batch: {stock.batch_number}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ExpiryBadge useByDate={stock.use_by_date} showDays />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                {searchTerm
                  ? "Nincs találat a keresésre"
                  : "Nincs elérhető készlet"}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {HU.actions.cancel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
