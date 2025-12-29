import { z } from "zod";
import { HU } from "@/lib/i18n";

// Bin structure field schema
const binStructureFieldSchema = z.object({
  name: z.string().min(1).max(50),
  label: z.string().min(1).max(100),
  required: z.boolean().default(true),
  order: z.number().int().min(1),
});

// Bin structure template schema
const binStructureTemplateSchema = z.object({
  fields: z.array(binStructureFieldSchema).min(1),
  code_format: z.string().regex(/.*\{.*\}.*/),
  separator: z.string().max(5).default("-"),
  auto_uppercase: z.boolean().default(true),
  zero_padding: z.boolean().default(true),
});

export const warehouseSchema = z.object({
  name: z
    .string()
    .min(1, HU.validation.required)
    .min(2, "A raktár neve legalább 2 karakter legyen")
    .max(255, "A raktár neve maximum 255 karakter lehet"),
  location: z
    .string()
    .max(255, "A cím maximum 255 karakter lehet")
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .optional()
    .or(z.literal("")),
  bin_structure_template: binStructureTemplateSchema,
  is_active: z.boolean().optional().default(true),
});

export type WarehouseFormData = z.infer<typeof warehouseSchema>;
