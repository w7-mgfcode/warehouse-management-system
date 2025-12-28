import { Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BinForm } from "@/components/bins/bin-form";
import { binQueryOptions } from "@/queries/bins";

function BinDetailContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: bin } = useSuspenseQuery(binQueryOptions(id!));

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/bins")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">{bin.code}</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <BinForm bin={bin} onSuccess={() => navigate("/bins")} />
        </CardContent>
      </Card>
    </div>
  );
}

function BinDetailSkeleton() {
  return (
    <div className="max-w-2xl space-y-6">
      <Skeleton className="h-9 w-48" />
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[...Array(7)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BinsDetailPage() {
  return (
    <Suspense fallback={<BinDetailSkeleton />}>
      <BinDetailContent />
    </Suspense>
  );
}
