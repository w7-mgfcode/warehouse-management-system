import { Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { supplierQueryOptions } from "@/queries/suppliers";

function SupplierDetailContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: supplier } = useSuspenseQuery(supplierQueryOptions(id!));

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/suppliers")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold text-foreground">{supplier.company_name}</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <SupplierForm supplier={supplier} onSuccess={() => navigate("/suppliers")} />
        </CardContent>
      </Card>
    </div>
  );
}

function SupplierDetailSkeleton() {
  return (
    <div className="max-w-2xl space-y-6">
      <Skeleton className="h-9 w-64" />
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SuppliersDetailPage() {
  return (
    <Suspense fallback={<SupplierDetailSkeleton />}>
      <SupplierDetailContent />
    </Suspense>
  );
}
