import { z } from "zod";
import { HU } from "@/lib/i18n";

export const warehouseSchema = z.object({
  name: z
    .string()
    .min(1, HU.validation.required)
    .min(2, "A raktár neve legalább 2 karakter legyen")
    .max(255, "A raktár neve maximum 255 karakter lehet"),
  code: z
    .string()
    .min(1, HU.validation.required)
    .min(2, "A raktárkód legalább 2 karakter legyen")
    .max(50, "A raktárkód maximum 50 karakter lehet")
    .regex(/^[A-Z0-9_-]+$/, "A raktárkód csak nagybetűket, számokat, _ és - karaktereket tartalmazhat"),
  address: z
    .string()
    .max(500, "A cím maximum 500 karakter lehet")
    .optional()
    .or(z.literal("")),
  is_active: z.boolean().optional().default(true),
});

export type WarehouseFormData = z.infer<typeof warehouseSchema>;
