import { useState } from "react";
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
  const [movementType, setMovementType] = useState<MovementType | "all">("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("custom");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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

  const handleApplyFilters = () => {
    applyFilters({
      movement_type: movementType === "all" ? undefined : movementType,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    });
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
              onValueChange={(value) =>
                setMovementType(value as MovementType | "all")
              }
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
            <Label>
              <Calendar className="inline h-4 w-4 mr-1" />
              Időszak
            </Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={datePreset === "today" ? "default" : "outline"}
                size="sm"
                onClick={() => handleDatePresetChange("today")}
              >
                Ma
              </Button>
              <Button
                type="button"
                variant={datePreset === "yesterday" ? "default" : "outline"}
                size="sm"
                onClick={() => handleDatePresetChange("yesterday")}
              >
                Tegnap
              </Button>
              <Button
                type="button"
                variant={datePreset === "last7" ? "default" : "outline"}
                size="sm"
                onClick={() => handleDatePresetChange("last7")}
              >
                Utolsó 7 nap
              </Button>
              <Button
                type="button"
                variant={datePreset === "last30" ? "default" : "outline"}
                size="sm"
                onClick={() => handleDatePresetChange("last30")}
              >
                Utolsó 30 nap
              </Button>
              <Button
                type="button"
                variant={datePreset === "thisMonth" ? "default" : "outline"}
                size="sm"
                onClick={() => handleDatePresetChange("thisMonth")}
              >
                Ez a hónap
              </Button>
              <Button
                type="button"
                variant={datePreset === "custom" ? "default" : "outline"}
                size="sm"
                onClick={() => setDatePreset("custom")}
              >
                Egyedi
              </Button>
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_date">Kezdő dátum</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset("custom");
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Záró dátum</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset("custom");
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleApplyFilters} className="flex-1">
              Szűrők alkalmazása
            </Button>
            {hasActiveFilters && (
              <Button variant="outline" onClick={handleClearFilters}>
                <X className="h-4 w-4 mr-2" />
                Törlés
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
