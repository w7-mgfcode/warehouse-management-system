/**
 * Domain model types for WMS entities
 */

import type { RoleType } from "./api";

// User model (for auth store)
export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: RoleType;
  full_name: string | null;
}

// Warehouse types
export interface BinStructureField {
  name: string;
  label: string;
  required: boolean;
  order: number;
}

export interface BinStructureTemplate {
  fields: BinStructureField[];
  code_format: string;
  separator: string;
  auto_uppercase: boolean;
  zero_padding: boolean;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  bin_structure_template: BinStructureTemplate;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Product types
export type ProductUnit = "db" | "kg" | "l" | "m" | "csomag";

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  default_unit: ProductUnit;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Supplier types
export interface Supplier {
  id: string;
  company_name: string;
  tax_number: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Bin types
export type BinStatus = "empty" | "occupied" | "reserved" | "inactive";

export interface Bin {
  id: string;
  warehouse_id: string;
  warehouse_name?: string; // Optional - populated when joining warehouse data
  code: string;
  structure_data: Record<string, string>; // Dynamic fields based on warehouse template
  status: BinStatus;
  max_weight: number | null;
  max_height: number | null;
  accessibility: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// BinContent types
export interface BinContent {
  id: string;
  bin_id: string;
  product_id: string;
  supplier_id: string | null;
  batch_number: string;
  quantity: number;
  unit: ProductUnit;
  weight_kg: number;
  use_by_date: string;
  received_date: string;
  reserved_quantity: number;
  status: "active" | "expired" | "scrapped";
  created_at: string;
  updated_at: string;
}

// Movement types
export type MovementType =
  | "receipt"
  | "issue"
  | "adjustment"
  | "transfer"
  | "scrap";

export interface BinMovement {
  id: string;
  movement_type: MovementType;
  bin_id: string;
  bin_code: string;
  product_id: string;
  product_name: string;
  sku?: string;
  supplier_id: string | null;
  batch_number: string;
  quantity: number;
  unit: string;
  quantity_before: number;
  quantity_after: number;
  weight_kg: number;
  use_by_date: string;
  user_id: string;
  created_by: string;
  reason: string | null;
  reference_number?: string;
  fefo_compliant?: boolean;
  force_override: boolean;
  override_reason?: string;
  notes?: string;
  from_bin_id: string | null;
  to_bin_id: string | null;
  created_at: string;
}

// Expiry warning types
export type ExpiryUrgency = "critical" | "high" | "medium" | "low" | "expired";

export interface ExpiryWarning {
  bin_content_id: string;
  bin_code: string;
  warehouse_id: string;
  warehouse_name: string;
  product_id: string;
  product_name: string;
  batch_number: string;
  quantity: number;
  weight_kg: number;
  use_by_date: string;
  days_until_expiry: number;
  urgency: ExpiryUrgency;
}

// Warehouse Map types
export interface BinContentSummary {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  batch_number: string;
  use_by_date: string;
  quantity: number;
  unit: string;
  status: string;
  days_until_expiry: number | null;
  urgency: ExpiryUrgency | null;
}

export interface BinWithContent extends Bin {
  contents: BinContentSummary[];
}

// Stock Reservation types
export type ReservationStatus =
  | "active"
  | "fulfilled"
  | "cancelled"
  | "expired";

export interface StockReservation {
  id: string;
  product_name: string;
  sku: string | null;
  order_reference: string;
  customer_name: string | null;
  total_quantity: number;
  reserved_until: string;
  status: ReservationStatus;
  created_at: string;
}

export interface ReservationItem {
  id: string;
  bin_content_id: string;
  bin_code: string;
  batch_number: string;
  use_by_date: string;
  quantity_reserved: number;
  days_until_expiry: number;
}

export interface ReservationDetail extends StockReservation {
  product_id: string;
  fulfilled_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  items: ReservationItem[];
  created_by: string;
  notes: string | null;
  updated_at: string;
}

// Warehouse Transfer types
export type TransferStatus =
  | "pending"
  | "dispatched"
  | "completed"
  | "cancelled";

export interface WarehouseTransfer {
  id: string;
  source_warehouse_name: string;
  target_warehouse_name: string;
  source_bin_code: string;
  target_bin_code: string | null;
  product_name: string;
  quantity_sent: number;
  unit: string;
  status: TransferStatus;
  transport_reference: string | null;
  created_at: string;
}
