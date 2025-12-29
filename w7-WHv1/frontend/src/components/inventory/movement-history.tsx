import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { movementsQueryOptions } from "@/queries/movements";
import type { MovementFilters } from "@/queries/movements";
import type { BinMovement, PaginatedResponse } from "@/types";
import { HU } from "@/lib/i18n";
import { formatDateTime } from "@/lib/date";
import { formatNumber } from "@/lib/number";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { MovementDetailDialog } from "@/components/reports/movement-detail-dialog";

interface MovementHistoryProps {
  filters?: MovementFilters;
  data?: PaginatedResponse<BinMovement>;
  isLoading?: boolean;
}

type SortField = "created_at" | "movement_type" | "product_name" | "quantity";
type SortDirection = "asc" | "desc";

const movementTypeColors: Record<string, string> = {
  receipt: "bg-success/10 text-success border-success/20",
  issue: "bg-destructive/10 text-destructive border-destructive/20",
  transfer: "bg-info/10 text-info border-info/20",
  adjustment: "bg-warning/10 text-warning border-warning/20",
  scrap: "bg-secondary text-muted-foreground",
};

export function MovementHistory({
  filters = {},
  data: propData,
  isLoading: propIsLoading,
}: MovementHistoryProps) {
  // Only fetch if data is not provided
  const queryResult = useQuery({
    ...movementsQueryOptions(filters),
    enabled: propData === undefined,
  });
  const data = propData ?? queryResult.data;
  const isLoading = propIsLoading ?? queryResult.isLoading;
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedMovement, setSelectedMovement] = useState<BinMovement | null>(
    null
  );
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedMovements = data?.items
    ? [...data.items].sort((a, b) => {
        let aVal: any = a[sortField];
        let bVal: any = b[sortField];

        if (sortField === "created_at") {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        } else if (sortField === "quantity") {
          aVal = Number(aVal);
          bVal = Number(bVal);
        } else if (typeof aVal === "string") {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      })
    : [];

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const handleRowClick = (movement: BinMovement) => {
    setSelectedMovement(movement);
    setDetailDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {HU.empty.movements}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-3"
                  onClick={() => handleSort("created_at")}
                >
                  Dátum
                  <SortIcon field="created_at" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-3"
                  onClick={() => handleSort("movement_type")}
                >
                  Típus
                  <SortIcon field="movement_type" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-3"
                  onClick={() => handleSort("product_name")}
                >
                  Termék
                  <SortIcon field="product_name" />
                </Button>
              </TableHead>
              <TableHead>Tárolóhely</TableHead>
              <TableHead>Sarzs</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-3"
                  onClick={() => handleSort("quantity")}
                >
                  Mennyiség
                  <SortIcon field="quantity" />
                </Button>
              </TableHead>
              <TableHead>Készlet előtte</TableHead>
              <TableHead>Készlet utána</TableHead>
              <TableHead>Felhasználó</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMovements.map((movement) => {
              const isExpiringSoon =
                movement.use_by_date &&
                new Date(movement.use_by_date).getTime() - Date.now() <
                  24 * 60 * 60 * 1000;

              return (
                <TableRow
                  key={movement.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(movement)}
                >
                  <TableCell className="text-sm">
                    {formatDateTime(movement.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={movementTypeColors[movement.movement_type]}
                    >
                      {HU.movementTypes[movement.movement_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {movement.product_name}
                      {movement.sku && (
                        <span className="text-xs text-muted-foreground">
                          ({movement.sku})
                        </span>
                      )}
                      {isExpiringSoon && (
                        <span title="Hamarosan lejár">
                          <AlertCircle className="h-4 w-4 text-warning" />
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {movement.bin_code}
                  </TableCell>
                  <TableCell className="text-sm">
                    {movement.batch_number}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        movement.quantity >= 0
                          ? "text-success"
                          : "text-destructive"
                      }
                    >
                      {movement.quantity >= 0 ? "+" : ""}
                      {formatNumber(movement.quantity, 2)} {movement.unit}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatNumber(movement.quantity_before, 2)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatNumber(movement.quantity_after, 2)}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      {movement.created_by}
                      {movement.fefo_compliant !== undefined &&
                        (movement.fefo_compliant ? (
                          <span title="FEFO megfelelő">
                            <CheckCircle className="h-3 w-3 text-success" />
                          </span>
                        ) : (
                          <span title="FEFO figyelmeztetés">
                            <AlertCircle className="h-3 w-3 text-warning" />
                          </span>
                        ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(movement);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination info */}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between px-2 py-4 text-sm text-muted-foreground">
          <div>Összesen: {data.total} mozgás</div>
          <div>
            Oldal: {data.page} / {data.pages}
          </div>
        </div>
      )}

      <MovementDetailDialog
        movement={selectedMovement}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </>
  );
}
