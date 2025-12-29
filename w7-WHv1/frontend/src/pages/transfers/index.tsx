import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransferList } from "@/components/transfers/transfer-list";
import { useTransfers } from "@/queries/transfers";
import { HU } from "@/lib/i18n";

export default function TransfersIndexPage() {
  const { data, isLoading } = useTransfers({ page: 1, page_size: 50 });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{HU.nav.transfers}</h1>

      <Card>
        <CardHeader>
          <CardTitle>Áthelyezések listája</CardTitle>
        </CardHeader>
        <CardContent>
          <TransferList transfers={data?.items || []} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
