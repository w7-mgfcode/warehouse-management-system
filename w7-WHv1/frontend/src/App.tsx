import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/lib/query-client";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppLayout } from "@/components/layout/app-layout";
import { Toaster } from "@/components/ui/sonner";

// Pages
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";

// Products
import ProductsIndexPage from "@/pages/products/index";
import ProductsNewPage from "@/pages/products/new";
import ProductsDetailPage from "@/pages/products/[id]";

// Warehouses
import WarehousesIndexPage from "@/pages/warehouses/index";
import WarehousesNewPage from "@/pages/warehouses/new";
import WarehousesDetailPage from "@/pages/warehouses/[id]";

// Suppliers
import SuppliersIndexPage from "@/pages/suppliers/index";
import SuppliersNewPage from "@/pages/suppliers/new";
import SuppliersDetailPage from "@/pages/suppliers/[id]";

// Bins
import BinsIndexPage from "@/pages/bins/index";
import BinsNewPage from "@/pages/bins/new";
import BinsDetailPage from "@/pages/bins/[id]";
import BinsBulkPage from "@/pages/bins/bulk";

// Inventory
import InventoryIndexPage from "@/pages/inventory/index";
import InventoryReceiptPage from "@/pages/inventory/receipt";
import InventoryIssuePage from "@/pages/inventory/issue";
import InventoryExpiryPage from "@/pages/inventory/expiry";

// Transfers
import TransfersIndexPage from "@/pages/transfers/index";

// Reservations
import ReservationsIndexPage from "@/pages/reservations/index";

// Reports
import ReportsIndexPage from "@/pages/reports/index";
import StockLevelsReportPage from "@/pages/reports/stock-levels";
import ExpiryReportPage from "@/pages/reports/expiry";
import MovementsReportPage from "@/pages/reports/movements";
import FEFOReportPage from "@/pages/reports/fefo";

// Users
import UsersIndexPage from "@/pages/users/index";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes with app layout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard */}
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Warehouses */}
            <Route path="/warehouses" element={<WarehousesIndexPage />} />
            <Route path="/warehouses/new" element={<WarehousesNewPage />} />
            <Route path="/warehouses/:id" element={<WarehousesDetailPage />} />

            {/* Products */}
            <Route path="/products" element={<ProductsIndexPage />} />
            <Route path="/products/new" element={<ProductsNewPage />} />
            <Route path="/products/:id" element={<ProductsDetailPage />} />

            {/* Suppliers */}
            <Route path="/suppliers" element={<SuppliersIndexPage />} />
            <Route path="/suppliers/new" element={<SuppliersNewPage />} />
            <Route path="/suppliers/:id" element={<SuppliersDetailPage />} />

            {/* Bins */}
            <Route path="/bins" element={<BinsIndexPage />} />
            <Route path="/bins/new" element={<BinsNewPage />} />
            <Route path="/bins/bulk" element={<BinsBulkPage />} />
            <Route path="/bins/:id" element={<BinsDetailPage />} />

            {/* Inventory */}
            <Route path="/inventory" element={<InventoryIndexPage />} />
            <Route
              path="/inventory/receipt"
              element={<InventoryReceiptPage />}
            />
            <Route path="/inventory/issue" element={<InventoryIssuePage />} />
            <Route path="/inventory/expiry" element={<InventoryExpiryPage />} />

            {/* Transfers */}
            <Route path="/transfers" element={<TransfersIndexPage />} />

            {/* Reservations */}
            <Route path="/reservations" element={<ReservationsIndexPage />} />

            {/* Reports */}
            <Route path="/reports" element={<ReportsIndexPage />} />
            <Route path="/reports/fefo" element={<FEFOReportPage />} />
            <Route
              path="/reports/stock-levels"
              element={<StockLevelsReportPage />}
            />
            <Route path="/reports/expiry" element={<ExpiryReportPage />} />
            <Route
              path="/reports/movements"
              element={<MovementsReportPage />}
            />

            {/* Users (Admin Only) */}
            <Route path="/users" element={<UsersIndexPage />} />
          </Route>

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
