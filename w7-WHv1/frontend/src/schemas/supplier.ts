import { z } from "zod";
import { HU } from "@/lib/i18n";

// Hungarian tax number pattern: 8 digits-1 digit-2 digits (e.g., 12345678-2-42)
const TAX_NUMBER_PATTERN = /^\d{8}-\d-\d{2}$/;

export const supplierSchema = z.object({
  company_name: z
    .string()
    .min(1, HU.validation.required)
    .min(2, "A cégnév legalább 2 karakter legyen")
    .max(255, "A cégnév maximum 255 karakter lehet"),
  contact_person: z
    .string()
    .max(255, "A kapcsolattartó neve maximum 255 karakter lehet")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email(HU.validation.invalidEmail)
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .max(50, "A telefonszám maximum 50 karakter lehet")
    .optional()
    .or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  tax_number: z
    .string()
    .regex(TAX_NUMBER_PATTERN, "Érvénytelen adószám formátum (12345678-2-42)")
    .optional()
    .or(z.literal("")),
  is_active: z.boolean().optional().default(true),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;
