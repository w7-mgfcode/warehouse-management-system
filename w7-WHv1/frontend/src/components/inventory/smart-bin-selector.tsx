import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import {
  calculateBinScore,
  getSuitabilityColor,
  getSuitabilityLabel,
  type Bin,
  type BinCapacity,
  type BinScore,
} from "@/lib/bin-scoring";
import { CheckCircle2, ChevronRight, Loader2 } from "lucide-react";

interface SmartBinSelectorProps {
  warehouseId?: string;
  requiredWeightKg?: number;
  requiredHeightCm?: number;
  preferredZone?: string;
  value?: string;
  onValueChange: (binId: string) => void;
  label?: string;
  required?: boolean;
}

/**
 * Smart bin selector with scoring algorithm.
 *
 * Features:
 * - Automatic bin scoring based on capacity, level, and accessibility
 * - Real-time capacity validation
 * - Visual suitability indicators
 * - Sorted by best match first
 */
export function SmartBinSelector({
  warehouseId,
  requiredWeightKg,
  requiredHeightCm,
  preferredZone,
  value,
  onValueChange,
  label = "Javasolt tárolóhelyek",
  required = false,
}: SmartBinSelectorProps) {
  const [scoredBins, setScoredBins] = useState<BinScore[]>([]);
  const [selectedBinId, setSelectedBinId] = useState<string | undefined>(value);

  // Fetch bins
  const { data: binsData, isLoading: binsLoading } = useQuery({
    queryKey: ["bins", warehouseId, "empty"],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (warehouseId) params.append("warehouse_id", warehouseId);
      params.append("status", "empty");
      params.append("page_size", "100");

      const response = await apiClient.get(`/bins?${params.toString()}`);
      return response.data;
    },
    enabled: !!warehouseId,
  });

  // Fetch capacities for all bins
  const bins: Bin[] = binsData?.items || [];
  const binIds = bins.map((b) => b.id);

  const { data: capacitiesData } = useQuery({
    queryKey: ["bin-capacities", binIds],
    queryFn: async () => {
      const capacities = await Promise.all(
        binIds.map(async (binId) => {
          try {
            const response = await apiClient.get(`/bins/${binId}/capacity`);
            return { binId, capacity: response.data as BinCapacity };
          } catch {
            return { binId, capacity: undefined };
          }
        })
      );
      return Object.fromEntries(capacities.map((c) => [c.binId, c.capacity]));
    },
    enabled: binIds.length > 0,
  });

  // Calculate scores when data changes
  useEffect(() => {
    if (!bins.length) {
      setScoredBins([]);
      return;
    }

    const scored = bins
      .map((bin) => {
        const capacity = capacitiesData?.[bin.id];
        return calculateBinScore(bin, capacity, {
          requiredWeightKg,
          requiredHeightCm,
          preferredZone,
        });
      })
      .filter((score) => score.suitability !== "unsuitable")
      .sort((a, b) => b.score - a.score);

    setScoredBins(scored);
  }, [bins, capacitiesData, requiredWeightKg, requiredHeightCm, preferredZone]);

  // Update selected bin when value changes
  useEffect(() => {
    setSelectedBinId(value);
  }, [value]);

  const handleSelectBin = (binId: string) => {
    setSelectedBinId(binId);
    onValueChange(binId);
  };

  if (binsLoading) {
    return (
      <div className="space-y-2">
        <Label>
          {label}
          {required && <span className="text-error"> *</span>}
        </Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Tárolóhelyek betöltése...
        </div>
      </div>
    );
  }

  if (!warehouseId) {
    return (
      <div className="space-y-2">
        <Label>
          {label}
          {required && <span className="text-error"> *</span>}
        </Label>
        <p className="text-sm text-muted-foreground">
          Válasszon raktárat az intelligens javaslatok megtekintéséhez
        </p>
      </div>
    );
  }

  if (scoredBins.length === 0) {
    return (
      <div className="space-y-2">
        <Label>
          {label}
          {required && <span className="text-error"> *</span>}
        </Label>
        <p className="text-sm text-muted-foreground">
          Nincs megfelelő üres tárolóhely ebben a raktárban
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-error"> *</span>}
      </Label>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {scoredBins.map((binScore) => {
          const isSelected = binScore.bin.id === selectedBinId;

          return (
            <Button
              key={binScore.bin.id}
              type="button"
              variant={isSelected ? "default" : "outline"}
              className="w-full justify-start h-auto py-3 px-4"
              onClick={() => handleSelectBin(binScore.bin.id)}
            >
              <div className="flex items-start gap-3 w-full">
                {/* Selection indicator */}
                <div className="mt-0.5">
                  {isSelected ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5 opacity-50" />
                  )}
                </div>

                {/* Bin info */}
                <div className="flex-1 text-left space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{binScore.bin.code}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${getSuitabilityColor(
                        binScore.suitability
                      )}`}
                    >
                      {getSuitabilityLabel(binScore.suitability)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {binScore.score} pont
                    </span>
                  </div>

                  {/* Capacity info */}
                  {binScore.capacity?.has_capacity_limits && (
                    <div className="text-xs text-muted-foreground">
                      Kapacitás:{" "}
                      {binScore.capacity.available_weight_kg !== null
                        ? `${binScore.capacity.available_weight_kg.toFixed(1)} kg elérhető`
                        : "N/A"}
                      {binScore.capacity.max_height_cm && (
                        <> | Max. {binScore.capacity.max_height_cm} cm</>
                      )}
                    </div>
                  )}

                  {/* Reasons */}
                  <ul className="text-xs space-y-0.5">
                    {binScore.reasons.slice(0, 3).map((reason, idx) => (
                      <li key={idx} className="text-muted-foreground">
                        • {reason}
                      </li>
                    ))}
                    {binScore.reasons.length > 3 && (
                      <li className="text-muted-foreground italic">
                        +{binScore.reasons.length - 3} további előny
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </Button>
          );
        })}
      </div>

      {scoredBins.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {scoredBins.length} elérhető tárolóhely az Ön kritériumai alapján
        </p>
      )}
    </div>
  );
}
