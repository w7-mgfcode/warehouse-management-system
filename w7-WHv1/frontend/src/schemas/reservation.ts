import { z } from "zod";
import { HU } from "@/lib/i18n";

export const reservationSchema = z.object({
  product_id: z.string().min(1, HU.validation.required),
  quantity: z.number().positive(HU.validation.positiveNumber).min(0.01),
  order_reference: z
    .string()
    .min(1, HU.validation.required)
    .max(100, "A rendelési hivatkozás maximum 100 karakter lehet"),
  customer_name: z.string().max(255).optional().or(z.literal("")),
  reserved_until: z.string().min(1, HU.validation.required),
  notes: z.string().optional().or(z.literal("")),
});

export type ReservationFormData = z.infer<typeof reservationSchema>;
