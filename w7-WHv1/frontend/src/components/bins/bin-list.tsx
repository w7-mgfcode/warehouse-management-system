import { useNavigate } from "react-router-dom";
import { Edit } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { BinStatusBadge } from "./bin-status-badge";
import type { Bin } from "@/types";
import { HU } from "@/lib/i18n";
import { formatNumber } from "@/lib/number";

interface BinListProps {
  bins: Bin[];
  isLoading?: boolean;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function BinList({
  bins,
  isLoading,
  onDelete,
  isDeleting,
}: BinListProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (bins.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {HU.empty.bins}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{HU.table.code}</TableHead>
            <TableHead>Raktár</TableHead>
            <TableHead>Sor</TableHead>
            <TableHead>Állvány</TableHead>
            <TableHead>Szint</TableHead>
            <TableHead>Pozíció</TableHead>
            <TableHead>Kapacitás</TableHead>
            <TableHead>{HU.table.status}</TableHead>
            <TableHead className="text-right">{HU.table.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bins.map((bin) => (
            <TableRow
              key={bin.id}
              className="cursor-pointer hover:bg-secondary/50"
              onClick={() => navigate(`/bins/${bin.id}`)}
            >
              <TableCell className="font-mono font-medium">
                {bin.code}
              </TableCell>
              <TableCell
                className="text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/warehouses/${bin.warehouse_id}`);
                }}
              >
                <Button
                  variant="link"
                  className="h-auto p-0 text-primary hover:underline"
                >
                  {bin.warehouse_name || "Ismeretlen"}
                </Button>
              </TableCell>
              <TableCell className="font-mono text-sm">
                {(bin as any).aisle}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {(bin as any).rack}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {(bin as any).level}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {(bin as any).position}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {(bin as any).capacity_kg
                  ? `${formatNumber((bin as any).capacity_kg, 0)} kg`
                  : "—"}
              </TableCell>
              <TableCell>
                <BinStatusBadge status={bin.status} />
              </TableCell>
              <TableCell
                className="text-right"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/bins/${bin.id}`);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <DeleteDialog
                    entityName={bin.code}
                    onConfirm={() => onDelete(bin.id)}
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
