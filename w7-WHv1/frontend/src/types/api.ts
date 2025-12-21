/**
 * API response types matching backend Pydantic schemas
 */

// Authentication types
export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface TokenPayload {
  sub: string;
  exp: number;
  type: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

// User types
export type RoleType = "admin" | "manager" | "warehouse" | "viewer";

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  role: RoleType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  username: string;
  email: string;
  full_name?: string | null;
  role?: RoleType;
  is_active?: boolean;
  password: string;
}

export interface UserUpdate {
  username?: string;
  email?: string;
  full_name?: string | null;
  role?: RoleType;
  is_active?: boolean;
  password?: string;
}

// Pagination types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// API Error types
export interface APIError {
  detail: string | Array<{
    loc: Array<string | number>;
    msg: string;
    type: string;
  }>;
}
