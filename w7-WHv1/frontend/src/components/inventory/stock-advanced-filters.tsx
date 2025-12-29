import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

export interface AdvancedFilters {
  status?: string;
  expiryRange?: string;
  supplierId?: string;
}

interface StockAdvancedFiltersProps {
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  suppliers?: Array<{ id: string; name: string }>;
}

export function StockAdvancedFilters({
  filters,
  onFiltersChange,
  suppliers = [],
}: StockAdvancedFiltersProps) {
  const activeFilterCount = [
    filters.status,
    filters.expiryRange,
    filters.supplierId,
  ].filter(Boolean).length;

  const handleStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value === "all" ? undefined : value,
    });
  };

  const handleExpiryRangeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      expiryRange: value === "all" ? undefined : value,
    });
  };

  const handleSupplierChange = (value: string) => {
    onFiltersChange({
      ...filters,
      supplierId: value === "all" ? undefined : value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Szűrők</h3>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount} aktív
            </Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 px-2 w-full sm:w-auto"
          >
            <X className="h-4 w-4 mr-1" />
            Törlés
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Filter */}
        <div className="space-y-2">
          <Label htmlFor="status-filter" className="text-xs text-muted-foreground">
            Státusz
          </Label>
          <Select
            value={filters.status || "all"}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger id="status-filter" className="h-9">
              <SelectValue placeholder="Összes státusz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Összes státusz</SelectItem>
              <SelectItem value="available">Elérhető</SelectItem>
              <SelectItem value="reserved">Lefoglalt</SelectItem>
              <SelectItem value="scrapped">Selejtezett</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Expiry Range Filter */}
        <div className="space-y-2">
          <Label htmlFor="expiry-filter" className="text-xs text-muted-foreground">
            Lejárat
          </Label>
          <Select
            value={filters.expiryRange || "all"}
            onValueChange={handleExpiryRangeChange}
          >
            <SelectTrigger id="expiry-filter" className="h-9">
              <SelectValue placeholder="Összes lejárat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Összes lejárat</SelectItem>
              <SelectItem value="expired">Lejárt</SelectItem>
              <SelectItem value="critical">Kritikus (&lt;7 nap)</SelectItem>
              <SelectItem value="high">Magas (7-14 nap)</SelectItem>
              <SelectItem value="medium">Közepes (14-30 nap)</SelectItem>
              <SelectItem value="low">Alacsony (&gt;30 nap)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Supplier Filter */}
        <div className="space-y-2">
          <Label htmlFor="supplier-filter" className="text-xs text-muted-foreground">
            Beszállító
          </Label>
          <Select
            value={filters.supplierId || "all"}
            onValueChange={handleSupplierChange}
          >
            <SelectTrigger id="supplier-filter" className="h-9">
              <SelectValue placeholder="Összes beszállító" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Összes beszállító</SelectItem>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
