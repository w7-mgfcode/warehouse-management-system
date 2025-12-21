import { z } from "zod";
import { HU } from "@/lib/i18n";

// Unit options for select dropdown
export const UNIT_OPTIONS = [
  { value: "db", label: HU.units.db },
  { value: "kg", label: HU.units.kg },
  { value: "l", label: HU.units.l },
  { value: "m", label: HU.units.m },
  { value: "csomag", label: HU.units.csomag },
] as const;

// Receipt schema
export const receiptSchema = z.object({
  bin_id: z.string().min(1, HU.validation.required),
  product_id: z.string().min(1, HU.validation.required),
  supplier_id: z.string().optional().or(z.literal("")),
  batch_number: z
    .string()
    .min(1, HU.validation.required)
    .max(100, "A sarzsszám maximum 100 karakter lehet"),
  use_by_date: z
    .string()
    .min(1, HU.validation.required)
    .refine(
      (date) => {
        const selected = new Date(date);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return selected >= tomorrow;
      },
      { message: "A lejárati dátumnak jövőbeli dátumnak kell lennie" }
    ),
  quantity: z
    .number()
    .positive("A mennyiségnek pozitív számnak kell lennie")
    .min(0.01, "A mennyiség legalább 0.01 kell legyen"),
  unit: z.enum(["db", "kg", "l", "m", "csomag"], {
    message: "Érvénytelen mértékegység",
  }),
  weight_kg: z
    .number()
    .positive("A súlynak pozitív számnak kell lennie")
    .optional(),
  reference_number: z
    .string()
    .max(100, "A hivatkozási szám maximum 100 karakter lehet")
    .optional()
    .or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type ReceiptFormData = z.infer<typeof receiptSchema>;

// Issue schema
export const issueSchema = z
  .object({
    bin_content_id: z.string().min(1, HU.validation.required),
    quantity: z
      .number()
      .positive("A mennyiségnek pozitív számnak kell lennie")
      .min(0.01, "A mennyiség legalább 0.01 kell legyen"),
    reason: z
      .string()
      .min(1, HU.validation.required)
      .max(50, "Az indoklás maximum 50 karakter lehet"),
    reference_number: z
      .string()
      .max(100, "A hivatkozási szám maximum 100 karakter lehet")
      .optional()
      .or(z.literal("")),
    force_non_fefo: z.boolean().optional().default(false),
    override_reason: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.force_non_fefo && !data.override_reason) {
        return false;
      }
      return true;
    },
    {
      message: "FEFO felülbírálásához indoklás szükséges",
      path: ["override_reason"],
    }
  );

export type IssueFormData = z.infer<typeof issueSchema>;
