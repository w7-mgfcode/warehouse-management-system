import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReservationList } from "@/components/reservations/reservation-list";
import { useReservations } from "@/queries/reservations";
import { HU } from "@/lib/i18n";

export default function ReservationsIndexPage() {
  const { data, isLoading } = useReservations({ page: 1, page_size: 50 });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{HU.nav.reservations}</h1>

      <Card>
        <CardHeader>
          <CardTitle>Foglalások listája</CardTitle>
        </CardHeader>
        <CardContent>
          <ReservationList reservations={data?.items || []} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
