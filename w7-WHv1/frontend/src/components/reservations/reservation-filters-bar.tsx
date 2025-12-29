import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, X, Filter } from "lucide-react";

export interface ReservationFilters {
  status?: "active" | "fulfilled" | "cancelled" | "expired";
  searchQuery?: string;
}

interface ReservationFiltersBarProps {
  filters: ReservationFilters;
  onFiltersChange: (filters: ReservationFilters) => void;
  onClearFilters: () => void;
}

export function ReservationFiltersBar({
  filters,
  onFiltersChange,
  onClearFilters,
}: ReservationFiltersBarProps) {
  const [localSearch, setLocalSearch] = useState(filters.searchQuery || "");

  const handleSearch = () => {
    onFiltersChange({ ...filters, searchQuery: localSearch });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value === "all" ? undefined : (value as any),
    });
  };

  const hasActiveFilters = filters.status || filters.searchQuery;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Szűrők</span>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-7 px-2 text-xs"
          >
            <X className="mr-1 h-3 w-3" />
            Szűrők törlése
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Filter */}
        <div className="space-y-2">
          <Label htmlFor="status-filter">Státusz</Label>
          <Select
            value={filters.status || "all"}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger id="status-filter">
              <SelectValue placeholder="Minden státusz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Minden státusz</SelectItem>
              <SelectItem value="active">Aktív</SelectItem>
              <SelectItem value="fulfilled">Teljesítve</SelectItem>
              <SelectItem value="cancelled">Törölve</SelectItem>
              <SelectItem value="expired">Lejárt</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search-input">Keresés</Label>
          <div className="flex gap-2">
            <Input
              id="search-input"
              placeholder="Rendelés vagy vevő..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <Button onClick={handleSearch} size="icon" variant="secondary">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
