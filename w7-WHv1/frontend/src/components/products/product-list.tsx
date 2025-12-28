import { useNavigate } from "react-router-dom";
import { Edit, Check, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import type { Product } from "@/types";
import { HU } from "@/lib/i18n";
import { formatDateTime } from "@/lib/date";

interface ProductListProps {
  products: Product[];
  isLoading?: boolean;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function ProductList({
  products,
  isLoading,
  onDelete,
  isDeleting,
}: ProductListProps) {
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

  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {HU.empty.products}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{HU.table.name}</TableHead>
            <TableHead>{HU.table.sku}</TableHead>
            <TableHead>{HU.table.category}</TableHead>
            <TableHead>{HU.table.unit}</TableHead>
            <TableHead>{HU.table.status}</TableHead>
            <TableHead>{HU.table.createdAt}</TableHead>
            <TableHead className="text-right">{HU.table.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => navigate(`/products/${product.id}`)}>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {product.sku || "—"}
              </TableCell>
              <TableCell>{product.category || "—"}</TableCell>
              <TableCell>{HU.units[product.default_unit as keyof typeof HU.units] || product.default_unit}</TableCell>
              <TableCell>
                {product.is_active ? (
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
                {formatDateTime(product.created_at)}
              </TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/products/${product.id}`);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <DeleteDialog
                    entityName={product.name}
                    onConfirm={() => onDelete(product.id)}
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
