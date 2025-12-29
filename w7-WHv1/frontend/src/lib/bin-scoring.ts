/**
 * Bin scoring algorithm for smart bin suggestions.
 *
 * Scoring criteria (in priority order):
 * 1. Capacity availability (weight & height)
 * 2. Ground level priority (lower = better)
 * 3. Accessibility
 * 4. Empty status (prefer empty bins)
 */

export interface BinCapacity {
  max_weight_kg: number | null;
  max_height_cm: number | null;
  current_weight_kg: number;
  available_weight_kg: number | null;
  has_capacity_limits: boolean;
}

export interface Bin {
  id: string;
  code: string;
  status: "empty" | "occupied" | "reserved" | "inactive";
  structure_data: Record<string, string>;
  max_weight: number | null;
  max_height: number | null;
  accessibility: string | null;
  warehouse_id: string;
}

export interface BinScore {
  bin: Bin;
  score: number;
  capacity?: BinCapacity;
  reasons: string[];
  suitability: "excellent" | "good" | "fair" | "poor" | "unsuitable";
}

interface ScoringParams {
  requiredWeightKg?: number;
  requiredHeightCm?: number;
  preferredZone?: string;
}

/**
 * Calculate suitability score for a bin (0-100).
 */
export function calculateBinScore(
  bin: Bin,
  capacity: BinCapacity | undefined,
  params: ScoringParams
): BinScore {
  let score = 0;
  const reasons: string[] = [];

  // 1. Status check (blocking criteria)
  if (bin.status === "inactive") {
    return {
      bin,
      score: 0,
      capacity,
      reasons: ["Inaktív tárolóhely"],
      suitability: "unsuitable",
    };
  }

  if (bin.status === "reserved") {
    return {
      bin,
      score: 0,
      capacity,
      reasons: ["Lefoglalt tárolóhely"],
      suitability: "unsuitable",
    };
  }

  // 2. Capacity check (40 points max)
  if (params.requiredWeightKg && capacity?.available_weight_kg !== null && capacity?.max_weight_kg) {
    if (capacity.available_weight_kg >= params.requiredWeightKg) {
      const utilizationRatio = params.requiredWeightKg / capacity.max_weight_kg;
      // Prefer 60-80% utilization (sweet spot)
      if (utilizationRatio >= 0.6 && utilizationRatio <= 0.8) {
        score += 40;
        reasons.push("Optimális kihasználtság (60-80%)");
      } else if (utilizationRatio > 0.8) {
        score += 30;
        reasons.push("Majdnem teljes kihasználtság");
      } else {
        score += 20;
        reasons.push("Elegendő kapacitás");
      }
    } else {
      return {
        bin,
        score: 0,
        capacity,
        reasons: ["Nincs elegendő kapacitás"],
        suitability: "unsuitable",
      };
    }
  } else if (!capacity?.has_capacity_limits) {
    score += 25;
    reasons.push("Nincs kapacitás korlátozás");
  }

  // Height check (blocking if fails)
  if (params.requiredHeightCm && capacity?.max_height_cm) {
    if (params.requiredHeightCm > capacity.max_height_cm) {
      return {
        bin,
        score: 0,
        capacity,
        reasons: ["Túl magas a raklap"],
        suitability: "unsuitable",
      };
    }
    score += 10;
    reasons.push("Magasság megfelelő");
  }

  // 3. Ground level priority (30 points max)
  const level = extractLevel(bin.structure_data);
  if (level !== null) {
    if (level === 0 || level === 1) {
      score += 30;
      reasons.push("Földszinti tárolóhely (könnyű hozzáférés)");
    } else if (level === 2) {
      score += 20;
      reasons.push("2. szint");
    } else if (level === 3) {
      score += 10;
      reasons.push("3. szint");
    } else {
      score += 5;
      reasons.push(`${level}. szint`);
    }
  }

  // 4. Empty status preference (20 points max)
  if (bin.status === "empty") {
    score += 20;
    reasons.push("Üres tárolóhely");
  } else {
    score += 5;
    reasons.push("Már használatban (ugyanaz a termék)");
  }

  // 5. Accessibility (10 points max)
  if (bin.accessibility === "forklift") {
    score += 10;
    reasons.push("Targoncával elérhető");
  } else if (bin.accessibility === "manual") {
    score += 7;
    reasons.push("Kézi hozzáférés");
  } else if (bin.accessibility === "crane") {
    score += 5;
    reasons.push("Daruzással elérhető");
  }

  // 6. Zone matching (bonus 10 points)
  if (params.preferredZone) {
    const zone = extractZone(bin.structure_data);
    if (zone === params.preferredZone) {
      score += 10;
      reasons.push(`Megfelelő zóna (${zone})`);
    }
  }

  // Determine suitability
  let suitability: BinScore["suitability"];
  if (score >= 80) {
    suitability = "excellent";
  } else if (score >= 60) {
    suitability = "good";
  } else if (score >= 40) {
    suitability = "fair";
  } else if (score > 0) {
    suitability = "poor";
  } else {
    suitability = "unsuitable";
  }

  return {
    bin,
    score,
    capacity,
    reasons,
    suitability,
  };
}

/**
 * Extract level from structure_data (e.g., "level": "01" -> 1).
 */
function extractLevel(structureData: Record<string, string>): number | null {
  const levelKeys = ["level", "szint", "emelet", "floor"];
  for (const key of levelKeys) {
    const value = structureData[key];
    if (value) {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

/**
 * Extract zone from structure_data (e.g., "zone": "A").
 */
function extractZone(structureData: Record<string, string>): string | null {
  const zoneKeys = ["zone", "zona", "area", "terulet"];
  for (const key of zoneKeys) {
    const value = structureData[key];
    if (value) {
      return value;
    }
  }
  return null;
}

/**
 * Get suitability color for badge display.
 */
export function getSuitabilityColor(suitability: BinScore["suitability"]): string {
  switch (suitability) {
    case "excellent":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    case "good":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    case "fair":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    case "poor":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
    case "unsuitable":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
  }
}

/**
 * Get suitability label in Hungarian.
 */
export function getSuitabilityLabel(suitability: BinScore["suitability"]): string {
  switch (suitability) {
    case "excellent":
      return "Kiváló";
    case "good":
      return "Jó";
    case "fair":
      return "Megfelelő";
    case "poor":
      return "Gyenge";
    case "unsuitable":
      return "Nem alkalmas";
  }
}
