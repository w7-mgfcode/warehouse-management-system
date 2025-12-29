/**
 * WarehouseMap Component
 *
 * Main container for warehouse visualization map
 * Orchestrates all sub-components and manages state
 */

import { useState, useMemo, useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BinWithContent, BinStatus } from "@/types";
import { warehouseMapBinsQueryOptions } from "@/queries/bins";
import { warehouseQueryOptions } from "@/queries/warehouses";
import { WarehouseMapToolbar } from "./warehouse-map-toolbar";
import { WarehouseMapGrid } from "./warehouse-map-grid";
import { WarehouseMapLegend } from "./warehouse-map-legend";
import { BinDetailsDialog } from "./bin-details-dialog";

interface WarehouseMapProps {
  warehouseId: string;
}

const ZOOM_LEVELS = [40, 60, 80, 100, 120, 150]; // px cell sizes
const DEFAULT_ZOOM_INDEX = 3; // 100px

export function WarehouseMap({ warehouseId }: WarehouseMapProps) {
  // Fetch warehouse data for template
  const { data: warehouse } = useSuspenseQuery(warehouseQueryOptions(warehouseId));

  // State management
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BinStatus | "all">("all");
  const [levelFilter, setLevelFilter] = useState<string | "all">("all");
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [selectedBin, setSelectedBin] = useState<BinWithContent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch bins with content and expiry info
  // Note: Backend max page_size is 200
  const { data: binsData } = useSuspenseQuery(
    warehouseMapBinsQueryOptions({
      warehouse_id: warehouseId,
      page_size: 200, // Backend maximum
    })
  );

  // Extract unique levels from bins for level tabs
  const uniqueLevels = useMemo(() => {
    const levelSet = new Set<string>();
    binsData.items.forEach((bin) => {
      // Check common level field names
      const level = bin.structure_data.level ||
                    bin.structure_data.szint ||
                    bin.structure_data.floor ||
                    bin.structure_data.emelet;
      if (level) levelSet.add(String(level));
    });
    return Array.from(levelSet).sort((a, b) => a.localeCompare(b, "hu", { numeric: true }));
  }, [binsData.items]);

  // 🎯 Enhancement 2: Auto-select first level on load (default to Level 01)
  useEffect(() => {
    if (uniqueLevels.length > 0 && levelFilter === "all") {
      setLevelFilter(uniqueLevels[0]);
    }
  }, [uniqueLevels, levelFilter]);

  // Filter bins based on search, status, and level
  const filteredBins = useMemo(() => {
    let bins = binsData.items;

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      bins = bins.filter((bin) =>
        bin.code.toLowerCase().includes(searchLower)
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      bins = bins.filter((bin) => bin.status === statusFilter);
    }

    // Filter by level
    if (levelFilter !== "all") {
      bins = bins.filter((bin) => {
        const level = bin.structure_data.level ||
                      bin.structure_data.szint ||
                      bin.structure_data.floor ||
                      bin.structure_data.emelet;
        return String(level) === levelFilter;
      });
    }

    return bins;
  }, [binsData.items, search, statusFilter, levelFilter]);

  // Zoom controls
  const cellSize = ZOOM_LEVELS[zoomIndex];
  const canZoomIn = zoomIndex < ZOOM_LEVELS.length - 1;
  const canZoomOut = zoomIndex > 0;

  const handleZoomIn = () => {
    if (canZoomIn) setZoomIndex(zoomIndex + 1);
  };

  const handleZoomOut = () => {
    if (canZoomOut) setZoomIndex(zoomIndex - 1);
  };

  // Bin click handler
  const handleBinClick = (bin: BinWithContent) => {
    setSelectedBin(bin);
    setDialogOpen(true);
  };

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  if (!warehouse) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="warehouse-map-container space-y-4">
      {/* 🎯 Level Tabs for floor selection */}
      {uniqueLevels.length > 0 && (
        <Tabs value={levelFilter} onValueChange={setLevelFilter} className="w-full">
          <div className="overflow-x-auto">
            <TabsList className="w-full sm:w-auto inline-flex">
              <TabsTrigger value="all" className="whitespace-nowrap">Összes szint</TabsTrigger>
              {uniqueLevels.map((level) => (
                <TabsTrigger key={level} value={level} className="whitespace-nowrap">
                  Szint {level}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      )}

      {/* Toolbar (without level filter - now in tabs above) */}
      <WarehouseMapToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        zoom={cellSize}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        onPrint={handlePrint}
      />

      {/* Grid and Legend */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        {/* Map Grid */}
        <WarehouseMapGrid
          bins={filteredBins}
          template={warehouse.bin_structure_template}
          cellSize={cellSize}
          onBinClick={handleBinClick}
        />

        {/* Legend */}
        <WarehouseMapLegend />
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground">Összes tárolóhely</p>
          <p className="text-2xl font-bold text-card-foreground">{binsData.items.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground">Megjelenítve</p>
          <p className="text-2xl font-bold text-card-foreground">{filteredBins.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground">Foglalt</p>
          <p className="text-2xl font-bold text-card-foreground">
            {binsData.items.filter((b) => b.status === "occupied").length}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-muted-foreground">Üres</p>
          <p className="text-2xl font-bold text-card-foreground">
            {binsData.items.filter((b) => b.status === "empty").length}
          </p>
        </div>
      </div>

      {/* Bin Details Dialog */}
      <BinDetailsDialog
        bin={selectedBin}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
