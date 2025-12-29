import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MovementHistory } from "./movement-history";
import type { StockLevel } from "@/queries/inventory";

interface MovementHistoryDialogProps {
  stock: StockLevel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MovementHistoryDialog({
  stock,
  open,
  onOpenChange,
}: MovementHistoryDialogProps) {
  if (!stock) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mozgástörténet</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{stock.product_name}</span>
            {stock.sku && <span className="text-muted-foreground ml-2">({stock.sku})</span>}
            <br />
            Tárolóhely: <span className="font-mono text-foreground">{stock.bin_code}</span>
            {" • "}
            Sarzs: <span className="text-foreground">{stock.batch_number}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <MovementHistory
            filters={{
              bin_id: stock.bin_content_id,
              page_size: 50,
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
