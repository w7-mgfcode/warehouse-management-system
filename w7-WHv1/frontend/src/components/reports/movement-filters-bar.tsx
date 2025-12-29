import { useState, useEffect } from "react";
import { X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import type { MovementType } from "@/types";
import { HU } from "@/lib/i18n";

interface MovementFiltersBarProps {
  onFiltersChange: (filters: {
    movement_type?: MovementType;
    start_date?: string;
    end_date?: string;
  }) => void;
}

type DatePreset =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "custom";

export function MovementFiltersBar({
  onFiltersChange,
}: MovementFiltersBarProps) {
  const today = new Date().toISOString().split("T")[0];
  const [movementType, setMovementType] = useState<MovementType | "all">("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // Initialize with default "today" filter on mount
  useEffect(() => {
    onFiltersChange({
      start_date: today,
      end_date: today,
    });
  }, []); // Run only once on mount

  // Auto-apply filters when dates change (with debounce)
  useEffect(() => {
    if (datePreset === "custom" && (startDate || endDate)) {
      const timer = setTimeout(() => {
        applyFilters({
          movement_type: movementType === "all" ? undefined : movementType,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [startDate, endDate]);

  const getDateRange = (preset: DatePreset): { start: string; end: string } => {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split("T")[0];

    switch (preset) {
      case "today":
        return { start: formatDate(today), end: formatDate(today) };
      case "yesterday": {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: formatDate(yesterday), end: formatDate(yesterday) };
      }
      case "last7": {
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 6);
        return { start: formatDate(last7), end: formatDate(today) };
      }
      case "last30": {
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 29);
        return { start: formatDate(last30), end: formatDate(today) };
      }
      case "thisMonth": {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: formatDate(firstDay), end: formatDate(today) };
      }
      default:
        return { start: "", end: "" };
    }
  };

  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== "custom") {
      const range = getDateRange(preset);
      setStartDate(range.start);
      setEndDate(range.end);
      applyFilters({
        movement_type: movementType === "all" ? undefined : movementType,
        start_date: range.start,
        end_date: range.end,
      });
    }
  };

  const applyFilters = (filters: {
    movement_type?: MovementType;
    start_date?: string;
    end_date?: string;
  }) => {
    onFiltersChange(filters);
  };

  const handleClearFilters = () => {
    setMovementType("all");
    setDatePreset("custom");
    setStartDate("");
    setEndDate("");
    onFiltersChange({});
  };

  const hasActiveFilters =
    movementType !== "all" || startDate !== "" || endDate !== "";

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Movement Type */}
          <div className="space-y-2">
            <Label htmlFor="movement_type">Mozgástípus</Label>
            <Select
              value={movementType}
              onValueChange={(value) => {
                const newType = value as MovementType | "all";
                setMovementType(newType);
                // Auto-apply filters when movement type changes
                applyFilters({
                  movement_type: newType === "all" ? undefined : newType,
                  start_date: startDate || undefined,
                  end_date: endDate || undefined,
                });
              }}
            >
              <SelectTrigger id="movement_type">
                <SelectValue placeholder="Összes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Összes típus</SelectItem>
                <SelectItem value="receipt">
                  {HU.movementTypes.receipt}
                </SelectItem>
                <SelectItem value="issue">{HU.movementTypes.issue}</SelectItem>
                <SelectItem value="transfer">
                  {HU.movementTypes.transfer}
                </SelectItem>
                <SelectItem value="adjustment">
                  {HU.movementTypes.adjustment}
                </SelectItem>
                <SelectItem value="scrap">{HU.movementTypes.scrap}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Presets */}
          <div className="space-y-2">
            <Label className="text-xs md:text-sm">
              <Calendar className="inline h-3 w-3 md:h-4 md:w-4 mr-1" />
              Időszak
            </Label>
            <div className="grid grid-cols-3 md:flex md:flex-wrap gap-2">
              <Button
                type="button"
                variant={datePreset === "today" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => handleDatePresetChange("today")}
              >
                Ma
              </Button>
              <Button
                type="button"
                variant={datePreset === "yesterday" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => handleDatePresetChange("yesterday")}
              >
                Tegnap
              </Button>
              <Button
                type="button"
                variant={datePreset === "last7" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => handleDatePresetChange("last7")}
              >
                7 nap
              </Button>
              <Button
                type="button"
                variant={datePreset === "last30" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => handleDatePresetChange("last30")}
              >
                30 nap
              </Button>
              <Button
                type="button"
                variant={datePreset === "thisMonth" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => handleDatePresetChange("thisMonth")}
              >
                E. hónap
              </Button>
              <Button
                type="button"
                variant={datePreset === "custom" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => setDatePreset("custom")}
              >
                Egyedi
              </Button>
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_date" className="text-xs md:text-sm">
                Kezdő dátum
              </Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                className="h-9 text-sm"
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset("custom");
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date" className="text-xs md:text-sm">
                Záró dátum
              </Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                className="h-9 text-sm"
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset("custom");
                }}
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="w-full text-xs md:text-sm h-9"
            >
              <X className="h-3 w-3 md:h-4 md:w-4 mr-2" />
              Szűrők törlése
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
