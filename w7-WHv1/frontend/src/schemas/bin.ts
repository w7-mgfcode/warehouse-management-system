import { z } from "zod";
import { HU } from "@/lib/i18n";

export const binSchema = z.object({
  warehouse_id: z.string().min(1, HU.validation.required),
  code: z
    .string()
    .min(1, HU.validation.required)
    .max(100, "A tárolóhely kód maximum 100 karakter lehet"),
  aisle: z.string().min(1, "A sor mező kötelező").max(10),
  rack: z.string().min(1, "Az állvány mező kötelező").max(10),
  level: z.string().min(1, "A szint mező kötelező").max(10),
  position: z.string().min(1, "A pozíció mező kötelező").max(10),
  capacity_kg: z.number().positive("A kapacitás pozitív szám kell legyen").optional(),
  is_active: z.boolean().optional().default(true),
});

export type BinFormData = z.infer<typeof binSchema>;

// Bulk bin generation schema
export const bulkBinSchema = z.object({
  warehouse_id: z.string().min(1, HU.validation.required),
  aisles: z.string().min(1, "Adja meg a sorokat (pl. A,B,C vagy A-C)"),
  rack_start: z.number().int().min(1, "A kezdő érték legalább 1"),
  rack_end: z.number().int().min(1, "A végérték legalább 1"),
  level_start: z.number().int().min(1, "A kezdő érték legalább 1"),
  level_end: z.number().int().min(1, "A végérték legalább 1"),
  position_start: z.number().int().min(1, "A kezdő érték legalább 1"),
  position_end: z.number().int().min(1, "A végérték legalább 1"),
  capacity_kg: z.number().positive().optional(),
}).refine(
  (data) => data.rack_end >= data.rack_start,
  { message: "A végérték nem lehet kisebb a kezdő értéknél", path: ["rack_end"] }
).refine(
  (data) => data.level_end >= data.level_start,
  { message: "A végérték nem lehet kisebb a kezdő értéknél", path: ["level_end"] }
).refine(
  (data) => data.position_end >= data.position_start,
  { message: "A végérték nem lehet kisebb a kezdő értéknél", path: ["position_end"] }
);

export type BulkBinFormData = z.infer<typeof bulkBinSchema>;

// Helper to parse aisle input (A,B,C or A-C)
export function parseAisles(input: string): string[] {
  const trimmed = input.trim().toUpperCase();

  // Check if range format (A-C)
  if (/^[A-Z]-[A-Z]$/.test(trimmed)) {
    const [start, end] = trimmed.split("-");
    const startCode = start.charCodeAt(0);
    const endCode = end.charCodeAt(0);
    const aisles = [];
    for (let i = startCode; i <= endCode; i++) {
      aisles.push(String.fromCharCode(i));
    }
    return aisles;
  }

  // Otherwise split by comma
  return trimmed.split(",").map((a) => a.trim()).filter(Boolean);
}
