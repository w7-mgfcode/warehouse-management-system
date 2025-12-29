import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TransferList } from "@/components/transfers/transfer-list";
import { StockPickerDialog } from "@/components/transfers/stock-picker-dialog";
import { TransferDialog } from "@/components/inventory/transfer-dialog";
import { useTransfers } from "@/queries/transfers";
import type { StockLevel } from "@/queries/inventory";
import { HU } from "@/lib/i18n";

export default function TransfersIndexPage() {
  const { data, isLoading } = useTransfers({ page: 1, page_size: 50 });
  const [stockPickerOpen, setStockPickerOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockLevel | null>(null);

  const handleSelectStock = (stock: StockLevel) => {
    setSelectedStock(stock);
    setTransferDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{HU.nav.transfers}</h1>
        <Button onClick={() => setStockPickerOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Új áthelyezés
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Áthelyezések listája</CardTitle>
        </CardHeader>
        <CardContent>
          <TransferList transfers={data?.items || []} isLoading={isLoading} />
        </CardContent>
      </Card>

      {/* Stock Picker Dialog */}
      <StockPickerDialog
        open={stockPickerOpen}
        onOpenChange={setStockPickerOpen}
        onSelectStock={handleSelectStock}
      />

      {/* Transfer Dialog */}
      <TransferDialog
        stock={selectedStock}
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
      />
    </div>
  );
}
