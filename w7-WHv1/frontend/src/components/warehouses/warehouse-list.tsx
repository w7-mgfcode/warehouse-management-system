import { useNavigate } from "react-router-dom";
import { Edit, Check, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { WarehouseMobileCard } from "./warehouse-mobile-card";
import type { Warehouse } from "@/types";
import { HU } from "@/lib/i18n";
import { formatDateTime } from "@/lib/date";

interface WarehouseListProps {
  warehouses: Warehouse[];
  isLoading?: boolean;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function WarehouseList({ warehouses, isLoading, onDelete, isDeleting }: WarehouseListProps) {
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

  if (warehouses.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {HU.empty.warehouses}
      </div>
    );
  }

  return (
    <>
      {/* Mobile Cards View - shown on small screens */}
      <div className="md:hidden space-y-3">
        {warehouses.map((warehouse) => (
          <WarehouseMobileCard
            key={warehouse.id}
            warehouse={warehouse}
            onDelete={onDelete}
            isDeleting={isDeleting}
          />
        ))}
      </div>

      {/* Table View - hidden on mobile */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{HU.table.name}</TableHead>
              <TableHead>Cím</TableHead>
              <TableHead>{HU.table.status}</TableHead>
              <TableHead>{HU.table.createdAt}</TableHead>
              <TableHead className="text-right">{HU.table.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {warehouses.map((warehouse) => (
              <TableRow
                key={warehouse.id}
                className="cursor-pointer hover:bg-secondary/50"
                onClick={() => navigate(`/warehouses/${warehouse.id}`)}
              >
                <TableCell className="font-medium text-foreground">{warehouse.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {warehouse.location || "—"}
                </TableCell>
                <TableCell>
                  {warehouse.is_active ? (
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
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(warehouse.created_at)}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/warehouses/${warehouse.id}`);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <DeleteDialog
                      entityName={warehouse.name}
                      onConfirm={() => onDelete(warehouse.id)}
                      isDeleting={isDeleting}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
