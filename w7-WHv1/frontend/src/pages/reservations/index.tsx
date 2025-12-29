import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReservationList } from "@/components/reservations/reservation-list";
import { ReservationDetailDialog } from "@/components/reservations/reservation-detail-dialog";
import { FulfillReservationDialog } from "@/components/reservations/fulfill-reservation-dialog";
import { CancelReservationDialog } from "@/components/reservations/cancel-reservation-dialog";
import {
  ReservationFiltersBar,
  type ReservationFilters,
} from "@/components/reservations/reservation-filters-bar";
import { ReservationStats } from "@/components/reservations/reservation-stats";
import { useReservations } from "@/queries/reservations";
import { HU } from "@/lib/i18n";
import type { StockReservation } from "@/types";

export default function ReservationsIndexPage() {
  const [filters, setFilters] = useState<ReservationFilters>({});
  const [selectedReservation, setSelectedReservation] =
    useState<StockReservation | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [fulfillDialogOpen, setFulfillDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const { data, isLoading } = useReservations({
    page: 1,
    page_size: 100,
    status: filters.status,
    order_reference: filters.searchQuery,
  });

  const reservations = data?.items || [];

  // Calculate stats
  const activeReservations = reservations.filter((r) => r.status === "active");
  const totalActiveQuantity = activeReservations.reduce(
    (sum, r) => sum + r.total_quantity,
    0
  );
  const expiringSoon = activeReservations.filter((r) => {
    const expiryDate = new Date(r.reserved_until);
    const now = new Date();
    const hoursUntilExpiry =
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry <= 24 && hoursUntilExpiry > 0;
  }).length;
  const fulfilledToday = reservations.filter((r) => {
    if (r.status !== "fulfilled" || !r.created_at) return false;
    const created = new Date(r.created_at);
    const today = new Date();
    return created.toDateString() === today.toDateString();
  }).length;

  const handleViewDetails = (reservation: StockReservation) => {
    setSelectedReservation(reservation);
    setDetailDialogOpen(true);
  };

  const handleFulfill = (
    data: { id: string; order_reference: string } | StockReservation
  ) => {
    const reservation =
      "order_reference" in data && "product_name" in data
        ? (data as StockReservation)
        : reservations.find((r) => r.id === (data as { id: string }).id) ||
          null;

    if (reservation) {
      setSelectedReservation(reservation);
      setFulfillDialogOpen(true);
    }
  };

  const handleCancel = (
    data: { id: string; order_reference: string } | StockReservation
  ) => {
    const reservation =
      "order_reference" in data && "product_name" in data
        ? (data as StockReservation)
        : reservations.find((r) => r.id === (data as { id: string }).id) ||
          null;

    if (reservation) {
      setSelectedReservation(reservation);
      setCancelDialogOpen(true);
    }
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">
        {HU.nav.reservations}
      </h1>

      {/* Statistics */}
      <ReservationStats
        totalActive={activeReservations.length}
        totalQuantity={totalActiveQuantity}
        expiringSoon={expiringSoon}
        totalFulfilled={fulfilledToday}
        isLoading={isLoading}
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Szűrők és keresés</CardTitle>
        </CardHeader>
        <CardContent>
          <ReservationFiltersBar
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={handleClearFilters}
          />
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Foglalások listája ({data?.total || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <ReservationList
            reservations={reservations}
            isLoading={isLoading}
            onViewDetails={handleViewDetails}
            onFulfill={handleFulfill}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ReservationDetailDialog
        reservationId={selectedReservation?.id || null}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onFulfill={handleFulfill}
        onCancel={handleCancel}
      />

      <FulfillReservationDialog
        reservationId={selectedReservation?.id || null}
        orderReference={selectedReservation?.order_reference}
        open={fulfillDialogOpen}
        onOpenChange={setFulfillDialogOpen}
      />

      <CancelReservationDialog
        reservationId={selectedReservation?.id || null}
        orderReference={selectedReservation?.order_reference}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
      />
    </div>
  );
}
