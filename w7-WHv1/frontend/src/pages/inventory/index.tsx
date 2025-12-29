import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/shared/search-input";
import { StockTable } from "@/components/inventory/stock-table";

export default function InventoryIndexPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Készlet áttekintés</h1>

      <Card>
        <CardContent className="pt-6">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Keresés termék vagy sarzs alapján..."
          />
        </CardContent>
      </Card>

      <StockTable filters={{ search }} />
    </div>
  );
}
