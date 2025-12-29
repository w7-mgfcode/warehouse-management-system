/**
 * WarehouseMapToolbar Component
 *
 * Interactive controls for warehouse map:
 * - Search input (filter bins by code)
 * - Status filter (multi-select)
 * - Zoom controls (+/- buttons)
 * - Print button
 */

import { Search, ZoomIn, ZoomOut, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BinStatus } from "@/types";

interface WarehouseMapToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: BinStatus | "all";
  onStatusFilterChange: (value: BinStatus | "all") => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onPrint: () => void;
}

// const ZOOM_LEVELS = [40, 60, 80, 100, 120, 150]; // px cell sizes - unused

export function WarehouseMapToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  zoom,
  onZoomIn,
  onZoomOut,
  canZoomIn,
  canZoomOut,
  onPrint,
}: WarehouseMapToolbarProps) {
  return (
    <div className="warehouse-map-toolbar flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
      {/* Search input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Keresés tárolóhely kód alapján..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Status filter */}
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Összes állapot" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Összes állapot</SelectItem>
          <SelectItem value="empty">Üres</SelectItem>
          <SelectItem value="occupied">Foglalt</SelectItem>
          <SelectItem value="reserved">Fenntartva</SelectItem>
          <SelectItem value="inactive">Inaktív</SelectItem>
        </SelectContent>
      </Select>

      {/* Zoom controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onZoomOut}
          disabled={!canZoomOut}
          title="Kicsinyítés"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm text-foreground font-medium min-w-[60px] text-center">
          {zoom}px
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={onZoomIn}
          disabled={!canZoomIn}
          title="Nagyítás"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {/* Print button */}
      <Button variant="outline" onClick={onPrint} className="gap-2">
        <Printer className="h-4 w-4" />
        <span className="hidden sm:inline text-foreground">Nyomtatás</span>
      </Button>
    </div>
  );
}
