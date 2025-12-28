import { z } from "zod";
import { HU } from "@/lib/i18n";

export const productSchema = z.object({
  name: z
    .string()
    .min(1, HU.validation.required)
    .min(2, "A termék neve legalább 2 karakter legyen")
    .max(255, "A termék neve maximum 255 karakter lehet"),
  sku: z
    .string()
    .min(3, "Az SKU legalább 3 karakter legyen")
    .max(100, "Az SKU maximum 100 karakter lehet")
    .optional()
    .or(z.literal("")),
  category: z
    .string()
    .max(100, "A kategória maximum 100 karakter lehet")
    .optional()
    .or(z.literal("")),
  default_unit: z.enum(["db", "kg", "l", "m", "csomag"], {
    message: "Érvénytelen mértékegység",
  }),
  description: z.string().optional().or(z.literal("")),
  is_active: z.boolean().optional().default(true),
});

export type ProductFormData = z.infer<typeof productSchema>;

// Unit options for select dropdown
export const UNIT_OPTIONS = [
  { value: "db", label: HU.units.db },
  { value: "kg", label: HU.units.kg },
  { value: "l", label: HU.units.l },
  { value: "m", label: HU.units.m },
  { value: "csomag", label: HU.units.csomag },
] as const;
