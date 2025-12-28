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
export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string | null;
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
  contact_name: string | null;
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
  code: string;
  aisle: string;
  rack: string;
  level: string;
  position: string;
  status: BinStatus;
  capacity_kg: number;
  current_product_id: string | null;
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
export type MovementType = "receipt" | "issue" | "adjustment" | "transfer" | "scrap";

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

// Stock Reservation types
export type ReservationStatus = "active" | "fulfilled" | "cancelled" | "expired";

export interface StockReservation {
  id: string;
  product_id: string;
  warehouse_id: string;
  requested_quantity: number;
  reserved_quantity: number;
  status: ReservationStatus;
  customer_reference: string | null;
  notes: string | null;
  expires_at: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Warehouse Transfer types
export type TransferStatus = "pending" | "dispatched" | "completed" | "cancelled";

export interface WarehouseTransfer {
  id: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  product_id: string;
  quantity: number;
  status: TransferStatus;
  dispatched_at: string | null;
  received_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
