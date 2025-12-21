import { z } from "zod";
import { HU } from "@/lib/i18n";

export const transferSchema = z.object({
  source_bin_content_id: z.string().min(1, HU.validation.required),
  target_bin_id: z.string().min(1, HU.validation.required),
  quantity: z.number().positive(HU.validation.positiveNumber).min(0.01),
  reason: z.string().max(50).optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type TransferFormData = z.infer<typeof transferSchema>;

export const crossWarehouseTransferSchema = z.object({
  source_bin_content_id: z.string().min(1, HU.validation.required),
  target_warehouse_id: z.string().min(1, HU.validation.required),
  target_bin_id: z.string().optional().or(z.literal("")),
  quantity: z.number().positive(HU.validation.positiveNumber).min(0.01),
  transport_reference: z.string().max(100).optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type CrossWarehouseTransferFormData = z.infer<typeof crossWarehouseTransferSchema>;
