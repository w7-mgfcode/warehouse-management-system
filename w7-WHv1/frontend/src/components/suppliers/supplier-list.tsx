import { useNavigate } from "react-router-dom";
import { Edit, Check, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import type { Supplier } from "@/types";
import { HU } from "@/lib/i18n";

interface SupplierListProps {
  suppliers: Supplier[];
  isLoading?: boolean;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function SupplierList({ suppliers, isLoading, onDelete, isDeleting }: SupplierListProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {HU.empty.suppliers}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{HU.table.name}</TableHead>
            <TableHead>Adószám</TableHead>
            <TableHead>Kapcsolattartó</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Telefon</TableHead>
            <TableHead>{HU.table.status}</TableHead>
            <TableHead className="text-right">{HU.table.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier) => (
            <TableRow
              key={supplier.id}
              className="cursor-pointer hover:bg-secondary/50"
              onClick={() => navigate(`/suppliers/${supplier.id}`)}
            >
              <TableCell className="font-medium">{supplier.company_name}</TableCell>
              <TableCell className="text-muted-foreground">
                {supplier.tax_number || "—"}
              </TableCell>
              <TableCell>{supplier.contact_person || "—"}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {supplier.email || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {supplier.phone || "—"}
              </TableCell>
              <TableCell>
                {supplier.is_active ? (
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    <Check className="h-3 w-3 mr-1" />
                    {HU.status.active}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-secondary text-muted-foreground">
                    <X className="h-3 w-3 mr-1" />
                    {HU.status.inactive}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/suppliers/${supplier.id}`);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <DeleteDialog
                    entityName={supplier.company_name}
                    onConfirm={() => onDelete(supplier.id)}
                    isDeleting={isDeleting}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
